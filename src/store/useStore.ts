import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { automations, clients, conversations, interactions, leads, users } from '../data/mock'
import type { ActiveCall, Automation, AutomationRun, ChatMessage, Client, ClientSettings, Conversation, ConvStatus, Disposition, Interaction, Lead, LeadStatus, User } from '../data/types'
import { botReply, nudge, opener } from '../lib/bot'
import { evaluate } from '../lib/automation'
import { dispositionDef } from '../lib/dispositions'
import { render } from '../lib/format'

export interface Outcome {
  disposition: Disposition
  durationSec: number
  summary: string
  callbackAt?: string | null
  reason?: string
}

interface State {
  currentUserId: string | null
  theme: 'auto' | 'light' | 'dark'
  setTheme: (t: 'auto' | 'light' | 'dark') => void
  users: User[]
  clients: Client[]
  leads: Lead[]
  interactions: Interaction[]
  automations: Automation[]
  runs: AutomationRun[]
  conversations: Conversation[]
  activeCalls: ActiveCall[]
  login: (userId: string | null) => void
  updateLead: (id: string, patch: Partial<Lead>) => void
  setStatus: (id: string, status: LeadStatus) => void
  claimLead: (id: string) => void
  log: (leadId: string, type: Interaction['type'], text: string) => void
  startCall: (leadId: string) => void
  cancelCall: (leadId: string) => void
  logOutcome: (leadId: string, o: Outcome) => () => void // returns an undo function
  sendMessage: (leadId: string, channel: 'whatsapp' | 'email', text: string) => void
  applyDiscount: (leadId: string, code: string) => void
  reviewCall: (interactionId: string, rating: number, comment: string) => void
  connectClient: (name: string, domain: string) => void
  updateClientSettings: (clientId: string, patch: Partial<ClientSettings>) => void
  assignRepToClient: (clientId: string, userId: string, assigned: boolean) => void
  addAutomation: (a: Omit<Automation, 'id'>) => void
  toggleAutomation: (id: string) => void
  runAutomation: (id: string) => void
  startConversation: (leadId: string) => string | null
  customerSay: (convId: string, text: string) => void
  botRespond: (convId: string) => void
  botNudge: (convId: string) => void
  takeOver: (convId: string) => void
  repSay: (convId: string, text: string) => void
  returnToBot: (convId: string) => void
  closeConversation: (convId: string) => void
}

