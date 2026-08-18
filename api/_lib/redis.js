import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

const bookingKey = (id) => `booking:${id}`

export async function saveBooking(booking) {
  await redis.set(bookingKey(booking.id), booking)
}

export async function getBooking(id) {
  return id ? redis.get(bookingKey(id)) : null
}

export async function updateBooking(id, patch) {
  const existing = await getBooking(id)
  if (!existing) return null
  const next = { ...existing, ...patch }
  await redis.set(bookingKey(id), next)
  return next
}
