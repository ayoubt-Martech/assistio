import { Plus, X } from 'lucide-react'
import type { Client, RecommendedAction } from '../data/types'
import { actionLabel } from '../lib/format'
import { ic } from '../components/ui'
import { useStore } from '../store/useStore'

const Section = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
  <section className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
    <div><h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{title}</h2>{hint && <div className="muted" style={{ fontSize: 12 }}>{hint}</div>}</div>
    {children}
  </section>
)
const Remove = ({ onClick, label }: { onClick: () => void; label: string }) => <button className="btn btn-ghost btn-sm" aria-label={label} onClick={onClick}><X className={ic} /></button>

export default function ClientSettings({ client }: { client: Client }) {
  const update = useStore((s) => s.updateClientSettings)
  const s = client.settings
  const set = <K extends keyof typeof s>(k: K, v: (typeof s)[K]) => update(client.id, { [k]: v })
  return (
    <div style={{ maxWidth: 820, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Section title="Brand" hint="Shown as the strip, badge and header tint inside this client's workspace.">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>Colour <input type="color" value={s.color} onChange={(e) => set('color', e.target.value)} style={{ width: 44, height: 32, border: '1px solid var(--line-2)', borderRadius: 8, background: 'var(--surface)' }} /></label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>Logo text <input className="field" maxLength={3} style={{ width: 70 }} value={s.logo} onChange={(e) => set('logo', e.target.value)} /></label>
        </div>
        <label style={{ fontSize: 13 }}>Product notes (shown to reps)
          <textarea className="field" rows={2} style={{ width: '100%', marginTop: 4 }} value={s.productNotes} onChange={(e) => set('productNotes', e.target.value)} />
        </label>
      </Section>

      <Section title="Chatbot" hint="Talks to this client's customers on WhatsApp. It answers from the product notes, objections and snippets below, and hands over to a rep when unsure.">
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13 }}><input type="checkbox" checked={s.chatbot.enabled} onChange={(e) => set('chatbot', { ...s.chatbot, enabled: e.target.checked })} /> Chatbot enabled</label>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', fontSize: 13 }}>
          <label>Persona name <input className="field" style={{ width: 130, marginLeft: 6 }} value={s.chatbot.name} onChange={(e) => set('chatbot', { ...s.chatbot, name: e.target.value })} /></label>
          <label>Tone <select className="field" style={{ marginLeft: 6 }} value={s.chatbot.tone} onChange={(e) => set('chatbot', { ...s.chatbot, tone: e.target.value as typeof s.chatbot.tone })}><option value="friendly">Friendly</option><option value="concise">Concise</option><option value="premium">Premium</option></select></label>
          <label>Follow-ups if quiet <input className="field" type="number" min={0} max={5} style={{ width: 64, marginLeft: 6 }} value={s.chatbot.maxFollowUps} onChange={(e) => set('chatbot', { ...s.chatbot, maxFollowUps: Math.max(0, +e.target.value) })} /></label>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>Hand carts worth at least
          <input className="field" type="number" min={0} style={{ width: 90 }} value={s.chatbot.handoffAbove} onChange={(e) => set('chatbot', { ...s.chatbot, handoffAbove: Math.max(0, +e.target.value) })} /> {client.currency} to a rep once the customer wants to buy (0 = never)
        </label>
        <div style={{ fontSize: 13 }}>
          <div style={{ marginBottom: 6 }}>Discounts the bot may offer</div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {s.offers.length === 0 && <span className="muted">Add a discount offer below first.</span>}
            {s.offers.map((o) => (
              <label key={o.code} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={s.chatbot.offerCodes.includes(o.code)} onChange={(e) => set('chatbot', { ...s.chatbot, offerCodes: e.target.checked ? [...s.chatbot.offerCodes, o.code] : s.chatbot.offerCodes.filter((c) => c !== o.code) })} />
                <span className="mono">{o.code}</span> {o.label}
              </label>
            ))}
          </div>
        </div>
        <div className="muted" style={{ fontSize: 12 }}>The bot never starts a conversation without WhatsApp opt-in, stops on STOP and marks the customer do-not-contact, and offers at most one discount per conversation.</div>
      </Section>

      <Section title="Segment thresholds">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>Recent buyer = last order within
          <input className="field" type="number" min={1} style={{ width: 80 }} value={s.recentBuyerDays} onChange={(e) => set('recentBuyerDays', Math.max(1, +e.target.value))} /> days
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>Checkout counts as abandoned after
          <input className="field" type="number" min={0} style={{ width: 80 }} value={s.abandonedAfterHours} onChange={(e) => set('abandonedAfterHours', Math.max(0, +e.target.value))} /> hours
        </label>
      </Section>

      <Section title="Call scripts" hint="Variables: {{first_name}} {{store}} {{agent}} {{cart_items}} {{reason}}">
        {(Object.keys(actionLabel) as RecommendedAction[]).map((a) => (
          <label key={a} style={{ fontSize: 13 }}>{actionLabel[a]}
            <textarea className="field" rows={3} style={{ width: '100%', marginTop: 4 }} value={s.scripts[a]} onChange={(e) => set('scripts', { ...s.scripts, [a]: e.target.value })} />
          </label>
        ))}
      </Section>

      <Section title="Quick-reply snippets" hint="Also supports {{recovery_link}} and {{discount_code}}.">
        {s.snippets.map((sn, i) => (
          <div key={sn.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <input className="field" aria-label="Snippet title" style={{ width: 160 }} value={sn.title} onChange={(e) => set('snippets', s.snippets.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
            <textarea className="field" aria-label="Snippet text" rows={2} style={{ flex: 1 }} value={sn.text} onChange={(e) => set('snippets', s.snippets.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
            <Remove label="Remove snippet" onClick={() => set('snippets', s.snippets.filter((_, j) => j !== i))} />
          </div>
        ))}
        <button className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => set('snippets', [...s.snippets, { id: String(Date.now()), title: 'New snippet', text: '' }])}><Plus className={ic} />Add snippet</button>
      </Section>

      <Section title="Objection cheat sheet">
        {s.objections.map((o, i) => (
          <div key={o.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <input className="field" aria-label="Objection" style={{ width: 220 }} value={o.q} onChange={(e) => set('objections', s.objections.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} />
            <textarea className="field" aria-label="Answer" rows={2} style={{ flex: 1 }} value={o.a} onChange={(e) => set('objections', s.objections.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} />
            <Remove label="Remove objection" onClick={() => set('objections', s.objections.filter((_, j) => j !== i))} />
          </div>
        ))}
        <button className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => set('objections', [...s.objections, { id: String(Date.now()), q: 'New objection', a: '' }])}><Plus className={ic} />Add objection</button>
      </Section>

      <Section title="Discount offers" hint="Codes must exist in the merchant's Shopify. Reps can only apply offers marked “reps allowed”.">
        {s.offers.map((o, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input className="field mono" aria-label="Code" style={{ width: 130 }} value={o.code} onChange={(e) => set('offers', s.offers.map((x, j) => (j === i ? { ...x, code: e.target.value.toUpperCase() } : x)))} />
            <input className="field" aria-label="Label" style={{ flex: 1 }} value={o.label} onChange={(e) => set('offers', s.offers.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, whiteSpace: 'nowrap' }}><input type="checkbox" checked={o.repAllowed} onChange={(e) => set('offers', s.offers.map((x, j) => (j === i ? { ...x, repAllowed: e.target.checked } : x)))} /> reps allowed</label>
            <Remove label="Remove offer" onClick={() => set('offers', s.offers.filter((_, j) => j !== i))} />
          </div>
        ))}
        <button className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => set('offers', [...s.offers, { code: 'CODE', label: 'New offer', repAllowed: false }])}><Plus className={ic} />Add offer</button>
      </Section>
    </div>
  )
}
