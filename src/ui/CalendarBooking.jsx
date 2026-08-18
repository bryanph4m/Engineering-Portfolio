import { useEffect } from 'react'
import { useSceneStore } from '../store/useSceneStore'
import { CALENDAR_ID } from '../desk/constants'
import { useBooking } from '../lib/useBooking'
import { dateKey } from '../lib/calendarGrid'

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
 * All the booking-flow state and API calls live in lib/useBooking, shared
 * with simple mode's inline widget (simple/ContactBooking) — this component
 * is rendering only.
 */
export default function CalendarBooking() {
  const focusedId = useSceneStore((s) => s.focusedId)
  const close = useSceneStore((s) => s.close)
  const isOpen = focusedId === CALENDAR_ID

  const b = useBooking()

  // Full reset whenever the panel closes, so the next open always starts
  // fresh rather than resuming a half-finished booking from last time.
  useEffect(() => {
    if (!isOpen) b.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  if (!isOpen) return null

  const monthDays = b.monthDays

  return (
    <div className="cal-booking">
      <div className="cal-booking__panel" role="dialog" aria-label="Book a meeting">
        <button type="button" className="cal-booking__close" onClick={close} aria-label="Close">
          ×
        </button>

        {b.confirmation ? (
          <>
            <h2>you're booked</h2>
            <p className="cal-booking__when">{fmtDateTime(b.confirmation.slotStart)}</p>
            <p className="cal-booking__note">
              you'll get a confirmation email with the meeting link
            </p>
            <a className="cal-booking__cancel-link" href={b.confirmation.cancelUrl}>
              cancel this booking
            </a>
          </>
        ) : b.selectedSlot ? (
          <>
            <h2>your details</h2>
            <p className="cal-booking__when">{fmtDateTime(b.selectedSlot)} · your local time</p>
            <label className="cal-booking__field">
              name
              <input value={b.name} onChange={(e) => b.setName(e.target.value)} autoComplete="name" />
            </label>
            <label className="cal-booking__field">
              email
              <input
                type="email"
                value={b.email}
                onChange={(e) => b.setEmail(e.target.value)}
                autoComplete="email"
              />
            </label>
            {b.error && <p className="cal-booking__error">{b.error}</p>}
            <div className="cal-booking__actions">
              <button type="button" className="cal-booking__link" onClick={() => b.setSelectedSlot(null)}>
                back
              </button>
              <button
                type="button"
                className="cal-booking__submit"
                disabled={!b.name.trim() || !b.email.trim() || b.submitting}
                onClick={b.submitBooking}
              >
                {b.submitting ? 'booking…' : 'confirm'}
              </button>
            </div>
          </>
        ) : b.selectedDate ? (
          <>
            <h2>
              {MONTH_NAMES[b.selectedDate.m - 1]} {b.selectedDate.d}
            </h2>
            <p className="cal-booking__note">times shown in your local time zone</p>
            {b.loadingSlots && <p className="cal-booking__note">loading times…</p>}
            {b.error && <p className="cal-booking__error">{b.error}</p>}
            {!b.loadingSlots && b.slots && b.slots.length === 0 && (
              <p className="cal-booking__note">no open times that day</p>
            )}
            <div className="cal-booking__slots">
              {(b.slots || []).map((iso) => (
                <button key={iso} type="button" onClick={() => b.setSelectedSlot(iso)}>
                  {fmtTime(iso)}
                </button>
              ))}
            </div>
            <button type="button" className="cal-booking__link" onClick={() => b.setSelectedDate(null)}>
              back to calendar
            </button>
          </>
        ) : (
          <>
            <div className="cal-booking__month-nav">
              <button type="button" disabled={!b.canGoPrev} onClick={b.goPrevMonth} aria-label="Previous month">
                ‹
              </button>
              <h2>
                {MONTH_NAMES[b.viewYM.m - 1]} {b.viewYM.y}
              </h2>
              <button type="button" disabled={!b.canGoNext} onClick={b.goNextMonth} aria-label="Next month">
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
                    disabled={!b.isDayBookable(day)}
                    className="cal-booking__day"
                    onClick={() => b.setSelectedDate(day)}
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
