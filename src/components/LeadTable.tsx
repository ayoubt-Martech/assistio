import { Clock } from 'lucide-react'
import type { Lead } from '../data/types'
import { actionLabel, money, timeAgo, untilLabel } from '../lib/format'
import { priorityOf } from '../lib/priority'
import { actionFor, segmentOf } from '../lib/segments'
import { useCurrentUser, useStore } from '../store/useStore'
import { Brand, ConsentIcons, FlagChip, PriorityChip, StatusChip, ic } from './ui'
import { PhoneIcon } from './ui'

interface Props {
  rows: Lead[]
  showClient?: boolean
  showCallback?: boolean
  compact?: boolean
  onOpen: (id: string) => void
  onCall?: (id: string) => void
}

export default function LeadTable({ rows, showClient = false, showCallback = false, compact = false, onOpen, onCall }: Props) {
  const { clients, users, claimLead } = useStore()
  const me = useCurrentUser()!
  return (
    <div className="card" style={{ overflowX: 'auto' }}>
      <table className={compact ? 'tbl compact' : 'tbl'}>
        <thead>
          <tr>
            <th scope="col">Customer</th>
            {showClient && <th scope="col">Client</th>}
            {showCallback && <th scope="col">Callback</th>}
            <th scope="col">Priority</th><th scope="col">Context</th><th scope="col" className="r">Value</th>
            <th scope="col">Last activity</th><th scope="col">Next step</th><th scope="col">Status</th><th scope="col">Owner</th>
            <th scope="col"><span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((l) => {
            const client = clients.find((c) => c.id === l.clientId)!
            const seg = segmentOf(l, client)
            const { score } = priorityOf(l, client)
            const overdue = l.callbackAt && new Date(l.callbackAt) <= new Date()
            const owner = users.find((u) => u.id === l.assigneeId)
            const mine = l.assigneeId === me.id
            const blocked = l.dnc ? 'Blocked · DNC' : !l.phone ? 'Nothing to dial' : l.assigneeId && !mine && me.role === 'rep' ? 'Read-only' : ''
            return (
              <tr key={l.id} className="row" onClick={() => onOpen(l.id)}>
                <td style={{ minWidth: 220 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <button className="nm" onClick={(e) => { e.stopPropagation(); onOpen(l.id) }}>{l.name}</button>
                      <div className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.email || 'No email on file'}</div>
                    </div>
                    <ConsentIcons lead={l} />
                  </div>
                  {(l.dnc || !l.reachable || l.holdout) && (
                    <span style={{ display: 'inline-flex', gap: 4, marginTop: 4 }}>
                      <FlagChip lead={l} />{l.holdout && <span className="chip c-hold">Hold-out</span>}
                    </span>
                  )}
                </td>
                {showClient && <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Brand client={client} size={22} />{client.name}</span></td>}
                {showCallback && (
                  <td>
                    {l.callbackAt ? <span className={`chip num ${overdue ? 'c-bad' : ''}`}><Clock className={ic} />{overdue ? `Overdue ${timeAgo(l.callbackAt)}` : untilLabel(l.callbackAt)}</span> : '—'}
                  </td>
                )}
                <td><PriorityChip score={score} /></td>
                <td style={{ minWidth: 180 }}>
                  {seg === 'abandoned' ? (
                    <>
                      <div>Stopped at {l.stopPoint === 'none' ? 'cart' : l.stopPoint}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', gap: 6, alignItems: 'center' }}>{l.stopReason ?? 'Reason unknown'}{l.reasonSource === 'inferred' && l.stopReason && <span className="tag">inferred</span>}</div>
                    </>
                  ) : (
                    <>
                      <div className="num">{l.ordersCount} order{l.ordersCount === 1 ? '' : 's'} · LTV {money(l.ltv, l.currency)}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Last: {l.orders[0]?.items ?? '—'}</div>
                    </>
                  )}
                </td>
                <td className="num r" style={{ fontWeight: 500 }}>{money(l.cartValue, l.currency)}</td>
                <td className="muted" style={{ whiteSpace: 'nowrap' }}>{timeAgo(l.lastActivityAt)}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{seg && !blocked.startsWith('Blocked') ? actionLabel[actionFor[seg]] : '—'}</td>
                <td><StatusChip status={l.status} /></td>
                <td style={{ whiteSpace: 'nowrap', color: 'var(--text-2)' }}>{mine ? 'You' : owner?.name ?? 'Unclaimed'}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <div className="acts" style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    {!blocked && !l.assigneeId && <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); claimLead(l.id) }}>Claim</button>}
                    {!blocked && onCall && <button className="btn btn-sm" aria-label={`Call ${l.name}`} onClick={(e) => { e.stopPropagation(); onCall(l.id) }}><PhoneIcon size={14} /></button>}
                    {blocked && <span className="muted" style={{ fontSize: 12 }}>{blocked}</span>}
                  </div>
                </td>
              </tr>
            )
          })}
          {rows.length === 0 && <tr><td colSpan={11} style={{ padding: 32, textAlign: 'center' }} className="muted">No leads match these filters.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
