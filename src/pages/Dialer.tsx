import { Check, Clock, Lock } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import CallPanel, { InCallActions, type CallResult } from '../components/CallPanel'
import { AutomationNotice, CartBox, LeadHeader, PriorityCard } from '../components/LeadSections'
import ScriptPanel from '../components/ScriptPanel'
import { Brand, ic } from '../components/ui'
import type { Segment } from '../data/types'
import { dispositionDef } from '../lib/dispositions'
import { duration } from '../lib/format'
import { priorityOf } from '../lib/priority'
import { callbackDue, dialQueue } from '../lib/queue'
import { segmentOf } from '../lib/segments'
import { useCurrentUser, useStore } from '../store/useStore'

/** Power-dialer session: works a snapshot of the queue lead by lead. Renders full-screen (dark by default). */
export default function Dialer() {
  const { clientId } = useParams()
  const [params] = useSearchParams()
  const user = useCurrentUser()!
  const { clients, leads } = useStore()
  const client = clients.find((c) => c.id === clientId)

  const [queue] = useState<string[]>(() => {
    if (!client) return []
    const view = params.get('view')
    const mine = leads.filter((l) => l.clientId === client.id)
    return dialQueue(mine, client, user)
      .filter((l) => (view === 'callbacks' ? l.status === 'callback' : segmentOf(l, client) === (view as Segment) || callbackDue(l)))
      .map((l) => l.id)
  })
  const [idx, setIdx] = useState(0)
  const [done, setDone] = useState<CallResult[]>([])
  const [skipped, setSkipped] = useState(0)
  const [auto, setAuto] = useState(true)

  if (!client || (user.role !== 'admin' && !user.clientIds.includes(client.id))) return <Navigate to="/" />

  const finished = idx >= queue.length
  const current = leads.find((l) => l.id === queue[idx])
  const connected = done.filter((d) => dispositionDef(d.disposition).connected).length
  const wins = done.filter((d) => d.disposition === 'won').length
  const talk = done.reduce((s, d) => s + d.durationSec, 0)
  const next = () => setIdx((i) => i + 1)
  const stat = (k: string, v: string | number) => <div><dt className="muted" style={{ fontSize: 11 }}>{k}</dt><dd className="num" style={{ margin: 0, fontWeight: 600 }}>{v}</dd></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{ flex: 'none', background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ height: 3, background: client.settings.color }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px 24px', padding: '10px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Brand client={client} />
            <div><div style={{ fontWeight: 600, lineHeight: '18px' }}>{client.name}</div><div className="muted" style={{ fontSize: 12 }}>Dialer · {params.get('view') === 'callbacks' ? 'Callbacks' : params.get('view')?.replace('_', ' ') ?? 'queue'} + due callbacks</div></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: '1 1 200px', maxWidth: 300 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ fontWeight: 500 }}>{finished ? 'Session finished' : `Lead ${idx + 1} of ${queue.length}`}</span><span className="muted num">{Math.max(0, queue.length - idx)} left</span></div>
            <div role="progressbar" aria-label="Session progress" aria-valuemin={0} aria-valuemax={queue.length} aria-valuenow={Math.min(idx, queue.length)} style={{ height: 6, borderRadius: 3, background: 'var(--surface-3)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 3, background: 'var(--accent)', width: `${queue.length ? (Math.min(idx, queue.length) / queue.length) * 100 : 0}%` }} />
            </div>
          </div>
          <dl style={{ display: 'flex', gap: 22, margin: 0 }}>{stat('Calls', done.length)}{stat('Connected', connected)}{stat('Won', wins)}{stat('Talk time', duration(talk))}</dl>
          <div style={{ flex: 1 }} />
          <button className="btn btn-sm" aria-pressed={auto} onClick={() => setAuto(!auto)}>Auto-advance {auto ? 'on' : 'off'}</button>
          <Link className="btn btn-sm" to={`/c/${client.id}`}>End session</Link>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', minHeight: 0 }}>
        <nav aria-label="Up next" style={{ flex: '1 0 250px', maxWidth: '100%', borderRight: '1px solid var(--line)', background: 'var(--surface)', padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 2, alignSelf: 'stretch' }}>
          <div className="eyebrow" style={{ padding: '0 10px 8px' }}>Up next</div>
          {queue.slice(Math.max(0, idx - 2), idx + 10).map((id) => {
            const l = leads.find((x) => x.id === id)!
            const i = queue.indexOf(id)
            const isCur = i === idx, isDone = i < idx
            const gone = !isDone && !isCur && !!l.assigneeId && l.assigneeId !== user.id && user.role === 'rep'
            const due = callbackDue(l)
            const col = isCur ? 'accent' : isDone ? 'ok' : due ? 'bad' : 'text-3'
            return (
              <div key={id} className="q" aria-current={isCur ? 'step' : undefined} style={{ background: isCur ? 'var(--accent-soft)' : undefined, boxShadow: isCur ? 'inset 0 0 0 1px var(--accent)' : undefined, opacity: isDone || gone ? 0.62 : 1 }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', flex: 'none', color: `var(--${col})`, background: isCur || isDone || due ? `color-mix(in srgb, var(--${col}) 16%, transparent)` : 'var(--surface-2)' }}>
                  {isDone ? <Check className={ic} style={{ width: 12, height: 12 }} /> : gone ? <Lock className={ic} style={{ width: 12, height: 12 }} /> : due ? <Clock className={ic} style={{ width: 12, height: 12 }} /> : <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: isCur ? 600 : 500, textDecoration: isDone ? 'line-through' : undefined }}>{l.name}</div>
                  <div className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{gone ? 'Claimed by another rep · will skip' : due ? 'Callback overdue' : l.stopReason ?? `${l.ordersCount} orders`}</div>
                </div>
                <span className="num muted" style={{ fontSize: 12 }}>{priorityOf(l, client).score}</span>
              </div>
            )
          })}
          {queue.length - idx > 10 && <div className="muted" style={{ fontSize: 12, padding: 10 }}>+ {queue.length - idx - 10} more · order fixed at session start</div>}
        </nav>

        <main style={{ flex: '999 1 600px', minWidth: 0, padding: 20 }}>
          {queue.length === 0 && <div className="card" style={{ maxWidth: 520, margin: '60px auto', padding: 32, textAlign: 'center' }}>Nothing to dial in this view: no open leads with a phone number that you may call.</div>}
          {finished && queue.length > 0 && (
            <div className="card" style={{ maxWidth: 560, margin: '60px auto', padding: 32, display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'center', alignItems: 'center' }}>
              <span style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--ok-soft)', color: 'var(--ok)', display: 'grid', placeItems: 'center' }}><Check className={ic} style={{ width: 28, height: 28 }} /></span>
              <div><h2 style={{ margin: 0, fontSize: 22 }}>Session complete</h2><div className="muted">{skipped} lead{skipped === 1 ? '' : 's'} skipped</div></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, width: '100%' }}>
                {[['Calls', done.length], ['Connected', connected], ['Won', wins], ['Talk', duration(talk)]].map(([k, v]) => <div key={k} className="card" style={{ padding: 12 }}><div className="num" style={{ fontSize: 22, fontWeight: 600 }}>{v}</div><div className="muted" style={{ fontSize: 12 }}>{k}</div></div>)}
              </div>
              <Link className="btn btn-primary" to={`/c/${client.id}`}>Back to workspace</Link>
            </div>
          )}
          {current && !finished && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16, alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="card" style={{ padding: 16 }}><LeadHeader lead={current} client={client} compact /></div>
                {callbackDue(current) && (
                  <div className="banner" style={{ background: 'var(--bad-soft)', color: 'var(--bad)' }}><Clock className={ic} /><div><b>Callback overdue</b><span style={{ color: 'var(--text-2)' }}> · they asked to be called back</span></div></div>
                )}
                <AutomationNotice lead={current} />
                <CartBox lead={current} client={client} />
                <PriorityCard lead={current} client={client} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <CallPanel
                  key={current.id}
                  lead={current}
                  client={client}
                  variant="card"
                  autoAdvance={auto}
                  onSaved={(o) => setDone((d) => [...d, o])}
                  onUndo={() => setDone((d) => d.slice(0, -1))}
                  onNext={next}
                  onSkip={() => { setSkipped((s) => s + 1); next() }}
                  duringCall={<InCallActions lead={current} client={client} />}
                />
                <div className="card" style={{ padding: 16 }}><ScriptPanel lead={current} client={client} compact /></div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
