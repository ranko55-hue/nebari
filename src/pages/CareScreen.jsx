/**
 * CareScreen.jsx — screen 1.6: today's care across every tree.
 * Active tasks due today or overdue, grouped Overdue → Today.
 * "done" calls complete_care_task (logs + advances next_due) and drops the row.
 */

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { t } from '../lib/i18n'
import { S, Wordmark, EmptyState } from '../components/ui'

const L = {
  group: { fontSize: 11, color: 'var(--stone)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '34px 0 6px' },
  row: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    padding: '14px 2px', borderBottom: '1px solid var(--line)', gap: 12,
  },
  name: { fontFamily: 'var(--font-display)', fontSize: 16 },
  meta: { fontSize: 11, color: 'var(--stone)', marginTop: 2 },
  done: {
    background: 'none', border: 'none', cursor: 'pointer', font: 'inherit',
    fontSize: 12, color: 'var(--ink)', textDecoration: 'underline',
    textUnderlineOffset: 3, padding: 0, whiteSpace: 'nowrap',
  },
}

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function daysBetween(fromISO, toISO) {
  return Math.round((new Date(toISO) - new Date(fromISO)) / 86400000)
}

export default function CareScreen({ session }) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    setError(null)
    const today = todayISO()
    const { data: tasks, error: tErr } = await supabase
      .from('care_tasks')
      .select('id, tree_id, task_type, next_due')
      .eq('owner_id', session.user.id)
      .eq('is_active', true)
      .not('next_due', 'is', null)
      .lte('next_due', today)
      .order('next_due', { ascending: true })
    if (tErr) { setError(tErr.message); setRows([]); return }

    const treeIds = [...new Set((tasks || []).map((x) => x.tree_id))]
    const names = {}
    if (treeIds.length) {
      const { data: trees, error: nErr } = await supabase
        .from('trees').select('id, name').in('id', treeIds)
      if (nErr) { setError(nErr.message); setRows([]); return }
      for (const tr of trees || []) names[tr.id] = tr.name
    }

    setRows((tasks || []).map((task) => ({
      ...task,
      treeName: names[task.tree_id] || '—',
      overdueDays: daysBetween(task.next_due, today),
    })))
  }, [session.user.id])

  useEffect(() => { load() }, [load])

  async function markDone(task) {
    setBusyId(task.id); setError(null)
    const { error: err } = await supabase.rpc('complete_care_task', { p_task_id: task.id })
    setBusyId(null)
    if (err) { setError(err.message); return }
    setRows((r) => r.filter((x) => x.id !== task.id))
  }

  const overdue = (rows || []).filter((r) => r.overdueDays > 0)
  const today = (rows || []).filter((r) => r.overdueDays <= 0)

  const Row = (task) => (
    <div key={task.id} style={L.row}>
      <div>
        <div style={L.name}>{task.treeName}</div>
        <div style={L.meta}>
          {t(`care.${task.task_type}`)}
          {task.overdueDays > 0 ? ` · ${t('care.daysOverdue', { days: task.overdueDays })}` : ''}
        </div>
      </div>
      <button style={L.done} disabled={busyId === task.id} onClick={() => markDone(task)}>
        {busyId === task.id ? '…' : t('care.done')}
      </button>
    </div>
  )

  return (
    <div style={S.shell} className="screen-enter">
      <Wordmark />
      <h1 style={S.h1}>{t('care.tabTitle')}</h1>
      <p style={S.sub}>{t('care.tabSub')}</p>

      {error && <p style={S.err}>⚠️ {error}</p>}

      {rows !== null && rows.length === 0 && (
        <EmptyState title={t('care.emptyTitle')} body={t('care.emptyBody')} />
      )}

      {overdue.length > 0 && (
        <section>
          <div style={L.group}>{t('care.groupOverdue')}</div>
          {overdue.map(Row)}
        </section>
      )}

      {today.length > 0 && (
        <section>
          <div style={L.group}>{t('care.groupToday')}</div>
          {today.map(Row)}
        </section>
      )}
    </div>
  )
}
