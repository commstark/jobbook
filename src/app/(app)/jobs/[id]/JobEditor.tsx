'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const CATEGORIES = ['Leak', 'Install', 'Repair', 'Drain', 'New Construction', 'Inspection', 'Other']
const STATUSES = ['pending', 'scheduled', 'in_progress', 'done', 'invoiced', 'paid', 'cancelled']

interface Job {
  id: string
  title: string
  description: string
  status: string
  category: string
  is_urgent: boolean
  quoted_amount: number | null
  ai_summary: string
  customer_id: string
}

interface Props {
  job: Job
  customer: { id: string; name: string } | null
  customers: { id: string; name: string }[]
  visits: { id: string; scheduled_start: string; scheduled_end: string; notes: string }[]
  invoices: { id: string; status: string; total_amount: number }[]
}

export default function JobEditor({ job, customer, customers, visits, invoices }: Props) {
  const router = useRouter()

  const [title, setTitle] = useState(job.title)
  const [description, setDescription] = useState(job.description)
  const [status, setStatus] = useState(job.status)
  const [category, setCategory] = useState(job.category)
  const [isUrgent, setIsUrgent] = useState(job.is_urgent)
  const [quotedAmount, setQuotedAmount] = useState(job.quoted_amount ? String(job.quoted_amount) : '')
  const [customerId, setCustomerId] = useState(job.customer_id)
  const [customerSearch, setCustomerSearch] = useState(customer?.name || '')
  const [showCustomerList, setShowCustomerList] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  )

  async function save() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          status,
          category,
          is_urgent: isUrgent,
          quoted_amount: quotedAmount ? parseFloat(quotedAmount) : null,
          customer_id: customerId || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const statusColor = (s: string) => {
    switch (s) {
      case 'paid': return 'var(--accent-green)'
      case 'invoiced': return 'var(--accent-blue)'
      case 'in_progress': return 'var(--accent-orange)'
      case 'cancelled': return 'var(--text-muted)'
      default: return 'var(--text-secondary)'
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      {/* Title + urgent */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span className="text-section-header">Title</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isUrgent}
              onChange={(e) => setIsUrgent(e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            <span style={{ fontSize: 13, color: isUrgent ? 'var(--accent-red)' : 'var(--text-muted)', fontWeight: 500 }}>Urgent</span>
          </label>
        </div>
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Job title"
          style={{ fontSize: 17, fontWeight: 600 }}
        />
      </div>

      {/* Status */}
      <div>
        <span className="text-section-header" style={{ display: 'block', marginBottom: 8 }}>Status</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                border: `1px solid ${status === s ? statusColor(s) : 'var(--border)'}`,
                background: status === s ? `${statusColor(s)}18` : 'transparent',
                color: status === s ? statusColor(s) : 'var(--text-muted)',
                fontWeight: status === s ? 600 : 400,
                textTransform: 'capitalize',
              }}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div>
        <span className="text-section-header" style={{ display: 'block', marginBottom: 8 }}>Category</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                border: `1px solid ${category === cat ? 'var(--accent-action)' : 'var(--border)'}`,
                background: category === cat ? 'var(--accent-action)' : 'transparent',
                color: category === cat ? '#fff' : 'var(--text-muted)',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Customer */}
      <div>
        <span className="text-section-header" style={{ display: 'block', marginBottom: 6 }}>Customer</span>
        {customerId && !showCustomerList ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href={`/customers/${customerId}`} style={{ color: 'var(--accent-blue)', fontSize: 15 }}>
              {customerSearch}
            </Link>
            <button
              onClick={() => { setCustomerId(''); setCustomerSearch(''); setShowCustomerList(true) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13 }}
            >
              Change
            </button>
          </div>
        ) : (
          <>
            <input
              className="input"
              placeholder="Search customers..."
              value={customerSearch}
              onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerList(true) }}
              onFocus={() => setShowCustomerList(true)}
              style={{ marginBottom: 6 }}
            />
            {showCustomerList && customerSearch && filteredCustomers.length > 0 && (
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, overflow: 'hidden' }}>
                {filteredCustomers.slice(0, 5).map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setCustomerId(c.id); setCustomerSearch(c.name); setShowCustomerList(false) }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '10px 14px', border: 'none', background: 'transparent',
                      fontSize: 14, cursor: 'pointer',
                    }}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Quoted amount */}
      <div>
        <span className="text-section-header" style={{ display: 'block', marginBottom: 6 }}>Quoted Amount ($)</span>
        <input
          type="number"
          className="input"
          value={quotedAmount}
          onChange={(e) => setQuotedAmount(e.target.value)}
          onFocus={(e) => e.target.select()}
          placeholder="0.00"
        />
      </div>

      {/* Description */}
      <div>
        <span className="text-section-header" style={{ display: 'block', marginBottom: 6 }}>Description</span>
        <textarea
          className="input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Job description..."
          style={{ resize: 'none' }}
        />
      </div>

      {/* Visits */}
      {visits.length > 0 && (
        <div>
          <span className="text-section-header" style={{ display: 'block', marginBottom: 8 }}>Scheduled Visits</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {visits.map(v => (
              <div key={v.id} className="card" style={{ padding: '10px 14px' }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                  {new Date(v.scheduled_start).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })}
                  {' '}
                  {new Date(v.scheduled_start).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  {' – '}
                  {new Date(v.scheduled_end).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </p>
                {v.notes && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{v.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoices */}
      {invoices.length > 0 && (
        <div>
          <span className="text-section-header" style={{ display: 'block', marginBottom: 8 }}>Invoices</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {invoices.map(inv => (
              <Link key={inv.id} href={`/invoices/${inv.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px' }}>
                  <span className="badge" style={{
                    background: inv.status === 'paid' ? 'rgba(22,163,74,0.1)' : 'rgba(37,99,235,0.1)',
                    color: inv.status === 'paid' ? 'var(--accent-green)' : 'var(--accent-blue)',
                    textTransform: 'capitalize',
                  }}>{inv.status}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-green)' }}>
                    ${Number(inv.total_amount).toFixed(0)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {error && <p className="error-text">{error}</p>}

      <button
        onClick={save}
        disabled={saving}
        className="btn-primary"
      >
        {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
      </button>
    </div>
  )
}
