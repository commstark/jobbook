'use client'

import Link from 'next/link'

interface Message {
  id: string
  body: string | null
  direction: string
  created_at: string
  media_urls: string[] | null
}

interface Conversation {
  id: string
  phone: string
  status: string
  is_unread: boolean
  last_message_at: string
  customer_id: string | null
  customers: { id: string; name: string; rating: string } | null
  messages: Message[]
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return new Date(iso).toLocaleDateString('en-CA', { weekday: 'short' })
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

function initials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

export default function ConversationList({ conversations }: { conversations: Record<string, unknown>[] }) {
  const convs = conversations as unknown as Conversation[]

  if (convs.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No active conversations</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {convs.map((conv) => {
        const customer = conv.customers
        const name = customer?.name || conv.phone
        const msgs = (conv.messages || []).sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        const lastMsg = msgs[0]
        const preview = lastMsg?.media_urls?.length
          ? `📷 Photo`
          : lastMsg?.body || ''
        const ini = initials(customer?.name || null)
        const unread = conv.is_unread

        return (
          <Link key={conv.id} href={`/inbox/${conv.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{
              display: 'flex', gap: 12, alignItems: 'center',
              padding: '12px 0',
              borderBottom: '1px solid var(--border-light)',
              borderLeft: unread ? '3px solid var(--accent-blue)' : '3px solid transparent',
              paddingLeft: unread ? 10 : 0,
            }}>
              {/* Avatar */}
              <div style={{
                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                background: customer ? 'var(--bg-secondary)' : 'rgba(217,119,6,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 600, fontSize: 16,
                color: customer ? 'var(--text-secondary)' : 'var(--accent-orange)',
              }}>
                {ini}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                  <p style={{ fontWeight: unread ? 700 : 500, fontSize: 15, letterSpacing: '-0.2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {name}
                  </p>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 8 }}>
                    {conv.last_message_at ? relativeTime(conv.last_message_at) : ''}
                  </span>
                </div>
                <p style={{
                  fontSize: 13, color: unread ? 'var(--text-primary)' : 'var(--text-secondary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontWeight: unread ? 500 : 400,
                }}>
                  {preview || <span style={{ color: 'var(--text-muted)' }}>No messages yet</span>}
                </p>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
