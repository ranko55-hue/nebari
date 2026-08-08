/**
 * TreeShare.jsx — screen 2.2 (+ 2.4 story, + posting) inside TreeScreen.
 * Publish renders derivatives to public-media then flips is_public; the
 * public link, Web-Share/copy, story export and "post update" all live
 * here. All shibui word-actions.
 */

import { useState } from 'react'
import { supabase, parseDbError, publicMediaUrl, publicDerivativePath } from '../lib/supabase'
import { renderTreeDerivatives } from '../lib/derivatives'
import { buildStoryCanvas } from '../lib/storyCanvas'
import { t } from '../lib/i18n'
import { S } from './ui'

const L = {
  zone: { marginTop: 40, paddingTop: 18, borderTop: '1px solid var(--line)' },
  head: { fontFamily: 'var(--font-display)', fontSize: 17, margin: '0 0 6px' },
  hint: { fontSize: 12, color: 'var(--stone)', margin: '0 0 14px', lineHeight: 1.7 },
  link: { fontSize: 12, color: 'var(--ink)', wordBreak: 'break-all', margin: '0 0 12px' },
  row: { display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'center' },
  field: {
    width: '100%', minHeight: 70, padding: '10px 2px', fontSize: 15, resize: 'vertical',
    border: 'none', borderBottom: '1px solid var(--line)', background: 'transparent',
    color: 'var(--ink)', outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-body)',
  },
  toggle: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--stone)', marginTop: 12 },
  count: { fontSize: 11, color: 'var(--stone)', marginTop: 6 },
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image load failed'))
    img.src = url
  })
}

function yearRange(media) {
  const imgs = (media || []).filter((m) => m.taken_at)
    .map((m) => new Date(m.taken_at).getFullYear())
  if (!imgs.length) return {}
  return { yearFrom: Math.min(...imgs), yearTo: Math.max(...imgs) }
}

export default function TreeShare({ session, tree, media, coverId, isPublic, publicToken, onPublishedChange }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [confirmPrivate, setConfirmPrivate] = useState(false)
  const [storyBusy, setStoryBusy] = useState(false)

  const [body, setBody] = useState('')
  const [attach, setAttach] = useState(false)
  const [postState, setPostState] = useState(null) // null | 'busy' | 'done'
  const [postError, setPostError] = useState(null)

  const link = `${window.location.origin}/t/${encodeURIComponent(publicToken || '')}`

  async function logShare(network, assetType) {
    await supabase.from('share_events').insert({
      tree_id: tree.id, user_id: session.user.id, network, asset_type: assetType,
    })
  }

  async function publish() {
    setBusy(true); setError(null)
    try {
      await renderTreeDerivatives({ ownerId: session.user.id, treeId: tree.id, media, coverId })
      const { error: err } = await supabase.from('trees').update({ is_public: true }).eq('id', tree.id)
      if (err) throw err
      onPublishedChange(true)
    } catch (e) {
      // Never leave a half-published tree.
      await supabase.from('trees').update({ is_public: false }).eq('id', tree.id)
      onPublishedChange(false)
      setError(e.message || t('errors.UNKNOWN'))
    } finally {
      setBusy(false)
    }
  }

  async function makePrivate() {
    setBusy(true); setError(null)
    const { error: err } = await supabase.from('trees').update({ is_public: false }).eq('id', tree.id)
    setBusy(false); setConfirmPrivate(false)
    if (err) { setError(err.message); return }
    onPublishedChange(false)
  }

  async function copyLink() {
    try { await navigator.clipboard.writeText(link); setCopied(true) } catch { /* ignore */ }
    logShare('link', 'og_link')
  }

  async function shareLink() {
    if (navigator.share) {
      try { await navigator.share({ title: tree.name, url: link }) } catch { return }
      logShare('link', 'og_link')
    } else {
      copyLink()
    }
  }

  async function storyImage() {
    setStoryBusy(true); setError(null)
    try {
      const img = await loadImage(publicMediaUrl(publicDerivativePath(session.user.id, tree.id, 'cover.jpg')))
      const canvas = buildStoryCanvas(img, { name: tree.name, ...yearRange(media) })
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'))
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(tree.name || 'tree').replace(/[^\w-]+/g, '-').toLowerCase()}-story.png`
      a.click()
      URL.revokeObjectURL(url)
      logShare('other', 'story_9_16')
    } catch (e) {
      setError(e.message || t('errors.UNKNOWN'))
    } finally {
      setStoryBusy(false)
    }
  }

  async function submitPost(e) {
    e.preventDefault()
    const text = body.trim()
    if (!text) return
    setPostState('busy'); setPostError(null)
    const latest = (media || []).slice().sort((a, b) => new Date(b.taken_at) - new Date(a.taken_at))[0]
    const { error: err } = await supabase.from('posts').insert({
      author_id: session.user.id, tree_id: tree.id, post_type: 'update',
      body: text, media_id: attach && latest ? latest.id : null,
    })
    if (err) { setPostState(null); setPostError(t(`errors.${parseDbError(err).code}`)); return }
    setBody(''); setAttach(false); setPostState('done')
  }

  return (
    <div style={L.zone}>
      <h2 style={L.head}>{t('share.section')}</h2>

      {!isPublic ? (
        <>
          <p style={L.hint}>{t('share.publishHint')}</p>
          <button style={S.word} disabled={busy} onClick={publish}>
            {busy ? t('share.publishing') : t('share.publish')}
          </button>
          <p style={{ ...L.hint, marginTop: 14, opacity: 0.7 }}>{t('post.publishFirst')}</p>
        </>
      ) : (
        <>
          <p style={L.link}>{link}</p>
          <div style={L.row}>
            <button style={S.word} onClick={copyLink}>{copied ? t('share.copied') : t('share.copyLink')}</button>
            <button style={S.word} onClick={shareLink}>{t('share.shareLink')}</button>
            <button style={S.word} disabled={storyBusy} onClick={storyImage}>
              {storyBusy ? t('share.rendering') : t('share.storyImage')}
            </button>
          </div>

          <form onSubmit={submitPost} style={{ marginTop: 24 }}>
            <textarea style={L.field} maxLength={500} placeholder={t('post.body')}
              value={body} onChange={(e) => { setBody(e.target.value); setPostState(null) }} />
            <div style={L.count}>{body.length}/500</div>
            <label style={L.toggle}>
              <input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} />
              {t('post.attachLatest')}
            </label>
            <button style={S.word} disabled={postState === 'busy' || !body.trim()}>
              {postState === 'busy' ? t('post.posting')
                : postState === 'done' ? t('post.posted') : t('post.update')}
            </button>
            {postError && <p style={S.err}>⚠️ {postError}</p>}
          </form>

          <div style={{ marginTop: 22 }}>
            {confirmPrivate ? (
              <button style={{ ...S.word, ...S.danger }} disabled={busy} onClick={makePrivate}>
                {t('share.confirmPrivate')}
              </button>
            ) : (
              <button style={{ ...S.word, ...S.danger }} onClick={() => setConfirmPrivate(true)}>
                {t('share.makePrivate')}
              </button>
            )}
          </div>
        </>
      )}

      {error && <p style={S.err}>⚠️ {error}</p>}
    </div>
  )
}
