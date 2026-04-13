'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default function CreateCustomerPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() && !phone.trim()) {
      setError('Please enter a name or phone number')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), address: address.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create customer')
      router.push(`/customers/${data.customer.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create customer')
      setSaving(false)
    }
  }

  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ padding: '0 var(--space-xl)', paddingTop: 'calc(12px + env(safe-area-inset-top))', marginBottom: 'var(--space-lg)' }}>
        <Link href="/customers" style={{ color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 4, width: 'fit-content' }}>
          <ChevronLeft size={20} strokeWidth={1.8} />
          <span style={{ fontSize: 16 }}>Customers</span>
        </Link>
      </div>

      <div style={{ padding: '0 var(--space-xl)' }}>
        <h1 className="text-page-title" style={{ marginBottom: 'var(--space-2xl)' }}>New Customer</h1>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div>
            <span className="text-section-header" style={{ display: 'block', marginBottom: 6 }}>Name</span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              autoFocus
            />
          </div>

          <div>
            <span className="text-section-header" style={{ display: 'block', marginBottom: 6 }}>Phone</span>
            <input
              type="tel"
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
            />
          </div>

          <div>
            <span className="text-section-header" style={{ display: 'block', marginBottom: 6 }}>Address</span>
            <textarea
              className="input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street address"
              rows={2}
              style={{ resize: 'none' }}
            />
          </div>

          {error && <p className="error-text">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
            style={{ marginTop: 'var(--space-md)' }}
          >
            {saving ? 'Saving...' : 'Create Customer'}
          </button>
        </form>
      </div>
    </div>
  )
}
