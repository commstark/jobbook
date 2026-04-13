'use client'

import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'

interface Message {
  id: string
  conversation_id: string
  direction: 'inbound' | 'outbound'
  body: string | null
  media_urls: string[] | null
  created_at: string
}

interface Props {
  conversationId: string
  initialMessages: Message[]
  customerName: string
}

export default function MessageThread({ conversationId, initialMessages, customerName }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView()
  }, [messages])

  async function handleSend() {
    const body = input.trim()
    if (!body || sending) return
    setSending(true)
    setError('')
    setInput('')

    // Optimistic update
    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      direction: 'outbound',
      body,
      media_urls: null,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])

    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Send failed')

      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? data.message : m))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
      // Revert optimistic update
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      setInput(body)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px var(--space-xl)',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {messages.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', marginTop: 32 }}>
            No messages with {customerName} yet
          </p>
        )}

        {messages.map((msg) => (
          <div key={msg.id} style={{ display: 'flex', justifyContent: msg.direction === 'outbound' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '80%',
              background: msg.direction === 'outbound' ? 'var(--accent-action)' : 'var(--bg-secondary)',
              color: msg.direction === 'outbound' ? '#fff' : 'var(--text-primary)',
              borderRadius: msg.direction === 'outbound' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              padding: '8px 12px',
              fontSize: 14, lineHeight: 1.4,
            }}>
              {msg.media_urls?.map((url, i) => (
                <img key={i} src={url} alt="Photo" style={{ width: '100%', borderRadius: 8, marginBottom: 4, display: 'block' }} />
              ))}
              {msg.body && <span>{msg.body}</span>}
              <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: 'right' }}>
                {new Date(msg.created_at).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit', hour12: true })}
              </div>
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <p style={{ padding: '4px var(--space-xl)', fontSize: 12, color: 'var(--accent-red)' }}>{error}</p>
      )}

      {/* Input bar */}
      <div style={{
        padding: 'var(--space-md) var(--space-lg)',
        paddingBottom: 'calc(var(--space-md) + env(safe-area-inset-bottom))',
        borderTop: '1px solid var(--border-light)',
        background: 'var(--bg-primary)',
        display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0,
      }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Message"
          rows={1}
          className="input"
          style={{ resize: 'none', flex: 1, maxHeight: 120 }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: input.trim() ? 'var(--accent-action)' : 'var(--border)',
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: input.trim() ? 'pointer' : 'default', flexShrink: 0,
          }}
        >
          <Send size={16} color="white" strokeWidth={1.8} />
        </button>
      </div>
    </>
  )
}
