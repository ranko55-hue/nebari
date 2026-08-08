/**
 * PostComments.jsx — inline comment thread under a feed post (screen 3.2).
 * One level of nesting: top-level comments with indented replies. A quiet
 * input adds a comment; a `reply` word targets a parent.
 */

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { t } from '../lib/i18n'
import { relativeTime } from '../lib/time'
import { S } from './ui'

const L = {
  wrap: { marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' },
  item: { padding: '8px 0' },
  reply: { insetInlineStart: 0, marginInlineStart: 18, borderInlineStart: '1px solid var(--line)', paddingInlineStart: 12 },
  meta: { fontSize: 11, color: 'var(--stone)' },
  body: { fontSize: 13, margin: '2px 0 0', lineHeight: 1.6 },
  form: { display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 },
  input: {
    flex: 1, padding: '8px 2px', fontSize: 14, border: 'none',
    borderBottom: '1px solid var(--line)', background: 'transparent',
    color: 'var(--ink)', outline: 'none', fontFamily: 'var(--font-body)',
  },
}

export default function PostComments({ post, session }) {
  const [comments, setComments] = useState(null)
  const [names, setNames] = useState({})
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState(null) // parent comment id
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('comments')
      .select('id, author_id, parent_id, body, created_at')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
    if (err) { setError(err.message); setComments([]); return }
    const ids = [...new Set((data || []).map((c) => c.author_id))]
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id, username').in('id', ids)
      setNames(Object.fromEntries((profs || []).map((p) => [p.id, p.username])))
    }
    setComments(data || [])
  }, [post.id])

  useEffect(() => { load() }, [load])

  async function add(e) {
    e.preventDefault()
    const body = text.trim()
    if (!body) return
    setBusy(true); setError(null)
    const { error: err } = await supabase.from('comments').insert({
      post_id: post.id, author_id: session.user.id, body, parent_id: replyTo,
    })
    setBusy(false)
    if (err) { setError(err.message); return }
    setText(''); setReplyTo(null)
    load()
  }

  const tops = (comments || []).filter((c) => !c.parent_id)
  const repliesOf = (id) => (comments || []).filter((c) => c.parent_id === id)

  const Comment = (c, indented) => (
    <div key={c.id} style={{ ...L.item, ...(indented ? L.reply : {}) }}>
      <span style={L.meta}>@{names[c.author_id] || '—'} · {relativeTime(c.created_at)}</span>
      <p style={L.body}>{c.body}</p>
      {!indented && (
        <button style={S.link} onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}>
          {t('post.reply')}
        </button>
      )}
    </div>
  )

  return (
    <div style={L.wrap}>
      {comments === null ? <p style={L.meta}>…</p> : tops.map((c) => (
        <div key={c.id}>
          {Comment(c, false)}
          {repliesOf(c.id).map((r) => Comment(r, true))}
        </div>
      ))}

      <form style={L.form} onSubmit={add}>
        <input style={L.input} value={text} onChange={(e) => setText(e.target.value)}
          placeholder={replyTo ? t('post.reply') : t('post.addComment')} />
        <button style={S.link} disabled={busy || !text.trim()}>{t('post.send')}</button>
      </form>
      {error && <p style={S.err}>⚠️ {error}</p>}
    </div>
  )
}
