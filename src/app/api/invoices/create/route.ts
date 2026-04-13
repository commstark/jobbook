import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const body = await req.json()
    const { job_id, customer_id, line_items } = body

    if (!job_id || !customer_id) {
      return NextResponse.json({ error: 'job_id and customer_id required' }, { status: 400 })
    }

    const items = Array.isArray(line_items) ? line_items : []
    const totalAmount = items.reduce((s: number, i: { quantity: number; unit_price: number }) => {
      return s + Number(i.quantity) * Number(i.unit_price)
    }, 0)

    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .insert({
        job_id,
        customer_id,
        status: 'draft',
        total_amount: totalAmount,
      })
      .select('id')
      .single()

    if (invError) {
      console.error('[POST /api/invoices/create]', invError)
      return NextResponse.json({ error: invError.message }, { status: 500 })
    }

    if (items.length > 0) {
      const lineItemRows = items.map((item: { description: string; quantity: number; unit_price: number }, idx: number) => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: Number(item.quantity) * Number(item.unit_price),
        sort_order: idx,
      }))

      const { error: itemsError } = await supabase.from('invoice_line_items').insert(lineItemRows)
      if (itemsError) {
        console.error('[POST /api/invoices/create] line items:', itemsError)
      }
    }

    return NextResponse.json({ invoice })
  } catch (err) {
    console.error('[POST /api/invoices/create] unexpected:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
