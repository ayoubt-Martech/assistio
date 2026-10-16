import { Copy, Lock, Tag } from 'lucide-react'
import { useState } from 'react'
import type { Client, Lead } from '../data/types'
import { money, timeAgo } from '../lib/format'
import { useCurrentUser, useStore } from '../store/useStore'
import { ic } from './ui'

/** Shopify-style sidebar: discount offers and order history. */
export default function OrderPanel({ lead, client }: { lead: Lead; client: Client }) {
  const me = useCurrentUser()!
  const { applyDiscount, log } = useStore()
  const [copied, setCopied] = useState(false)
  const [requested, setRequested] = useState<string | null>(null)
  const canWork = me.role === 'admin' || !lead.assigneeId || lead.assigneeId === me.id

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div className="eyebrow" style={{ paddingBottom: 8 }}>Offers {lead.discountCode && <span className="chip c-ok" style={{ marginLeft: 6, textTransform: 'none' }}>applied: {lead.discountCode}</span>}</div>
        {client.settings.offers.length === 0 && <p className="muted" style={{ fontSize: 13 }}>No offers configured for this client.</p>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {client.settings.offers.map((o) => {
            const needsApproval = !o.repAllowed && me.role === 'rep'
            return (
              <button key={o.code} className="btn btn-sm" aria-pressed={lead.discountCode === o.code} disabled={!canWork || needsApproval} onClick={() => applyDiscount(lead.id, o.code)}>
                {needsApproval ? <Lock className={ic} /> : <Tag className={ic} />}{o.code} · {o.label.replace(/ \(.*\)/, '')}
              </button>
            )
          })}
        </div>
        {client.settings.offers.filter((o) => !o.repAllowed && me.role === 'rep').map((o) => (
          <div key={o.code} className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            {o.code} needs manager approval ·{' '}
            {requested === o.code ? 'requested ✓' : <a href="#req" onClick={(e) => { e.preventDefault(); log(lead.id, 'note', `Requested manager approval for ${o.code}`); setRequested(o.code) }}>Request</a>}
          </div>
        ))}
        {lead.checkoutUrl && (
          <button className="btn btn-sm btn-ghost" style={{ marginTop: 8, padding: '0 4px' }} onClick={() => { navigator.clipboard?.writeText(lead.checkoutUrl!); setCopied(true); setTimeout(() => setCopied(false), 1500) }}>
            <Copy className={ic} />{copied ? 'Copied!' : 'Copy recovery link'}
          </button>
        )}
      </div>
      <div>
        <div className="eyebrow" style={{ paddingBottom: 4 }}>Order history</div>
        {lead.orders.length === 0 && <p className="muted" style={{ fontSize: 13 }}>No previous orders: new customer.</p>}
        {lead.orders.map((o) => (
          <div key={o.id} style={{ display: 'grid', gridTemplateColumns: '70px 1fr auto auto', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
            <span className="mono muted">{o.id}</span>
            <div><div>{o.items}</div><div className="muted" style={{ fontSize: 12 }}>{timeAgo(o.date)}</div></div>
            <span className={`chip ${o.status === 'Refunded' ? 'c-bad' : o.status === 'Paid' ? 'c-info' : 'c-ok'}`}>{o.status}</span>
            <span className="num" style={{ textAlign: 'right', minWidth: 70, fontWeight: 500 }}>{money(o.total, lead.currency)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
