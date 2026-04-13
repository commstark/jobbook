import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const body = await req.json()
    const { title, description, category, is_urgent, customer_id, quoted_amount, ai_summary } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const { data: job, error } = await supabase
      .from('jobs')
      .insert({
        title,
        description: description || null,
        category: category || 'Other',
        is_urgent: is_urgent || false,
        customer_id: customer_id || null,
        quoted_amount: quoted_amount || null,
        ai_summary: ai_summary || null,
        status: 'pending',
      })
      .select('id')
      .single()

    if (error) {
      console.error('[POST /api/jobs/create-quick]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ job })
  } catch (err) {
    console.error('[POST /api/jobs/create-quick] unexpected:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
