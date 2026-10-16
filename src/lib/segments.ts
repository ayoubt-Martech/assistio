import type { Client, Lead, RecommendedAction, Segment } from '../data/types'

const HOUR = 3600_000

/** Derive the segment from Shopify-like facts + the client's thresholds. null = not actionable yet. */
export function segmentOf(lead: Lead, client: Client): Segment | null {
  const { abandonedAfterHours, recentBuyerDays } = client.settings
  const checkout = lead.checkoutAt ? new Date(lead.checkoutAt).getTime() : null
  const order = lead.lastOrderAt ? new Date(lead.lastOrderAt).getTime() : null
  if (checkout && (!order || order < checkout)) {
    return Date.now() - checkout >= abandonedAfterHours * HOUR ? 'abandoned' : null
  }
  if (order) return Date.now() - order <= recentBuyerDays * 24 * HOUR ? 'recent_buyer' : 'past_buyer'
  return null
}

export const actionFor: Record<Segment, RecommendedAction> = {
  abandoned: 'finish_sale',
  recent_buyer: 'upsell',
  past_buyer: 'reactivate',
}
