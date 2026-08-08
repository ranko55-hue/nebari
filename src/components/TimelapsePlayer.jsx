/**
 * TimelapsePlayer.jsx — screen 2.3, client-side. Not a real timelapse yet
 * (Edge Functions render the video later); this is a crossfade slideshow
 * through the tree's photos in taken_at order that reads like one.
 * Tap toggles play/pause. No dependencies, no encoding.
 */

import { useEffect, useRef, useState } from 'react'
import { t } from '../lib/i18n'

const FRAME_MS = 1200
const FADE_MS = 400

const L = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 60, background: 'var(--pine-night)',
    display: 'flex', flexDirection: 'column',
  },
  topBar: { display: 'flex', justifyContent: 'space-between', padding: '30px 22px 0', zIndex: 2 },
  word: {
    background: 'none', border: 'none', cursor: 'pointer', font: 'inherit',
    fontSize: 12, color: 'var(--paper)', letterSpacing: '0.12em',
    textTransform: 'uppercase', padding: 0, opacity: 0.85,
  },
  stage: { position: 'relative', flex: 1, overflow: 'hidden', cursor: 'pointer' },
  frame: {
    position: 'absolute', inset: 0, width: '100%', height: '100%',
    objectFit: 'contain', transition: `opacity ${FADE_MS}ms ease`,
  },
  caption: {
    position: 'absolute', insetInlineStart: 0, insetInlineEnd: 0, bottom: 40,
    textAlign: 'center', color: 'var(--paper)', fontFamily: 'var(--font-display)',
    fontSize: 15, letterSpacing: '0.04em', textShadow: '0 1px 8px rgba(0,0,0,0.5)',
  },
  pausedTag: { fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.7 },
}

export default function TimelapsePlayer({ photos, onClose }) {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const timer = useRef(null)

  useEffect(() => {
    if (!playing || photos.length < 2) return
    timer.current = setInterval(() => {
      setIndex((i) => (i + 1) % photos.length)
    }, FRAME_MS)
    return () => clearInterval(timer.current)
  }, [playing, photos.length])

  const current = photos[index]
  const caption = current?.taken_at
    ? new Date(current.taken_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : ''

  return (
    <div style={L.overlay} className="screen-enter">
      <div style={L.topBar}>
        <button style={L.word} onClick={onClose}>← {t('common.back')}</button>
        <button style={L.word} onClick={onClose}>×</button>
      </div>

      <div style={L.stage} onClick={() => setPlaying((p) => !p)}>
        {photos.map((p, i) => (
          p.url ? (
            <img key={p.id || i} src={p.url} alt=""
              style={{ ...L.frame, opacity: i === index ? 1 : 0 }} />
          ) : null
        ))}
        <div style={L.caption}>
          {caption}
          {!playing && <div style={L.pausedTag}>{t('timelapse.paused')}</div>}
        </div>
      </div>
    </div>
  )
}
