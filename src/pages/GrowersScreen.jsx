/** GrowersScreen.jsx — the community tab. Placeholder until phase 3. */

import { S, Wordmark, EmptyState } from '../components/ui'

export default function GrowersScreen() {
  return (
    <div style={S.shell} className="screen-enter">
      <Wordmark />
      <h1 style={S.h1}>Growers</h1>
      <p style={S.sub}>Trees and their stories, from growers everywhere.</p>
      <EmptyState
        title="The garden is being planted"
        body="Soon: timelapses, before-and-afters, and trees to follow as they grow."
      />
    </div>
  )
}
