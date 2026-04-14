import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await req.json()
    const { scheduled_at, scheduled_end } = body

    const update: Record<string, unknown> = {}
    if (scheduled_at !== undefined) update.scheduled_at = scheduled_at
    if (scheduled_end !== undefined) update.scheduled_end = scheduled_end

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const { error } = await supabase.from('job_visits').update(update).eq('id', id)

    if (error) {
      console.error('[PUT /api/schedule/visits/:id]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PUT /api/schedule/visits/:id] unexpected:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
