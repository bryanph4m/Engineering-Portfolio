import { verifyQstashRequest } from './_lib/qstash.js'
import { getBooking } from './_lib/redis.js'
import { sendDayOfEmail, sendThirtyMinEmail } from './_lib/email.js'
import { readRawBody } from './_lib/rawBody.js'

// QStash's signature is verified against the exact raw bytes, so the
// automatic JSON body parser has to stay off for this route.
export const config = { api: { bodyParser: false } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const raw = await readRawBody(req)
  const valid = await verifyQstashRequest(req, raw)
  if (!valid) return res.status(401).json({ error: 'Invalid signature' })

  let payload
  try {
    payload = JSON.parse(raw)
  } catch {
    return res.status(400).json({ error: 'Bad payload' })
  }

  const { bookingId, kind } = payload
  const booking = await getBooking(bookingId)
  if (!booking || booking.status !== 'confirmed') {
    // Cancelled or gone — no-op, not an error, so QStash doesn't retry it.
    return res.status(200).json({ skipped: true })
  }

  const slotStart = new Date(booking.slotStart)
  const zoomLink = process.env.ZOOM_LINK
  if (kind === 'dayOf') {
    await sendDayOfEmail({ to: booking.email, name: booking.name, slotStart, zoomLink })
  } else {
    await sendThirtyMinEmail({ to: booking.email, name: booking.name, zoomLink })
  }
  res.status(200).json({ sent: true })
}
