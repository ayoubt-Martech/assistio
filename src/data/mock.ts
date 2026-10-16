import { summarizeCall } from '../lib/ai'
import { dispositionDef, lostReasons } from '../lib/dispositions'
import type { Automation, ChatMessage, Client, Conversation, Disposition, Interaction, Lead, Segment, ShopOrder, StopPoint, User } from './types'

// Deterministic PRNG so demos are stable
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}
const rand = rng(42)
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)]
const NOW = Date.now()
const ago = (hours: number) => new Date(NOW - hours * 3600_000).toISOString()
const ahead = (hours: number) => new Date(NOW + hours * 3600_000).toISOString()

const scopes = ['read_orders', 'read_customers', 'read_products']

export const clients: Client[] = [
  {
    id: 'c1', name: 'Nordic Threads', shopifyDomain: 'nordic-threads.myshopify.com', status: 'connected',
    lastSync: ago(0.2), currency: 'EUR', scopes: [...scopes, 'read_all_orders'], protectedDataApproved: true,
    settings: {
      chatbot: { enabled: true, name: 'Elin', tone: 'friendly', maxFollowUps: 2, handoffAbove: 150, offerCodes: ['FREESHIP'] },
      color: '#0f766e', logo: 'NT', recentBuyerDays: 30, abandonedAfterHours: 1,
      productNotes: 'Premium Scandinavian knitwear. Free returns 30 days. Ships from Stockholm in 2-4 days.',
      scripts: {
        finish_sale: "Hi {{first_name}}, this is {{agent}} from {{store}}. I noticed your {{cart_items}} is still waiting in your basket{{reason}}. Can I help you wrap it up? Returns are free for 30 days.",
        upsell: 'Hi {{first_name}}, thanks for your order at {{store}}! Our scarves pair beautifully with knitwear — would you like to hear about the new collection?',
        reactivate: "Hi {{first_name}}, it's been a while since your last order at {{store}}. Our winter collection just landed — can I tell you about it?",
      },
      snippets: [
        { id: 's1', title: 'Recovery link', text: 'Hi {{first_name}}, here is your basket at {{store}}, ready to check out: {{recovery_link}}' },
        { id: 's2', title: 'Discount follow-up', text: 'Hi {{first_name}}, as discussed, use code {{discount_code}} at checkout: {{recovery_link}}' },
        { id: 's3', title: 'Sizing help', text: 'Our knitwear fits true to size; if in between, size up. Free returns within 30 days.' },
      ],
      objections: [
        { id: 'o1', q: "It's too expensive", a: 'Each piece is made to last years, and returns are free for 30 days. Offer the free-shipping code if the cart is above 100.' },
        { id: 'o2', q: 'Delivery takes too long', a: 'We ship from Stockholm in 2-4 working days; express is available at checkout.' },
        { id: 'o3', q: "I'm not sure about the size", a: 'Share the size guide link and remind them returns are free.' },
      ],
      offers: [
        { code: 'FREESHIP', label: 'Free shipping', repAllowed: true },
        { code: 'WELCOME10', label: '10% off', repAllowed: true },
        { code: 'VIP20', label: '20% off (manager approval)', repAllowed: false },
      ],
    },
  },
  {
    id: 'c2', name: 'Glow Cosmetics', shopifyDomain: 'glow-cosmetics.myshopify.com', status: 'connected',
    lastSync: ago(1), currency: 'USD', scopes, protectedDataApproved: true,
    settings: {
      chatbot: { enabled: true, name: 'Zoe', tone: 'concise', maxFollowUps: 1, handoffAbove: 100, offerCodes: ['GLOW10'] },
      color: '#be185d', logo: 'GC', recentBuyerDays: 14, abandonedAfterHours: 2,
      productNotes: 'Vegan skincare. Routine advice is a selling point; 60-day satisfaction guarantee.',
      scripts: {
        finish_sale: "Hello {{first_name}}, {{agent}} from {{store}}. You were about to order {{cart_items}}{{reason}}. I can answer any skin questions and there's a 60-day satisfaction guarantee.",
        upsell: 'Hi {{first_name}}! Hope you love your {{store}} order. Most customers add a night cream to complete the routine — interested?',
        reactivate: "Hi {{first_name}}, {{agent}} from {{store}}. Time to restock? We've got a returning-customer offer for you.",
      },
      snippets: [
        { id: 's1', title: 'Recovery link', text: 'Hi {{first_name}}, your {{store}} basket is saved: {{recovery_link}}' },
        { id: 's2', title: 'Routine tip', text: 'Tip: vitamin C in the morning, night cream in the evening. Happy to build a routine for you!' },
        { id: 's3', title: 'Guarantee', text: 'Every order is covered by our 60-day satisfaction guarantee.' },
      ],
      objections: [
        { id: 'o1', q: "I'm not sure it suits my skin", a: 'All products are vegan and dermatologically tested; the 60-day guarantee means no risk.' },
        { id: 'o2', q: 'I can find it cheaper elsewhere', a: 'We only sell through our own store, so no knock-offs. Offer the 10% code if the cart is above 50.' },
      ],
      offers: [
        { code: 'GLOW10', label: '10% off', repAllowed: true },
        { code: 'GLOW15', label: '15% off (manager approval)', repAllowed: false },
      ],
    },
  },
  {
    id: 'c3', name: 'PeakGear Outdoors', shopifyDomain: 'peakgear.myshopify.com', status: 'error',
    lastSync: ago(30), currency: 'GBP', scopes: ['read_orders'], protectedDataApproved: false,
    settings: {
      chatbot: { enabled: false, name: 'Ridge', tone: 'friendly', maxFollowUps: 2, handoffAbove: 250, offerCodes: ['TRAIL10'] },
      color: '#b45309', logo: 'PG', recentBuyerDays: 30, abandonedAfterHours: 1,
      productNotes: 'Technical hiking gear. Customers often ask about sizing and delivery times to the Alps.',
      scripts: {
        finish_sale: "Hi {{first_name}}, {{agent}} from {{store}}. I saw you were looking at {{cart_items}}{{reason}}. Happy to help with sizing or delivery questions!",
        upsell: 'Hi {{first_name}}, thanks for choosing {{store}}! Do you have everything for the trail? A headlamp and socks are popular add-ons.',
        reactivate: 'Hi {{first_name}}, {{agent}} from {{store}}. Ready for your next adventure? We have new arrivals I think you will like.',
      },
      snippets: [
        { id: 's1', title: 'Recovery link', text: 'Hi {{first_name}}, pick up where you left off at {{store}}: {{recovery_link}}' },
        { id: 's2', title: 'Sizing', text: 'Boots run half a size small; we recommend sizing up for thick socks.' },
      ],
      objections: [
        { id: 'o1', q: 'Will it arrive before my trip?', a: 'UK standard delivery is 2-3 days; express is next-day if ordered before 2pm.' },
        { id: 'o2', q: "It's a lot of money for a backpack", a: 'Lifetime repair warranty. Mention the 5-year durability testing.' },
      ],
      offers: [
        { code: 'TRAIL10', label: '10% off', repAllowed: true },
        { code: 'FREEDEL', label: 'Free express delivery', repAllowed: false },
      ],
    },
  },
]

