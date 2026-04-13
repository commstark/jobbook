import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import PaymentView from './PaymentView'

export default async function PayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createAdminClient()

  let invoice: Record<string, unknown> | null = null
  let dbError = ''

  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        id, status, total_amount, public_token, created_at,
        jobs ( id, title ),
        customers ( id, name, address ),
        invoice_line_items ( description, quantity, unit_price, amount, sort_order )
      `)
      .eq('public_token', token)
      .single()

    if (error) {
      console.error('[pay/[token]]', error)
      if (error.code === 'PGRST116') notFound()
      dbError = error.message
    } else {
      invoice = data
    }
  } catch (err) {
    console.error('[pay/[token]] unexpected:', err)
    dbError = 'Failed to load invoice'
  }

  if (!invoice) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <p style={{ color: '#dc2626' }}>{dbError || 'Invoice not found'}</p>
      </div>
    )
  }

  // Mark as viewed if it was sent
  if (invoice.status === 'sent') {
    try {
      await supabase
        .from('invoices')
        .update({ status: 'viewed' })
        .eq('id', invoice.id as string)
    } catch (err) {
      console.error('[pay/[token]] mark viewed:', err)
    }
  }

  const job = invoice.jobs as { id: string; title: string } | null
  const customer = invoice.customers as { id: string; name: string; address: string } | null
  const lineItems = ((invoice.invoice_line_items as { description: string; quantity: number; unit_price: number; amount: number; sort_order: number }[]) || [])
    .sort((a, b) => a.sort_order - b.sort_order)

  return (
    <PaymentView
      invoice={{
        id: invoice.id as string,
        status: invoice.status as string,
        total_amount: invoice.total_amount as number,
        public_token: invoice.public_token as string,
        created_at: invoice.created_at as string,
      }}
      job={job}
      customer={customer}
      lineItems={lineItems}
    />
  )
}
