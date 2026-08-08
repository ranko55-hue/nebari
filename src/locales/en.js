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

    // Care tab (1.6)
    tabTitle: 'Care',
    tabSub: 'Today’s tasks across all your trees.',
    groupOverdue: 'Overdue',
    groupToday: 'Today',
    daysOverdue: '{days}d overdue',
    done: 'done',
    emptyTitle: 'Nothing due today',
    emptyBody: 'When your trees have care schedules, today’s watering, feeding and pruning gather here.',

    // Per-tree care schedule (1.7)
    scheduleLink: 'care schedule',
    scheduleTitle: 'Care schedule',
    scheduleSub: 'What this tree needs, and when.',
    everyDays: 'every {days} days',
    seasonal: 'in {season}',
    nextShort: 'next {date}',
    noNext: 'no date',
    inactive: 'inactive',
    addTask: 'Add a task',
    addTitle: 'New task',
    taskLabel: 'Task',
    cadenceLabel: 'Cadence',
    cadenceInterval: 'Every N days',
    cadenceSeason: 'By season',
    intervalLabel: 'Days between',
    seasonLabel: 'Season',
    saveTask: 'Add task',
    remove: 'Remove',
    confirmRemove: 'Tap again — remove',
    emptySchedule: 'No tasks yet. Add the first below.',
    season: {
      spring: 'Spring',
      summer: 'Summer',
      autumn: 'Autumn',
      winter: 'Winter',
    },
  },

  onboarding: {
    title: 'Welcome',
    subtitle: 'A few quiet details, then your bench.',
    displayName: 'Display name',
    displayNamePlaceholder: 'How your name reads',
    username: 'Username',
    usernamePlaceholder: 'lowercase, letters and hyphens',
    region: 'Climate region',
    save: 'Begin',
    errName: 'Display name must be 2–40 characters.',
    errUsername: 'Username: 3–24 characters, a–z, 0–9 and hyphens.',
    region_mediterranean: 'Mediterranean',
    region_temperate: 'Temperate',
    region_tropical: 'Tropical',
    region_arid: 'Arid',
    region_continental: 'Continental',
  },

  settings: {
    title: 'Settings',
    subtitle: 'Quiet controls.',
    identity: 'Identity',
    save: 'Save changes',
    saved: 'Saved',
    language: 'Language',
    signOut: 'Sign out',
    back: 'Back',
    version: 'Version',
    email: 'Signed in as',
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

  share: {
    section: 'Share',
    publish: 'Publish this tree',
    publishing: 'Publishing…',
    publishHint: 'A public page anyone can open — three photos, no full history.',
    copyLink: 'Copy link',
    copied: 'Link copied',
    shareLink: 'Share',
    storyImage: 'Story image',
    rendering: 'Rendering…',
    makePrivate: 'Make private',
    confirmPrivate: 'Tap again — make private',
  },

  public: {
    notFound: 'This tree is private or does not exist.',
    openApp: 'Open Nebari',
    by: 'by {name}',
    follow: 'Follow',
    following: 'Following',
    statsPhotos: '{n} photographs',
    statsMilestones: '{n} milestones',
    statsYears: '{n} years tended',
    statsFollowers: '{n} following',
    toApp: 'Grow yours on Nebari',
  },

  growers: {
    title: 'Growers',
    sub: 'Trees and their stories, from growers everywhere.',
    discover: 'Discover',
    feed: 'Feed',
    more: 'more',
    emptyDiscoverTitle: 'No public trees yet',
    emptyDiscoverBody: 'When growers publish their trees, they gather here to discover.',
    emptyFeedTitle: 'Your feed is quiet',
    emptyFeedBody: 'Follow a tree or a grower, and their updates will appear here.',
  },

  post: {
    update: 'post update',
    publishFirst: 'Publish the tree first to post about it.',
    body: 'What happened?',
    attachLatest: 'Attach latest photo',
    posting: 'Posting…',
    posted: 'Posted',
    like: 'like',
    liked: 'liked',
    comments: 'comments ({n})',
    addComment: 'Add a comment',
    reply: 'reply',
    send: 'Send',
    timeNow: 'just now',
    timeMinutes: '{n}m',
    timeHours: '{n}h',
    timeDays: '{n}d',
  },

  timelapse: {
    open: 'timelapse',
    paused: 'paused',
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
