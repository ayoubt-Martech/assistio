import { Bot, Play, Plus, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Banner, Brand, ic } from '../components/ui'
import type { Automation, Segment } from '../data/types'
import { evaluate, skipLabel } from '../lib/automation'
import { segmentLabel, timeAgo } from '../lib/format'
import { useStore } from '../store/useStore'

const blank = (clientId: string): Omit<Automation, 'id'> => ({
  clientId, name: '', segment: 'abandoned', delayHours: 1, channel: 'whatsapp',
  template: 'Hi {{first_name}}, ...', requireConsent: true, enabled: true,
})

/** Scoped to one client when `clientId` is set (client workspace); otherwise the admin overview of all clients. */
export default function Automations({ clientId }: { clientId?: string }) {
  const { automations, runs, leads, clients, activeCalls, addAutomation, toggleAutomation, runAutomation } = useStore()
  const [filter, setFilter] = useState('')
  const scope = clientId ?? filter
  const [form, setForm] = useState(blank(clientId ?? clients[0].id))
  const [show, setShow] = useState(false)
  const list = automations.filter((a) => !scope || a.clientId === scope)
  const listIds = new Set(list.map((a) => a.id))
  const shownRuns = runs.filter((r) => listIds.has(r.automationId))

  const body = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        {clientId ? <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Automations</h2> : <div><h1 style={{ margin: 0, fontSize: 28, lineHeight: '34px', fontWeight: 600 }}>Automations</h1><div className="muted">Rules that message customers before a rep gets involved</div></div>}
        <div style={{ display: 'flex', gap: 8 }}>
          {!clientId && (
            <select className="field" aria-label="Client" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">All clients</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <button className="btn btn-primary" onClick={() => setShow(!show)}><Plus className={ic} />New rule</button>
        </div>
      </div>
      <Banner tone="warn" icon={<TriangleAlert className={ic} />}>
        <b>Prototype: runs are simulated, nothing is sent.</b> In production WhatsApp needs opt-in and an approved template; email needs consent and an unsubscribe link. Automations pause as soon as a rep starts working a lead.
      </Banner>

      {show && (
        <div className="card" style={{ padding: 16, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          {!clientId && (
            <select className="field" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} style={{ gridColumn: '1 / -1' }}>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <input className="field" placeholder="Rule name" aria-label="Rule name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="field" aria-label="Segment" value={form.segment} onChange={(e) => setForm({ ...form, segment: e.target.value as Segment })}>
            {Object.entries(segmentLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>Wait (hours) <input className="field" type="number" min={0} style={{ width: 90 }} value={form.delayHours} onChange={(e) => setForm({ ...form, delayHours: +e.target.value })} /></label>
          <select className="field" aria-label="Channel" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value as 'whatsapp' | 'email' })}>
            <option value="whatsapp">WhatsApp</option><option value="email">Email</option>
          </select>
          <textarea className="field" rows={3} aria-label="Template" style={{ gridColumn: '1 / -1' }} value={form.template} onChange={(e) => setForm({ ...form, template: e.target.value })} />
          <p className="muted" style={{ gridColumn: '1 / -1', margin: 0, fontSize: 12 }}>Variables: {'{{first_name}} {{cart_items}} {{store}}'}</p>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><input type="checkbox" checked={form.requireConsent} onChange={(e) => setForm({ ...form, requireConsent: e.target.checked })} /> Require channel consent</label>
          <button className="btn btn-primary" disabled={!form.name} onClick={() => { addAutomation({ ...form, clientId: clientId ?? form.clientId }); setForm(blank(clientId ?? clients[0].id)); setShow(false) }}>Save rule</button>
        </div>
      )}

      {list.length === 0 && <p className="muted">No automation rules yet.</p>}
      {list.map((a) => {
        const client = clients.find((c) => c.id === a.clientId)!
        const evals = leads.filter((l) => l.clientId === a.clientId).map((l) => evaluate(a, l, client, activeCalls))
        const eligible = evals.filter((e) => e.state === 'eligible').length
        const paused = evals.filter((e) => e.state === 'skip' && e.reason === 'rep_working').length
        return (
          <div key={a.id} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--info-soft)', color: 'var(--info)', display: 'grid', placeItems: 'center' }}><Bot className={ic} /></span>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{a.name}</h3>{!clientId && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}><Brand client={client} size={18} />{client.name}</span>}</div>
                <div className="muted" style={{ fontSize: 13 }}>{segmentLabel[a.segment]} · after {a.delayHours}h · {a.channel}{a.requireConsent ? ' · consent required' : ''}</div>
              </div>
              <span className="chip c-ok num">{eligible} eligible now</span>
              <span className="chip num">{paused} paused (rep working)</span>
              <button className="btn btn-sm" onClick={() => runAutomation(a.id)}><Play className={ic} style={{ width: 14, height: 14 }} />Run now (simulated)</button>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}><input type="checkbox" checked={a.enabled} onChange={() => toggleAutomation(a.id)} /> Enabled</label>
            </div>
            <p style={{ margin: 0, padding: '8px 10px', borderRadius: 8, background: 'var(--surface-2)', fontSize: 13, color: 'var(--text-2)' }}>{a.template}</p>
          </div>
        )
      })}

      <div>
        <h2 style={{ margin: '8px 0', fontSize: 15, fontWeight: 600 }}>Execution log</h2>
        {shownRuns.length === 0 && <p className="muted" style={{ fontSize: 13 }}>No runs yet.</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {shownRuns.map((r) => (
            <div key={r.id} className="card" style={{ padding: '8px 12px', fontSize: 13 }}>
              {automations.find((a) => a.id === r.automationId)?.name} · <b>{r.sent}</b> sent
              {Object.keys(r.skipped).length > 0 && <span className="muted"> · skipped: {Object.entries(r.skipped).map(([k, n]) => `${n} ${skipLabel[k as keyof typeof skipLabel]}`).join(', ')}</span>}
              <span className="muted"> · {timeAgo(r.at)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
  return clientId ? body : <main style={{ padding: '32px 40px 48px' }}>{body}</main>
}
