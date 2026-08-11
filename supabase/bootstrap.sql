-- Wisp schema bootstrap (idempotent). Creates profiles + recsys interest tables.

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

-- Backfill profiles for existing auth users
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

create table if not exists public.interest_tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  domain text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_interest_preferences (
  user_id uuid not null references auth.users (id) on delete cascade,
  interest_id uuid not null references public.interest_tags (id) on delete cascade,
  weight real not null default 1.0
    check (weight > 0 and weight <= 1.0),
  signal_type text not null default 'explicit'
    check (signal_type in ('explicit', 'implicit')),
  source text not null default 'onboarding',
  selected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, interest_id)
);

create index if not exists user_interest_preferences_interest_idx
  on public.user_interest_preferences (interest_id);

create index if not exists user_interest_preferences_user_updated_idx
  on public.user_interest_preferences (user_id, updated_at desc);

create table if not exists public.user_interest_events (
  event_id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  interest_id uuid not null references public.interest_tags (id) on delete cascade,
  event_type text not null
    check (event_type in ('select', 'deselect', 'reinforce')),
  weight real not null default 1.0,
  source text not null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists user_interest_events_user_time_idx
  on public.user_interest_events (user_id, occurred_at desc);

create index if not exists user_interest_events_interest_time_idx
  on public.user_interest_events (interest_id, occurred_at desc);

insert into public.interest_tags (slug, label, domain) values
  ('minimalist-design', 'minimalist design', 'design'),
  ('lo-fi', 'lo-fi', 'audio'),
  ('editorial-photography', 'editorial photography', 'visual'),
  ('ambient-sound', 'ambient sound', 'audio'),
  ('typography', 'typography', 'design'),
  ('brutalism', 'brutalism', 'design'),
  ('film-stills', 'film stills', 'film'),
  ('collage', 'collage', 'visual'),
  ('architecture', 'architecture', 'design'),
  ('street-style', 'street style', 'culture'),
  ('ceramics', 'ceramics', 'visual'),
  ('jazz', 'jazz', 'audio'),
  ('experimental-film', 'experimental film', 'film'),
  ('product-design', 'product design', 'design'),
  ('watercolor', 'watercolor', 'visual'),
  ('zine-culture', 'zine culture', 'culture'),
  ('motion-graphics', 'motion graphics', 'visual'),
  ('analog-synth', 'analog synth', 'audio'),
  ('fashion-editorial', 'fashion editorial', 'culture'),
  ('documentary', 'documentary', 'film')
on conflict (slug) do update set
  label = excluded.label,
  domain = excluded.domain,
  is_active = true;

alter table public.interest_tags enable row level security;
alter table public.user_interest_preferences enable row level security;
alter table public.user_interest_events enable row level security;

drop policy if exists "Interest tags are readable by authenticated users" on public.interest_tags;
create policy "Interest tags are readable by authenticated users"
  on public.interest_tags for select
  to authenticated
  using (is_active = true);

drop policy if exists "Users read own interest preferences" on public.user_interest_preferences;
create policy "Users read own interest preferences"
  on public.user_interest_preferences for select
  using (auth.uid() = user_id);

drop policy if exists "Users write own interest preferences" on public.user_interest_preferences;
create policy "Users write own interest preferences"
  on public.user_interest_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users read own interest events" on public.user_interest_events;
create policy "Users read own interest events"
  on public.user_interest_events for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own interest events" on public.user_interest_events;
create policy "Users insert own interest events"
  on public.user_interest_events for insert
  with check (auth.uid() = user_id);

create or replace view public.recsys_user_interest_features as
select
  p.user_id,
  t.id as interest_id,
  t.slug as interest_slug,
  t.label as interest_label,
  t.domain as interest_domain,
  p.weight,
  p.signal_type,
  p.source,
  p.selected_at,
  extract(epoch from p.selected_at)::bigint as selected_at_unix
from public.user_interest_preferences p
join public.interest_tags t on t.id = p.interest_id
where t.is_active;

create or replace view public.recsys_interest_event_log as
select
  e.event_id,
  e.user_id,
  t.id as interest_id,
  t.slug as interest_slug,
  t.domain as interest_domain,
  e.event_type,
  e.weight,
  e.source,
  e.occurred_at,
  extract(epoch from e.occurred_at)::bigint as occurred_at_unix,
  e.metadata
from public.user_interest_events e
join public.interest_tags t on t.id = e.interest_id;

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

  if cardinality(selected_ids) = 0 then
    raise exception 'no valid interest slugs';
  end if;

  if cardinality(selected_ids) <> cardinality(array(select distinct unnest(interest_slugs))) then
    raise exception 'one or more interest slugs are invalid';
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
  select
    uid,
    t.id,
    1.0,
    'explicit',
    'onboarding',
    now_ts,
    now_ts
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
  select
    uid,
    t.id,
    'select',
    1.0,
    'onboarding',
    now_ts,
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
