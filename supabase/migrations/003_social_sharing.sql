-- =====================================================================
-- 003_social_sharing.sql
-- Nebari — social layer + public sharing
-- Follows, tree followers, posts, likes, comments, feed RPC, teaser RPC.
-- Depends on: 001_core_schema.sql, 002_knowledge.sql
-- =====================================================================

-- =====================================================================
-- PROFILE COUNTERS (denormalised — the feed reads these constantly)
-- =====================================================================
alter table public.profiles
  add column if not exists follower_count  int not null default 0,
  add column if not exists following_count int not null default 0,
  add column if not exists tree_count      int not null default 0;

-- =====================================================================
-- FOLLOWS  (user -> user)
-- =====================================================================
create table if not exists public.follows (
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint chk_no_self_follow check (follower_id <> following_id)
);

create index if not exists idx_follows_following on public.follows(following_id);

alter table public.follows enable row level security;

create policy "follows readable by everyone"
  on public.follows for select
  using (true);

create policy "user follows as self"
  on public.follows for insert
  to authenticated
  with check (auth.uid() = follower_id);

create policy "user unfollows as self"
  on public.follows for delete
  using (auth.uid() = follower_id);

create or replace function public.sync_follow_counts()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
    update public.profiles set follower_count  = follower_count  + 1 where id = new.following_id;
  elsif tg_op = 'DELETE' then
    update public.profiles set following_count = greatest(following_count - 1, 0) where id = old.follower_id;
    update public.profiles set follower_count  = greatest(follower_count  - 1, 0) where id = old.following_id;
  end if;
  return null;
end;
$$;

create trigger trg_follow_counts
  after insert or delete on public.follows
  for each row execute function public.sync_follow_counts();

-- =====================================================================
-- TREE_FOLLOWERS  (follow a specific tree — "watch this tree grow")
-- This is the hook the public teaser page converts on.
-- =====================================================================
create table if not exists public.tree_followers (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  tree_id    uuid not null references public.trees(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, tree_id)
);

create index if not exists idx_tree_followers_tree on public.tree_followers(tree_id);

alter table public.tree_followers enable row level security;

create policy "tree followers readable by everyone"
  on public.tree_followers for select
  using (true);

-- You can only follow a tree its owner made public.
create policy "user follows public trees"
  on public.tree_followers for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.trees t
      where t.id = tree_followers.tree_id and t.is_public = true
    )
  );

create policy "user unfollows tree as self"
  on public.tree_followers for delete
  using (auth.uid() = user_id);

-- =====================================================================
-- POSTS  (what lands in the feed — always tied to a tree)
-- =====================================================================
create table if not exists public.posts (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references public.profiles(id) on delete cascade,
  tree_id       uuid not null references public.trees(id) on delete cascade,
  post_type     text not null default 'update'
                  check (post_type in ('update','timelapse','before_after','milestone','question')),
  body          text,
  media_id      uuid references public.tree_media(id) on delete set null,
  -- rendered artefacts produced by the Edge Functions
  timelapse_url text,
  like_count    int not null default 0,
  comment_count int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_posts_author on public.posts(author_id, created_at desc);
create index if not exists idx_posts_tree on public.posts(tree_id, created_at desc);
create index if not exists idx_posts_created on public.posts(created_at desc);

alter table public.posts enable row level security;

-- The feed is public — anon reads it (drives sign-ups).
create policy "posts readable by everyone"
  on public.posts for select
  using (true);

-- You may only post about your own tree, and only once it's public.
-- Publishing a post IS making it public — no accidental exposure.
create policy "author posts about own public tree"
  on public.posts for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.trees t
      where t.id = posts.tree_id
        and t.owner_id = auth.uid()
        and t.is_public = true
    )
  );

create policy "author updates own posts"
  on public.posts for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "author deletes own posts"
  on public.posts for delete
  using (auth.uid() = author_id);

create trigger trg_posts_updated
  before update on public.posts
  for each row execute function public.set_updated_at();