const uid = () => Math.random().toString(36).slice(2, 10)

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      currentUserId: null,
      theme: 'auto',
      setTheme: (theme) => set({ theme }),
      users,
      clients,
      leads,
      interactions,
      automations,
      runs: [],
      conversations,
      activeCalls: [],
      login: (userId) => set({ currentUserId: userId }),
      updateLead: (id, patch) => set((s) => ({ leads: s.leads.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
      setStatus: (id, status) => {
        get().updateLead(id, { status, ...(status === 'new' ? { callbackAt: null } : {}) })
        get().log(id, 'status', `Status changed to ${status}`)
      },
      claimLead: (id) => {
        const { leads, currentUserId } = get()
        const lead = leads.find((l) => l.id === id)
        if (!lead || lead.assigneeId || !currentUserId) return // already owned
        get().updateLead(id, { assigneeId: currentUserId, claimedAt: new Date().toISOString() })
        get().log(id, 'status', 'Lead claimed')
      },
      log: (leadId, type, text) =>
        set((s) => ({
          interactions: [{ id: uid(), leadId, type, text, at: new Date().toISOString(), userId: s.currentUserId }, ...s.interactions],
        })),
      startCall: (leadId) => {
        const { currentUserId } = get()
        if (!currentUserId) return
        get().claimLead(leadId)
        set((s) => ({
          activeCalls: [...s.activeCalls.filter((c) => c.userId !== currentUserId), { leadId, userId: currentUserId, startedAt: new Date().toISOString() }],
        }))
      },
      cancelCall: (leadId) => set((s) => ({ activeCalls: s.activeCalls.filter((c) => !(c.leadId === leadId && c.userId === s.currentUserId)) })),
      logOutcome: (leadId, o) => {
        const lead = get().leads.find((l) => l.id === leadId)
        if (!lead) return () => {}
        const def = dispositionDef(o.disposition)
        const id = uid()
        get().claimLead(leadId)
        get().updateLead(leadId, {
          status: def.status,
          attempts: lead.attempts + 1,
          lastDisposition: o.disposition,
          callbackAt: o.disposition === 'callback' ? o.callbackAt ?? null : null,
          lostReason: o.disposition === 'not_interested' ? o.reason ?? null : o.disposition === 'wrong_number' ? 'Wrong number' : o.disposition === 'dnc' ? 'Do not contact' : null,
          dnc: lead.dnc || o.disposition === 'dnc',
        })
        set((s) => ({
          activeCalls: s.activeCalls.filter((c) => !(c.leadId === leadId && c.userId === s.currentUserId)),
          interactions: [
            { id, leadId, type: 'call', text: o.summary, at: new Date().toISOString(), userId: s.currentUserId, disposition: o.disposition, durationSec: o.durationSec },
            ...s.interactions,
          ],
        }))
        return () =>
          set((s) => ({
            leads: s.leads.map((l) => (l.id === leadId ? lead : l)),
            interactions: s.interactions.filter((i) => i.id !== id),
          }))
      },
      sendMessage: (leadId, channel, text) => {
        const lead = get().leads.find((l) => l.id === leadId)
        if (!lead || lead.dnc) return
        get().claimLead(leadId)
        get().log(leadId, channel, `${channel === 'whatsapp' ? 'WhatsApp' : 'Email'} sent (simulated): ${text}`)
        if (lead.status === 'new') get().updateLead(leadId, { status: 'contacted' })
      },
      applyDiscount: (leadId, code) => {
        get().updateLead(leadId, { discountCode: code })
        get().log(leadId, 'note', `Discount code ${code} applied to this lead's recovery offer`)
      },
      reviewCall: (interactionId, rating, comment) =>
        set((s) => ({
          interactions: s.interactions.map((i) =>
            i.id === interactionId ? { ...i, review: { rating, comment, by: s.currentUserId ?? '', at: new Date().toISOString() } } : i,
          ),
        })),
      connectClient: (name, domain) => {
        const id = `c${uid()}`
        const base = clients[0].settings
        set((s) => ({
          clients: [
            ...s.clients,
            {
              id, name, shopifyDomain: domain, status: 'connected', lastSync: new Date().toISOString(), currency: 'EUR',
              scopes: ['read_orders', 'read_customers', 'read_products'], protectedDataApproved: false,
              settings: { ...base, logo: name.slice(0, 2).toUpperCase(), color: '#4f46e5', productNotes: '', snippets: [], objections: [], offers: [], chatbot: { ...base.chatbot, enabled: false, offerCodes: [] } },
            },
          ],
          users: s.users.map((u) => (u.role === 'admin' ? { ...u, clientIds: [...u.clientIds, id] } : u)),
        }))
      },
      updateClientSettings: (clientId, patch) =>
        set((s) => ({ clients: s.clients.map((c) => (c.id === clientId ? { ...c, settings: { ...c.settings, ...patch } } : c)) })),
      assignRepToClient: (clientId, userId, assigned) =>
        set((s) => ({
          users: s.users.map((u) =>
            u.id !== userId ? u : { ...u, clientIds: assigned ? [...new Set([...u.clientIds, clientId])] : u.clientIds.filter((c) => c !== clientId) },
          ),
          // a rep removed from a client releases that client's leads they owned
          leads: assigned ? s.leads : s.leads.map((l) => (l.clientId === clientId && l.assigneeId === userId ? { ...l, assigneeId: null, claimedAt: null } : l)),
        })),
      addAutomation: (a) => set((s) => ({ automations: [...s.automations, { ...a, id: uid() }] })),
      toggleAutomation: (id) =>
        set((s) => ({ automations: s.automations.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)) })),
      startConversation: (leadId) => {
        const { leads, clients, conversations } = get()
        const lead = leads.find((l) => l.id === leadId)
        const client = clients.find((c) => c.id === lead?.clientId)
        if (!lead || !client || conversations.some((c) => c.leadId === leadId && c.status !== 'closed' && c.status !== 'won')) return null
        const id = uid()
        const at = new Date().toISOString()
        const conv: Conversation = {
          id, leadId, clientId: client.id, channel: 'whatsapp', status: 'bot', handoffReason: null, followUps: 0, updatedAt: at,
          messages: [{ id: uid(), from: 'bot', text: opener(lead, client), at }],
        }
        set((s) => ({ conversations: [conv, ...s.conversations] }))
        get().log(leadId, 'auto', `[Chatbot] WhatsApp conversation started`)
        return id
      },
      customerSay: (convId, text) => {
        const t = text.trim()
        if (!t) return
        const at = new Date().toISOString()
        set((s) => ({
          conversations: s.conversations.map((c) => (c.id === convId ? { ...c, updatedAt: at, messages: [...c.messages, { id: uid(), from: 'customer' as const, text: t, at }] } : c)),
        }))
      },
      botRespond: (convId) => {
        const conv = get().conversations.find((c) => c.id === convId)
        const lead = get().leads.find((l) => l.id === conv?.leadId)
        const client = get().clients.find((c) => c.id === conv?.clientId)
        if (!conv || !lead || !client || conv.status !== 'bot') return
        const r = botReply(conv, lead, client)
        const at = new Date().toISOString()
        const msgs: ChatMessage[] = [{ id: uid(), from: 'bot', text: r.text, at, offer: r.offer }]
        let status: ConvStatus = conv.status
        let handoffReason: string | null = conv.handoffReason
        if (r.handoff) { status = 'needs_human'; handoffReason = r.handoff; msgs.push({ id: uid(), from: 'system', text: `Handed over to the team: ${r.handoff}`, at }) }
        if (r.stop) { status = 'closed'; get().updateLead(lead.id, { dnc: true, status: 'lost', lostReason: 'Do not contact' }); msgs.push({ id: uid(), from: 'system', text: 'Customer opted out. Marked do-not-contact.', at }) }
        if (r.callback) {
          const cb = new Date(); cb.setDate(cb.getDate() + 1); cb.setHours(10, 0, 0, 0)
          status = 'closed'
          get().updateLead(lead.id, { status: 'callback', callbackAt: cb.toISOString() })
          msgs.push({ id: uid(), from: 'system', text: 'Callback booked for tomorrow 10:00.', at })
        }
        if (r.won) { status = 'won'; get().updateLead(lead.id, { status: 'won' }); msgs.push({ id: uid(), from: 'system', text: 'Customer says they bought. Lead marked won.', at }) }
        if (r.offer) get().updateLead(lead.id, { discountCode: r.offer })
        set((s) => ({ conversations: s.conversations.map((c) => (c.id === convId ? { ...c, status, handoffReason, updatedAt: at, messages: [...c.messages, ...msgs] } : c)) }))
        if (r.handoff) get().log(lead.id, 'auto', `[Chatbot] Handed over: ${r.handoff}`)
        if (r.stop) get().log(lead.id, 'status', 'Customer opted out via chatbot (DNC)')
        if (r.callback) get().log(lead.id, 'status', 'Chatbot booked a callback for tomorrow 10:00')
        if (r.won) get().log(lead.id, 'status', 'Chatbot: customer says they bought')
      },
      botNudge: (convId) => {
        const conv = get().conversations.find((c) => c.id === convId)
        const lead = get().leads.find((l) => l.id === conv?.leadId)
        const client = get().clients.find((c) => c.id === conv?.clientId)
        if (!conv || !lead || !client || conv.status !== 'bot') return
        const max = client.settings.chatbot.maxFollowUps
        const at = new Date().toISOString()
        if (conv.followUps >= max) {
          set((s) => ({ conversations: s.conversations.map((c) => (c.id === convId ? { ...c, status: 'closed' as const, updatedAt: at, messages: [...c.messages, { id: uid(), from: 'system' as const, text: `No reply after ${max} follow-up${max === 1 ? '' : 's'}. Conversation closed.`, at }] } : c)) }))
          return
        }
        set((s) => ({ conversations: s.conversations.map((c) => (c.id === convId ? { ...c, followUps: c.followUps + 1, updatedAt: at, messages: [...c.messages, { id: uid(), from: 'bot' as const, text: nudge(lead, client, c.followUps), at }] } : c)) }))
      },
      takeOver: (convId) => {
        const conv = get().conversations.find((c) => c.id === convId)
        const me = get().users.find((u) => u.id === get().currentUserId)
        if (!conv || !me) return
        get().claimLead(conv.leadId)
        const at = new Date().toISOString()
        set((s) => ({ conversations: s.conversations.map((c) => (c.id === convId ? { ...c, status: 'human' as const, updatedAt: at, messages: [...c.messages, { id: uid(), from: 'system' as const, text: `${me.name.replace(/\(.*\)/, '').trim()} took over. The bot is paused.`, at }] } : c)) }))
        get().log(conv.leadId, 'status', 'Rep took over the chatbot conversation')
      },
      repSay: (convId, text) => {
        const t = text.trim()
        if (!t) return
        const at = new Date().toISOString()
        set((s) => ({ conversations: s.conversations.map((c) => (c.id === convId ? { ...c, updatedAt: at, messages: [...c.messages, { id: uid(), from: 'rep' as const, text: t, at }] } : c)) }))
      },
      returnToBot: (convId) => {
        const at = new Date().toISOString()
        set((s) => ({ conversations: s.conversations.map((c) => (c.id === convId ? { ...c, status: 'bot' as const, handoffReason: null, updatedAt: at, messages: [...c.messages, { id: uid(), from: 'system' as const, text: 'Handed back to the bot.', at }] } : c)) }))
      },
      closeConversation: (convId) => {
        const at = new Date().toISOString()
        set((s) => ({ conversations: s.conversations.map((c) => (c.id === convId ? { ...c, status: 'closed' as const, updatedAt: at, messages: [...c.messages, { id: uid(), from: 'system' as const, text: 'Conversation resolved.', at }] } : c)) }))
      },
      runAutomation: (id) => {
        const { automations, leads, clients, activeCalls } = get()
        const a = automations.find((x) => x.id === id)
        const client = clients.find((c) => c.id === a?.clientId)
        if (!a || !client) return
        const skipped: Record<string, number> = {}
        const sent: string[] = []
        for (const l of leads) {
          const e = evaluate(a, l, client, activeCalls)
          if (e.state === 'eligible') sent.push(l.id)
          else if (e.state === 'skip') skipped[e.reason] = (skipped[e.reason] ?? 0) + 1
        }
        const at = new Date().toISOString()
        set((s) => ({
          leads: s.leads.map((l) => (sent.includes(l.id) ? { ...l, autoContacts: [...l.autoContacts, { automationId: a.id, channel: a.channel, at }] } : l)),
          interactions: [
            ...sent.map((leadId) => ({
              id: uid(), leadId, type: 'auto' as const, at, userId: null,
              text: `[${a.name}] ${a.channel} sent: ${render(a.template, s.leads.find((l) => l.id === leadId)!, client)}`,
            })),
            ...s.interactions,
          ],
          runs: [{ id: uid(), automationId: id, at, sent: sent.length, skipped }, ...s.runs],
        }))
      },
    }),
    { name: 'assistio-proto-v4' },
  ),
)

export const useCurrentUser = () => {
  const { users, currentUserId } = useStore()
  return users.find((u) => u.id === currentUserId) ?? null
}

/** Clients the current user may access. */
export const useVisibleClients = () => {
  const user = useCurrentUser()
  const clients = useStore((s) => s.clients)
  return user ? clients.filter((c) => user.role === 'admin' || user.clientIds.includes(c.id)) : []
}
