/** AuthScreen.jsx — welcome + magic-link sign in/up (they're the same flow). */

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { S, Wordmark } from '../components/ui'

export default function AuthScreen() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function sendLink(e) {
    e.preventDefault()
    setBusy(true); setError(null)
    const { error: err } = await supabase.auth.signInWithOtp({
      email, options: { emailRedirectTo: window.location.origin },
    })
    setBusy(false)
    if (err) setError(err.message); else setSent(true)
  }

  return (
    <div style={S.shell} className="screen-enter">
      <Wordmark />
      <h1 style={S.h1}>Grow the story of your trees</h1>
      <p style={S.sub}>
        A quiet place for your bonsai — care schedules, a photo timeline
        across the years, and growers to learn from.
      </p>
      <div style={{ height: 34 }} />
      {sent ? (
        <p style={{ fontSize: 14 }}>Check your email — your sign-in link is there.</p>
      ) : (
        <form onSubmit={sendLink}>
          <input style={S.input} type="email" required placeholder="you@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <button style={S.btn} disabled={busy}>{busy ? '…' : 'Continue with email'}</button>
          {error && <p style={S.err}>{error}</p>}
          <p style={S.note}>New or returning — same door. No password.</p>
        </form>
      )}
    </div>
  )
}
