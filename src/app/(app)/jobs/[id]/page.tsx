export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import JobEditor from './JobEditor'

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  let job: Record<string, unknown> | null = null
  let customers: { id: string; name: string }[] = []
  let dbError = ''

  try {
    const [jobRes, custsRes] = await Promise.allSettled([
      supabase
        .from('jobs')
        .select(`
          id, title, description, status, category, is_urgent, quoted_amount, ai_summary, created_at,
          customer_id,
          customers ( id, name ),
          job_visits ( id, scheduled_start, scheduled_end, notes ),
          invoices ( id, status, total_amount )
        `)
        .eq('id', id)
        .single(),
      supabase.from('customers').select('id, name').order('name'),
    ])

    if (jobRes.status === 'fulfilled') {
      if (jobRes.value.error) {
        if (jobRes.value.error.code === 'PGRST116') notFound()
        dbError = jobRes.value.error.message
      } else {
        job = jobRes.value.data
      }
    } else {
      dbError = 'Failed to load job'
    }

    if (custsRes.status === 'fulfilled' && !custsRes.value.error) {
      customers = (custsRes.value.data || []) as { id: string; name: string }[]
    }
  } catch (err) {
    console.error('[jobs/[id]]', err)
    dbError = 'Failed to load job'
  }

  if (!job) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <p style={{ color: 'var(--accent-red)', marginBottom: 16 }}>{dbError}</p>
        <Link href="/schedule" style={{ color: 'var(--accent-blue)' }}>← Schedule</Link>
      </div>
    )
  }

  const customer = job.customers as { id: string; name: string } | null
  const visits = job.job_visits as { id: string; scheduled_start: string; scheduled_end: string; notes: string }[]
  const invoices = job.invoices as { id: string; status: string; total_amount: number }[]

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Nav */}
      <div style={{ padding: '0 var(--space-xl)', paddingTop: 'calc(12px + env(safe-area-inset-top))', marginBottom: 'var(--space-lg)' }}>
        <Link href="/schedule" style={{ color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 4, width: 'fit-content' }}>
          <ChevronLeft size={20} strokeWidth={1.8} />
          <span style={{ fontSize: 16 }}>Schedule</span>
        </Link>
      </div>

      <div style={{ padding: '0 var(--space-xl)' }}>
        <JobEditor
          job={{
            id: job.id as string,
            title: job.title as string || '',
            description: job.description as string || '',
            status: job.status as string || 'pending',
            category: job.category as string || 'Other',
            is_urgent: job.is_urgent as boolean || false,
            quoted_amount: job.quoted_amount as number | null,
            ai_summary: job.ai_summary as string || '',
            customer_id: job.customer_id as string || '',
          }}
          customer={customer}
          customers={customers}
          visits={visits || []}
          invoices={invoices || []}
        />
      </div>
    </div>
  )
}
