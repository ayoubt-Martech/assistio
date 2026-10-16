import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { LeadStatus } from '../data/types'
import { statusLabel } from '../lib/format'
import { useCurrentUser, useStore } from '../store/useStore'
import CallPanel from './CallPanel'
import { AutomationNotice, CartBox, LeadHeader, PriorityCard, Timeline } from './LeadSections'
import MessagePanel from './MessagePanel'
import OrderPanel from './OrderPanel'
import ScriptPanel from './ScriptPanel'
import { Brand, ic } from './ui'
import { segmentLabel } from '../lib/format'
import { segmentOf } from '../lib/segments'

type Tab = 'script' | 'msg' | 'orders' | 'time'

/** Right-hand drawer. `ids`/`onNavigate` enable previous/next lead (K / J). */
export default function LeadFile({ leadId, onClose, ids = [], onNavigate }: { leadId: string; onClose: () => void; ids?: string[]; onNavigate?: (id: string) => void }) {
  const { leads, clients, users, interactions, updateLead, setStatus, claimLead, log } = useStore()
  const me = useCurrentUser()!
  const [tab, setTab] = useState<Tab>('script')
  const [note, setNote] = useState('')
  const lead = leads.find((l) => l.id === leadId)
  const idx = ids.indexOf(leadId)
  const go = (d: number) => { const n = ids[idx + d]; if (n && onNavigate) { onNavigate(n); setTab('script') } }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return
      if (e.key === 'Escape') onClose()
      else if (e.key.toLowerCase() === 'j') go(1)
      else if (e.key.toLowerCase() === 'k') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!lead) return null
  const client = clients.find((c) => c.id === lead.clientId)!
  const seg = segmentOf(lead, client)
  const reps = users.filter((u) => u.clientIds.includes(lead.clientId) && u.role === 'rep')
  const owner = users.find((u) => u.id === lead.assigneeId)
  const nTimeline = interactions.filter((i) => i.leadId === lead.id).length
  const tabs: [Tab, string, number?][] = [['script', 'Script'], ['msg', 'Message'], ['orders', 'Orders & offers'], ['time', 'Timeline', nTimeline]]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 20, background: 'var(--scrim)' }} onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-label={`Lead file: ${lead.name}`} onClick={(e) => e.stopPropagation()}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(680px, 100%)', background: 'var(--surface)', boxShadow: 'var(--shadow-3)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 3, background: client.settings.color, flex: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px 10px 20px', borderBottom: '1px solid var(--line)', flex: 'none' }}>
          <Brand client={client} size={22} />
          <span style={{ fontSize: 13, fontWeight: 500 }}>{client.name}</span>
          <span className="muted" style={{ fontSize: 13 }}>· {seg ? segmentLabel[seg] : 'Lead'}</span>
          <div style={{ flex: 1 }} />
          {ids.length > 0 && idx >= 0 && <span className="muted num" style={{ fontSize: 12 }}>{idx + 1} of {ids.length}</span>}
          <button className="btn btn-ghost btn-sm" aria-label="Previous lead (K)" disabled={idx <= 0} onClick={() => go(-1)}><ChevronUp className={ic} /></button>
          <button className="btn btn-ghost btn-sm" aria-label="Next lead (J)" disabled={idx < 0 || idx >= ids.length - 1} onClick={() => go(1)}><ChevronDown className={ic} /></button>
          <button className="btn btn-ghost btn-sm" aria-label="Close (Esc)" onClick={onClose}><X className={ic} /></button>
        </div>

        <div style={{ padding: '16px 20px 14px', flex: 'none' }}><LeadHeader lead={lead} client={client} /></div>

        <CallPanel key={lead.id} lead={lead} client={client} onNext={ids.length ? () => go(1) : undefined} />

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <div style={{ padding: '14px 20px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <AutomationNotice lead={lead} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              <CartBox lead={lead} client={client} onReason={(r) => updateLead(lead.id, { stopReason: r || null, reasonSource: 'rep' })} />
              <PriorityCard lead={lead} client={client} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 13 }}>
              {!lead.assigneeId ? <button className="btn btn-sm" onClick={() => claimLead(lead.id)}>Claim this lead</button> : <span>Owner: <b>{owner?.name}</b>{lead.assigneeId !== me.id && me.role === 'rep' && <span className="muted"> · read-only</span>}</span>}
              {me.role === 'admin' && (
                <>
                  <label className="muted" style={{ fontSize: 12 }}>Reassign{' '}
                    <select className="field" style={{ height: 28 }} value={lead.assigneeId ?? ''} onChange={(e) => updateLead(lead.id, { assigneeId: e.target.value || null, claimedAt: e.target.value ? new Date().toISOString() : null })}>
                      <option value="">Unassigned</option>{reps.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </label>
                  <label className="muted" style={{ fontSize: 12 }}>Force status{' '}
                    <select className="field" style={{ height: 28 }} value={lead.status} onChange={(e) => setStatus(lead.id, e.target.value as LeadStatus)}>
                      {Object.entries(statusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </label>
                </>
              )}
            </div>
          </div>

          <div className="tabs" role="tablist" aria-label="Lead details" style={{ marginTop: 14, position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
            {tabs.map(([k, label, n]) => (
              <button key={k} className="tab" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
                {label}{n ? <span className="chip num" style={{ height: 18, padding: '0 5px', fontSize: 11 }}>{n}</span> : null}
              </button>
            ))}
          </div>
          <div role="tabpanel" style={{ padding: '16px 20px 24px' }}>
            {tab === 'script' && <ScriptPanel lead={lead} client={client} />}
            {tab === 'msg' && <MessagePanel lead={lead} client={client} />}
            {tab === 'orders' && <OrderPanel lead={lead} client={client} />}
            {tab === 'time' && <Timeline leadId={lead.id} />}
          </div>
        </div>

        <form style={{ flex: 'none', borderTop: '1px solid var(--line)', padding: '10px 20px', display: 'flex', gap: 8, alignItems: 'center' }}
          onSubmit={(e) => { e.preventDefault(); if (note.trim()) { log(lead.id, 'note', note.trim()); setNote('') } }}>
          <input className="field" style={{ flex: 1 }} aria-label="Add a note" placeholder="Add a note…" value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="btn btn-sm" type="submit">Add note</button>
        </form>
      </aside>
    </div>
  )
}
