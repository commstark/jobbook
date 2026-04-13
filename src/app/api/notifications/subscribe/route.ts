import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const body = await req.json()
    const { endpoint, p256dh, auth } = body

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: 'endpoint, p256dh, and auth required' }, { status: 400 })
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({ user_id: session.user.id, endpoint, p256dh, auth }, { onConflict: 'endpoint' })

    if (error) {
      console.error('[POST /api/notifications/subscribe]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/notifications/subscribe] unexpected:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
