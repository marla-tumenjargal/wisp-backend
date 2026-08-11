-- Onboarding: interests + completion flag
alter table public.profiles
  add column if not exists interests text[] not null default '{}',
  add column if not exists onboarding_completed boolean not null default false;

create policy "Profiles are insertable by owner"
  on public.profiles
  for insert
  with check (auth.uid() = id);
