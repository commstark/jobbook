'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { computeJobStatus, jobStatusColor, jobStatusLabel } from '@/lib/jobStatus'

const CATEGORIES = ['Leak', 'Install', 'Repair', 'Drain', 'New Construction', 'Inspection', 'Other']

interface Visit {
  id: string
  scheduled_at: string
  scheduled_end: string | null
  notes: string | null
}

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
  visits: Visit[]
  invoices: { id: string; status: string; total_amount: number }[]
}

function toLocalDate(iso: string) {
  // "2026-04-13T09:00:00" → "2026-04-13"
  return iso.slice(0, 10)
}
function toLocalTime(iso: string) {
  // "2026-04-13T09:00:00" → "09:00"
  return iso.slice(11, 16)
}
function buildISO(date: string, time: string) {
  return `${date}T${time}:00`
}

export default function JobEditor({ job, customer, customers, visits: initialVisits, invoices }: Props) {
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

  const [visits, setVisits] = useState(initialVisits)
  const [editingVisit, setEditingVisit] = useState<string | null>(null)
  const [visitEdits, setVisitEdits] = useState<Record<string, { date: string; startTime: string; endTime: string }>>({})

  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const computedStatus = computeJobStatus(status, invoices)
  const color = jobStatusColor(computedStatus)

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

  async function markComplete() {
    const newStatus = status === 'completed' ? 'upcoming' : 'completed'
    setCompleting(true)
    setError('')
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setStatus(newStatus)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setCompleting(false)
    }
  }

  function startEditVisit(v: Visit) {
    setEditingVisit(v.id)
    setVisitEdits(prev => ({
      ...prev,
      [v.id]: {
        date: toLocalDate(v.scheduled_at),
        startTime: toLocalTime(v.scheduled_at),
        endTime: v.scheduled_end ? toLocalTime(v.scheduled_end) : toLocalTime(v.scheduled_at).replace(/(\d+):(\d+)/, (_, h) => `${String(Number(h) + 1).padStart(2, '0')}:00`),
      },
    }))
  }

  async function saveVisit(visitId: string) {
    const edits = visitEdits[visitId]
    if (!edits) return
    const newAt = buildISO(edits.date, edits.startTime)
    const newEnd = buildISO(edits.date, edits.endTime)

    // Optimistic
    setVisits(prev => prev.map(v => v.id === visitId ? { ...v, scheduled_at: newAt, scheduled_end: newEnd } : v))
    setEditingVisit(null)

    try {
      const res = await fetch(`/api/schedule/visits/${visitId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduled_at: newAt, scheduled_end: newEnd }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to update visit')
        router.refresh()
      }
    } catch {
      setError('Failed to update visit')
      router.refresh()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>

      {/* Status badge + Mark Complete */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 20,
          background: `${color}18`,
          border: `1px solid ${color}40`,
          color, fontSize: 12, fontWeight: 600, textTransform: 'capitalize',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
          {jobStatusLabel(computedStatus)}
        </span>

        <button
          onClick={markComplete}
          disabled={completing}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: status === 'completed' ? 'var(--bg-secondary)' : '#111',
            color: status === 'completed' ? 'var(--text-muted)' : '#fff',
            fontSize: 13, fontWeight: 600,
          }}
        >
          <CheckCircle2 size={15} strokeWidth={2} />
          {completing ? '...' : status === 'completed' ? 'Undo Complete' : 'Mark Complete'}
        </button>
      </div>

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

      {/* Category */}
      <div>
        <span className="text-section-header" style={{ display: 'block', marginBottom: 8 }}>Category</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {CATEGORIES.map(s => (
            <button
              key={s}
              onClick={() => setCategory(s)}
              style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                border: `1px solid ${category === s ? 'var(--accent-action)' : 'var(--border)'}`,
                background: category === s ? 'var(--accent-action)' : 'transparent',
                color: category === s ? '#fff' : 'var(--text-muted)',
              }}
            >
              {s}
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

      {/* Visits — editable */}
      {visits.length > 0 && (
        <div>
          <span className="text-section-header" style={{ display: 'block', marginBottom: 8 }}>Scheduled Visits</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {visits.map(v => {
              const isEditing = editingVisit === v.id
              const edits = visitEdits[v.id]
              return (
                <div key={v.id} className="card" style={{ padding: '12px 14px' }}>
                  {isEditing && edits ? (
                    <>
                      <input
                        type="date"
                        className="input"
                        value={edits.date}
                        onChange={(e) => setVisitEdits(p => ({ ...p, [v.id]: { ...p[v.id], date: e.target.value } }))}
                        style={{ marginBottom: 8 }}
                      />
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Start</p>
                          <input
                            type="time"
                            className="input"
                            value={edits.startTime}
                            onChange={(e) => setVisitEdits(p => ({ ...p, [v.id]: { ...p[v.id], startTime: e.target.value } }))}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>End</p>
                          <input
                            type="time"
                            className="input"
                            value={edits.endTime}
                            onChange={(e) => setVisitEdits(p => ({ ...p, [v.id]: { ...p[v.id], endTime: e.target.value } }))}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => saveVisit(v.id)}
                          className="btn-primary"
                          style={{ flex: 1, padding: '8px' }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingVisit(null)}
                          className="btn-secondary"
                          style={{ flex: 1, padding: '8px' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={() => startEditVisit(v)}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', width: '100%', textAlign: 'left' }}
                    >
                      <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>
                        {new Date(v.scheduled_at).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {new Date(v.scheduled_at).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        {v.scheduled_end && ` – ${new Date(v.scheduled_end).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit', hour12: true })}`}
                      </p>
                      {v.notes && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{v.notes}</p>}
                    </button>
                  )}
                </div>
              )
            })}
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

      <button onClick={save} disabled={saving} className="btn-primary">
        {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
      </button>
    </div>
  )
}
