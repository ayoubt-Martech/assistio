import type { Client, Lead, LeadStatus, RecommendedAction, Segment } from '../data/types'

export const money = (n: number, currency = 'EUR') =>
  new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)

export function timeAgo(iso: string) {
  const h = (Date.now() - new Date(iso).getTime()) / 3600_000
  if (h < 0) return untilLabel(iso)
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}m ago`
  if (h < 48) return `${Math.round(h)}h ago`
  if (h < 24 * 60) return `${Math.round(h / 24)}d ago`
  return `${Math.round(h / 24 / 30)}mo ago`
}

export function untilLabel(iso: string) {
  const h = (new Date(iso).getTime() - Date.now()) / 3600_000
  if (h <= 0) return 'now'
  if (h < 1) return `in ${Math.max(1, Math.round(h * 60))}m`
  if (h < 48) return `in ${Math.round(h)}h`
  return `in ${Math.round(h / 24)}d`
}

export const duration = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`

export const segmentLabel: Record<Segment, string> = {
  abandoned: 'Abandoned carts',
  recent_buyer: 'Recent buyers',
  past_buyer: 'Past buyers',
}
export const actionLabel: Record<RecommendedAction, string> = {
  finish_sale: 'Finish sale',
  upsell: 'Upsell',
  reactivate: 'Reactivate',
}
export const statusLabel: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  callback: 'Callback',
  won: 'Won',
  lost: 'Lost',
}
export const statusColor: Record<LeadStatus, string> = {
  new: 'bg-slate-100 text-slate-700',
  contacted: 'bg-blue-100 text-blue-700',
  callback: 'bg-amber-100 text-amber-800',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
}

export const reasonOptions = [
  'Shipping cost too high',
  'Delivery time too long',
  'Payment failed',
  'Card declined',
  'Comparing prices',
  'Just browsing',
  'Needs more information',
]

/** Fill {{variables}} in a client script/template/snippet. */
export function render(tpl: string, lead: Lead, client: Client, agent = 'your advisor') {
  const vars: Record<string, string> = {
    first_name: lead.name.split(' ')[0],
    store: client.name,
    agent,
    cart_items: lead.cart.map((c) => c.title).join(', ') || 'your items',
    reason: lead.stopReason ? ` (${lead.stopReason.toLowerCase()})` : '',
    recovery_link: lead.checkoutUrl ?? '(no recovery link)',
    discount_code: lead.discountCode ?? '(no code applied)',
  }
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`)
}

/** Like render(), but returns parts so variable values can be highlighted in the UI. */
export function renderParts(tpl: string, lead: Lead, client: Client, agent = 'your advisor') {
  const filled = render(tpl.replace(/\{\{(\w+)\}\}/g, '\u0001{{$1}}\u0002'), lead, client, agent)
  return filled.split(/(\u0001.*?\u0002)/).filter(Boolean).map((t) => (t.startsWith('\u0001') ? { t: t.slice(1, -1), v: true } : { t, v: false }))
}
