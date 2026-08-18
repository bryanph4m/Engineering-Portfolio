// Minimal timezone conversion built on Intl — no date-fns-tz/luxon dependency
// needed for a single fixed IANA zone (Node's built-in ICU data already knows
// America/Los_Angeles, DST included). Converts a local wall-clock time in `tz`
// to the UTC instant it represents: guess the instant naively, ask Intl what
// wall time that guess actually falls on in `tz`, and correct for the
// difference. Converges within two passes for any real-world zone.

function offsetMinutes(date, tz) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date)
  const get = (t) => Number(parts.find((p) => p.type === t).value)
  const asUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return (asUTC - date.getTime()) / 60000
}

export function zonedTimeToUtc(year, month, day, hour, minute, tz) {
  let guess = new Date(Date.UTC(year, month - 1, day, hour, minute))
  for (let i = 0; i < 2; i++) {
    const offset = offsetMinutes(guess, tz)
    guess = new Date(Date.UTC(year, month - 1, day, hour, minute) - offset * 60000)
  }
  return guess
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function weekdayInZone(date, tz) {
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(date)
  return WEEKDAYS.indexOf(wd)
}
