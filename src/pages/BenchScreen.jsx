/** BenchScreen.jsx — the home tab: your trees as framed photos. */

import { useEffect, useState, useCallback } from 'react'
import { supabase, signedMediaUrls } from '../lib/supabase'
import { S, Wordmark, Horizon, BrushStroke } from '../components/ui'

const L = {
  tree: { margin: '0 0 40px', cursor: 'pointer' },
  photo: {
    aspectRatio: '4 / 5', borderRadius: 2, overflow: 'hidden',
    background: 'var(--pine-night)', position: 'relative',
  },
  img: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  caption: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '12px 2px 0' },
  name: { fontFamily: 'var(--font-display)', fontSize: 18 },
  meta: { fontSize: 11, color: 'var(--stone)' },
}

export default function BenchScreen({ session, onOpenTree, onNewTree }) {
  const [trees, setTrees] = useState(null)
  const [loadError, setLoadError] = useState(null)

  const load = useCallback(async () => {
    setLoadError(null)
    const [treesRes, mediaRes] = await Promise.all([
      supabase.from('trees')
        .select('id, name, created_at, cover_media_id')
        .eq('owner_id', session.user.id)
        .order('created_at', { ascending: true }),
      supabase.from('tree_media')
        .select('id, tree_id, storage_path, taken_at')
        .eq('owner_id', session.user.id)
        .eq('media_type', 'image')
        .order('taken_at', { ascending: false }),
    ])

    const firstErr = treesRes.error || mediaRes.error
    if (firstErr) { setLoadError(firstErr.message); setTrees([]); return }

    const latest = {}
    const counts = {}
    const byId = {}
    for (const m of mediaRes.data || []) {
      counts[m.tree_id] = (counts[m.tree_id] || 0) + 1
      byId[m.id] = m.storage_path
      if (!latest[m.tree_id]) latest[m.tree_id] = m.storage_path
    }

    // Chosen cover wins; newest photo is the fallback.
    const coverPath = (tr) => byId[tr.cover_media_id] || latest[tr.id] || null

    const paths = (treesRes.data || []).map(coverPath).filter(Boolean)
    const urls = await signedMediaUrls(paths)

    setTrees((treesRes.data || []).map((tr) => ({
      ...tr,
      photoCount: counts[tr.id] || 0,
      coverUrl: coverPath(tr) ? urls[coverPath(tr)] || null : null,
    })))
  }, [session.user.id])

  useEffect(() => { load() }, [load])

  return (
    <div style={S.shell} className="screen-enter">
      <Wordmark />
      <h1 style={S.h1}>My bench</h1>
      <p style={S.sub}>
        {trees === null ? '…'
          : trees.length === 0 ? 'Empty — plant your first tree below.'
          : `${trees.length} trees`}
      </p>

      {loadError && <p style={S.err}>⚠️ {loadError}</p>}

      {(trees || []).map((tree) => (
        <div key={tree.id} style={L.tree} onClick={() => onOpenTree(tree)}>
          <div style={L.photo}>
            {tree.coverUrl
              ? <img src={tree.coverUrl} alt={tree.name} style={L.img} />
              : <BrushStroke />}
          </div>
          <Horizon />
          <div style={L.caption}>
            <span style={L.name}>{tree.name}</span>
            <span style={L.meta}>
              {tree.photoCount === 0 ? 'no photos' : `${tree.photoCount} photos`}
            </span>
          </div>
        </div>
      ))}

      {trees !== null && (
        <button style={S.btn} onClick={onNewTree}>+ New tree</button>
      )}
    </div>
  )
}
