/**
 * exif.js — resolve the real "taken_at" date of a photo.
 *
 * This is the engine behind retroactive import (decision #004).
 * A photo from 2019 must land on 2019 in the timeline, not on today.
 *
 * Fallback chain, best source first:
 *   1. EXIF DateTimeOriginal   — the truth. Camera wrote it.
 *   2. Filename pattern        — WhatsApp/Screenshots strip EXIF but keep
 *                                the date in the filename. This rescues them.
 *   3. file.lastModified       — unreliable (copying a file resets it), but
 *                                better than nothing.
 *   4. null                    — user must set it manually.
 *
 * Every result carries a `confidence` so the UI can flag what needs review.
 */

import exifr from 'exifr'

export const DateSource = {
  EXIF: 'exif',
  FILENAME: 'filename',
  FILE_MTIME: 'file_mtime',
  NONE: 'none',
}

export const Confidence = {
  HIGH: 'high',     // trust it, no review needed
  MEDIUM: 'medium', // probably right, show it but let user confirm
  LOW: 'low',       // needs review
  NONE: 'none',     // user must enter a date
}

// Reject anything obviously broken: before digital photography, or in the future.
const MIN_YEAR = 1990
const MAX_DATE_SKEW_MS = 24 * 60 * 60 * 1000 // allow 1 day of clock skew

function isPlausible(date) {
  if (!date || isNaN(date.getTime())) return false
  if (date.getFullYear() < MIN_YEAR) return false
  if (date.getTime() > Date.now() + MAX_DATE_SKEW_MS) return false
  return true
}

/**
 * Filename date patterns, ordered most-specific first.
 * These cover the overwhelming majority of real-world phone photos.
 */
const FILENAME_PATTERNS = [
  {
    // IMG_20190412_101530.jpg · PXL_20220103_084512345.jpg · VID_20210715_...
    re: /(?:IMG|PXL|VID|MVIMG|DSC)[-_](\d{4})(\d{2})(\d{2})[-_](\d{2})(\d{2})(\d{2})/i,
    build: (m) => new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]),
    confidence: Confidence.HIGH,
  },
  {
    // WhatsApp Image 2020-06-01 at 14.23.11.jpeg
    // WhatsApp strips EXIF entirely — this pattern is the only rescue.
    re: /(\d{4})-(\d{2})-(\d{2})\s+at\s+(\d{2})\.(\d{2})\.(\d{2})/i,
    build: (m) => new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]),
    confidence: Confidence.HIGH,
  },
  {
    // Screenshot_2021-05-03-09-14-22.png · 2021-05-03 09.14.22.jpg
    re: /(\d{4})[-_.](\d{2})[-_.](\d{2})[-_ T](\d{2})[-_.:](\d{2})[-_.:](\d{2})/,
    build: (m) => new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]),
    confidence: Confidence.MEDIUM,
  },
  {
    // IMG-20190412-WA0001.jpg  (WhatsApp Android — date only, no time)
    re: /(?:IMG|VID)[-_](\d{4})(\d{2})(\d{2})[-_]WA\d+/i,
    build: (m) => new Date(+m[1], +m[2] - 1, +m[3], 12, 0, 0),
    confidence: Confidence.MEDIUM,
  },
  {
    // 20190412_101530.jpg  (no prefix)
    re: /(?:^|[^\d])(\d{4})(\d{2})(\d{2})[-_](\d{2})(\d{2})(\d{2})(?:[^\d]|$)/,
    build: (m) => new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]),
    confidence: Confidence.MEDIUM,
  },
  {
    // Bare date: 2019-04-12.jpg · olive_2019-04-12.jpg — noon, no time known.
    re: /(?:^|[^\d])(\d{4})[-_.](\d{2})[-_.](\d{2})(?:[^\d]|$)/,
    build: (m) => new Date(+m[1], +m[2] - 1, +m[3], 12, 0, 0),
    confidence: Confidence.LOW,
  },
]

export function dateFromFilename(filename) {
  if (!filename) return null

  for (const pattern of FILENAME_PATTERNS) {
    const m = filename.match(pattern.re)
    if (!m) continue

    let date
    try {
      date = pattern.build(m)
    } catch {
      continue
    }

    if (isPlausible(date)) {
      return { date, confidence: pattern.confidence }
    }
  }
  return null
}

