export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import ConversationList from './ConversationList'
import NewConversationButton from './NewConversationButton'

export default async function InboxPage() {
  const supabase = await createClient()

  let conversations: Record<string, unknown>[] = []
  let customers: { id: string; name: string; phone: string }[] = []
  let dbError = ''

  try {
    const [convResult, custResult] = await Promise.allSettled([
      supabase
        .from('conversations')
        .select(`
          id, phone, status, is_unread, last_message_at, customer_id,
          customers ( id, name, rating ),
          messages ( id, body, direction, created_at, media_urls )
        `)
        .eq('status', 'active')
        .order('last_message_at', { ascending: false }),
      supabase
        .from('customers')
        .select('id, name, customer_phones(phone)')
        .order('name'),
    ])

    if (convResult.status === 'fulfilled') {
      if (convResult.value.error) {
        console.error('[inbox] conversations:', convResult.value.error)
        dbError = convResult.value.error.message
      } else {
        conversations = convResult.value.data || []
      }
    } else {
      dbError = 'Failed to load conversations'
    }

    if (custResult.status === 'fulfilled' && !custResult.value.error) {
      customers = (custResult.value.data || []).map((c) => ({
        id: c.id,
        name: c.name || '',
        phone: (c.customer_phones as { phone: string }[])?.[0]?.phone || '',
      }))
    }
  } catch (err) {
    console.error('[inbox] unexpected:', err)
    dbError = 'Failed to load inbox'
  }

  return (
    <div style={{ padding: '0 var(--space-xl)', paddingTop: 'calc(24px + env(safe-area-inset-top))' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2xl)' }}>
        <h1 className="text-page-title">Inbox</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <NewConversationButton customers={customers} />
          <Link href="/settings" style={{ color: 'var(--text-secondary)' }}>
            <Settings size={22} strokeWidth={1.8} />
          </Link>
        </div>
      </div>

      {dbError && (
        <p style={{ color: 'var(--accent-red)', fontSize: 13, marginBottom: 16 }}>Error: {dbError}</p>
      )}

      <ConversationList conversations={conversations} />
    </div>
  )
}
