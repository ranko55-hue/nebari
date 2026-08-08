/**
 * PublicTreeScreen.jsx — screen 2.1 at /t/<token>. Rendered by App BEFORE
 * the auth gate, so it works for anon and logged-in viewers alike. The
 * body is PublicTreeContent (shared with Growers → Discover); this wrapper
 * only owns the standalone "go to the app" navigation.
 */

import PublicTreeContent from '../components/PublicTreeContent'

export default function PublicTreeScreen({ token, session }) {
  const toApp = () => window.location.assign('/')
  return <PublicTreeContent token={token} session={session} onExit={toApp} />
}
