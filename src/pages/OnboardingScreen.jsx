/**
 * OnboardingScreen.jsx — screen 1.2: one quiet form shown once to a fresh
 * user (provisional grower_ identity). Saves display name, username and
 * climate region to the profile, then hands off to the Bench.
 */

import { useState } from 'react'
import { supabase, parseDbError } from '../lib/supabase'
import { t } from '../lib/i18n'
import { S, Wordmark, Horizon } from '../components/ui'

const REGIONS = ['mediterranean', 'temperate', 'tropical', 'arid', 'continental']
const USERNAME_RE = /^[a-z0-9-]{3,24}$/

export default function OnboardingScreen({ session, profile, onDone }) {
  const [displayName, setDisplayName] = useState(
    profile?.display_name && profile.display_name !== 'New Grower' ? profile.display_name : '',
  )
  const [username, setUsername] = useState(
    profile?.username && !profile.username.startsWith('grower_') ? profile.username : '',
  )
  const [region, setRegion] = useState(profile?.climate_region || 'temperate')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function save(e) {
    e.preventDefault()
    const name = displayName.trim()
    const user = username.trim().toLowerCase()
    if (name.length < 2 || name.length > 40) { setError(t('onboarding.errName')); return }
    if (!USERNAME_RE.test(user)) { setError(t('onboarding.errUsername')); return }

    setBusy(true); setError(null)
    const { data, error: err } = await supabase
      .from('profiles')
      .update({ display_name: name, username: user, climate_region: region })
      .eq('id', session.user.id)
      .select()
      .single()
    setBusy(false)
    if (err) { setError(t(`errors.${parseDbError(err).code}`)); return }
    onDone(data)
  }

  return (
    <div style={S.shell} className="screen-enter">
      <Wordmark />
      <h1 style={S.h1}>{t('onboarding.title')}</h1>
      <p style={S.sub}>{t('onboarding.subtitle')}</p>
      <Horizon />

      <form onSubmit={save}>
        <label style={S.label}>{t('onboarding.displayName')}</label>
        <input style={S.input} autoFocus
          placeholder={t('onboarding.displayNamePlaceholder')}
          value={displayName} onChange={(e) => setDisplayName(e.target.value)} />

        <label style={S.label}>{t('onboarding.username')}</label>
        <input style={S.input}
          placeholder={t('onboarding.usernamePlaceholder')}
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())} />

        <label style={S.label}>{t('onboarding.region')}</label>
        <select style={S.select} value={region} onChange={(e) => setRegion(e.target.value)}>
          {REGIONS.map((r) => (
            <option key={r} value={r}>{t(`onboarding.region_${r}`)}</option>
          ))}
        </select>

        <button style={S.btn} disabled={busy}>{busy ? '…' : t('onboarding.save')}</button>
      </form>

      {error && <p style={S.err}>⚠️ {error}</p>}
    </div>
  )
}
