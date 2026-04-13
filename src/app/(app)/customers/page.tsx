export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import CustomerList from './CustomerList'

export default async function CustomersPage() {
  const supabase = await createClient()

  let customers: Record<string, unknown>[] = []
  let dbError = ''

  try {
    const { data, error } = await supabase
      .from('customers')
      .select(`
        id, name, address, rating,
        customer_phones ( phone, is_primary ),
        jobs ( id, status, quoted_amount ),
        invoices ( id, status, total_amount )
      `)
      .order('name')

    if (error) {
      console.error('[customers/page]', error)
      dbError = error.message
    } else {
      customers = data || []
    }
  } catch (err) {
    console.error('[customers/page] unexpected:', err)
    dbError = 'Failed to load customers'
  }

  return (
    <div style={{ padding: '0 var(--space-xl)', paddingTop: 'calc(24px + env(safe-area-inset-top))' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2xl)' }}>
        <h1 className="text-page-title">Customers</h1>
        <Link href="/customers/create">
          <button style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px',
            borderRadius: 8, border: 'none', background: '#111', color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            <Plus size={14} strokeWidth={2.5} />
            Add
          </button>
        </Link>
      </div>

      {dbError && <p style={{ color: 'var(--accent-red)', fontSize: 13, marginBottom: 16 }}>Error: {dbError}</p>}

      <CustomerList customers={customers} />
    </div>
  )
}
