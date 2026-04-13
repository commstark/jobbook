'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageSquare, Calendar, Mic, Users } from 'lucide-react'

const tabs = [
  { href: '/inbox', label: 'Inbox', icon: MessageSquare },
  { href: '/schedule', label: 'Schedule', icon: Calendar },
  { href: '/capture', label: 'Capture', icon: Mic, mic: true },
  { href: '/customers', label: 'Customers', icon: Users },
]

export default function TabBar() {
  const pathname = usePathname()

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: 390,
      background: 'rgba(245,244,240,0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid var(--border-light)',
      padding: '6px 0',
      paddingBottom: 'calc(6px + env(safe-area-inset-bottom))',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'flex-end',
      zIndex: 50,
    }}>
      {tabs.map(({ href, label, icon: Icon, mic }) => {
        const active = pathname === href || (href !== '/capture' && pathname.startsWith(href))
        if (mic) {
          return (
            <Link key={href} href={href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, textDecoration: 'none' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 48,
                background: 'var(--accent-action)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginTop: -16,
                boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
              }}>
                <Icon size={20} color="#fff" strokeWidth={1.8} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 500, color: active ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {label}
              </span>
            </Link>
          )
        }
        return (
          <Link key={href} href={href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '4px 16px', textDecoration: 'none' }}>
            <Icon size={22} strokeWidth={1.8} color={active ? 'var(--text-primary)' : 'var(--text-muted)'} style={{ opacity: active ? 1 : 0.4 }} />
            <span style={{ fontSize: 10, fontWeight: 500, color: active ? 'var(--text-primary)' : 'var(--text-muted)', opacity: active ? 1 : 0.4 }}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
