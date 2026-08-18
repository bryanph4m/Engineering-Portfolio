// Cal.com v2 API via plain fetch — a single API key, no OAuth token refresh.
// Cal.com only supplies busy intervals and holds the booking; the bookable
// hours themselves stay owned by src/content/availability.js + slots.js.

const CAL_BASE = 'https://api.cal.com/v2'
const CAL_API_VERSION = '2026-02-25'

function calHeaders(extra) {
  return {
    Authorization: `Bearer ${process.env.CALCOM_API_KEY}`,
    'cal-api-version': CAL_API_VERSION,
    ...extra,
  }
}

const dateOnly = (d) => d.toISOString().slice(0, 10)

/** Busy intervals (as `{start, end}` Dates) on the connected calendar between
 *  `timeMin`/`timeMax`. The query itself is date-granular, not minute-
 *  granular, but the intervals Cal.com returns carry exact timestamps, so
 *  slotsForDate's overlap check still filters precisely — this just risks
 *  fetching a little more than asked, never less. */
export async function freeBusy(timeMin, timeMax) {
  const params = new URLSearchParams({
    dateFrom: dateOnly(timeMin),
    dateTo: dateOnly(timeMax),
    timeZone: 'UTC',
    'calendarsToLoad[0][credentialId]': process.env.CALCOM_CALENDAR_CREDENTIAL_ID,
    'calendarsToLoad[0][externalId]': process.env.CALCOM_CALENDAR_EXTERNAL_ID,
  })
  const res = await fetch(`${CAL_BASE}/calendars/busy-times?${params}`, { headers: calHeaders() })
  if (!res.ok) throw new Error(`Cal.com busy-times failed: ${res.status} ${await res.text()}`)
  const { data } = await res.json()
  return data.map((b) => ({ start: new Date(b.start), end: new Date(b.end) }))
}

export async function createEvent({ name, start, end, attendeeEmail }) {
  const res = await fetch(`${CAL_BASE}/bookings`, {
    method: 'POST',
    headers: calHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      eventTypeId: Number(process.env.CALCOM_EVENT_TYPE_ID),
      start: start.toISOString(),
      lengthInMinutes: Math.round((end.getTime() - start.getTime()) / 60000),
      attendee: { name, email: attendeeEmail, timeZone: 'UTC' },
    }),
  })
  if (!res.ok) throw new Error(`Cal.com createEvent failed: ${res.status} ${await res.text()}`)
  const { data } = await res.json()
  return { id: data.uid }
}

export async function deleteEvent(eventId) {
  if (!eventId) return
  const res = await fetch(`${CAL_BASE}/bookings/${eventId}/cancel`, {
    method: 'POST',
    headers: calHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ cancellationReason: 'Cancelled by visitor' }),
  })
  // 404 = already gone — cancellation is idempotent, not an error.
  if (!res.ok && res.status !== 404) {
    throw new Error(`Cal.com deleteEvent failed: ${res.status} ${await res.text()}`)
  }
}
