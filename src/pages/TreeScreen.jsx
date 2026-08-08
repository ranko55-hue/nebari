/**
 * TreeScreen.jsx — screen 1.4: one tree, its timeline by year.
 * v0.7: tapping a photo opens PhotoViewer (set cover / delete photo);
 * cover respects trees.cover_media_id; tree deletion at the bottom
 * with a two-tap confirm (removes storage files too).
 */

import { useEffect, useState, useCallback } from 'react'
import { supabase, signedMediaUrls, BUCKET_TREE_MEDIA } from '../lib/supabase'
import { renderTreeDerivatives } from '../lib/derivatives'
import { t } from '../lib/i18n'
import { S, Horizon, BrushStroke } from '../components/ui'
import PhotoViewer from '../components/PhotoViewer'
import TreeShare from '../components/TreeShare'
import TimelapsePlayer from '../components/TimelapsePlayer'

const L = {
  header: {
    position: 'relative', aspectRatio: '4 / 3', borderRadius: 2,
    overflow: 'hidden', background: 'var(--pine-night)', marginTop: 18,
  },
  headerImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  titleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '14px 2px 0' },
  title: { fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 24, margin: 0 },
  meta: { fontSize: 11, color: 'var(--stone)' },
  year: { fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--ink)', margin: '44px 0 4px' },
  yearMeta: { fontSize: 11, color: 'var(--stone)', margin: '0 0 14px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 },
  cell: { aspectRatio: '1 / 1', overflow: 'hidden', borderRadius: 1, background: 'var(--vellum)', cursor: 'pointer' },
  cellImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  milestone: {
    display: 'flex', gap: 10, alignItems: 'baseline',
    padding: '10px 2px', borderBottom: '1px solid var(--line)', fontSize: 13,
  },
  msDate: { color: 'var(--stone)', fontSize: 11, minWidth: 64 },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '30px 0 0' },
  back: {
    background: 'none', border: 'none', cursor: 'pointer', font: 'inherit',
    fontSize: 12, color: 'var(--stone)', letterSpacing: '0.12em',
    textTransform: 'uppercase', padding: 0,
  },
  addLink: {
    fontSize: 12, color: 'var(--stone)', textDecoration: 'underline',
    textUnderlineOffset: 3, cursor: 'pointer', background: 'none',
    border: 'none', font: 'inherit', padding: 0,
  },
  deleteZone: { marginTop: 70, paddingTop: 18, borderTop: '1px solid var(--line)' },
  deleteLink: {
    background: 'none', border: 'none', cursor: 'pointer', font: 'inherit',
    fontSize: 12, color: '#9A4A3A', textDecoration: 'underline',
    textUnderlineOffset: 3, padding: 0,
  },
}

function groupByYear(media, milestones) {
  const years = new Map()
  const touch = (y) => {
    if (!years.has(y)) years.set(y, { photos: [], milestones: [] })
    return years.get(y)
  }
  for (const m of media) touch(new Date(m.taken_at).getFullYear()).photos.push(m)
  for (const ms of milestones) touch(new Date(ms.occurred_at).getFullYear()).milestones.push(ms)
  return [...years.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, data]) => ({ year, ...data }))
}

