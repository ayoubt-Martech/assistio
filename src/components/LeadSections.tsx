import { Bot, Calendar, Check, Clock, Mail, MessageCircle, Phone, Star, StickyNote, X, ShoppingCart, ArrowRightLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Client, Interaction, Lead } from '../data/types'
import { repWorking } from '../lib/automation'
import { dispositionDef } from '../lib/dispositions'
import { duration, money, segmentLabel, timeAgo, untilLabel } from '../lib/format'
import { priorityOf } from '../lib/priority'
import { segmentOf } from '../lib/segments'
import { useStore } from '../store/useStore'
import { Banner, Brand, FlagChip, PriorityChip, StatusChip, ic } from './ui'

const stepsOrder = ['Cart', 'Contact', 'Shipping', 'Payment']
const stopIndex: Record<string, number> = { cart: 0, shipping: 2, payment: 3 }

export function LeadHeader({ lead, client, compact = false }: { lead: Lead; client: Client; compact?: boolean }) {
  const seg = segmentOf(lead, client)
  const { score } = priorityOf(lead, client)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: compact ? 24 : 22, lineHeight: compact ? '30px' : '28px', fontWeight: 600 }}>{lead.name}</h2>
        <PriorityChip score={score} /><StatusChip status={lead.status} /><FlagChip lead={lead} />
        {lead.holdout && <span className="chip c-hold">Hold-out · admin</span>}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 13, color: 'var(--text-2)' }}>
        {compact && seg && <span>{segmentLabel[seg]}</span>}
        <span className="mono">{lead.phone || 'No phone'}</span><span>{lead.email || 'No email on file'}</span>
        <span className="num">{lead.ordersCount} orders · LTV {money(lead.ltv, lead.currency)}</span>
        <span className="muted">Active {timeAgo(lead.lastActivityAt)}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <span className={`chip ${lead.emailConsent ? 'c-ok' : 'c-dim'}`}><Mail className={ic} />{lead.emailConsent ? 'Email opted in' : 'Email: no consent'}</span>
        <span className={`chip ${lead.smsConsent ? 'c-ok' : 'c-dim'}`}><MessageCircle className={ic} />{lead.smsConsent ? 'SMS / WhatsApp opted in' : 'SMS / WhatsApp: no opt-in'}</span>
      </div>
    </div>
  )
}

/** Cross-channel awareness: what automation already did, and whether it is paused. */
export function AutomationNotice({ lead }: { lead: Lead }) {
  const { automations, activeCalls } = useStore()
  const paused = repWorking(lead, activeCalls)
  if (lead.dnc) return <Banner tone="bad" icon={<X className={ic} />}><b>Do not contact.</b> Calls and messages are blocked; automations skip this customer.</Banner>
  if (lead.autoContacts.length === 0 && !paused) return null
  const last = lead.autoContacts.at(-1)
  return (
    <Banner tone="info" icon={<Bot className={ic} />}>
      {last && <div><b>Automated {last.channel} sent {timeAgo(last.at)}</b> ({automations.find((a) => a.id === last.automationId)?.name ?? 'Chatbot'}). Mention it, don't repeat it.</div>}
      {paused && <div>Automations paused: a rep is working this lead.</div>}
    </Banner>
  )
}

export function CartBox({ lead, client, onReason }: { lead: Lead; client: Client; onReason?: (r: string) => void; reasons?: string[] }) {
  const seg = segmentOf(lead, client)
  return (
    <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span className="eyebrow">{seg === 'abandoned' ? 'Abandoned cart' : 'Last purchase'}</span>
        <span className="num" style={{ fontWeight: 600, fontSize: 16 }}>{money(lead.cartValue, lead.currency)}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
        {lead.cart.map((it, i) => (
          <div key={i} style={{ display: 'flex', gap: 8 }}><span className="num muted">{it.qty}×</span><span style={{ flex: 1 }}>{it.title}</span><span className="num">{money(it.price * it.qty, lead.currency)}</span></div>
        ))}
      </div>
      {seg === 'abandoned' && lead.stopPoint !== 'none' && (
        <>
          <ol aria-label="Checkout progress" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
            {stepsOrder.map((s, i) => {
              const stop = stopIndex[lead.stopPoint]
              const done = i < stop, cur = i === stop
              return (
                <li key={s} style={{ display: 'contents' }}>
                  <span aria-current={cur ? 'step' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 4, color: done ? 'var(--ok)' : cur ? 'var(--warn)' : 'var(--text-3)', fontWeight: cur ? 600 : 400 }}>
                    {done && <Check className={ic} style={{ width: 12, height: 12 }} />}{cur && <X className={ic} style={{ width: 12, height: 12 }} />}{s}
                  </span>
                  {i < stepsOrder.length - 1 && <span aria-hidden="true" style={{ flex: 1, height: 1, background: 'var(--line-2)' }} />}
                </li>
              )
            })}
          </ol>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8, borderTop: '1px solid var(--line)' }}>
            <span className="muted" style={{ fontSize: 12 }}>Reason</span>
            {onReason ? (
              <select className="field" style={{ flex: 1, minWidth: 0, height: 28, fontSize: 13 }} value={lead.stopReason ?? ''} onChange={(e) => onReason(e.target.value)} aria-label="Abandonment reason">
                <option value="">Unknown</option>
                {['Shipping cost too high', 'Delivery time too long', 'Payment failed', 'Card declined', 'Comparing prices', 'Just browsing', 'Needs more information'].map((r) => <option key={r}>{r}</option>)}
              </select>
            ) : <b style={{ fontSize: 13 }}>{lead.stopReason ?? 'Unknown'}</b>}
            <span className="tag" title="Shopify does not provide a reason; inferred from the step they stopped at">{lead.reasonSource === 'rep' ? 'set by rep' : 'inferred'}</span>
          </div>
        </>
      )}
      {lead.status === 'callback' && lead.callbackAt && (
        <div className={`chip ${new Date(lead.callbackAt) <= new Date() ? 'c-bad' : 'c-warn'}`} style={{ alignSelf: 'flex-start' }}>
          <Clock className={ic} />Callback {new Date(lead.callbackAt) <= new Date() ? `overdue ${timeAgo(lead.callbackAt)}` : untilLabel(lead.callbackAt)} · {new Date(lead.callbackAt).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })}
        </div>
      )}
      {lead.status === 'lost' && lead.lostReason && <div className="chip c-bad" style={{ alignSelf: 'flex-start' }}>Lost: {lead.lostReason}</div>}
    </div>
  )
}

