// SIMULATED CHATBOT: keyword rules standing in for an LLM. In the real product the model gets the
// thread, the lead's Shopify data and the client's knowledge (notes, objections, offers) as context,
// and must stay inside the client's allowed offers and handoff rules.
import type { Client, Conversation, Lead } from '../data/types'
import { money, render } from './format'

export interface BotReply {
  text: string
  offer?: string
  handoff?: string // reason, when a human must take over
  stop?: boolean // customer asked to stop: mark do-not-contact
  callback?: boolean // customer asked to be called later
  won?: boolean // customer says they bought
}

const has = (t: string, words: string[]) => words.some((w) => t.includes(w))
const words = (t: string) => new Set(t.toLowerCase().match(/[a-zà-ÿ]{4,}/g) ?? [])

export function canStartBot(lead: Lead, client: Client): string | null {
  if (!client.settings.chatbot.enabled) return 'Chatbot is switched off for this client.'
  if (lead.dnc) return 'Customer is on the do-not-contact list.'
  if (!lead.phone) return 'No phone number on file.'
  if (!lead.smsConsent) return 'No WhatsApp opt-in.'
  if (lead.holdout) return 'Customer is in the hold-out group.'
  return null
}

export function opener(lead: Lead, client: Client) {
  const { name, tone } = client.settings.chatbot
  const first = lead.name.split(' ')[0]
  const items = lead.cart.map((c) => c.title).join(', ') || 'your items'
  if (tone === 'concise') return `Hi ${first}, ${name} from ${client.name}. Your ${items} is still in your basket. Questions?`
  if (tone === 'premium') return `Good day ${first}. This is ${name} at ${client.name}. We have kept ${items} reserved for you. May I help you complete your order?`
  return `Hi ${first}! 👋 ${name} here from ${client.name}. I saw ${items} is still in your basket. Anything I can help with?`
}

export function nudge(lead: Lead, client: Client, n: number) {
  const first = lead.name.split(' ')[0]
  return n === 0
    ? `Hi ${first}, just checking in. Still thinking about ${lead.cart[0]?.title ?? 'your order'}? Happy to answer any question.`
    : `Last note from me, ${first}: your basket at ${client.name} is saved for a bit longer. Reply anytime and I will help.`
}

export function botReply(conv: Conversation, lead: Lead, client: Client): BotReply {
  const cfg = client.settings.chatbot
  const last = [...conv.messages].reverse().find((m) => m.from === 'customer')
  const t = (last?.text ?? '').toLowerCase()
  const link = lead.checkoutUrl ?? ''
  const offerSent = conv.messages.some((m) => m.offer)
  const offer = client.settings.offers.find((o) => cfg.offerCodes.includes(o.code))
  const highValue = cfg.handoffAbove > 0 && lead.cartValue >= cfg.handoffAbove

  if (has(t, ['stop', 'unsubscribe', 'leave me alone', 'do not contact', "don't contact"]))
    return { text: 'Understood, I will not message you again. Sorry to have bothered you.', stop: true }

  if (has(t, ['human', 'person', 'agent', 'someone', 'call me', 'phone me', 'speak to']))
    return { text: 'Of course. I am passing you to a member of the team who will reply here shortly.', handoff: 'Customer asked for a human' }

  if (has(t, ['refund', 'complain', 'terrible', 'angry', 'scam', 'lawyer', 'broken', 'damaged', 'never arrived']))
    return { text: 'I am sorry about that. I am bringing in a team member now so we can sort it out properly.', handoff: 'Complaint or sensitive topic' }

  if (has(t, ['tomorrow', 'later', 'next week', 'not now', 'busy']))
    return { text: `No problem, ${lead.name.split(' ')[0]}. I will have someone call you back tomorrow so you can pick this up easily.`, callback: true }

  if (has(t, ['bought', 'ordered', 'paid', 'completed', 'done it']))
    return { text: 'That is great news, thank you! Your order is on its way. Reply here if you need anything.', won: true }

  if (has(t, ['link', 'buy', 'checkout', 'yes', 'ok', 'okay', 'sure', 'ready', 'send it'])) {
    if (highValue) return { text: `Great! ${money(lead.cartValue, lead.currency)} is a bigger order, so I will have a team member help you finish it personally.`, handoff: `High-value cart (${money(lead.cartValue, lead.currency)}) with buying intent` }
    return { text: `Here is your basket, ready to check out: ${link || '(no recovery link on file)'}`, offer: undefined }
  }

  if (has(t, ['expensive', 'price', 'cheap', 'discount', 'code', 'coupon', 'cost', 'too much'])) {
    if (offer && !offerSent) return { text: `I understand. I can apply ${offer.label} to your basket: use code ${offer.code} at checkout. ${link}`, offer: offer.code }
    return { text: 'I understand price matters. Every piece is made to last, and I cannot go lower than what I have offered, but I can answer any question about the product.', handoff: offerSent ? undefined : undefined }
  }

  if (has(t, ['ship', 'deliver', 'arrive', 'how long', 'when will'])) {
    const note = client.settings.productNotes
    const m = note.match(/[^.]*(ship|deliver)[^.]*\./i)
    const ans = client.settings.objections.find((o) => /deliver|ship/i.test(o.q))
    return { text: ans ? ans.a : m ? m[0].trim() : 'Delivery times depend on your address and are shown at checkout.' }
  }

  if (has(t, ['return', 'exchange', 'warranty', 'guarantee'])) {
    const m = client.settings.productNotes.match(/[^.]*(return|guarantee|warranty)[^.]*\./i)
    const s = client.settings.snippets.find((x) => /return|guarantee|warranty/i.test(x.text))
    return { text: s ? render(s.text, lead, client) : m ? m[0].trim() : 'You can return items within the period shown in our policy.' }
  }

  if (has(t, ['size', 'fit', 'skin', 'material'])) {
    const s = client.settings.snippets.find((x) => /size|fits|skin/i.test(x.text))
    const o = client.settings.objections.find((x) => /size|skin/i.test(x.q))
    if (s || o) return { text: s ? render(s.text, lead, client) : o!.a }
  }

  // Best-matching objection from the client's cheat sheet
  const tw = words(t)
  let best: { a: string; score: number } | null = null
  for (const o of client.settings.objections) {
    const score = [...words(o.q)].filter((w) => tw.has(w)).length
    if (score > (best?.score ?? 0)) best = { a: o.a, score }
  }
  if (best && best.score >= 1) return { text: best.a }

  if (has(t, ['hi', 'hello', 'hey', 'hola', 'bonjour']))
    return { text: `Hi ${lead.name.split(' ')[0]}! Do you have a question about your basket, or would you like the link to finish your order?` }

  return { text: 'Good question. Let me bring in a team member who can answer that properly.', handoff: 'Bot not confident in an answer' }
}
