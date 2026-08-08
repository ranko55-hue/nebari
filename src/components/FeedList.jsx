/**
 * FeedList.jsx — Growers → Feed (screen 3.2). get_feed() with keyset
 * pagination. A post renders text + the tree's PUBLIC cover only (the
 * originals stay private). Like toggle is optimistic; comments expand
 * inline via PostComments.
 */

import { useEffect, useState, useCallback } from 'react'
import { supabase, publicMediaUrl, publicDerivativePath } from '../lib/supabase'
import { t } from '../lib/i18n'
import { relativeTime } from '../lib/time'
import { S, Horizon, EmptyState } from './ui'
import PostComments from './PostComments'

const PAGE = 20

const L = {
  card: { padding: '18px 0', borderBottom: '1px solid var(--line)' },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
  who: { fontSize: 12, color: 'var(--stone)' },
  tree: { fontFamily: 'var(--font-display)', fontSize: 15, margin: '2px 0 8px' },
  body: { fontSize: 14, lineHeight: 1.7, margin: '0 0 10px' },
  photo: { aspectRatio: '4 / 5', overflow: 'hidden', borderRadius: 2, background: 'var(--pine-night)' },
  img: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  actions: { display: 'flex', gap: 22, marginTop: 10 },
  more: { marginTop: 24 },
}

export default function FeedList({ session }) {
  const [posts, setPosts] = useState(null)
  const [authors, setAuthors] = useState({})
  const [trees, setTrees] = useState({})
  const [liked, setLiked] = useState({})     // post_id -> bool
  const [counts, setCounts] = useState({})   // post_id -> like_count (local)
  const [openId, setOpenId] = useState(null)
  const [cursor, setCursor] = useState(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const loadPage = useCallback(async (before) => {
    setBusy(true); setError(null)
    const { data, error: err } = await supabase.rpc('get_feed', { p_before: before, p_limit: PAGE })
    if (err) { setError(err.message); setBusy(false); if (!before) setPosts([]); return }
    const page = data || []

    const authorIds = [...new Set(page.map((p) => p.author_id))]
    const treeIds = [...new Set(page.map((p) => p.tree_id))]
    const postIds = page.map((p) => p.id)

    const [profRes, treeRes, likeRes] = await Promise.all([
      authorIds.length ? supabase.from('profiles').select('id, username, display_name').in('id', authorIds) : { data: [] },
      treeIds.length ? supabase.from('trees').select('id, name, owner_id, is_public, public_token').in('id', treeIds) : { data: [] },
      postIds.length ? supabase.from('post_likes').select('post_id').eq('user_id', session.user.id).in('post_id', postIds) : { data: [] },
    ])

    setAuthors((m) => ({ ...m, ...Object.fromEntries((profRes.data || []).map((p) => [p.id, p])) }))
    setTrees((m) => ({ ...m, ...Object.fromEntries((treeRes.data || []).map((tr) => [tr.id, tr])) }))
    setLiked((m) => ({ ...m, ...Object.fromEntries((likeRes.data || []).map((l) => [l.post_id, true])) }))
    setCounts((m) => ({ ...m, ...Object.fromEntries(page.map((p) => [p.id, p.like_count])) }))

    setPosts((prev) => (before ? [...(prev || []), ...page] : page))
    setCursor(page.length ? page[page.length - 1].created_at : before)
    setDone(page.length < PAGE)
    setBusy(false)
  }, [session.user.id])

  useEffect(() => { loadPage(null) }, [loadPage])

  async function toggleLike(post) {
    const isLiked = !!liked[post.id]
    const next = !isLiked
    setLiked((m) => ({ ...m, [post.id]: next }))
    setCounts((m) => ({ ...m, [post.id]: Math.max(0, (m[post.id] || 0) + (next ? 1 : -1)) }))
    const q = next
      ? supabase.from('post_likes').insert({ post_id: post.id, user_id: session.user.id })
      : supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', session.user.id)
    const { error: err } = await q
    if (err) { // rollback
      setLiked((m) => ({ ...m, [post.id]: isLiked }))
      setCounts((m) => ({ ...m, [post.id]: Math.max(0, (m[post.id] || 0) + (next ? -1 : 1)) }))
    }
  }

  function coverFor(tree) {
    if (!tree || !tree.is_public) return null
    return publicMediaUrl(publicDerivativePath(tree.owner_id, tree.id, 'cover.jpg'))
  }

  if (error && !posts) return <p style={S.err}>⚠️ {error}</p>
  if (posts !== null && posts.length === 0) {
    return <EmptyState title={t('growers.emptyFeedTitle')} body={t('growers.emptyFeedBody')} />
  }

  return (
    <div>
      {(posts || []).map((post) => {
        const author = authors[post.author_id] || {}
        const tree = trees[post.tree_id]
        const cover = coverFor(tree)
        return (
          <div key={post.id} style={L.card}>
            <div style={L.head}>
              <span style={L.who}>@{author.username || '—'}</span>
              <span style={L.who}>{relativeTime(post.created_at)}</span>
            </div>
            <div style={L.tree}>{tree?.name || '—'}</div>
            {post.body && <p style={L.body}>{post.body}</p>}
            {cover && (
              <div>
                <div style={L.photo}><img src={cover} alt="" style={L.img} loading="lazy" /></div>
                <Horizon />
              </div>
            )}
            <div style={L.actions}>
              <button style={S.word} onClick={() => toggleLike(post)}>
                {liked[post.id] ? t('post.liked') : t('post.like')}
                {counts[post.id] ? ` · ${counts[post.id]}` : ''}
              </button>
              <button style={S.link} onClick={() => setOpenId(openId === post.id ? null : post.id)}>
                {t('post.comments', { n: post.comment_count })}
              </button>
            </div>
            {openId === post.id && <PostComments post={post} session={session} />}
          </div>
        )
      })}

      {posts !== null && !done && (
        <div style={L.more}>
          <button style={S.link} disabled={busy} onClick={() => loadPage(cursor)}>
            {busy ? '…' : t('growers.more')}
          </button>
        </div>
      )}
    </div>
  )
}
