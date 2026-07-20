/**
 * ImportScreen.jsx — retroactive photo import (the onboarding magic).
 *
 * Flow:  pick photos → resolve taken_at → review undated → upload → done.
 * All heavy lifting lives in lib/exif.js and lib/upload.js — this file
 * is orchestration + rendering only. v0.8: shibui restyle, ReviewUndated
 * extracted to components/ReviewUndated.jsx. No flow/logic changes.
 */

import { useState } from 'react'
import { resolveBatch, summariseBatch } from '../lib/exif'
import { importBatch, groupByYear, suggestMilestoneGaps } from '../lib/upload'
import { supabase } from '../lib/supabase'
import { t } from '../lib/i18n'
import { S, Wordmark, Horizon } from '../components/ui'
import ReviewUndated, { Thumb } from '../components/ReviewUndated'

const L = {
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '30px 0 0' },
  back: {
    background: 'none', border: 'none', cursor: 'pointer', font: 'inherit',
    fontSize: 12, color: 'var(--stone)', letterSpacing: '0.12em',
    textTransform: 'uppercase', padding: 0,
  },
  summary: { fontSize: 12, color: 'var(--stone)', margin: '0 0 20px' },
  year: { fontFamily: 'var(--font-display)', fontSize: 22, margin: '28px 0 8px' },
  thumbs: { display: 'flex', gap: 4, flexWrap: 'wrap' },
  more: {
    width: 52, height: 52, display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: 'var(--vellum)', borderRadius: 2,
    fontSize: 12, color: 'var(--stone)',
  },
  progress: { height: 2, background: 'var(--line)', overflow: 'hidden', marginTop: 6 },
  progressBar: { height: '100%', background: 'var(--ink)', transition: 'width .2s' },
  gap: { marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--line)' },
  gapActions: { display: 'flex', gap: 22, marginTop: 12 },
}

/** Timeline preview grouped by year. */
function YearPreview({ items }) {
  const { years } = groupByYear(items)
  return (
    <div>
      {years.map(({ year, photos }) => (
        <div key={year}>
          <div style={L.year}>{year}</div>
          <div style={L.thumbs}>
            {photos.slice(0, 8).map((p, i) => <Thumb key={i} file={p.file} />)}
            {photos.length > 8 && <div style={L.more}>+{photos.length - 8}</div>}
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
    <div style={S.shell} className="screen-enter">
      <div style={L.topBar}>
        <button style={L.back} onClick={onBack}>← {tree.name}</button>
      </div>

      <Wordmark />
      <h1 style={S.h1}>{t('import.title')}</h1>
      <p style={S.sub}>{tree.name} · {t('import.subtitle')}</p>
      <Horizon />

      {summary && (
        <p style={{ ...L.summary, marginTop: 20 }}>
          {t('import.summaryMany', { count: summary.total })}
          {summary.firstYear && ` · ${t('import.summarySpan', { from: summary.firstYear, to: summary.lastYear })}`}
          {summary.needReview > 0
            ? ` · ${t('import.summaryReview', { count: summary.needReview })}`
            : ` · ${t('import.summaryAllGood')}`}
        </p>
      )}

      {(phase === 'pick' || phase === 'preview') && (
        <label style={{ ...S.btnGhost, display: 'block', textAlign: 'center' }}>
          {busyReading ? t('import.reading')
            : items.length ? t('import.pickMore') : t('import.pickPhotos')}
          <input type="file" accept="image/*" multiple hidden
            onChange={onPick} disabled={busyReading} />
        </label>
      )}

      {phase === 'review' && (
        <ReviewUndated items={items.filter((i) => !i.takenAt)} onResolved={onReviewDone} />
      )}

      {phase === 'preview' && items.length > 0 && (
        <div>
          <YearPreview items={items} />
          <button style={S.btn} onClick={startUpload}>{t('common.next')}</button>
        </div>
      )}

      {phase === 'uploading' && (
        <div style={{ marginTop: 24 }}>
          <p style={{ margin: 0, fontSize: 13 }}>
            {t('import.uploading', { done: progress.done, total: progress.total })}
          </p>
          <div style={L.progress}>
            <div style={{ ...L.progressBar, width: `${(progress.done / Math.max(progress.total, 1)) * 100}%` }} />
          </div>
          <p style={{ ...S.sub, marginTop: 12 }}>{t('import.keepOpen')}</p>
        </div>
      )}

      {phase === 'done' && result && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ ...S.h1, fontSize: 19 }}>
            {result.failed.length === 0
              ? t('import.uploadDone', { count: result.uploaded.length })
              : t('import.uploadPartial', { ok: result.uploaded.length, failed: result.failed.length })}
          </h2>

          {gaps.map((gap, i) => (
            <div key={i} style={L.gap}>
              <strong style={{ fontFamily: 'var(--font-display)', fontWeight: 500 }}>{t('import.gapTitle')}</strong>
              <p style={{ fontSize: 13, color: 'var(--stone)' }}>{t('import.gapBody', { days: gap.days })}</p>
              <div style={L.gapActions}>
                <button style={S.link} onClick={() => addMilestone(gap)}>{t('milestone.repotting')}</button>
                <button style={S.link} onClick={() => setGaps((g) => g.filter((x) => x !== gap))}>
                  {t('import.gapSkip')}
                </button>
              </div>
            </div>
          ))}

          <button style={S.btn} onClick={onDone}>{t('common.done')}</button>
        </div>
      )}

      {phase !== 'uploading' && (
        <button style={S.btnGhost} onClick={onBack}>{t('common.back')}</button>
      )}
    </div>
  )
}
