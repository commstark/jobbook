'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleGoogleLogin() {
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      })
      if (error) setError(error.message)
    } catch (err) {
      setError('Sign-in failed. Try again.')
      console.error('[login]', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100dvh', padding: '40px 32px', textAlign: 'center',
    }}>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-1px', marginBottom: 8 }}>Jobbook</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Your jobs. Your book.</p>
      </div>

      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="btn-primary"
        style={{ maxWidth: 280 }}
      >
        {loading ? 'Signing in...' : 'Sign in with Google'}
      </button>

      {error && <p className="error-text" style={{ marginTop: 16 }}>{error}</p>}
    </div>
  )
}
