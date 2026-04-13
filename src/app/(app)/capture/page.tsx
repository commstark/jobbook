export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import VoiceCapture from './VoiceCapture'

export default async function CapturePage() {
  const supabase = await createClient()

  let users: { id: string; name: string }[] = []
  let customers: { id: string; name: string; phone: string }[] = []

  try {
    const [usersRes, custsRes] = await Promise.allSettled([
      supabase.from('users').select('id, name'),
      supabase.from('customers').select('id, name, customer_phones(phone)').order('name'),
    ])
    if (usersRes.status === 'fulfilled' && !usersRes.value.error) {
      users = usersRes.value.data || []
    }
    if (custsRes.status === 'fulfilled' && !custsRes.value.error) {
      customers = (custsRes.value.data || []).map((c) => ({
        id: c.id,
        name: c.name || '',
        phone: (c.customer_phones as { phone: string }[])?.[0]?.phone || '',
      }))
    }
  } catch (err) {
    console.error('[capture/page]', err)
  }

  return <VoiceCapture users={users} customers={customers} />
}
