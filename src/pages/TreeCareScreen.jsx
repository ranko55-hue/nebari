/**
 * TreeCareScreen.jsx — screen 1.7: the care schedule for one tree.
 * Lists a tree's care_tasks (active first), lets the owner add a task
 * (interval or seasonal) and deactivate one with a two-tap confirm.
 */

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { t } from '../lib/i18n'
import { S } from '../components/ui'

const TYPES = ['water', 'fertilize', 'prune', 'wire', 'repot', 'pest_check']
const SEASONS = ['spring', 'summer', 'autumn', 'winter']

const L = {
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '30px 0 0' },
  back: {
    background: 'none', border: 'none', cursor: 'pointer', font: 'inherit',
    fontSize: 12, color: 'var(--stone)', letterSpacing: '0.12em',
    textTransform: 'uppercase', padding: 0,
  },
  row: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    padding: '14px 2px', borderBottom: '1px solid var(--line)', gap: 12,
  },
  task: { fontFamily: 'var(--font-display)', fontSize: 16 },
  cadence: { fontSize: 11, color: 'var(--stone)', marginTop: 2 },
  remove: {
    background: 'none', border: 'none', cursor: 'pointer', font: 'inherit',
    fontSize: 12, color: '#9A4A3A', textDecoration: 'underline',
    textUnderlineOffset: 3, padding: 0, whiteSpace: 'nowrap',
  },
  inactiveTag: { fontSize: 11, color: 'var(--line)' },
  addTitle: { fontFamily: 'var(--font-display)', fontSize: 17, margin: '44px 0 0' },
  modeRow: { display: 'flex', gap: 22, marginTop: 22 },
  modeBtn: {
    background: 'none', border: 'none', cursor: 'pointer', font: 'inherit',
    fontSize: 12, color: 'var(--stone)', padding: '0 0 3px',
    letterSpacing: '0.08em', textTransform: 'uppercase',
  },
  modeOn: { color: 'var(--ink)', borderBottom: '1px solid var(--ink)' },
}

function cadenceText(task) {
  if (task.interval_days != null) return t('care.everyDays', { days: task.interval_days })
  if (task.season) return t('care.seasonal', { season: t(`care.season.${task.season}`) })
  return ''
}

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDaysISO(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function TreeCareScreen({ session, tree, onBack }) {
  const [tasks, setTasks] = useState(null)
  const [error, setError] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [busy, setBusy] = useState(false)

  const [type, setType] = useState('water')
  const [mode, setMode] = useState('interval') // 'interval' | 'season'
  const [interval, setIntervalDays] = useState('7')
  const [season, setSeason] = useState('spring')

  const load = useCallback(async () => {
    setError(null)
    const { data, error: err } = await supabase
      .from('care_tasks')
      .select('id, task_type, interval_days, season, next_due, is_active')
      .eq('tree_id', tree.id)
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: true })
    if (err) { setError(err.message); setTasks([]); return }
    setTasks(data || [])
  }, [tree.id])

  useEffect(() => { load() }, [load])

  async function addTask(e) {
    e.preventDefault()
    setBusy(true); setError(null)
    const isInterval = mode === 'interval'
    const days = Math.max(1, parseInt(interval, 10) || 0)
    const row = {
      tree_id: tree.id,
      owner_id: session.user.id,
      task_type: type,
      interval_days: isInterval ? days : null,
      season: isInterval ? null : season,
      next_due: isInterval ? addDaysISO(days) : null,
    }
    const { error: err } = await supabase.from('care_tasks').insert(row)
    setBusy(false)
    if (err) { setError(err.message); return }
    setIntervalDays('7')
    load()
  }

  async function deactivate(task) {
    setBusy(true); setError(null)
    const { error: err } = await supabase
      .from('care_tasks').update({ is_active: false }).eq('id', task.id)
    setBusy(false)
    setConfirmId(null)
    if (err) { setError(err.message); return }
    load()
  }

  return (
    <div style={S.shell} className="screen-enter">
      <div style={L.topBar}>
        <button style={L.back} onClick={onBack}>← {tree.name}</button>
      </div>

      <h1 style={{ ...S.h1, marginTop: 20 }}>{t('care.scheduleTitle')}</h1>
      <p style={S.sub}>{t('care.scheduleSub')}</p>

      {error && <p style={S.err}>⚠️ {error}</p>}

      {tasks !== null && tasks.length === 0 && (
        <p style={{ ...S.sub, marginTop: 8 }}>{t('care.emptySchedule')}</p>
      )}

      {(tasks || []).map((task) => (
        <div key={task.id} style={{ ...L.row, opacity: task.is_active ? 1 : 0.5 }}>
          <div>
            <div style={L.task}>{t(`care.${task.task_type}`)}</div>
            <div style={L.cadence}>
              {cadenceText(task)}
              {task.next_due ? ` · ${t('care.nextShort', { date: task.next_due })}` : ''}
            </div>
          </div>
          {task.is_active ? (
            confirmId === task.id ? (
              <button style={L.remove} disabled={busy} onClick={() => deactivate(task)}>
                {t('care.confirmRemove')}
              </button>
            ) : (
              <button style={L.remove} onClick={() => setConfirmId(task.id)}>
                {t('care.remove')}
              </button>
            )
          ) : (
            <span style={L.inactiveTag}>{t('care.inactive')}</span>
          )}
        </div>
      ))}

      <h2 style={L.addTitle}>{t('care.addTitle')}</h2>
      <form onSubmit={addTask}>
        <label style={S.label}>{t('care.taskLabel')}</label>
        <select style={S.select} value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map((ty) => <option key={ty} value={ty}>{t(`care.${ty}`)}</option>)}
        </select>

        <div style={L.modeRow}>
          <button type="button"
            style={{ ...L.modeBtn, ...(mode === 'interval' ? L.modeOn : {}) }}
            onClick={() => setMode('interval')}>
            {t('care.cadenceInterval')}
          </button>
          <button type="button"
            style={{ ...L.modeBtn, ...(mode === 'season' ? L.modeOn : {}) }}
            onClick={() => setMode('season')}>
            {t('care.cadenceSeason')}
          </button>
        </div>

        {mode === 'interval' ? (
          <>
            <label style={S.label}>{t('care.intervalLabel')}</label>
            <input style={S.input} type="number" min="1" inputMode="numeric"
              value={interval} onChange={(e) => setIntervalDays(e.target.value)} />
          </>
        ) : (
          <>
            <label style={S.label}>{t('care.seasonLabel')}</label>
            <select style={S.select} value={season} onChange={(e) => setSeason(e.target.value)}>
              {SEASONS.map((s) => <option key={s} value={s}>{t(`care.season.${s}`)}</option>)}
            </select>
          </>
        )}

        <button style={S.btn} disabled={busy}>{busy ? '…' : t('care.saveTask')}</button>
      </form>
    </div>
  )
}
