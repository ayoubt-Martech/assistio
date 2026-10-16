import type { Client, Lead, User } from '../data/types'
import { priorityOf } from './priority'

export const isOpen = (l: Lead) => l.status === 'new' || l.status === 'contacted' || l.status === 'callback'
export const callbackDue = (l: Lead) => l.status === 'callback' && !!l.callbackAt && new Date(l.callbackAt) <= new Date()
/** Reps can contact: not control group, not suppressed, has a way to be reached. */
export const workable = (l: Lead) => !l.holdout && !l.dnc && l.reachable

/** Leads a dialer session may call for this user, best first (callbacks due, then priority). */
export function dialQueue(leads: Lead[], client: Client, user: User) {
  return leads
    .filter((l) => isOpen(l) && workable(l) && !!l.phone)
    .filter((l) => user.role === 'admin' || !l.assigneeId || l.assigneeId === user.id)
    .map((l) => ({ l, p: priorityOf(l, client).score }))
    .sort((a, b) => p(b) - p(a))
    .map((x) => x.l)
}
const p = (x: { l: Lead; p: number }) => x.p
