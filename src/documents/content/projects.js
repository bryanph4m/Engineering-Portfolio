import {
  HAND, TYPE, MONO, INK, FAINT, RED,
  gridBase, handLine, handEllipse, handArrow, text,
} from '../../lib/docTextures'

// A clipped stack of technical drawings — one project per sheet.
// The bulldog clip pinches the top ~90px; keep it clear on every sheet.

function head(ctx, W, rnd, kicker, title, sub) {
  text(ctx, kicker, 130, 165, { size: 27, color: FAINT, spacing: 5 })
  text(ctx, title, 126, 268, { font: TYPE, size: 80 })
  ctx.strokeStyle = INK
  ctx.lineWidth = 4
  handLine(ctx, 130, 292, Math.min(W - 130, 150 + title.length * 48), 286, rnd, 3)
  if (sub) text(ctx, sub, 130, 342, { size: 29, color: '#5c5340' })
}

function bullets(ctx, W, rnd, items, y0) {
  let y = y0
  for (const [lead, sub] of items) {
    text(ctx, '›', 130, y, { size: 38, color: RED })
    text(ctx, lead, 172, y, { font: TYPE, size: 34 })
    if (sub) text(ctx, sub, 172, y + 42, { size: 28, color: '#5c5340' })
    y += sub ? 116 : 72
  }
  return y
}

/* ---- sheet 1: the 7" quad ---- */
function paintDrone(ctx, W, H, rnd) {
  gridBase(ctx, W, H, rnd)
  head(ctx, W, rnd, 'DRAWING 01 — AIRFRAME', 'AUTONOMOUS DRONE', '7" QUAD · ONBOARD CV · RESEARCH PLATFORM')

  // hand-sketched 7" quad: X frame, four rotors, center plate
  const qx = W / 2 + 60
  const qy = 520
  ctx.strokeStyle = 'rgba(51,41,29,0.85)'
  ctx.lineWidth = 4
  handLine(ctx, qx - 130, qy - 82, qx + 130, qy + 82, rnd, 2)
  handLine(ctx, qx - 130, qy + 82, qx + 130, qy - 82, rnd, 2)
  for (const [sx, sy] of [[-130, -82], [130, -82], [-130, 82], [130, 82]]) {
    handEllipse(ctx, qx + sx, qy + sy, 52, 52, rnd)
  }
  ctx.strokeRect(qx - 30, qy - 22, 60, 44)
  handArrow(ctx, qx - 285, qy + 10, qx - 165, qy - 8, rnd)
  text(ctx, '7in', qx - 350, qy + 22, { font: HAND, size: 38, color: '#7a5a2f' })

  bullets(ctx, W, rnd, [
    ['FLIGHT CTRL — STM32H7 · ARDUPILOT', 'the hard real-time half'],
    ['COMPANION — PI ZERO 2 W', 'computer vision + autonomy'],
    ['FRAME — 7" CLASS', 'sized for payload and endurance'],
    ['GOAL — ONBOARD VISION', 'the autonomy research target'],
  ], 740)
}

/* ---- sheet 2: AsideAI ---- */
function paintAsideAI(ctx, W, H, rnd) {
  gridBase(ctx, W, H, rnd)
  head(ctx, W, rnd, 'DRAWING 02 — SOFTWARE', 'ASIDEAI', 'CALHACKS 2026 · 1ST PLACE — DEEPGRAM TRACK')

  // circle the win
  ctx.save()
  ctx.font = `29px ${MONO}`
  const pre = ctx.measureText('CALHACKS 2026 · ').width
  const word = ctx.measureText('1ST PLACE').width
  ctx.restore()
  ctx.strokeStyle = 'rgba(179,86,63,0.8)'
  ctx.lineWidth = 3.5
  handEllipse(ctx, 130 + pre + word / 2, 332, word / 2 + 26, 34, rnd)

  // mic → waveform → action, sketched
  const my = 520
  ctx.strokeStyle = 'rgba(51,41,29,0.85)'
  ctx.lineWidth = 4
  handEllipse(ctx, 210, my - 20, 36, 56, rnd) // mic capsule
  handLine(ctx, 210, my + 40, 210, my + 84, rnd, 1.5) // stand
  handLine(ctx, 172, my + 84, 248, my + 84, rnd, 1.5)
  // waveform out of the mic
  ctx.beginPath()
  ctx.moveTo(280, my)
  for (let x = 280; x <= 600; x += 16) {
    ctx.lineTo(x, my + Math.sin(x * 0.11) * (14 + rnd() * 26))
  }
  ctx.stroke()
  handArrow(ctx, 610, my, 680, my, rnd)
  ctx.strokeRect(690, my - 52, 190, 104)
  text(ctx, 'ACTION', 785, my + 10, { font: TYPE, size: 34, align: 'center' })
  text(ctx, 'speak → it happens', 300, my + 120, { font: HAND, size: 36, color: '#7a5a2f' })

  bullets(ctx, W, rnd, [
    ['REAL-TIME SPEECH VIA DEEPGRAM', 'transcription while you talk'],
    ['LOW-LATENCY, HANDS-FREE LOOP', 'capture intent, turn it into action'],
    ['BUILT END-TO-END IN A WEEKEND', 'hackathon time pressure included'],
  ], 800)
}

