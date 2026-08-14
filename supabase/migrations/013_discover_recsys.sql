-- Discover recommendation catalog, ranked feeds, interactions, saves
-- Safe to re-run: repairs an earlier recommendation_items.id (text) mismatch.

drop table if exists public.user_recommendation_feed cascade;
drop table if exists public.user_interactions cascade;
drop table if exists public.user_saved_items cascade;
drop table if exists public.project_references cascade;

-- If catalog was created with text id, rebuild it as uuid
do $$
begin
  if to_regclass('public.recommendation_items') is not null then
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'recommendation_items'
        and column_name = 'id'
        and udt_name <> 'uuid'
    ) then
      drop table public.recommendation_items cascade;
    end if;
  end if;
end $$;

create table if not exists public.recommendation_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  source_url text not null,
  source_name text not null default 'seed',
  image_url text,
  visual_key text not null default 'editorial',
  category text not null,
  medium text not null,
  tags text[] not null default '{}',
  aesthetics text[] not null default '{}',
  concepts text[] not null default '{}',
  popularity real not null default 0.5
    check (popularity >= 0 and popularity <= 1),
  origin text not null default 'seed'
    check (origin in ('seed', 'web', 'pinterest', 'spotify', 'user', 'arena')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recommendation_items_medium_idx
  on public.recommendation_items (medium);
create index if not exists recommendation_items_category_idx
  on public.recommendation_items (category);
create index if not exists recommendation_items_tags_gin
  on public.recommendation_items using gin (tags);

create table if not exists public.user_recommendation_feed (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id uuid not null references public.recommendation_items (id) on delete cascade,
  project_id uuid references public.graphs (id) on delete set null,
  section text not null
    check (section in ('for_you', 'for_project', 'unexpected')),
  rank integer not null default 0,
  score real not null default 0,
  preference_score real not null default 0,
  project_score real not null default 0,
  semantic_score real not null default 0,
  novelty_score real not null default 0,
  popularity_score real not null default 0,
  explanation jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  primary key (user_id, item_id, section)
);

create index if not exists user_recommendation_feed_user_section_idx
  on public.user_recommendation_feed (user_id, section, rank);

create table if not exists public.user_interactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id uuid not null references public.recommendation_items (id) on delete cascade,
  project_id uuid references public.graphs (id) on delete set null,
  interaction_type text not null
    check (interaction_type in (
      'view', 'click', 'save', 'unsave', 'dismiss',
      'add_to_project', 'share', 'export'
    )),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists user_interactions_user_time_idx
  on public.user_interactions (user_id, created_at desc);
create index if not exists user_interactions_item_idx
  on public.user_interactions (item_id, created_at desc);

create table if not exists public.user_saved_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id uuid not null references public.recommendation_items (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table if not exists public.project_references (
  project_id uuid not null references public.graphs (id) on delete cascade,
  item_id uuid not null references public.recommendation_items (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, item_id)
);

create index if not exists project_references_user_idx
  on public.project_references (user_id, created_at desc);

create table if not exists public.user_tag_weights (
  user_id uuid not null references auth.users (id) on delete cascade,
  tag text not null,
  weight real not null default 0
    check (weight >= -1 and weight <= 1),
  updated_at timestamptz not null default now(),
  primary key (user_id, tag)
);

alter table public.recommendation_items enable row level security;
alter table public.user_recommendation_feed enable row level security;
alter table public.user_interactions enable row level security;
alter table public.user_saved_items enable row level security;
alter table public.project_references enable row level security;
alter table public.user_tag_weights enable row level security;

drop policy if exists "Recommendation catalog is readable" on public.recommendation_items;
create policy "Recommendation catalog is readable"
  on public.recommendation_items for select
  to authenticated
  using (true);

drop policy if exists "Authenticated upsert catalog" on public.recommendation_items;
create policy "Authenticated upsert catalog"
  on public.recommendation_items for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated update catalog" on public.recommendation_items;
create policy "Authenticated update catalog"
  on public.recommendation_items for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Users read own feed" on public.user_recommendation_feed;
create policy "Users read own feed"
  on public.user_recommendation_feed for select
  using (auth.uid() = user_id);

drop policy if exists "Users write own feed" on public.user_recommendation_feed;
create policy "Users write own feed"
  on public.user_recommendation_feed for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users read own interactions" on public.user_interactions;
create policy "Users read own interactions"
  on public.user_interactions for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own interactions" on public.user_interactions;
create policy "Users insert own interactions"
  on public.user_interactions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users read own saved items" on public.user_saved_items;
create policy "Users read own saved items"
  on public.user_saved_items for select
  using (auth.uid() = user_id);

drop policy if exists "Users write own saved items" on public.user_saved_items;
create policy "Users write own saved items"
  on public.user_saved_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users read own project references" on public.project_references;
create policy "Users read own project references"
  on public.project_references for select
  using (auth.uid() = user_id);

drop policy if exists "Users write own project references" on public.project_references;
create policy "Users write own project references"
  on public.project_references for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users read own tag weights" on public.user_tag_weights;
create policy "Users read own tag weights"
  on public.user_tag_weights for select
  using (auth.uid() = user_id);

drop policy if exists "Users write own tag weights" on public.user_tag_weights;
create policy "Users write own tag weights"
  on public.user_tag_weights for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
