import type { Client, Lead } from '../data/types'
import { segmentOf } from './segments'

export interface PriorityFactor {
  label: string
  points: number
  note: string
}

const HOUR = 3600_000

/** Explainable 0-100 score: who should a rep contact first. Callbacks due outrank everything. */
export function priorityOf(lead: Lead, client: Client) {
  const factors: PriorityFactor[] = []
  const add = (label: string, points: number, note: string) => factors.push({ label, points: Math.round(points), note })
  const now = Date.now()

  if (lead.status === 'won' || lead.status === 'lost' || lead.dnc || lead.holdout) return { score: 0, factors: [{ label: 'Closed / excluded', points: 0, note: 'Won, lost, do-not-contact or hold-out' }] }
  if (!lead.reachable) return { score: 0, factors: [{ label: 'No contact details', points: 0, note: 'Cannot be reached' }] }

  const value = Math.min(30, Math.log10(1 + lead.cartValue) * 10)
  add('Basket value', value, `${lead.cartValue} ${lead.currency}`)

  const seg = segmentOf(lead, client)
  if (seg === 'abandoned' && lead.checkoutAt) {
    const h = (now - new Date(lead.checkoutAt).getTime()) / HOUR
    const fresh = h <= 24 ? 30 : 30 * Math.max(0, 1 - (h - 24) / 48)
    add('Freshness', fresh, h <= 24 ? 'Abandoned within 24h: best window' : `${Math.round(h)}h since abandonment, fading`)
  } else if (seg === 'recent_buyer') {
    const d = (now - new Date(lead.lastOrderAt ?? now).getTime()) / (24 * HOUR)
    add('Freshness', d >= 3 && d <= 14 ? 20 : d < 3 ? 8 : 10, d < 3 ? 'Just ordered, wait a bit' : d <= 14 ? 'Sweet spot for an upsell' : 'Upsell window closing')
  } else if (seg === 'past_buyer') {
    add('Freshness', 6, 'Win-back: low urgency')
  }

  const loyalty = Math.min(20, lead.ordersCount * 3 + lead.ltv / 100)
  add('Customer history', loyalty, `${lead.ordersCount} orders, ${lead.ltv} ${lead.currency} LTV`)

  const consent = (lead.phone ? 5 : 0) + (lead.emailConsent || lead.smsConsent ? 5 : 0)
  add('Reachability', consent, `${lead.phone ? 'phone' : 'no phone'}${lead.emailConsent || lead.smsConsent ? ' + consent' : ''}`)

  if (lead.attempts > 0) add('Previous attempts', -Math.min(20, lead.attempts * 6), `${lead.attempts} unsuccessful attempt(s)`)

  if (lead.status === 'callback' && lead.callbackAt) {
    const due = new Date(lead.callbackAt).getTime() <= now
    add('Callback', due ? 50 : -30, due ? 'Callback is due' : 'Callback scheduled later')
  }

  const score = Math.max(0, Math.min(100, factors.reduce((s, f) => s + f.points, 0)))
  return { score: Math.round(score), factors }
}

export const priorityTone = (score: number) =>
  score >= 70 ? 'bg-red-100 text-red-700' : score >= 45 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
export const priorityName = (score: number) => (score >= 70 ? 'Hot' : score >= 45 ? 'Warm' : 'Cool')
