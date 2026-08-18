import { useEffect, useMemo, useState } from 'react'
import { availability } from '../content/availability'
import { pacificToday, addDays, weekday, daysInMonth, dateKey } from './calendarGrid'

/**
 * All the stateful booking-flow logic shared by the desk calendar's DOM
 * overlay (ui/CalendarBooking) and the simple-mode Contact page's inline
 * widget (simple/ContactBooking) — day grid → GET /api/availability → slot
 * list → name/email → POST /api/book. Neither caller talks to the API
 * directly; both just render whatever this returns.
 *
 * Days are Pacific calendar dates (the server's bookable-hours timezone);
 * once a day is picked, its returned slot times are shown in the visitor's
 * own local time zone, which is the only place a browser-side timezone
 * matters here.
 */
export function useBooking() {
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

  const reset = () => {
    setViewYM({ y: today.y, m: today.m })
    setSelectedDate(null)
    setSlots(null)
    setSelectedSlot(null)
    setName('')
    setEmail('')
    setError(null)
    setConfirmation(null)
  }

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

  const isDayBookable = (day) => {
    if (availability.weekdays.indexOf(weekday(day)) < 0) return false
    const key = dateKey(day)
    return key >= dateKey(today) && key <= dateKey(windowEnd)
  }

  const monthDays = useMemo(() => {
    const days = []
    const firstWeekday = weekday({ y: viewYM.y, m: viewYM.m, d: 1 })
    for (let i = 0; i < firstWeekday; i++) days.push(null)
    for (let d = 1; d <= daysInMonth(viewYM.y, viewYM.m); d++) days.push({ y: viewYM.y, m: viewYM.m, d })
    return days
  }, [viewYM])

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

  return {
    viewYM, monthDays, canGoPrev, canGoNext, goPrevMonth, goNextMonth, isDayBookable,
    selectedDate, setSelectedDate, slots, loadingSlots, selectedSlot, setSelectedSlot,
    name, setName, email, setEmail, submitting, error, confirmation, submitBooking, reset,
  }
}
