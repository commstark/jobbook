import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await req.json()
    const { line_items, total_amount } = body

    // Update total
    if (total_amount !== undefined) {
      const { error } = await supabase
        .from('invoices')
        .update({ total_amount })
        .eq('id', id)

      if (error) {
        console.error('[PUT /api/invoices/:id]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // Replace line items
    if (Array.isArray(line_items)) {
      await supabase.from('invoice_line_items').delete().eq('invoice_id', id)

      const rows = line_items.map((item: { description: string; quantity: number; unit_price: number }, idx: number) => ({
        invoice_id: id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: Number(item.quantity) * Number(item.unit_price),
        sort_order: idx,
      }))

      if (rows.length > 0) {
        const { error: itemsError } = await supabase.from('invoice_line_items').insert(rows)
        if (itemsError) {
          console.error('[PUT /api/invoices/:id] line items:', itemsError)
          return NextResponse.json({ error: itemsError.message }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PUT /api/invoices/:id] unexpected:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
