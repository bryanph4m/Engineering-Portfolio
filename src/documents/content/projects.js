import {
  HAND, TYPE, MONO, INK, FAINT, RED,
  gridBase, handLine, handEllipse, handArrow, text, pageGeom,
} from '../../lib/docTextures'
import { flowSheets } from '../../lib/pageFlow'

// A clipped stack of technical drawings — one project per sheet, authored as
// blocks (head, figure, bullets) and flowed through the content box by
// pageFlow.js. A sheet whose blocks outgrow one page continues on the next
// sheet automatically, splitting between bullets — never mid-sentence.
// The bulldog clip pinches the top ~90px; the content box top margin keeps
// every block clear of it.

export const PROJECTS_PAPER = { w: 2.2, h: 2.9 }
const { box } = pageGeom(PROJECTS_PAPER, true)

const decor = (ctx, W, H, rnd) => gridBase(ctx, W, H, rnd)

/** Drawing header: kicker, title, hand underline, subtitle. */
const head = (kicker, title, sub, extra) => ({
  h: 290,
  inkH: 262,
  draw(ctx, W, H, y, rnd) {
    text(ctx, kicker, 130, y + 69, { size: 27, color: FAINT, spacing: 5 })
    text(ctx, title, 126, y + 172, { font: TYPE, size: 80 })
    ctx.strokeStyle = INK
    ctx.lineWidth = 4
    handLine(ctx, 130, y + 196, Math.min(W - 130, 150 + title.length * 48), y + 190, rnd, 3)
    if (sub) text(ctx, sub, 130, y + 246, { size: 29, color: '#5c5340' })
    extra?.(ctx, W, y, rnd)
  },
})

/** One spec bullet; each is its own block so pages split between bullets. */
const bullet = ([lead, sub]) => ({
  h: sub ? 116 : 72,
  inkH: sub ? 84 : 40,
  draw(ctx, W, H, y, rnd) {
    text(ctx, '›', 130, y + 30, { size: 38, color: RED })
    text(ctx, lead, 172, y + 30, { font: TYPE, size: 34 })
    if (sub) text(ctx, sub, 172, y + 72, { size: 28, color: '#5c5340' })
  },
})

/** Small header repeated when a drawing spills onto a continuation page. */
const cont = (title) => ({
  h: 96,
  inkH: 56,
  draw(ctx, W, H, y, rnd) {
    text(ctx, `${title} — CONT'D`, 130, y + 40, { size: 27, color: FAINT, spacing: 5 })
    ctx.strokeStyle = 'rgba(51,41,29,0.4)'
    ctx.lineWidth = 3
    handLine(ctx, 130, y + 58, 470, y + 54, rnd, 2)
  },
})

const figure = (h, inkH, draw) => ({ h, inkH, draw })

/* ---- sheet 1: the 7" quad ---- */
const droneFigure = figure(324, 274, (ctx, W, H, y, rnd) => {
  // hand-sketched 7" quad: X frame, four rotors, center plate
  const qx = W / 2 + 60
  const qy = y + 134
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
})

/* ---- sheet 2: AsideAI ---- */
const asideHeadExtra = (ctx, W, y, rnd) => {
  // circle the win in the subtitle
  ctx.save()
  ctx.font = `29px ${MONO}`
  const pre = ctx.measureText('CALHACKS 2026 · ').width
  const word = ctx.measureText('1ST PLACE').width
  ctx.restore()
  ctx.strokeStyle = 'rgba(179,86,63,0.8)'
  ctx.lineWidth = 3.5
  handEllipse(ctx, 130 + pre + word / 2, y + 236, word / 2 + 26, 34, rnd)
}

const asideFigure = figure(384, 266, (ctx, W, H, y, rnd) => {
  // mic → waveform → action, sketched
  const my = y + 134
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
  handArrow(ctx, 605, my, 665, my, rnd)
  ctx.strokeRect(675, my - 52, 185, 104) // right edge stays inside the content box
  text(ctx, 'ACTION', 767, my + 10, { font: TYPE, size: 34, align: 'center' })
  text(ctx, 'speak → it happens', 300, my + 120, { font: HAND, size: 36, color: '#7a5a2f' })
})

/* ---- sheet 3: AsideAI v2 ---- */
const asideV2Figure = figure(404, 320, (ctx, W, H, y, rnd) => {
  // three-box pipeline with a reliability loop underneath
  const by = y + 94
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
})

/* ---- sheet 4: Recco ---- */
const reccoFigure = figure(554, 508, (ctx, W, H, y, rnd) => {
  // growth curve, sketched on the grid
  const ox = 200
  const oy = y + 444
  ctx.strokeStyle = 'rgba(51,41,29,0.85)'
  ctx.lineWidth = 4
  handLine(ctx, ox, oy, ox, oy - 390, rnd, 2) // y axis
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
})

const sheets = [
  {
    decor,
    cont: cont('AUTONOMOUS DRONE'),
    blocks: [
      head('DRAWING 01 — AIRFRAME', 'AUTONOMOUS DRONE', '7" QUAD · ONBOARD CV · RESEARCH PLATFORM'),
      droneFigure,
      ...[
        ['FLIGHT CTRL — STM32H7 · ARDUPILOT', 'the hard real-time half'],
        ['COMPANION — PI ZERO 2 W', 'computer vision + autonomy'],
        ['FRAME — 7" CLASS', 'sized for payload and endurance'],
        ['GOAL — ONBOARD VISION', 'the autonomy research target'],
      ].map(bullet),
    ],
  },
  {
    decor,
    cont: cont('ASIDEAI'),
    blocks: [
      head('DRAWING 02 — SOFTWARE', 'ASIDEAI', 'CALHACKS 2026 · 1ST PLACE — DEEPGRAM TRACK', asideHeadExtra),
      asideFigure,
      ...[
        ['REAL-TIME SPEECH VIA DEEPGRAM', 'transcription while you talk'],
        ['LOW-LATENCY, HANDS-FREE LOOP', 'capture intent, turn it into action'],
        ['BUILT END-TO-END IN A WEEKEND', 'hackathon time pressure included'],
      ].map(bullet),
    ],
  },
  {
    decor,
    cont: cont('ASIDEAI V2'),
    blocks: [
      head('DRAWING 03 — SOFTWARE', 'ASIDEAI V2', 'THE PRODUCTION REBUILD'),
      asideV2Figure,
      ...[
        ['REWORKED STREAMING + STATE MODEL', 'reliability over demo luck'],
        ['REFINED VOICE-FIRST UX', 'the interaction loop, sanded down'],
        ['FOUNDATIONS FOR REAL USERS', 'built to stay open all day'],
      ].map(bullet),
    ],
  },
  {
    decor,
    cont: cont('RECCO'),
    blocks: [
      head('DRAWING 04 — SOFTWARE', 'RECCO', 'YC AI GROWTH HACKATHON 2026'),
      reccoFigure,
      ...[
        ['BUILT AT YC\'S AI GROWTH HACKATHON'],
        ['RAW SIGNAL IN, RECOMMENDATIONS OUT'],
        ['AIMED AT THE PRODUCT GROWTH LOOP'],
      ].map(bullet),
    ],
  },
]

export const projectPages = flowSheets(sheets, box)
