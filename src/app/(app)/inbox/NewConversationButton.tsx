'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Edit, X } from 'lucide-react'

interface Customer { id: string; name: string; phone: string }

export default function NewConversationButton({ customers }: { customers: Customer[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  )

  async function startConversation(phone: string, customerId?: string) {
    if (!phone) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/conversations/find-or-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, customer_id: customerId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      if (!data.conversation?.id) throw new Error('No conversation returned')
      setOpen(false)
      router.push(`/inbox/${data.conversation.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start conversation')
    } finally {
      setLoading(false)
    }
  }

  const isPhone = /^\+?[\d\s\-().]{7,}$/.test(search)

  return (
    <>
      <button
        onClick={() => { setOpen(true); setSearch(''); setError('') }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 2 }}
      >
        <Edit size={22} strokeWidth={1.8} />
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: 'var(--bg-primary)', borderRadius: '16px 16px 0 0', padding: 24, width: '100%', maxHeight: '75vh', overflowY: 'auto', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontSize: 16, fontWeight: 600 }}>New Message</p>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} strokeWidth={1.8} />
              </button>
            </div>

            <input
              className="input"
              placeholder="Search customers or enter phone..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setError('') }}
              autoFocus
              style={{ marginBottom: 12 }}
            />

            {error && <p className="error-text" style={{ marginBottom: 8 }}>{error}</p>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
              {filtered.slice(0, 8).map((c) => (
                <button
                  key={c.id}
                  onClick={() => c.phone && startConversation(c.phone, c.id)}
                  disabled={!c.phone || loading}
                  style={{
                    textAlign: 'left', padding: '12px 14px', borderRadius: 8,
                    border: 'none', background: 'var(--bg-secondary)',
                    cursor: c.phone ? 'pointer' : 'not-allowed', fontSize: 15,
                    opacity: c.phone ? 1 : 0.5,
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{c.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
                    {c.phone || 'No phone'}
                  </span>
                </button>
              ))}
            </div>

            {isPhone && (
              <button
                className="btn-primary"
                style={{ marginBottom: 10 }}
                onClick={() => startConversation(search.replace(/\s/g, ''))}
                disabled={loading}
              >
                {loading ? 'Starting...' : `Start conversation with ${search}`}
              </button>
            )}

            <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  )
}
