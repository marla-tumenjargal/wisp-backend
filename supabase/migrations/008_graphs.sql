-- Multiple named knowledge graphs per user

create table if not exists public.graphs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text,
  description text,
  vault_name text,
  vault_node_count integer not null default 0,
  vault_edge_count integer not null default 0,
  vault_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists graphs_user_idx
  on public.graphs (user_id, updated_at desc);

alter table public.graphs enable row level security;

drop policy if exists "Users read own graphs" on public.graphs;
create policy "Users read own graphs"
  on public.graphs for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own graphs" on public.graphs;
create policy "Users insert own graphs"
  on public.graphs for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own graphs" on public.graphs;
create policy "Users update own graphs"
  on public.graphs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own graphs" on public.graphs;
create policy "Users delete own graphs"
  on public.graphs for delete
  using (auth.uid() = user_id);

-- Scope vault graph data to a graph
alter table public.vault_nodes
  add column if not exists graph_id uuid references public.graphs (id) on delete cascade;

alter table public.vault_edges
  add column if not exists graph_id uuid references public.graphs (id) on delete cascade;

create index if not exists vault_nodes_graph_idx
  on public.vault_nodes (graph_id);

create index if not exists vault_edges_graph_idx
  on public.vault_edges (graph_id);

-- Backfill: one default graph per user who already has nodes (or any profile)
insert into public.graphs (id, user_id, name, description, created_at, updated_at)
select
  gen_random_uuid(),
  p.id,
  'untitled',
  null,
  now(),
  now()
from public.profiles p
where not exists (
  select 1 from public.graphs g where g.user_id = p.id
);

-- Also cover users who have vault rows but no profile row
insert into public.graphs (user_id, name)
select distinct vn.user_id, 'untitled'
from public.vault_nodes vn
where not exists (
  select 1 from public.graphs g where g.user_id = vn.user_id
);

update public.vault_nodes vn
set graph_id = g.id
from public.graphs g
where g.user_id = vn.user_id
  and vn.graph_id is null;

update public.vault_edges ve
set graph_id = g.id
from public.graphs g
where g.user_id = ve.user_id
  and ve.graph_id is null;

-- Tighten uniqueness to be per-graph (drop old, add new)
alter table public.vault_nodes drop constraint if exists vault_nodes_user_id_path_key;
drop index if exists vault_nodes_user_external_uidx;

create unique index if not exists vault_nodes_graph_path_uidx
  on public.vault_nodes (graph_id, path)
  where graph_id is not null;

create unique index if not exists vault_nodes_graph_external_uidx
  on public.vault_nodes (graph_id, source, external_id)
  where graph_id is not null and external_id is not null;

alter table public.vault_edges drop constraint if exists vault_edges_user_id_source_node_id_target_node_id_edge_type_key;

create unique index if not exists vault_edges_graph_pair_uidx
  on public.vault_edges (graph_id, source_node_id, target_node_id, edge_type)
  where graph_id is not null;
