/**
 * ImportScreen.jsx — retroactive photo import (the onboarding magic).
 *
 * Flow:  pick photos → resolve taken_at → review undated → upload → done.
 * All heavy lifting lives in lib/exif.js and lib/upload.js — this file
 * is orchestration + rendering only.
 */

import { useState } from 'react'
import { resolveBatch, summariseBatch, dateFromSeason, Confidence } from '../lib/exif'
import { importBatch, groupByYear, suggestMilestoneGaps } from '../lib/upload'
import { supabase } from '../lib/supabase'
import { t } from '../lib/i18n'

const S = {
  wrap: { width: '100%', maxWidth: 520 },
  card: {
    background: '#fff', borderRadius: 16, padding: 24,
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 16,
  },
  h2: { margin: '0 0 4px', fontSize: 22 },
  sub: { margin: '0 0 16px', color: '#5a6b5a', fontSize: 14 },
  btn: {
    padding: '12px 20px', fontSize: 15, fontWeight: 600, borderRadius: 10,
    border: 'none', background: '#2d5a2d', color: '#fff', cursor: 'pointer',
  },
  btnGhost: {
    padding: '12px 20px', fontSize: 15, borderRadius: 10, cursor: 'pointer',
    border: '1px solid #cdd6cd', background: '#fff', color: '#333',
  },
  yearRow: { margin: '14px 0' },
  yearLabel: { fontWeight: 700, fontSize: 15, marginBottom: 6 },
  thumbs: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  thumb: {
    width: 64, height: 64, objectFit: 'cover', borderRadius: 8,
    border: '1px solid #e2e8e2',
  },
  badge: {
    display: 'inline-block', fontSize: 11, padding: '2px 8px',
    borderRadius: 999, background: '#eef3ee', color: '#3a5a3a', marginInlineStart: 8,
  },
  badgeWarn: { background: '#fdf3e3', color: '#8a6216' },
  reviewRow: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
    borderBottom: '1px solid #f0f3f0',
  },
  select: {
    padding: '8px 10px', borderRadius: 8, border: '1px solid #cdd6cd', fontSize: 14,
  },
  progress: { height: 8, background: '#e8ede8', borderRadius: 999, overflow: 'hidden' },
  progressBar: { height: '100%', background: '#2d5a2d', transition: 'width .2s' },
}

function Thumb({ file }) {
  const [url] = useState(() => URL.createObjectURL(file))
  return <img src={url} alt="" style={S.thumb} />
}

