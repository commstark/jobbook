'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, ThumbsUp, ThumbsDown, Pencil, Check, X } from 'lucide-react'

interface Props {
  customerId: string
  initialName: string
  initialAddress: string
  initialPhone: string
  initialRating: string
  initialRatingNote: string
  initialNotes: string
}

export default function CustomerEditor({
  customerId,
  initialName,
  initialAddress,
  initialPhone,
  initialRating,
  initialRatingNote,
  initialNotes,
}: Props) {
  const router = useRouter()

  const [name, setName] = useState(initialName)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(initialName)

  const [address, setAddress] = useState(initialAddress)
  const [editingAddress, setEditingAddress] = useState(false)
  const [addressInput, setAddressInput] = useState(initialAddress)

  const [phone, setPhone] = useState(initialPhone)
  const [editingPhone, setEditingPhone] = useState(false)
  const [phoneInput, setPhoneInput] = useState(initialPhone)

  const [rating, setRating] = useState(initialRating)
  const [ratingNote, setRatingNote] = useState(initialRatingNote)
  const [notes, setNotes] = useState(initialNotes)

  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function patch(body: Record<string, unknown>) {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  async function saveName() {
    setEditingName(false)
    if (nameInput === name) return
    setName(nameInput)
    await patch({ name: nameInput })
  }

  async function saveAddress() {
    setEditingAddress(false)
    if (addressInput === address) return
    setAddress(addressInput)
    await patch({ address: addressInput })
  }

  async function savePhone() {
    setEditingPhone(false)
    if (phoneInput === phone) return
    setPhone(phoneInput)
    await patch({ phone: phoneInput })
  }

  async function saveRating(newRating: string) {
    const next = rating === newRating ? 'neutral' : newRating
    setRating(next)
    await patch({ rating: next })
  }

  async function handleText() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/conversations/find-or-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customerId, phone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to open conversation')
      router.push(`/inbox/${data.conversation.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      {/* Name */}
      <div>
        {editingName ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              autoFocus
              className="input"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setEditingName(false); setNameInput(name) } }}
              style={{ flex: 1, fontSize: 20, fontWeight: 700 }}
            />
            <button onClick={saveName} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-green)', padding: 4 }}>
              <Check size={20} strokeWidth={2} />
            </button>
            <button onClick={() => { setEditingName(false); setNameInput(name) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
              <X size={20} strokeWidth={2} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {name || 'Unknown Customer'}
            </h1>
            <button onClick={() => { setEditingName(true); setNameInput(name) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, marginTop: 2 }}>
              <Pencil size={15} strokeWidth={1.8} />
            </button>
          </div>
        )}
      </div>

      {/* Phone */}
      <div>
        <span className="text-section-header" style={{ display: 'block', marginBottom: 6 }}>Phone</span>
        {editingPhone ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              autoFocus
              type="tel"
              className="input"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') savePhone(); if (e.key === 'Escape') { setEditingPhone(false); setPhoneInput(phone) } }}
              style={{ flex: 1 }}
            />
            <button onClick={savePhone} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-green)', padding: 4 }}>
              <Check size={20} strokeWidth={2} />
            </button>
            <button onClick={() => { setEditingPhone(false); setPhoneInput(phone) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
              <X size={20} strokeWidth={2} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, color: phone ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              {phone || 'No phone'}
            </span>
            <button onClick={() => { setEditingPhone(true); setPhoneInput(phone) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
              <Pencil size={13} strokeWidth={1.8} />
            </button>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {phone && (
        <div style={{ display: 'flex', gap: 8 }}>
          <a
            href={`tel:${phone}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)', fontSize: 14, fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            <Phone size={15} strokeWidth={1.8} />
            Call
          </a>
          <button
            onClick={handleText}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)', fontSize: 14, fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Text
          </button>
        </div>
      )}

      {/* Address */}
      <div>
        <span className="text-section-header" style={{ display: 'block', marginBottom: 6 }}>Address</span>
        {editingAddress ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <textarea
              autoFocus
              className="input"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              rows={2}
              style={{ flex: 1, resize: 'none' }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveAddress() } if (e.key === 'Escape') { setEditingAddress(false); setAddressInput(address) } }}
            />
            <button onClick={saveAddress} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-green)', padding: 4, marginTop: 4 }}>
              <Check size={20} strokeWidth={2} />
            </button>
            <button onClick={() => { setEditingAddress(false); setAddressInput(address) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, marginTop: 4 }}>
              <X size={20} strokeWidth={2} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ fontSize: 15, color: address ? 'var(--text-primary)' : 'var(--text-muted)', lineHeight: 1.4, flex: 1 }}>
              {address || 'No address'}
            </span>
            <button onClick={() => { setEditingAddress(true); setAddressInput(address) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, flexShrink: 0 }}>
              <Pencil size={13} strokeWidth={1.8} />
            </button>
          </div>
        )}
      </div>

      {/* Rating */}
      <div>
        <span className="text-section-header" style={{ display: 'block', marginBottom: 8 }}>Rating</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => saveRating('good')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              borderRadius: 8, border: `1px solid ${rating === 'good' ? 'var(--accent-green)' : 'var(--border)'}`,
              background: rating === 'good' ? 'rgba(22,163,74,0.08)' : 'transparent',
              color: rating === 'good' ? 'var(--accent-green)' : 'var(--text-muted)',
              cursor: 'pointer', fontSize: 13, fontWeight: 500,
            }}
          >
            <ThumbsUp size={15} strokeWidth={1.8} />
            Good
          </button>
          <button
            onClick={() => saveRating('bad')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              borderRadius: 8, border: `1px solid ${rating === 'bad' ? 'var(--accent-red)' : 'var(--border)'}`,
              background: rating === 'bad' ? 'rgba(220,38,38,0.08)' : 'transparent',
              color: rating === 'bad' ? 'var(--accent-red)' : 'var(--text-muted)',
              cursor: 'pointer', fontSize: 13, fontWeight: 500,
            }}
          >
            <ThumbsDown size={15} strokeWidth={1.8} />
            Bad
          </button>
        </div>
      </div>

      {/* Rating note */}
      <div>
        <span className="text-section-header" style={{ display: 'block', marginBottom: 6 }}>Rating Note</span>
        <textarea
          className="input"
          value={ratingNote}
          onChange={(e) => setRatingNote(e.target.value)}
          onBlur={() => { if (ratingNote !== initialRatingNote) patch({ rating_note: ratingNote }) }}
          rows={2}
          placeholder="Reason for rating..."
          style={{ resize: 'none' }}
        />
      </div>

      {/* Property notes */}
      <div>
        <span className="text-section-header" style={{ display: 'block', marginBottom: 6 }}>Property Notes</span>
        <textarea
          className="input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => { if (notes !== initialNotes) patch({ notes }) }}
          rows={4}
          placeholder="Notes about the property, access codes, parking..."
          style={{ resize: 'none' }}
        />
      </div>

      {error && <p className="error-text">{error}</p>}
    </div>
  )
}
