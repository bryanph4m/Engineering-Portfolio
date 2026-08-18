import { freeBusy } from './_lib/calendar.js'
import { slotsForDate } from './_lib/slots.js'
import { zonedTimeToUtc } from './_lib/tz.js'
import { availability } from '../src/content/availability.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(req.query.date || '')
  if (!match) return res.status(400).json({ error: 'date must be YYYY-MM-DD' })
  const [, yStr, moStr, daStr] = match
  const y = Number(yStr)
  const mo = Number(moStr)
  const da = Number(daStr)

  const dayStart = zonedTimeToUtc(y, mo, da, 0, 0, availability.timezone)
  const dayEnd = zonedTimeToUtc(y, mo, da, 24, 0, availability.timezone)

  try {
    const busy = await freeBusy(dayStart, dayEnd)
    const slots = slotsForDate(req.query.date, busy)
    res.status(200).json({ slots: slots.map((d) => d.toISOString()), slotMinutes: availability.slotMinutes })
  } catch (err) {
    console.error('[availability]', err)
    res.status(502).json({ error: 'Could not load availability' })
  }
}
