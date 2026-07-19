/**
 * ui.jsx — shared shibui primitives. Every screen builds from these.
 * Styles follow docs/04-design.md; colors come from theme.css vars only.
 */

export const S = {
  shell: { width: '100%', maxWidth: 420, padding: '0 var(--pad-side) 90px', boxSizing: 'border-box' },
  wordmark: {
    fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.28em',
    color: 'var(--stone)', textTransform: 'uppercase', padding: '34px 0 6px',
  },
  h1: { fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 24, margin: '4px 0 2px' },
  sub: { color: 'var(--stone)', fontSize: 12, margin: '0 0 34px' },
  input: {
    width: '100%', padding: '12px 2px', fontSize: 16, border: 'none',
    borderBottom: '1px solid var(--line)', background: 'transparent',
    color: 'var(--ink)', outline: 'none', boxSizing: 'border-box',
    fontFamily: 'var(--font-body)',
  },
  btn: {
    width: '100%', padding: '14px', marginTop: 26, fontSize: 13,
    letterSpacing: '0.12em', textTransform: 'uppercase',
    border: '1px solid var(--ink)', background: 'var(--ink)', color: 'var(--paper)',
    cursor: 'pointer', borderRadius: 2, fontFamily: 'var(--font-body)',
  },
  btnGhost: {
    width: '100%', padding: '13px', marginTop: 12, fontSize: 13,
    letterSpacing: '0.12em', textTransform: 'uppercase',
    border: '1px solid var(--line)', background: 'transparent', color: 'var(--stone)',
    cursor: 'pointer', borderRadius: 2, fontFamily: 'var(--font-body)',
  },
  note: { fontSize: 12, color: 'var(--stone)', marginTop: 14, textAlign: 'center' },
  err: { fontSize: 12, color: '#9A4A3A', marginTop: 14 },
}

export function Wordmark() {
  return <div style={S.wordmark}>Nebari</div>
}

export function Horizon() {
  return (
    <div style={{ display: 'flex', height: 2 }} aria-hidden="true">
      <div style={{ flex: 2, background: 'var(--horizon-1)' }} />
      <div style={{ flex: 2, background: 'var(--horizon-2)' }} />
      <div style={{ flex: 1, background: 'var(--horizon-3)' }} />
    </div>
  )
}

/** The one illustration allowed in the system: a single sumi-e stroke. */
export function BrushStroke() {
  return (
    <svg viewBox="0 0 224 180" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
      <path
        d="M52 168 C60 130 74 108 96 94 C120 79 138 74 168 76 C148 68 122 70 100 82 C112 62 130 52 156 48 C130 44 106 54 92 72 C84 50 88 34 100 20 C84 30 74 48 74 70 C64 88 56 120 52 168 Z"
        fill="var(--vellum)" opacity="0.9"
      />
    </svg>
  )
}

/** A quiet centered empty state on pine-night with the brush stroke. */
export function EmptyState({ title, body }) {
  return (
    <div>
      <div style={{ position: 'relative', aspectRatio: '4 / 3', background: 'var(--pine-night)', borderRadius: 2, overflow: 'hidden' }}>
        <BrushStroke />
      </div>
      <Horizon />
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 17, margin: '16px 0 4px' }}>{title}</p>
      <p style={{ fontSize: 12, color: 'var(--stone)', margin: 0, lineHeight: 1.7 }}>{body}</p>
    </div>
  )
}
