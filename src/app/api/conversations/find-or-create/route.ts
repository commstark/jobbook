import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const body = await req.json()
    const { customer_id, phone } = body

    if (!customer_id && !phone) {
      return NextResponse.json({ error: 'customer_id or phone required' }, { status: 400 })
    }

    // Try to find existing conversation
    let query = supabase.from('conversations').select('id')
    if (customer_id) {
      query = query.eq('customer_id', customer_id)
    } else {
      query = query.eq('phone', phone)
    }

    const { data: existing, error: findError } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle()

    if (findError) {
      console.error('[POST /api/conversations/find-or-create] find:', findError)
      return NextResponse.json({ error: findError.message }, { status: 500 })
    }

    if (existing) {
      return NextResponse.json({ conversation: existing })
    }

    // Create new conversation
    let resolvedPhone = phone
    if (!resolvedPhone && customer_id) {
      const { data: phoneRow } = await supabase
        .from('customer_phones')
        .select('phone')
        .eq('customer_id', customer_id)
        .eq('is_primary', true)
        .maybeSingle()
      resolvedPhone = phoneRow?.phone || null
    }

    if (!resolvedPhone) {
      return NextResponse.json({ error: 'No phone number found for customer' }, { status: 400 })
    }

    const { data: conversation, error: createError } = await supabase
      .from('conversations')
      .insert({
        customer_id: customer_id || null,
        phone: resolvedPhone,
        status: 'open',
      })
      .select('id')
      .single()

    if (createError) {
      console.error('[POST /api/conversations/find-or-create] create:', createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    return NextResponse.json({ conversation })
  } catch (err) {
    console.error('[POST /api/conversations/find-or-create] unexpected:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
