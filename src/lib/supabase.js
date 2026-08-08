/**
 * supabase.js — client + thin helpers.
 *
 * Rules:
 *  - Only ever use the ANON key here. The service_role key lives in Edge
 *    Functions and must never reach the browser.
 *  - Storage path convention is load-bearing: {owner_id}/{tree_id}/{file}
 *    The RLS policies in 004 read the first folder as the owner uuid.
 *    Changing this breaks security, not just uploads.
 */

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

export const BUCKET_TREE_MEDIA = 'tree-media'   // private — originals
export const BUCKET_PUBLIC_MEDIA = 'public-media' // public — rendered only
export const BUCKET_AVATARS = 'avatars'

/** Build a storage path that satisfies the RLS policies. */
export function buildMediaPath(ownerId, treeId, filename) {
  const ext = (filename.split('.').pop() || 'jpg').toLowerCase()
  const id = crypto.randomUUID()
  return `${ownerId}/${treeId}/${id}.${ext}`
}

/**
 * Derived public assets (cover / teaser frames / story) live in the
 * public-media bucket under the same {owner}/{tree}/ prefix, with stable
 * names so re-publishing overwrites in place. Never for originals.
 */
export function publicDerivativePath(ownerId, treeId, name) {
  return `${ownerId}/${treeId}/${name}`
}

/** Current user id, or null. */
export async function getUserId() {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id ?? null
}

/**
 * Private originals need a signed URL — the bucket is not public.
 * Default 1 hour; plenty for a browsing session.
 */
export async function signedMediaUrl(storagePath, expiresIn = 3600) {
  const { data, error } = await supabase
    .storage
    .from(BUCKET_TREE_MEDIA)
    .createSignedUrl(storagePath, expiresIn)

  if (error) return null
  return data.signedUrl
}

/** Batch version — one round trip instead of N. */
export async function signedMediaUrls(storagePaths, expiresIn = 3600) {
  if (!storagePaths?.length) return {}

  const { data, error } = await supabase
    .storage
    .from(BUCKET_TREE_MEDIA)
    .createSignedUrls(storagePaths, expiresIn)

  if (error) return {}

  return Object.fromEntries(
    data.filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]),
  )
}

/** Public bucket needs no signing — rendered artefacts only. */
export function publicMediaUrl(storagePath) {
  const { data } = supabase.storage.from(BUCKET_PUBLIC_MEDIA).getPublicUrl(storagePath)
  return data.publicUrl
}

/**
 * Translate DB errors into something the UI can branch on.
 * The tree-limit trigger in 004 raises 'free_tier_tree_limit'.
 */
export function parseDbError(error) {
  if (!error) return null

  const msg = error.message || ''

  if (msg.includes('free_tier_tree_limit')) {
    return { code: 'TREE_LIMIT', upgrade: true }
  }
  if (msg.includes('not allowed')) {
    return { code: 'FORBIDDEN' }
  }
  if (error.code === '23505') {
    return { code: 'DUPLICATE' }
  }
  if (msg.includes('row-level security')) {
    // Usually means: trying to post about a tree that isn't public yet.
    return { code: 'RLS_DENIED' }
  }
  return { code: 'UNKNOWN', raw: msg }
}
