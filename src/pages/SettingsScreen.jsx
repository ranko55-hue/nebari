/** SettingsScreen.jsx — language + sign out. Grows later (1.8). */

import { supabase } from '../lib/supabase'
import { getLocale, setLocale } from '../lib/i18n'
import { S, Wordmark } from '../components/ui'

export default function SettingsScreen({ onBack, onFlip }) {
  return (
    <div style={S.shell} className="screen-enter">
      <Wordmark />
      <h1 style={S.h1}>Settings</h1>
      <p style={S.sub}>Quiet controls.</p>

      <button style={S.btnGhost}
        onClick={() => { setLocale(getLocale() === 'en' ? 'he' : 'en'); onFlip() }}>
        {getLocale() === 'en' ? 'עברית' : 'English'}
      </button>

      <button style={S.btnGhost} onClick={() => supabase.auth.signOut()}>
        Sign out
      </button>

      <button style={{ ...S.btnGhost, borderColor: 'transparent' }} onClick={onBack}>
        Back
      </button>
    </div>
  )
}
