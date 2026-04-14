'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

interface Props {
  fallback: string
  label: string
}

export default function BackButton({ fallback, label }: Props) {
  const router = useRouter()
  function go() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push(fallback)
    }
  }
  return (
    <button
      onClick={go}
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 4,
      }}
    >
      <ChevronLeft size={20} strokeWidth={1.8} />
      <span style={{ fontSize: 16 }}>{label}</span>
    </button>
  )
}
