import { BarChart3, Bot, Headphones, LayoutGrid, Inbox, LogOut, Monitor, Moon, Store, Sun, Users } from 'lucide-react'
import { BrowserRouter, Link, NavLink, Navigate, Route, Routes, matchPath, useLocation } from 'react-router-dom'
import { Brand, Initials, ic } from './components/ui'
import Automations from './pages/Automations'
import CallReview from './pages/CallReview'
import Clients from './pages/Clients'
import ClientsHome from './pages/ClientsHome'
import ClientWorkspace from './pages/ClientWorkspace'
import Dashboard from './pages/Dashboard'
import Dialer from './pages/Dialer'
import Login from './pages/Login'
import MyLeads from './pages/MyLeads'
import Team from './pages/Team'
import { callbackDue } from './lib/queue'
import { useCurrentUser, useStore, useVisibleClients } from './store/useStore'

function Shell() {
  const user = useCurrentUser()
  const { users, login, theme, setTheme, leads } = useStore()
  const clients = useVisibleClients()
  const loc = useLocation()
  if (!user) return <Login />
  const admin = user.role === 'admin'
  const inDialer = !!matchPath('/c/:clientId/dialer', loc.pathname)
  const dark = theme === 'dark' || (theme === 'auto' && inDialer)
  const active = matchPath('/c/:clientId/*', loc.pathname)?.params.clientId
  const due = leads.filter((l) => l.assigneeId === user.id && callbackDue(l)).length
  const link = ({ isActive }: { isActive: boolean }) => (isActive ? 'on' : '')

  const routes = (
    <Routes>
      <Route path="/" element={<ClientsHome />} />
      <Route path="/c/:clientId" element={<ClientWorkspace />} />
      <Route path="/c/:clientId/dialer" element={<Dialer />} />
      {!admin && <Route path="/my-leads" element={<MyLeads />} />}
      {admin && <Route path="/dashboard" element={<Dashboard />} />}
      {admin && <Route path="/call-review" element={<CallReview />} />}
      {admin && <Route path="/clients" element={<Clients />} />}
      {admin && <Route path="/team" element={<Team />} />}
      {admin && <Route path="/automations" element={<Automations />} />}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )

  if (inDialer) return <div className={`as ${dark ? 'dark' : ''}`} style={{ minHeight: '100vh' }}>{routes}</div>

  return (
    <div className={`as ${dark ? 'dark' : ''}`} style={{ minHeight: '100vh', display: 'flex' }}>
      <aside style={{ flex: 'none', width: 232, position: 'sticky', top: 0, height: '100vh', background: 'var(--surface)', borderRight: '1px solid var(--line)', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px' }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: '#13161B', display: 'grid', placeItems: 'center' }}>
            <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: 'none', stroke: '#fff', strokeWidth: 2.2, strokeLinecap: 'round' }} aria-hidden="true"><path d="M5 17 10.5 5h3L19 17" /><path d="M8 12.5h8" /></svg>
          </div>
          <span style={{ fontWeight: 600, fontSize: 16 }}>Assistio</span>
        </div>
        <nav className="nav" aria-label="Main">
          <NavLink to="/" end className={link}><LayoutGrid className={ic} />Clients</NavLink>
          {!admin && <NavLink to="/my-leads" className={link}><Inbox className={ic} /><span style={{ flex: 1 }}>My leads</span>{due > 0 && <span className="chip c-bad num" style={{ height: 20, padding: '0 6px' }}>{due} due</span>}</NavLink>}
          {admin && <NavLink to="/dashboard" className={link}><BarChart3 className={ic} />Reports</NavLink>}
          {admin && <NavLink to="/call-review" className={link}><Headphones className={ic} />Call review</NavLink>}
          {admin && <NavLink to="/clients" className={link}><Store className={ic} />Stores</NavLink>}
          {admin && <NavLink to="/team" className={link}><Users className={ic} />Team</NavLink>}
          {admin && <NavLink to="/automations" className={link}><Bot className={ic} />Automations</NavLink>}
        </nav>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div className="eyebrow" style={{ padding: '0 10px 6px' }}>Working in</div>
          {clients.map((c) => (
            <Link key={c.id} to={`/c/${c.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 8, textDecoration: 'none', color: active === c.id ? 'var(--text)' : 'var(--text-2)', background: active === c.id ? 'var(--surface-2)' : undefined }}>
              <Brand client={c} size={22} /><span style={{ fontSize: 13, fontWeight: active === c.id ? 500 : 400 }}>{c.name}</span>
            </Link>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px' }}>
            <Initials name={user.name} />
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 500 }}>{user.name.replace(/\(.*\)/, '').trim()}</div><div className="muted" style={{ fontSize: 12, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{user.role} · {admin ? 'all' : user.clientIds.length} client{user.clientIds.length === 1 ? '' : 's'}</div></div>
            <button className="btn btn-ghost btn-sm" aria-label="Sign out" onClick={() => login(null)}><LogOut className={ic} /></button>
          </div>
          <div className="seg" role="radiogroup" aria-label="Theme" title="Auto = light, except the dialer which is dark" style={{ margin: '0 8px', display: 'flex' }}>
            {([['auto', 'Auto', <Monitor key="a" className={ic} />], ['light', 'Light', <Sun key="l" className={ic} />], ['dark', 'Dark', <Moon key="d" className={ic} />]] as const).map(([v, label, icon]) => (
              <button key={v} role="radio" aria-checked={theme === v} aria-pressed={theme === v} style={{ flex: 1, justifyContent: 'center', padding: '0 6px', gap: 4, fontSize: 12, height: 30 }} onClick={() => setTheme(v)}>{icon}{label}</button>
            ))}
          </div>
          <label className="muted" style={{ fontSize: 11, padding: '0 8px' }}>Demo: switch user
            <select className="field" style={{ width: '100%', marginTop: 4, height: 30 }} value={user.id} onChange={(e) => login(e.target.value)}>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </label>
        </div>
      </aside>
      <div style={{ flex: 1, minWidth: 0 }}>{routes}</div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  )
}