export const users: User[] = [
  { id: 'u1', name: 'Amira (Admin)', role: 'admin', clientIds: ['c1', 'c2', 'c3'] },
  { id: 'u2', name: 'Lucas (Rep)', role: 'rep', clientIds: ['c1', 'c2'] },
  { id: 'u3', name: 'Sofia (Rep)', role: 'rep', clientIds: ['c2', 'c3'] },
]

const catalog: Record<string, { title: string; price: number }[]> = {
  c1: [{ title: 'Wool Sweater', price: 89 }, { title: 'Linen Shirt', price: 59 }, { title: 'Scarf', price: 29 }],
  c2: [{ title: 'Vitamin C Serum', price: 42 }, { title: 'Night Cream', price: 55 }, { title: 'Lip Balm', price: 9 }],
  c3: [{ title: 'Trail Backpack 40L', price: 129 }, { title: 'Hiking Boots', price: 160 }, { title: 'Headlamp', price: 35 }],
}
const first = ['Emma', 'Noah', 'Liam', 'Olivia', 'Mia', 'Yassine', 'Chloé', 'Hugo', 'Ines', 'Karim', 'Anna', 'Leo', 'Sara', 'Tom', 'Nadia']
const last = ['Martin', 'Dubois', 'Smith', 'Garcia', 'Haddad', 'Muller', 'Rossi', 'Khan', 'Lopez', 'Bernard']
const countries = ['FR', 'DE', 'US', 'UK', 'ES', 'MA']
// Shopify gives no abandonment reason: these are inferred from the checkout step / payment errors.
const inferredReasons: Record<StopPoint, (string | null)[]> = {
  cart: [null],
  shipping: ['Shipping cost too high', 'Delivery time too long', null],
  payment: ['Payment failed', 'Card declined', null],
  none: [null],
}
const reviewComments = ['Good empathy, clear next step.', 'Missed the chance to offer the code.', 'Great objection handling.', 'Script followed well.', 'Too fast at the start, slow down.']

