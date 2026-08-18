import { create } from 'zustand'
import { availability } from '../content/availability'
import { pacificToday, addDays, weekday, daysInMonth, dateKey } from '../lib/calendarGrid'
import { PERF_HOOK } from '../lib/perfHook'

/**
 * The desk calendar's booking-flow state, shared between the 3D model
 * (desk/CalendarModel, which paints and hit-tests the month grid and the
 * slot list directly on the calendar's own face — see that file) and the DOM
 * form (ui/CalendarBooking) that the flow drops into only for the two fields
 * a canvas can't provide: name and email.
 *
 * A zustand store rather than a local hook because those are two separate
 * component subtrees on either side of the R3F Canvas boundary, the same
 * reason useSceneStore exists — CalendarModel writes `selectedDate`,
 * CalendarBooking reads `selectedSlot`, and neither can see the other's
 * local state. Two independent `useState`s here would silently drift.
 *
 * Deliberately NOT lib/useBooking: simple mode's inline widget
 * (simple/ContactBooking) has no 3D side to share with and is fine with its
 * own local state — this store is only for the desk pairing. The fetch/submit
 * calls are store actions rather than an effect so either side can trigger
 * them without owning a lifecycle the other doesn't share.
 */

const today = pacificToday()
const windowEnd = addDays(today, availability.bookingWindowDays)

const REST = {
  viewYM: { y: today.y, m: today.m },
  selectedDate: null,
  slots: null,
  loadingSlots: false,
  selectedSlot: null,
  name: '',
  email: '',
  submitting: false,
  error: null,
  confirmation: null,
}

export const useBookingStore = create((set, get) => ({
  today,
  windowEnd,
  ...REST,

  reset: () => set({ ...REST, viewYM: { y: today.y, m: today.m } }),

  goPrevMonth: () =>
    set((s) => ({
      viewYM: s.viewYM.m === 1 ? { y: s.viewYM.y - 1, m: 12 } : { y: s.viewYM.y, m: s.viewYM.m - 1 },
    })),
  goNextMonth: () =>
    set((s) => ({
      viewYM: s.viewYM.m === 12 ? { y: s.viewYM.y + 1, m: 1 } : { y: s.viewYM.y, m: s.viewYM.m + 1 },
    })),

  /** Pick a day: clears any stale slot pick and kicks off the availability fetch. */
  selectDate: (day) => {
    set({ selectedDate: day, slots: null, selectedSlot: null, error: null, loadingSlots: true })
    fetch(`/api/availability?date=${dateKey(day)}`)
      .then((r) => r.json())
      .then((data) => {
        if (get().selectedDate && dateKey(get().selectedDate) === dateKey(day)) {
          set({ slots: data.slots || [], loadingSlots: false })
        }
      })
      .catch(() => {
        if (get().selectedDate && dateKey(get().selectedDate) === dateKey(day)) {
          set({ error: 'Could not load times for that day.', loadingSlots: false })
        }
      })
  },
  backToCalendar: () => set({ selectedDate: null, slots: null, selectedSlot: null, error: null }),

  selectSlot: (iso) => set({ selectedSlot: iso, error: null }),
  backToSlots: () => set({ selectedSlot: null, error: null }),

  setName: (v) => set({ name: v }),
  setEmail: (v) => set({ email: v }),

  submitBooking: async () => {
    const { name, email, selectedSlot } = get()
    set({ submitting: true, error: null })
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, slotStart: selectedSlot }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong — try again.')
      set({ confirmation: data, submitting: false })
    } catch (err) {
      set({ error: err.message, submitting: false })
    }
  },

  isDayBookable: (day) => {
    if (availability.weekdays.indexOf(weekday(day)) < 0) return false
    const key = dateKey(day)
    return key >= dateKey(today) && key <= dateKey(windowEnd)
  },

  monthDays: () => {
    const { viewYM } = get()
    const days = []
    const firstWeekday = weekday({ y: viewYM.y, m: viewYM.m, d: 1 })
    for (let i = 0; i < firstWeekday; i++) days.push(null)
    for (let d = 1; d <= daysInMonth(viewYM.y, viewYM.m); d++) days.push({ y: viewYM.y, m: viewYM.m, d })
    return days
  },
  canGoPrev: () => {
    const { viewYM } = get()
    return `${viewYM.y}-${viewYM.m}` !== `${today.y}-${today.m}`
  },
  canGoNext: () => {
    const { viewYM } = get()
    return `${viewYM.y}-${viewYM.m}` !== `${windowEnd.y}-${windowEnd.m}`
  },
}))

// Same reasoning as useSceneStore's own window handle: lets QA tooling and
// the console drive the booking flow directly instead of synthesizing UV-
// accurate clicks against the WebGL canvas.
if (PERF_HOOK && typeof window !== 'undefined') {
  window.__bookingStore = useBookingStore
}
