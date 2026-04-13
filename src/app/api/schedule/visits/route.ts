import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const body = await req.json()
    const { job_id, scheduled_at, scheduled_end, notes } = body

    if (!job_id || !scheduled_at) {
      return NextResponse.json({ error: 'job_id and scheduled_at required' }, { status: 400 })
    }

    const { data: visit, error } = await supabase
      .from('job_visits')
      .insert({
        job_id,
        scheduled_at,
        scheduled_end: scheduled_end || null,
        notes: notes || null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[POST /api/schedule/visits]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ visit })
  } catch (err) {
    console.error('[POST /api/schedule/visits] unexpected:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
