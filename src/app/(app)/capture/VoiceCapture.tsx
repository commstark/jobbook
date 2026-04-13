'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Mic, Square, RefreshCw } from 'lucide-react'

interface Props {
  users: { id: string; name: string }[]
  customers: { id: string; name: string; phone: string }[]
}

type State = 'idle' | 'recording' | 'processing' | 'result'

interface ParsedData {
  title?: string
  description?: string
  category?: string
  is_urgent?: boolean
  customer_name?: string
  customer_address?: string
  quoted_amount?: number
  line_items?: { description: string; quantity: number; unit_price: number }[]
  name?: string
  address?: string
  phone?: string
}

const CATEGORIES = ['Leak', 'Install', 'Repair', 'Drain', 'New Construction', 'Inspection', 'Other']

export default function VoiceCapture({ users, customers }: Props) {
  const router = useRouter()
  const [state, setState] = useState<State>('idle')
  const [transcript, setTranscript] = useState('')
  const [editingTranscript, setEditingTranscript] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedData>({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Editable fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Other')
  const [isUrgent, setIsUrgent] = useState(false)
  const [customerId, setCustomerId] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [quotedAmount, setQuotedAmount] = useState('')

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  function reset() {
    setState('idle')
    setTranscript('')
    setEditingTranscript(false)
    setParsedData({})
    setError('')
    setTitle('')
    setDescription('')
    setCategory('Other')
    setIsUrgent(false)
    setCustomerId('')
    setCustomerSearch('')
    setQuotedAmount('')
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  async function startRecording() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      recorderRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
      recorder.start()
      setState('recording')
    } catch (err) {
      setError('Microphone access denied. Please allow microphone access.')
      console.error('[capture] start:', err)
    }
  }

  async function stopRecording() {
    if (!recorderRef.current) return
    setState('processing')

    const recorder = recorderRef.current
    recorder.onstop = async () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null

      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const formData = new FormData()
      formData.append('audio', blob, 'recording.webm')

      try {
        const res = await fetch('/api/voice/transcribe', { method: 'POST', body: formData })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Transcription failed')

        const parsed: ParsedData = data.data || {}
        setTranscript(data.transcript || '')
        setParsedData(parsed)
        setTitle(parsed.title || '')
        setDescription(parsed.description || '')
        setCategory(parsed.category || 'Other')
        setIsUrgent(parsed.is_urgent || false)
        setQuotedAmount(parsed.quoted_amount ? String(parsed.quoted_amount) : '')

        // Auto-match customer
        if (parsed.customer_name) {
          const match = customers.find(c =>
            c.name.toLowerCase().includes((parsed.customer_name || '').toLowerCase())
          )
          if (match) {
            setCustomerId(match.id)
            setCustomerSearch(match.name)
          } else {
            setCustomerSearch(parsed.customer_name)
          }
        }

        setState('result')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Processing failed')
        setState('idle')
        console.error('[capture] process:', err)
      }
    }
    recorder.stop()
  }

  async function saveJob() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/jobs/create-quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || 'New Job',
          description,
          category,
          is_urgent: isUrgent,
          customer_id: customerId || null,
          quoted_amount: quotedAmount ? parseFloat(quotedAmount) : null,
          ai_summary: transcript,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create job')
      router.push(`/jobs/${data.job.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
      setSaving(false)
    }
  }

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  )

  if (state === 'idle') {
    return (
      <div style={{ padding: '0 var(--space-xl)', paddingTop: 'calc(48px + env(safe-area-inset-top))', textAlign: 'center' }}>
        <h1 className="text-page-title" style={{ marginBottom: 8 }}>Voice Capture</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 48 }}>
          Describe the job, create a contact, or dictate an invoice.
        </p>

        <button
          onClick={startRecording}
          style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'var(--accent-action)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', margin: '0 auto 16px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
          }}
        >
          <Mic size={28} color="#fff" strokeWidth={1.8} />
        </button>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Tap to start</p>

        {error && <p className="error-text" style={{ marginTop: 24 }}>{error}</p>}

        <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {['Kitchen sink is leaking under the cabinet', 'New install for Mrs. Thompson on Oak St', 'Invoice: 2 hrs labor at $95/hr, plus $45 parts'].map(ex => (
            <div key={ex} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 14px', textAlign: 'left' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ex}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (state === 'recording') {
    return (
      <div style={{ padding: '0 var(--space-xl)', paddingTop: 'calc(48px + env(safe-area-inset-top))', textAlign: 'center' }}>
        <h1 className="text-page-title" style={{ marginBottom: 8 }}>Listening</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 48 }}>Tap to stop when done</p>

        <button
          onClick={stopRecording}
          style={{
            width: 100, height: 100, borderRadius: '50%',
            background: 'var(--accent-action)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', margin: '0 auto',
            animation: 'pulse 1.5s ease-in-out infinite',
            boxShadow: '0 0 0 16px rgba(0,0,0,0.04)',
          }}
        >
          <Square size={28} color="#fff" strokeWidth={1.8} fill="#fff" />
        </button>

        <style>{`@keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }`}</style>
      </div>
    )
  }

  if (state === 'processing') {
    return (
      <div style={{ padding: '0 var(--space-xl)', paddingTop: 'calc(48px + env(safe-area-inset-top))', textAlign: 'center' }}>
        <h1 className="text-page-title" style={{ marginBottom: 8 }}>Processing...</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Structuring your voice note</p>
      </div>
    )
  }

  // Result state
  return (
    <div style={{ padding: '0 var(--space-xl)', paddingTop: 'calc(24px + env(safe-area-inset-top))', paddingBottom: 100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2xl)' }}>
        <h1 className="text-page-title">Review</h1>
        <button onClick={reset} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 14 }}>
          <RefreshCw size={16} strokeWidth={1.8} />
          Re-record
        </button>
      </div>

      {/* Transcript */}
      <div style={{ marginBottom: 'var(--space-2xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span className="text-section-header">Transcript</span>
          <button
            onClick={() => setEditingTranscript(!editingTranscript)}
            style={{ fontSize: 12, color: 'var(--accent-blue)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {editingTranscript ? 'Done' : 'Edit'}
          </button>
        </div>
        {editingTranscript ? (
          <textarea
            className="input"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={4}
            style={{ resize: 'none' }}
          />
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{transcript}</p>
        )}
      </div>

      {/* Job fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        <div>
          <span className="text-section-header" style={{ display: 'block', marginBottom: 6 }}>Title</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Job title" />
        </div>

        <div>
          <span className="text-section-header" style={{ display: 'block', marginBottom: 6 }}>Description</span>
          <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ resize: 'none' }} />
        </div>

        <div>
          <span className="text-section-header" style={{ display: 'block', marginBottom: 8 }}>Category</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  padding: '6px 12px', borderRadius: 20,
                  border: `1px solid ${category === cat ? 'var(--accent-action)' : 'var(--border)'}`,
                  background: category === cat ? 'var(--accent-action)' : 'transparent',
                  color: category === cat ? '#fff' : 'var(--text-secondary)',
                  fontSize: 13, cursor: 'pointer',
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
            onChange={(e) => setCustomerSearch(e.target.value)}
            style={{ marginBottom: 6 }}
          />
          {customerSearch && filteredCustomers.length > 0 && (
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, overflow: 'hidden' }}>
              {filteredCustomers.slice(0, 5).map(c => (
                <button
                  key={c.id}
                  onClick={() => { setCustomerId(c.id); setCustomerSearch(c.name) }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '10px 14px', border: 'none',
                    background: customerId === c.id ? 'rgba(0,0,0,0.06)' : 'transparent',
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="checkbox"
            id="urgent"
            checked={isUrgent}
            onChange={(e) => setIsUrgent(e.target.checked)}
            style={{ width: 18, height: 18 }}
          />
          <label htmlFor="urgent" style={{ fontSize: 14, color: 'var(--accent-red)', fontWeight: 500 }}>
            Mark as urgent
          </label>
        </div>
      </div>

      {error && <p className="error-text" style={{ marginTop: 16 }}>{error}</p>}

      <button
        onClick={saveJob}
        disabled={saving || !title.trim()}
        className="btn-primary"
        style={{ marginTop: 'var(--space-2xl)' }}
      >
        {saving ? 'Saving...' : 'Save Job'}
      </button>
    </div>
  )
}
