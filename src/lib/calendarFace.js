import * as THREE from 'three'
import { HAND, MONO, TYPE } from './docTextures'
import { dateKey } from './calendarGrid'
import { QUALITY } from './quality'
import { PERF_HOOK } from './perfHook'

/**
 * Paints the desk calendar's own face — the month grid, the slot list, and
 * the confirmation screen are drawn directly on the model, exactly the way
 * every paper document paints its own content (lib/docTextures) and hit-tests
 * it by UV (Document.jsx's hotspotAt / RocketModel's cornerAt). The calendar
 * used to hand all of this to a floating DOM card instead — which meant a
 * physical panel and a separate interactive card were both on screen at
 * once, reading as two calendars rather than one. Only the two fields a
 * canvas genuinely can't provide — name and email — still surface as DOM
 * (ui/CalendarBooking), and only for the one step that needs them.
 *
 * `paintCalendarFace` returns the hit regions it drew alongside the pixels,
 * in the SAME top-down UV space desk/CalendarModel's click handler tests
 * against (v = 0 at the top, matching canvas y/H) — one pass computes both,
 * so a region can never drift from what was actually painted where.
 */

export const FACE_W = 960
export const FACE_H = 1200

export const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
]
const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const INK = '#33291d'
const INK_DIM = 'rgba(51,41,29,0.55)'
const INK_FAINT = 'rgba(51,41,29,0.3)'
const ACCENT = '#b3563f'
const PAPER = '#f4ecd8'

const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })

const header = (ctx, title) => {
  ctx.fillStyle = INK
  ctx.font = `400 52px ${TYPE}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(title, FACE_W / 2, 92)
  ctx.strokeStyle = INK_FAINT
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(60, 118)
  ctx.lineTo(FACE_W - 60, 118)
  ctx.stroke()
}

const closeButton = (ctx, regions) => {
  const cx = FACE_W - 54
  const cy = 54
  ctx.strokeStyle = INK_DIM
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(cx - 14, cy - 14)
  ctx.lineTo(cx + 14, cy + 14)
  ctx.moveTo(cx + 14, cy - 14)
  ctx.lineTo(cx - 14, cy + 14)
  ctx.stroke()
  regions.push(pxRegion(cx - 26, cy - 26, cx + 26, cy + 26, { action: 'close' }))
}

const backLink = (ctx, regions, label, y, action) => {
  ctx.fillStyle = INK_DIM
  ctx.font = `26px ${MONO}`
  ctx.textAlign = 'left'
  const x = 64
  ctx.fillText(`< ${label}`, x, y)
  const w = ctx.measureText(`< ${label}`).width
  regions.push(pxRegion(x - 10, y - 34, x + w + 10, y + 12, { action }))
}

/** Convert a pixel rect (canvas space, y-down) straight into the same
 *  top-down UV space the click handler tests against — no separate mapping
 *  to keep in sync, since FACE_W/FACE_H is what both sides agree on. */
const pxRegion = (x0, y0, x1, y1, extra) => ({
  u0: x0 / FACE_W,
  u1: x1 / FACE_W,
  v0: y0 / FACE_H,
  v1: y1 / FACE_H,
  ...extra,
})

function paintGrid(ctx, regions, s) {
  header(ctx, 'book a meeting')
  closeButton(ctx, regions)

  const monthLabel = `${MONTH_NAMES[s.viewYM.m - 1]} ${s.viewYM.y}`
  ctx.fillStyle = INK
  ctx.font = `30px ${MONO}`
  ctx.textAlign = 'center'
  ctx.fillText(monthLabel, FACE_W / 2, 178)

  // Prev / next month arrows, disabled outside the bookable window.
  const arrowY = 168
  ctx.font = `36px ${MONO}`
  ctx.fillStyle = s.canGoPrev ? INK : INK_FAINT
  ctx.textAlign = 'left'
  ctx.fillText('<', 70, arrowY)
  if (s.canGoPrev) regions.push(pxRegion(50, arrowY - 34, 110, arrowY + 14, { action: 'prevMonth' }))
  ctx.fillStyle = s.canGoNext ? INK : INK_FAINT
  ctx.textAlign = 'right'
  ctx.fillText('>', FACE_W - 70, arrowY)
  if (s.canGoNext) {
    regions.push(pxRegion(FACE_W - 110, arrowY - 34, FACE_W - 50, arrowY + 14, { action: 'nextMonth' }))
  }

  const cols = 7
  const gridX = 64
  const gridTop = 230
  const cell = (FACE_W - gridX * 2) / cols

  ctx.font = `22px ${MONO}`
  ctx.textAlign = 'center'
  ctx.fillStyle = INK_DIM
  WEEKDAY_LABELS.forEach((l, i) => {
    ctx.fillText(l, gridX + i * cell + cell / 2, gridTop - 14)
  })

  ctx.font = `26px ${MONO}`
  s.monthDays.forEach((day, i) => {
    if (!day) return
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = gridX + col * cell
    const y = gridTop + row * cell
    const cx = x + cell / 2
    const cy = y + cell / 2
    const bookable = s.isDayBookable(day)
    const isSelected = s.selectedDate && dateKey(s.selectedDate) === dateKey(day)

    if (isSelected) {
      ctx.strokeStyle = ACCENT
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.ellipse(cx, cy, cell * 0.36, cell * 0.34, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.fillStyle = bookable ? INK : INK_FAINT
    ctx.textBaseline = 'middle'
    ctx.fillText(String(day.d), cx, cy + 2)
    ctx.textBaseline = 'alphabetic'

    if (bookable) {
      regions.push(pxRegion(x + 4, y + 4, x + cell - 4, y + cell - 4, { action: 'selectDate', day }))
    }
  })

  const rows = Math.ceil(s.monthDays.length / cols)
  ctx.fillStyle = '#7a5a2f'
  ctx.font = `28px ${HAND}`
  ctx.textAlign = 'center'
  ctx.fillText('pick a day, pick a time', FACE_W / 2, gridTop + rows * cell + 56)
}

function paintSlots(ctx, regions, s) {
  header(ctx, `${MONTH_NAMES[s.selectedDate.m - 1]} ${s.selectedDate.d}`)
  closeButton(ctx, regions)
  backLink(ctx, regions, 'back to calendar', 160, 'backToCalendar')

  ctx.fillStyle = INK_DIM
  ctx.font = `24px ${MONO}`
  ctx.textAlign = 'center'
  ctx.fillText('times shown in your local time zone', FACE_W / 2, 210)

  if (s.loadingSlots) {
    ctx.fillStyle = INK_DIM
    ctx.fillText('loading times…', FACE_W / 2, 300)
    return
  }
  if (s.error) {
    ctx.fillStyle = ACCENT
    ctx.fillText(s.error, FACE_W / 2, 300)
    return
  }
  if (s.slots && s.slots.length === 0) {
    ctx.fillStyle = INK_DIM
    ctx.fillText('no open times that day', FACE_W / 2, 300)
    return
  }

  const cols = 3
  const gridX = 80
  const gridTop = 260
  const cellW = (FACE_W - gridX * 2) / cols
  const cellH = 84
  ;(s.slots || []).forEach((iso, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = gridX + col * cellW
    const y = gridTop + row * cellH
    const label = fmtTime(iso)
    const isSelected = s.selectedSlot === iso

    ctx.strokeStyle = isSelected ? ACCENT : INK_FAINT
    ctx.lineWidth = isSelected ? 3 : 1.5
    ctx.strokeRect(x + 10, y + 10, cellW - 20, cellH - 24)
    ctx.fillStyle = isSelected ? ACCENT : INK
    ctx.font = `24px ${MONO}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, x + cellW / 2, y + (cellH - 14) / 2 + 10)
    ctx.textBaseline = 'alphabetic'

    regions.push(pxRegion(x + 6, y + 6, x + cellW - 6, y + cellH - 10, { action: 'selectSlot', iso }))
  })
}

function paintDetails(ctx, regions, s) {
  header(ctx, 'your details')
  closeButton(ctx, regions)
  backLink(ctx, regions, 'back', 160, 'backToSlots')

  ctx.fillStyle = INK
  ctx.font = `28px ${MONO}`
  ctx.textAlign = 'center'
  wrapText(ctx, fmtDateTime(s.selectedSlot), FACE_W / 2, 240, FACE_W - 140, 34)

  ctx.fillStyle = '#7a5a2f'
  ctx.font = `26px ${HAND}`
  ctx.fillText('enter your name & email below', FACE_W / 2, 340)
  if (s.error) {
    ctx.fillStyle = ACCENT
    ctx.font = `22px ${MONO}`
    wrapText(ctx, s.error, FACE_W / 2, 380, FACE_W - 140, 28)
  }
}