/**
 * Read DateTimeOriginal from EXIF.
 * exifr handles JPEG, HEIC and most RAW formats.
 */
async function dateFromExif(file) {
  try {
    const tags = await exifr.parse(file, {
      pick: ['DateTimeOriginal', 'CreateDate', 'ModifyDate'],
    })
    if (!tags) return null

    // DateTimeOriginal = when the shutter fired. The only one we fully trust.
    const candidate = tags.DateTimeOriginal || tags.CreateDate || tags.ModifyDate
    if (!candidate) return null

    const date = candidate instanceof Date ? candidate : new Date(candidate)
    if (!isPlausible(date)) return null

    return {
      date,
      confidence: tags.DateTimeOriginal ? Confidence.HIGH : Confidence.MEDIUM,
    }
  } catch {
    // Corrupt or stripped EXIF is normal, not an error. Fall through.
    return null
  }
}

/**
 * Resolve taken_at for a single File.
 * Always returns an object — never throws.
 *
 * @returns {{
 *   takenAt: Date|null,
 *   source: string,
 *   confidence: string,
 *   needsReview: boolean
 * }}
 */
export async function resolveTakenAt(file) {
  // 1. EXIF
  const exif = await dateFromExif(file)
  if (exif) {
    return {
      takenAt: exif.date,
      source: DateSource.EXIF,
      confidence: exif.confidence,
      needsReview: exif.confidence !== Confidence.HIGH,
    }
  }

  // 2. Filename — rescues WhatsApp and screenshots
  const fromName = dateFromFilename(file.name)
  if (fromName) {
    return {
      takenAt: fromName.date,
      source: DateSource.FILENAME,
      confidence: fromName.confidence,
      needsReview: fromName.confidence === Confidence.LOW,
    }
  }

  // 3. File mtime — weak. Copying a file rewrites it, so a 2019 photo
  //    moved between phones can look like today. Always flag for review.
  if (file.lastModified) {
    const date = new Date(file.lastModified)
    if (isPlausible(date)) {
      return {
        takenAt: date,
        source: DateSource.FILE_MTIME,
        confidence: Confidence.LOW,
        needsReview: true,
      }
    }
  }

  // 4. Nothing.
  return {
    takenAt: null,
    source: DateSource.NONE,
    confidence: Confidence.NONE,
    needsReview: true,
  }
}

/**
 * Resolve a whole batch, in parallel, sorted oldest-first —
 * which is exactly the order the timeline wants.
 */
export async function resolveBatch(files) {
  const results = await Promise.all(
    Array.from(files).map(async (file) => ({
      file,
      ...(await resolveTakenAt(file)),
    })),
  )

  return results.sort((a, b) => {
    if (!a.takenAt) return 1 // undated photos sink to the bottom for review
    if (!b.takenAt) return -1
    return a.takenAt - b.takenAt
  })
}

/**
 * Coarse date entry for photos with no date at all: "Summer 2020".
 * Maps a season to its mid-point so the photo sits sensibly on the timeline.
 * Northern hemisphere; flip for southern via the `south` flag.
 */
export function dateFromSeason(season, year, south = false) {
  const midMonths = { spring: 3, summer: 6, autumn: 9, winter: 0 }
  let month = midMonths[season]
  if (month === undefined) return null
  if (south) month = (month + 6) % 12
  return new Date(year, month, 15, 12, 0, 0)
}

/**
 * Summarise a batch for the import screen header:
 * "38 photos · 2018–2024 · 4 need a date"
 */
export function summariseBatch(resolved) {
  const dated = resolved.filter((r) => r.takenAt)
  const needReview = resolved.filter((r) => r.needsReview).length

  if (dated.length === 0) {
    return { total: resolved.length, needReview, firstYear: null, lastYear: null, years: 0 }
  }

  const firstYear = dated[0].takenAt.getFullYear()
  const lastYear = dated[dated.length - 1].takenAt.getFullYear()

  return {
    total: resolved.length,
    needReview,
    firstYear,
    lastYear,
    years: lastYear - firstYear,
  }
}
