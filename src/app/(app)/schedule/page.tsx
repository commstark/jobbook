export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import ScheduleView from './ScheduleView'

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date } = await searchParams
  const selectedDate = date || new Date().toISOString().split('T')[0]

  const supabase = await createClient()

  let visits: Parameters<typeof ScheduleView>[0]['visits'] = []
  let dbError = ''

  try {
    const startOfDay = `${selectedDate}T00:00:00`
    const endOfDay = `${selectedDate}T23:59:59`

    const { data, error } = await supabase
      .from('job_visits')
      .select(`
        id,
        scheduled_at,
        scheduled_end,
        drive_time_minutes,
        jobs (
          id,
          title,
          status,
          is_urgent,
          quoted_amount,
          category,
          customers ( id, name ),
          invoices ( status )
        )
      `)
      .gte('scheduled_at', startOfDay)
      .lte('scheduled_at', endOfDay)
      .order('scheduled_at', { ascending: true })

    if (error) {
      console.error('[schedule/page]', error)
      dbError = error.message
    } else {
      visits = (data || []) as unknown as typeof visits
    }
  } catch (err) {
    console.error('[schedule/page] unexpected:', err)
    dbError = 'Failed to load schedule'
  }

  return (
    <div style={{ padding: '0 var(--space-xl)', paddingTop: 'calc(24px + env(safe-area-inset-top))' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2xl)' }}>
        <h1 className="text-page-title">Schedule</h1>
        <Link href="/settings" style={{ color: 'var(--text-secondary)' }}>
          <Settings size={22} strokeWidth={1.8} />
        </Link>
      </div>

      {dbError && (
        <p style={{ color: 'var(--accent-red)', fontSize: 13, marginBottom: 16 }}>
          Error: {dbError}
        </p>
      )}

      <ScheduleView visits={visits} selectedDate={selectedDate} />
    </div>
  )
}
