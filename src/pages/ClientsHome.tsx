import { Clock, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Brand, ic } from '../components/ui'
import type { Segment } from '../data/types'
import { dispositionDef } from '../lib/dispositions'
import { duration, timeAgo, untilLabel } from '../lib/format'
import { callbackDue, isOpen, workable } from '../lib/queue'
import { segmentOf } from '../lib/segments'
import { useCurrentUser, useStore, useVisibleClients } from '../store/useStore'

export default function ClientsHome() {
  const user = useCurrentUser()!
  const clients = useVisibleClients()
  const { leads, interactions, clients: allClients } = useStore()
  const first = user.name.replace(/\(.*\)/, '').trim().split(' ')[0]
  const hour = new Date().getHours()

  const dueLeads = leads.filter((l) => l.assigneeId === user.id && callbackDue(l))
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const today = interactions.filter((i) => i.type === 'call' && i.userId === user.id && i.disposition && new Date(i.at) >= todayStart)
  const connected = today.filter((i) => dispositionDef(i.disposition!).connected)
  const talk = connected.reduce((s, i) => s + (i.durationSec ?? 0), 0)

  const rows = clients.map((c) => {
    const mine = leads.filter((l) => l.clientId === c.id)
    const pool = mine.filter((l) => workable(l) && isOpen(l))
    const count = (s: Segment) => pool.filter((l) => segmentOf(l, c) === s).length
    const due = mine.filter((l) => l.assigneeId === user.id && callbackDue(l))
    const toContact = pool.filter((l) => l.status === 'new' && segmentOf(l, c)).length
    return { c, ab: count('abandoned'), re: count('recent_buyer'), pa: count('past_buyer'), toContact, mine: mine.filter((l) => l.assigneeId === user.id && isOpen(l)).length, due }
  }).sort((a, b) => b.toContact - a.toContact)

  const worst = dueLeads.length ? dueLeads.reduce((a, b) => (new Date(a.callbackAt!) < new Date(b.callbackAt!) ? a : b)) : null

  return (
    <main style={{ padding: '32px 40px 48px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 }}>
        <div>
          <div className="eyebrow">{new Date().toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <h1 style={{ margin: '4px 0 0', fontSize: 28, lineHeight: '34px', fontWeight: 600 }}>Good {hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'}, {first}</h1>
        </div>
        {user.role === 'rep' && (
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end' }} aria-label="Your day so far">
            {[['Calls', today.length], ['Connected', connected.length], ['Won', today.filter((i) => i.disposition === 'won').length], ['Talk time', duration(talk)]].map(([k, v]) => (
              <div key={k}><div className="muted" style={{ fontSize: 12 }}>{k}</div><div className="num" style={{ fontSize: 20, fontWeight: 600 }}>{v}</div></div>
            ))}
          </div>
        )}
      </div>

      {user.role === 'rep' && dueLeads.length > 0 && worst && (
        <div role="status" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, padding: '14px 16px', borderRadius: 12, background: 'var(--bad-soft)', border: '1px solid color-mix(in srgb, var(--bad) 25%, transparent)' }}>
          <span style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bad)', color: 'var(--on-solid)', display: 'grid', placeItems: 'center' }}><Clock className={ic} style={{ width: 18, height: 18 }} /></span>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontWeight: 600 }}>{dueLeads.length} callback{dueLeads.length > 1 ? 's' : ''} due: oldest was due {timeAgo(worst.callbackAt!)}</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{dueLeads.slice(0, 3).map((l) => `${l.name} (${allClients.find((c) => c.id === l.clientId)?.settings.logo})`).join(' · ')}</div>
          </div>
          <Link className="btn btn-primary" to="/my-leads">Handle callbacks</Link>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{user.role === 'admin' ? 'All clients' : 'Your clients'}</h2>
        <span className="muted" style={{ fontSize: 13 }}>Sorted by work waiting</span>
      </div>
      {clients.length === 0 && <p className="muted">No client assigned to you yet. Ask an admin.</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 16 }}>
        {rows.map(({ c, ab, re, pa, toContact, mine, due }) => (
          <Link key={c.id} to={`/c/${c.id}`} className="card ccard">
            <div style={{ height: 3, background: c.settings.color }} />
            <div style={{ padding: '18px 18px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Brand client={c} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 15 }}>{c.name}</div><div className="muted" style={{ fontSize: 12 }}>{c.shopifyDomain}</div></div>
              <span className="chip c-out mono">{c.currency}</span>
            </div>
            {c.status === 'error' && (
              <div style={{ margin: '14px 18px 0', padding: '8px 10px', borderRadius: 8, background: 'var(--warn-soft)', color: 'var(--warn)', fontSize: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <TriangleAlert className={ic} style={{ width: 14, height: 14, marginTop: 1 }} />
                <span><b>Shopify sync failed</b> · token expired. Last sync {timeAgo(c.lastSync)}: counts may be stale.</span>
              </div>
            )}
            <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'flex-end', gap: 24 }}>
              <div><div className="num" style={{ fontSize: 32, lineHeight: '36px', fontWeight: 600 }}>{toContact}</div><div className="muted" style={{ fontSize: 12 }}>to contact</div></div>
              <div><div className="num" style={{ fontSize: 20, lineHeight: '28px', fontWeight: 600 }}>{mine}</div><div className="muted" style={{ fontSize: 12 }}>assigned to you</div></div>
              <div style={{ flex: 1 }} />
              {due.length > 0 && <span className="chip c-bad num"><Clock className={ic} />{due.length} callback{due.length > 1 ? 's' : ''} due{due.length === 1 ? ` · ${untilLabel(due[0].callbackAt!)}` : ''}</span>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', borderTop: '1px solid var(--line)', marginTop: 'auto' }}>
              {[['Abandoned', ab], ['Recent', re], ['Past', pa]].map(([k, v], i) => (
                <div key={k} style={{ padding: '10px 18px', borderRight: i < 2 ? '1px solid var(--line)' : undefined }}><div className="muted" style={{ fontSize: 11 }}>{k}</div><div className="num" style={{ fontWeight: 600 }}>{v}</div></div>
              ))}
            </div>
          </Link>
        ))}
      </div>
      <div className="muted" style={{ fontSize: 12 }}>Counts are open leads only. Amounts are never summed across clients: each card stays in its own currency.</div>
    </main>
  )
}
