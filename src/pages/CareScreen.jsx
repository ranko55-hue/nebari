/** CareScreen.jsx — the Care tab. Placeholder until 1.6 is built. */

import { S, Wordmark, EmptyState } from '../components/ui'

export default function CareScreen() {
  return (
    <div style={S.shell} className="screen-enter">
      <Wordmark />
      <h1 style={S.h1}>Care</h1>
      <p style={S.sub}>Today's tasks across all your trees.</p>
      <EmptyState
        title="Nothing scheduled yet"
        body="When your trees have care schedules, today's watering, feeding and pruning will gather here."
      />
    </div>
  )
}
