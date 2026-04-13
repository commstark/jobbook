import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await req.json()
    const { name, address, rating, rating_note, notes, phone } = body

    // Update customer fields
    const customerUpdate: Record<string, unknown> = {}
    if (name !== undefined) customerUpdate.name = name
    if (address !== undefined) customerUpdate.address = address
    if (rating !== undefined) customerUpdate.rating = rating
    if (rating_note !== undefined) customerUpdate.rating_note = rating_note
    if (notes !== undefined) customerUpdate.notes = notes

    if (Object.keys(customerUpdate).length > 0) {
      const { error } = await supabase
        .from('customers')
        .update(customerUpdate)
        .eq('id', id)

      if (error) {
        console.error('[PUT /api/customers/:id]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // Update phone separately (upsert primary phone)
    if (phone !== undefined) {
      // Check for existing primary phone
      const { data: existing } = await supabase
        .from('customer_phones')
        .select('id')
        .eq('customer_id', id)
        .eq('is_primary', true)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('customer_phones')
          .update({ phone })
          .eq('id', existing.id)
      } else if (phone) {
        await supabase
          .from('customer_phones')
          .insert({ customer_id: id, phone, is_primary: true })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PUT /api/customers/:id] unexpected:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
