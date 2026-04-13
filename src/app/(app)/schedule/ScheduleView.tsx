'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, X } from 'lucide-react'

interface JobVisit {
  id: string
  scheduled_at: string
  scheduled_end?: string | null
  drive_time_minutes?: number | null
  jobs: {
    id: string
    title: string
    status: string
    is_urgent: boolean
    quoted_amount?: number | null
    category?: string | null
    customers?: { id: string; name: string } | null
  }
}

interface Props {
  visits: JobVisit[]
  selectedDate: string
}

const HOUR_HEIGHT = 64      // px per hour
const START_HOUR = 0        // midnight
const END_HOUR = 24         // midnight next day
const LABEL_WIDTH = 52
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getDayRange(dateStr: string): string[] {
  const arr: string[] = []
  const base = new Date(dateStr + 'T12:00:00')
  for (let i = -3; i < 11; i++) {
    const d = new Date(base)
    d.setDate(d.getDate() + i)
    arr.push(d.toISOString().split('T')[0])
  }
  return arr
}

function formatHour(h: number): string {
  if (h === 0 || h === 24) return '12a'
  if (h === 12) return '12p'
  return h < 12 ? `${h}a` : `${h - 12}p`
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const h = d.getHours()
  const m = d.getMinutes()
  const label = h < 12 ? 'am' : 'pm'
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
  return m === 0 ? `${displayH}${label}` : `${displayH}:${String(m).padStart(2, '0')}${label}`
}

function getTop(iso: string): number {
  const d = new Date(iso)
  const hours = d.getHours() + d.getMinutes() / 60
  return hours * HOUR_HEIGHT
}

function getHeight(iso: string, isoEnd?: string | null): number {
  if (!isoEnd) return HOUR_HEIGHT  // default 1hr
  const start = new Date(iso).getTime()
  const end = new Date(isoEnd).getTime()
  const hours = (end - start) / 3_600_000
  return Math.max(HOUR_HEIGHT * 0.75, hours * HOUR_HEIGHT)
}

function jobColor(job: JobVisit['jobs']): string {
  if (job.status === 'paid') return '#16a34a'
  if (job.status === 'invoiced') return '#2563eb'
  if (job.is_urgent) return '#dc2626'
  return '#111111'
}

function nowPosition(): number | null {
  const now = new Date()
  const h = now.getHours() + now.getMinutes() / 60
  return h * HOUR_HEIGHT
}

