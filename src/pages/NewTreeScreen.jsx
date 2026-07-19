/** NewTreeScreen.jsx — create a tree, then flow straight into import. */

import { useState } from 'react'
import { supabase, parseDbError } from '../lib/supabase'
import { t } from '../lib/i18n'
import { S, Wordmark } from '../components/ui'

export default function NewTreeScreen({ session, onCreated, onCancel }) {
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
      <Wordmark />
      <h1 style={S.h1}>New tree</h1>
      <p style={S.sub}>Give it the name you use in the garden.</p>
      <form onSubmit={create}>
        <input style={S.input} required autoFocus placeholder="Old olive"
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