export function PriorityCard({ lead, client }: { lead: Lead; client: Client }) {
  const { score, factors } = priorityOf(lead, client)
  return (
    <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span className="eyebrow">Why this lead</span><PriorityChip score={score} /></div>
      {factors.map((f) => (
        <div key={f.label} style={{ display: 'grid', gridTemplateColumns: '1fr 64px 34px', alignItems: 'center', gap: 8, fontSize: 13 }} title={f.note}>
          <span>{f.label} <span className="muted" style={{ fontSize: 11 }}>{f.note}</span></span>
          <span style={{ height: 6, borderRadius: 3, background: 'var(--surface-3)', overflow: 'hidden' }}>
            {f.points > 0 && <span style={{ display: 'block', height: '100%', borderRadius: 3, background: 'var(--hot)', width: `${Math.min(100, Math.round((f.points / 30) * 100))}%` }} />}
          </span>
          <span className="num" style={{ textAlign: 'right', fontWeight: 500, color: f.points < 0 ? 'var(--bad)' : undefined }}>{f.points > 0 ? '+' : ''}{f.points}</span>
        </div>
      ))}
      <div className="muted" style={{ fontSize: 11, paddingTop: 4, borderTop: '1px solid var(--line)' }}>Score 0–100 · Hot ≥ 70 · Warm 45–69 · Cool &lt; 45</div>
    </div>
  )
}

const dotStyle = (c: string): React.CSSProperties => ({ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', background: `var(--${c}-soft)`, color: `var(--${c})` })
const timelineIcon = (i: Interaction): [ReactNode, React.CSSProperties, string] => {
  const s = { width: 13, height: 13 }
  if (i.type === 'call') return [<Phone key="p" className={ic} style={s} />, dotStyle(i.disposition === 'won' ? 'ok' : i.disposition === 'callback' ? 'warn' : 'info'), 'Call']
  if (i.type === 'auto') return [<Bot key="b" className={ic} style={s} />, dotStyle('info'), 'Automated message']
  if (i.type === 'whatsapp') return [<MessageCircle key="w" className={ic} style={s} />, dotStyle('ok'), 'WhatsApp']
  if (i.type === 'email') return [<Mail key="m" className={ic} style={s} />, dotStyle('ok'), 'Email']
  if (i.type === 'status') return [<ArrowRightLeft key="s" className={ic} style={s} />, { ...dotStyle('hold') }, 'Status']
  return [<StickyNote key="n" className={ic} style={s} />, { width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--surface-2)', color: 'var(--text-2)' }, 'Note']
}

export function Timeline({ leadId }: { leadId: string }) {
  const { interactions, users } = useStore()
  const list = interactions.filter((i) => i.leadId === leadId).sort((a, b) => +new Date(b.at) - +new Date(a.at))
  if (list.length === 0) return <p className="muted" style={{ fontSize: 13 }}>No interactions yet.</p>
  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
      {list.map((i) => {
        const [icon, dot, title] = timelineIcon(i)
        return (
          <li key={i.id} style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 10, padding: '10px 0' }}>
            <span style={dot}>{icon}</span>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{title}{i.userId ? ` · ${users.find((u) => u.id === i.userId)?.name.split(' ')[0]}` : ''}</span>
                {i.disposition && <span className={`chip ${dispositionDef(i.disposition).tone.includes('green') ? 'c-ok' : dispositionDef(i.disposition).tone.includes('amber') ? 'c-warn' : dispositionDef(i.disposition).tone.includes('red') ? 'c-bad' : ''}`}>{dispositionDef(i.disposition).label}</span>}
                {i.durationSec !== undefined && <span className="muted num" style={{ fontSize: 12 }}>{duration(i.durationSec)}</span>}
                <span className="muted" style={{ fontSize: 12 }}>{timeAgo(i.at)}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{i.text}</div>
              {i.review && <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--hold)', marginTop: 2 }}><Star size={12} fill="currentColor" /> {i.review.rating}/5 · {i.review.comment}</div>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export { Brand, Calendar, ShoppingCart }
