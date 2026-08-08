/**
 * derivatives.js — client-side render of a tree's public assets.
 *
 * Until Edge Functions exist, the owner renders the teaser frames + cover
 * on a canvas from their own (private) originals and uploads them to the
 * public-media bucket. Migration 005 grants the owner insert/update there
 * under their own {owner_id}/ prefix. Originals stay private.
 */

import { supabase, signedMediaUrls, publicDerivativePath, BUCKET_PUBLIC_MEDIA } from './supabase'

const MAX_EDGE = 1200
const QUALITY = 0.85

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('could not load original'))
    img.src = url
  })
}

function toJpegBlob(img) {
  const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.max(1, Math.round(img.naturalWidth * scale))
  const h = Math.max(1, Math.round(img.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(img, 0, 0, w, h)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('render failed'))), 'image/jpeg', QUALITY),
  )
}

/** first / middle / latest image by taken_at (deduped by count). */
export function pickTeaserPhotos(media) {
  const imgs = (media || [])
    .filter((m) => !m.media_type || m.media_type === 'image')
    .slice()
    .sort((a, b) => new Date(a.taken_at) - new Date(b.taken_at))
  if (!imgs.length) return []
  const first = imgs[0]
  const last = imgs[imgs.length - 1]
  const mid = imgs[Math.floor((imgs.length - 1) / 2)]
  return [first, mid, last]
}

/**
 * Render cover.jpg + teaser-1/2/3.jpg and upload (upsert) to public-media.
 * Throws on the first failure so the caller can surface it and not
 * half-publish.
 */
export async function renderTreeDerivatives({ ownerId, treeId, media, coverId }) {
  const imgs = (media || [])
    .filter((m) => !m.media_type || m.media_type === 'image')
    .slice()
    .sort((a, b) => new Date(a.taken_at) - new Date(b.taken_at))
  if (!imgs.length) throw new Error('no photos to publish')

  const coverPhoto = imgs.find((m) => m.id === coverId) || imgs[imgs.length - 1]
  const [first, mid, last] = pickTeaserPhotos(imgs)
  const targets = [
    { name: 'cover.jpg', photo: coverPhoto },
    { name: 'teaser-1.jpg', photo: first },
    { name: 'teaser-2.jpg', photo: mid },
    { name: 'teaser-3.jpg', photo: last },
  ]

  const paths = [...new Set(targets.map((tg) => tg.photo.storage_path))]
  const urls = await signedMediaUrls(paths)

  for (const target of targets) {
    const url = urls[target.photo.storage_path]
    if (!url) throw new Error('could not read original')
    const blob = await toJpegBlob(await loadImage(url))
    const dest = publicDerivativePath(ownerId, treeId, target.name)
    const { error } = await supabase.storage
      .from(BUCKET_PUBLIC_MEDIA)
      .upload(dest, blob, { upsert: true, contentType: 'image/jpeg' })
    if (error) throw error
  }
}
