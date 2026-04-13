export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from './LogoutButton'

export default async function SettingsPage() {
  const supabase = await createClient()

  let user: { email: string | null; name: string | null } = { email: null, name: null }
  let dbError = ''

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) redirect('/login')

    const { data, error } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', session.user.id)
      .maybeSingle()

    if (error) {
      console.error('[settings]', error)
      dbError = error.message
    } else if (data) {
      user = data
    } else {
      user = { email: session.user.email || null, name: null }
    }
  } catch (err) {
    console.error('[settings] unexpected:', err)
    dbError = 'Failed to load settings'
  }

  return (
    <div style={{ padding: '0 var(--space-xl)', paddingTop: 'calc(24px + env(safe-area-inset-top))', paddingBottom: 100 }}>
      <h1 className="text-page-title" style={{ marginBottom: 'var(--space-2xl)' }}>Settings</h1>

      {dbError && (
        <p style={{ color: 'var(--accent-red)', fontSize: 13, marginBottom: 16 }}>{dbError}</p>
      )}

      {/* Profile */}
      <div style={{ marginBottom: 'var(--space-2xl)' }}>
        <span className="text-section-header" style={{ display: 'block', marginBottom: 12 }}>Account</span>
        <div className="card">
          {user.name && (
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{user.name}</p>
          )}
          {user.email && (
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{user.email}</p>
          )}
        </div>
      </div>

      <LogoutButton />
    </div>
  )
}
