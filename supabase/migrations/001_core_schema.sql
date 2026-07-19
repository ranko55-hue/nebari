-- =====================================================================
-- 001_core_schema.sql
-- Bonsai app — core "tool" layer
-- Profiles, Trees, Media (with retroactive backfill), Milestones, Care
-- Postgres / Supabase. Paste into Supabase SQL Editor.
-- =====================================================================

-- ---------- helpers ----------

-- Auto-update updated_at on any row change
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================================
-- PROFILES  (one row per auth user; username powers public URLs)
-- =====================================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique not null,
  display_name  text,
  avatar_url    text,
  bio           text,
  -- coarse region only, used to tailor the seasonal care schedule.
  -- NEVER store precise location (bonsai theft is a real concern).
  climate_region text,          -- e.g. 'mediterranean', 'temperate', 'tropical'
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Anyone (incl. anon) can read a public profile — needed for share pages.
create policy "profiles are readable by everyone"
  on public.profiles for select
  using (true);

create policy "users update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    -- provisional unique username; user can change it later
    'grower_' || substr(new.id::text, 1, 8),
    coalesce(new.raw_user_meta_data->>'display_name', 'New Grower')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- TREES  (each tree is its own timeline / mini-profile)
-- =====================================================================
create table if not exists public.trees (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null references public.profiles(id) on delete cascade,
  name               text not null,
  species_name_cache text,        -- free text until linked to a species page (migration 002)
  style              text,        -- 'formal_upright','informal_upright','slant','cascade','literati',...
  acquired_at        date,
  estimated_age_years int,
  cover_media_id     uuid,        -- FK added after tree_media exists
  -- sharing
  is_public          boolean not null default false,
  public_token       text unique not null
                       default encode(gen_random_bytes(9), 'base64'),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_trees_owner on public.trees(owner_id);
create index if not exists idx_trees_public_token on public.trees(public_token);

alter table public.trees enable row level security;

-- Owner: full access to own trees.
create policy "owner reads own trees"
  on public.trees for select
  using (auth.uid() = owner_id);

create policy "owner inserts own trees"
  on public.trees for insert
  with check (auth.uid() = owner_id);

create policy "owner updates own trees"
  on public.trees for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "owner deletes own trees"
  on public.trees for delete
  using (auth.uid() = owner_id);

-- Public: anyone (incl. anon) can read a tree that is explicitly public.
-- The "teaser vs full" gating is enforced by an RPC (see note at bottom),
-- not by this policy — this just allows the share page to load the tree.
create policy "public trees readable by everyone"
  on public.trees for select
  using (is_public = true);

create trigger trg_trees_updated
  before update on public.trees
  for each row execute function public.set_updated_at();

-- =====================================================================
-- TREE_MEDIA  (photos & videos — the backfill engine)
-- taken_at is separate from uploaded_at so imported old photos land
-- on the correct point in the timeline.
-- =====================================================================
create table if not exists public.tree_media (
  id           uuid primary key default gen_random_uuid(),
  tree_id      uuid not null references public.trees(id) on delete cascade,
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,          -- path in the Supabase storage bucket
  media_type   text not null default 'image'
                 check (media_type in ('image','video')),
  taken_at     timestamptz not null,   -- from EXIF, or user-set. TIMELINE SORTS BY THIS.
  uploaded_at  timestamptz not null default now(),
  caption      text,
  width        int,
  height       int,
  created_at   timestamptz not null default now()
);

create index if not exists idx_media_tree_taken on public.tree_media(tree_id, taken_at);
create index if not exists idx_media_owner on public.tree_media(owner_id);

alter table public.tree_media enable row level security;

create policy "owner manages own media"
  on public.tree_media for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Public read of media belonging to a public tree (teaser limiting is done
-- in the app / RPC, not here).
create policy "public tree media readable"
  on public.tree_media for select
  using (exists (
    select 1 from public.trees t
    where t.id = tree_media.tree_id and t.is_public = true
  ));

-- Now that tree_media exists, wire the cover FK on trees.
alter table public.trees
  add constraint fk_trees_cover_media
  foreign key (cover_media_id) references public.tree_media(id) on delete set null;

-- =====================================================================
-- TREE_MILESTONES  (repotting, first styling, wiring, big prune...)
-- Turns a pile of photos into a story.
-- =====================================================================
create table if not exists public.tree_milestones (
  id             uuid primary key default gen_random_uuid(),
  tree_id        uuid not null references public.trees(id) on delete cascade,
  owner_id       uuid not null references public.profiles(id) on delete cascade,
  milestone_type text not null
                   check (milestone_type in
                     ('acquired','repotting','first_styling','wiring',
                      'major_prune','defoliation','other')),
  occurred_at    date not null,
  note           text,
  media_id       uuid references public.tree_media(id) on delete set null,
  created_at     timestamptz not null default now()
);

create index if not exists idx_milestones_tree on public.tree_milestones(tree_id, occurred_at);

alter table public.tree_milestones enable row level security;

create policy "owner manages own milestones"
  on public.tree_milestones for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "public tree milestones readable"
  on public.tree_milestones for select
  using (exists (
    select 1 from public.trees t
    where t.id = tree_milestones.tree_id and t.is_public = true
  ));

-- =====================================================================
-- CARE_TASKS  (the recurring schedule — what to do & when)
-- =====================================================================
create table if not exists public.care_tasks (
  id            uuid primary key default gen_random_uuid(),
  tree_id       uuid not null references public.trees(id) on delete cascade,
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  task_type     text not null
                  check (task_type in
                    ('water','fertilize','prune','wire','repot','pest_check','other')),
  interval_days int,             -- null when the task is seasonal rather than fixed-interval
  season        text,            -- optional: 'spring','summer','autumn','winter'
  next_due      date,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_care_tasks_tree on public.care_tasks(tree_id);
create index if not exists idx_care_tasks_due on public.care_tasks(owner_id, next_due) where is_active;

alter table public.care_tasks enable row level security;

create policy "owner manages own care tasks"
  on public.care_tasks for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create trigger trg_care_tasks_updated
  before update on public.care_tasks
  for each row execute function public.set_updated_at();

-- =====================================================================
-- CARE_LOG  (history of completed actions — private care journal)
-- =====================================================================
create table if not exists public.care_log (
  id         uuid primary key default gen_random_uuid(),
  tree_id    uuid not null references public.trees(id) on delete cascade,
  owner_id   uuid not null references public.profiles(id) on delete cascade,
  task_type  text not null,
  done_at    timestamptz not null default now(),
  note       text,
  media_id   uuid references public.tree_media(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_care_log_tree on public.care_log(tree_id, done_at);

alter table public.care_log enable row level security;

create policy "owner manages own care log"
  on public.care_log for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Optional: mark a task done in one call — logs history AND advances next_due.
-- (App can call this instead of doing two writes.)
create or replace function public.complete_care_task(
  p_task_id uuid,
  p_note    text default null,
  p_media   uuid default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_task public.care_tasks%rowtype;
begin
  select * into v_task from public.care_tasks where id = p_task_id;
  if v_task.owner_id <> auth.uid() then
    raise exception 'not allowed';
  end if;

  insert into public.care_log (tree_id, owner_id, task_type, note, media_id)
  values (v_task.tree_id, v_task.owner_id, v_task.task_type, p_note, p_media);

  if v_task.interval_days is not null then
    update public.care_tasks
       set next_due = current_date + v_task.interval_days
     where id = p_task_id;
  end if;
end;
$$;

-- =====================================================================
-- NOTE ON PUBLIC "TEASER" SHARE PAGES
-- ---------------------------------------------------------------------
-- The RLS policies above let anon READ a public tree and all its media.
-- To enforce the teaser (cover + 3 photos + timelapse only, rest blurred),
-- migration 003 will add a SECURITY DEFINER RPC `get_public_tree_teaser(token)`
-- that returns ONLY the limited fields, and the anon role will read through
-- that RPC instead of the tables directly. For now this schema is enough to
-- build and test the full owner-facing tool.
-- =====================================================================
