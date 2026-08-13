-- Purpose / focus for each graph (drives board recommendations)

alter table public.graphs
  add column if not exists focus text;
