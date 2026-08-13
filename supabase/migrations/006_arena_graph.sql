-- Extend vault graph to accept Are.na pieces (OK → knowledge graph)

alter table public.vault_nodes
  add column if not exists source text not null default 'obsidian',
  add column if not exists external_id text,
  add column if not exists image_url text,
  add column if not exists arena_url text;

-- Allow arena rows without colliding with obsidian paths
create unique index if not exists vault_nodes_user_external_uidx
  on public.vault_nodes (user_id, source, external_id)
  where external_id is not null;

alter table public.vault_edges drop constraint if exists vault_edges_edge_type_check;
alter table public.vault_edges
  add constraint vault_edges_edge_type_check
  check (edge_type in ('backlink', 'shared_tag', 'shared_interest', 'co_accepted'));
