import { availability } from '../../src/content/availability.js'
import { zonedTimeToUtc, weekdayInZone } from './tz.js'

/** Parse "YYYY-MM-DD" without timezone drift — never `new Date(str)`, which
 *  parses as UTC midnight and silently shifts a day in negative-offset zones. */
function parseDateParam(dateStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || '')
  if (!m) return null
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) }
}

/**
 * Every 30-min slot start (as a UTC Date) within working hours on `dateStr`,
 * excluding anything already busy, in the past, or outside the booking
 * window. `busy` is `[{start, end}]` UTC Dates, straight from freebusy.query.
 */
export function slotsForDate(dateStr, busy, now = new Date()) {
  const d = parseDateParam(dateStr)
  if (!d) return []

  const { timezone, weekdays, startHour, endHour, slotMinutes, bookingWindowDays } = availability
  const dayStart = zonedTimeToUtc(d.year, d.month, d.day, 0, 0, timezone)
  if (weekdays.indexOf(weekdayInZone(dayStart, timezone)) < 0) return []

  const windowEnd = new Date(now.getTime() + bookingWindowDays * 86400000)
  const slots = []
  for (let mins = startHour * 60; mins < endHour * 60; mins += slotMinutes) {
    const start = zonedTimeToUtc(d.year, d.month, d.day, Math.floor(mins / 60), mins % 60, timezone)
    const end = new Date(start.getTime() + slotMinutes * 60000)
    if (start <= now || start > windowEnd) continue
    const overlapsBusy = busy.some((b) => start < b.end && end > b.start)
    if (overlapsBusy) continue
    slots.push(start)
  }
  return slots
}
