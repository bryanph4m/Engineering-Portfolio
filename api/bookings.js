import crypto from 'node:crypto'
import { redis } from './_lib/redis.js'

function isAdmin(req) {
  const provided = Buffer.from(String(req.headers['x-admin-key'] || ''))
  const expected = Buffer.from(String(process.env.ADMIN_SECRET || ''))
  return provided.length === expected.length && provided.length > 0 && crypto.timingSafeEqual(provided, expected)
}

// Admin-only, curl-driven for v1 — no dashboard UI. Bryan lists/cancels his
// own bookings with `curl -H "x-admin-key: ..." https://.../api/bookings`.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' })

  const keys = await redis.keys('booking:*')
  const bookings = keys.length ? await redis.mget(...keys) : []
  const upcoming = bookings
    .filter((b) => b && b.status === 'confirmed' && new Date(b.slotStart) > new Date())
    .sort((a, b) => new Date(a.slotStart) - new Date(b.slotStart))
  res.status(200).json({ bookings: upcoming })
}
