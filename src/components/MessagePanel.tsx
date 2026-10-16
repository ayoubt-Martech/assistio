import { Lock, Mail, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import type { Client, Lead } from '../data/types'
import { render } from '../lib/format'
import { useCurrentUser, useStore } from '../store/useStore'
import { ic } from './ui'

/** Manual WhatsApp/email with the client's snippets, recovery link and discount code. */
export default function MessagePanel({ lead, client }: { lead: Lead; client: Client }) {
  const me = useCurrentUser()!
  const sendMessage = useStore((s) => s.sendMessage)
  const [channel, setChannel] = useState<'whatsapp' | 'email'>(lead.emailConsent || !lead.smsConsent ? 'email' : 'whatsapp')
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)

  const canWork = me.role === 'admin' || !lead.assigneeId || lead.assigneeId === me.id
  const consent = channel === 'email' ? lead.emailConsent : lead.smsConsent
  const contact = channel === 'email' ? lead.email : lead.phone
  const problemFor = (ch: 'whatsapp' | 'email') =>
    lead.dnc ? 'Customer is on the do-not-contact list.'
    : !(ch === 'email' ? lead.email : lead.phone) ? `No ${ch === 'email' ? 'email address' : 'phone number'} on file.`
    : !(ch === 'email' ? lead.emailConsent : lead.smsConsent) ? `No ${ch === 'email' ? 'email' : 'WhatsApp'} opt-in.${ch === 'whatsapp' && lead.emailConsent ? ' Email is allowed.' : ' Call instead.'}`
    : !canWork ? 'Lead is owned by another rep.' : null
  const problem = problemFor(channel)
  const insert = (tpl: string) => { setSent(false); setText((t) => (t ? t + '\n' : '') + render(tpl, lead, client, me.name.split(' ')[0])) }
  void consent; void contact

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {(['email', 'whatsapp'] as const).map((ch) => (
          <button key={ch} className="btn btn-sm" aria-pressed={channel === ch} onClick={() => setChannel(ch)}>
            {ch === 'email' ? <Mail className={ic} /> : <MessageCircle className={ic} />}{ch === 'email' ? 'Email' : 'WhatsApp'}
          </button>
        ))}
        {problem && <span id="msg-why" style={{ fontSize: 12, color: 'var(--text-2)', display: 'inline-flex', gap: 4, alignItems: 'center' }}><Lock className={ic} style={{ width: 13, height: 13 }} />{problem}</span>}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {client.settings.snippets.map((s) => <button key={s.id} className="btn btn-sm" onClick={() => insert(s.text)}>{s.title}</button>)}
        {lead.checkoutUrl && <button className="btn btn-sm btn-ghost" onClick={() => insert('{{recovery_link}}')}>+ Recovery link</button>}
        <button className="btn btn-sm btn-ghost" disabled={!lead.discountCode} onClick={() => insert('Use code {{discount_code}} at checkout.')}>+ Discount code</button>
      </div>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span className="muted" style={{ fontSize: 12 }}>Message to {(channel === 'email' ? lead.email : lead.phone) || '—'}</span>
        <textarea className="field" rows={5} style={{ resize: 'vertical' }} value={text} onChange={(e) => { setText(e.target.value); setSent(false) }} placeholder="Write a message or insert a snippet…" />
      </label>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="muted" style={{ fontSize: 12 }}>{channel === 'email' ? 'Unsubscribe footer added automatically' : 'Sent through an approved WhatsApp template'} · simulated</span>
        <button className="btn btn-primary" disabled={!!problem || !text.trim()} aria-describedby={problem ? 'msg-why' : undefined} onClick={() => { sendMessage(lead.id, channel, text.trim()); setText(''); setSent(true) }}>
          {sent ? 'Sent ✓' : channel === 'email' ? 'Send email' : 'Send WhatsApp'}
        </button>
      </div>
    </div>
  )
}
