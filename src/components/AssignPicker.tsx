import { Check, Plus, Search } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ic } from './ui'

export interface PickItem { id: string; label: string; sub?: string; icon: ReactNode }

// Shows who/what is assigned as removable chips, plus a popover with search to add or remove.
export default function AssignPicker({ items, selected, onToggle, noun, empty }: {
  items: PickItem[]; selected: string[]; onToggle: (id: string, on: boolean) => void; noun: string; empty: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc) }
  }, [open])

  const chosen = items.filter((i) => selected.includes(i.id))
  const shown = items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase()))

  return (
    <div ref={box} style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
      {chosen.length === 0 && <span className="muted" style={{ fontSize: 13 }}>{empty}</span>}
      {chosen.map((i) => (
        <span key={i.id} className="chip c-out" style={{ gap: 6, paddingLeft: 4 }}>{i.icon}{i.label}</span>
      ))}
      <button className="btn btn-sm" aria-haspopup="listbox" aria-expanded={open} onClick={() => { setOpen(!open); setQ('') }}>
        <Plus className={ic} />{chosen.length ? 'Edit' : `Add ${noun}`}
      </button>
      {open && (
        <div role="listbox" aria-multiselectable="true" aria-label={`Assign ${noun}s`} className="card" style={{ position: 'absolute', top: '100%', left: 0, marginTop: 6, zIndex: 20, width: 280, boxShadow: 'var(--shadow-3)', padding: 6 }}>
          {items.length > 6 && (
            <div style={{ position: 'relative', margin: 2, marginBottom: 6 }}>
              <Search className={ic} style={{ position: 'absolute', left: 8, top: 8, color: 'var(--text-3)' }} />
              <input autoFocus className="field" style={{ width: '100%', paddingLeft: 30, height: 32 }} placeholder={`Search ${noun}s…`} aria-label={`Search ${noun}s`} value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          )}
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {shown.map((i) => {
              const on = selected.includes(i.id)
              return (
                <button key={i.id} role="option" aria-selected={on} onClick={() => onToggle(i.id, !on)} className="btn btn-ghost" style={{ width: '100%', height: 40, justifyContent: 'flex-start', gap: 10, textAlign: 'left' }}>
                  {i.icon}
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 500 }}>{i.label}</span>
                    {i.sub && <span className="muted" style={{ display: 'block', fontSize: 11 }}>{i.sub}</span>}
                  </span>
                  {on && <Check className={ic} style={{ color: 'var(--accent)' }} />}
                </button>
              )
            })}
            {shown.length === 0 && <div className="muted" style={{ padding: 12, fontSize: 13 }}>No match.</div>}
          </div>
        </div>
      )}
    </div>
  )
}
