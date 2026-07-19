-- =====================================================================
-- 004_storage_buckets.sql
-- Nebari — storage buckets, access policies, render queue
-- Depends on: 001, 002, 003
--
-- ARCHITECTURE:
--   tree-media   PRIVATE  — every original upload. Owner-only, forever.
--   public-media PUBLIC   — derived artefacts only (timelapse, story export,
--                           teaser frames). Written by Edge Functions only.
--   avatars      PUBLIC   — profile pictures.
--
-- A public tree does NOT expose its originals. When a tree is published,
-- an Edge Function renders teaser frames INTO public-media. Originals stay
-- private even if the share link leaks.
-- =====================================================================

-- =====================================================================
-- BUCKETS
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('tree-media', 'tree-media', false, 26214400,   -- 25 MB
     array['image/jpeg','image/png','image/webp','image/heic','video/mp4','video/quicktime']),
  ('public-media', 'public-media', true, 52428800, -- 50 MB (rendered video)
     array['image/jpeg','image/webp','image/gif','video/mp4']),
  ('avatars', 'avatars', true, 2097152,            -- 2 MB
     array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- =====================================================================
-- PATH CONVENTION  (first folder is always the owner's uuid)
--   tree-media   {owner_id}/{tree_id}/{media_id}.jpg
--   public-media {owner_id}/{tree_id}/timelapse.mp4
--   avatars      {owner_id}/avatar.jpg
-- RLS below relies on this. Do not change it without changing the policies.
-- =====================================================================

-- =====================================================================
-- TREE-MEDIA  (private — owner only)
-- =====================================================================
create policy "owner reads own tree media"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'tree-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "owner uploads own tree media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'tree-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "owner updates own tree media"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'tree-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "owner deletes own tree media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'tree-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =====================================================================
-- PUBLIC-MEDIA  (world-readable; only Edge Functions write)
-- =====================================================================
create policy "public media readable by everyone"
  on storage.objects for select
  using (bucket_id = 'public-media');

-- No insert/update policy for authenticated users on purpose.
-- Renders are written with the service_role key from Edge Functions,
-- which bypasses RLS. Clients can never forge a "public" asset.

-- =====================================================================
-- AVATARS
-- =====================================================================
create policy "avatars readable by everyone"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "owner manages own avatar"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =====================================================================
-- RENDER_JOBS  (async queue: timelapse / story export / teaser frames)
-- =====================================================================
create table if not exists public.render_jobs (
  id           uuid primary key default gen_random_uuid(),
  tree_id      uuid not null references public.trees(id) on delete cascade,
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  job_type     text not null
                 check (job_type in ('timelapse','story_9_16','gif_clean','teaser_frames')),
  status       text not null default 'queued'
                 check (status in ('queued','processing','done','failed')),
  -- watermark rules per network (decision #010: reddit gets a clean GIF)
  watermark    boolean not null default true,
  output_path  text,          -- path inside public-media once done
  error        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_render_jobs_queue on public.render_jobs(status, created_at)
  where status in ('queued','processing');
create index if not exists idx_render_jobs_tree on public.render_jobs(tree_id, created_at desc);

alter table public.render_jobs enable row level security;

create policy "owner reads own render jobs"
  on public.render_jobs for select
  using (auth.uid() = owner_id);

-- Client may only queue a job for a tree it owns. Status/output are set by
-- the Edge Function (service_role), never by the client.
create policy "owner queues own render jobs"
  on public.render_jobs for insert
  to authenticated
  with check (
    auth.uid() = owner_id
    and status = 'queued'
    and output_path is null
    and exists (
      select 1 from public.trees t
      where t.id = render_jobs.tree_id and t.owner_id = auth.uid()
    )
  );

create trigger trg_render_jobs_updated
  before update on public.render_jobs
  for each row execute function public.set_updated_at();

-- =====================================================================
-- Publishing a tree queues its teaser frames automatically.
-- Unpublishing does NOT delete the rendered assets — a re-publish should be
-- instant, and the assets are already derived/low-value. Hard delete of the
-- tree cascades and cleans up.
-- =====================================================================
create or replace function public.queue_teaser_on_publish()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.is_public = true and coalesce(old.is_public, false) = false then
    insert into public.render_jobs (tree_id, owner_id, job_type, watermark)
    values (new.id, new.owner_id, 'teaser_frames', false);
  end if;
  return new;
end;
$$;

create trigger trg_queue_teaser_on_publish
  after update of is_public on public.trees
  for each row execute function public.queue_teaser_on_publish();

-- =====================================================================
-- FREE-TIER LIMIT: 3 trees (product spec §6)
-- Enforced in the DB so a client bug can never hand out free unlimited trees.
-- Replaced in the Stripe migration (005) with a subscription check.
-- =====================================================================
create or replace function public.enforce_tree_limit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_count int;
begin
  select count(*) into v_count from public.trees where owner_id = new.owner_id;
  if v_count >= 3 then
    raise exception 'free_tier_tree_limit'
      using hint = 'Upgrade to Premium for unlimited trees.';
  end if;
  return new;
end;
$$;

create trigger trg_enforce_tree_limit
  before insert on public.trees
  for each row execute function public.enforce_tree_limit();

-- =====================================================================
-- Keep profiles.tree_count accurate (column added in 003).
-- =====================================================================
create or replace function public.sync_profile_tree_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set tree_count = tree_count + 1 where id = new.owner_id;
  elsif tg_op = 'DELETE' then
    update public.profiles set tree_count = greatest(tree_count - 1, 0) where id = old.owner_id;
  end if;
  return null;
end;
$$;

create trigger trg_profile_tree_count
  after insert or delete on public.trees
  for each row execute function public.sync_profile_tree_count();
