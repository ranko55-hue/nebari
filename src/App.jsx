/**
 * App.jsx — shell: session, login, tree list (with photo counts), import flow.
 * Full replacement.
 */

import { useEffect, useState, useCallback } from 'react'
import { supabase, parseDbError } from './lib/supabase'
import { t, getLocale, setLocale } from './lib/i18n'
import ImportScreen from './pages/ImportScreen'

const APP_VERSION = 'v0.3'

const S = {
  page: {
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    fontFamily: 'system-ui, sans-serif', background: '#f4f6f2',
    color: '#1a2e1a', padding: 16,
  },
  card: {
    background: '#fff', borderRadius: 16, padding: 28,
    width: '100%', maxWidth: 420, boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  },
  h1: { margin: '0 0 4px', fontSize: 26 },
  sub: { margin: '0 0 20px', color: '#5a6b5a', fontSize: 14 },
  input: {
    width: '100%', padding: '12px 14px', fontSize: 16, borderRadius: 10,
    border: '1px solid #cdd6cd', marginBottom: 12, boxSizing: 'border-box',
  },
  btn: {
    width: '100%', padding: '13px', fontSize: 16, fontWeight: 600,
    borderRadius: 10, border: 'none', background: '#2d5a2d',
    color: '#fff', cursor: 'pointer',
  },
  btnGhost: {
    width: '100%', padding: '13px', fontSize: 15, borderRadius: 10,
    border: '1px solid #cdd6cd', background: '#fff', color: '#333',
    cursor: 'pointer',
  },
  note: { fontSize: 13, color: '#5a6b5a', marginTop: 12, textAlign: 'center' },
  err: { fontSize: 13, color: '#a33', marginTop: 12, textAlign: 'center' },
  treeRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 0', borderBottom: '1px solid #f0f3f0', gap: 10,
  },
  photoCount: { fontSize: 13, color: '#5a6b5a' },
  version: {
    position: 'fixed', bottom: 10, insetInlineStart: 12,
    fontSize: 12, color: '#8a9a8a',
  },
  localeBtn: {
    position: 'fixed', top: 12, insetInlineEnd: 12, padding: '6px 12px',
    borderRadius: 8, border: '1px solid #cdd6cd', background: '#fff',
    cursor: 'pointer', fontSize: 13,
  },
}

function LocaleToggle({ onFlip }) {
  return (
    <button style={S.localeBtn}
      onClick={() => { setLocale(getLocale() === 'en' ? 'he' : 'en'); onFlip() }}>
      {getLocale() === 'en' ? 'עברית' : 'English'}
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
    <div style={S.card}>
      <h1 style={S.h1}>Nebari</h1>
      <p style={S.sub}>Grow the story of your trees.</p>
      {sent ? <p>📬 Check your email — we sent you a sign-in link.</p> : (
        <form onSubmit={sendLink}>
          <input style={S.input} type="email" required placeholder="you@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <button style={S.btn} disabled={busy}>{busy ? '…' : 'Send sign-in link'}</button>
          {error && <p style={S.err}>{error}</p>}
          <p style={S.note}>No password. We email you a magic link.</p>
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
    <div style={S.card}>
      <h1 style={S.h1}>🌱 New tree</h1>
      <form onSubmit={create}>
        <input style={S.input} required autoFocus
          placeholder='e.g. "Old olive", "Juniper #2"'
          value={name} onChange={(e) => setName(e.target.value)} />
        <button style={S.btn} disabled={busy || !name.trim()}>
          {busy ? '…' : t('common.save')}
        </button>
      </form>
      {error && <p style={S.err}>{error}</p>}
      <button style={{ ...S.btnGhost, marginTop: 10 }} onClick={onCancel}>
        {t('common.cancel')}
      </button>
    </div>
  )
}

function Home({ session, onOpenImport, onNewTree }) {
  const [profile, setProfile] = useState(null)
  const [trees, setTrees] = useState([])

  const [loadError, setLoadError] = useState(null)

  const load = useCallback(async () => {
    setLoadError(null)

    const [profRes, treesRes, mediaRes] = await Promise.all([
      supabase.from('profiles')
        .select('username, display_name')
        .eq('id', session.user.id).single(),
      supabase.from('trees')
        .select('id, name, created_at')
        .eq('owner_id', session.user.id)
        .order('created_at', { ascending: true }),
      supabase.from('tree_media')
        .select('tree_id')
        .eq('owner_id', session.user.id),
    ])

    // Never swallow errors again — surface the first one on screen.
    const firstErr = profRes.error || treesRes.error || mediaRes.error
    if (firstErr) setLoadError(firstErr.message)

    const counts = {}
    for (const m of mediaRes.data || []) {
      counts[m.tree_id] = (counts[m.tree_id] || 0) + 1
    }

    setProfile(profRes.data)
    setTrees((treesRes.data || []).map((t) => ({ ...t, photoCount: counts[t.id] || 0 })))
  }, [session.user.id])

  useEffect(() => { load() }, [load])

  return (
    <div style={S.card}>
      <h1 style={S.h1}>
        {profile ? `Hi, ${profile.display_name || profile.username}` : '…'}
      </h1>
      <p style={S.sub}>
        {trees.length === 0 ? 'Your bench is empty — add your first tree.'
          : `${trees.length} trees on your bench`}
      </p>

      {loadError && <p style={S.err}>⚠️ {loadError}</p>}

      {trees.map((tree) => {
        const count = tree.photoCount
        return (
          <div key={tree.id} style={S.treeRow}>
            <div>
              <strong>{tree.name}</strong>
              <div style={S.photoCount}>
                {count === 0 ? 'No photos yet' : `📷 ${count} photos`}
              </div>
            </div>
            <button style={{ ...S.btn, width: 'auto', padding: '8px 14px', fontSize: 14 }}
              onClick={() => onOpenImport(tree)}>
              {count === 0 ? `📷 ${t('import.pickPhotos')}` : `+ ${t('import.pickMore')}`}
            </button>
          </div>
        )
      })}

      <button style={{ ...S.btn, marginTop: 16 }} onClick={onNewTree}>
        + New tree
      </button>

      <button style={{ ...S.btnGhost, marginTop: 10 }}
        onClick={() => supabase.auth.signOut()}>
        Sign out
      </button>
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

      {session === undefined ? <p>…</p>
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