export const interactions: Interaction[] = []
let iid = 0
const addInteraction = (i: Omit<Interaction, 'id'>) => interactions.push({ id: `i${++iid}`, ...i })

export const leads: Lead[] = Array.from({ length: 120 }, (_, i) => {
  const clientId = pick(['c1', 'c2', 'c3'])
  const client = clients.find((c) => c.id === clientId)!
  const roll = rand()
  const segment: Segment = roll < 0.4 ? 'abandoned' : roll < 0.65 ? 'recent_buyer' : 'past_buyer'
  const items = Array.from({ length: 1 + Math.floor(rand() * 2) }, () => {
    const p = pick(catalog[clientId])
    return { title: p.title, price: p.price, qty: 1 + Math.floor(rand() * 2) }
  })
  const cartValue = items.reduce((s, it) => s + it.price * it.qty, 0)
  const stopPoint: StopPoint = segment === 'abandoned' ? pick(['cart', 'shipping', 'payment']) : 'none'
  const name = `${pick(first)} ${pick(last)}`
  const reachable = segment !== 'abandoned' || rand() > 0.1
  const abandonedHours = client.settings.abandonedAfterHours + rand() * 72
  const orderHours = segment === 'recent_buyer' ? 24 + rand() * 24 * 44 : 24 * 46 + rand() * 24 * 350
  const ordersCount = segment === 'abandoned' ? Math.floor(rand() * 3) : 1 + Math.floor(rand() * 5)
  const eligible = users.filter((u) => u.role === 'rep' && u.clientIds.includes(clientId))

  // Order history (newest first)
  const orders: ShopOrder[] = Array.from({ length: ordersCount }, (_, k) => {
    const hours = (segment === 'abandoned' ? 24 * 100 + rand() * 24 * 200 : orderHours) + k * 24 * (20 + rand() * 90)
    if (k === 0 && segment !== 'abandoned') {
      return { id: `#${1000 + Math.floor(rand() * 8999)}`, date: ago(hours), total: cartValue, status: hours < 24 * 10 ? 'Paid' : 'Fulfilled', items: items.map((it) => `${it.qty}× ${it.title}`).join(', ') }
    }
    const it = pick(catalog[clientId])
    const qty = 1 + Math.floor(rand() * 2)
    return { id: `#${1000 + Math.floor(rand() * 8999)}`, date: ago(hours), total: it.price * qty, status: rand() < 0.06 ? 'Refunded' : 'Fulfilled', items: `${qty}× ${it.title}` }
  })

  const holdout = reachable && rand() < 0.1
  const owner = !holdout && rand() < 0.6 ? pick(eligible) : null
  const lead: Lead = {
    id: `l${i + 1}`,
    clientId,
    shopifyCustomerId: `gid://shopify/Customer/${7000000 + i}`,
    name,
    email: reachable ? `${name.toLowerCase().replace(/[^a-z]/g, '.')}@example.com` : '',
    phone: reachable ? `+33 6 ${String(10 + Math.floor(rand() * 89))} ${String(10 + Math.floor(rand() * 89))} ${String(10 + Math.floor(rand() * 89))} ${String(10 + Math.floor(rand() * 89))}` : '',
    country: pick(countries),
    ordersCount,
    ltv: Math.round(orders.reduce((s, o) => s + o.total, 0)),
    currency: client.currency,
    orders,
    cart: items,
    cartValue,
    checkoutAt: segment === 'abandoned' ? ago(abandonedHours) : null,
    checkoutUrl: segment === 'abandoned' ? `https://${client.shopifyDomain}/checkouts/c/${Math.floor(rand() * 1e9).toString(36)}/recover` : null,
    stopPoint,
    stopReason: pick(inferredReasons[stopPoint]),
    reasonSource: 'inferred',
    lastOrderAt: orders[0]?.date ?? null,
    lastActivityAt: segment === 'abandoned' ? ago(abandonedHours) : ago(orderHours),
    status: 'new',
    assigneeId: owner?.id ?? null,
    claimedAt: owner ? ago(rand() * 48) : null,
    attempts: 0,
    lastDisposition: null,
    callbackAt: null,
    lostReason: null,
    dnc: false,
    discountCode: null,
    holdout,
    autoContacts: [],
    reachable,
    emailConsent: reachable && rand() < 0.7,
    smsConsent: reachable && rand() < 0.5,
    notes: '',
  }

  // Control group: some convert on their own, without any contact
  if (holdout && rand() < 0.08) lead.status = 'won'

  // Seed ~40% of normal leads with past call history so reports have data
  if (!holdout && reachable && rand() < 0.4) {
    const rep = owner ?? pick(eligible)
    lead.assigneeId = rep.id
    lead.claimedAt = ago(24 * 14)
    const attempts = 1 + Math.floor(rand() * 3)
    const r = rand()
    const final: Disposition =
      r < 0.22 ? 'won' : r < 0.37 ? 'callback' : r < 0.57 ? 'not_interested' : r < 0.6 ? 'dnc' : r < 0.65 ? 'wrong_number' : rand() < 0.5 ? 'no_answer' : 'voicemail'
    const lastAgo = rand() * 24 * 14
    for (let k = 0; k < attempts; k++) {
      const isLast = k === attempts - 1
      const disposition: Disposition = isLast ? final : rand() < 0.5 ? 'no_answer' : 'voicemail'
      const def = dispositionDef(disposition)
      const durationSec = disposition === 'no_answer' ? 22 : disposition === 'voicemail' ? 35 : disposition === 'won' ? 180 + Math.floor(rand() * 400) : 60 + Math.floor(rand() * 300)
      const callbackAt = disposition === 'callback' ? (rand() < 0.6 ? ago(rand() * 20) : ahead(2 + rand() * 46)) : null
      const reason = disposition === 'not_interested' ? pick(lostReasons) : undefined
      const text = summarizeCall(lead, client, { disposition, durationSec, note: '', reason, callbackAt })
      addInteraction({
        leadId: lead.id, type: 'call', text, at: ago(lastAgo + (attempts - 1 - k) * (6 + rand() * 24)), userId: rep.id, disposition, durationSec,
        review: def.connected && rand() < 0.35 ? { rating: 3 + Math.floor(rand() * 3), comment: pick(reviewComments), by: 'u1', at: ago(rand() * 24 * 5) } : undefined,
      })
      if (isLast) {
        lead.status = def.status
        lead.lastDisposition = disposition
        lead.callbackAt = callbackAt
        lead.lostReason = reason ?? (disposition === 'wrong_number' ? 'Wrong number' : disposition === 'dnc' ? 'Do not contact' : null)
        lead.dnc = disposition === 'dnc'
      }
    }
    lead.attempts = attempts
  } else if (!holdout && segment === 'abandoned' && clientId === 'c1' && lead.smsConsent && lead.phone && rand() < 0.4) {
    // Already messaged by the abandoned-cart automation (a1)
    const at = ago(0.3 + rand() * 3)
    lead.autoContacts.push({ automationId: 'a1', channel: 'whatsapp', at })
    addInteraction({ leadId: lead.id, type: 'auto', text: `[Abandoned cart – WhatsApp nudge] whatsapp sent`, at, userId: null })
  }
  return lead
})
interactions.sort((a, b) => +new Date(b.at) - +new Date(a.at))

