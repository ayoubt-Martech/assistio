import { Ear, Play, Pause, Sparkles, Star, X } from 'lucide-react'
import { useState } from 'react'
import { Brand, Banner, ic } from '../components/ui'
import { dispositionDef } from '../lib/dispositions'
import { duration, timeAgo } from '../lib/format'
import { useStore } from '../store/useStore'

const toneOf = (t: string) => (t.includes('green') ? 'c-ok' : t.includes('amber') ? 'c-warn' : t.includes('red') ? 'c-bad' : '')

export default function CallReview() {
  const { interactions, leads, users, clients, activeCalls, reviewCall } = useStore()
  const [rep, setRep] = useState('')
  const [unreviewed, setUnreviewed] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [rating, setRating] = useState(4)
  const [comment, setComment] = useState('')
  const [listening, setListening] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)

  const calls = interactions
    .filter((i) => i.type === 'call' && i.disposition && (i.durationSec ?? 0) > 0)
    .filter((i) => !rep || i.userId === rep)
    .filter((i) => !unreviewed || !i.review)
    .sort((a, b) => +new Date(b.at) - +new Date(a.at))
    .slice(0, 60)
  const open = calls.find((c) => c.id === openId)
  const reps = users.filter((u) => u.role === 'rep')

  return (
    <main style={{ padding: '32px 40px 48px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div><h1 style={{ margin: 0, fontSize: 28, lineHeight: '34px', fontWeight: 600 }}>Call review</h1><div className="muted">Monitor live calls, then review and coach on recorded ones</div></div>

      <section className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Live now</h2>
        {activeCalls.length === 0 && <p className="muted" style={{ margin: 0, fontSize: 13 }}>No rep is on a call. Start one as a rep (switch user in the sidebar) to see it here.</p>}
        {activeCalls.map((c) => {
          const lead = leads.find((l) => l.id === c.leadId)
          const u = users.find((x) => x.id === c.userId)
          const client = clients.find((x) => x.id === lead?.clientId)
          return (
            <div key={c.userId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, background: 'var(--ok-soft)' }}>
              <span className="live" aria-hidden="true" />
              <span style={{ flex: 1, fontSize: 13 }}><b>{u?.name.replace(/\(.*\)/, '').trim()}</b> with {lead?.name} {client && <>(<Brand client={client} size={16} /> {client.name})</>} · started {timeAgo(c.startedAt)}</span>
              <button className="btn btn-sm" aria-pressed={listening === c.userId} onClick={() => setListening(listening === c.userId ? null : c.userId)}><Ear className={ic} />{listening === c.userId ? 'Stop listening' : 'Listen in'}</button>
            </div>
          )
        })}
        {listening && <Banner tone="info" icon={<Ear className={ic} />}>Simulated: in production this opens a silent monitor (with whisper / barge options) through the telephony provider.</Banner>}
      </section>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Recent calls</h2>
          <select className="field" aria-label="Rep" value={rep} onChange={(e) => setRep(e.target.value)}>
            <option value="">All reps</option>{reps.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <button className="btn btn-sm" aria-pressed={unreviewed} onClick={() => setUnreviewed(!unreviewed)}>Unreviewed only</button>
        </div>
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead><tr><th>When</th><th>Rep</th><th>Customer</th><th>Client</th><th>Outcome</th><th className="r">Duration</th><th>Review</th></tr></thead>
            <tbody>
              {calls.map((c) => {
                const lead = leads.find((l) => l.id === c.leadId)!
                const client = clients.find((x) => x.id === lead.clientId)!
                return (
                  <tr key={c.id} className="row" onClick={() => { setOpenId(c.id); setRating(c.review?.rating ?? 4); setComment(c.review?.comment ?? ''); setPlaying(false) }}>
                    <td className="muted">{timeAgo(c.at)}</td>
                    <td>{users.find((u) => u.id === c.userId)?.name.split(' ')[0]}</td>
                    <td style={{ fontWeight: 500 }}>{lead.name}</td>
                    <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Brand client={client} size={20} />{client.name}</span></td>
                    <td><span className={`chip ${toneOf(dispositionDef(c.disposition!).tone)}`}>{dispositionDef(c.disposition!).label}</span></td>
                    <td className="r num">{duration(c.durationSec ?? 0)}</td>
                    <td>{c.review ? <span className="chip c-hold"><Star className={ic} fill="currentColor" />{c.review.rating}</span> : <span className="muted">Not reviewed</span>}</td>
                  </tr>
                )
              })}
              {calls.length === 0 && <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center' }} className="muted">No calls match.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'var(--scrim)' }} onClick={() => setOpenId(null)}>
          <aside role="dialog" aria-modal="true" aria-label="Call details" onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(460px, 100%)', background: 'var(--surface)', boxShadow: 'var(--shadow-3)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: 20 }}>{leads.find((l) => l.id === open.leadId)?.name}</h2>
                <div className="muted" style={{ fontSize: 13 }}>{users.find((u) => u.id === open.userId)?.name} · {timeAgo(open.at)} · {duration(open.durationSec ?? 0)}</div>
              </div>
              <button className="btn btn-ghost btn-sm" aria-label="Close" onClick={() => setOpenId(null)}><X className={ic} /></button>
            </div>
            <div className="banner" style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)' }}><Sparkles className={ic} /><div><div className="eyebrow" style={{ color: 'inherit', marginBottom: 2 }}>AI summary (simulated)</div>{open.text}</div></div>
            <div className="card" style={{ padding: 12 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Recording (simulated)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button className="btn btn-sm btn-primary" onClick={() => setPlaying(!playing)}>{playing ? <Pause className={ic} /> : <Play className={ic} />}{playing ? 'Pause' : 'Play'}</button>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface-3)', overflow: 'hidden' }}><div style={{ height: '100%', background: 'var(--accent)', width: playing ? '100%' : '0%', transition: playing ? 'width 20s linear' : 'none' }} /></div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontWeight: 600 }}>Your review</div>
              <div style={{ display: 'flex', gap: 2 }} role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((n) => <button key={n} className="btn btn-ghost btn-sm" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setRating(n)}><Star size={22} style={{ color: 'var(--warn)' }} fill={n <= rating ? 'currentColor' : 'none'} /></button>)}
              </div>
              <textarea className="field" rows={3} aria-label="Feedback" placeholder="Feedback for the rep…" value={comment} onChange={(e) => setComment(e.target.value)} />
              <button className="btn btn-primary" onClick={() => reviewCall(open.id, rating, comment)}>{open.review ? 'Update review' : 'Save review'}</button>
            </div>
          </aside>
        </div>
      )}
    </main>
  )
}
