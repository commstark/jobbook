export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Phone } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import BackButton from '@/components/BackButton'
import MessageThread from './MessageThread'

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  let conversation: Record<string, unknown> | null = null
  let messages: Record<string, unknown>[] = []
  let dbError = ''

  try {
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .select('id, phone, customer_id, customers(id, name, customer_phones(phone))')
      .eq('id', id)
      .single()

    if (convError) {
      console.error('[inbox/[id]]', convError)
      dbError = convError.message
    } else if (!conv) {
      notFound()
    } else {
      conversation = conv

      const { data: msgs, error: msgsError } = await supabase
        .from('messages')
        .select('id, conversation_id, direction, body, media_urls, created_at')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true })

      if (msgsError) {
        console.error('[inbox/[id]] messages:', msgsError)
      } else {
        messages = msgs || []
      }
    }
  } catch (err) {
    console.error('[inbox/[id]] unexpected:', err)
    dbError = 'Failed to load conversation'
  }

  if (!conversation) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <p style={{ color: 'var(--accent-red)', marginBottom: 16 }}>
          {dbError || 'Conversation not found'}
        </p>
        <Link href="/inbox" style={{ color: 'var(--accent-blue)' }}>← Back to Inbox</Link>
      </div>
    )
  }

  const customer = conversation.customers as { id: string; name: string; customer_phones: { phone: string }[] } | null
  const name = customer?.name || (conversation.phone as string)
  const phone = customer?.customer_phones?.[0]?.phone || (conversation.phone as string)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{
        padding: '0 var(--space-xl)',
        paddingTop: 'calc(12px + env(safe-area-inset-top))',
        paddingBottom: 12,
        borderBottom: '1px solid var(--border-light)',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'var(--bg-primary)',
        flexShrink: 0,
      }}>
        <BackButton fallback="/inbox" label="" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link href={customer ? `/customers/${customer.id}` : '#'} style={{ textDecoration: 'none' }}>
            <p style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {name}
            </p>
          </Link>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{phone}</p>
        </div>
        {phone && (
          <a href={`tel:${phone}`} style={{ color: 'var(--accent-blue)' }}>
            <Phone size={20} strokeWidth={1.8} />
          </a>
        )}
      </div>

      <MessageThread
        conversationId={id}
        initialMessages={messages as unknown as Parameters<typeof MessageThread>[0]['initialMessages']}
        customerName={name}
      />
    </div>
  )
}
