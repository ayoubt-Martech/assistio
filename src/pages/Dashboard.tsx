import { ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Brand, ic } from '../components/ui'
import type { Disposition, Segment } from '../data/types'
import { dispositionDef, dispositions } from '../lib/dispositions'
import { duration, money, segmentLabel } from '../lib/format'
import { segmentOf } from '../lib/segments'
import { useStore } from '../store/useStore'

const DAY = 24 * 3600_000
const pct = (n: number, d: number, digits = 1) => (d ? `${((n / d) * 100).toFixed(digits)} %` : '—')
const delta = (cur: number, prev: number) => (prev >= 5 ? `${cur >= prev ? '▲' : '▼'} ${Math.abs(Math.round(((cur - prev) / prev) * 100))} %` : null)

export default function Dashboard() {
  const { leads, users, clients, interactions } = useStore()
  const [clientId, setClientId] = useState('')
  const [days, setDays] = useState(14)
  const [table, setTable] = useState(false)
  const [sel, setSel] = useState<number | null>(null)

  const d = useMemo(() => {
    const byId = new Map(leads.map((l) => [l.id, l]))
    const all = interactions.filter((i) => i.type === 'call' && !!i.disposition && byId.has(i.leadId) && (!clientId || byId.get(i.leadId)!.clientId === clientId))
    const now = Date.now()
    const inRange = (from: number, to: number) => all.filter((i) => { const t = new Date(i.at).getTime(); return t >= from && t < to })
    const calls = inRange(now - days * DAY, now + DAY)
    const prev = inRange(now - 2 * days * DAY, now - days * DAY)
    const start = new Date(); start.setHours(0, 0, 0, 0)
    const buckets = Array.from({ length: days }, (_, k) => {
      const from = start.getTime() - (days - 1 - k) * DAY
      const inDay = calls.filter((c) => { const t = new Date(c.at).getTime(); return t >= from && t < from + DAY })
      return { date: new Date(from), calls: inDay.length, sales: inDay.filter((c) => c.disposition === 'won').length }
    })
    return { byId, calls, prev, buckets }
  }, [leads, interactions, clientId, days])

  const { byId, calls, prev, buckets } = d
  const connected = calls.filter((c) => dispositionDef(c.disposition!).connected)
  const worked = new Set(calls.map((c) => c.leadId))
  const wonSet = new Set(calls.filter((c) => c.disposition === 'won').map((c) => c.leadId))
  const prevWon = new Set(prev.filter((c) => c.disposition === 'won').map((c) => c.leadId)).size
  const talk = connected.reduce((s, c) => s + (c.durationSec ?? 0), 0)
  const client = clients.find((c) => c.id === clientId)
  const revenue = client ? money([...wonSet].reduce((s, id) => s + byId.get(id)!.cartValue, 0), client.currency) : null
  const eligible = leads.filter((l) => (!clientId || l.clientId === clientId) && !l.holdout && !l.dnc && l.reachable).length
  const maxCalls = Math.max(1, ...buckets.map((b) => b.calls)), maxSales = Math.max(1, ...buckets.map((b) => b.sales))
  const cur = sel !== null ? buckets[sel] : null
  const label = (dt: Date) => dt.toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })

  const holdout = (Object.keys(segmentLabel) as Segment[]).map((s) => {
    const pool = leads.filter((l) => (!clientId || l.clientId === clientId) && segmentOf(l, clients.find((c) => c.id === l.clientId)!) === s)
    const w = pool.filter((l) => !l.holdout && l.attempts > 0)
    const h = pool.filter((l) => l.holdout)
    const wr = w.length ? (w.filter((l) => l.status === 'won').length / w.length) * 100 : 0
    const hr = h.length ? (h.filter((l) => l.status === 'won').length / h.length) * 100 : 0
    return { s, n1: w.length, n2: h.length, wr, hr }
  })
  const hmax = Math.max(1, ...holdout.flatMap((h) => [h.wr, h.hr]))

  const outcomes = dispositions.map((dd) => ({ dd, n: calls.filter((c) => c.disposition === dd.key).length })).sort((a, b) => b.n - a.n)
  const omax = Math.max(1, ...outcomes.map((o) => o.n))
  const reps = users.filter((u) => u.role === 'rep').map((u) => {
    const mine = calls.filter((c) => c.userId === u.id)
    const conn = mine.filter((c) => dispositionDef(c.disposition as Disposition).connected)
    const rev = mine.filter((c) => c.review).map((c) => c.review!.rating)
    const sales = new Set(mine.filter((c) => c.disposition === 'won').map((c) => c.leadId)).size
    const wk = new Set(mine.map((c) => c.leadId)).size
    return { u, calls: mine.length, conn: pct(conn.length, mine.length, 0), talk: duration(conn.reduce((s, c) => s + (c.durationSec ?? 0), 0)), sales, conv: pct(sales, wk), rev: rev.length ? (rev.reduce((a, b) => a + b, 0) / rev.length).toFixed(1) : '—' }
  })
  const clientRows = clients.map((c) => {
    const cc = calls.filter((x) => byId.get(x.leadId)!.clientId === c.id)
    const w = new Set(cc.filter((x) => x.disposition === 'won').map((x) => x.leadId))
    const wk = new Set(cc.map((x) => x.leadId)).size
    return { c, calls: cc.length, wk, sales: w.size, conv: pct(w.size, wk), rev: money([...w].reduce((s, id) => s + byId.get(id)!.cartValue, 0), c.currency) }
  })

  const kpi = (k: string, v: string | number, sub?: string | null, good = false) => (
    <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span className="muted" style={{ fontSize: 12 }}>{k}</span>
      <span className="num" style={{ fontSize: 26, fontWeight: 600 }}>{v}</span>
      {sub && <span className="num" style={{ fontSize: 12, color: good ? 'var(--ok)' : 'var(--text-3)' }}>{sub}</span>}
    </div>
  )

  return (
    <main style={{ padding: '32px 40px 48px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
        <div><h1 style={{ margin: 0, fontSize: 28, lineHeight: '34px', fontWeight: 600 }}>Reports</h1><div className="muted">Last {days} days · {client ? client.name : 'all clients'}</div></div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="seg sm" role="group" aria-label="Period">
            {[7, 14, 30].map((n) => <button key={n} aria-pressed={days === n} onClick={() => { setDays(n); setSel(null) }}>{n} days</button>)}
          </div>
          <select className="field" aria-label="Client" value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">All clients</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className="btn btn-sm" disabled title="Coming later">Export</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        {kpi('Calls', calls.length, delta(calls.length, prev.length) && `${delta(calls.length, prev.length)} vs prior ${days} days`, calls.length >= prev.length)}
        {kpi('Connect rate', pct(connected.length, calls.length), `${connected.length} connected`)}
        {kpi('Leads worked', worked.size, `of ${eligible} eligible`)}
        {kpi('Sales won', wonSet.size, delta(wonSet.size, prevWon), wonSet.size >= prevWon)}
        {kpi('Conversion', pct(wonSet.size, worked.size), 'sales ÷ leads worked')}
        {kpi('Avg talk time', connected.length ? duration(talk / connected.length) : '—', 'connected calls')}
        {revenue ? kpi('Recovered revenue', revenue, 'from won leads') : (
          <div className="card" style={{ padding: 16, background: 'var(--surface-2)', borderStyle: 'dashed', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="muted" style={{ fontSize: 12 }}>Recovered revenue</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-2)', marginTop: 6 }}>Select one client</span>
            <span className="muted" style={{ fontSize: 12 }}>Currencies differ: never summed</span>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div><h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Calls and sales per day</h2><div className="muted" style={{ fontSize: 12 }}>Two aligned charts so sales aren't flattened by call volume · click a day for its numbers</div></div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div role="status" className="num" style={{ fontSize: 13, padding: '6px 10px', borderRadius: 8, background: 'var(--surface-2)' }}>
              <b>{cur ? label(cur.date) : 'Pick a day'}</b>{cur && <> · <span style={{ color: 'var(--series-a)', fontWeight: 600 }}>{cur.calls} calls</span> · <span style={{ color: 'var(--series-b)', fontWeight: 600 }}>{cur.sales} sales</span></>}
            </div>
            <button className="btn btn-sm" aria-pressed={table} onClick={() => setTable(!table)}>{table ? 'Show chart' : 'Show as table'}</button>
          </div>
        </div>
        {!table ? (
          <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr', gap: '0 10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 160, textAlign: 'right' }}><span className="num muted" style={{ fontSize: 11 }}>{maxCalls}</span><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--series-a)' }}>Calls</span><span className="num muted" style={{ fontSize: 11 }}>0</span></div>
            <div style={{ display: 'flex', height: 160, borderBottom: '1px solid var(--line-2)', backgroundImage: 'linear-gradient(var(--line) 1px, transparent 1px)', backgroundSize: '100% 40px' }}>
              {buckets.map((b, i) => (
                <button key={i} className="bar" onClick={() => setSel(i)} aria-label={`${label(b.date)}: ${b.calls} calls, ${b.sales} sales`}>
                  <span style={{ display: 'block', width: '70%', maxWidth: 30, borderRadius: '4px 4px 0 0', background: 'var(--series-a)', opacity: sel === null || sel === i ? 1 : 0.55, height: `${(b.calls / maxCalls) * 100}%` }} />
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 84, textAlign: 'right', marginTop: 14 }}><span className="num muted" style={{ fontSize: 11 }}>{maxSales}</span><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--series-b)' }}>Sales</span><span className="num muted" style={{ fontSize: 11 }}>0</span></div>
            <div style={{ display: 'flex', height: 84, marginTop: 14, borderBottom: '1px solid var(--line-2)', backgroundImage: 'linear-gradient(var(--line) 1px, transparent 1px)', backgroundSize: '100% 42px' }}>
              {buckets.map((b, i) => (
                <button key={i} className="bar" onClick={() => setSel(i)} aria-label={`${label(b.date)}: ${b.calls} calls, ${b.sales} sales`}>
                  <span style={{ display: 'block', width: '70%', maxWidth: 30, borderRadius: '4px 4px 0 0', background: 'var(--series-b)', opacity: sel === null || sel === i ? 1 : 0.55, height: `${(b.sales / maxSales) * 100}%` }} />
                </button>
              ))}
            </div>
            <div />
            <div style={{ display: 'flex', paddingTop: 6 }}>{buckets.map((b, i) => <span key={i} className="num" style={{ flex: 1, textAlign: 'center', fontSize: 11, color: sel === i ? 'var(--text)' : 'var(--text-3)', fontWeight: sel === i ? 600 : 400 }}>{b.date.getDate()}</span>)}</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl"><thead><tr><th>Day</th><th className="r">Calls</th><th className="r">Sales</th><th className="r">Sales per 100 calls</th></tr></thead>
              <tbody>{buckets.map((b, i) => <tr key={i}><td>{label(b.date)}</td><td className="r num">{b.calls}</td><td className="r num">{b.sales}</td><td className="r num">{b.calls ? ((b.sales / b.calls) * 100).toFixed(1) : '—'}</td></tr>)}</tbody></table>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 16 }}>
        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Contacted vs hold-out</h2><span className="chip c-hold"><ShieldCheck className={ic} />Admin only</span></div>
          <div style={{ fontSize: 13, color: 'var(--text-2)' }}>A small share of leads is never contacted. Their conversion is <b>what happens without us</b>; the gap is the uplift we can claim.</div>
          {holdout.map((h) => (
            <div key={h.s} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 72px', gap: 12, alignItems: 'center' }}>
              <div><div style={{ fontWeight: 500, fontSize: 13 }}>{segmentLabel[h.s]}</div><div className="muted num" style={{ fontSize: 11 }}>n = {h.n1} / {h.n2}</div></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ display: 'block', height: 10, borderRadius: 5, background: 'var(--ok)', width: `${(h.wr / hmax) * 70}%`, minWidth: 2 }} /><span className="num" style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{h.wr.toFixed(1)} %</span><span className="muted" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>contacted</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ display: 'block', height: 10, borderRadius: 5, background: 'var(--hold)', opacity: 0.7, width: `${(h.hr / hmax) * 70}%`, minWidth: 2 }} /><span className="num" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{h.hr.toFixed(1)} %</span><span className="muted" style={{ fontSize: 11 }}>hold-out</span></div>
              </div>
              <div className="num" style={{ textAlign: 'right', fontWeight: 600, color: h.wr - h.hr >= 0 ? 'var(--ok)' : 'var(--bad)' }}>{h.n1 && h.n2 ? `${h.wr - h.hr >= 0 ? '+' : ''}${(h.wr - h.hr).toFixed(1)} pp` : '—'}</div>
            </div>
          ))}
          <div className="muted" style={{ fontSize: 12, paddingTop: 8, borderTop: '1px solid var(--line)' }}>Uplift in percentage points (pp), all time. Hold-out groups under 100 are directional: shown with their n, never as a single headline number.</div>
        </div>

        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Call outcomes</h2>
          <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>{calls.length} calls in period</div>
          {outcomes.map(({ dd, n }) => (
            <div key={dd.key} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 72px', gap: 12, alignItems: 'center', fontSize: 13 }}>
              <span>{dd.label}</span>
              <span style={{ height: 10, borderRadius: 5, background: 'var(--surface-2)' }}><span style={{ display: 'block', height: 10, borderRadius: 5, width: `${(n / omax) * 100}%`, background: dd.key === 'won' ? 'var(--ok)' : dd.key === 'dnc' ? 'var(--bad)' : 'var(--text-3)' }} /></span>
              <span className="num r">{pct(n, calls.length, 0)} <span className="muted" style={{ fontSize: 11 }}>{n}</span></span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: 16 }}>
        <div className="card" style={{ overflowX: 'auto' }}>
          <div style={{ padding: '16px 16px 8px' }}><h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>By rep</h2></div>
          <table className="tbl"><thead><tr><th>Rep</th><th className="r">Calls</th><th className="r">Connect</th><th className="r">Talk</th><th className="r">Sales</th><th className="r">Conv.</th><th className="r">Review</th></tr></thead>
            <tbody>{reps.map((r) => <tr key={r.u.id}><td style={{ fontWeight: 500 }}>{r.u.name.replace(/\(.*\)/, '').trim()}</td><td className="r num">{r.calls}</td><td className="r num">{r.conn}</td><td className="r num">{r.talk}</td><td className="r num">{r.sales}</td><td className="r num">{r.conv}</td><td className="r num">★ {r.rev}</td></tr>)}</tbody></table>
        </div>
        <div className="card" style={{ overflowX: 'auto' }}>
          <div style={{ padding: '16px 16px 8px' }}><h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>By client</h2></div>
          <table className="tbl"><thead><tr><th>Client</th><th className="r">Calls</th><th className="r">Worked</th><th className="r">Sales</th><th className="r">Conv.</th><th className="r">Revenue</th></tr></thead>
            <tbody>{clientRows.map((r) => <tr key={r.c.id}><td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 500 }}><Brand client={r.c} size={22} />{r.c.name}</span></td><td className="r num">{r.calls}</td><td className="r num">{r.wk}</td><td className="r num">{r.sales}</td><td className="r num">{r.conv}</td><td className="r num" style={{ fontWeight: 500 }}>{r.rev}</td></tr>)}</tbody></table>
          <div className="muted" style={{ fontSize: 12, padding: '10px 16px 14px' }}>Revenue shown in each client's own currency: no total row.</div>
        </div>
      </div>
    </main>
  )
}
