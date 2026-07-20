# TASK v0.9 — Sharing & Community (spec phases 2 + 3)

Read `CLAUDE.md` first. All its rules apply. This is one large release:
the public share loop and the Growers community, end to end, client-side only
(no Edge Functions yet). Bump `APP_VERSION` to `v0.9`.

---

## 0. Context you must know

- Schema for everything here ALREADY EXISTS (migrations 001–004). Do not
  invent columns. Key facts:
  - `trees.is_public` (default false), `trees.public_token` (unique text).
  - RPC `get_public_tree_teaser(p_token text) -> jsonb` — granted to `anon`.
    Returns `{ tree, owner, species, preview_media[], timelapse_url, locked{} }`.
  - RPC `get_feed(p_before timestamptz, p_limit int) -> setof posts`.
  - Tables: `posts` (insert allowed only on your own PUBLIC tree),
    `post_likes`, `comments` (one nesting level), `follows`,
    `tree_followers` (only public trees), `share_events` (write-only:
    network in instagram/tiktok/facebook/whatsapp/reddit/link/other;
    asset_type in story_9_16/gif_clean/og_link).
  - Storage: `tree-media` PRIVATE (originals, owner-only, signed URLs);
    `public-media` PUBLIC bucket, path convention `{owner_id}/{tree_id}/...`.
- **Migration 005 (below) will be run by the owner in Supabase.** It allows
  the AUTHENTICATED OWNER to write into `public-media` under their own
  prefix. You must ADD the file `supabase/migrations/005_owner_derivatives.sql`
  to the repo VERBATIM as given in section 7 — do not modify it, do not run it.
  Write all client code assuming these policies are active.
- Publishing a tree fires a DB trigger that queues a `render_jobs` row.
  Ignore it — jobs simply stay `queued` until Edge Functions exist.
- SPA routing is manual (no react-router). Public page needs `vercel.json`
  (section 6) so `/t/<token>` serves `index.html`.

## 1. Publish & share (screen 2.2 — inside TreeScreen)

- Add a `share` section/action in TreeScreen (word-button, shibui style).
- **Publish flow** (`is_public=false → true`), in this order:
  1. Render derivatives client-side on a canvas from the tree's photos
     (signed URLs → draw → JPEG blobs, quality ~0.85):
     - `cover.jpg` — the tree's cover photo, max edge 1200px.
     - `teaser-1.jpg`, `teaser-2.jpg`, `teaser-3.jpg` — first / middle /
       latest photo by `taken_at`, max edge 1200px.
  2. Upload them to `public-media` at `{owner_id}/{tree_id}/<name>.jpg`
     (upsert: true).
  3. `update trees set is_public = true`.
  If any step fails: show the error, do not leave a half-published state
  (set `is_public` back to false if step 3 already ran).
- **After publish**: show the share link
  `https://<current origin>/t/<public_token>` with COPY LINK (clipboard)
  and SHARE (Web Share API when available, fallback = copy). On copy/share,
  insert into `share_events` (network 'link', asset_type 'og_link').
- **Unpublish**: two-step confirm (same pattern as delete). Sets
  `is_public=false`. Do NOT delete the derivatives (re-publish is instant;
  refresh them on every publish).
- **Re-render**: when a published tree's cover changes or photos are
  added/deleted, re-render and re-upload the derivatives silently.

## 2. Public teaser page (screen 2.1 — `/t/<token>`)

- New page `src/pages/PublicTreeScreen.jsx`, reachable WITHOUT login.
  In App.jsx, before the auth gate: if `location.pathname` matches
  `/t/<token>`, render this page (works for both anon and logged-in users).
- Data: call `get_public_tree_teaser(token)` via `supabase.rpc`. `null`
  result → quiet "This tree is private or does not exist" state with a
  link to the app root.
- Layout (shibui, passe-partout frames, horizon line under images only):
  - Wordmark small at top ("nebari").
  - Tree name (Mincho) + species + owner display name/@username.
  - The 3 preview photos framed, each with its year caption — BUT load them
    from `public-media` (`{owner}/{tree}/teaser-N.jpg` public URLs), NOT
    from the private paths in `preview_media`. The RPC's `preview_media`
    is used only for the `taken_at` year captions (match by order).
    Note: the RPC does not return owner_id/tree_id — so ALSO extend nothing;
    instead derive the public URLs like this: query
    `trees` select `id, owner_id` where `public_token = token` (RLS allows
    anon to read public trees) and build the paths from that.
  - The `locked` object rendered as quiet teaser math, e.g.
    "47 photographs · 6 milestones · 5 years tended · 12 following".
  - CTA at the bottom: "Grow yours on Nebari" → app root.
- If a viewer is LOGGED IN and not the owner: show FOLLOW / FOLLOWING
  word-button (insert/delete `tree_followers`).

## 3. Timelapse viewer (screen 2.3 — in-app)

