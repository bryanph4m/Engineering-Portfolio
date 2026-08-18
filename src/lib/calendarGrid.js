// Pure calendar-date arithmetic for the booking day grid (ui/CalendarBooking).
// Anchored to Date.UTC throughout so the visitor's own browser timezone never
// perturbs day/month math — these represent Pacific calendar dates (plain
// {y,m,d} objects), not instants. Only `pacificToday` talks to a real clock.

const PACIFIC = 'America/Los_Angeles'

export function pacificToday() {
  const s = new Intl.DateTimeFormat('en-CA', { timeZone: PACIFIC }).format(new Date()) // YYYY-MM-DD
  const [y, m, d] = s.split('-').map(Number)
  return { y, m, d }
}

export function addDays({ y, m, d }, n) {
  const u = new Date(Date.UTC(y, m - 1, d) + n * 86400000)
  return { y: u.getUTCFullYear(), m: u.getUTCMonth() + 1, d: u.getUTCDate() }
}

export function weekday({ y, m, d }) {
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

export function daysInMonth(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

export function dateKey({ y, m, d }) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
