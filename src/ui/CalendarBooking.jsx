import { useSceneStore } from '../store/useSceneStore'
import { useBookingStore } from '../store/useBookingStore'
import { CALENDAR_ID } from '../desk/constants'

const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })

/**
 * The desk calendar's only DOM surface. Everything else — the month grid,
 * the slot list, the confirmation screen — is painted and clicked directly
 * on the 3D model now (desk/CalendarModel, lib/calendarFace); this panel
 * exists purely because a canvas texture cannot give a visitor a real,
 * focusable, autofill-able text input, and name + email are the one step in
 * the flow that needs one. It mounts for exactly that step and nothing else,
 * reading and writing the same useBookingStore the model does.
 */
export default function CalendarBooking() {
  const isOpen = useSceneStore((s) => s.focusedId === CALENDAR_ID)
  const close = useSceneStore((s) => s.close)

  const selectedSlot = useBookingStore((s) => s.selectedSlot)
  const confirmation = useBookingStore((s) => s.confirmation)
  const name = useBookingStore((s) => s.name)
  const email = useBookingStore((s) => s.email)
  const setName = useBookingStore((s) => s.setName)
  const setEmail = useBookingStore((s) => s.setEmail)
  const error = useBookingStore((s) => s.error)
  const submitting = useBookingStore((s) => s.submitting)
  const submitBooking = useBookingStore((s) => s.submitBooking)
  const backToSlots = useBookingStore((s) => s.backToSlots)

  // Only the name/email step is a DOM form. Browsing the grid, picking a
  // slot, and reading the confirmation all happen on the model itself.
  if (!isOpen || !selectedSlot || confirmation) return null

  return (
    <div className="cal-booking">
      <div className="cal-booking__panel" role="dialog" aria-label="Your details">
        <button type="button" className="cal-booking__close" onClick={close} aria-label="Close">
          ×
        </button>
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
          <button type="button" className="cal-booking__link" onClick={backToSlots}>
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
      </div>
    </div>
  )
}
