/**
 * PhotoViewer.jsx — fullscreen quiet viewer for one photo.
 * Actions live here: set as cover, delete (two-tap confirm).
 */

import { useState } from 'react'
import { t } from '../lib/i18n'
import { Horizon } from './ui'

const L = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 50, background: 'var(--paper)',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  },
  inner: { width: '100%', maxWidth: 420, padding: '0 var(--pad-side)', boxSizing: 'border-box', flex: 1, display: 'flex', flexDirection: 'column' },
  topBar: { display: 'flex', justifyContent: 'space-between', padding: '30px 0 16px' },
  word: {
    background: 'none', border: 'none', cursor: 'pointer', font: 'inherit',
    fontSize: 12, color: 'var(--stone)', letterSpacing: '0.12em',
    textTransform: 'uppercase', padding: 0,
  },
  photoBox: { borderRadius: 2, overflow: 'hidden', background: 'var(--pine-night)' },
  img: { width: '100%', maxHeight: '62vh', objectFit: 'contain', display: 'block' },
  meta: { fontSize: 11, color: 'var(--stone)', padding: '12px 2px 0' },
  actions: { display: 'flex', gap: 28, padding: '22px 2px 0', flexWrap: 'wrap' },
  action: {
    background: 'none', border: 'none', cursor: 'pointer', font: 'inherit',
    fontSize: 12, color: 'var(--ink)', textDecoration: 'underline',
    textUnderlineOffset: 3, padding: 0,
  },
  danger: { color: '#9A4A3A' },
  coverMark: { fontSize: 12, color: 'var(--stone)' },
}

export default function PhotoViewer({ photo, url, isCover, onSetCover, onDelete, onClose }) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  async function run(fn) {
    setBusy(true)
    try { await fn() } finally { setBusy(false) }
  }

  const takenAt = photo.taken_at
    ? new Date(photo.taken_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : ''

  return (
    <div style={L.overlay} className="screen-enter">
      <div style={L.inner}>
        <div style={L.topBar}>
          <button style={L.word} onClick={onClose} disabled={busy}>← {t('common.back')}</button>
        </div>

        <div style={L.photoBox}>
          <img src={url} alt="" style={L.img} />
        </div>
        <Horizon />
        <div style={L.meta}>{takenAt}</div>

        <div style={L.actions}>
          {isCover ? (
            <span style={L.coverMark}>{t('tree.isCover')}</span>
          ) : (
            <button style={L.action} disabled={busy}
              onClick={() => run(onSetCover)}>
              {t('tree.setCover')}
            </button>
          )}

          {confirming ? (
            <button style={{ ...L.action, ...L.danger }} disabled={busy}
              onClick={() => run(onDelete)}>
              {busy ? '…' : t('tree.confirmDeletePhoto')}
            </button>
          ) : (
            <button style={{ ...L.action, ...L.danger }} disabled={busy}
              onClick={() => setConfirming(true)}>
              {t('tree.deletePhoto')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
