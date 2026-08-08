/**
 * GrowersScreen.jsx — the community tab (screens 3.1–3.2).
 * Two word-tabs (same pattern as Care): DISCOVER (grid of public trees)
 * and FEED (get_feed posts). Tapping a Discover card opens that tree's
 * public teaser in-app by reusing PublicTreeContent.
 */

import { useState } from 'react'
import { t } from '../lib/i18n'
import { S, Wordmark } from '../components/ui'
import DiscoverGrid from '../components/DiscoverGrid'
import FeedList from '../components/FeedList'
import PublicTreeContent from '../components/PublicTreeContent'

const L = {
  tabs: { display: 'flex', gap: 22, margin: '18px 0 4px' },
  tab: {
    background: 'none', border: 'none', cursor: 'pointer', font: 'inherit',
    fontSize: 12, color: 'var(--stone)', padding: '0 0 3px',
    letterSpacing: '0.12em', textTransform: 'uppercase',
  },
  on: { color: 'var(--ink)', borderBottom: '1px solid var(--ink)' },
}

export default function GrowersScreen({ session }) {
  const [tab, setTab] = useState('discover')
  const [token, setToken] = useState(null) // open a public tree in-app

  if (token) {
    return <PublicTreeContent token={token} session={session} onBack={() => setToken(null)} />
  }

  return (
    <div style={S.shell} className="screen-enter">
      <Wordmark />
      <h1 style={S.h1}>{t('growers.title')}</h1>
      <p style={S.sub}>{t('growers.sub')}</p>

      <div style={L.tabs}>
        <button style={{ ...L.tab, ...(tab === 'discover' ? L.on : {}) }}
          onClick={() => setTab('discover')}>{t('growers.discover')}</button>
        <button style={{ ...L.tab, ...(tab === 'feed' ? L.on : {}) }}
          onClick={() => setTab('feed')}>{t('growers.feed')}</button>
      </div>

      {tab === 'discover'
        ? <DiscoverGrid onOpen={setToken} />
        : <FeedList session={session} />}
    </div>
  )
}