export const automations: Automation[] = [
  {
    id: 'a1', clientId: 'c1', name: 'Abandoned cart – WhatsApp nudge', segment: 'abandoned', delayHours: 1, channel: 'whatsapp',
    template: 'Hi {{first_name}}, you left {{cart_items}} in your cart at {{store}}. Need help finishing your order?',
    requireConsent: true, enabled: true,
  },
  {
    id: 'a2', clientId: 'c2', name: 'Win-back – email', segment: 'past_buyer', delayHours: 24 * 90, channel: 'email',
    template: 'We miss you, {{first_name}}! Here is 10% off your next order at {{store}}.',
    requireConsent: true, enabled: false,
  },
]

// Seed conversations from real leads so the Conversations tab opens with something to look at.
const t = (hoursAgo: number, from: ChatMessage['from'], text: string, offer?: string): ChatMessage => ({ id: `m${Math.random().toString(36).slice(2, 8)}`, from, text, at: ago(hoursAgo), offer })
const eligibleFor = (clientId: string) =>
  leads.filter((l) => l.clientId === clientId && l.checkoutUrl && l.smsConsent && !!l.phone && !l.dnc && !l.holdout && l.status === 'new')
export const conversations: Conversation[] = []
{
  const [a, b, c] = eligibleFor('c1')
  const [d] = eligibleFor('c2')
  const make = (l: (typeof leads)[number] | undefined, status: Conversation['status'], reason: string | null, messages: ChatMessage[]) => {
    if (!l) return
    conversations.push({ id: `cv${conversations.length + 1}`, leadId: l.id, clientId: l.clientId, channel: 'whatsapp', status, handoffReason: reason, followUps: 0, updatedAt: messages[messages.length - 1].at, messages })
  }
  make(a, 'needs_human', 'Customer asked for a human', [
    t(5, 'bot', `Hi ${a?.name.split(' ')[0]}! 👋 Elin here from Nordic Threads. I saw ${a?.cart.map((x) => x.title).join(', ')} is still in your basket. Anything I can help with?`),
    t(4.5, 'customer', 'Hi, is delivery to Germany really 2-4 days?'),
    t(4.5, 'bot', 'We ship from Stockholm in 2-4 working days; express is available at checkout.'),
    t(4.2, 'customer', 'ok can someone call me about a bulk order?'),
    t(4.2, 'bot', 'Of course. I am passing you to a member of the team who will reply here shortly.'),
    t(4.2, 'system', 'Handed over to the team: Customer asked for a human'),
  ])
  make(b, 'bot', null, [
    t(1.2, 'bot', `Hi ${b?.name.split(' ')[0]}! 👋 Elin here from Nordic Threads. I saw ${b?.cart.map((x) => x.title).join(', ')} is still in your basket. Anything I can help with?`),
    t(0.9, 'customer', 'a bit too expensive for me'),
    t(0.9, 'bot', 'I understand. I can apply Free shipping to your basket: use code FREESHIP at checkout.', 'FREESHIP'),
  ])
  make(c, 'bot', null, [
    t(30, 'bot', `Hi ${c?.name.split(' ')[0]}! 👋 Elin here from Nordic Threads. I saw ${c?.cart.map((x) => x.title).join(', ')} is still in your basket. Anything I can help with?`),
  ])
  make(d, 'won', null, [
    t(20, 'bot', `Hi ${d?.name.split(' ')[0]}, Zoe from Glow Cosmetics. Your ${d?.cart.map((x) => x.title).join(', ')} is still in your basket. Questions?`),
    t(19, 'customer', 'send me the link'),
    t(19, 'bot', `Here is your basket, ready to check out: ${d?.checkoutUrl}`),
    t(2, 'customer', 'done, just ordered thanks'),
    t(2, 'bot', 'That is great news, thank you! Your order is on its way. Reply here if you need anything.'),
    t(2, 'system', 'Customer says they bought. Lead marked won.'),
  ])
  if (d) d.status = 'won'
  if (a) { a.autoContacts.push({ automationId: 'chatbot', channel: 'whatsapp', at: ago(5) }) }
}
