# Nebari — ארכיטקטורה ומוסכמות

---

## 1. סטאק

| שכבה | בחירה | למה |
|---|---|---|
| Frontend | React + Vite | אותו סטאק כמו פרליו/טסקו — אפס עקומת למידה |
| DB / Auth / Storage | Supabase | RLS, Storage לתמונות, Edge Functions |
| Deploy | Vercel | דפי שיתוף צריכים SSR/OG tags |
| Push | Web Push (PWA) | לא צריך אפליקציה חנותית ל-MVP |
| רינדור וידאו | Edge Function + FFmpeg | timelapse + ייצוא סטורי בצד שרת |
| תשלומים | Stripe | גלובלי, מנויים |

**PWA ולא native ב-MVP** — מהיר יותר, בלי אישורי חנות, והמנגנון כבר מוכר לך מפרליו.

---

## 2. מבנה תיקיות

```
nebari/
├── docs/
│   ├── 01-product.md
│   ├── 02-architecture.md
│   └── 03-decisions.md
├── supabase/
│   ├── migrations/
│   │   ├── 001_core_schema.sql      ✅
│   │   ├── 002_knowledge.sql        ✅
│   │   ├── 003_social_sharing.sql   ✅
│   │   ├── 004_storage_buckets.sql  ✅
│   │   └── 005_billing.sql          ⬜ Stripe — אחרי אימות
│   └── functions/
│       ├── render-timelapse/        ⬜
│       ├── render-story/            ⬜
│       └── render-teaser-frames/    ⬜
└── src/
    ├── components/
    ├── pages/
    ├── lib/
    │   ├── supabase.js
    │   ├── exif.js                  ← חילוץ taken_at
    │   └── care-engine.js           ← חישוב next_due לפי עונה/אקלים
    └── locales/
        ├── en.js                    ← ברירת מחדל (שוק גלובלי!)
        └── he.js
```

---

## 3. מוסכמות קוד

- **תקרה של 300 שורות לקובץ.** עובר? מפצלים.
- **מיגרציות ממוספרות**, לעולם לא עורכים מיגרציה שכבר רצה — מוסיפים חדשה.
- **מחרוזות מרוכזות ב-`src/locales/`** — אין טקסט קשיח ב-JSX.
- **`en.js` היא ברירת המחדל.** מוצר גלובלי מהיום הראשון, עברית היא תוספת.
- **כל החלטה מהותית נרשמת ב-`docs/03-decisions.md`.**
- קבצים מלאים בכל מסירה, אף פעם לא diff.

---

## 4. עבודה בענן בלבד

GitHub web editor + Supabase SQL Editor + Vercel. אין קבצים מקומיים.

---

## 5. החלטות טכניות מפתח

### 5.1 `taken_at` נפרד מ-`uploaded_at`
כל ציר הזמן ממוין לפי `taken_at`. EXIF נשלף בצד לקוח לפני ההעלאה.
נפילות: וואטסאפ/צילומי מסך מוחקים EXIF → fallback לגרירה על הציר או "קיץ 2020".

### 5.2 דפי שיתוף = SSR
OG tags חייבים להתרנדר בשרת, אחרת אין preview בפייסבוק/וואטסאפ.
זה מה שמכתיב Vercel ולא static hosting.

### 5.3 טיזר דרך RPC, לא RLS
`get_public_tree_teaser(token)` — `SECURITY DEFINER`, מוענק ל-anon.
מחזיר: מטא של העץ, בעלים, מין, **3 תמונות (ראשונה/אמצעית/אחרונה)**, timelapse,
ואובייקט `locked` עם **מספרים בלבד** (47 תמונות, 5 שנים) — לא תוכן.
anon מריץ את הפונקציה, לא נוגע בטבלאות.

### 5.4 מנוע הטיפול
`next_due` מחושב מ-`interval_days` (קבוע) או מ-`season` + `climate_region` (עונתי).
לוגיקה ב-`care-engine.js`, לא ב-DB — קל לכוונן.
`apply_care_template_to_tree` משאיר `next_due = null` למשימות עונתיות בכוונה.

### 5.5 ווטרמרק לפי רשת
אינסטגרם/טיקטוק/פייסבוק → ווטרמרק + קישור.
רדיט → **GIF נקי לחלוטין** (`watermark = false`). לינק בתגובה.

### 5.6 שכבת Storage — המקור אף פעם לא נחשף

| באקט | ציבורי | תוכן | כותב |
|---|---|---|---|
| `tree-media` | ❌ | כל המקורות | הבעלים בלבד |
| `public-media` | ✅ | נגזרות בלבד (timelapse, סטורי, פריימי טיזר) | Edge Functions בלבד |
| `avatars` | ✅ | תמונות פרופיל | הבעלים |

מוסכמת נתיב: `{owner_id}/{tree_id}/{file}` — התיקייה הראשונה היא ה-uuid של הבעלים,
וכל ה-RLS נשען על זה. **לא לשנות בלי לשנות את הפוליסות.**

עץ ציבורי **לא** חושף מקורות. בפרסום, טריגר מכניס `teaser_frames` ל-`render_jobs`,
ו-Edge Function מרנדר את הפריימים לתוך `public-media`. גם אם קישור השיתוף דלף —
המקורות נשארים פרטיים.

### 5.7 אכיפה ב-DB ולא ב-UI
- **פרסום פוסט** אפשרי רק על עץ `is_public` — פוליסת RLS, לא בדיקה בקליינט.
- **מגבלת 3 עצים** בחינם — טריגר `enforce_tree_limit`. באג בקליינט לא יחלק פרימיום.
- **`render_jobs`** — הקליינט מכניס רק `status='queued'`; סטטוס ופלט נכתבים ב-service_role.
- **`species_revisions`** — append-only. אין פוליסת update/delete בכלל.

---

## 6. מפת מיגרציות

| # | קובץ | תוכן | סטטוס |
|---|---|---|---|
| 001 | `001_core_schema.sql` | profiles, trees, tree_media, milestones, care_tasks, care_log | ✅ |
| 002 | `002_knowledge.sql` | species, species_revisions, species_photos, care_templates, fork/apply RPC | ✅ |
| 003 | `003_social_sharing.sql` | follows, tree_followers, posts, likes, comments, share_events, feed + teaser RPC | ✅ |
| 004 | `004_storage_buckets.sql` | באקטים, פוליסות, render_jobs, מגבלת עצים | ✅ |
| 005 | `005_billing.sql` | Stripe, subscriptions, החלפת `enforce_tree_limit` | ⬜ אחרי אימות |

**סדר הרצה קשיח.** 004 תלוי בעמודה `tree_count` שנוספה ב-003.