/* ---- sheet 3: AsideAI v2 ---- */
function paintAsideAIv2(ctx, W, H, rnd) {
  gridBase(ctx, W, H, rnd)
  head(ctx, W, rnd, 'DRAWING 03 — SOFTWARE', 'ASIDEAI V2', 'THE PRODUCTION REBUILD')

  // three-box pipeline with a reliability loop underneath
  const by = 480
  const boxes = [
    ['VOICE', 140],
    ['STREAM', 410],
    ['STATE', 680],
  ]
  ctx.strokeStyle = 'rgba(51,41,29,0.85)'
  ctx.lineWidth = 4
  for (const [label, bx] of boxes) {
    ctx.strokeRect(bx, by, 190, 100)
    text(ctx, label, bx + 95, by + 62, { font: TYPE, size: 32, align: 'center' })
  }
  handArrow(ctx, 336, by + 50, 404, by + 50, rnd)
  handArrow(ctx, 606, by + 50, 674, by + 50, rnd)
  // loop back
  handLine(ctx, 775, by + 106, 775, by + 170, rnd, 2)
  handLine(ctx, 775, by + 170, 235, by + 174, rnd, 2)
  handArrow(ctx, 235, by + 174, 235, by + 112, rnd)
  text(ctx, 'reliability loop', 420, by + 214, { font: HAND, size: 34, color: '#7a5a2f' })

  bullets(ctx, W, rnd, [
    ['REWORKED STREAMING + STATE MODEL', 'reliability over demo luck'],
    ['REFINED VOICE-FIRST UX', 'the interaction loop, sanded down'],
    ['FOUNDATIONS FOR REAL USERS', 'built to stay open all day'],
  ], 820)
}

/* ---- sheet 4: Recco ---- */
function paintRecco(ctx, W, H, rnd) {
  gridBase(ctx, W, H, rnd)
  head(ctx, W, rnd, 'DRAWING 04 — SOFTWARE', 'RECCO', 'YC AI GROWTH HACKATHON 2026')

  // growth curve, sketched on the grid
  const ox = 200
  const oy = 830
  ctx.strokeStyle = 'rgba(51,41,29,0.85)'
  ctx.lineWidth = 4
  handLine(ctx, ox, oy, ox, 440, rnd, 2) // y axis
  handLine(ctx, ox, oy, 760, oy, rnd, 2) // x axis
  ctx.beginPath()
  ctx.moveTo(ox + 10, oy - 14)
  for (let x = 0; x <= 480; x += 20) {
    const t = x / 480
    ctx.lineTo(ox + 10 + x, oy - 14 - t * t * 330 - rnd() * 8)
  }
  ctx.stroke()
  handArrow(ctx, ox + 470, oy - 330, ox + 520, oy - 372, rnd)
  text(ctx, 'growth', ox + 540, oy - 380, { font: HAND, size: 36, color: '#7a5a2f' })
  text(ctx, 'signal → recommendation → loop', ox + 60, oy + 52, { font: HAND, size: 34, color: '#7a5a2f' })

  bullets(ctx, W, rnd, [
    ['BUILT AT YC\'S AI GROWTH HACKATHON'],
    ['RAW SIGNAL IN, RECOMMENDATIONS OUT'],
    ['AIMED AT THE PRODUCT GROWTH LOOP'],
  ], 970)
}

export const projectPages = [paintDrone, paintAsideAI, paintAsideAIv2, paintRecco]
