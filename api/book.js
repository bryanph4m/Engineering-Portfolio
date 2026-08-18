import crypto from 'node:crypto'
import { freeBusy, createEvent } from './_lib/calendar.js'
import { slotsForDate, isNearTerm, dayOfSendTime } from './_lib/slots.js'
import { scheduleAt } from './_lib/qstash.js'
import { saveBooking } from './_lib/redis.js'
import { checkRateLimit } from './_lib/rateLimit.js'
import { validateName, validateEmail, validateSlotStart } from './_lib/validate.js'
import { sendConfirmationEmail } from './_lib/email.js'
import { availability } from '../src/content/availability.js'

const SITE_URL = process.env.SITE_URL || 'https://bryan-pham-portfolio.vercel.app'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown'
  const withinLimit = await checkRateLimit(ip)
  if (!withinLimit) return res.status(429).json({ error: 'Too many bookings from this address today' })

  const name = validateName(req.body?.name)
  const email = validateEmail(req.body?.email)
  const slotStart = validateSlotStart(req.body?.slotStart)
  if (!name || !email || !slotStart) {
    return res.status(400).json({ error: 'name, email, and a valid slotStart are required' })
  }

  const slotEnd = new Date(slotStart.getTime() + availability.slotMinutes * 60000)
  // en-CA formats as YYYY-MM-DD in the target zone — the exact shape slotsForDate wants.
  const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: availability.timezone }).format(slotStart)

  try {
    // Re-validate against live freebusy — never trust the client's claim that
    // this slot is open.
    const busy = await freeBusy(
      new Date(slotStart.getTime() - 3600000),
      new Date(slotEnd.getTime() + 3600000)
    )
    const stillOpen = slotsForDate(dateStr, busy).some((s) => s.getTime() === slotStart.getTime())
    if (!stillOpen) return res.status(409).json({ error: 'That slot is no longer available' })

    const event = await createEvent({ name, start: slotStart, end: slotEnd, attendeeEmail: email })

    const id = crypto.randomUUID()
    const cancelToken = crypto.randomBytes(24).toString('hex')
    const booking = {
      id,
      name,
      email,
      slotStart: slotStart.toISOString(),
      slotEnd: slotEnd.toISOString(),
      calendarEventId: event.id,
      status: 'confirmed',
      cancelToken,
      qstashDayOfId: null,
      qstashReminderId: null,
    }

    const now = new Date()
    const cancelUrl = `${SITE_URL}/api/cancel?bookingId=${id}&token=${cancelToken}`

    if (isNearTerm(slotStart, now)) {
      // Both delayed sends would already be moot — hand over the Zoom link
      // immediately instead of scheduling emails that fire seconds apart.
      await sendConfirmationEmail({ to: email, name, slotStart, cancelUrl, zoomLink: process.env.ZOOM_LINK })
    } else {
      await sendConfirmationEmail({ to: email, name, slotStart, cancelUrl })
      const dayOf = dayOfSendTime(slotStart, now)
      const reminder = new Date(slotStart.getTime() - 30 * 60000)
      if (dayOf) {
        booking.qstashDayOfId = await scheduleAt(
          `${SITE_URL}/api/send-reminder`,
          { bookingId: id, kind: 'dayOf' },
          dayOf
        )
      }
      booking.qstashReminderId = await scheduleAt(
        `${SITE_URL}/api/send-reminder`,
        { bookingId: id, kind: 'reminder' },
        reminder
      )
    }

    await saveBooking(booking)
    res.status(200).json({ id, slotStart: booking.slotStart, cancelUrl })
  } catch (err) {
    console.error('[book]', err)
    res.status(502).json({ error: 'Could not complete the booking' })
  }
}
