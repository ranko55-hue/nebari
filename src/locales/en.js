/**
 * en.js — default locale. Nebari is global-first (decision #009).
 * No hardcoded strings in JSX. Ever.
 */

export default {
  common: {
    cancel: 'Cancel',
    back: 'Back',
    next: 'Next',
    done: 'Done',
    skip: 'Skip',
    retry: 'Retry',
    save: 'Save',
    delete: 'Delete',
  },

  import: {
    title: 'Bring your history in',
    subtitle: 'Got old photos of your tree? Let’s build its story.',
    pickPhotos: 'Choose photos',
    pickMore: 'Add more',
    reading: 'Reading photo dates…',

    // summary header
    summaryOne: '{count} photo',
    summaryMany: '{count} photos',
    summarySpan: '{from}–{to}',
    summaryYears: '{years} years of history',
    summaryReview: '{count} need a date',
    summaryAllGood: 'All dates found automatically',

    // date sources — shown as small badges
    source: {
      exif: 'From camera',
      filename: 'From filename',
      file_mtime: 'Estimated — please check',
      none: 'No date found',
    },

    // review step
    reviewTitle: 'A few need a date',
    reviewBody:
      'WhatsApp and screenshots strip the original date. Set roughly when these were taken — a season is enough.',
    setSeason: 'Roughly when?',
    season: {
      spring: 'Spring',
      summer: 'Summer',
      autumn: 'Autumn',
      winter: 'Winter',
    },
    yearLabel: 'Year',
    applyToAll: 'Apply to all remaining',

    // upload
    uploading: 'Uploading {done} of {total}…',
    uploadDone: 'Imported {count} photos',
    uploadPartial: 'Imported {ok} photos · {failed} failed',
    uploadFailed: 'Import failed',
    keepOpen: 'Keep this screen open',

    // milestone suggestions
    gapTitle: 'What happened here?',
    gapBody:
      'There’s a {days}-day gap in the timeline. If something big happened — a repot, a hard prune — mark it.',
    gapSkip: 'Nothing special',

    emptyState: 'No photos selected yet',
  },

  milestone: {
    acquired: 'Acquired',
    repotting: 'Repotting',
    first_styling: 'First styling',
    wiring: 'Wiring',
    major_prune: 'Major prune',
    defoliation: 'Defoliation',
    other: 'Other',
  },

  care: {
    water: 'Water',
    fertilize: 'Fertilize',
    prune: 'Prune',
    wire: 'Wire',
    repot: 'Repot',
    pest_check: 'Pest check',
    other: 'Other',
    dueToday: 'Due today',
    overdue: 'Overdue by {days} days',
    nextDue: 'Next: {date}',
    markDone: 'Done',
  },

  tree: {
    addPhotos: 'add photos',
    noPhotos: 'no photos yet',
    emptyHint: 'The story starts with the first photos — tap "add photos" above.',
    setCover: 'Set as cover',
    isCover: 'This is the cover',
    deletePhoto: 'Delete photo',
    confirmDeletePhoto: 'Tap again — delete forever',
    deleteTree: 'Delete this tree',
    confirmDeleteTree: 'Tap again — "{name}" and all its photos will be gone forever',
  },

  errors: {
    TREE_LIMIT: 'Free accounts can track 3 trees. Upgrade for unlimited.',
    FORBIDDEN: 'You don’t have access to that.',
    DUPLICATE: 'That already exists.',
    RLS_DENIED: 'Make this tree public before posting about it.',
    UNKNOWN: 'Something went wrong. Try again.',
    noDate: 'Please set a date',
    tooLarge: 'File is too large (max 25 MB)',
    badType: 'Unsupported file type',
  },
}