function paintConfirmed(ctx, regions, s) {
  header(ctx, "you're booked")
  closeButton(ctx, regions)

  ctx.fillStyle = INK
  ctx.font = `28px ${MONO}`
  ctx.textAlign = 'center'
  wrapText(ctx, fmtDateTime(s.confirmation.slotStart), FACE_W / 2, 210, FACE_W - 140, 34)

  ctx.fillStyle = INK_DIM
  ctx.font = `22px ${MONO}`
  wrapText(ctx, "you'll get a confirmation email with the meeting link", FACE_W / 2, 300, FACE_W - 160, 30)

  if (s.confirmation.cancelUrl) {
    const y = 400
    ctx.strokeStyle = INK
    ctx.lineWidth = 1.5
    ctx.fillStyle = INK
    ctx.font = `24px ${MONO}`
    const label = 'cancel this booking'
    ctx.fillText(label, FACE_W / 2, y)
    const w = ctx.measureText(label).width
    ctx.beginPath()
    ctx.moveTo(FACE_W / 2 - w / 2, y + 6)
    ctx.lineTo(FACE_W / 2 + w / 2, y + 6)
    ctx.stroke()
    regions.push(
      pxRegion(FACE_W / 2 - w / 2 - 10, y - 30, FACE_W / 2 + w / 2 + 10, y + 14, {
        action: 'cancel',
        href: s.confirmation.cancelUrl,
      })
    )
  }
}

function wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
  const words = text.split(' ')
  let line = ''
  let cy = y
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, cx, cy)
      line = word
      cy += lineHeight
    } else {
      line = test
    }
  }
  if (line) ctx.fillText(line, cx, cy)
}

/**
 * Paints one view of the calendar face onto a pre-scaled 2D context and
 * returns the hit regions for it, in top-down UV space. `s` carries exactly
 * the fields each view needs — see desk/CalendarModel for how it's
 * assembled from useBookingStore.
 */
function paintCalendarFace(ctx, s) {
  ctx.clearRect(0, 0, FACE_W, FACE_H)
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, FACE_W, FACE_H)

  const regions = []
  if (s.confirmation) paintConfirmed(ctx, regions, s)
  else if (s.selectedSlot) paintDetails(ctx, regions, s)
  else if (s.selectedDate) paintSlots(ctx, regions, s)
  else paintGrid(ctx, regions, s)

  return regions
}

// One canvas/texture pair for the whole feature's life, matching
// rocketTextures.js's `ensureSheet` — a repainted-in-place raster costs one
// texture upload per interaction instead of a cache per view.
let sheet = null
let paintedOnce = false

function ensureSheet() {
  if (sheet) return sheet
  const scale = QUALITY.texScale
  const c = document.createElement('canvas')
  c.width = Math.round(FACE_W * scale)
  c.height = Math.round(FACE_H * scale)
  const ctx = c.getContext('2d')
  if (scale !== 1) ctx.scale(scale, scale)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = Math.min(4, QUALITY.anisotropy)
  sheet = { ctx, tex, regions: [], lastState: null }

  // Custom faces may not have swapped in for the first paint yet, exactly the
  // race the paper documents already guard against — repaint once they have.
  document.fonts?.ready?.then(() => {
    if (!paintedOnce || !sheet.lastState) return
    paintCalendarSheet(sheet.lastState)
  })
  return sheet
}

/** Paints the current view onto the shared sheet and re-uploads it. Returns
 *  the hit regions for the caller to test clicks against — recomputed every
 *  call, since the caller is already gating how often this runs (see
 *  desk/CalendarModel's repaint effect). */
export function paintCalendarSheet(s) {
  const { ctx, tex } = ensureSheet()
  sheet.lastState = s
  paintedOnce = true
  sheet.regions = paintCalendarFace(ctx, s)
  tex.needsUpdate = true
  return sheet.regions
}

export function calendarFaceTexture() {
  return ensureSheet().tex
}

// Same reasoning as useSceneStore's window handle: lets a QA/perf run inspect
// what the last paint actually put where, instead of re-deriving screen
// coordinates from a screenshot every time.
if (PERF_HOOK && typeof window !== 'undefined') {
  window.__calRegions = () => sheet?.regions ?? []
}
