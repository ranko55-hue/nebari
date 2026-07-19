/**
 * TreeScreen.jsx — screen 1.4: one tree, its timeline by year.
 * The user's own tree = raw photos (docs/04-design.md §3), grouped under
 * big Mincho year headings. Milestones appear as quiet text lines in
 * their year. Header photo carries the horizon line.
 */

import { useEffect, useState, useCallback } from 'react'
import { supabase, signedMediaUrls } from '../lib/supabase'
import { t } from '../lib/i18n'
import { S, Horizon, BrushStroke } from '../components/ui'

const L = {
  header: {
    position: 'relative', aspectRatio: '4 / 3', borderRadius: 2,
    overflow: 'hidden', background: 'var(--pine-night)', marginTop: 18,
  },
  headerImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  titleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '14px 2px 0' },
  title: { fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 24, margin: 0 },
  meta: { fontSize: 11, color: 'var(--stone)' },
  year: {
    fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--ink)',
    margin: '44px 0 4px',
  },
  yearMeta: { fontSize: 11, color: 'var(--stone)', margin: '0 0 14px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 },
  cell: {
    aspectRatio: '1 / 1', overflow: 'hidden', borderRadius: 1,
    background: 'var(--vellum)',
  },
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

export default function TreeScreen({ session, tree, onImport, onBack }) {
  const [years, setYears] = useState(null)
  const [urls, setUrls] = useState({})
  const [loadError, setLoadError] = useState(null)

  const load = useCallback(async () => {
    setLoadError(null)

    const [mediaRes, msRes] = await Promise.all([
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

    const firstErr = mediaRes.error || msRes.error
    if (firstErr) { setLoadError(firstErr.message); setYears([]); return }

    const media = mediaRes.data || []
    setYears(groupByYear(media, msRes.data || []))
    setUrls(await signedMediaUrls(media.map((m) => m.storage_path)))
  }, [tree.id])

  useEffect(() => { load() }, [load])

  const allPhotos = (years || []).flatMap((y) => y.photos)
  const cover = allPhotos.length ? allPhotos[allPhotos.length - 1] : null
  const firstYear = years?.length ? years[0].year : null
  const lastYear = years?.length ? years[years.length - 1].year : null

  return (
    <div style={S.shell} className="screen-enter">
      <div style={L.topBar}>
        <button style={L.back} onClick={onBack}>← Bench</button>
        <button style={L.addLink} onClick={onImport}>add photos</button>
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
          {allPhotos.length === 0 ? 'no photos yet'
            : firstYear === lastYear ? `${allPhotos.length} photos · ${firstYear}`
            : `${allPhotos.length} photos · ${firstYear}–${lastYear}`}
        </span>
      </div>

      {loadError && <p style={S.err}>⚠️ {loadError}</p>}

      {years !== null && years.length === 0 && (
        <p style={{ ...S.sub, marginTop: 24 }}>
          The story starts with the first photos — tap "add photos" above.
        </p>
      )}

      {(years || []).map(({ year, photos, milestones }) => (
        <section key={year}>
          <h2 style={L.year}>{year}</h2>
          <p style={L.yearMeta}>
            {photos.length === 1 ? '1 photo' : `${photos.length} photos`}
          </p>

          {milestones.map((ms) => (
            <div key={ms.id} style={L.milestone}>
              <span style={L.msDate}>
                {new Date(ms.occurred_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
              <span>{t(`milestone.${ms.milestone_type}`)}{ms.note ? ` — ${ms.note}` : ''}</span>
            </div>
          ))}

          {photos.length > 0 && (
            <div style={{ ...L.grid, marginTop: milestones.length ? 12 : 0 }}>
              {photos.map((p) => (
                <div key={p.id} style={L.cell}>
                  {urls[p.storage_path] && (
                    <img src={urls[p.storage_path]} alt="" style={L.cellImg} loading="lazy" />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}
