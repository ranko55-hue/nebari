# מאיפה מתחילים

שני שלבים. זהו.

---

## שלב 1 — להעלות את התיקייה לגיטהאב

1. פרק את קובץ ה-ZIP במחשב. תקבל תיקייה בשם `nebari`.
2. היכנס ל-`github.com/new` → שם: `nebari` → **Private** → **Create repository**.
   (אל תסמן "Add a README")
3. במסך שנפתח לחץ על הקישור **uploading an existing file**.
4. גרור לתוך החלון את **כל התוכן** של תיקיית `nebari` — כלומר את `README.md`,
   `START-HERE.md`, ואת התיקיות `docs` ו-`supabase`.
   (לא את התיקייה `nebari` עצמה — את מה שבתוכה)
5. למטה לחץ **Commit changes**.

גיטהאב יבנה את כל התיקיות לבד. לא צריך ליצור שום דבר ידנית.

---

## שלב 2 — להריץ את הדאטהבייס בסופאבייס

היכנס לסופאבייס → פרויקט `nebari` → בתפריט השמאלי **SQL Editor** → **New query**.

עכשיו ארבע פעמים, **בסדר הזה בדיוק**:

| # | פותחים את הקובץ | מדביקים ולוחצים Run |
|---|---|---|
| 1 | `supabase/migrations/001_core_schema.sql` | ✅ Success |
| 2 | `supabase/migrations/002_knowledge.sql` | ✅ Success |
| 3 | `supabase/migrations/003_social_sharing.sql` | ✅ Success |
| 4 | `supabase/migrations/004_storage_buckets.sql` | ✅ Success |

**הסדר חשוב.** כל קובץ נשען על הקודם לו.

> אם כבר הרצת את 001 — דלג עליו והתחל מ-002.

---

## איך יודעים שהצליח

בתפריט השמאלי לחץ **Storage**. אתה אמור לראות בדיוק שלוש שורות:

- `tree-media` — **Private**
- `public-media` — Public
- `avatars` — Public

אם `tree-media` מסומן Public — משהו לא תקין, עצור.

---

## מה יש בתיקייה

| קובץ | מה זה |
|---|---|
| `docs/01-product.md` | אפיון המוצר — מה בונים ומה לא |
| `docs/02-architecture.md` | סטאק, מבנה, החלטות טכניות |
| `docs/03-decisions.md` | יומן החלטות ממוספר |
| `supabase/migrations/` | ארבעת קבצי ה-SQL, לפי סדר |

---

## שתי נקודות לזכור

**מגבלת 3 עצים** פעילה מ-004 והלאה. אם בבדיקות תיתקע על `free_tier_tree_limit` —
זה מכוון. לביטול זמני בזמן פיתוח:
```sql
alter table public.trees disable trigger trg_enforce_tree_limit;
```

**לעולם לא עורכים מיגרציה שכבר רצה.** צריך שינוי? מוסיפים `005_...sql` חדש.
