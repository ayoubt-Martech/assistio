import type { Client } from '../data/types'

export default function ClientBadge({ client, size = 'sm' }: { client: Client; size?: 'sm' | 'lg' }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-md font-bold text-white ${size === 'lg' ? 'h-10 w-10 text-sm' : 'h-6 w-6 text-[10px]'}`}
      style={{ backgroundColor: client.settings.color }}
    >
      {client.settings.logo}
    </span>
  )
}