/** Step 2 — fix photos that arrived without a usable date. */
function ReviewUndated({ items, onResolved }) {
  const thisYear = new Date().getFullYear()
  const [fixes, setFixes] = useState(() =>
    items.map(() => ({ season: 'summer', year: thisYear })),
  )

  function apply() {
    const resolved = items.map((item, i) => ({
      ...item,
      takenAt: dateFromSeason(fixes[i].season, fixes[i].year),
      needsReview: false,
    }))
    onResolved(resolved)
  }

  function setAll(patch) {
    setFixes((f) => f.map((x) => ({ ...x, ...patch })))
  }

  return (
    <div style={S.card}>
      <h2 style={S.h2}>{t('import.reviewTitle')}</h2>
      <p style={S.sub}>{t('import.reviewBody')}</p>

      {items.map((item, i) => (
        <div key={i} style={S.reviewRow}>
          <Thumb file={item.file} />
          <select
            style={S.select}
            value={fixes[i].season}
            onChange={(e) =>
              setFixes((f) => f.map((x, j) => (j === i ? { ...x, season: e.target.value } : x)))
            }
          >
            {['spring', 'summer', 'autumn', 'winter'].map((s) => (
              <option key={s} value={s}>{t(`import.season.${s}`)}</option>
            ))}
          </select>
          <select
            style={S.select}
            value={fixes[i].year}
            onChange={(e) =>
              setFixes((f) => f.map((x, j) => (j === i ? { ...x, year: +e.target.value } : x)))
            }
          >
            {Array.from({ length: 25 }, (_, k) => thisYear - k).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      ))}

      {items.length > 1 && (
        <p style={{ fontSize: 13, marginTop: 10 }}>
          <button
            style={{ ...S.btnGhost, padding: '6px 12px', fontSize: 13 }}
            onClick={() => setAll({ season: fixes[0].season, year: fixes[0].year })}
          >
            {t('import.applyToAll')}
          </button>
        </p>
      )}

      <button style={{ ...S.btn, width: '100%', marginTop: 12 }} onClick={apply}>
        {t('common.next')}
      </button>
    </div>
  )
}

/** Timeline preview grouped by year. */
function YearPreview({ items }) {
  const { years } = groupByYear(items)
  return (
    <div>
      {years.map(({ year, photos }) => (
        <div key={year} style={S.yearRow}>
          <div style={S.yearLabel}>{year}</div>
          <div style={S.thumbs}>
            {photos.slice(0, 8).map((p, i) => <Thumb key={i} file={p.file} />)}
            {photos.length > 8 && (
              <div style={{ ...S.thumb, display: 'flex', alignItems: 'center',
                justifyContent: 'center', background: '#eef3ee', fontSize: 13 }}>
                +{photos.length - 8}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ImportScreen({ session, tree, onDone, onBack }) {
  const [phase, setPhase] = useState('pick')   // pick → review → preview → uploading → done
  const [items, setItems] = useState([])
  const [busyReading, setBusyReading] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [result, setResult] = useState(null)
  const [gaps, setGaps] = useState([])

  async function onPick(e) {
    const files = e.target.files
    if (!files?.length) return
    setBusyReading(true)

    const resolved = await resolveBatch(files)
    const merged = [...items, ...resolved].sort((a, b) => {
      if (!a.takenAt) return 1
      if (!b.takenAt) return -1
      return a.takenAt - b.takenAt
    })

    setItems(merged)
    setBusyReading(false)
    setPhase(merged.some((i) => !i.takenAt) ? 'review' : 'preview')
  }

  function onReviewDone(fixed) {
    const merged = items
      .filter((i) => i.takenAt)
      .concat(fixed)
      .sort((a, b) => a.takenAt - b.takenAt)
    setItems(merged)
    setPhase('preview')
  }

  async function startUpload() {
    setPhase('uploading')
    setProgress({ done: 0, total: items.length })

    const res = await importBatch(items, session.user.id, tree.id, (done, total) =>
      setProgress({ done, total }),
    )

    setResult(res)
    setGaps(suggestMilestoneGaps(items))
    setPhase('done')
  }

  async function addMilestone(gap) {
    await supabase.from('tree_milestones').insert({
      tree_id: tree.id,
      owner_id: session.user.id,
      milestone_type: 'repotting',
      occurred_at: gap.suggestedAt.toISOString().slice(0, 10),
      note: 'Added from timeline gap',
    })
    setGaps((g) => g.filter((x) => x !== gap))
  }

  const summary = items.length ? summariseBatch(items) : null

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <h2 style={S.h2}>{t('import.title')}</h2>
        <p style={S.sub}>{tree.name} · {t('import.subtitle')}</p>

        {summary && (
          <p style={{ fontSize: 14, marginBottom: 12 }}>
            {t('import.summaryMany', { count: summary.total })}
            {summary.firstYear && (
              <span style={S.badge}>
                {t('import.summarySpan', { from: summary.firstYear, to: summary.lastYear })}
              </span>
            )}
            {summary.needReview > 0 ? (
              <span style={{ ...S.badge, ...S.badgeWarn }}>
                {t('import.summaryReview', { count: summary.needReview })}
              </span>
            ) : (
              items.length > 0 && <span style={S.badge}>{t('import.summaryAllGood')}</span>
            )}
          </p>
        )}

        {(phase === 'pick' || phase === 'preview') && (
          <label style={{ ...S.btnGhost, display: 'inline-block' }}>
            {busyReading ? t('import.reading')
              : items.length ? t('import.pickMore') : t('import.pickPhotos')}
            <input
              type="file" accept="image/*" multiple hidden
              onChange={onPick} disabled={busyReading}
            />
          </label>
        )}
      </div>

      {phase === 'review' && (
        <ReviewUndated items={items.filter((i) => !i.takenAt)} onResolved={onReviewDone} />
      )}

      {phase === 'preview' && items.length > 0 && (
        <div style={S.card}>
          <YearPreview items={items} />
          <button style={{ ...S.btn, width: '100%', marginTop: 16 }} onClick={startUpload}>
            {t('common.next')} → ☁️
          </button>
        </div>
      )}

      {phase === 'uploading' && (
        <div style={S.card}>
          <p style={{ marginTop: 0 }}>
            {t('import.uploading', { done: progress.done, total: progress.total })}
          </p>
          <div style={S.progress}>
            <div style={{ ...S.progressBar,
              width: `${(progress.done / Math.max(progress.total, 1)) * 100}%` }} />
          </div>
          <p style={{ ...S.sub, marginTop: 10 }}>{t('import.keepOpen')}</p>
        </div>
      )}

      {phase === 'done' && result && (
        <div style={S.card}>
          <h2 style={S.h2}>
            {result.failed.length === 0
              ? `✅ ${t('import.uploadDone', { count: result.uploaded.length })}`
              : t('import.uploadPartial', { ok: result.uploaded.length, failed: result.failed.length })}
          </h2>

          {gaps.map((gap, i) => (
            <div key={i} style={{ ...S.card, background: '#f7faf7', boxShadow: 'none',
              border: '1px solid #e2ede2', marginTop: 12 }}>
              <strong>{t('import.gapTitle')}</strong>
              <p style={{ fontSize: 14 }}>{t('import.gapBody', { days: gap.days })}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ ...S.btn, padding: '8px 14px', fontSize: 14 }}
                  onClick={() => addMilestone(gap)}>
                  {t('milestone.repotting')}
                </button>
                <button style={{ ...S.btnGhost, padding: '8px 14px', fontSize: 14 }}
                  onClick={() => setGaps((g) => g.filter((x) => x !== gap))}>
                  {t('import.gapSkip')}
                </button>
              </div>
            </div>
          ))}

          <button style={{ ...S.btn, width: '100%', marginTop: 16 }} onClick={onDone}>
            {t('common.done')}
          </button>
        </div>
      )}

      {phase !== 'uploading' && (
        <button style={{ ...S.btnGhost, width: '100%' }} onClick={onBack}>
          {t('common.back')}
        </button>
      )}
    </div>
  )
}
