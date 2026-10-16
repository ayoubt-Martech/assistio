// SIMULATED AI: deterministic, rule-based stand-ins. In the real product these call an LLM
// (script tailoring, call summaries) with the lead's Shopify data and call notes as context.
import type { Client, Disposition, Lead } from '../data/types'
import { dispositionDef } from './dispositions'
import { money, render } from './format'
import { actionFor, segmentOf } from './segments'

export function tailorScript(lead: Lead, client: Client, agent: string) {
  const seg = segmentOf(lead, client) ?? 'abandoned'
  const base = render(client.settings.scripts[actionFor[seg]], lead, client, agent)
  const extra: string[] = []
  const why: string[] = []
  const reason = lead.stopReason?.toLowerCase() ?? ''
  const offer = client.settings.offers.find((o) => o.repAllowed)

  if (reason.includes('shipping') || reason.includes('delivery')) {
    extra.push('I understand shipping was a concern — let me see what I can do on that.')
    if (offer) extra.push(`I can apply "${offer.label}" to your order today.`)
    why.push('Customer stopped at shipping: address the cost/delay objection first')
  }
  if (reason.includes('payment') || reason.includes('card')) {
    extra.push('It looks like the payment did not go through — I can send you a secure link so you can retry with another method.')
    why.push('Payment failed at checkout: offer a retry link or alternative method')
  }
  if (lead.ordersCount >= 3) {
    extra.unshift(`Thank you for being such a loyal customer — ${lead.ordersCount} orders with us!`)
    why.push(`Loyal customer (${lead.ordersCount} orders, ${money(lead.ltv, lead.currency)}): open with thanks`)
  }
  if (seg === 'recent_buyer') {
    extra.unshift('First, did your order arrive and is everything as expected?')
    why.push('Recent buyer: check satisfaction before pitching an add-on')
  }
  if (seg === 'past_buyer' && lead.lastOrderAt) {
    const months = Math.round((Date.now() - new Date(lead.lastOrderAt).getTime()) / (30 * 24 * 3600_000))
    extra.push(`It has been about ${months} months since your last order — how did you find it?`)
    why.push(`Lapsed ${months} months: ask about the past experience, then mention what is new`)
  }
  const auto = lead.autoContacts.at(-1)
  if (auto) {
    extra.unshift(`You may have received a ${auto.channel} message from us earlier —`)
    why.push(`Automated ${auto.channel} already sent: reference it, do not repeat it`)
  }
  if (lead.emailConsent && !lead.smsConsent) why.push('Only email consent: confirm by email after the call, not WhatsApp')
  if (why.length === 0) why.push('No special signals: standard script')
  return { script: [base, ...extra].join(' '), rationale: why }
}

const nextStep: Record<Disposition, string> = {
  no_answer: 'Retry at a different time of day.',
  voicemail: 'Follow up with a message; retry in 24h.',
  wrong_number: 'Contact details invalid; lead closed.',
  callback: 'Call back at the agreed time.',
  not_interested: 'Lead closed; no further contact.',
  won: 'Sale completed; no further action.',
  dnc: 'Customer asked not to be contacted; suppressed everywhere.',
}

export function summarizeCall(lead: Lead, client: Client, p: { disposition: Disposition; durationSec: number; note: string; reason?: string; callbackAt?: string | null }) {
  const seg = segmentOf(lead, client)
  const topic =
    seg === 'abandoned' ? `abandoned cart (${lead.cart.map((c) => c.title).join(', ')}, ${money(lead.cartValue, lead.currency)})`
    : seg === 'recent_buyer' ? 'upsell after a recent order'
    : 'win-back after a lapse'
  const parts = [`Called ${lead.name} about ${topic}.`, `Outcome: ${dispositionDef(p.disposition).label}.`]
  if (p.disposition === 'callback' && p.callbackAt) parts.push(`Callback set for ${new Date(p.callbackAt).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })}.`)
  if (p.reason) parts.push(`Reason: ${p.reason}.`)
  if (p.note.trim()) parts.push(`Notes: ${p.note.trim()}`)
  parts.push(`Next: ${nextStep[p.disposition]}`)
  return parts.join(' ')
}
