-- Extended onboarding profile + project focus areas

alter table public.profiles
  add column if not exists designer_roles text[] not null default '{}',
  add column if not exists design_interests text[] not null default '{}',
  add column if not exists aesthetics text[] not null default '{}',
  add column if not exists creative_mediums text[] not null default '{}',
  add column if not exists current_project_id uuid,
  add column if not exists spotify_connected boolean not null default false,
  add column if not exists pinterest_connected boolean not null default false,
  add column if not exists obsidian_connected boolean not null default false,
  add column if not exists onboarding_step text not null default 'welcome';

-- Soft FK so onboarding can run before graphs exists in partial installs
do $$
begin
  if to_regclass('public.graphs') is not null then
    alter table public.graphs
      add column if not exists focus_areas text[] not null default '{}';

    if not exists (
      select 1
      from pg_constraint
      where conname = 'profiles_current_project_id_fkey'
    ) then
      alter table public.profiles
        add constraint profiles_current_project_id_fkey
        foreign key (current_project_id)
        references public.graphs (id)
        on delete set null;
    end if;
  end if;
end $$;
