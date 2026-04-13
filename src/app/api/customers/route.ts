import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const body = await req.json()
    const { name, phone, address } = body

    if (!name && !phone) {
      return NextResponse.json({ error: 'Name or phone required' }, { status: 400 })
    }

    const { data: customer, error } = await supabase
      .from('customers')
      .insert({ name: name || null, address: address || null })
      .select('id')
      .single()

    if (error) {
      console.error('[POST /api/customers]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (phone) {
      const { error: phoneError } = await supabase
        .from('customer_phones')
        .insert({ customer_id: customer.id, phone, is_primary: true })

      if (phoneError) {
        console.error('[POST /api/customers] phone insert:', phoneError)
        // Don't fail the whole request — customer was created
      }
    }

    return NextResponse.json({ customer })
  } catch (err) {
    console.error('[POST /api/customers] unexpected:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
