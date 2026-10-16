import { Ban, Bot, Check, CircleDot, Clock, Mail, MessageCircle, Phone, TriangleAlert, X } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Client, Lead, LeadStatus } from '../data/types'
import { statusLabel } from '../lib/format'
import { priorityName } from '../lib/priority'

export const ic = 'i'

/** Client brand badge: colour comes from the client, never from the product theme. */
export function Brand({ client, size = 28 }: { client: Pick<Client, 'settings'>; size?: number }) {
  return (
    <span
      className="badge"
      role="img"
      aria-label={client.settings.logo}
      style={{ width: size, height: size, background: client.settings.color, fontSize: Math.max(9, Math.round(size * 0.36)), borderRadius: Math.round(size * 0.25) }}
    >
      {client.settings.logo}
    </span>
  )
}

export const brandTint = (color: string) => `color-mix(in srgb, ${color} 7%, var(--surface))`

const statusMeta: Record<LeadStatus, { cls: string; icon: ReactNode }> = {
  new: { cls: 'chip c-out', icon: <CircleDot className={ic} /> },
  contacted: { cls: 'chip', icon: <Phone className={ic} /> },
  callback: { cls: 'chip c-warn', icon: <Clock className={ic} /> },
  won: { cls: 'chip c-ok', icon: <Check className={ic} /> },
  lost: { cls: 'chip c-bad', icon: <X className={ic} /> },
}
export const StatusChip = ({ status }: { status: LeadStatus }) => (
  <span className={statusMeta[status].cls}>{statusMeta[status].icon}{statusLabel[status]}</span>
)

/** Priority: icon shape (3 bars) + word + number; only Hot gets colour. */
export function PriorityChip({ score }: { score: number }) {
  const name = priorityName(score)
  const cls = name === 'Hot' ? 'chip c-hot num' : name === 'Warm' ? 'chip num' : 'chip c-dim num'
  const lit = name === 'Hot' ? 3 : name === 'Warm' ? 2 : 1
  return (
    <span className={cls}>
      <svg className={ic} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 19v-4" /><path d="M12 19v-8" style={{ opacity: lit >= 2 ? 1 : 0.3 }} /><path d="M19 19V7" style={{ opacity: lit >= 3 ? 1 : 0.3 }} />
      </svg>
      {name} {score}
    </span>
  )
}

export function ConsentIcons({ lead }: { lead: Lead }) {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
      <span className={`ci ${lead.emailConsent ? 'ok' : 'off'}`} role="img" aria-label={lead.emailConsent ? 'Email: opted in' : 'Email: no consent'}>
        <Mail className={ic} />{!lead.emailConsent && <svg className={ic} viewBox="0 0 24 24" style={{ position: 'absolute' }}><path d="M3 3l18 18" /></svg>}
      </span>
      <span className={`ci ${lead.smsConsent ? 'ok' : 'off'}`} role="img" aria-label={lead.smsConsent ? 'WhatsApp: opted in' : 'WhatsApp: no consent'}>
        <MessageCircle className={ic} />
      </span>
      {lead.autoContacts.length > 0 && <span className="ci auto" role="img" aria-label="Automated message already sent"><Bot className={ic} /></span>}
    </span>
  )
}

export function FlagChip({ lead }: { lead: Lead }) {
  if (lead.dnc) return <span className="chip c-bad"><Ban className={ic} />Do not contact</span>
  if (!lead.reachable) return <span className="chip c-warn"><TriangleAlert className={ic} />No contact details</span>
  return null
}

type Tone = 'info' | 'warn' | 'bad' | 'ok'
export function Banner({ tone, icon, children }: { tone: Tone; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="banner" style={{ background: `var(--${tone}-soft)`, color: `var(--${tone})` }} role={tone === 'bad' ? 'alert' : undefined}>
      {icon}<div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}

export const Kbd = ({ children }: { children: ReactNode }) => <span className="kbd">{children}</span>

export function Initials({ name, size = 32 }: { name: string; size?: number }) {
  const t = name.replace(/\(.*\)/, '').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  return <span style={{ width: size, height: size, borderRadius: '50%', background: 'var(--surface-3)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 600, flex: 'none' }}>{t}</span>
}

export const PhoneIcon = ({ size = 16, rotate = false }: { size?: number; rotate?: boolean }) => (
  <Phone className={ic} style={{ width: size, height: size, transform: rotate ? 'rotate(135deg)' : undefined }} />
)
