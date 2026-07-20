# TASK v0.8 — "the tool is complete"

Read CLAUDE.md first. This task ships four features in ONE version, v0.8.
Work in this order; each item has acceptance criteria. Keep the shibui
language everywhere — when unsure, copy patterns from BenchScreen/TreeScreen.

---

## 1. Onboarding (screen 1.2)

New file `src/pages/OnboardingScreen.jsx`.

**Trigger:** after sign-in, if the profile still has the provisional
identity (username starts with `grower_` AND display_name is null or
'New Grower'), App routes to Onboarding instead of Bench. Shown once —
after saving, go to Bench.

**Fields (one quiet form, shibui):**
- Display name (required, 2–40 chars)
- Username (required, lowercase a–z 0–9 and hyphens, 3–24 chars; on unique
  violation show `errors.DUPLICATE` and let them retry)
- Climate region — a simple select with exactly these values, stored as-is:
  `mediterranean`, `temperate`, `tropical`, `arid`, `continental`
  (labels via t(), both locales)

**Saves to** `profiles` (update own row). Errors surfaced.

**Acceptance:** fresh user lands on Onboarding once; existing completed
profiles never see it; values persist; Settings later shows them.

## 2. Care (screens 1.6 + 1.7)

### 2a. Per-tree care (1.7) — `src/pages/TreeCareScreen.jsx`
Entry: a quiet text link `care schedule` in TreeScreen's top bar area.
- Lists the tree's care_tasks (active first): task type word, cadence
  ("every 7 days" / season name), next_due.
- Add task: type select (water/fertilize/prune/wire/repot/pest_check),
  cadence = interval days (number input) OR season select. next_due for
  interval tasks = today + interval; seasonal tasks leave next_due null.
- Deactivate (is_active=false) via a two-tap confirm, same pattern as
  photo delete.

### 2b. Care tab (1.6) — replace the placeholder in `src/pages/CareScreen.jsx`
- Query the user's active care_tasks with next_due <= today, join tree
  names client-side (two queries are fine).
- Group: "Overdue" then "Today". Each row: tree name (Mincho), task word,
  days overdue if any, and a `done` text button that calls the
  `complete_care_task` RPC, then removes the row.
- Empty → keep the existing EmptyState.

**Acceptance:** add a water task every 3 days on one tree → it appears in
Care tab today → mark done → disappears, care_log row exists, next_due
moved 3 days ahead (verify via the tree's care screen).

## 3. ImportScreen restyle (1.5)

- Extract `ReviewUndated` into `src/components/ReviewUndated.jsx`.
- Restyle both files to the shibui language using components/ui.jsx
  primitives (S.shell, Wordmark, Horizon, underlined text-buttons,
  hairline borders). NO logic changes — resolveBatch/importBatch flow,
  phases, and milestone-gap suggestions stay exactly as they are.
- Both files ≤300 lines.

**Acceptance:** import flow works end-to-end identically, looks native to
the rest of the app.

## 4. Settings expansion (1.8)

`src/pages/SettingsScreen.jsx`:
- Editable: display name, username (same rules as onboarding), climate
  region select. Save button with surfaced errors.
- Keep: language toggle, sign out.
- Show read-only at the bottom: app version, signed-in email.

**Acceptance:** edits persist and reflect in Bench greeting… (there is no
greeting currently — just verify by reloading Settings).

---

## Version & housekeeping
- APP_VERSION → `v0.8`.
- docs/05-screens.md: mark 1.2, 1.5, 1.6, 1.7, 1.8 as ✅.
- All new strings in BOTH locales under sensible keys
  (`onboarding.*`, `care.*` extends existing, `settings.*`).
- Final commit message: `v0.8 — onboarding, care, import restyle, settings`.
