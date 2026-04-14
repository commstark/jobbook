'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, X } from 'lucide-react'
import { computeJobStatus, jobStatusColor } from '@/lib/jobStatus'

interface Invoice { status: string }
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
    invoices?: Invoice[] | null
  }
}

interface Props {
  visits: JobVisit[]
  selectedDate: string
}

const HOUR_HEIGHT = 64
const LABEL_WIDTH = 52
const ITEM_W = 44       // date strip item width px
const MIN_DURATION = 15 // minutes
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ---------- helpers ----------

function addMinutes(iso: string, minutes: number): string {
  const d = new Date(iso)
  d.setMinutes(d.getMinutes() + minutes)
  return d.toISOString().replace('Z', '').slice(0, 19)  // local ISO without timezone
}

function diffMinutes(isoA: string, isoB: string): number {
  return (new Date(isoB).getTime() - new Date(isoA).getTime()) / 60000
}

function snapMinutes(minutes: number, snap = 15): number {
  return Math.round(minutes / snap) * snap
}

function getTop(iso: string): number {
  const d = new Date(iso)
  return (d.getHours() + d.getMinutes() / 60) * HOUR_HEIGHT
}

function getHeight(iso: string, isoEnd?: string | null): number {
  if (!isoEnd) return HOUR_HEIGHT
  const start = new Date(iso).getTime()
  const end = new Date(isoEnd).getTime()
  const hours = (end - start) / 3_600_000
  return Math.max((MIN_DURATION / 60) * HOUR_HEIGHT, hours * HOUR_HEIGHT)
}

function formatHour(h: number): string {
  if (h === 0) return '12a'
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

function getMonthLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })
}