-- =====================================================================
-- POST_LIKES
-- =====================================================================
create table if not exists public.post_likes (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.post_likes enable row level security;

create policy "likes readable by everyone"
  on public.post_likes for select
  using (true);

create policy "user likes as self"
  on public.post_likes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "user unlikes as self"
  on public.post_likes for delete
  using (auth.uid() = user_id);

create or replace function public.sync_like_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

create trigger trg_like_count
  after insert or delete on public.post_likes
  for each row execute function public.sync_like_count();

-- =====================================================================
-- COMMENTS  (one level of nesting — no infinite threads)
-- =====================================================================
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  parent_id  uuid references public.comments(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_comments_post on public.comments(post_id, created_at);

alter table public.comments enable row level security;

create policy "comments readable by everyone"
  on public.comments for select
  using (true);

create policy "user comments as self"
  on public.comments for insert
  to authenticated
  with check (auth.uid() = author_id);

create policy "author edits own comment"
  on public.comments for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

-- Post owner may also delete comments on their own post (basic moderation).
create policy "author or post owner deletes comment"
  on public.comments for delete
  using (
    auth.uid() = author_id
    or exists (
      select 1 from public.posts p
      where p.id = comments.post_id and p.author_id = auth.uid()
    )
  );

create trigger trg_comments_updated
  before update on public.comments
  for each row execute function public.set_updated_at();

create or replace function public.sync_comment_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

create trigger trg_comment_count
  after insert or delete on public.comments
  for each row execute function public.sync_comment_count();

-- =====================================================================
-- SHARE_EVENTS  (measure the growth loop — which network actually converts)
-- =====================================================================
create table if not exists public.share_events (
  id         uuid primary key default gen_random_uuid(),
  tree_id    uuid references public.trees(id) on delete set null,
  user_id    uuid references public.profiles(id) on delete set null,
  network    text not null
               check (network in ('instagram','tiktok','facebook','whatsapp','reddit','link','other')),
  asset_type text check (asset_type in ('story_9_16','gif_clean','og_link')),
  created_at timestamptz not null default now()
);

create index if not exists idx_share_events on public.share_events(network, created_at desc);

alter table public.share_events enable row level security;

create policy "user logs own share"
  on public.share_events for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Write-only from the client. Nobody reads this except analytics.

-- =====================================================================
-- RPC: get_feed
-- Posts from people I follow + trees I follow + my own. Keyset pagination.
-- =====================================================================
create or replace function public.get_feed(
  p_before timestamptz default null,
  p_limit  int default 20
)
returns setof public.posts
language sql
stable
security definer set search_path = public
as $$
  select p.*
    from public.posts p
   where (
      p.author_id = auth.uid()
      or p.author_id in (select following_id from public.follows where follower_id = auth.uid())
      or p.tree_id in (select tree_id from public.tree_followers where user_id = auth.uid())
   )
     and (p_before is null or p.created_at < p_before)
   order by p.created_at desc
   limit least(p_limit, 50);
$$;

-- =====================================================================
-- RPC: get_public_tree_teaser   (decision #007)
-- The share page reads ONLY through this. Anon never touches the tables.
-- Returns: tree meta + cover + the 3 most spread-out photos + timelapse.
-- Deliberately withholds: full media history, care schedule, care log.
-- =====================================================================
create or replace function public.get_public_tree_teaser(p_token text)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_tree   public.trees%rowtype;
  v_result jsonb;
begin
  select * into v_tree
    from public.trees
   where public_token = p_token and is_public = true;

  if v_tree.id is null then
    return null;
  end if;

  select jsonb_build_object(
    'tree', jsonb_build_object(
      'name',        v_tree.name,
      'style',       v_tree.style,
      'age_years',   v_tree.estimated_age_years,
      'token',       v_tree.public_token,
      'created_at',  v_tree.created_at
    ),
    'owner', (
      select jsonb_build_object(
        'username',     pr.username,
        'display_name', pr.display_name,
        'avatar_url',   pr.avatar_url
      )
      from public.profiles pr where pr.id = v_tree.owner_id
    ),
    'species', (
      select jsonb_build_object(
        'common_name',     s.common_name,
        'scientific_name', s.scientific_name,
        'slug',            s.slug
      )
      from public.species s where s.id = v_tree.species_id
    ),
    -- the story in three frames: first, middle, latest
    'preview_media', (
      select coalesce(jsonb_agg(x order by x->>'taken_at'), '[]'::jsonb)
      from (
        (select jsonb_build_object('storage_path', m.storage_path, 'taken_at', m.taken_at) as x
           from public.tree_media m
          where m.tree_id = v_tree.id and m.media_type = 'image'
          order by m.taken_at asc limit 1)
        union
        (select jsonb_build_object('storage_path', m.storage_path, 'taken_at', m.taken_at)
           from public.tree_media m
          where m.tree_id = v_tree.id and m.media_type = 'image'
          order by m.taken_at desc limit 1)
        union
        (select jsonb_build_object('storage_path', m.storage_path, 'taken_at', m.taken_at)
           from public.tree_media m
          where m.tree_id = v_tree.id and m.media_type = 'image'
          offset greatest(
            (select count(*) from public.tree_media where tree_id = v_tree.id and media_type = 'image') / 2 - 1,
            0
          ) limit 1)
      ) sub
    ),
    'timelapse_url', (
      select p.timelapse_url
        from public.posts p
       where p.tree_id = v_tree.id and p.timelapse_url is not null
       order by p.created_at desc limit 1
    ),
    -- teaser math: what they're missing if they don't sign up
    'locked', jsonb_build_object(
      'total_photos',   (select count(*) from public.tree_media where tree_id = v_tree.id),
      'milestones',     (select count(*) from public.tree_milestones where tree_id = v_tree.id),
      'years_tracked',  (
        select coalesce(
          extract(year from age(max(taken_at), min(taken_at)))::int, 0
        ) from public.tree_media where tree_id = v_tree.id
      ),
      'followers',      (select count(*) from public.tree_followers where tree_id = v_tree.id)
    )
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.get_public_tree_teaser(text) to anon, authenticated;
