'use client'

import { useState, useRef } from 'react'
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

  // All fields are live state — edits apply immediately, saves happen on blur/check
  const [name, setName] = useState(initialName)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(initialName)

  const [address, setAddress] = useState(initialAddress)
  const [editingAddress, setEditingAddress] = useState(false)
  const [addressInput, setAddressInput] = useState(initialAddress)

  // phone is kept in state so Text button always has the current value
  const [phone, setPhone] = useState(initialPhone)
  const [editingPhone, setEditingPhone] = useState(false)
  const [phoneInput, setPhoneInput] = useState(initialPhone)

  const [rating, setRating] = useState(initialRating)
  const [ratingNote, setRatingNote] = useState(initialRatingNote)
  const [notes, setNotes] = useState(initialNotes)

  const [error, setError] = useState('')
  const [textLoading, setTextLoading] = useState(false)

  // Track the last-saved values to avoid redundant saves
  const savedRatingNote = useRef(initialRatingNote)
  const savedNotes = useRef(initialNotes)

  const initials = name
    ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  async function patch(body: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Save failed')
      } else {
        setError('')
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    }
  }

  async function saveName() {
    setEditingName(false)
    if (nameInput === name) return
    setName(nameInput)  // update UI immediately
    await patch({ name: nameInput })
  }

  function cancelName() {
    setEditingName(false)
    setNameInput(name)
  }

  async function saveAddress() {
    setEditingAddress(false)
    if (addressInput === address) return
    setAddress(addressInput)
    await patch({ address: addressInput })
  }

  function cancelAddress() {
    setEditingAddress(false)
    setAddressInput(address)
  }

  async function savePhone() {
    setEditingPhone(false)
    if (phoneInput === phone) return
    setPhone(phoneInput)  // update immediately so Text button works right away
    await patch({ phone: phoneInput })
  }

  function cancelPhone() {
    setEditingPhone(false)
    setPhoneInput(phone)
  }

  async function saveRating(newRating: string) {
    const next = rating === newRating ? 'neutral' : newRating
    setRating(next)
    await patch({ rating: next })
  }

  async function handleText() {
    if (!phone) {
      setError('Add a phone number first')
      return
    }
    setTextLoading(true)
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
      setTextLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>

      {/* Avatar + Name — this IS the page title. One element, not two. */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        {/* Avatar (initials) */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'var(--bg-secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 600, fontSize: 22, color: 'var(--text-secondary)',
          }}>
            {initials}
          </div>
          {rating && rating !== 'neutral' && (
            <div style={{
              position: 'absolute', bottom: 2, right: 2,
              width: 14, height: 14, borderRadius: '50%',
              background: rating === 'good' ? 'var(--accent-green)' : 'var(--accent-red)',
              border: '2px solid var(--bg-primary)',
            }} />
          )}
        </div>

        {/* Name — the page title, editable inline */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {editingName ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                autoFocus
                className="input"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveName()
                  if (e.key === 'Escape') cancelName()
                }}
                onBlur={saveName}
                style={{ fontSize: 20, fontWeight: 700, flex: 1 }}
              />
              <button
                onMouseDown={(e) => { e.preventDefault(); saveName() }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-green)', padding: 4 }}
              >
                <Check size={20} strokeWidth={2} />
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); cancelName() }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setEditingName(true); setNameInput(name) }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
              }}
            >
              <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {name || 'Add Name'}
              </h1>
              <Pencil size={15} strokeWidth={1.8} color="var(--text-muted)" style={{ flexShrink: 0 }} />
            </button>
          )}
        </div>
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
              onKeyDown={(e) => {
                if (e.key === 'Enter') savePhone()
                if (e.key === 'Escape') cancelPhone()
              }}
              onBlur={savePhone}
              style={{ flex: 1 }}
            />
            <button
              onMouseDown={(e) => { e.preventDefault(); savePhone() }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-green)', padding: 4 }}
            >
              <Check size={20} strokeWidth={2} />
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); cancelPhone() }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setEditingPhone(true); setPhoneInput(phone) }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 15, color: phone ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              {phone || 'Add phone number'}
            </span>
            <Pencil size={13} strokeWidth={1.8} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          </button>
        )}
      </div>

      {/* Call + Text — uses current phone state, so works immediately after saving */}
      <div style={{ display: 'flex', gap: 8 }}>
        <a
          href={phone ? `tel:${phone}` : undefined}
          onClick={!phone ? (e) => { e.preventDefault(); setError('Add a phone number first') } : undefined}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)', fontSize: 14, fontWeight: 500,
            textDecoration: 'none', cursor: 'pointer',
          }}
        >
          <Phone size={15} strokeWidth={1.8} />
          Call
        </a>
        <button
          onClick={handleText}
          disabled={textLoading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)', fontSize: 14, fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {textLoading ? 'Opening...' : 'Text'}
        </button>
      </div>

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
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveAddress() }
                if (e.key === 'Escape') cancelAddress()
              }}
              onBlur={saveAddress}
            />
            <button
              onMouseDown={(e) => { e.preventDefault(); saveAddress() }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-green)', padding: 4, marginTop: 4 }}
            >
              <Check size={20} strokeWidth={2} />
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); cancelAddress() }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, marginTop: 4 }}
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setEditingAddress(true); setAddressInput(address) }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'flex-start', gap: 8, width: '100%', textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 15, color: address ? 'var(--text-primary)' : 'var(--text-muted)', lineHeight: 1.4, flex: 1 }}>
              {address || 'Add address'}
            </span>
            <Pencil size={13} strokeWidth={1.8} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
          </button>
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

      {/* Rating note — auto-saves on blur */}
      <div>
        <span className="text-section-header" style={{ display: 'block', marginBottom: 6 }}>Rating Note</span>
        <textarea
          className="input"
          value={ratingNote}
          onChange={(e) => setRatingNote(e.target.value)}
          onBlur={() => {
            if (ratingNote !== savedRatingNote.current) {
              savedRatingNote.current = ratingNote
              patch({ rating_note: ratingNote })
            }
          }}
          rows={2}
          placeholder="Reason for rating..."
          style={{ resize: 'none' }}
        />
      </div>

      {/* Property notes — auto-saves on blur */}
      <div>
        <span className="text-section-header" style={{ display: 'block', marginBottom: 6 }}>Property Notes</span>
        <textarea
          className="input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => {
            if (notes !== savedNotes.current) {
              savedNotes.current = notes
              patch({ notes })
            }
          }}
          rows={4}
          placeholder="Notes about the property, access codes, parking..."
          style={{ resize: 'none' }}
        />
      </div>

      {error && <p className="error-text">{error}</p>}
    </div>
  )
}
