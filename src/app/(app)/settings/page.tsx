export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from './LogoutButton'

export default async function SettingsPage() {
  const supabase = await createClient()

  let user: { email: string | null; name: string | null } = { email: null, name: null }
  let dbError = ''

  // Jobs completed but no invoice sent
  let needsInvoice: { id: string; title: string; customer_name: string | null; created_at: string }[] = []
  // Invoices sent but not paid
  let unpaidInvoices: { id: string; total_amount: number; sent_at: string | null; job_title: string | null; customer_name: string | null }[] = []

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) redirect('/login')

    const [userRes, jobsRes, invoicesRes] = await Promise.allSettled([
      supabase.from('users').select('name, email').eq('id', session.user.id).maybeSingle(),
      supabase.from('jobs').select('id, title, created_at, status, customers(name), invoices(id, status)').eq('status', 'completed'),
      supabase.from('invoices').select('id, total_amount, sent_at, jobs(title), customers(name)').in('status', ['sent', 'viewed']),
    ])

    if (userRes.status === 'fulfilled' && !userRes.value.error && userRes.value.data) {
      user = userRes.value.data
    } else if (userRes.status === 'fulfilled' && !userRes.value.data) {
      user = { email: session.user.email || null, name: null }
    }

    if (jobsRes.status === 'fulfilled' && !jobsRes.value.error) {
      const jobs = (jobsRes.value.data || []) as unknown as {
        id: string; title: string; created_at: string; status: string;
        customers: { name: string } | null;
        invoices: { id: string; status: string }[]
      }[]
      // Filter: completed jobs where no invoice has been sent/paid
      needsInvoice = jobs
        .filter(j => {
          const invs = j.invoices || []
          return !invs.some(i => ['sent', 'viewed', 'paid'].includes(i.status))
        })
        .map(j => ({ id: j.id, title: j.title, customer_name: j.customers?.name || null, created_at: j.created_at }))
    }

    if (invoicesRes.status === 'fulfilled' && !invoicesRes.value.error) {
      unpaidInvoices = ((invoicesRes.value.data || []) as unknown as {
        id: string; total_amount: number; sent_at: string | null;
        jobs: { title: string } | null;
        customers: { name: string } | null;
      }[]).map(i => ({
        id: i.id,
        total_amount: i.total_amount,
        sent_at: i.sent_at,
        job_title: i.jobs?.title || null,
        customer_name: i.customers?.name || null,
      }))
    }
  } catch (err) {
    console.error('[settings] unexpected:', err)
    dbError = 'Failed to load settings'
  }

  function daysSince(iso: string | null): number {
    if (!iso) return 0
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  }

  return (
    <div style={{ padding: '0 var(--space-xl)', paddingTop: 'calc(24px + env(safe-area-inset-top))', paddingBottom: 100 }}>
      <h1 className="text-page-title" style={{ marginBottom: 'var(--space-2xl)' }}>Settings</h1>

      {dbError && <p style={{ color: 'var(--accent-red)', fontSize: 13, marginBottom: 16 }}>{dbError}</p>}

      {/* Account */}
      <div style={{ marginBottom: 'var(--space-2xl)' }}>
        <span className="text-section-header" style={{ display: 'block', marginBottom: 12 }}>Account</span>
        <div className="card">
          {user.name && <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{user.name}</p>}
          {user.email && <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{user.email}</p>}
        </div>
      </div>

      {/* Needs Attention */}
      <div style={{ marginBottom: 'var(--space-2xl)' }}>
        <span className="text-section-header" style={{ display: 'block', marginBottom: 12 }}>Needs Attention</span>

        {/* Invoices not sent */}
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#dc2626' }}>Invoices not sent</span>
            {needsInvoice.length > 0 && (
              <span style={{
                minWidth: 20, height: 20, borderRadius: 10, background: '#dc2626',
                color: '#fff', fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px',
              }}>
                {needsInvoice.length}
              </span>
            )}
          </div>
          {needsInvoice.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>All clear</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {needsInvoice.map(j => (
                <Link key={j.id} href={`/jobs/${j.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="card" style={{ borderLeft: '3px solid #dc2626' }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{j.title}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{j.customer_name || 'No customer'}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {new Date(j.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Invoices not paid */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#d97706' }}>Invoices not paid</span>
            {unpaidInvoices.length > 0 && (
              <span style={{
                minWidth: 20, height: 20, borderRadius: 10, background: '#d97706',
                color: '#fff', fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px',
              }}>
                {unpaidInvoices.length}
              </span>
            )}
          </div>
          {unpaidInvoices.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>All clear</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {unpaidInvoices.map(inv => (
                <Link key={inv.id} href={`/invoices/${inv.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="card" style={{ borderLeft: '3px solid #d97706' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{inv.job_title || 'Invoice'}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{inv.customer_name || 'No customer'}</p>
                        {inv.sent_at && (
                          <p style={{ fontSize: 11, color: '#d97706', marginTop: 2 }}>
                            Sent {daysSince(inv.sent_at)} day{daysSince(inv.sent_at) !== 1 ? 's' : ''} ago
                          </p>
                        )}
                      </div>
                      <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-green)' }}>
                        ${Number(inv.total_amount).toFixed(0)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <LogoutButton />
    </div>
  )
}
