-- =====================================================================
-- 002_knowledge.sql
-- Nebari — knowledge layer
-- Species wiki (community-authored), revisions, forkable care templates.
-- Depends on: 001_core_schema.sql
-- =====================================================================

-- =====================================================================
-- SPECIES  (canonical record; the prose lives in species_revisions)
-- =====================================================================
create table if not exists public.species (
  id              uuid primary key default gen_random_uuid(),
  scientific_name text unique not null,        -- 'Olea europaea'
  common_name     text,                        -- 'Olive'
  slug            text unique not null,        -- 'olea-europaea' -> /species/olea-europaea
  difficulty      text check (difficulty in ('beginner','intermediate','advanced')),
  -- denormalised pointer to the live revision; kept in sync by trigger below
  current_revision_id uuid,
  tree_count      int not null default 0,      -- how many trees reference it (social proof)
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_species_slug on public.species(slug);

alter table public.species enable row level security;

-- The wiki is public — anon must read it (SEO + share pages).
create policy "species readable by everyone"
  on public.species for select
  using (true);

-- Any signed-in user may add a missing species.
create policy "authenticated create species"
  on public.species for insert
  to authenticated
  with check (auth.uid() = created_by);

-- Metadata edits are open to signed-in users. Vandalism is recoverable
-- because every prose change is an immutable revision (see below).
create policy "authenticated update species"
  on public.species for update
  to authenticated
  using (true)
  with check (true);

create trigger trg_species_updated
  before update on public.species
  for each row execute function public.set_updated_at();

-- =====================================================================
-- SPECIES_REVISIONS  (append-only wiki history — never updated, never deleted)
-- =====================================================================
create table if not exists public.species_revisions (
  id            uuid primary key default gen_random_uuid(),
  species_id    uuid not null references public.species(id) on delete cascade,
  author_id     uuid references public.profiles(id) on delete set null,
  -- structured sections so the UI can render consistently across 400 species
  body          jsonb not null default '{}'::jsonb,
  -- expected keys: overview, watering, soil, fertilizing, pruning,
  --                wiring, repotting, climate_notes, common_mistakes
  edit_summary  text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_revisions_species on public.species_revisions(species_id, created_at desc);

alter table public.species_revisions enable row level security;

create policy "revisions readable by everyone"
  on public.species_revisions for select
  using (true);

create policy "authenticated add revisions"
  on public.species_revisions for insert
  to authenticated
  with check (auth.uid() = author_id);

-- NOTE: no update/delete policy at all. History is immutable by design —
-- a "revert" is just a new revision carrying the old body.

-- New revision automatically becomes the live one.
create or replace function public.promote_revision()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.species
     set current_revision_id = new.id,
         updated_at = now()
   where id = new.species_id;
  return new;
end;
$$;

create trigger trg_promote_revision
  after insert on public.species_revisions
  for each row execute function public.promote_revision();

alter table public.species
  add constraint fk_species_current_revision
  foreign key (current_revision_id)
  references public.species_revisions(id) on delete set null;

-- =====================================================================
-- LINK TREES -> SPECIES
-- (001 shipped species_name_cache as free text; this upgrades it.)
-- =====================================================================
alter table public.trees
  add column if not exists species_id uuid references public.species(id) on delete set null;

create index if not exists idx_trees_species on public.trees(species_id);

-- Keep species.tree_count accurate — it drives "142 growers have this tree".
create or replace function public.sync_species_tree_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.species_id is not null then
      update public.species set tree_count = tree_count + 1 where id = new.species_id;
    end if;

  elsif tg_op = 'DELETE' then
    if old.species_id is not null then
      update public.species set tree_count = greatest(tree_count - 1, 0) where id = old.species_id;
    end if;

  elsif tg_op = 'UPDATE' and old.species_id is distinct from new.species_id then
    if old.species_id is not null then
      update public.species set tree_count = greatest(tree_count - 1, 0) where id = old.species_id;
    end if;
    if new.species_id is not null then
      update public.species set tree_count = tree_count + 1 where id = new.species_id;
    end if;
  end if;

  return null;
end;
$$;

create trigger trg_species_tree_count
  after insert or update or delete on public.trees
  for each row execute function public.sync_species_tree_count();

-- =====================================================================
-- SPECIES_PHOTOS  (community gallery — real trees, not stock photos)
-- Only media from a PUBLIC tree may be surfaced here.
-- =====================================================================
create table if not exists public.species_photos (
  id         uuid primary key default gen_random_uuid(),
  species_id uuid not null references public.species(id) on delete cascade,
  media_id   uuid not null references public.tree_media(id) on delete cascade,
  added_by   uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (species_id, media_id)
);

create index if not exists idx_species_photos on public.species_photos(species_id, created_at desc);

alter table public.species_photos enable row level security;

create policy "species photos readable by everyone"
  on public.species_photos for select
  using (true);

-- You may only contribute your own media, and only from a tree you made public.
create policy "owner contributes own public media"
  on public.species_photos for insert
  to authenticated
  with check (
    auth.uid() = added_by
    and exists (
      select 1 from public.tree_media m
      join public.trees t on t.id = m.tree_id
      where m.id = species_photos.media_id
        and m.owner_id = auth.uid()
        and t.is_public = true
    )
  );

create policy "owner removes own contribution"
  on public.species_photos for delete
  using (auth.uid() = added_by);

-- =====================================================================
-- CARE_TEMPLATES  (a shareable schedule — "fork this to my tree")
-- =====================================================================
create table if not exists public.care_templates (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references public.profiles(id) on delete cascade,
  species_id     uuid references public.species(id) on delete set null,
  name           text not null,                -- 'Olive — Mediterranean, outdoor'
  climate_region text,                         -- must match profiles.climate_region vocabulary
  description    text,
  is_public      boolean not null default false,
  forked_from_id uuid references public.care_templates(id) on delete set null,
  fork_count     int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_templates_species on public.care_templates(species_id) where is_public;
create index if not exists idx_templates_owner on public.care_templates(owner_id);

alter table public.care_templates enable row level security;

create policy "owner manages own templates"
  on public.care_templates for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "public templates readable by everyone"
  on public.care_templates for select
  using (is_public = true);

create trigger trg_templates_updated
  before update on public.care_templates
  for each row execute function public.set_updated_at();

-- =====================================================================
-- CARE_TEMPLATE_ITEMS  (the rows inside a template)
-- Mirrors care_tasks so applying a template is a straight copy.
-- =====================================================================
create table if not exists public.care_template_items (
  id            uuid primary key default gen_random_uuid(),
  template_id   uuid not null references public.care_templates(id) on delete cascade,
  task_type     text not null
                  check (task_type in
                    ('water','fertilize','prune','wire','repot','pest_check','other')),
  interval_days int,
  season        text check (season in ('spring','summer','autumn','winter')),
  note          text,
  sort_order    int not null default 0,
  -- a task is either fixed-interval or seasonal — never neither
  constraint chk_item_timing check (interval_days is not null or season is not null)
);

create index if not exists idx_template_items on public.care_template_items(template_id, sort_order);

alter table public.care_template_items enable row level security;

create policy "owner manages own template items"
  on public.care_template_items for all
  using (exists (
    select 1 from public.care_templates t
    where t.id = care_template_items.template_id and t.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.care_templates t
    where t.id = care_template_items.template_id and t.owner_id = auth.uid()
  ));

create policy "public template items readable"
  on public.care_template_items for select
  using (exists (
    select 1 from public.care_templates t
    where t.id = care_template_items.template_id and t.is_public = true
  ));

-- =====================================================================
-- RPC: fork_care_template
-- Copy someone's public template into my own library (GitHub-style fork).
-- =====================================================================
create or replace function public.fork_care_template(p_template_id uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_src public.care_templates%rowtype;
  v_new_id uuid;
begin
  select * into v_src from public.care_templates where id = p_template_id;

  if v_src.id is null then
    raise exception 'template not found';
  end if;

  -- may fork a public template, or one you already own
  if v_src.is_public = false and v_src.owner_id <> auth.uid() then
    raise exception 'not allowed';
  end if;

  insert into public.care_templates
    (owner_id, species_id, name, climate_region, description, is_public, forked_from_id)
  values
    (auth.uid(), v_src.species_id, v_src.name, v_src.climate_region,
     v_src.description, false, v_src.id)
  returning id into v_new_id;

  insert into public.care_template_items
    (template_id, task_type, interval_days, season, note, sort_order)
  select v_new_id, task_type, interval_days, season, note, sort_order
    from public.care_template_items
   where template_id = p_template_id;

  update public.care_templates
     set fork_count = fork_count + 1
   where id = p_template_id;

  return v_new_id;
end;
$$;

-- =====================================================================
-- RPC: apply_care_template_to_tree
-- Turn a template into live care_tasks on one of my trees.
-- next_due for seasonal items is left null — care-engine.js computes it
-- client-side from season + the owner's climate_region (decision #5.4).
-- =====================================================================
create or replace function public.apply_care_template_to_tree(
  p_template_id uuid,
  p_tree_id     uuid,
  p_replace     boolean default false
)
returns int
language plpgsql
security definer set search_path = public
as $$
declare
  v_is_public boolean;
  v_t_owner   uuid;
  v_count     int;
begin
  select is_public, owner_id into v_is_public, v_t_owner
    from public.care_templates where id = p_template_id;

  if v_t_owner is null then
    raise exception 'template not found';
  end if;

  if v_is_public = false and v_t_owner <> auth.uid() then
    raise exception 'not allowed';
  end if;

  -- the tree must be mine
  if not exists (
    select 1 from public.trees
    where id = p_tree_id and owner_id = auth.uid()
  ) then
    raise exception 'not allowed';
  end if;

  if p_replace then
    update public.care_tasks set is_active = false where tree_id = p_tree_id;
  end if;

  insert into public.care_tasks
    (tree_id, owner_id, task_type, interval_days, season, next_due)
  select
    p_tree_id,
    auth.uid(),
    i.task_type,
    i.interval_days,
    i.season,
    case when i.interval_days is not null
         then current_date + i.interval_days
         else null
    end
  from public.care_template_items i
  where i.template_id = p_template_id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
