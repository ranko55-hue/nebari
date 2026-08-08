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

---

## 2. Sharing (screens 2.x)

| # | Screen | File | Status |
|---|---|---|---|
| 2.1 | Public teaser page `/t/<token>` — anon-safe, 3 framed photos + locked stats + CTA | `src/pages/PublicTreeScreen.jsx`, `src/components/PublicTreeContent.jsx` | ✅ |
| 2.2 | Publish & share — in TreeScreen: render derivatives → publish, link/copy/Web-Share, unpublish | `src/components/TreeShare.jsx` | ✅ |
| 2.3 | Timelapse viewer — client-side crossfade slideshow (video pending Edge Functions) | `src/components/TimelapsePlayer.jsx` | ✅ |
| 2.4 | Story export — offscreen 1080×1920 PNG, passe-partout + wordmark | `src/lib/storyCanvas.js` (+ TreeShare) | ✅ |

## 3. Community (screens 3.x)

| # | Screen | File | Status |
|---|---|---|---|
| 3.1 | Growers → Discover — grid of public trees | `src/pages/GrowersScreen.jsx`, `src/components/DiscoverGrid.jsx` | ✅ |
| 3.2 | Growers → Feed — get_feed posts, like, comments, posting | `src/components/FeedList.jsx`, `src/components/PostComments.jsx` | ✅ |

### Sub-flows & shared overlays

| Screen | File | Status |
|---|---|---|
| New tree — create, then flow into import | `src/pages/NewTreeScreen.jsx` | ✅ |
| Photo viewer — set cover / delete photo (two-tap) | `src/components/PhotoViewer.jsx` | ✅ |
| Review undated — import step 2 (extracted from ImportScreen) | `src/components/ReviewUndated.jsx` | ✅ |
| Passe-partout frame — the community photo frame | `src/components/ui.jsx` | ✅ |

---

_Statuses current as of **v0.9** — public sharing (2.1–2.4) and the Growers
community (3.1–3.2) shipped, client-side only. The timelapse is a crossfade
slideshow and teaser/cover/story assets are rendered on the client and
uploaded to public-media; Edge Functions will take over rendering later._
