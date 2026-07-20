# Nebari — screen map & build order

> The list of screens, their files, and what's built. Status is the only
> column agents may edit (per CLAUDE.md). Update it when you ship a screen.
>
> Legend: ✅ done · ◐ placeholder (stub UI, no logic) · ▢ planned

---

## 1. The tool (owner-facing)

| # | Screen | File | Status |
|---|---|---|---|
| 1.1 | Auth — welcome + magic-link sign in/up | `src/pages/AuthScreen.jsx` | ✅ |
| 1.2 | Onboarding — display name, username, climate region (shown once) | `src/pages/OnboardingScreen.jsx` | ✅ |
| 1.3 | Bench — home tab, your trees as framed photos | `src/pages/BenchScreen.jsx` | ✅ |
| 1.4 | Tree — one tree, its timeline by year | `src/pages/TreeScreen.jsx` | ✅ |
| 1.5 | Import — retroactive photo import (pick → date → review → upload) | `src/pages/ImportScreen.jsx` | ✅ |
| 1.6 | Care tab — today's tasks across all trees (Overdue → Today) | `src/pages/CareScreen.jsx` | ✅ |
| 1.7 | Care schedule — per-tree tasks, add interval/seasonal, deactivate | `src/pages/TreeCareScreen.jsx` | ✅ |
| 1.8 | Settings — editable identity, language, sign out, version/email | `src/pages/SettingsScreen.jsx` | ✅ |
| 1.9 | Growers — community feed | `src/pages/GrowersScreen.jsx` | ◐ |

### Sub-flows & shared overlays

| Screen | File | Status |
|---|---|---|
| New tree — create, then flow into import | `src/pages/NewTreeScreen.jsx` | ✅ |
| Photo viewer — set cover / delete photo (two-tap) | `src/components/PhotoViewer.jsx` | ✅ |
| Review undated — import step 2 (extracted from ImportScreen) | `src/components/ReviewUndated.jsx` | ✅ |

---

## 2. Community (the street) — phase 3

Public share pages, timelapses, before/after compositions and following
growers land here. All ▢ planned; the Growers tab (1.9) is the entry point.

---

_Statuses current as of **v0.8** — onboarding, care (tab + per-tree),
import restyle and settings shipped._
