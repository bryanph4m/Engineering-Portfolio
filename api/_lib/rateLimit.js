import { redis } from './redis.js'

const DAILY_CAP = 5

/** True if `ip` is still under today's booking cap. Also counts this call
 *  toward the cap, so callers should only invoke it once per request. */
export async function checkRateLimit(ip) {
  const day = new Date().toISOString().slice(0, 10)
  const key = `ratelimit:${ip}:${day}`
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, 86400)
  return count <= DAILY_CAP
}