function nowPosition(): number | null {
  const now = new Date()
  return (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT
}

function blockColor(job: JobVisit['jobs']): string {
  const invoices = job.invoices || []
  return jobStatusColor(computeJobStatus(job.status, invoices))
}

// ---------- types ----------

type DragMode = 'time' | 'resize' | 'day'

interface DragState {
  visitId: string
  mode: DragMode
  startY: number
  startX: number
  startAt: string
  startEnd: string
  deltaMinutes: number
  floatX: number
  floatY: number
  hoveredDate: string | null
}

interface LocalVisit extends JobVisit {
  _displayAt?: string
  _displayEnd?: string
}

// ---------- component ----------

export default function ScheduleView({ visits: propVisits, selectedDate }: Props) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]

  const [localVisits, setLocalVisits] = useState<LocalVisit[]>(propVisits)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [visibleMonth, setVisibleMonth] = useState(getMonthLabel(selectedDate))
  const [nowTop, setNowTop] = useState<number | null>(nowPosition())

  // Quick-add
  const [quickHour, setQuickHour] = useState<number | null>(null)
  const [quickTitle, setQuickTitle] = useState('')
  const [quickError, setQuickError] = useState('')
  const [quickSaving, setQuickSaving] = useState(false)

  const dateStripRef = useRef<HTMLDivElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)
  const potentialDrag = useRef<{ visitId: string; startY: number; startX: number; startAt: string; startEnd: string } | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dragRef = useRef<DragState | null>(null) // kept in sync with drag state for pointer handlers

  // Sync dragRef with drag state
  useEffect(() => { dragRef.current = drag }, [drag])

  // Generate ±365 days
  const allDays = useMemo(() => {
    const days: string[] = []
    const base = new Date()
    for (let i = -365; i <= 365; i++) {
      const d = new Date(base)
      d.setDate(d.getDate() + i)
      days.push(d.toISOString().split('T')[0])
    }
    return days
  }, [])

  // Sync local visits when props change (page refresh)
  useEffect(() => { setLocalVisits(propVisits) }, [propVisits])

  // Scroll strip to selected date
  useEffect(() => {
    const idx = allDays.indexOf(selectedDate)
    if (idx >= 0 && dateStripRef.current) {
      const el = dateStripRef.current
      const target = idx * ITEM_W - el.clientWidth / 2 + ITEM_W / 2
      el.scrollLeft = Math.max(0, target)
    }
  }, [selectedDate, allDays])

  // Scroll calendar to current time or 7am
  useEffect(() => {
    const targetHour = selectedDate === today ? Math.max(0, new Date().getHours() - 1) : 7
    calendarRef.current?.scrollTo({ top: targetHour * HOUR_HEIGHT, behavior: 'instant' })
  }, [selectedDate, today])

  // Update now indicator
  useEffect(() => {
    const t = setInterval(() => setNowTop(nowPosition()), 60_000)
    return () => clearInterval(t)
  }, [])

  function onStripScroll() {
    const el = dateStripRef.current
    if (!el) return
    const centerIdx = Math.round((el.scrollLeft + el.clientWidth / 2) / ITEM_W)
    const date = allDays[Math.max(0, Math.min(allDays.length - 1, centerIdx))]
    if (date) setVisibleMonth(getMonthLabel(date))
  }

  // ---------- drag handlers ----------

  const updateVisitInDB = useCallback(async (visitId: string, scheduledAt: string, scheduledEnd: string) => {
    try {
      await fetch(`/api/schedule/visits/${visitId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduled_at: scheduledAt, scheduled_end: scheduledEnd }),
      })
      router.refresh()
    } catch (err) {
      console.error('[ScheduleView] visit update failed:', err)
      router.refresh()
    }
  }, [router])

  function clearLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  function handleBlockPointerDown(e: React.PointerEvent, visit: LocalVisit, isResize: boolean) {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)

    const startAt = visit._displayAt || visit.scheduled_at
    const startEnd = visit._displayEnd || visit.scheduled_end || addMinutes(startAt, 60)

    if (isResize) {
      setDrag({
        visitId: visit.id, mode: 'resize',
        startY: e.clientY, startX: e.clientX,
        startAt, startEnd, deltaMinutes: 0,
        floatX: e.clientX, floatY: e.clientY, hoveredDate: null,
      })
      return
    }

    // Track potential drag — will commit to 'time' or 'day' on move or long press
    potentialDrag.current = { visitId: visit.id, startY: e.clientY, startX: e.clientX, startAt, startEnd }

    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null
      const pd = potentialDrag.current
      if (!pd) return
      potentialDrag.current = null
      setDrag({
        visitId: pd.visitId, mode: 'day',
        startY: pd.startY, startX: pd.startX,
        startAt: pd.startAt, startEnd: pd.startEnd, deltaMinutes: 0,
        floatX: pd.startX, floatY: pd.startY, hoveredDate: null,
      })
    }, 500)
  }

  function handleBlockPointerMove(e: React.PointerEvent) {
    // Commit potential drag to 'time' mode if moved
    if (potentialDrag.current && !drag) {
      const pd = potentialDrag.current
      const dy = e.clientY - pd.startY
      const dx = e.clientX - pd.startX
      if (Math.abs(dy) > 6 || Math.abs(dx) > 6) {
        clearLongPress()
        potentialDrag.current = null
        setDrag({
          visitId: pd.visitId, mode: 'time',
          startY: pd.startY, startX: pd.startX,
          startAt: pd.startAt, startEnd: pd.startEnd, deltaMinutes: 0,
          floatX: pd.startX, floatY: pd.startY, hoveredDate: null,
        })
      }
      return
    }

    const d = dragRef.current
    if (!d) return

    if (d.mode === 'time') {
      const rawDelta = ((e.clientY - d.startY) / HOUR_HEIGHT) * 60
      const deltaMinutes = snapMinutes(rawDelta)
      if (deltaMinutes !== d.deltaMinutes) {
        setDrag(prev => prev ? { ...prev, deltaMinutes } : null)
      }
    } else if (d.mode === 'resize') {
      const rawDelta = ((e.clientY - d.startY) / HOUR_HEIGHT) * 60
      const curDuration = diffMinutes(d.startAt, d.startEnd)
      const deltaMinutes = Math.max(MIN_DURATION - curDuration, snapMinutes(rawDelta))
      if (deltaMinutes !== d.deltaMinutes) {
        setDrag(prev => prev ? { ...prev, deltaMinutes } : null)
      }
    } else if (d.mode === 'day') {
      setDrag(prev => prev ? { ...prev, floatX: e.clientX, floatY: e.clientY } : null)

      // Detect hover over date strip
      const strip = dateStripRef.current
      if (strip) {
        const rect = strip.getBoundingClientRect()
        if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
          const el = document.elementFromPoint(e.clientX, e.clientY)
          const dateEl = (el?.closest('[data-date]') as HTMLElement | null)
          const hovered = dateEl?.dataset.date || null
          if (hovered !== d.hoveredDate) {
            setDrag(prev => prev ? { ...prev, hoveredDate: hovered } : null)
          }
        } else {
          if (d.hoveredDate !== null) {
            setDrag(prev => prev ? { ...prev, hoveredDate: null } : null)
          }
        }
      }
    }
  }

  function handleBlockPointerUp(e: React.PointerEvent) {
    e.currentTarget.releasePointerCapture(e.pointerId)
    clearLongPress()
    potentialDrag.current = null

    const d = dragRef.current
    if (!d) return

    if (d.mode === 'time') {
      const newAt = addMinutes(d.startAt, d.deltaMinutes)
      const duration = diffMinutes(d.startAt, d.startEnd)
      const newEnd = addMinutes(newAt, duration)
      setLocalVisits(prev => prev.map(v =>
        v.id === d.visitId ? { ...v, _displayAt: newAt, _displayEnd: newEnd } : v
      ))
      updateVisitInDB(d.visitId, newAt, newEnd)

    } else if (d.mode === 'resize') {
      const newEnd = addMinutes(d.startEnd, d.deltaMinutes)
      const minEnd = addMinutes(d.startAt, MIN_DURATION)
      const finalEnd = new Date(newEnd) < new Date(minEnd) ? minEnd : newEnd
      setLocalVisits(prev => prev.map(v =>
        v.id === d.visitId ? { ...v, _displayEnd: finalEnd } : v
      ))
      updateVisitInDB(d.visitId, d.startAt, finalEnd)

    } else if (d.mode === 'day') {
      if (d.hoveredDate && d.hoveredDate !== selectedDate) {
        const origDate = d.startAt.slice(0, 10)
        const origStartTime = d.startAt.slice(11)
        const origEndTime = d.startEnd.slice(11)
        const newAt = `${d.hoveredDate}T${origStartTime}`
        const newEnd = `${d.hoveredDate}T${origEndTime}`
        // Remove from this day
        setLocalVisits(prev => prev.filter(v => v.id !== d.visitId))
        void origDate
        updateVisitInDB(d.visitId, newAt, newEnd)
        setTimeout(() => router.push(`/schedule?date=${d.hoveredDate}`), 200)
      }
    }

    setDrag(null)
  }

  function handleBlockPointerCancel() {
    clearLongPress()
    potentialDrag.current = null
    setDrag(null)
  }

  // ---------- quick-add ----------

  async function handleQuickSave() {
    if (!quickTitle.trim() || quickHour === null) return
    setQuickSaving(true)
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
      if (!jobRes.ok || !jobData.job?.id) throw new Error(jobData.error || 'Job creation failed')

      const visitRes = await fetch('/api/schedule/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobData.job.id, scheduled_at: scheduledAt, scheduled_end: scheduledEnd }),
      })
      const visitData = await visitRes.json()
      if (!visitRes.ok) throw new Error(visitData.error || 'Visit creation failed')

      setQuickHour(null)
      setQuickTitle('')
      router.refresh()
    } catch (err) {
      setQuickError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setQuickSaving(false)
    }
  }

  // ---------- render ----------

  const totalHeight = 24 * HOUR_HEIGHT

  return (
    <>
      {/* Month label */}
      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.3px' }}>
        {visibleMonth}
      </p>

      {/* Date strip */}
      <div
        ref={dateStripRef}
        className="no-scrollbar"
        onScroll={onStripScroll}
        style={{ overflowX: 'auto', display: 'flex', marginBottom: 'var(--space-lg)', paddingBottom: 2 }}
      >
        {allDays.map((day) => {
          const d = new Date(day + 'T12:00:00')
          const isSelected = day === selectedDate
          const isToday = day === today
          const isHovered = drag?.mode === 'day' && drag.hoveredDate === day
          return (
            <button
              key={day}
              data-date={day}
              onClick={() => { if (!drag) router.push(`/schedule?date=${day}`) }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '7px 0', borderRadius: 8, border: 'none', flexShrink: 0,
                width: ITEM_W,
                backgroundColor: isHovered ? '#2563eb' : isSelected ? '#111' : 'transparent',
                color: isHovered || isSelected ? '#fff' : isToday ? '#111' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'background-color 0.1s',
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                {DAY_LABELS[d.getDay()]}
              </span>
              <span style={{ fontSize: 17, fontWeight: isSelected || isToday || isHovered ? 700 : 400 }}>
                {d.getDate()}
              </span>
              {isToday && !isSelected && (
                <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#111', marginTop: 1 }} />
              )}
            </button>
          )
        })}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span className="text-section-header">
          {localVisits.length === 0 ? 'Nothing scheduled' : `${localVisits.length} job${localVisits.length !== 1 ? 's' : ''}`}
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

      {drag?.mode === 'day' && (
        <p style={{ fontSize: 12, color: 'var(--accent-blue)', marginBottom: 8, textAlign: 'center' }}>
          Drag to a day in the strip above to move
        </p>
      )}

      {/* Calendar */}
      <div
        ref={calendarRef}
        className="no-scrollbar"
        style={{ overflowY: 'auto', height: 'calc(100dvh - 340px)', position: 'relative' }}
      >
        <div style={{ position: 'relative', height: totalHeight }}>
          {/* Hour rows */}
          {HOURS.map((hour) => (
            <div
              key={hour}
              onClick={() => { setQuickHour(hour); setQuickTitle(''); setQuickError('') }}
              style={{
                position: 'absolute', top: hour * HOUR_HEIGHT, left: 0, right: 0,
                height: HOUR_HEIGHT, display: 'flex', cursor: 'pointer',
              }}
            >
              <div style={{ width: LABEL_WIDTH, flexShrink: 0, paddingTop: 4, paddingRight: 10, textAlign: 'right' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{formatHour(hour)}</span>
              </div>
              <div style={{ flex: 1, borderTop: '1px solid var(--border-light)' }} />
            </div>
          ))}

          {/* Now indicator */}
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
          {localVisits.map((visit) => {
            const displayAt = drag?.visitId === visit.id && drag.mode === 'time'
              ? addMinutes(visit._displayAt || visit.scheduled_at, drag.deltaMinutes)
              : (visit._displayAt || visit.scheduled_at)

            const displayEnd = drag?.visitId === visit.id && drag.mode === 'resize'
              ? addMinutes(visit._displayEnd || visit.scheduled_end || addMinutes(visit.scheduled_at, 60), drag.deltaMinutes)
              : (visit._displayEnd || visit.scheduled_end)

            const top = getTop(displayAt)
            const height = getHeight(displayAt, displayEnd)
            const color = blockColor(visit.jobs)
            const isBeingDragged = drag?.visitId === visit.id

            return (
              <div
                key={visit.id}
                style={{
                  position: 'absolute',
                  top: top + 2,
                  left: LABEL_WIDTH + 4,
                  right: 4,
                  height: height - 4,
                  backgroundColor: color,
                  borderRadius: 8,
                  overflow: 'hidden',
                  zIndex: isBeingDragged ? 10 : 1,
                  cursor: drag?.mode === 'day' ? 'grabbing' : 'grab',
                  opacity: isBeingDragged && drag.mode === 'day' ? 0.4 : 1,
                  touchAction: 'none',
                  userSelect: 'none',
                }}
                onPointerDown={(e) => handleBlockPointerDown(e, visit, false)}
                onPointerMove={handleBlockPointerMove}
                onPointerUp={handleBlockPointerUp}
                onPointerCancel={handleBlockPointerCancel}
              >
                {/* Job info (not tappable during drag) */}
                <Link
                  href={`/jobs/${visit.jobs.id}`}
                  style={{ textDecoration: 'none', display: 'block', padding: '8px 10px', height: '100%' }}
                  onClick={(e) => { if (drag) e.preventDefault() }}
                >
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
                    {formatTime(displayAt)}
                    {displayEnd && ` – ${formatTime(displayEnd)}`}
                  </p>
                </Link>

                {/* Resize handle */}
                <div
                  data-resize="true"
                  style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    height: 12, cursor: 'ns-resize',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    handleBlockPointerDown(e, visit, true)
                  }}
                  onPointerMove={handleBlockPointerMove}
                  onPointerUp={handleBlockPointerUp}
                  onPointerCancel={handleBlockPointerCancel}
                >
                  <div style={{
                    width: 24, height: 3, borderRadius: 2,
                    backgroundColor: 'rgba(255,255,255,0.4)',
                  }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Floating ghost for day-move */}
      {drag?.mode === 'day' && (
        <div style={{
          position: 'fixed',
          left: drag.floatX - 60,
          top: drag.floatY - 20,
          width: 120, padding: '6px 10px',
          background: '#111', borderRadius: 8,
          color: '#fff', fontSize: 12, fontWeight: 600,
          pointerEvents: 'none', zIndex: 1000,
          opacity: 0.9,
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        }}>
          {localVisits.find(v => v.id === drag.visitId)?.jobs.title}
        </div>
      )}

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
              <button onClick={() => setQuickHour(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
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
                disabled={quickSaving || !quickTitle.trim()}
                onClick={handleQuickSave}
              >
                {quickSaving ? 'Adding...' : 'Add to Schedule'}
              </button>
              <Link href={`/jobs/create?date=${selectedDate}&hour=${quickHour}`} style={{ flex: 1 }}>
                <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setQuickHour(null)}>
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
