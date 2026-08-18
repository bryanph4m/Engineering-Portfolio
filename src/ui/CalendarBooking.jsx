import { useEffect, useMemo, useState } from 'react'
import { useSceneStore } from '../store/useSceneStore'
import { CALENDAR_ID } from '../desk/constants'
import { availability } from '../content/availability'
import { pacificToday, addDays, weekday, daysInMonth, dateKey } from '../lib/calendarGrid'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

/**
 * The desk calendar's real UI. The 3D prop (desk/CalendarModel) has nothing
 * to read on it — this is the entire interaction, a plain fixed-position DOM
 * overlay gated on the same focusedId, exactly the pattern HudHints/Loader
 * already use (this codebase has no drei <Html> / screen-projection
 * mechanism anywhere — see that pattern note in index.css above .hud).
 *
 * Day grid → GET /api/availability → slot list → name/email → POST /api/book.
 * Days are Pacific calendar dates (the server's bookable-hours timezone);
 * once a day is picked, its returned slot times are shown in the visitor's
 * own local time zone, which is the only place a browser-side timezone
 * matters here.
 */
export default function CalendarBooking() {
  const focusedId = useSceneStore((s) => s.focusedId)
  const close = useSceneStore((s) => s.close)
  const isOpen = focusedId === CALENDAR_ID

  const today = useMemo(() => pacificToday(), [])
  const windowEnd = useMemo(() => addDays(today, availability.bookingWindowDays), [today])

  const [viewYM, setViewYM] = useState({ y: today.y, m: today.m })
  const [selectedDate, setSelectedDate] = useState(null)
  const [slots, setSlots] = useState(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [confirmation, setConfirmation] = useState(null)

  // Full reset whenever the panel closes, so the next open always starts
  // fresh rather than resuming a half-finished booking from last time.
  useEffect(() => {
    if (isOpen) return
    setViewYM({ y: today.y, m: today.m })
    setSelectedDate(null)
    setSlots(null)
    setSelectedSlot(null)
    setName('')
    setEmail('')
    setError(null)
    setConfirmation(null)
  }, [isOpen, today])

  useEffect(() => {
    if (!selectedDate) return
    let alive = true
    setLoadingSlots(true)
    setError(null)
    fetch(`/api/availability?date=${dateKey(selectedDate)}`)
      .then((r) => r.json())
      .then((data) => {
        if (alive) setSlots(data.slots || [])
      })
      .catch(() => {
        if (alive) setError('Could not load times for that day.')
      })
      .finally(() => {
        if (alive) setLoadingSlots(false)
      })
    return () => {
      alive = false
    }
  }, [selectedDate])

  if (!isOpen) return null

  const isDayBookable = (day) => {
    if (availability.weekdays.indexOf(weekday(day)) < 0) return false
    const key = dateKey(day)
    return key >= dateKey(today) && key <= dateKey(windowEnd)
  }

  const monthDays = []
  const firstWeekday = weekday({ y: viewYM.y, m: viewYM.m, d: 1 })
  for (let i = 0; i < firstWeekday; i++) monthDays.push(null)
  for (let d = 1; d <= daysInMonth(viewYM.y, viewYM.m); d++) monthDays.push({ y: viewYM.y, m: viewYM.m, d })

  const canGoPrev = `${viewYM.y}-${viewYM.m}` !== `${today.y}-${today.m}`
  const canGoNext = `${viewYM.y}-${viewYM.m}` !== `${windowEnd.y}-${windowEnd.m}`

  const goPrevMonth = () => setViewYM((v) => (v.m === 1 ? { y: v.y - 1, m: 12 } : { y: v.y, m: v.m - 1 }))
  const goNextMonth = () => setViewYM((v) => (v.m === 12 ? { y: v.y + 1, m: 1 } : { y: v.y, m: v.m + 1 }))

  const submitBooking = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, slotStart: selectedSlot }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong — try again.')
      setConfirmation(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="cal-booking">
      <div className="cal-booking__panel" role="dialog" aria-label="Book a meeting">
        <button type="button" className="cal-booking__close" onClick={close} aria-label="Close">
          ×
        </button>

        {confirmation ? (
          <>
            <h2>you're booked</h2>
            <p className="cal-booking__when">{fmtDateTime(confirmation.slotStart)}</p>
            <p className="cal-booking__note">
              you'll get a zoom link on the day of the meeting, and again 30 minutes before it starts
            </p>
            <a className="cal-booking__cancel-link" href={confirmation.cancelUrl}>
              cancel this booking
            </a>
          </>
        ) : selectedSlot ? (
          <>
            <h2>your details</h2>
            <p className="cal-booking__when">{fmtDateTime(selectedSlot)} · your local time</p>
            <label className="cal-booking__field">
              name
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </label>
            <label className="cal-booking__field">
              email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </label>
            {error && <p className="cal-booking__error">{error}</p>}
            <div className="cal-booking__actions">
              <button type="button" className="cal-booking__link" onClick={() => setSelectedSlot(null)}>
                back
              </button>
              <button
                type="button"
                className="cal-booking__submit"
                disabled={!name.trim() || !email.trim() || submitting}
                onClick={submitBooking}
              >
                {submitting ? 'booking…' : 'confirm'}
              </button>
            </div>
          </>
        ) : selectedDate ? (
          <>
            <h2>
              {MONTH_NAMES[selectedDate.m - 1]} {selectedDate.d}
            </h2>
            <p className="cal-booking__note">times shown in your local time zone</p>
            {loadingSlots && <p className="cal-booking__note">loading times…</p>}
            {error && <p className="cal-booking__error">{error}</p>}
            {!loadingSlots && slots && slots.length === 0 && (
              <p className="cal-booking__note">no open times that day</p>
            )}
            <div className="cal-booking__slots">
              {(slots || []).map((iso) => (
                <button key={iso} type="button" onClick={() => setSelectedSlot(iso)}>
                  {fmtTime(iso)}
                </button>
              ))}
            </div>
            <button type="button" className="cal-booking__link" onClick={() => setSelectedDate(null)}>
              back to calendar
            </button>
          </>
        ) : (
          <>
            <div className="cal-booking__month-nav">
              <button type="button" disabled={!canGoPrev} onClick={goPrevMonth} aria-label="Previous month">
                ‹
              </button>
              <h2>
                {MONTH_NAMES[viewYM.m - 1]} {viewYM.y}
              </h2>
              <button type="button" disabled={!canGoNext} onClick={goNextMonth} aria-label="Next month">
                ›
              </button>
            </div>
            <div className="cal-booking__grid">
              {WEEKDAY_LABELS.map((l, i) => (
                <div key={i} className="cal-booking__grid-label">
                  {l}
                </div>
              ))}
              {monthDays.map((day, i) =>
                day ? (
                  <button
                    key={dateKey(day)}
                    type="button"
                    disabled={!isDayBookable(day)}
                    className="cal-booking__day"
                    onClick={() => setSelectedDate(day)}
                  >
                    {day.d}
                  </button>
                ) : (
                  <div key={`pad-${i}`} />
                )
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
