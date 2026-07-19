/**
 * upload.js — push resolved photos into storage + tree_media rows.
 *
 * Two things that matter here:
 *  1. Bounded concurrency. A 60-photo import on hotel wifi with 60 parallel
 *     uploads will stall every one of them. 3 at a time finishes faster.
 *  2. Storage and DB must not drift. If the row insert fails after the file
 *     landed, we delete the orphan file. A file with no row is invisible
 *     forever and still costs money.
 */

import {
  supabase,
  BUCKET_TREE_MEDIA,
  buildMediaPath,
} from './supabase'

const CONCURRENCY = 3
const MAX_RETRIES = 2

/** Run tasks with a bounded worker pool, preserving input order in results. */
async function pooled(items, worker, limit = CONCURRENCY) {
  const results = new Array(items.length)
  let cursor = 0

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++
      results[i] = await worker(items[i], i)
    }
  })

  await Promise.all(runners)
  return results
}

async function uploadOne(item, ownerId, treeId) {
  const { file, takenAt } = item
  const path = buildMediaPath(ownerId, treeId, file.name)

  let lastError = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const { error: upErr } = await supabase.storage
      .from(BUCKET_TREE_MEDIA)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'image/jpeg',
      })

    if (upErr) {
      lastError = upErr
      // Network blips are worth retrying; a duplicate path is not.
      if (upErr.message?.includes('already exists')) break
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
      continue
    }

    // File is up. Now the row — and if this fails, clean up the file.
    const { data, error: dbErr } = await supabase
      .from('tree_media')
      .insert({
        tree_id: treeId,
        owner_id: ownerId,
        storage_path: path,
        media_type: file.type?.startsWith('video/') ? 'video' : 'image',
        taken_at: takenAt.toISOString(),
      })
      .select('id')
      .single()

    if (dbErr) {
      await supabase.storage.from(BUCKET_TREE_MEDIA).remove([path])
      return { ok: false, file: file.name, error: dbErr.message }
    }

    return { ok: true, file: file.name, mediaId: data.id, path }
  }

  return { ok: false, file: file.name, error: lastError?.message || 'upload failed' }
}

/**
 * Import a resolved batch into a tree.
 * Items without a takenAt are skipped — the UI must resolve them first.
 *
 * @param {Array} items    output of resolveBatch(), dates already fixed up
 * @param {string} ownerId
 * @param {string} treeId
 * @param {(done:number, total:number)=>void} onProgress
 */
export async function importBatch(items, ownerId, treeId, onProgress) {
  const ready = items.filter((i) => i.takenAt)
  if (ready.length === 0) {
    return { uploaded: [], failed: [], skipped: items.length }
  }

  let done = 0

  const results = await pooled(ready, async (item) => {
    const res = await uploadOne(item, ownerId, treeId)
    done += 1
    onProgress?.(done, ready.length)
    return res
  })

  const uploaded = results.filter((r) => r.ok)
  const failed = results.filter((r) => !r.ok)

  // Cover photo: the most recent shot. That's what the tree looks like now.
  if (uploaded.length > 0) {
    await setCoverToLatest(treeId)
  }

  return {
    uploaded,
    failed,
    skipped: items.length - ready.length,
  }
}

/** Point trees.cover_media_id at the newest photo on the timeline. */
async function setCoverToLatest(treeId) {
  const { data } = await supabase
    .from('tree_media')
    .select('id')
    .eq('tree_id', treeId)
    .eq('media_type', 'image')
    .order('taken_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (data?.id) {
    await supabase.from('trees').update({ cover_media_id: data.id }).eq('id', treeId)
  }
}

/**
 * After an import, offer milestones at the biggest visual gaps.
 * A 7-month hole in an otherwise monthly timeline usually means something
 * happened — a repot, a hard prune. Asking beats guessing.
 *
 * Returns up to `max` suggestions, largest gap first.
 */
export function suggestMilestoneGaps(items, max = 3) {
  const dated = items.filter((i) => i.takenAt).sort((a, b) => a.takenAt - b.takenAt)
  if (dated.length < 3) return []

  const gaps = []
  for (let i = 1; i < dated.length; i++) {
    const days = (dated[i].takenAt - dated[i - 1].takenAt) / 86400000
    if (days >= 90) {
      gaps.push({
        days: Math.round(days),
        before: dated[i - 1].takenAt,
        after: dated[i].takenAt,
        // midpoint is the natural default date for the milestone
        suggestedAt: new Date((dated[i - 1].takenAt.getTime() + dated[i].takenAt.getTime()) / 2),
      })
    }
  }

  return gaps.sort((a, b) => b.days - a.days).slice(0, max)
}

/** Group a resolved batch by year — the shape the timeline preview renders. */
export function groupByYear(items) {
  const groups = new Map()

  for (const item of items) {
    const key = item.takenAt ? item.takenAt.getFullYear() : 'undated'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(item)
  }

  const years = [...groups.entries()]
    .filter(([k]) => k !== 'undated')
    .sort((a, b) => a[0] - b[0])
    .map(([year, photos]) => ({ year, photos }))

  const undated = groups.get('undated') || []
  return { years, undated }
}
