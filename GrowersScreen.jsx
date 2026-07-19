/**
 * he.js — Hebrew locale. Must stay key-for-key identical to en.js.
 */

export default {
  common: {
    cancel: 'ביטול',
    back: 'חזרה',
    next: 'הבא',
    done: 'סיום',
    skip: 'דלג',
    retry: 'נסה שוב',
    save: 'שמירה',
    delete: 'מחיקה',
  },

  import: {
    title: 'בוא נכניס את ההיסטוריה',
    subtitle: 'יש לך תמונות ישנות של העץ? בוא נבנה את הסיפור שלו.',
    pickPhotos: 'בחר תמונות',
    pickMore: 'הוסף עוד',
    reading: 'קורא תאריכים…',

    summaryOne: 'תמונה אחת',
    summaryMany: '{count} תמונות',
    summarySpan: '{from}–{to}',
    summaryYears: '{years} שנות היסטוריה',
    summaryReview: '{count} דורשות תאריך',
    summaryAllGood: 'כל התאריכים נמצאו אוטומטית',

    source: {
      exif: 'מהמצלמה',
      filename: 'משם הקובץ',
      file_mtime: 'משוער — כדאי לבדוק',
      none: 'לא נמצא תאריך',
    },

    reviewTitle: 'לכמה תמונות חסר תאריך',
    reviewBody:
      'וואטסאפ וצילומי מסך מוחקים את התאריך המקורי. סמן בערך מתי צולמו — עונה מספיקה.',
    setSeason: 'בערך מתי?',
    season: {
      spring: 'אביב',
      summer: 'קיץ',
      autumn: 'סתיו',
      winter: 'חורף',
    },
    yearLabel: 'שנה',
    applyToAll: 'החל על כל השאר',

    uploading: 'מעלה {done} מתוך {total}…',
    uploadDone: 'יובאו {count} תמונות',
    uploadPartial: 'יובאו {ok} תמונות · {failed} נכשלו',
    uploadFailed: 'הייבוא נכשל',
    keepOpen: 'השאר את המסך פתוח',

    gapTitle: 'מה קרה כאן?',
    gapBody:
      'יש פער של {days} ימים בציר הזמן. אם קרה משהו משמעותי — החלפת עציץ, גיזום גדול — סמן את זה.',
    gapSkip: 'שום דבר מיוחד',

    emptyState: 'עדיין לא נבחרו תמונות',
  },

  milestone: {
    acquired: 'רכישה',
    repotting: 'החלפת עציץ',
    first_styling: 'עיצוב ראשון',
    wiring: 'עיצוב חוטים',
    major_prune: 'גיזום גדול',
    defoliation: 'הסרת עלווה',
    other: 'אחר',
  },

  care: {
    water: 'השקיה',
    fertilize: 'דישון',
    prune: 'גיזום',
    wire: 'חיווט',
    repot: 'החלפת עציץ',
    pest_check: 'בדיקת מזיקים',
    other: 'אחר',
    dueToday: 'להיום',
    overdue: 'באיחור של {days} ימים',
    nextDue: 'הבא: {date}',
    markDone: 'בוצע',
  },

  errors: {
    TREE_LIMIT: 'בחשבון חינם אפשר לנהל 3 עצים. שדרג לעצים ללא הגבלה.',
    FORBIDDEN: 'אין לך גישה לזה.',
    DUPLICATE: 'זה כבר קיים.',
    RLS_DENIED: 'סמן את העץ כציבורי לפני שמפרסמים עליו.',
    UNKNOWN: 'משהו השתבש. נסה שוב.',
    noDate: 'נא לקבוע תאריך',
    tooLarge: 'הקובץ גדול מדי (מקסימום 25MB)',
    badType: 'סוג קובץ לא נתמך',
  },
}
