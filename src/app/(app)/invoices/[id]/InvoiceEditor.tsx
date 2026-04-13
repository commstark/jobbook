'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trash2 } from 'lucide-react'

interface LineItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  amount: number
  sort_order: number
}

interface Props {
  invoice: {
    id: string
    status: string
    total_amount: number
    sent_at: string | null
    paid_at: string | null
    public_token: string
  }
  job: { id: string; title: string } | null
  customer: { id: string; name: string; address: string } | null
  lineItems: LineItem[]
}

export default function InvoiceEditor({ invoice, job, customer, lineItems: initialItems }: Props) {
  const router = useRouter()
  const [items, setItems] = useState(initialItems.map(i => ({ ...i })))
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const total = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0)

  function updateItem(index: number, field: keyof LineItem, value: string | number) {
    setItems(prev => {
      const next = [...prev]
      const item = { ...next[index], [field]: value }
      item.amount = Number(item.quantity) * Number(item.unit_price)
      next[index] = item
      return next
    })
  }

  function addItem() {
    setItems(prev => [...prev, {
      id: `new-${Date.now()}`,
      description: '',
      quantity: 1,
      unit_price: 0,
      amount: 0,
      sort_order: prev.length,
    }])
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line_items: items, total_amount: total }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function send() {
    setSending(true)
    setError('')
    try {
      // Save first
      const saveRes = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line_items: items, total_amount: total }),
      })
      if (!saveRes.ok) throw new Error('Failed to save before sending')

      const sendRes = await fetch(`/api/invoices/${invoice.id}/send`, { method: 'POST' })
      const data = await sendRes.json()
      if (!sendRes.ok) throw new Error(data.error || 'Send failed')
      setSent(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setSending(false)
    }
  }

  const statusColor = invoice.status === 'paid' ? 'var(--accent-green)'
    : invoice.status === 'sent' || invoice.status === 'viewed' ? 'var(--accent-blue)'
    : 'var(--text-muted)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Invoice</h1>
          <span className="badge" style={{
            background: `${statusColor}18`,
            color: statusColor,
            textTransform: 'capitalize',
            fontSize: 12, fontWeight: 600,
          }}>
            {invoice.status}
          </span>
        </div>
        {job && (
          <Link href={`/jobs/${job.id}`} style={{ fontSize: 14, color: 'var(--accent-blue)' }}>
            {job.title}
          </Link>
        )}
        {customer && (
          <div style={{ marginTop: 4 }}>
            <Link href={`/customers/${customer.id}`} style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              {customer.name}
            </Link>
            {customer.address && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{customer.address}</p>
            )}
          </div>
        )}
      </div>

      {/* Line items */}
      <div>
        <span className="text-section-header" style={{ display: 'block', marginBottom: 8 }}>Line Items</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((item, i) => (
            <div key={item.id} className="card" style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                <input
                  className="input"
                  value={item.description}
                  onChange={(e) => updateItem(i, 'description', e.target.value)}
                  placeholder="Description"
                  style={{ flex: 1 }}
                />
                <button
                  onClick={() => removeItem(i)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-red)', padding: '8px 4px', flexShrink: 0 }}
                >
                  <Trash2 size={16} strokeWidth={1.8} />
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Qty</p>
                  <input
                    type="number"
                    className="input"
                    value={item.quantity}
                    onChange={(e) => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)}
                    onFocus={(e) => e.target.select()}
                    style={{ textAlign: 'center' }}
                  />
                </div>
                <div style={{ color: 'var(--text-muted)', paddingTop: 16 }}>×</div>
                <div style={{ flex: 2 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Unit Price</p>
                  <input
                    type="number"
                    className="input"
                    value={item.unit_price}
                    onChange={(e) => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                    onFocus={(e) => e.target.select()}
                    placeholder="0.00"
                  />
                </div>
                <div style={{ flex: 1, textAlign: 'right', paddingTop: 16 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Total</p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--accent-green)' }}>
                    ${(Number(item.quantity) * Number(item.unit_price)).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addItem}
          style={{
            width: '100%', marginTop: 8, padding: '10px',
            border: '1px dashed var(--border)', borderRadius: 8,
            background: 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            color: 'var(--text-muted)', fontSize: 14,
          }}
        >
          <Plus size={16} strokeWidth={2} />
          Add Line Item
        </button>
      </div>

      {/* Total */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 10,
      }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Total</span>
        <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-green)' }}>${total.toFixed(2)}</span>
      </div>

      {error && <p className="error-text">{error}</p>}

      {sent && (
        <p style={{ color: 'var(--accent-green)', fontSize: 14, textAlign: 'center' }}>
          Invoice sent via SMS!
        </p>
      )}

      {/* Actions */}
      {invoice.status === 'draft' || invoice.status === 'sent' || invoice.status === 'viewed' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={send} disabled={sending || items.length === 0} className="btn-primary">
            {sending ? 'Sending...' : invoice.status === 'draft' ? 'Send via Text' : 'Resend'}
          </button>
          <button onClick={save} disabled={saving} className="btn-secondary">
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
        </div>
      ) : (
        <div style={{ padding: '12px 16px', background: 'rgba(22,163,74,0.08)', borderRadius: 10, textAlign: 'center' }}>
          <p style={{ color: 'var(--accent-green)', fontWeight: 600 }}>
            Paid {invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
          </p>
        </div>
      )}
    </div>
  )
}
