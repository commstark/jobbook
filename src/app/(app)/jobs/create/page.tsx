export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import CreateJobForm from './CreateJobForm'

export default async function CreateJobPage({ searchParams }: { searchParams: Promise<{ date?: string; hour?: string; customer_id?: string; customer_name?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()

  let customers: { id: string; name: string }[] = []

  try {
    const { data, error } = await supabase.from('customers').select('id, name').order('name')
    if (!error && data) customers = data
  } catch (err) {
    console.error('[jobs/create]', err)
  }

  const prefilledHour = params.hour ? parseInt(params.hour) : undefined

  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ padding: '0 var(--space-xl)', paddingTop: 'calc(12px + env(safe-area-inset-top))', marginBottom: 'var(--space-lg)' }}>
        <Link href="/schedule" style={{ color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 4, width: 'fit-content' }}>
          <ChevronLeft size={20} strokeWidth={1.8} />
          <span style={{ fontSize: 16 }}>Schedule</span>
        </Link>
      </div>

      <div style={{ padding: '0 var(--space-xl)' }}>
        <h1 className="text-page-title" style={{ marginBottom: 'var(--space-2xl)' }}>New Job</h1>
        <CreateJobForm
          customers={customers}
          prefilledCustomerId={params.customer_id || ''}
          prefilledCustomerName={params.customer_name || ''}
          prefilledDate={params.date || ''}
          prefilledHour={prefilledHour}
        />
      </div>
    </div>
  )
}
