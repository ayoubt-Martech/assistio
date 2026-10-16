import { ChevronLeft, Play, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Conversations from '../components/Conversations'
import LeadFile from '../components/LeadFile'
import LeadTable from '../components/LeadTable'
import { Brand, brandTint, ic } from '../components/ui'
import type { LeadStatus, Segment } from '../data/types'
import { segmentLabel, statusLabel } from '../lib/format'
import { priorityOf } from '../lib/priority'
import { callbackDue, isOpen } from '../lib/queue'
import { segmentOf } from '../lib/segments'
import { useCurrentUser, useStore } from '../store/useStore'
import Automations from './Automations'
import ClientSettings from './ClientSettings'

type Tab = 'leads' | 'conversations' | 'automations' | 'settings'
type View = Segment | 'callbacks'
const goal: Record<View, string> = { abandoned: 'finish the sale', recent_buyer: 'upsell', past_buyer: 'reactivate', callbacks: 'call back on time' }

export default function ClientWorkspace() {
  const { clientId } = useParams()
  const navigate = useNavigate()
  const user = useCurrentUser()!
  const { clients, leads, conversations } = useStore()
  const client = clients.find((c) => c.id === clientId)
  const [params] = useSearchParams()
  const [tab, setTab] = useState<Tab>(params.get('tab') === 'conversations' ? 'conversations' : 'leads')
  const [view, setView] = useState<View>('abandoned')
  const [status, setStatus] = useState<LeadStatus | 'open' | ''>('open')
  const [owner, setOwner] = useState<'' | 'mine' | 'unclaimed' | 'holdout'>(user.role === 'rep' ? 'mine' : '')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'priority' | 'value' | 'recent'>('priority')
  const [compact, setCompact] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const search = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || openId) return
      if (e.key === '/') { e.preventDefault(); search.current?.focus() }
      else if (e.key.toLowerCase() === 'd' && client) navigate(`/c/${client.id}/dialer?view=${view}`)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const all = useMemo(() => leads.filter((l) => l.clientId === clientId), [leads, clientId])
  if (!client || (user.role !== 'admin' && !user.clientIds.includes(client.id))) return <Navigate to="/" />

  const base = all.filter((l) => (owner === 'holdout' ? l.holdout : !l.holdout && !l.dnc))
  const mineOrAll = (l: (typeof all)[number]) => owner === '' || owner === 'holdout' || (owner === 'mine' ? l.assigneeId === user.id : !l.assigneeId)
  const callbacks = base.filter((l) => l.status === 'callback' && mineOrAll(l))
  const rows = (view === 'callbacks' ? callbacks : base.filter((l) => segmentOf(l, client) === view))
    .filter((l) => (status === 'open' ? isOpen(l) : !status || l.status === status))
    .filter(mineOrAll)
    .filter((l) => !q || `${l.name} ${l.email}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) =>
      view === 'callbacks' ? +new Date(a.callbackAt ?? 0) - +new Date(b.callbackAt ?? 0)
        : sort === 'priority' ? priorityOf(b, client).score - priorityOf(a, client).score
        : sort === 'value' ? b.cartValue - a.cartValue
        : +new Date(b.lastActivityAt) - +new Date(a.lastActivityAt),
    )
  const needsRep = conversations.filter((c) => c.clientId === client.id && c.status === 'needs_human').length
  const tabs: Tab[] = user.role === 'admin' ? ['leads', 'conversations', 'automations', 'settings'] : ['leads', 'conversations']
  const overdue = callbacks.filter(callbackDue).length
  const segs: View[] = ['abandoned', 'recent_buyer', 'past_buyer', 'callbacks']
  const countFor = (v: View) => (v === 'callbacks' ? callbacks.length : base.filter((l) => segmentOf(l, client) === v && isOpen(l)).length)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{ background: brandTint(client.settings.color), borderBottom: '1px solid var(--line)' }}>
        <div style={{ height: 3, background: client.settings.color }} />
        <div style={{ padding: '14px 32px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Link to="/" style={{ fontSize: 13, color: 'var(--text-2)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }}><ChevronLeft className={ic} style={{ width: 14, height: 14 }} />All clients</Link>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
            <Brand client={client} size={44} />
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><h1 style={{ margin: 0, fontSize: 22, lineHeight: '28px', fontWeight: 600 }}>{client.name}</h1><span className="chip c-out mono">{client.currency}</span></div>
              <div style={{ color: 'var(--text-2)', fontSize: 13 }}>{client.settings.productNotes || client.shopifyDomain}</div>
            </div>
            {tab === 'leads' && <button className="btn btn-primary" style={{ height: 40 }} onClick={() => navigate(`/c/${client.id}/dialer?view=${view}`)}><Play className={ic} />Start dialer session<span className="kbd">D</span></button>}
          </div>
          {tabs.length > 1 && (
            <div className="seg sm" role="group" aria-label="Workspace section" style={{ alignSelf: 'flex-start' }}>
              {tabs.map((t) => <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>{t}{t === 'conversations' && needsRep > 0 && <span className="chip c-bad num" style={{ height: 18, padding: '0 5px', fontSize: 11 }}>{needsRep}</span>}</button>)}
            </div>
          )}
        </div>
      </header>

      <div style={{ padding: '20px 32px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {tab === 'leads' && (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="seg" role="group" aria-label="Segment">
                {segs.map((s) => (
                  <button key={s} aria-pressed={view === s} onClick={() => setView(s)}>
                    {s === 'callbacks' ? 'Callbacks' : segmentLabel[s as Segment]}<span className="n">{countFor(s)}</span>
                    {s === 'callbacks' && overdue > 0 && <span className="chip c-bad" style={{ height: 18, padding: '0 5px', fontSize: 11 }}>{overdue} overdue</span>}
                  </button>
                ))}
              </div>
              <div className="muted" style={{ fontSize: 13 }}>Goal: <b style={{ color: 'var(--text)' }}>{goal[view]}</b></div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <label style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: '1 1 240px', maxWidth: 320 }}>
                <Search className={ic} style={{ position: 'absolute', left: 10, color: 'var(--text-3)' }} />
                <input ref={search} className="field" type="search" placeholder="Search name or email" aria-label="Search leads" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: '100%', paddingLeft: 32 }} />
                <span className="kbd" style={{ position: 'absolute', right: 8 }}>/</span>
              </label>
              <select className="field" aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                <option value="open">Open leads</option><option value="">All statuses</option>
                {Object.entries(statusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select className="field" aria-label="Owner" value={owner} onChange={(e) => setOwner(e.target.value as typeof owner)}>
                <option value="">All owners</option><option value="mine">Assigned to me</option><option value="unclaimed">Unclaimed</option>
                {user.role === 'admin' && <option value="holdout">Hold-out group (admin)</option>}
              </select>
              {view !== 'callbacks' && (
                <select className="field" aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
                  <option value="priority">Sort: Priority</option><option value="value">Sort: Value</option><option value="recent">Sort: Most recent</option>
                </select>
              )}
              <div style={{ flex: 1 }} />
              <div className="seg sm" role="group" aria-label="Row density">
                <button aria-pressed={compact} onClick={() => setCompact(true)}>Compact</button>
                <button aria-pressed={!compact} onClick={() => setCompact(false)}>Comfortable</button>
              </div>
            </div>
            <LeadTable rows={rows} showCallback={view === 'callbacks'} compact={compact} onOpen={setOpenId} onCall={setOpenId} />
            <div className="muted" style={{ fontSize: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span>Showing {rows.length} of {countFor(view)} open leads</span>
              <span>Hover a row for Claim / Call · J / K move between leads in the lead file · D starts the dialer</span>
            </div>
          </>
        )}
        {tab === 'conversations' && <Conversations client={client} />}
        {tab === 'automations' && <Automations clientId={client.id} />}
        {tab === 'settings' && <ClientSettings client={client} />}
      </div>
      {openId && <LeadFile leadId={openId} ids={rows.map((r) => r.id)} onNavigate={setOpenId} onClose={() => setOpenId(null)} />}
    </div>
  )
}
