// Resend via plain fetch — a single REST endpoint doesn't earn the SDK.

const RESEND_URL = 'https://api.resend.com/emails'

async function sendEmail({ to, subject, html }) {
  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: process.env.RESEND_FROM, to, subject, html }),
  })
  if (!res.ok) throw new Error(`Resend send failed: ${res.status} ${await res.text()}`)
  return res.json()
}

const fmt = (date) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(date)

export async function sendConfirmationEmail({ to, name, slotStart, cancelUrl, zoomLink }) {
  const when = fmt(slotStart)
  const zoomLine = zoomLink
    ? `<p>Since this meeting is coming up very soon, here's the Zoom link now: <a href="${zoomLink}">${zoomLink}</a></p>`
    : `<p>You'll get a Zoom link on the day of the meeting, and again 30 minutes before it starts.</p>`
  return sendEmail({
    to,
    subject: `You're booked with Bryan Pham — ${when}`,
    html: `<p>Hi ${name},</p><p>You're confirmed for <strong>${when}</strong>.</p>${zoomLine}<p><a href="${cancelUrl}">Cancel this booking</a></p>`,
  })
}

export async function sendDayOfEmail({ to, name, slotStart, zoomLink }) {
  const when = fmt(slotStart)
  return sendEmail({
    to,
    subject: `Reminder: your meeting with Bryan Pham today at ${when}`,
    html: `<p>Hi ${name},</p><p>Just a reminder — your meeting is today at <strong>${when}</strong>.</p><p>Zoom link: <a href="${zoomLink}">${zoomLink}</a></p>`,
  })
}

export async function sendThirtyMinEmail({ to, name, zoomLink }) {
  return sendEmail({
    to,
    subject: `Starting soon: your meeting with Bryan Pham`,
    html: `<p>Hi ${name},</p><p>Your meeting starts in 30 minutes.</p><p>Join here: <a href="${zoomLink}">${zoomLink}</a></p>`,
  })
}

export async function sendCancellationEmail({ to, name, slotStart }) {
  const when = fmt(slotStart)
  return sendEmail({
    to,
    subject: `Cancelled: your meeting with Bryan Pham`,
    html: `<p>Hi ${name},</p><p>Your meeting on <strong>${when}</strong> has been cancelled.</p>`,
  })
}
