import type { Disposition, LeadStatus } from '../data/types'

export interface DispositionDef {
  key: Disposition
  label: string
  status: LeadStatus
  connected: boolean // a human was reached
  tone: string
}

export const dispositions: DispositionDef[] = [
  { key: 'no_answer', label: 'No answer', status: 'contacted', connected: false, tone: 'bg-slate-100 text-slate-700' },
  { key: 'voicemail', label: 'Left voicemail', status: 'contacted', connected: false, tone: 'bg-slate-100 text-slate-700' },
  { key: 'wrong_number', label: 'Wrong number', status: 'lost', connected: false, tone: 'bg-red-100 text-red-700' },
  { key: 'callback', label: 'Callback requested', status: 'callback', connected: true, tone: 'bg-amber-100 text-amber-800' },
  { key: 'not_interested', label: 'Not interested', status: 'lost', connected: true, tone: 'bg-red-100 text-red-700' },
  { key: 'won', label: 'Sale completed', status: 'won', connected: true, tone: 'bg-green-100 text-green-700' },
  { key: 'dnc', label: 'Do not contact', status: 'lost', connected: true, tone: 'bg-red-200 text-red-800' },
]

export const dispositionDef = (k: Disposition) => dispositions.find((d) => d.key === k)!

export const lostReasons = ['Too expensive', 'Bought elsewhere', 'No longer needs it', 'Product concerns', 'Bad past experience', 'Other']
