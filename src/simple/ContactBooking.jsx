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
 * Inline booking widget for the Contact article — the same flow as the desk
 * calendar's DOM overlay (ui/CalendarBooking), sharing all its state and API
 * calls via lib/useBooking, but laid out as plain Wikipedia-style content
 * (a table for the day grid, the chrome-font/border tokens the rest of
 * simple.css already uses) rather than a floating panel, since it lives in
 * the page flow instead of over the 3D desk.
 */
export default function ContactBooking() {
  const b = useBooking()
  // Weeks of 7, for a <table> row per week like Wikipedia's own calendar
  // infoboxes, padded with blanks so the grid always ends on a week boundary.
  // Copied rather than mutated in place — b.monthDays is memoized in the hook.
  const monthDays = [...b.monthDays]
  while (monthDays.length % 7 !== 0) monthDays.push(null)
  const weeks = []
  for (let i = 0; i < monthDays.length; i += 7) weeks.push(monthDays.slice(i, i + 7))

  if (b.confirmation) {
    return (
      <div className="wiki__booking">
        <p>
          <strong>You&rsquo;re booked</strong> for {fmtDateTime(b.confirmation.slotStart)}. A
          confirmation email is on its way with the meeting link.
        </p>
        <p>
          <a className="wiki-link" href={b.confirmation.cancelUrl}>Cancel this booking</a>
          {' · '}
          <a className="wiki-link" onClick={b.reset}>Book another</a>
        </p>
      </div>
    )
  }

  if (b.selectedSlot) {
    return (
      <div className="wiki__booking">
        <p className="wiki__meta">{fmtDateTime(b.selectedSlot)} · your local time</p>
        <label className="wiki__booking-field">
          Name
          <input value={b.name} onChange={(e) => b.setName(e.target.value)} autoComplete="name" />
        </label>
        <label className="wiki__booking-field">
          Email
          <input
            type="email"
            value={b.email}
            onChange={(e) => b.setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        {b.error && <p className="wiki__booking-error">{b.error}</p>}
        <p className="wiki__booking-actions">
          <a className="wiki-link" onClick={() => b.setSelectedSlot(null)}>← back</a>{' '}
          <button
            type="button"
            className="wiki__download wiki__booking-submit"
            disabled={!b.name.trim() || !b.email.trim() || b.submitting}
            onClick={b.submitBooking}
          >
            {b.submitting ? 'Booking…' : 'Confirm'}
          </button>
        </p>
      </div>
    )
  }

  if (b.selectedDate) {
    return (
      <div className="wiki__booking">
        <p className="wiki__meta">
          {MONTH_NAMES[b.selectedDate.m - 1]} {b.selectedDate.d} · times shown in your local time zone
        </p>
        {b.loadingSlots && <p className="wiki__meta">loading times…</p>}
        {b.error && <p className="wiki__booking-error">{b.error}</p>}
        {!b.loadingSlots && b.slots && b.slots.length === 0 && (
          <p className="wiki__meta">No open times that day.</p>
        )}
        <div className="wiki__booking-slots">
          {(b.slots || []).map((iso) => (
            <button
              key={iso}
              type="button"
              className="wiki__booking-slot"
              onClick={() => b.setSelectedSlot(iso)}
            >
              {fmtTime(iso)}
            </button>
          ))}
        </div>
        <p>
          <a className="wiki-link" onClick={() => b.setSelectedDate(null)}>← back to calendar</a>
        </p>
      </div>
    )
  }

  return (
    <div className="wiki__booking">
      <div className="wiki__booking-nav">
        <button type="button" disabled={!b.canGoPrev} onClick={b.goPrevMonth} aria-label="Previous month">
          ‹
        </button>
        <strong>{MONTH_NAMES[b.viewYM.m - 1]} {b.viewYM.y}</strong>
        <button type="button" disabled={!b.canGoNext} onClick={b.goNextMonth} aria-label="Next month">
          ›
        </button>
      </div>
      <table className="wiki__booking-cal">
        <thead>
          <tr>
            {WEEKDAY_LABELS.map((l, i) => <th key={i}>{l}</th>)}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, i) => (
            <tr key={i}>
              {week.map((day, j) =>
                day ? (
                  <td key={dateKey(day)}>
                    <button
                      type="button"
                      disabled={!b.isDayBookable(day)}
                      onClick={() => b.setSelectedDate(day)}
                    >
                      {day.d}
                    </button>
                  </td>
                ) : (
                  <td key={`pad-${j}`} />
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
