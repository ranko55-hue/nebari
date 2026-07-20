/**
 * App.jsx — v0.5: shell + routing only.
 * Screens live in src/pages/, shared primitives in src/components/ui.jsx.
 * Bottom nav: three words — Bench · Care · Growers. Settings via the ⋯ word.
 */

import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import AuthScreen from './pages/AuthScreen'
import BenchScreen from './pages/BenchScreen'
import CareScreen from './pages/CareScreen'
import GrowersScreen from './pages/GrowersScreen'
import SettingsScreen from './pages/SettingsScreen'
import NewTreeScreen from './pages/NewTreeScreen'
import ImportScreen from './pages/ImportScreen'
import TreeScreen from './pages/TreeScreen'

const APP_VERSION = 'v0.7'

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
  navWrap: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'var(--paper)',
    borderTop: '1px solid var(--line)',
  },
  nav: {
    display: 'flex',
    justifyContent: 'center',
    gap: 44,
    padding: '14px 0 18px',
    fontSize: 11,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--stone)',
  },
  navItem: { cursor: 'pointer', paddingBottom: 3, background: 'none', border: 'none', font: 'inherit', color: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit' },
  navActive: { color: 'var(--ink)', borderBottom: '1px solid var(--ink)' },
  version: { position: 'fixed', bottom: 10, insetInlineStart: 12, fontSize: 11, color: 'var(--line)' },
}

const TABS = [
  { key: 'bench', label: 'Bench' },
  { key: 'care', label: 'Care' },
  { key: 'growers', label: 'Growers' },
  { key: 'settings', label: '⋯' },
]

function Nav({ tab, onTab }) {
  return (
    <div style={S.navWrap}>
      <nav style={S.nav}>
        {TABS.map(({ key, label }) => (
          <button key={key}
            style={{ ...S.navItem, ...(tab === key ? S.navActive : {}) }}
            onClick={() => onTab(key)}>
            {label}
          </button>
        ))}
      </nav>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined)
  const [tab, setTab] = useState('bench')
  const [overlay, setOverlay] = useState(null) // null | {name:'newTree'} | {name:'import', tree}
  const [, force] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const closeOverlay = () => setOverlay(null)

  let content
  if (session === undefined) {
    content = <p style={{ marginTop: 60, color: 'var(--stone)' }}>…</p>
  } else if (!session) {
    content = <AuthScreen />
  } else if (overlay?.name === 'newTree') {
    content = (
      <NewTreeScreen session={session}
        onCreated={(tree) => setOverlay({ name: 'import', tree })}
        onCancel={closeOverlay} />
    )
  } else if (overlay?.name === 'tree') {
    content = (
      <TreeScreen session={session} tree={overlay.tree}
        onImport={() => setOverlay({ name: 'import', tree: overlay.tree })}
        onBack={closeOverlay} />
    )
  } else if (overlay?.name === 'import') {
    content = (
      <ImportScreen session={session} tree={overlay.tree}
        onDone={() => setOverlay({ name: 'tree', tree: overlay.tree })}
        onBack={() => setOverlay({ name: 'tree', tree: overlay.tree })} />
    )
  } else if (tab === 'care') {
    content = <CareScreen />
  } else if (tab === 'growers') {
    content = <GrowersScreen />
  } else if (tab === 'settings') {
    content = <SettingsScreen onBack={() => setTab('bench')} onFlip={() => force((n) => n + 1)} />
  } else {
    content = (
      <BenchScreen session={session}
        onOpenTree={(tree) => setOverlay({ name: 'tree', tree })}
        onNewTree={() => setOverlay({ name: 'newTree' })} />
    )
  }

  return (
    <div style={S.page}>
      <div style={S.version}>{APP_VERSION}</div>
      {content}
      {session && !overlay && <Nav tab={tab} onTab={setTab} />}
    </div>
  )
}
