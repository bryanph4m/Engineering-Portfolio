import crypto from 'node:crypto'
import { getBooking, updateBooking } from './_lib/redis.js'
import { deleteEvent } from './_lib/calendar.js'
import { cancelMessage } from './_lib/qstash.js'
import { sendCancellationEmail } from './_lib/email.js'

function timingSafeStringEqual(a, b) {
  const bufA = Buffer.from(String(a || ''))
  const bufB = Buffer.from(String(b || ''))
  return bufA.length === bufB.length && bufA.length > 0 && crypto.timingSafeEqual(bufA, bufB)
}

function isAdmin(req) {
  return timingSafeStringEqual(req.headers['x-admin-key'], process.env.ADMIN_SECRET)
}

async function doCancel(booking) {
  await deleteEvent(booking.calendarEventId)
  await cancelMessage(booking.qstashDayOfId)
  await cancelMessage(booking.qstashReminderId)
  await updateBooking(booking.id, { status: 'cancelled' })
  await sendCancellationEmail({ to: booking.email, name: booking.name, slotStart: new Date(booking.slotStart) })
}

export default async function handler(req, res) {
  const bookingId = req.method === 'GET' ? req.query.bookingId : req.body?.bookingId
  const booking = await getBooking(bookingId)
  if (!booking) {
    return req.method === 'GET'
      ? res.status(404).send('Booking not found.')
      : res.status(404).json({ error: 'Booking not found' })
  }

  if (req.method === 'GET') {
    if (!timingSafeStringEqual(req.query.token, booking.cancelToken)) {
      return res.status(403).send('Invalid or expired cancel link.')
    }
    if (booking.status === 'cancelled') return res.status(200).send('This booking is already cancelled.')
    await doCancel(booking)
    return res.status(200).send('Your meeting has been cancelled.')
  }

  if (req.method === 'POST') {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' })
    if (booking.status === 'cancelled') return res.status(200).json({ alreadyCancelled: true })
    await doCancel(booking)
    return res.status(200).json({ cancelled: true })
  }

  res.status(405).end()
}
