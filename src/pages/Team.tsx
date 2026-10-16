import AssignPicker from '../components/AssignPicker'
import { Brand, Initials } from '../components/ui'
import { useStore } from '../store/useStore'

export default function Team() {
  const { users, clients, leads, assignRepToClient } = useStore()
  return (
    <main style={{ padding: '32px 40px 48px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div><h1 style={{ margin: 0, fontSize: 28, lineHeight: '34px', fontWeight: 600 }}>Team</h1><div className="muted">Roles and client assignments</div></div>
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="tbl">
          <thead><tr><th>Name</th><th>Role</th><th>Clients</th><th className="r">Assigned leads</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontWeight: 500 }}><Initials name={u.name} size={28} />{u.name.replace(/\(.*\)/, '').trim()}</span></td>
                <td><span className={`chip ${u.role === 'admin' ? 'c-accent' : 'c-out'}`} style={{ textTransform: 'capitalize' }}>{u.role}</span></td>
                <td>
                  {u.role === 'admin' ? <span className="muted">All clients</span> : (
                    <AssignPicker
                      noun="client" empty="No clients"
                      items={clients.map((c) => ({ id: c.id, label: c.name, sub: `${users.filter((x) => x.role === 'rep' && x.clientIds.includes(c.id)).length} reps`, icon: <Brand client={c} size={20} /> }))}
                      selected={u.clientIds}
                      onToggle={(id, on) => assignRepToClient(id, u.id, on)}
                    />
                  )}
                </td>
                <td className="r num">{leads.filter((l) => l.assigneeId === u.id).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
