/**
 * DiscoverGrid.jsx — Growers → Discover (screen 3.1). A grid of public
 * trees, cover from the public bucket in a passe-partout frame. Tapping a
 * card opens that tree's public teaser in-app (reuses PublicTreeContent).
 */

import { useEffect, useState } from 'react'
import { supabase, publicMediaUrl, publicDerivativePath } from '../lib/supabase'
import { t } from '../lib/i18n'
import { PassePartout, EmptyState } from './ui'

const L = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 10 },
  card: { cursor: 'pointer' },
  name: { fontFamily: 'var(--font-display)', fontSize: 15, padding: '4px 2px 0' },
  user: { fontSize: 11, color: 'var(--stone)', padding: '0 2px' },
}

export default function DiscoverGrid({ onOpen }) {
  const [trees, setTrees] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data: rows, error: tErr } = await supabase
        .from('trees')
        .select('id, owner_id, name, public_token, created_at')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(24)
      if (!alive) return
      if (tErr) { setError(tErr.message); setTrees([]); return }

      const ownerIds = [...new Set((rows || []).map((r) => r.owner_id))]
      const names = {}
      if (ownerIds.length) {
        const { data: profs } = await supabase
          .from('profiles').select('id, username, display_name').in('id', ownerIds)
        for (const p of profs || []) names[p.id] = p
      }
      if (!alive) return
      setTrees((rows || []).map((r) => ({
        ...r,
        cover: publicMediaUrl(publicDerivativePath(r.owner_id, r.id, 'cover.jpg')),
        username: names[r.owner_id]?.username || null,
      })))
    })()
    return () => { alive = false }
  }, [])

  if (error) return <p style={{ fontSize: 12, color: '#9A4A3A' }}>⚠️ {error}</p>

  if (trees !== null && trees.length === 0) {
    return <EmptyState title={t('growers.emptyDiscoverTitle')} body={t('growers.emptyDiscoverBody')} />
  }

  return (
    <div style={L.grid}>
      {(trees || []).map((tr) => (
        <div key={tr.id} style={L.card} onClick={() => onOpen(tr.public_token)}>
          <PassePartout src={tr.cover} alt={tr.name} />
          <div style={L.name}>{tr.name}</div>
          {tr.username && <div style={L.user}>@{tr.username}</div>}
        </div>
      ))}
    </div>
  )
}
