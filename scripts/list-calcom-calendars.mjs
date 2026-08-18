#!/usr/bin/env node
/**
 * One-time helper: prints the credentialId + externalId of every calendar
 * connected to your Cal.com account, needed for CALCOM_CALENDAR_CREDENTIAL_ID
 * and CALCOM_CALENDAR_EXTERNAL_ID.
 *
 * Before running:
 *   1. Create a free Cal.com account at https://cal.com (no card required).
 *   2. Settings -> Developer -> API keys -> generate one, export CALCOM_API_KEY.
 *   3. Settings -> My Availability -> Calendars -> connect the calendar you
 *      want busy-time checked against (Google/Outlook/etc — this OAuth step
 *      happens on Cal.com's side, not this app's).
 *
 * Then: CALCOM_API_KEY=cal_... node scripts/list-calcom-calendars.mjs
 */
const API_KEY = process.env.CALCOM_API_KEY
if (!API_KEY) {
  console.error('Set CALCOM_API_KEY first.')
  process.exit(1)
}

const res = await fetch('https://api.cal.com/v2/calendars', {
  headers: { Authorization: `Bearer ${API_KEY}`, 'cal-api-version': '2026-02-25' },
})
if (!res.ok) {
  console.error(`Cal.com /v2/calendars failed: ${res.status} ${await res.text()}`)
  process.exit(1)
}

const { data } = await res.json()
for (const cal of data.connectedCalendars ?? []) {
  console.log(`${cal.integration?.name ?? cal.integration?.type ?? 'calendar'}:`)
  console.log(`  CALCOM_CALENDAR_CREDENTIAL_ID=${cal.credentialId}`)
  console.log(`  CALCOM_CALENDAR_EXTERNAL_ID=${cal.primary?.externalId ?? cal.primary?.email ?? ''}`)
}
