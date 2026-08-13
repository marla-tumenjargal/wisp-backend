-- Creative motive + reference image for inspiration boards

alter table public.graphs
  add column if not exists creating text,
  add column if not exists theme text,
  add column if not exists goal text,
  add column if not exists similarities text,
  add column if not exists reference_image_url text,
  add column if not exists aesthetic_brief jsonb;

-- Backfill creating from legacy focus
update public.graphs
set creating = focus
where creating is null
  and focus is not null
  and length(trim(focus)) > 0;
