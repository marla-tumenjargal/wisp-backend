-- Profiles synced from auth.users for Wisp
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  email text,
  providers text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by owner"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "Profiles are updatable by owner"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  provider text := coalesce(new.raw_app_meta_data->>'provider', 'email');
begin
  insert into public.profiles (id, display_name, avatar_url, email, providers)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'user_name',
      split_part(new.email, '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture',
      new.raw_user_meta_data->>'profile_image'
    ),
    new.email,
    array[provider]
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    email = excluded.email,
    providers = (
      select array_agg(distinct p)
      from unnest(public.profiles.providers || excluded.providers) as p
    ),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep providers list in sync when identities are linked later
create or replace function public.handle_user_identity_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  provider text := coalesce(new.raw_app_meta_data->>'provider', 'email');
  providers text[];
begin
  select coalesce(
    array(
      select distinct jsonb_array_elements_text(
        coalesce(new.raw_app_meta_data->'providers', '[]'::jsonb)
      )
    ),
    array[provider]
  ) into providers;

  update public.profiles
  set
    providers = providers,
    display_name = coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'user_name',
      display_name
    ),
    avatar_url = coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture',
      new.raw_user_meta_data->>'profile_image',
      avatar_url
    ),
    email = coalesce(new.email, email),
    updated_at = now()
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of raw_app_meta_data, raw_user_meta_data, email on auth.users
  for each row execute function public.handle_user_identity_updated();
