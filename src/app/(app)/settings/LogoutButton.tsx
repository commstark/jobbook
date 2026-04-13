'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export default function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      style={{
        width: '100%', padding: '14px', borderRadius: 10,
        border: '1px solid var(--accent-red)',
        background: 'transparent',
        color: 'var(--accent-red)',
        fontSize: 15, fontWeight: 600, cursor: 'pointer',
      }}
    >
      {loading ? 'Signing out...' : 'Sign Out'}
    </button>
  )
}
