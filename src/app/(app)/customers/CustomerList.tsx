'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Customer {
  id: string
  name: string | null
  address: string | null
  rating: string | null
  customer_phones: { phone: string; is_primary: boolean }[]
  jobs: { id: string; status: string; quoted_amount: number | null }[]
  invoices: { id: string; status: string; total_amount: number }[]
}

function initials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

export default function CustomerList({ customers }: { customers: Record<string, unknown>[] }) {
  const [search, setSearch] = useState('')
  const custs = customers as unknown as Customer[]

  const phone = (c: Customer) =>
    c.customer_phones?.find(p => p.is_primary)?.phone || c.customer_phones?.[0]?.phone || ''

  const filtered = custs.filter((c) => {
    const q = search.toLowerCase()
    if (!q) return true
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.address || '').toLowerCase().includes(q) ||
      phone(c).includes(q)
    )
  })

  const owing = (c: Customer) =>
    (c.invoices || [])
      .filter(i => ['sent', 'viewed'].includes(i.status))
      .reduce((sum, i) => sum + Number(i.total_amount), 0)

  return (
    <>
      <input
        className="input"
        placeholder="Search by name, phone, or address..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 16 }}
      />

      {filtered.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          {search ? 'No customers match' : 'No customers yet'}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {filtered.map((c) => {
          const ow = owing(c)
          const ini = initials(c.name)
          return (
            <Link key={c.id} href={`/customers/${c.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: c.name ? 'var(--bg-elevated)' : 'rgba(217,119,6,0.1)',
                    border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 600, fontSize: 14,
                    color: c.name ? 'var(--text-secondary)' : 'var(--accent-orange)',
                  }}>
                    {ini}
                  </div>
                  {c.rating && c.rating !== 'neutral' && (
                    <div style={{
                      position: 'absolute', bottom: 0, right: 0,
                      width: 10, height: 10, borderRadius: '50%',
                      background: c.rating === 'good' ? 'var(--accent-green)' : 'var(--accent-red)',
                      border: '2px solid var(--bg-secondary)',
                    }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="text-card-title" style={{ marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.name || phone(c) || 'Unknown'}
                  </p>
                  {c.address && (
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.address}
                    </p>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{(c.jobs || []).length} job{(c.jobs || []).length !== 1 ? 's' : ''}</p>
                  {ow > 0 && (
                    <p style={{ fontSize: 12, color: 'var(--accent-orange)', fontWeight: 600 }}>${ow.toFixed(0)} owing</p>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </>
  )
}
