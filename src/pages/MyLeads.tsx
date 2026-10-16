import { Clock, MessageCircle, Play } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import LeadFile from '../components/LeadFile'
import { Brand, PriorityChip, ic } from '../components/ui'
import { actionLabel, money, timeAgo, untilLabel } from '../lib/format'
import { priorityOf } from '../lib/priority'
import { callbackDue, isOpen } from '../lib/queue'
import { actionFor, segmentOf } from '../lib/segments'
import type { Lead } from '../data/types'
import { useCurrentUser, useStore, useVisibleClients } from '../store/useStore'

export default function MyLeads() {
  const user = useCurrentUser()!
  const clients = useVisibleClients()
  const leads = useStore((s) => s.leads)
  const conversations = useStore((s) => s.conversations)
  const navigate = useNavigate()
  const [openId, setOpenId] = useState<string | null>(null)
  const mine = leads.filter((l) => l.assigneeId === user.id && isOpen(l) && !l.dnc)
  const due = mine.filter(callbackDue).sort((a, b) => +new Date(a.callbackAt!) - +new Date(b.callbackAt!))
  const groups = clients
    .map((c) => ({ c, rows: mine.filter((l) => l.clientId === c.id && !callbackDue(l)).sort((a, b) => priorityOf(b, c).score - priorityOf(a, c).score) }))
    .filter((g) => g.rows.length)
  const waiting = conversations.filter((c) => c.status === 'needs_human' && clients.some((x) => x.id === c.clientId) && (() => { const l = leads.find((x) => x.id === c.leadId); return !!l && (!l.assigneeId || l.assigneeId === user.id) })())
  const client = (l: Lead) => clients.find((c) => c.id === l.clientId)!
  const listIds = [...due, ...groups.flatMap((g) => g.rows)].map((l) => l.id)

  return (
    <main style={{ padding: '32px 40px 48px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 28, lineHeight: '34px', fontWeight: 600 }}>My leads</h1>
        <div className="muted">{mine.length} open lead{mine.length === 1 ? '' : 's'} assigned to you across {new Set(mine.map((l) => l.clientId)).size} clients · amounts stay in each client's currency</div>
      </div>

      {mine.length === 0 && <p className="muted">Nothing assigned to you yet. Open a client and claim leads.</p>}

      {waiting.length > 0 && (
        <section aria-labelledby="chat-h" className="card" style={{ overflow: 'hidden', borderColor: 'color-mix(in srgb, var(--accent) 35%, var(--line))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--accent-soft)' }}>
            <MessageCircle className={ic} style={{ color: 'var(--accent)' }} />
            <h2 id="chat-h" style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Customer replied</h2><span className="chip c-accent num">{waiting.length}</span>
            <span className="muted" style={{ fontSize: 13 }}>· the bot handed these over</span>
          </div>
          {waiting.map((c) => {
            const l = leads.find((x) => x.id === c.leadId)!
            const cl = client(l)
            return (
              <div key={c.id} className="lr">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}><Brand client={cl} size={28} /><div style={{ minWidth: 0 }}><b>{l.name}</b><div className="muted" style={{ fontSize: 12 }}>{cl.name}</div></div></div>
                <span className="chip c-bad">Needs a rep</span>
                <div style={{ color: 'var(--text-2)' }}>{c.handoffReason}</div>
                <span className="num r" style={{ fontWeight: 500 }}>{money(l.cartValue, l.currency)}</span>
                <span className="muted" style={{ fontSize: 12 }}>{timeAgo(c.updatedAt)}</span>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button className="btn btn-sm btn-primary" onClick={() => navigate(`/c/${c.clientId}?tab=conversations`)}>Open chat</button></div>
              </div>
            )
          })}
        </section>
      )}

      {due.length > 0 && (
        <section aria-labelledby="due-h" className="card" style={{ overflow: 'hidden', borderColor: 'color-mix(in srgb, var(--bad) 35%, var(--line))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--bad-soft)' }}>
            <Clock className={ic} style={{ color: 'var(--bad)' }} />
            <h2 id="due-h" style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Callbacks due</h2><span className="chip c-bad num">{due.length}</span>
            <span className="muted" style={{ fontSize: 13 }}>· sorted by due time</span>
          </div>
          {due.map((l, i) => {
            const c = client(l)
            return (
              <div key={l.id} className="lr">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}><Brand client={c} size={28} /><div style={{ minWidth: 0 }}><button className="nm" onClick={() => setOpenId(l.id)}>{l.name}</button><div className="muted" style={{ fontSize: 12 }}>{c.name}</div></div></div>
                <span className={`chip num ${i === 0 ? 'c-bad' : ''}`}><Clock className={ic} />Overdue {timeAgo(l.callbackAt!)}</span>
                <div style={{ color: 'var(--text-2)' }}>{l.lastDisposition === 'callback' ? 'Asked for a callback' : 'Callback'} · {new Date(l.callbackAt!).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })}
                  {c.status === 'error' && <div style={{ fontSize: 12, color: 'var(--warn)' }}>Store sync stale: check cart before quoting</div>}</div>
                <span className="num r" style={{ fontWeight: 500 }}>{money(l.cartValue, l.currency)}</span>
                <span className="muted" style={{ fontSize: 12 }}>{actionLabel[actionFor[segmentOf(l, c) ?? 'abandoned']]}</span>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button className="btn btn-sm" onClick={() => setOpenId(l.id)}>Open</button>
                  <button className={`btn btn-sm ${i === 0 ? 'btn-primary' : ''}`} onClick={() => setOpenId(l.id)}>Call</button>
                </div>
              </div>
            )
          })}
        </section>
      )}

      {groups.map(({ c, rows }) => (
        <section key={c.id} className="card" style={{ overflow: 'hidden' }}>
          <div style={{ height: 3, background: c.settings.color }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' }}>
            <Brand client={c} size={28} />
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{c.name}</h2><span className="chip c-out mono">{c.currency}</span><span className="muted num" style={{ fontSize: 13 }}>{rows.length} open</span>
            <div style={{ flex: 1 }} />
            <Link className="btn btn-sm btn-ghost" to={`/c/${c.id}`}>Open workspace</Link>
            <button className="btn btn-sm" onClick={() => navigate(`/c/${c.id}/dialer?view=abandoned`)}><Play className={ic} style={{ width: 14, height: 14 }} />Dial my leads</button>
          </div>
          {rows.slice(0, 6).map((l) => {
            const seg = segmentOf(l, c)
            return (
              <div key={l.id} className="lr">
                <div style={{ minWidth: 0 }}><button className="nm" onClick={() => setOpenId(l.id)}>{l.name}</button><div className="muted" style={{ fontSize: 12 }}>{l.status === 'callback' && l.callbackAt ? `Callback ${untilLabel(l.callbackAt)}` : l.status}</div></div>
                <PriorityChip score={priorityOf(l, c).score} />
                <div style={{ color: 'var(--text-2)' }}>{seg === 'abandoned' ? `Abandoned · ${l.stopReason ?? 'reason unknown'}` : `${l.ordersCount} orders · LTV ${money(l.ltv, l.currency)}`}</div>
                <span className="num r" style={{ fontWeight: 500 }}>{money(l.cartValue, l.currency)}</span>
                <span className="muted" style={{ fontSize: 12 }}>{seg ? actionLabel[actionFor[seg]] : '—'}</span>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button className="btn btn-sm btn-ghost" onClick={() => setOpenId(l.id)}>Open</button></div>
              </div>
            )
          })}
          {rows.length > 6 && <div style={{ padding: '10px 16px', borderTop: '1px solid var(--line)' }}><Link to={`/c/${c.id}`} style={{ fontSize: 13 }}>Show all {rows.length}</Link></div>}
        </section>
      ))}
      {openId && <LeadFile leadId={openId} ids={listIds} onNavigate={setOpenId} onClose={() => setOpenId(null)} />}
    </main>
  )
}
