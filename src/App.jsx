/**
 * App.jsx — v0.4, the shibui edition.
 * Design language: docs/04-design.md. All colors come from theme.css vars.
 * The bench shows each tree as a framed photo with the horizon line;
 * trees without photos get the single brush stroke on pine-night.
 */

import { useEffect, useState, useCallback } from 'react'
import { supabase, parseDbError, signedMediaUrls } from './lib/supabase'
import { t, getLocale, setLocale } from './lib/i18n'
import ImportScreen from './pages/ImportScreen'

const APP_VERSION = 'v0.4'

const S = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'var(--paper)',
    color: 'var(--ink)',
    fontFamily: 'var(--font-body)',
  },
  shell: { width: '100%', maxWidth: 420, padding: '0 var(--pad-side) 60px', boxSizing: 'border-box' },
  wordmark: {
    fontFamily: 'var(--font-display)',
    fontSize: 13,
    letterSpacing: '0.28em',
    color: 'var(--stone)',
    textTransform: 'uppercase',
    padding: '34px 0 6px',
  },
  h1: { fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 24, margin: '4px 0 2px' },
  sub: { color: 'var(--stone)', fontSize: 12, margin: '0 0 34px' },
  input: {
    width: '100%',
    padding: '12px 2px',
    fontSize: 16,
    border: 'none',
    borderBottom: '1px solid var(--line)',
    background: 'transparent',
    color: 'var(--ink)',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'var(--font-body)',
  },
  btn: {
    width: '100%',
    padding: '14px',
    marginTop: 26,
    fontSize: 13,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    border: '1px solid var(--ink)',
    background: 'var(--ink)',
    color: 'var(--paper)',
    cursor: 'pointer',
    borderRadius: 2,
    fontFamily: 'var(--font-body)',
  },
  btnGhost: {
    width: '100%',
    padding: '13px',
    marginTop: 12,
    fontSize: 13,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    border: '1px solid var(--line)',
    background: 'transparent',
    color: 'var(--stone)',
    cursor: 'pointer',
    borderRadius: 2,
    fontFamily: 'var(--font-body)',
  },
  note: { fontSize: 12, color: 'var(--stone)', marginTop: 14, textAlign: 'center' },
  err: { fontSize: 12, color: '#9A4A3A', marginTop: 14 },
  tree: { margin: '0 0 40px', cursor: 'pointer' },
  photo: {
    aspectRatio: '4 / 5',
    borderRadius: 2,
    overflow: 'hidden',
    background: 'var(--pine-night)',
    position: 'relative',
  },
  photoImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  horizon: { display: 'flex', height: 2 },
  caption: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '12px 2px 0' },
  name: { fontFamily: 'var(--font-display)', fontSize: 18 },
  meta: { fontSize: 11, color: 'var(--stone)' },
  careWord: { fontSize: 12, color: 'var(--stone)', padding: '2px 2px 0' },
  addLink: {
    fontSize: 12,
    color: 'var(--stone)',
    textDecoration: 'underline',
    textUnderlineOffset: 3,
    cursor: 'pointer',
    padding: '6px 2px 0',
    display: 'inline-block',
  },
  localeBtn: {
    position: 'fixed',
    top: 14,
    insetInlineEnd: 14,
    padding: '5px 10px',
    fontSize: 12,
    border: '1px solid var(--line)',
    borderRadius: 2,
    background: 'var(--paper)',
    color: 'var(--stone)',
    cursor: 'pointer',
  },
  version: { position: 'fixed', bottom: 10, insetInlineStart: 12, fontSize: 11, color: 'var(--line)' },
}

function Horizon() {
  return (
    <div style={S.horizon} aria-hidden="true">
      <div style={{ flex: 2, background: 'var(--horizon-1)' }} />
      <div style={{ flex: 2, background: 'var(--horizon-2)' }} />
      <div style={{ flex: 1, background: 'var(--horizon-3)' }} />
    </div>
  )
}

/** The one illustration allowed in the system: a single sumi-e stroke. */
function BrushStroke() {
  return (
    <svg viewBox="0 0 224 180" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
      <path
        d="M52 168 C60 130 74 108 96 94 C120 79 138 74 168 76 C148 68 122 70 100 82 C112 62 130 52 156 48 C130 44 106 54 92 72 C84 50 88 34 100 20 C84 30 74 48 74 70 C64 88 56 120 52 168 Z"
        fill="var(--vellum)"
        opacity="0.9"
      />
    </svg>
  )
}

function LocaleToggle({ onFlip }) {
  return (
    <button style={S.localeBtn}
      onClick={() => { setLocale(getLocale() === 'en' ? 'he' : 'en'); onFlip() }}>
      {getLocale() === 'en' ? 'עברית' : 'EN'}
    </button>
  )
}

function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function sendLink(e) {
    e.preventDefault()
    setBusy(true); setError(null)
    const { error: err } = await supabase.auth.signInWithOtp({
      email, options: { emailRedirectTo: window.location.origin },
    })
    setBusy(false)
    if (err) setError(err.message); else setSent(true)
  }

  return (
    <div style={S.shell} className="screen-enter">
      <div style={S.wordmark}>Nebari</div>
      <h1 style={S.h1}>Grow the story of your trees</h1>
      <p style={S.sub}>No password — we email you a sign-in link.</p>
      {sent ? (
        <p style={{ fontSize: 14 }}>Check your email.</p>
      ) : (
        <form onSubmit={sendLink}>
          <input style={S.input} type="email" required placeholder="you@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <button style={S.btn} disabled={busy}>{busy ? '…' : 'Send link'}</button>
          {error && <p style={S.err}>{error}</p>}
        </form>
      )}
    </div>
  )
}

