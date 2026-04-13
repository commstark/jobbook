export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import InvoiceEditor from './InvoiceEditor'

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  let invoice: Record<string, unknown> | null = null
  let dbError = ''

  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        id, status, total_amount, sent_at, paid_at, public_token, created_at,
        jobs ( id, title, customer_id ),
        customers ( id, name, address ),
        invoice_line_items ( id, description, quantity, unit_price, amount, sort_order )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('[invoices/[id]]', error)
      if (error.code === 'PGRST116') notFound()
      dbError = error.message
    } else {
      invoice = data
    }
  } catch (err) {
    console.error('[invoices/[id]] unexpected:', err)
    dbError = 'Failed to load invoice'
  }

  if (!invoice) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <p style={{ color: 'var(--accent-red)', marginBottom: 16 }}>{dbError}</p>
        <Link href="/schedule" style={{ color: 'var(--accent-blue)' }}>← Schedule</Link>
      </div>
    )
  }

  const job = invoice.jobs as { id: string; title: string; customer_id: string } | null
  const customer = invoice.customers as { id: string; name: string; address: string } | null
  const lineItems = (invoice.invoice_line_items as { id: string; description: string; quantity: number; unit_price: number; amount: number; sort_order: number }[]) || []

  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ padding: '0 var(--space-xl)', paddingTop: 'calc(12px + env(safe-area-inset-top))', marginBottom: 'var(--space-lg)' }}>
        <Link
          href={job ? `/jobs/${job.id}` : '/schedule'}
          style={{ color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 4, width: 'fit-content' }}
        >
          <ChevronLeft size={20} strokeWidth={1.8} />
          <span style={{ fontSize: 16 }}>{job ? 'Job' : 'Schedule'}</span>
        </Link>
      </div>

      <div style={{ padding: '0 var(--space-xl)' }}>
        <InvoiceEditor
          invoice={{
            id: invoice.id as string,
            status: invoice.status as string,
            total_amount: invoice.total_amount as number,
            sent_at: invoice.sent_at as string | null,
            paid_at: invoice.paid_at as string | null,
            public_token: invoice.public_token as string,
          }}
          job={job}
          customer={customer}
          lineItems={lineItems.sort((a, b) => a.sort_order - b.sort_order)}
        />
      </div>
    </div>
  )
}
