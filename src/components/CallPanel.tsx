import { Link2, Sparkles, Check, Tag, Lock } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Client, Disposition, Lead } from '../data/types'
import { summarizeCall } from '../lib/ai'
import { dispositions, lostReasons } from '../lib/dispositions'
import { duration } from '../lib/format'
import { useCurrentUser, useStore } from '../store/useStore'
import { PhoneIcon, ic } from './ui'

const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
const presets = [
  { label: 'In 1 h', at: () => new Date(Date.now() + 3600_000) },
  { label: 'Tomorrow 10:00', at: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); return d } },
  { label: 'In 2 days', at: () => new Date(Date.now() + 2 * 24 * 3600_000) },
]
const clock = (sec: number) => duration(sec).padStart(5, '0')

export interface CallResult { disposition: Disposition; durationSec: number }

interface Props {
  lead: Lead
  client: Client
  variant?: 'bar' | 'card'
  autoAdvance?: boolean
  onSaved?: (o: CallResult) => void
  onUndo?: (o: CallResult) => void
  onNext?: () => void
  onSkip?: () => void
  /** Notes + extra actions shown while on a call (dialer: recovery link, offer) */
  duringCall?: React.ReactNode
}

/** idle → on call → wrap-up → saved. Telephony is simulated. */
export default function CallPanel({ lead, client, variant = 'bar', autoAdvance = false, onSaved, onUndo, onNext, onSkip, duringCall }: Props) {
  const me = useCurrentUser()!
  const { activeCalls, startCall, cancelCall, logOutcome } = useStore()
  const active = activeCalls.find((c) => c.userId === me.id && c.leadId === lead.id)
  const [phase, setPhase] = useState<'idle' | 'wrap' | 'saved'>('idle')
  const [wrapSec, setWrapSec] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [disp, setDisp] = useState<Disposition | null>(null)
  const [preset, setPreset] = useState(1)
  const [callbackAt, setCallbackAt] = useState(() => toLocalInput(presets[1].at()))
  const [reason, setReason] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [savedAt, setSavedAt] = useState(0)
  const undoRef = useRef<(() => void) | null>(null)
  const resultRef = useRef<CallResult | null>(null)
  const nextRef = useRef(onNext)
  nextRef.current = onNext

  const ticking = !!active || (phase === 'saved' && autoAdvance)
  useEffect(() => {
    if (!ticking) return
    const t = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(t)
  }, [ticking])
  useEffect(() => {
    if (phase === 'saved' && autoAdvance && savedAt && now - savedAt >= 3000) nextRef.current?.()
  }, [phase, autoAdvance, savedAt, now])

  const canWork = me.role === 'admin' || !lead.assigneeId || lead.assigneeId === me.id
  const blocked = lead.dnc ? 'Customer is on the do-not-contact list' : !lead.phone ? 'No phone number on file' : !canWork ? 'Owned by another rep: read-only' : null
  const elapsed = active ? Math.round((now - new Date(active.startedAt).getTime()) / 1000) : 0
  const otherCall = activeCalls.find((c) => c.userId === me.id && c.leadId !== lead.id)

  const needsReason = disp === 'not_interested'
  const ready = !!disp && (!needsReason || !!reason) && (disp !== 'callback' || !!callbackAt)

  const reset = () => { setPhase('idle'); setDisp(null); setReason(null); setNote(''); setPreset(1); setCallbackAt(toLocalInput(presets[1].at())) }
  const pick = (d: Disposition) => { setDisp(d); if (d !== 'not_interested') setReason(null) }
  const makeSummary = () => disp ? summarizeCall(lead, client, { disposition: disp, durationSec: wrapSec, note, reason: needsReason ? reason ?? undefined : undefined, callbackAt: disp === 'callback' ? new Date(callbackAt).toISOString() : null }) : ''
  const save = () => {
    if (!disp || !ready) return
    undoRef.current = logOutcome(lead.id, {
      disposition: disp, durationSec: wrapSec, summary: makeSummary(),
      callbackAt: disp === 'callback' ? new Date(callbackAt).toISOString() : null, reason: needsReason ? reason ?? undefined : undefined,
    })
    resultRef.current = { disposition: disp, durationSec: wrapSec }
    onSaved?.(resultRef.current)
    setSavedAt(Date.now()); setNow(Date.now()); setPhase('saved')
  }
  const undo = () => { undoRef.current?.(); if (resultRef.current) onUndo?.(resultRef.current); reset() }
  const endCall = () => { setWrapSec(elapsed); setPhase('wrap') }

  // keyboard: Space call/end, 1-7 outcome, Enter save (only for the dialer card variant, to avoid clashing with form fields)
  useEffect(() => {
    if (variant !== 'card') return
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return
      if (e.code === 'Space' && !blocked && !otherCall) {
        e.preventDefault()
        if (phase === 'idle' && !active) startCall(lead.id)
        else if (phase === 'idle' && active) endCall()
      } else if (phase === 'wrap' && /^[1-7]$/.test(e.key)) pick(dispositions[+e.key - 1].key)
      else if (phase === 'wrap' && e.key === 'Enter' && ready) save()
      else if (phase === 'saved' && e.key === 'Enter') nextRef.current?.()
      else if (phase === 'idle' && !active && e.key.toLowerCase() === 's') onSkip?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const shell = variant === 'card'
    ? { borderRadius: 12, padding: 16, background: 'var(--surface)', border: `1px solid ${active ? 'var(--bad)' : phase === 'idle' ? 'var(--accent)' : 'var(--line)'}`, boxShadow: active ? '0 0 0 3px color-mix(in srgb, var(--bad) 18%, transparent)' : undefined }
    : { padding: '12px 20px', background: 'var(--surface-2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }

  return (
    <section aria-label="Call controls" style={shell}>
      {phase === 'idle' && !active && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {variant === 'card' && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span className="eyebrow">Ready</span><span className="mono" style={{ fontSize: 15 }}>{lead.phone || '—'}</span></div>}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
            <button className="btn btn-primary btn-lg" style={variant === 'card' ? { flex: 1 } : undefined} disabled={!!blocked || !!otherCall} onClick={() => startCall(lead.id)}>
              <PhoneIcon />{lead.assigneeId ? 'Call' : 'Claim & call'} {variant === 'card' ? lead.name.split(' ')[0] : ''}{variant === 'card' && <span className="kbd">Space</span>}
            </button>
            {onSkip && <button className="btn btn-lg" onClick={onSkip}>Skip<span className="kbd">S</span></button>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {blocked ? <><Lock className={ic} style={{ width: 13, height: 13 }} />{blocked}.</> : otherCall ? 'Finish your other call first.' : <span className="muted">Calling claims the lead and pauses its automations.</span>}
          </div>
        </div>
      )}

      {phase === 'idle' && active && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className="live" aria-hidden="true" /><span style={{ fontWeight: 600 }}>On call with {lead.name.split(' ')[0]}</span>
            <div style={{ flex: 1 }} /><span className="mono num" style={{ fontSize: variant === 'card' ? 26 : 18, fontWeight: 500 }}>{clock(elapsed)}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-danger btn-lg" style={{ flex: 1 }} onClick={endCall}><PhoneIcon rotate />End call{variant === 'card' && <span className="kbd">Space</span>}</button>
            <button className="btn btn-lg" onClick={() => { setWrapSec(elapsed); setPhase('wrap'); setDisp('no_answer') }}>Didn't connect</button>
            <button className="btn btn-ghost btn-lg" onClick={() => cancelCall(lead.id)}>Cancel</button>
          </div>
          {duringCall}
        </div>
      )}

      {phase === 'wrap' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ fontWeight: 600 }}>Wrap-up</span><span className="muted num" style={{ fontSize: 13 }}>Call {clock(wrapSec)} · outcome required</span></div>
          <div role="group" aria-label="Outcome" style={{ display: 'grid', gridTemplateColumns: `repeat(${variant === 'card' ? 2 : 4}, minmax(0, 1fr))`, gap: 6 }}>
            {dispositions.map((d, i) => (
              <button key={d.key} className={`btn ${variant === 'card' ? '' : 'btn-sm'}`} aria-pressed={disp === d.key} onClick={() => pick(d.key)} style={{ justifyContent: 'flex-start', height: variant === 'card' ? 38 : undefined, color: d.key === 'dnc' && disp !== d.key ? 'var(--bad)' : undefined }}>
                <span className="kbd">{i + 1}</span>{d.label}
              </button>
            ))}
          </div>
          {disp === 'callback' && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="muted" style={{ fontSize: 12, marginRight: 4 }}>Call back</span>
              {presets.map((p, i) => <button key={p.label} className="btn btn-sm" aria-pressed={preset === i} onClick={() => { setPreset(i); setCallbackAt(toLocalInput(p.at())) }}>{p.label}</button>)}
              <input type="datetime-local" className="field" style={{ height: 28 }} value={callbackAt} onChange={(e) => { setCallbackAt(e.target.value); setPreset(-1) }} aria-label="Custom callback time" />
            </div>
          )}
          {needsReason && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="muted" style={{ fontSize: 12, marginRight: 4 }}>Reason</span>
              {lostReasons.map((r) => <button key={r} className="btn btn-sm" aria-pressed={reason === r} onClick={() => setReason(r)}>{r}</button>)}
            </div>
          )}
          {disp === 'dnc' && (
            <div className="banner" style={{ background: 'var(--bad-soft)', color: 'var(--bad)' }}>
              <span>Saving adds {lead.name.split(' ')[0]} to the suppression list for <b>{client.name}</b>: no calls, messages or automations.</span>
            </div>
          )}
          <textarea className="field" rows={2} aria-label="Call notes" placeholder="Notes (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          {disp && <div className="banner" style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)', fontSize: 12 }}><Sparkles className={ic} /><span>{makeSummary()}</span></div>}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="muted" style={{ fontSize: 12, flex: 1 }}>{!disp ? 'Pick an outcome to save' : needsReason && !reason ? 'Pick a reason' : 'AI summary (simulated) is saved to the timeline'}</span>
            <button className="btn btn-sm" onClick={reset}>Discard</button>
            <button className="btn btn-primary" disabled={!ready} onClick={save}>Save{onNext ? ' & next' : ''}<span className="kbd">↵</span></button>
          </div>
        </div>
      )}

      {phase === 'saved' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} role="status">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Check className={ic} style={{ color: 'var(--ok)', width: 20, height: 20 }} />
            <span style={{ fontWeight: 600 }}>Saved · {dispositions.find((d) => d.key === resultRef.current?.disposition)?.label}</span>
          </div>
          {autoAdvance && <div style={{ height: 4, borderRadius: 2, background: 'var(--surface-3)', overflow: 'hidden' }}><div style={{ height: '100%', background: 'var(--accent)', width: `${Math.min(100, ((now - savedAt) / 3000) * 100)}%` }} /></div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={undo}>Undo</button>
            {onNext ? <button className="btn btn-primary" style={{ flex: 1 }} onClick={onNext}>Next lead{autoAdvance ? ' now' : ''}<span className="kbd">↵</span></button> : <button className="btn btn-sm" onClick={reset}>Done</button>}
          </div>
        </div>
      )}
    </section>
  )
}

/** Dialer extras during a call. */
export function InCallActions({ lead, client }: { lead: Lead; client: Client }) {
  const me = useCurrentUser()!
  const { sendMessage, applyDiscount } = useStore()
  const offer = client.settings.offers.find((o) => o.repAllowed)
  const [linkSent, setLinkSent] = useState(false)
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {lead.checkoutUrl && lead.emailConsent && lead.email && (
        <button className="btn btn-sm" aria-pressed={linkSent} disabled={linkSent} onClick={() => { sendMessage(lead.id, 'email', `Hi ${lead.name.split(' ')[0]}, here is your basket: ${lead.checkoutUrl}`); setLinkSent(true) }}>
          <Link2 className={ic} />{linkSent ? 'Recovery link emailed' : 'Email recovery link'}
        </button>
      )}
      {offer && (
        <button className="btn btn-sm" aria-pressed={lead.discountCode === offer.code} disabled={me.role === 'rep' && !offer.repAllowed} onClick={() => applyDiscount(lead.id, offer.code)}>
          <Tag className={ic} />{lead.discountCode === offer.code ? `${offer.code} applied` : `Apply ${offer.code}`}
        </button>
      )}
    </div>
  )
}
