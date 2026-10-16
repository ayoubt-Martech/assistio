import { Plus, ShieldCheck, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import AssignPicker from '../components/AssignPicker'
import { Brand, Initials, ic } from '../components/ui'
import { timeAgo } from '../lib/format'
import { useStore } from '../store/useStore'

export default function Clients() {
  const { clients, leads, users, connectClient, assignRepToClient } = useStore()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [progress, setProgress] = useState<number | null>(null)
  const reps = users.filter((u) => u.role === 'rep')

  const connect = () => {
    setProgress(0)
    let p = 0
    const t = setInterval(() => {
      p += 20
      setProgress(p)
      if (p >= 100) {
        clearInterval(t)
        connectClient(name, domain.endsWith('.myshopify.com') ? domain : `${domain}.myshopify.com`)
        setOpen(false); setProgress(null); setName(''); setDomain('')
      }
    }, 400)
  }

  return (
    <main style={{ padding: '32px 40px 48px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
        <div><h1 style={{ margin: 0, fontSize: 28, lineHeight: '34px', fontWeight: 600 }}>Stores</h1><div className="muted">Shopify connections, permissions and rep assignment</div></div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}><Plus className={ic} />Connect Shopify store</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
        {clients.map((c) => (
          <div key={c.id} className="card">
            <div style={{ height: 3, background: c.settings.color, borderRadius: 'inherit', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }} />
            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Brand client={c} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}><Link to={`/c/${c.id}`} style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)', textDecoration: 'none' }}>{c.name}</Link><div className="muted" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.shopifyDomain}</div></div>
                <span className={`chip ${c.status === 'connected' ? 'c-ok' : 'c-bad'}`}>{c.status}</span>
              </div>
              {c.status === 'error' && <div className="banner" style={{ background: 'var(--bad-soft)', color: 'var(--bad)' }}><TriangleAlert className={ic} />Token expired: reconnect required.</div>}
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Last sync {timeAgo(c.lastSync)} · <span className="num">{leads.filter((l) => l.clientId === c.id).length}</span> leads · <span className="mono">{c.currency}</span></div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{c.scopes.map((s) => <span key={s} className="chip c-out mono" style={{ fontSize: 11 }}>{s}</span>)}</div>
              <span className={`chip ${c.protectedDataApproved ? 'c-ok' : 'c-warn'}`} style={{ alignSelf: 'flex-start' }}><ShieldCheck className={ic} />Protected customer data: {c.protectedDataApproved ? 'approved' : 'approval pending'}</span>
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                <div className="eyebrow" style={{ marginBottom: 6 }}>Assigned reps</div>
                <AssignPicker
                  noun="rep" empty="No rep assigned"
                  items={reps.map((u) => ({ id: u.id, label: u.name.replace(/\(.*\)/, '').trim(), sub: `${leads.filter((l) => l.assigneeId === u.id && l.clientId === c.id).length} leads here · ${u.clientIds.length} client${u.clientIds.length === 1 ? '' : 's'}`, icon: <Initials name={u.name} size={20} /> }))}
                  selected={reps.filter((u) => u.clientIds.includes(c.id)).map((u) => u.id)}
                  onToggle={(id, on) => assignRepToClient(c.id, id, on)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'var(--scrim)', display: 'grid', placeItems: 'center' }} onClick={() => progress === null && setOpen(false)}>
          <div className="card" role="dialog" aria-modal="true" aria-label="Connect a Shopify store" style={{ width: 400, padding: 24, display: 'flex', flexDirection: 'column', gap: 12, borderRadius: 16, boxShadow: 'var(--shadow-3)' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Connect a Shopify store</h2>
            <input className="field" style={{ height: 38 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="Client name" aria-label="Client name" />
            <input className="field" style={{ height: 38 }} value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="store-name.myshopify.com" aria-label="Shopify domain" />
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>Simulates Shopify OAuth consent, then an initial data sync.</p>
            {progress !== null ? (
              <div role="progressbar" aria-valuenow={progress} style={{ height: 6, borderRadius: 3, background: 'var(--surface-3)', overflow: 'hidden' }}><div style={{ height: '100%', background: 'var(--accent)', width: `${progress}%`, transition: 'width .3s' }} /></div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
                <button className="btn btn-primary" disabled={!name || !domain} onClick={connect}>Authorize &amp; sync</button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
