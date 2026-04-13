'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const CATEGORIES = ['Leak', 'Install', 'Repair', 'Drain', 'New Construction', 'Inspection', 'Other']

interface Props {
  customers: { id: string; name: string }[]
  prefilledCustomerId?: string
  prefilledCustomerName?: string
}

export default function CreateJobForm({ customers, prefilledCustomerId = '', prefilledCustomerName = '' }: Props) {
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Other')
  const [isUrgent, setIsUrgent] = useState(false)
  const [customerId, setCustomerId] = useState(prefilledCustomerId)
  const [customerSearch, setCustomerSearch] = useState(prefilledCustomerName)
  const [quotedAmount, setQuotedAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('Job title is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/jobs/create-quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          is_urgent: isUrgent,
          customer_id: customerId || null,
          quoted_amount: quotedAmount ? parseFloat(quotedAmount) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create job')
      router.push(`/jobs/${data.job.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create job')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
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
          placeholder="e.g. Fix kitchen sink leak"
          autoFocus
          required
        />
      </div>

      <div>
        <span className="text-section-header" style={{ display: 'block', marginBottom: 8 }}>Category</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              style={{
                padding: '6px 12px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                border: `1px solid ${category === cat ? 'var(--accent-action)' : 'var(--border)'}`,
                background: category === cat ? 'var(--accent-action)' : 'transparent',
                color: category === cat ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="text-section-header" style={{ display: 'block', marginBottom: 6 }}>Customer</span>
        <input
          className="input"
          placeholder="Search customers..."
          value={customerSearch}
          onChange={(e) => { setCustomerSearch(e.target.value); if (customerId) setCustomerId('') }}
          style={{ marginBottom: 6 }}
        />
        {customerSearch && !customerId && filteredCustomers.length > 0 && (
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, overflow: 'hidden' }}>
            {filteredCustomers.slice(0, 5).map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => { setCustomerId(c.id); setCustomerSearch(c.name) }}
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
      </div>

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

      <div>
        <span className="text-section-header" style={{ display: 'block', marginBottom: 6 }}>Description</span>
        <textarea
          className="input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Additional details..."
          style={{ resize: 'none' }}
        />
      </div>

      {error && <p className="error-text">{error}</p>}

      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? 'Creating...' : 'Create Job'}
      </button>
    </form>
  )
}