export default function TreeScreen({ session, tree, onImport, onCareSchedule, refreshDerivatives, onBack }) {
  const [media, setMedia] = useState(null)
  const [milestones, setMilestones] = useState([])
  const [coverId, setCoverId] = useState(null)
  const [isPublic, setIsPublic] = useState(false)
  const [publicToken, setPublicToken] = useState(null)
  const [urls, setUrls] = useState({})
  const [viewer, setViewer] = useState(null) // the photo object being viewed
  const [confirmTree, setConfirmTree] = useState(false)
  const [showTimelapse, setShowTimelapse] = useState(false)
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState(null)

  // Re-render the public derivatives silently (fire-and-forget) — the tree
  // is already published; keep its teaser frames fresh when its photos or
  // cover change. Errors here never block the owner's own view.
  const refresh = useCallback((nextMedia, nextCoverId) => {
    renderTreeDerivatives({
      ownerId: session.user.id, treeId: tree.id, media: nextMedia, coverId: nextCoverId,
    }).catch(() => {})
  }, [session.user.id, tree.id])

  const load = useCallback(async () => {
    setLoadError(null)
    const [treeRes, mediaRes, msRes] = await Promise.all([
      supabase.from('trees').select('cover_media_id, is_public, public_token').eq('id', tree.id).single(),
      supabase.from('tree_media')
        .select('id, storage_path, taken_at, media_type')
        .eq('tree_id', tree.id)
        .eq('media_type', 'image')
        .order('taken_at', { ascending: true }),
      supabase.from('tree_milestones')
        .select('id, milestone_type, occurred_at, note')
        .eq('tree_id', tree.id)
        .order('occurred_at', { ascending: true }),
    ])

    const firstErr = treeRes.error || mediaRes.error || msRes.error
    if (firstErr) { setLoadError(firstErr.message); setMedia([]); return }

    const nextMedia = mediaRes.data || []
    const nextCover = treeRes.data?.cover_media_id || null
    const pub = !!treeRes.data?.is_public
    setCoverId(nextCover)
    setIsPublic(pub)
    setPublicToken(treeRes.data?.public_token || null)
    setMedia(nextMedia)
    setMilestones(msRes.data || [])
    setUrls(await signedMediaUrls(nextMedia.map((m) => m.storage_path)))

    // Photos may have been added via import since the last publish.
    if (pub && refreshDerivatives && nextMedia.length) refresh(nextMedia, nextCover)
  }, [tree.id, refreshDerivatives, refresh])

  useEffect(() => { load() }, [load])

  async function setCover(photo) {
    const { error } = await supabase
      .from('trees').update({ cover_media_id: photo.id }).eq('id', tree.id)
    if (error) setLoadError(error.message)
    else {
      setCoverId(photo.id); setViewer(null)
      if (isPublic) refresh(media || [], photo.id)
    }
  }

  async function deletePhoto(photo) {
    // DB row first (RLS-guarded), then the storage object.
    const { error } = await supabase.from('tree_media').delete().eq('id', photo.id)
    if (error) { setLoadError(error.message); return }
    await supabase.storage.from(BUCKET_TREE_MEDIA).remove([photo.storage_path])
    const nextMedia = (media || []).filter((x) => x.id !== photo.id)
    const nextCover = coverId === photo.id ? null : coverId
    if (coverId === photo.id) setCoverId(null) // DB FK already set it null
    setMedia(nextMedia)
    setViewer(null)
    if (isPublic && nextMedia.length) refresh(nextMedia, nextCover)
  }

  async function deleteTree() {
    setBusy(true)
    const paths = (media || []).map((m) => m.storage_path)
    // Tree row first — cascades all DB children — then the files.
    const { error } = await supabase.from('trees').delete().eq('id', tree.id)
    if (error) { setLoadError(error.message); setBusy(false); return }
    for (let i = 0; i < paths.length; i += 100) {
      await supabase.storage.from(BUCKET_TREE_MEDIA).remove(paths.slice(i, i + 100))
    }
    onBack()
  }

  const years = media === null ? null : groupByYear(media, milestones)
  const cover =
    (media || []).find((m) => m.id === coverId) ||
    ((media || []).length ? media[media.length - 1] : null)
  const firstYear = years?.length ? years[0].year : null
  const lastYear = years?.length ? years[years.length - 1].year : null

  return (
    <div style={S.shell} className="screen-enter">
      <div style={L.topBar}>
        <button style={L.back} onClick={onBack}>← Bench</button>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {(media || []).length >= 3 && (
            <button style={L.addLink} onClick={() => setShowTimelapse(true)}>{t('timelapse.open')}</button>
          )}
          <button style={L.addLink} onClick={onCareSchedule}>{t('care.scheduleLink')}</button>
          <button style={L.addLink} onClick={onImport}>{t('tree.addPhotos')}</button>
        </div>
      </div>

      <div style={L.header}>
        {cover
          ? <img src={urls[cover.storage_path]} alt={tree.name} style={L.headerImg} />
          : <BrushStroke />}
      </div>
      <Horizon />

      <div style={L.titleRow}>
        <h1 style={L.title}>{tree.name}</h1>
        <span style={L.meta}>
          {!media?.length ? t('tree.noPhotos')
            : firstYear === lastYear ? `${media.length} · ${firstYear}`
            : `${media.length} · ${firstYear}–${lastYear}`}
        </span>
      </div>

      {loadError && <p style={S.err}>⚠️ {loadError}</p>}

      {years !== null && years.length === 0 && (
        <p style={{ ...S.sub, marginTop: 24 }}>{t('tree.emptyHint')}</p>
      )}

      {(years || []).map(({ year, photos, milestones: ms }) => (
        <section key={year}>
          <h2 style={L.year}>{year}</h2>
          <p style={L.yearMeta}>{photos.length === 1 ? '1' : photos.length}</p>

          {ms.map((m) => (
            <div key={m.id} style={L.milestone}>
              <span style={L.msDate}>
                {new Date(m.occurred_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
              <span>{t(`milestone.${m.milestone_type}`)}{m.note ? ` — ${m.note}` : ''}</span>
            </div>
          ))}

          {photos.length > 0 && (
            <div style={{ ...L.grid, marginTop: ms.length ? 12 : 0 }}>
              {photos.map((p) => (
                <div key={p.id} style={L.cell} onClick={() => setViewer(p)}>
                  {urls[p.storage_path] && (
                    <img src={urls[p.storage_path]} alt="" style={L.cellImg} loading="lazy" />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      ))}

      {media !== null && (
        <TreeShare
          session={session} tree={tree} media={media} coverId={coverId}
          isPublic={isPublic} publicToken={publicToken}
          onPublishedChange={(pub) => setIsPublic(pub)}
        />
      )}

      {media !== null && (
        <div style={L.deleteZone}>
          {confirmTree ? (
            <button style={L.deleteLink} disabled={busy} onClick={deleteTree}>
              {busy ? '…' : t('tree.confirmDeleteTree', { name: tree.name })}
            </button>
          ) : (
            <button style={L.deleteLink} onClick={() => setConfirmTree(true)}>
              {t('tree.deleteTree')}
            </button>
          )}
        </div>
      )}

      {viewer && (
        <PhotoViewer
          photo={viewer}
          url={urls[viewer.storage_path]}
          isCover={viewer.id === (coverId || cover?.id)}
          onSetCover={() => setCover(viewer)}
          onDelete={() => deletePhoto(viewer)}
          onClose={() => setViewer(null)}
        />
      )}

      {showTimelapse && (
        <TimelapsePlayer
          photos={(media || []).map((m) => ({ ...m, url: urls[m.storage_path] }))}
          onClose={() => setShowTimelapse(false)}
        />
      )}
    </div>
  )
}
