/**
 * PublicTreeContent.jsx — screen 2.1 body, reusable.
 * Reads ONLY through get_public_tree_teaser (anon-safe). Frames load from
 * the PUBLIC bucket (teaser-N.jpg); the RPC's preview_media supplies just
 * the year captions (matched by order). Used standalone on /t/<token> and
 * embedded in the Growers → Discover flow.
 */

import { useEffect, useState, useCallback } from 'react'
import { supabase, publicMediaUrl, publicDerivativePath } from '../lib/supabase'
import { t } from '../lib/i18n'
import { S, Wordmark, PassePartout } from './ui'

const L = {
  head: { padding: '10px 2px 0' },
  name: { fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 26, margin: '10px 0 2px' },
  species: { fontSize: 13, color: 'var(--stone)', margin: 0 },
  owner: { fontSize: 12, color: 'var(--stone)', margin: '4px 0 0' },
  frameWrap: { marginTop: 26 },
  year: { fontSize: 11, color: 'var(--stone)', textAlign: 'center', padding: '2px 0 0' },
  locked: { fontSize: 12, color: 'var(--stone)', lineHeight: 1.8, margin: '30px 0 0', textAlign: 'center' },
  cta: { marginTop: 30 },
  back: {
    background: 'none', border: 'none', cursor: 'pointer', font: 'inherit',
    fontSize: 12, color: 'var(--stone)', letterSpacing: '0.12em',
    textTransform: 'uppercase', padding: '30px 0 0',
  },
}

export default function PublicTreeContent({ token, session, onBack, onExit }) {
  const [state, setState] = useState({ status: 'loading' }) // loading | notFound | ok
  const [following, setFollowing] = useState(false)
  const [busyFollow, setBusyFollow] = useState(false)

  const load = useCallback(async () => {
    setState({ status: 'loading' })
    const { data: teaser } = await supabase.rpc('get_public_tree_teaser', { p_token: token })
    if (!teaser) { setState({ status: 'notFound' }); return }

    // The RPC withholds ids — read them from the (public) tree row to build
    // public-bucket URLs and to key follows.
    const { data: treeRow } = await supabase
      .from('trees').select('id, owner_id').eq('public_token', token).maybeSingle()

    const preview = Array.isArray(teaser.preview_media) ? teaser.preview_media : []
    const frames = treeRow
      ? [1, 2, 3].slice(0, Math.max(preview.length, 0)).map((n, i) => ({
          url: publicMediaUrl(publicDerivativePath(treeRow.owner_id, treeRow.id, `teaser-${n}.jpg`)),
          year: preview[i]?.taken_at ? new Date(preview[i].taken_at).getFullYear() : null,
        }))
      : []

    setState({ status: 'ok', teaser, treeRow, frames })

    if (session && treeRow && session.user.id !== treeRow.owner_id) {
      const { data: f } = await supabase.from('tree_followers')
        .select('tree_id').eq('user_id', session.user.id).eq('tree_id', treeRow.id).maybeSingle()
      setFollowing(!!f)
    }
  }, [token, session])

  useEffect(() => { load() }, [load])

  async function toggleFollow() {
    const { treeRow } = state
    if (!treeRow) return
    setBusyFollow(true)
    const next = !following
    setFollowing(next) // optimistic
    const q = next
      ? supabase.from('tree_followers').insert({ user_id: session.user.id, tree_id: treeRow.id })
      : supabase.from('tree_followers').delete()
          .eq('user_id', session.user.id).eq('tree_id', treeRow.id)
    const { error } = await q
    if (error) setFollowing(!next) // rollback
    setBusyFollow(false)
  }

  if (state.status === 'loading') {
    return <p style={{ marginTop: 60, color: 'var(--stone)' }}>…</p>
  }

  if (state.status === 'notFound') {
    return (
      <div style={S.shell} className="screen-enter">
        {onBack && <button style={L.back} onClick={onBack}>← {t('common.back')}</button>}
        <Wordmark />
        <p style={{ ...S.sub, marginTop: 40 }}>{t('public.notFound')}</p>
        <button style={S.btnGhost} onClick={onExit}>{t('public.openApp')}</button>
      </div>
    )
  }

  const { teaser, treeRow, frames } = state
  const tree = teaser.tree || {}
  const owner = teaser.owner || {}
  const species = teaser.species || {}
  const locked = teaser.locked || {}
  const canFollow = session && treeRow && session.user.id !== treeRow.owner_id

  const speciesLine = species.common_name || species.scientific_name || ''
  const lockedParts = [
    t('public.statsPhotos', { n: locked.total_photos || 0 }),
    t('public.statsMilestones', { n: locked.milestones || 0 }),
    t('public.statsYears', { n: locked.years_tracked || 0 }),
    t('public.statsFollowers', { n: locked.followers || 0 }),
  ]

  return (
    <div style={S.shell} className="screen-enter">
      {onBack && <button style={L.back} onClick={onBack}>← {t('common.back')}</button>}
      <Wordmark />

      <div style={L.head}>
        <h1 style={L.name}>{tree.name}</h1>
        {speciesLine && <p style={L.species}>{speciesLine}</p>}
        <p style={L.owner}>
          {t('public.by', { name: owner.display_name || owner.username || '—' })}
          {owner.username ? ` · @${owner.username}` : ''}
        </p>
      </div>

      {frames.map((f, i) => (
        <div key={i} style={L.frameWrap}>
          <PassePartout src={f.url} alt={tree.name} />
          {f.year && <div style={L.year}>{f.year}</div>}
        </div>
      ))}

      <p style={L.locked}>{lockedParts.join(' · ')}</p>

      {canFollow && (
        <button style={S.btnGhost} disabled={busyFollow} onClick={toggleFollow}>
          {following ? t('public.following') : t('public.follow')}
        </button>
      )}

      {!onBack && (
        <div style={L.cta}>
          <button style={S.btn} onClick={onExit}>{t('public.toApp')}</button>
        </div>
      )}
    </div>
  )
}
