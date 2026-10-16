import { useStore } from '../store/useStore'
import { Initials } from '../components/ui'

export default function Login() {
  const { users, login, theme } = useStore()
  return (
    <div className={`as ${theme === 'dark' ? 'dark' : ''}`} style={{ minHeight: '100%', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div className="card" style={{ width: 400, padding: 28, boxShadow: 'var(--shadow-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#13161B', display: 'grid', placeItems: 'center' }}>
            <svg viewBox="0 0 24 24" style={{ width: 22, height: 22, fill: 'none', stroke: '#fff', strokeWidth: 2, strokeLinecap: 'round' }} aria-hidden="true"><path d="M5 17 10.5 5h3L19 17" /><path d="M8 12.5h8" /><circle cx="19" cy="5" r="1.6" style={{ fill: '#8A8DF8', stroke: 'none' }} /></svg>
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Assistio</h1>
        </div>
        <p className="muted" style={{ margin: '0 0 18px' }}>Prototype: pick a user to sign in (no real authentication).</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {users.map((u) => (
            <button key={u.id} className="btn" style={{ height: 52, justifyContent: 'flex-start', gap: 12 }} onClick={() => login(u.id)}>
              <Initials name={u.name} />
              <span style={{ flex: 1, textAlign: 'left' }}>{u.name}</span>
              <span className="chip c-out" style={{ textTransform: 'capitalize' }}>{u.role}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
