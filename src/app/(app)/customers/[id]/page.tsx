export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import BackButton from '@/components/BackButton'
import CustomerEditor from './CustomerEditor'
import { computeJobStatus, jobStatusColor, jobStatusLabel } from '@/lib/jobStatus'

export default async function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  let customer: Record<string, unknown> | null = null
  let dbError = ''

  try {
    const { data, error } = await supabase
      .from('customers')
      .select(`
        id, name, address, rating, rating_note, notes,
        customer_phones ( id, phone, label, is_primary ),
        jobs ( id, title, status, is_urgent, quoted_amount, created_at, invoices ( id, status ) ),
        invoices ( id, status, total_amount )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('[customer/[id]]', error)
      if (error.code === 'PGRST116') notFound()
      dbError = error.message
    } else {
      customer = data
    }
  } catch (err) {
    console.error('[customer/[id]] unexpected:', err)
    dbError = 'Failed to load customer'
  }

  if (!customer) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <p style={{ color: 'var(--accent-red)', marginBottom: 16 }}>{dbError}</p>
        <Link href="/customers" style={{ color: 'var(--accent-blue)' }}>← Customers</Link>
      </div>
    )
  }

  const phones = customer.customer_phones as { id: string; phone: string; label: string | null; is_primary: boolean }[]
  const primaryPhone = phones?.find(p => p.is_primary) || phones?.[0]
  const invoices = customer.invoices as { id: string; status: string; total_amount: number }[]
  const jobs = customer.jobs as { id: string; title: string; status: string; is_urgent: boolean; quoted_amount: number | null; created_at: string; invoices: { id: string; status: string }[] }[]

  const totalRevenue = invoices?.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total_amount), 0) || 0
  const amountOwing = invoices?.filter(i => ['sent', 'viewed'].includes(i.status)).reduce((s, i) => s + Number(i.total_amount), 0) || 0

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Nav */}
      <div style={{ padding: '0 var(--space-xl)', paddingTop: 'calc(12px + env(safe-area-inset-top))', marginBottom: 'var(--space-lg)' }}>
        <BackButton fallback="/customers" label="Customers" />
      </div>

      {/* Stats */}
      <div style={{ padding: '0 var(--space-xl)', marginBottom: 'var(--space-lg)' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          gap: 1, background: 'var(--border)', borderRadius: 10, overflow: 'hidden',
        }}>
          {[
            { label: 'Jobs', value: jobs?.length || 0 },
            { label: 'Owing', value: `$${amountOwing.toFixed(0)}`, color: amountOwing > 0 ? 'var(--accent-orange)' : undefined },
            { label: 'Lifetime', value: `$${totalRevenue.toFixed(0)}`, color: 'var(--accent-green)' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--bg-secondary)', padding: 12, textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 2, color: s.color || 'var(--text-primary)' }}>{s.value}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Editable profile — CustomerEditor owns the name/avatar/all fields */}
      <div style={{ padding: '0 var(--space-xl)', marginBottom: 'var(--space-2xl)' }}>
        <CustomerEditor
          customerId={customer.id as string}
          initialName={customer.name as string || ''}
          initialAddress={customer.address as string || ''}
          initialPhone={primaryPhone?.phone || ''}
          initialRating={customer.rating as string || 'neutral'}
          initialRatingNote={customer.rating_note as string || ''}
          initialNotes={customer.notes as string || ''}
        />
      </div>

      {/* Job history */}
      <div style={{ padding: '0 var(--space-xl)' }}>
        <span className="text-section-header" style={{ display: 'block', marginBottom: 12 }}>Job History</span>
        {!jobs || jobs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No jobs yet</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {jobs
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map(job => {
                const cs = computeJobStatus(job.status, job.invoices || [])
                const color = jobStatusColor(cs)
                return (
                  <Link key={job.id} href={`/jobs/${job.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="card" style={{ borderLeft: `3px solid ${color}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <p className="text-card-title" style={{ marginBottom: 4 }}>{job.title}</p>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              {new Date(job.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className="badge" style={{
                              background: `${color}18`,
                              color,
                              textTransform: 'capitalize',
                            }}>
                              {jobStatusLabel(cs)}
                            </span>
                          </div>
                        </div>
                        {job.quoted_amount && (
                          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-green)' }}>
                            ${Number(job.quoted_amount).toFixed(0)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
          </div>
        )}
      </div>
    </div>
  )
}
