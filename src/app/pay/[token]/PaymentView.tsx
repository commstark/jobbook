'use client'

import { useState } from 'react'

interface LineItem {
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
    public_token: string
    created_at: string
  }
  job: { id: string; title: string } | null
  customer: { id: string; name: string; address: string } | null
  lineItems: LineItem[]
}

export default function PaymentView({ invoice, job, customer, lineItems }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isPaid = invoice.status === 'paid'

  async function handlePay() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/invoices/pay/${invoice.public_token}/checkout`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Payment failed')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment error')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F5F4F0',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 480,
        padding: '40px 20px 80px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9e9e9e', marginBottom: 8 }}>
            Invoice
          </p>
          {job && (
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>{job.title}</h1>
          )}
          {customer && (
            <p style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
              {customer.name}{customer.address ? ` · ${customer.address}` : ''}
            </p>
          )}
          <p style={{ fontSize: 12, color: '#9e9e9e', marginTop: 4 }}>
            {new Date(invoice.created_at).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {/* Line items */}
        {lineItems.length > 0 && (
          <div style={{
            background: '#fff',
            borderRadius: 12,
            overflow: 'hidden',
            border: '1px solid #e5e5e5',
          }}>
            {lineItems.map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 16px',
                borderBottom: i < lineItems.length - 1 ? '1px solid #f0f0f0' : 'none',
              }}>
                <div>
                  <p style={{ fontSize: 15, color: '#1a1a1a', margin: 0 }}>{item.description}</p>
                  {Number(item.quantity) !== 1 && (
                    <p style={{ fontSize: 12, color: '#9e9e9e', marginTop: 2 }}>
                      {item.quantity} × ${Number(item.unit_price).toFixed(2)}
                    </p>
                  )}
                </div>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
                  ${Number(item.amount).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Total */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          background: '#1a1a1a',
          borderRadius: 12,
          color: '#fff',
        }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>Total</span>
          <span style={{ fontSize: 26, fontWeight: 700 }}>${Number(invoice.total_amount).toFixed(2)}</span>
        </div>

        {/* CTA */}
        {isPaid ? (
          <div style={{
            textAlign: 'center', padding: '20px',
            background: 'rgba(22,163,74,0.08)', borderRadius: 12,
            border: '1px solid rgba(22,163,74,0.2)',
          }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#16a34a', margin: 0 }}>✓ Payment Received</p>
            <p style={{ fontSize: 14, color: '#16a34a', marginTop: 4 }}>Thank you!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={handlePay}
              disabled={loading}
              style={{
                width: '100%', padding: '16px',
                background: '#1a1a1a', color: '#fff',
                border: 'none', borderRadius: 12,
                fontSize: 17, fontWeight: 700, cursor: 'pointer',
              }}
            >
              {loading ? 'Loading...' : `Pay $${Number(invoice.total_amount).toFixed(2)}`}
            </button>
            {error && <p style={{ color: '#dc2626', fontSize: 13, textAlign: 'center' }}>{error}</p>}
            <p style={{ fontSize: 12, color: '#9e9e9e', textAlign: 'center' }}>
              Secure payment powered by Stripe
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
