const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateName(name) {
  if (typeof name !== 'string') return null
  const trimmed = name.trim()
  return trimmed.length > 0 && trimmed.length <= 100 ? trimmed : null
}

export function validateEmail(email) {
  if (typeof email !== 'string') return null
  const trimmed = email.trim()
  return trimmed.length <= 200 && EMAIL_RE.test(trimmed) ? trimmed.toLowerCase() : null
}

export function validateSlotStart(slotStart) {
  if (typeof slotStart !== 'string') return null
  const d = new Date(slotStart)
  return Number.isNaN(d.getTime()) ? null : d
}
