import { Bot, Clock, Hand, MessageCircle, Send, Undo2, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Client, ConvStatus } from '../data/types'
import { canStartBot } from '../lib/bot'
import { money, timeAgo } from '../lib/format'
import { segmentOf } from '../lib/segments'
import { useCurrentUser, useStore } from '../store/useStore'
import LeadFile from './LeadFile'
import { Banner, ic } from './ui'

type Filter = 'needs' | 'bot' | 'done'
const group = (s: ConvStatus): Filter => (s === 'needs_human' || s === 'human' ? 'needs' : s === 'bot' ? 'bot' : 'done')
const statusChip: Record<ConvStatus, { label: string; cls: string }> = {
  bot: { label: 'Bot replying', cls: 'c-info' },
  needs_human: { label: 'Needs a rep', cls: 'c-bad' },
  human: { label: 'Rep on it', cls: 'c-accent' },
  won: { label: 'Won', cls: 'c-ok' },
  closed: { label: 'Closed', cls: 'c-out' },
}
const quick = ['Is shipping free?', 'A bit too expensive', 'What is your returns policy?', 'Send me the link', 'Can someone call me?', 'Call me tomorrow', 'I already bought it', 'STOP']

export default function Conversations({ client }: { client: Client }) {
  const me = useCurrentUser()!
  const { conversations, leads, startConversation, customerSay, botRespond, botNudge, takeOver, repSay, returnToBot, closeConversation } = useStore()
  const mine = conversations.filter((c) => c.clientId === client.id).sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
  const [filter, setFilter] = useState<Filter>(mine.some((c) => group(c.status) === 'needs') ? 'needs' : 'bot')
  const [selId, setSelId] = useState<string | null>(null)
  const [thinking, setThinking] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [asCustomer, setAsCustomer] = useState('')
  const [leadOpen, setLeadOpen] = useState(false)
  const [newLead, setNewLead] = useState('')
  const end = useRef<HTMLDivElement>(null)

  const shown = mine.filter((c) => group(c.status) === filter)
  const conv = mine.find((c) => c.id === selId) ?? shown[0] ?? null
  const lead = leads.find((l) => l.id === conv?.leadId)
  const count = (f: Filter) => mine.filter((c) => group(c.status) === f).length
  const cfg = client.settings.chatbot

  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }) }, [conv?.messages.length, thinking])

  const startable = leads.filter((l) => l.clientId === client.id && segmentOf(l, client) === 'abandoned' && !mine.some((c) => c.leadId === l.id && (c.status === 'bot' || c.status === 'needs_human' || c.status === 'human')))
  const startableOk = startable.filter((l) => !canStartBot(l, client))

  const say = (text: string) => {
    if (!conv || !text.trim()) return
    customerSay(conv.id, text)
    setAsCustomer('')
    if (conv.status === 'bot') {
      setThinking(conv.id)
      setTimeout(() => { botRespond(conv.id); setThinking(null) }, 900)
    }
  }
  const owned = !lead?.assigneeId || lead.assigneeId === me.id || me.role === 'admin'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {!cfg.enabled && <Banner tone="warn" icon={<Bot className={ic} />}>The chatbot is switched off for {client.name}. Turn it on in Settings, under Chatbot. Existing conversations stay visible.</Banner>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="seg" role="group" aria-label="Conversation filter">
          <button aria-pressed={filter === 'needs'} onClick={() => setFilter('needs')}>Needs a rep<span className="n">{count('needs')}</span></button>
          <button aria-pressed={filter === 'bot'} onClick={() => setFilter('bot')}>Bot replying<span className="n">{count('bot')}</span></button>
          <button aria-pressed={filter === 'done'} onClick={() => setFilter('done')}>Done<span className="n">{count('done')}</span></button>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="field" aria-label="Lead to message" value={newLead} onChange={(e) => setNewLead(e.target.value)} style={{ maxWidth: 260 }}>
            <option value="">Start from an abandoned cart…</option>
            {startable.map((l) => { const why = canStartBot(l, client); return <option key={l.id} value={l.id} disabled={!!why}>{l.name} · {money(l.cartValue, l.currency)}{why ? ` (${why})` : ''}</option> })}
          </select>
          <button className="btn btn-primary" disabled={!newLead || !cfg.enabled} title={!cfg.enabled ? 'Chatbot is switched off' : startableOk.length === 0 ? 'No eligible lead' : undefined} onClick={() => { const id = startConversation(newLead); if (id) { setSelId(id); setFilter('bot'); setNewLead('') } }}><MessageCircle className={ic} />Start</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 340px) minmax(0, 1fr)', gap: 14, alignItems: 'start' }}>
        <div className="card" style={{ overflow: 'hidden' }} role="list" aria-label="Conversations">
          {shown.length === 0 && <div className="muted" style={{ padding: 24, textAlign: 'center', fontSize: 13 }}>{filter === 'needs' ? 'No customer is waiting for a rep.' : 'Nothing here yet.'}</div>}
          {shown.map((c) => {
            const l = leads.find((x) => x.id === c.leadId)!
            const last = [...c.messages].reverse().find((m) => m.from !== 'system')
            return (
              <button key={c.id} role="listitem" onClick={() => setSelId(c.id)} aria-current={conv?.id === c.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', textAlign: 'left', padding: '12px 14px', border: 0, borderBottom: '1px solid var(--line)', background: conv?.id === c.id ? 'var(--accent-soft)' : 'transparent', color: 'inherit', font: 'inherit', cursor: 'pointer' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <b style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</b>
                  <span className="muted" style={{ fontSize: 12 }}>{timeAgo(c.updatedAt)}</span>
                </span>
                <span className="muted" style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{last ? `${last.from === 'customer' ? '' : 'You: '}${last.text}` : ''}</span>
                <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span className={`chip ${statusChip[c.status].cls}`}>{statusChip[c.status].label}</span>
                  <span className="muted num" style={{ fontSize: 12 }}>{money(l.cartValue, l.currency)}</span>
                </span>
              </button>
            )
          })}
        </div>

        {conv && lead ? (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 520 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <b>{lead.name}</b> <span className={`chip ${statusChip[conv.status].cls}`} style={{ marginLeft: 6 }}>{statusChip[conv.status].label}</span>
                <div className="muted" style={{ fontSize: 12 }}>WhatsApp · {lead.phone} · cart {money(lead.cartValue, lead.currency)}{lead.stopReason ? ` · ${lead.stopReason.toLowerCase()}` : ''}</div>
              </div>
              <button className="btn btn-sm" onClick={() => setLeadOpen(true)}><UserRound className={ic} />Lead file</button>
            </div>

            {conv.status === 'needs_human' && (
              <div style={{ padding: '10px 16px 0' }}>
                <Banner tone="bad" icon={<Hand className={ic} />}>{conv.handoffReason ?? 'Customer needs a person'}. The bot has stopped replying until a rep takes over.</Banner>
              </div>
            )}

            <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }} aria-live="polite">
              {conv.messages.map((m) =>
                m.from === 'system' ? (
                  <div key={m.id} className="muted" style={{ alignSelf: 'center', fontSize: 12, padding: '2px 10px', borderRadius: 999, background: 'var(--surface-2)' }}>{m.text}</div>
                ) : (
                  <div key={m.id} style={{ alignSelf: m.from === 'customer' ? 'flex-start' : 'flex-end', maxWidth: '78%', display: 'flex', flexDirection: 'column', gap: 2, alignItems: m.from === 'customer' ? 'flex-start' : 'flex-end' }}>
                    <div style={{ padding: '8px 12px', borderRadius: 12, fontSize: 14, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', background: m.from === 'customer' ? 'var(--surface-2)' : m.from === 'rep' ? 'var(--accent)' : 'var(--accent-soft)', color: m.from === 'rep' ? '#fff' : m.from === 'bot' ? 'var(--accent-text)' : 'var(--text)' }}>{m.text}</div>
                    <span className="muted" style={{ fontSize: 11 }}>
                      {m.from === 'bot' ? <><Bot className={ic} style={{ width: 11, height: 11, verticalAlign: -1 }} /> {cfg.name} (bot)</> : m.from === 'rep' ? 'Rep' : lead.name.split(' ')[0]} · {timeAgo(m.at)}
                      {m.offer && <span className="chip c-hold" style={{ marginLeft: 6, height: 18, fontSize: 11 }}>Offered {m.offer}</span>}
                    </span>
                  </div>
                ),
              )}
              {thinking === conv.id && <div className="muted" style={{ alignSelf: 'flex-end', fontSize: 12 }}>{cfg.name} is typing…</div>}
              <div ref={end} />
            </div>

            <div style={{ borderTop: '1px solid var(--line)', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(conv.status === 'needs_human' || conv.status === 'bot') && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button className={`btn btn-sm ${conv.status === 'needs_human' ? 'btn-primary' : ''}`} disabled={!owned} title={!owned ? 'Lead is owned by another rep' : undefined} onClick={() => takeOver(conv.id)}><Hand className={ic} />Take over</button>
                  {conv.status === 'bot' && <button className="btn btn-sm" onClick={() => botNudge(conv.id)} title="Simulates the customer going quiet: the bot sends its next follow-up"><Clock className={ic} />Customer is quiet</button>}
                  {!owned && <span className="muted" style={{ fontSize: 12 }}>Owned by another rep.</span>}
                </div>
              )}
              {conv.status === 'human' && (
                <form onSubmit={(e) => { e.preventDefault(); repSay(conv.id, draft); setDraft('') }} style={{ display: 'flex', gap: 8 }}>
                  <input className="field" style={{ flex: 1 }} aria-label="Reply as rep" placeholder="Reply to the customer…" value={draft} onChange={(e) => setDraft(e.target.value)} />
                  <button className="btn btn-primary" type="submit" disabled={!draft.trim()}><Send className={ic} />Send</button>
                  <button type="button" className="btn" onClick={() => returnToBot(conv.id)}><Undo2 className={ic} />Back to bot</button>
                  <button type="button" className="btn" onClick={() => closeConversation(conv.id)}>Resolve</button>
                </form>
              )}
              {(conv.status === 'won' || conv.status === 'closed') && <div className="muted" style={{ fontSize: 13 }}>This conversation is finished.</div>}

              {(conv.status === 'bot' || conv.status === 'needs_human' || conv.status === 'human') && (
                <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="eyebrow">Prototype · type as {lead.name.split(' ')[0]}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {quick.map((q) => <button key={q} className="btn btn-sm" onClick={() => say(q)}>{q}</button>)}
                  </div>
                  <form onSubmit={(e) => { e.preventDefault(); say(asCustomer) }} style={{ display: 'flex', gap: 8 }}>
                    <input className="field" style={{ flex: 1 }} aria-label="Message as customer" placeholder="Write as the customer…" value={asCustomer} onChange={(e) => setAsCustomer(e.target.value)} />
                    <button className="btn" type="submit" disabled={!asCustomer.trim()}>Send as customer</button>
                  </form>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="card muted" style={{ padding: 40, textAlign: 'center' }}>Pick a conversation, or start one from an abandoned cart.</div>
        )}
      </div>
      {leadOpen && conv && <LeadFile leadId={conv.leadId} ids={[conv.leadId]} onNavigate={() => {}} onClose={() => setLeadOpen(false)} />}
    </div>
  )
}
