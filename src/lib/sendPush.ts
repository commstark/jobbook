import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

webpush.setVapidDetails(
  'mailto:noreply@jobbook.app',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function sendPushToAll(payload: { title: string; body: string; url?: string }) {
  try {
    const supabase = createAdminClient()
    const { data: subs, error } = await supabase.from('push_subscriptions').select('endpoint, p256dh, auth')
    if (error || !subs?.length) return

    const message = JSON.stringify(payload)

    await Promise.allSettled(
      subs.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          message
        ).catch((err) => console.error('[sendPush] failed for', sub.endpoint, err.message))
      )
    )
  } catch (err) {
    console.error('[sendPush] unexpected:', err)
  }
}
