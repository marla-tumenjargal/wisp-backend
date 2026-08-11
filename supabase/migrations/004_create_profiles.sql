-- Minimal fix: create public.profiles (your interest tables already exist).
-- Run this in the Supabase SQL Editor if bootstrap.sql is too large.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  email text,
  providers text[] not null default '{}',
  interests text[] not null default '{}',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists interests text[] not null default '{}',
  add column if not exists onboarding_completed boolean not null default false;

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner"
  on public.profiles for insert
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
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill existing Google users
insert into public.profiles (id, display_name, avatar_url, email, providers)
select
  u.id,
  coalesce(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1)
  ),
  coalesce(
    u.raw_user_meta_data->>'avatar_url',
    u.raw_user_meta_data->>'picture'
  ),
  u.email,
  array[coalesce(u.raw_app_meta_data->>'provider', 'email')]
from auth.users u
on conflict (id) do nothing;

-- Recreate save RPC so it can write profiles + preferences together
create or replace function public.save_onboarding_interests(interest_slugs text[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  now_ts timestamptz := now();
  selected_ids uuid[];
  removed record;
  labels text[];
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if interest_slugs is null or cardinality(interest_slugs) = 0 then
    raise exception 'at least one interest is required';
  end if;

  select coalesce(array_agg(t.id), '{}'::uuid[])
  into selected_ids
  from public.interest_tags t
  where t.slug = any (interest_slugs)
    and t.is_active;

  if selected_ids is null or cardinality(selected_ids) = 0 then
    raise exception 'no valid interest slugs';
  end if;

  for removed in
    select p.interest_id, p.weight
    from public.user_interest_preferences p
    where p.user_id = uid
      and p.source = 'onboarding'
      and not (p.interest_id = any (selected_ids))
  loop
    insert into public.user_interest_events (
      user_id, interest_id, event_type, weight, source, occurred_at, metadata
    ) values (
      uid, removed.interest_id, 'deselect', removed.weight, 'onboarding', now_ts,
      jsonb_build_object('reason', 'onboarding_replace')
    );
  end loop;

  delete from public.user_interest_preferences
  where user_id = uid
    and source = 'onboarding'
    and not (interest_id = any (selected_ids));

  insert into public.user_interest_preferences (
    user_id, interest_id, weight, signal_type, source, selected_at, updated_at
  )
  select uid, t.id, 1.0, 'explicit', 'onboarding', now_ts, now_ts
  from public.interest_tags t
  where t.id = any (selected_ids)
  on conflict (user_id, interest_id) do update set
    weight = excluded.weight,
    signal_type = excluded.signal_type,
    source = excluded.source,
    updated_at = excluded.updated_at;

  insert into public.user_interest_events (
    user_id, interest_id, event_type, weight, source, occurred_at, metadata
  )
  select uid, t.id, 'select', 1.0, 'onboarding', now_ts,
    jsonb_build_object('step', 'onboarding_interests')
  from public.interest_tags t
  where t.id = any (selected_ids);

  select array_agg(t.label order by t.label)
  into labels
  from public.interest_tags t
  where t.id = any (selected_ids);

  insert into public.profiles (id, interests, onboarding_completed, updated_at)
  values (uid, coalesce(labels, '{}'::text[]), true, now_ts)
  on conflict (id) do update set
    interests = excluded.interests,
    onboarding_completed = true,
    updated_at = excluded.updated_at;

  return jsonb_build_object(
    'user_id', uid,
    'interest_count', cardinality(selected_ids),
    'slugs', to_jsonb(interest_slugs),
    'saved_at', now_ts
  );
end;
$$;

revoke all on function public.save_onboarding_interests(text[]) from public;
grant execute on function public.save_onboarding_interests(text[]) to authenticated;
