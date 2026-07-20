/**
 * ReviewUndated.jsx — import step 2: give a date to photos that arrived
 * without one (WhatsApp / screenshots strip EXIF). Shibui restyle only —
 * the resolve logic (dateFromSeason) is unchanged from ImportScreen.
 */

import { useState } from 'react'
import { dateFromSeason } from '../lib/exif'
import { t } from '../lib/i18n'
import { S } from './ui'

const SEASONS = ['spring', 'summer', 'autumn', 'winter']

const L = {
  thumb: {
    width: 52, height: 52, objectFit: 'cover', borderRadius: 2,
    background: 'var(--vellum)', flexShrink: 0,
  },
  row: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
    borderBottom: '1px solid var(--line)',
  },
  selects: { display: 'flex', gap: 12, flex: 1 },
}

export function Thumb({ file }) {
  const [url] = useState(() => URL.createObjectURL(file))
  return <img src={url} alt="" style={L.thumb} />
}

export default function ReviewUndated({ items, onResolved }) {
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
    <section style={{ marginTop: 34 }}>
      <h2 style={{ ...S.h1, fontSize: 19 }}>{t('import.reviewTitle')}</h2>
      <p style={S.sub}>{t('import.reviewBody')}</p>

      {items.map((item, i) => (
        <div key={i} style={L.row}>
          <Thumb file={item.file} />
          <div style={L.selects}>
            <select style={S.select} value={fixes[i].season}
              onChange={(e) =>
                setFixes((f) => f.map((x, j) => (j === i ? { ...x, season: e.target.value } : x)))}>
              {SEASONS.map((s) => <option key={s} value={s}>{t(`import.season.${s}`)}</option>)}
            </select>
            <select style={S.select} value={fixes[i].year}
              onChange={(e) =>
                setFixes((f) => f.map((x, j) => (j === i ? { ...x, year: +e.target.value } : x)))}>
              {Array.from({ length: 25 }, (_, k) => thisYear - k).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      ))}

      {items.length > 1 && (
        <button style={{ ...S.link, marginTop: 14 }}
          onClick={() => setAll({ season: fixes[0].season, year: fixes[0].year })}>
          {t('import.applyToAll')}
        </button>
      )}

      <button style={S.btn} onClick={apply}>{t('common.next')}</button>
    </section>
  )
}