- In TreeScreen, when a tree has ≥ 3 photos: a `timelapse` word-action.
- Fullscreen overlay player, client-side crossfade between the tree's
  photos in `taken_at` order (CSS opacity transitions; preload next image).
  ~1.2s per frame, crossfade ~400ms. Show a small caption of the current
  photo's month+year. Controls: play/pause (tap), close (× or BACK word).
  No new dependencies, no video encoding — this is a slideshow that feels
  like a timelapse.
- Component: `src/components/TimelapsePlayer.jsx`.

## 4. Story export (screen 2.4 — 9:16)

- In the share section of a PUBLISHED tree: `story image` action.
- Render on an offscreen canvas 1080×1920: paper background (#FCFAF6),
  the cover photo in a passe-partout frame, horizon gradient line under it,
  tree name in the serif stack, "yyyy – yyyy" year range, small "nebari"
  wordmark bottom-center as watermark.
- Output: download as `<tree-name>-story.png` (anchor download). After a
  successful export, log `share_events` (network 'other',
  asset_type 'story_9_16').
- Component/helper: `src/lib/storyCanvas.js` (pure function building the
  canvas) + minimal UI in the share section. Keep files ≤ 300 lines.

## 5. Growers — real community (screens 3.1–3.2, replaces placeholder)

- **GrowersScreen** gets two word-tabs (same pattern as Care):
  - **DISCOVER** — grid of public trees: query `trees` (is_public=true,
    order by created_at desc, page 24) joined with `profiles`
    (username/display_name). Card = cover from
    `public-media {owner}/{tree}/cover.jpg` in a passe-partout frame,
    tree name, @username. Tap → the public tree view (reuse
    PublicTreeScreen's content component in-app, passing the token).
  - **FEED** — `get_feed()` posts (keyset pagination on created_at,
    "more" word-button). Post card: author @username, tree name, body,
    photo (post.media_id → if the tree is public, prefer the tree's
    public cover; otherwise signed URL — the RLS lets any authenticated
    user read media rows of public trees, but the FILE is private, so:
    posts render TEXT + the tree's public-media cover only. Keep it simple
    and correct), relative time, like count.
  - Like toggle: word `like` / `liked` (insert/delete `post_likes`,
    optimistic UI, error rollback).
  - Comments: tapping `comments (n)` expands inline: list (author,
    body, time; replies indented one level) + a quiet input to add a
    comment. Insert into `comments`.
- **Posting**: in TreeScreen of a PUBLIC tree, action `post update` —
  small form: text body (required, ≤ 500 chars) + optional "attach latest
  photo" toggle (sets media_id to the newest tree_media). Insert into
  `posts` (post_type 'update'). If the DB rejects (RLS), show the parsed
  error. On an unpublished tree the action shows as disabled with hint
  "publish the tree first".

## 6. Routing & config

- `vercel.json` at repo root:
  ```json
  { "rewrites": [{ "source": "/((?!assets/).*)", "destination": "/index.html" }] }
  ```
- App.jsx: parse `/t/<token>` before the auth gate; everything else
  behaves as today. Keep App.jsx routing-only and ≤ 300 lines.

## 7. Migration file to add verbatim

Create `supabase/migrations/005_owner_derivatives.sql` with EXACTLY:

```sql
-- =====================================================================
-- 005_owner_derivatives.sql
-- Allow the authenticated OWNER to write derived assets (teaser frames,
-- cover, story renders) into public-media under their own prefix.
-- Originals in tree-media remain private. Edge Functions (service_role)
-- keep full write access and will take over rendering later.
-- Path convention (from 004): {owner_id}/{tree_id}/{file}
-- =====================================================================

create policy "owner writes own public derivatives"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'public-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "owner updates own public derivatives"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'public-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'public-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "owner deletes own public derivatives"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'public-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
```

## 8. Housekeeping (required)

- **Design fix**: SettingsScreen currently renders a horizon line under
  BACK. Remove it — the horizon appears ONLY under photographs and the
  tree-screen header (docs/04-design.md). Audit the other screens for the
  same violation while you're there.
- All new strings via `t()` in BOTH `en.js` and `he.js`, key-for-key.
  Suggested namespaces: `share.*`, `public.*`, `growers.*`, `post.*`,
  `timelapse.*`.
- Update `docs/05-screens.md`: mark 2.1–2.4 and 3.1–3.2 as built (v0.9),
  note that timelapse is a client-side slideshow pending Edge Functions.
- `npm run build` must pass before you finish.

## 9. Acceptance criteria

1. Publish a tree → derivatives appear in `public-media/{owner}/{tree}/`,
   link shown, copy works, `share_events` row written.
2. Open `/t/<token>` in an incognito window (no login) → teaser page with
   3 framed photos, locked stats, CTA. Invalid token → quiet not-found.
3. Unpublish → the same URL shows the not-found state.
4. Timelapse plays chronologically fullscreen and closes cleanly.
5. Story export downloads a 1080×1920 PNG matching the design language.
6. Second account: sees the tree in DISCOVER, opens it, follows it,
   sees its posts in FEED, likes and comments successfully.
7. Posting from an unpublished tree is blocked with a clear hint.
8. No horizon line anywhere except photos + tree header. Build green,
   locales complete, no file > 300 lines, no new dependencies.
