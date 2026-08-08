/**
 * SettingsScreen.jsx — screen 1.8: editable identity (display name,
 * username, climate region), plus language toggle and sign out.
 * App version and signed-in email shown read-only at the bottom.
 */

import { useEffect, useState } from 'react'
import { supabase, parseDbError } from '../lib/supabase'
import { getLocale, setLocale, t } from '../lib/i18n'
import { S, Wordmark } from '../components/ui'

const REGIONS = ['mediterranean', 'temperate', 'tropical', 'arid', 'continental']
const USERNAME_RE = /^[a-z0-9-]{3,24}$/

const L = {
  ro: { fontSize: 11, color: 'var(--stone)', display: 'flex', justifyContent: 'space-between', padding: '10px 2px', borderBottom: '1px solid var(--line)' },
  ok: { fontSize: 12, color: 'var(--stone)', marginTop: 14 },
}

export default function SettingsScreen({ session, version, onBack, onFlip }) {
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [region, setRegion] = useState('temperate')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.from('profiles')
      .select('display_name, username, climate_region')
      .eq('id', session.user.id).single()
      .then(({ data }) => {
        if (!data) return
        setDisplayName(data.display_name && data.display_name !== 'New Grower' ? data.display_name : '')
        setUsername(data.username || '')
        setRegion(data.climate_region || 'temperate')
      })
  }, [session.user.id])

  async function save(e) {
    e.preventDefault()
    const name = displayName.trim()
    const user = username.trim().toLowerCase()
    if (name.length < 2 || name.length > 40) { setError(t('onboarding.errName')); return }
    if (!USERNAME_RE.test(user)) { setError(t('onboarding.errUsername')); return }

    setBusy(true); setError(null); setSaved(false)
    const { error: err } = await supabase
      .from('profiles')
      .update({ display_name: name, username: user, climate_region: region })
      .eq('id', session.user.id)
    setBusy(false)
    if (err) { setError(t(`errors.${parseDbError(err).code}`)); return }
    setSaved(true)
  }

  return (
    <div style={S.shell} className="screen-enter">
      <Wordmark />
      <h1 style={S.h1}>{t('settings.title')}</h1>
      <p style={S.sub}>{t('settings.subtitle')}</p>

      <form onSubmit={save}>
        <label style={S.label}>{t('onboarding.displayName')}</label>
        <input style={S.input}
          value={displayName} onChange={(e) => { setDisplayName(e.target.value); setSaved(false) }} />

        <label style={S.label}>{t('onboarding.username')}</label>
        <input style={S.input}
          value={username}
          onChange={(e) => { setUsername(e.target.value.toLowerCase()); setSaved(false) }} />

        <label style={S.label}>{t('onboarding.region')}</label>
        <select style={S.select} value={region}
          onChange={(e) => { setRegion(e.target.value); setSaved(false) }}>
          {REGIONS.map((r) => (
            <option key={r} value={r}>{t(`onboarding.region_${r}`)}</option>
          ))}
        </select>

        <button style={S.btn} disabled={busy}>{busy ? '…' : t('settings.save')}</button>
      </form>

      {error && <p style={S.err}>⚠️ {error}</p>}
      {saved && !error && <p style={L.ok}>{t('settings.saved')}</p>}

      <button style={S.btnGhost}
        onClick={() => { setLocale(getLocale() === 'en' ? 'he' : 'en'); onFlip() }}>
        {getLocale() === 'en' ? 'עברית' : 'English'}
      </button>

      <button style={S.btnGhost} onClick={() => supabase.auth.signOut()}>
        {t('settings.signOut')}
      </button>

      <button style={{ ...S.btnGhost, borderColor: 'transparent' }} onClick={onBack}>
        {t('settings.back')}
      </button>

      <div style={{ ...L.ro, marginTop: 34 }}>
        <span>{t('settings.version')}</span><span>{version}</span>
      </div>
      <div style={L.ro}>
        <span>{t('settings.email')}</span><span>{session.user.email}</span>
      </div>
    </div>
  )
}
