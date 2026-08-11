-- Obsidian vault graph storage (upload-based, no OAuth)

create table if not exists public.vault_syncs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  node_count integer not null default 0,
  edge_count integer not null default 0,
  vault_name text,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vault_nodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  filename text not null,
  path text not null,
  body text not null default '',
  frontmatter jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}',
  wikilinks text[] not null default '{}',
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, path)
);

create index if not exists vault_nodes_user_idx
  on public.vault_nodes (user_id);

create index if not exists vault_nodes_user_title_idx
  on public.vault_nodes (user_id, lower(title));

create index if not exists vault_nodes_tags_gin
  on public.vault_nodes using gin (tags);

create table if not exists public.vault_edges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_node_id uuid not null references public.vault_nodes (id) on delete cascade,
  target_node_id uuid not null references public.vault_nodes (id) on delete cascade,
  edge_type text not null
    check (edge_type in ('backlink', 'shared_tag')),
  weight real not null default 1.0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, source_node_id, target_node_id, edge_type)
);

create index if not exists vault_edges_user_idx
  on public.vault_edges (user_id);

create index if not exists vault_edges_source_idx
  on public.vault_edges (source_node_id);

create index if not exists vault_edges_target_idx
  on public.vault_edges (target_node_id);

create index if not exists vault_edges_type_idx
  on public.vault_edges (user_id, edge_type);

alter table public.vault_syncs enable row level security;
alter table public.vault_nodes enable row level security;
alter table public.vault_edges enable row level security;

drop policy if exists "Users read own vault syncs" on public.vault_syncs;
create policy "Users read own vault syncs"
  on public.vault_syncs for select
  using (auth.uid() = user_id);

drop policy if exists "Users write own vault syncs" on public.vault_syncs;
create policy "Users write own vault syncs"
  on public.vault_syncs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users read own vault nodes" on public.vault_nodes;
create policy "Users read own vault nodes"
  on public.vault_nodes for select
  using (auth.uid() = user_id);

drop policy if exists "Users write own vault nodes" on public.vault_nodes;
create policy "Users write own vault nodes"
  on public.vault_nodes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users read own vault edges" on public.vault_edges;
create policy "Users read own vault edges"
  on public.vault_edges for select
  using (auth.uid() = user_id);

drop policy if exists "Users write own vault edges" on public.vault_edges;
create policy "Users write own vault edges"
  on public.vault_edges for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