function NewTree({ session, onCreated, onCancel }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function create(e) {
    e.preventDefault()
    setBusy(true); setError(null)
    const { data, error: err } = await supabase
      .from('trees')
      .insert({ owner_id: session.user.id, name: name.trim() })
      .select()
      .single()
    setBusy(false)
    if (err) setError(t(`errors.${parseDbError(err).code}`))
    else onCreated(data)
  }

  return (
    <div style={S.shell} className="screen-enter">
      <div style={S.wordmark}>Nebari</div>
      <h1 style={S.h1}>New tree</h1>
      <p style={S.sub}>Give it the name you use in the garden.</p>
      <form onSubmit={create}>
        <input style={S.input} required autoFocus
          placeholder="Old olive"
          value={name} onChange={(e) => setName(e.target.value)} />
        <button style={S.btn} disabled={busy || !name.trim()}>
          {busy ? '…' : t('common.save')}
        </button>
      </form>
      {error && <p style={S.err}>{error}</p>}
      <button style={S.btnGhost} onClick={onCancel}>{t('common.cancel')}</button>
    </div>
  )
}

function Home({ session, onOpenImport, onNewTree }) {
  const [trees, setTrees] = useState(null) // null = loading
  const [loadError, setLoadError] = useState(null)

  const load = useCallback(async () => {
    setLoadError(null)

    const [treesRes, mediaRes] = await Promise.all([
      supabase.from('trees')
        .select('id, name, created_at')
        .eq('owner_id', session.user.id)
        .order('created_at', { ascending: true }),
      supabase.from('tree_media')
        .select('tree_id, storage_path, taken_at')
        .eq('owner_id', session.user.id)
        .eq('media_type', 'image')
        .order('taken_at', { ascending: false }),
    ])

    const firstErr = treesRes.error || mediaRes.error
    if (firstErr) { setLoadError(firstErr.message); setTrees([]); return }

    // Latest photo per tree = the cover; count the rest.
    const covers = {}
    const counts = {}
    for (const m of mediaRes.data || []) {
      counts[m.tree_id] = (counts[m.tree_id] || 0) + 1
      if (!covers[m.tree_id]) covers[m.tree_id] = m.storage_path
    }

    const urls = await signedMediaUrls(Object.values(covers))

    setTrees((treesRes.data || []).map((tr) => ({
      ...tr,
      photoCount: counts[tr.id] || 0,
      coverUrl: covers[tr.id] ? urls[covers[tr.id]] || null : null,
    })))
  }, [session.user.id])

  useEffect(() => { load() }, [load])

  return (
    <div style={S.shell} className="screen-enter">
      <div style={S.wordmark}>Nebari</div>
      <h1 style={S.h1}>My bench</h1>
      <p style={S.sub}>
        {trees === null ? '…'
          : trees.length === 0 ? 'Empty — plant your first tree below.'
          : `${trees.length} trees`}
      </p>

      {loadError && <p style={S.err}>⚠️ {loadError}</p>}

      {(trees || []).map((tree) => (
        <div key={tree.id} style={S.tree} onClick={() => onOpenImport(tree)}>
          <div style={S.photo}>
            {tree.coverUrl
              ? <img src={tree.coverUrl} alt={tree.name} style={S.photoImg} />
              : <BrushStroke />}
          </div>
          <Horizon />
          <div style={S.caption}>
            <span style={S.name}>{tree.name}</span>
            <span style={S.meta}>
              {tree.photoCount === 0 ? 'no photos' : `${tree.photoCount} photos`}
            </span>
          </div>
          <span style={S.addLink}>
            {tree.photoCount === 0 ? 'add first photos' : 'add photos'}
          </span>
        </div>
      ))}

      {trees !== null && (
        <>
          <button style={S.btn} onClick={onNewTree}>+ New tree</button>
          <button style={S.btnGhost} onClick={() => supabase.auth.signOut()}>Sign out</button>
        </>
      )}
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined)
  const [view, setView] = useState({ name: 'home' })
  const [, force] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const goHome = () => setView({ name: 'home' })

  return (
    <div style={S.page}>
      <LocaleToggle onFlip={() => force((n) => n + 1)} />
      <div style={S.version}>{APP_VERSION}</div>

      {session === undefined ? <p style={{ marginTop: 60, color: 'var(--stone)' }}>…</p>
        : !session ? <Login />
        : view.name === 'newTree' ? (
          <NewTree session={session}
            onCreated={(tree) => setView({ name: 'import', tree })}
            onCancel={goHome} />
        )
        : view.name === 'import' ? (
          <ImportScreen session={session} tree={view.tree}
            onDone={goHome} onBack={goHome} />
        )
        : (
          <Home session={session}
            onOpenImport={(tree) => setView({ name: 'import', tree })}
            onNewTree={() => setView({ name: 'newTree' })} />
        )}
    </div>
  )
}
