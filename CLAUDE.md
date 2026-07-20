CLAUDE.md — Nebari project context for coding agents
Read this fully before touching any file. Then read the task file you were
pointed to (docs/TASK-*.md).
What this is
Nebari — a bonsai-grower web app. React 18 + Vite, Supabase (auth/DB/storage),
deployed on Vercel via git push to `main`. Live at nebari-dusky.vercel.app.
The product spec is docs/01-product.md; the screen map and build order is
docs/05-screens.md.
Hard rules (violating any of these fails the task)
Never edit files in `supabase/migrations/`. They already ran in
production. Schema changes = a NEW numbered migration file, and only if
the task explicitly asks for one.
Design language is locked — docs/04-design.md. Shibui: whitespace,
1px hairlines, words instead of icons, colors ONLY via CSS vars from
`src/styles/theme.css`. No new colors, no gradients, no icon libraries,
no emoji in UI chrome. The single brush stroke (components/ui.jsx
BrushStroke) is the only illustration allowed.
≤300 lines per file. Split before you exceed.
Every user-facing string goes through `t()` (src/lib/i18n.js) and
must be added to BOTH `src/locales/en.js` and `src/locales/he.js`,
key-for-key. RTL is automatic — never hardcode left/right; use
logical CSS (insetInlineStart etc.) as the existing code does.
Bump `APP_VERSION` in src/App.jsx exactly as the task specifies.
Errors are never swallowed. Every Supabase call's error is either
surfaced in the UI (the ⚠️ pattern in BenchScreen/TreeScreen) or
translated via `parseDbError` (src/lib/supabase.js).
No new dependencies unless the task explicitly allows it.
Do not touch the Supabase keys/env handling, vite.config.js, or
anything under docs/ except the status columns in docs/05-screens.md.
`npm run build` must pass before you push. Push to `main` only.
Architecture orientation
`src/App.jsx` — shell + routing ONLY. Tabs: bench/care/growers/settings,
plus overlays: newTree, tree, import.
`src/pages/*.jsx` — one screen per file.
`src/components/ui.jsx` — shared shibui primitives (S styles, Wordmark,
Horizon, BrushStroke, EmptyState). Build new UI from these.
`src/lib/` — supabase client + helpers, exif resolver, upload engine, i18n.
DB tables you'll touch are defined in supabase/migrations/001 (profiles,
trees, tree_media, tree_milestones, care_tasks, care_log). RLS is
owner-based: always filter by the session user; inserts must set owner_id.
`complete_care_task(p_task_id, p_note, p_media)` RPC exists: logs to
care_log AND advances next_due for interval tasks. Use it — don't
reimplement.
Storage path convention `{owner_id}/{tree_id}/{file}` is load-bearing
for RLS. Never build paths any other way (use buildMediaPath).
Definition of done
`npm run build` green, pushed to main, Vercel deploy Ready.
New APP_VERSION visible in the corner.
docs/05-screens.md status column updated for what you built.
A short summary in the final commit message: what changed, per screen.
