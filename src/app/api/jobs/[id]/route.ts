import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await req.json()
    const { title, description, status, category, is_urgent, quoted_amount, customer_id } = body

    const update: Record<string, unknown> = {}
    if (title !== undefined) update.title = title
    if (description !== undefined) update.description = description
    if (status !== undefined) update.status = status
    if (category !== undefined) update.category = category
    if (is_urgent !== undefined) update.is_urgent = is_urgent
    if (quoted_amount !== undefined) update.quoted_amount = quoted_amount
    if (customer_id !== undefined) update.customer_id = customer_id

    const { error } = await supabase
      .from('jobs')
      .update(update)
      .eq('id', id)

    if (error) {
      console.error('[PUT /api/jobs/:id]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PUT /api/jobs/:id] unexpected:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
