-- Substack publications the user connects for board recommendations

alter table public.profiles
  add column if not exists substack_publications text[] not null default '{}';
