import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Jobbook',
  description: 'Your jobs. Your book.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Jobbook' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: 'var(--bg-primary)' }}>
        <div style={{ maxWidth: 390, margin: '0 auto', minHeight: '100dvh', position: 'relative', background: 'var(--bg-primary)' }}>
          {children}
        </div>
      </body>
    </html>
  )
}