export default function ScheduleView({ visits, selectedDate }: Props) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]
  const dayRange = getDayRange(selectedDate)
  const scrollRef = useRef<HTMLDivElement>(null)

  const [quickHour, setQuickHour] = useState<number | null>(null)
  const [quickTitle, setQuickTitle] = useState('')
  const [quickError, setQuickError] = useState('')
  const [saving, setSaving] = useState(false)
  const [nowTop, setNowTop] = useState<number | null>(nowPosition())

  // Auto-scroll to current time or 7am on mount
  useEffect(() => {
    const targetHour = selectedDate === today ? Math.max(0, (new Date().getHours()) - 1) : 7
    scrollRef.current?.scrollTo({ top: targetHour * HOUR_HEIGHT, behavior: 'instant' })
  }, [selectedDate, today])

  // Update now indicator every minute
  useEffect(() => {
    const interval = setInterval(() => setNowTop(nowPosition()), 60_000)
    return () => clearInterval(interval)
  }, [])

  const totalHeight = END_HOUR * HOUR_HEIGHT

  async function handleQuickSave() {
    if (!quickTitle.trim() || quickHour === null) return
    setSaving(true)
    setQuickError('')
    try {
      const h = String(quickHour).padStart(2, '0')
      const scheduledAt = `${selectedDate}T${h}:00:00`
      const scheduledEnd = `${selectedDate}T${String(quickHour + 1).padStart(2, '0')}:00:00`

      const jobRes = await fetch('/api/jobs/create-quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: quickTitle.trim() }),
      })
      const jobData = await jobRes.json()
      if (!jobRes.ok || !jobData.job?.id) {
        throw new Error(jobData.error || 'Job creation failed')
      }

      const visitRes = await fetch('/api/schedule/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobData.job.id, scheduled_at: scheduledAt, scheduled_end: scheduledEnd }),
      })
      const visitData = await visitRes.json()
      if (!visitRes.ok) {
        throw new Error(visitData.error || 'Visit creation failed')
      }

      setQuickHour(null)
      setQuickTitle('')
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save'
      setQuickError(msg)
      console.error('[quick-save]', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Day strip */}
      <div className="no-scrollbar" style={{ overflowX: 'auto', display: 'flex', gap: 4, marginBottom: 'var(--space-lg)', paddingBottom: 2 }}>
        {dayRange.map((day) => {
          const d = new Date(day + 'T12:00:00')
          const isSelected = day === selectedDate
          const isToday = day === today
          return (
            <button
              key={day}
              onClick={() => router.push(`/schedule?date=${day}`)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '7px 9px', borderRadius: 8, border: 'none',
                backgroundColor: isSelected ? '#111' : 'transparent',
                color: isSelected ? '#fff' : isToday ? '#111' : 'var(--text-secondary)',
                cursor: 'pointer', minWidth: 40, flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                {DAY_LABELS[d.getDay()]}
              </span>
              <span style={{ fontSize: 17, fontWeight: isSelected || isToday ? 700 : 400 }}>
                {d.getDate()}
              </span>
              {isToday && !isSelected && (
                <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#111', marginTop: 1 }} />
              )}
            </button>
          )
        })}
      </div>

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span className="text-section-header">
          {visits.length === 0 ? 'Nothing scheduled' : `${visits.length} job${visits.length !== 1 ? 's' : ''}`}
        </span>
        <Link href={`/jobs/create?date=${selectedDate}`}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px',
            borderRadius: 8, border: 'none', background: '#111', color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            <Plus size={14} strokeWidth={2.5} />
            Add Job
          </button>
        </Link>
      </div>

      {/* Scrollable calendar */}
      <div
        ref={scrollRef}
        className="no-scrollbar"
        style={{ overflowY: 'auto', height: 'calc(100dvh - 300px)', position: 'relative' }}
      >
        <div style={{ position: 'relative', height: totalHeight }}>
          {/* Hour rows */}
          {HOURS.map((hour, i) => (
            <div
              key={hour}
              onClick={() => { setQuickHour(hour); setQuickTitle(''); setQuickError('') }}
              style={{
                position: 'absolute', top: i * HOUR_HEIGHT, left: 0, right: 0,
                height: HOUR_HEIGHT, display: 'flex', cursor: 'pointer',
              }}
            >
              <div style={{ width: LABEL_WIDTH, flexShrink: 0, paddingTop: 4, paddingRight: 10, textAlign: 'right' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                  {formatHour(hour)}
                </span>
              </div>
              <div style={{ flex: 1, borderTop: '1px solid var(--border-light)' }} />
            </div>
          ))}

          {/* Current time indicator (only on today) */}
          {nowTop !== null && selectedDate === today && (
            <div style={{
              position: 'absolute', top: nowTop, left: LABEL_WIDTH, right: 0,
              height: 2, backgroundColor: '#dc2626', zIndex: 2, pointerEvents: 'none',
            }}>
              <div style={{
                position: 'absolute', left: -5, top: -4,
                width: 10, height: 10, borderRadius: '50%', backgroundColor: '#dc2626',
              }} />
            </div>
          )}

          {/* Job blocks */}
          {visits.map((visit) => {
            const top = getTop(visit.scheduled_at)
            const height = getHeight(visit.scheduled_at, visit.scheduled_end)
            const color = jobColor(visit.jobs)
            return (
              <Link
                key={visit.id}
                href={`/jobs/${visit.jobs.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div style={{
                  position: 'absolute',
                  top: top + 2,
                  left: LABEL_WIDTH + 4,
                  right: 4,
                  height: height - 4,
                  backgroundColor: color,
                  borderRadius: 8,
                  padding: '8px 10px',
                  overflow: 'hidden',
                  zIndex: 1,
                  cursor: 'pointer',
                }}>
                  <p style={{
                    margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: '#fff',
                    lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {visit.jobs.title}
                  </p>
                  {visit.jobs.customers && height > 48 && (
                    <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>
                      {visit.jobs.customers.name}
                    </p>
                  )}
                  <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>
                    {formatTime(visit.scheduled_at)}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Quick-add sheet */}
      {quickHour !== null && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)',
          zIndex: 200, display: 'flex', alignItems: 'flex-end',
        }}>
          <div style={{
            backgroundColor: 'var(--bg-primary)', borderRadius: '16px 16px 0 0',
            padding: 24, width: '100%',
            paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                {formatHour(quickHour)} — New Job
              </p>
              <button
                onClick={() => setQuickHour(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} strokeWidth={1.8} />
              </button>
            </div>
            <input
              className="input"
              placeholder="What needs to be done?"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuickSave()}
              autoFocus
              style={{ marginBottom: 12 }}
            />
            {quickError && <p className="error-text" style={{ marginBottom: 8 }}>{quickError}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn-primary"
                style={{ flex: 1 }}
                disabled={saving || !quickTitle.trim()}
                onClick={handleQuickSave}
              >
                {saving ? 'Adding...' : 'Add to Schedule'}
              </button>
              <Link
                href={`/jobs/create?date=${selectedDate}&hour=${quickHour}`}
                style={{ flex: 1 }}
              >
                <button
                  className="btn-secondary"
                  style={{ width: '100%' }}
                  onClick={() => setQuickHour(null)}
                >
                  Full Details
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
