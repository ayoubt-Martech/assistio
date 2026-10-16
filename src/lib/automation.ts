import type { ActiveCall, Automation, Client, Lead } from '../data/types'
import { segmentOf } from './segments'

export type SkipReason = 'dnc' | 'no_contact' | 'no_consent' | 'rep_working' | 'already_sent'

export const skipLabel: Record<SkipReason, string> = {
  dnc: 'do not contact',
  no_contact: 'no contact details',
  no_consent: 'no channel consent',
  rep_working: 'rep is working the lead',
  already_sent: 'already messaged by this rule',
}

export type Eligibility =
  | { state: 'out' } // not in this rule's audience
  | { state: 'waiting' } // delay not elapsed yet
  | { state: 'skip'; reason: SkipReason }
  | { state: 'eligible' }

/** A rep owns the conversation once they called, scheduled a callback, or are on a call right now. */
export const repWorking = (lead: Lead, activeCalls: ActiveCall[]) =>
  lead.attempts > 0 || lead.status === 'contacted' || lead.status === 'callback' || activeCalls.some((c) => c.leadId === lead.id)

export function evaluate(a: Automation, lead: Lead, client: Client, activeCalls: ActiveCall[]): Eligibility {
  if (lead.clientId !== a.clientId || lead.holdout || lead.status === 'won' || lead.status === 'lost') return { state: 'out' }
  if (segmentOf(lead, client) !== a.segment) return { state: 'out' }
  if (lead.dnc) return { state: 'skip', reason: 'dnc' }
  if (!lead.reachable || (a.channel === 'email' ? !lead.email : !lead.phone)) return { state: 'skip', reason: 'no_contact' }
  if ((Date.now() - new Date(lead.lastActivityAt).getTime()) / 3600_000 < a.delayHours) return { state: 'waiting' }
  if (lead.autoContacts.some((c) => c.automationId === a.id)) return { state: 'skip', reason: 'already_sent' }
  if (repWorking(lead, activeCalls)) return { state: 'skip', reason: 'rep_working' }
  if (a.requireConsent && !(a.channel === 'email' ? lead.emailConsent : lead.smsConsent)) return { state: 'skip', reason: 'no_consent' }
  return { state: 'eligible' }
}
