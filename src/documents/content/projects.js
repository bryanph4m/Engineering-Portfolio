import {
  HAND, TYPE, MONO, INK, FAINT, RED,
  gridBase, handLine, handEllipse, handArrow, text, pageGeom,
} from '../../lib/docTextures'
import { flowSheets } from '../../lib/pageFlow'
import { projects } from '../../content/portfolio'

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

// ---- Narrative prose (the per-project `detail` sections) ----
// Body copy is the readable half of the drawing. It's set in the same mono
// face as the rest of the sheet and word-wrapped up front so each paragraph
// declares an exact height and pageFlow can split the story between paragraphs
// (never mid-sentence). Cutive Mono is monospace, so a conservative per-glyph
// advance wraps deterministically without waiting on the web font to load;
// the per-line auto-fit in text() catches any line that still runs long.
const BODY_X = 130
const BODY_SIZE = 30
const BODY_LINE = 40
const BODY_COLOR = '#4a4032'
const MONO_ADV = 0.62 // Cutive Mono advance ≈ 0.6em; rounded up for headroom
const BODY_MAXW = box.x + box.w - BODY_X

/** Greedy word-wrap by monospace glyph count — deterministic at build time. */
const wrapMono = (str, size, maxW) => {
  const maxChars = Math.max(1, Math.floor(maxW / (size * MONO_ADV)))
  const lines = []
  let line = ''
  for (const word of str.split(' ')) {
    const probe = line ? `${line} ${word}` : word
    if (line && probe.length > maxChars) {
      lines.push(line)
      line = word
    } else {
      line = probe
    }
  }
  if (line) lines.push(line)
  return lines
}

/** Small section heading inside a drawing — a mono kicker + hand underline. */
const subhead = (title) => ({
  h: 92,
  inkH: 68,
  draw(ctx, W, H, y, rnd) {
    text(ctx, title.toUpperCase(), BODY_X, y + 46, { font: TYPE, size: 36, spacing: 2 })
    ctx.strokeStyle = 'rgba(51,41,29,0.42)'
    ctx.lineWidth = 3
    handLine(ctx, BODY_X, y + 64, BODY_X + Math.min(560, title.length * 28), y + 60, rnd, 2)
  },
})

/** One prose paragraph, pre-wrapped so its height is known before layout. */
const para = (str) => {
  const lines = wrapMono(str, BODY_SIZE, BODY_MAXW)
  const inkH = lines.length * BODY_LINE
  return {
    h: inkH + 20, // trailing breathing room between paragraphs
    inkH,
    draw(ctx, W, H, y, rnd) {
      let yy = y + BODY_SIZE
      for (const ln of lines) {
        text(ctx, ln, BODY_X, yy, { size: BODY_SIZE, color: BODY_COLOR })
        yy += BODY_LINE
      }
    },
  }
}

/** Flatten a project's `detail` sections into subhead + paragraph blocks. */
const detailBlocks = (detail = []) =>
  detail.flatMap((sec) => [
    ...(sec.heading ? [subhead(sec.heading)] : []),
    ...sec.body.map(para),
  ])

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

// Circle a phrase in the subtitle — positions are measured from the shared
// summary text itself, so rewording it in portfolio.js moves the ellipse too.
const circleHighlight = (summary, highlight) => (ctx, W, y, rnd) => {
  const idx = summary.toUpperCase().indexOf(highlight.toUpperCase())
  if (idx < 0) return
  ctx.save()
  ctx.font = `29px ${MONO}`
  const pre = ctx.measureText(summary.toUpperCase().slice(0, idx)).width
  const word = ctx.measureText(highlight.toUpperCase()).width
  ctx.restore()
  ctx.strokeStyle = 'rgba(179,86,63,0.8)'
  ctx.lineWidth = 3.5
  handEllipse(ctx, 130 + pre + word / 2, y + 236, word / 2 + 26, 34, rnd)
}

/* ---- Aside AI: camera/mic → waveform → narration ---- */
const asideFigure = figure(384, 266, (ctx, W, H, y, rnd) => {
  // mic → waveform → narration, sketched
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
  text(ctx, 'NARRATE', 767, my + 10, { font: TYPE, size: 32, align: 'center' })
  text(ctx, 'clip on → it narrates', 300, my + 120, { font: HAND, size: 36, color: '#7a5a2f' })
})

/* ---- Mission Launch Rocketry: two-stage stack, dual deploy ---- */
const rocketryFigure = figure(464, 410, (ctx, W, H, y, rnd) => {
  const cy = y + 250
  ctx.strokeStyle = 'rgba(51,41,29,0.85)'
  ctx.lineWidth = 4
  // booster stage
  handLine(ctx, 150, cy - 40, 420, cy - 40, rnd, 2)
  handLine(ctx, 150, cy + 40, 420, cy + 40, rnd, 2)
  handLine(ctx, 150, cy - 40, 150, cy + 40, rnd, 2)
  // fins
  handLine(ctx, 150, cy - 40, 185, cy - 95, rnd, 1.5)
  handLine(ctx, 185, cy - 95, 250, cy - 40, rnd, 1.5)
  handLine(ctx, 150, cy + 40, 185, cy + 95, rnd, 1.5)
  handLine(ctx, 185, cy + 95, 250, cy + 40, rnd, 1.5)
  // separation joint (dashed)
  ctx.save()
  ctx.setLineDash([14, 10])
  ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.moveTo(432, cy - 48); ctx.lineTo(432, cy + 48); ctx.stroke()
  ctx.restore()
  // sustainer + nose cone
  handLine(ctx, 445, cy - 40, 660, cy - 40, rnd, 2)
  handLine(ctx, 445, cy + 40, 660, cy + 40, rnd, 2)
  handLine(ctx, 445, cy - 40, 445, cy + 40, rnd, 2)
  handLine(ctx, 660, cy - 40, 760, cy, rnd, 2)
  handLine(ctx, 660, cy + 40, 760, cy, rnd, 2)
  // recovery: drogue (small) and main (big) canopies overhead
  handEllipse(ctx, 560, cy - 160, 42, 28, rnd)
  text(ctx, 'drogue', 620, cy - 150, { font: HAND, size: 32, color: '#7a5a2f' })
  handEllipse(ctx, 300, cy - 175, 66, 40, rnd)
  text(ctx, 'main', 170, cy - 200, { font: HAND, size: 32, color: '#7a5a2f' })
  handArrow(ctx, 432, cy + 140, 432, cy + 58, rnd)
  text(ctx, 'staged separation', 470, cy + 156, { font: HAND, size: 34, color: '#7a5a2f' })
})

/* ---- Recco: viewfinder + target-lock reticle ---- */
const reccoFigure = figure(474, 420, (ctx, W, H, y, rnd) => {
  const vx = 170
  const vy = y + 20
  const vw = 430
  const vh = 320
  ctx.strokeStyle = 'rgba(51,41,29,0.85)'
  ctx.lineWidth = 4
  ctx.strokeRect(vx, vy, vw, vh) // viewfinder frame
  // subject: head + shoulders near screen center
  const fx = vx + vw / 2
  const fy = vy + 138
  handEllipse(ctx, fx, fy, 44, 54, rnd)
  handLine(ctx, fx - 105, vy + vh, fx - 55, fy + 62, rnd, 2)
  handLine(ctx, fx + 105, vy + vh, fx + 55, fy + 62, rnd, 2)
  // target-lock reticle with crosshair ticks
  handEllipse(ctx, fx, fy, 84, 90, rnd)
  handLine(ctx, fx - 116, fy, fx - 88, fy, rnd, 1)
  handLine(ctx, fx + 88, fy, fx + 116, fy, rnd, 1)
  handLine(ctx, fx, fy - 122, fx, fy - 94, rnd, 1)
  handLine(ctx, fx, fy + 94, fx, fy + 122, rnd, 1)
  // resolve the lock to an identity
  handArrow(ctx, vx + vw + 12, fy, vx + vw + 88, fy, rnd)
  ctx.strokeRect(vx + vw + 98, fy - 52, 165, 104)
  text(ctx, 'WHO?', vx + vw + 180, fy + 10, { font: TYPE, size: 34, align: 'center' })
  text(ctx, 'lock the face nearest center', vx + 20, vy + vh + 60, { font: HAND, size: 34, color: '#7a5a2f' })
})

/* ---- RollAway: street grid + ranked vendor spot ---- */
const rollawayFigure = figure(454, 400, (ctx, W, H, y, rnd) => {
  const mx = 150
  const my = y + 20
  const mw = 560
  const mh = 300
  ctx.strokeStyle = 'rgba(51,41,29,0.85)'
  ctx.lineWidth = 4
  ctx.strokeRect(mx, my, mw, mh) // map frame
  // streets
  ctx.lineWidth = 2.5
  for (let i = 1; i < 4; i++) handLine(ctx, mx, my + (i * mh) / 4, mx + mw, my + (i * mh) / 4, rnd, 1.5)
  for (let i = 1; i < 5; i++) handLine(ctx, mx + (i * mw) / 5, my, mx + (i * mw) / 5, my + mh, rnd, 1.5)
  // pin on the winning spot
  const px = mx + mw * 0.62
  const py = my + mh * 0.55
  ctx.lineWidth = 4
  handEllipse(ctx, px, py - 46, 26, 26, rnd)
  handLine(ctx, px - 18, py - 28, px, py + 8, rnd, 1)
  handLine(ctx, px + 18, py - 28, px, py + 8, rnd, 1)
  text(ctx, '#1', px + 44, py - 44, { font: HAND, size: 36, color: '#7a5a2f' })
  text(ctx, 'rank spots → pull permits', mx + 40, my + mh + 60, { font: HAND, size: 34, color: '#7a5a2f' })
})

/* ---- Engineering Portfolio: one content source, two faces ---- */
const portfolioFigure = figure(494, 440, (ctx, W, H, y, rnd) => {
  const by = y + 120
  ctx.strokeStyle = 'rgba(51,41,29,0.85)'
  ctx.lineWidth = 4
  ctx.strokeRect(330, by - 80, 220, 110) // the shared content file
  text(ctx, 'CONTENT', 440, by - 15, { font: TYPE, size: 32, align: 'center' })
  handArrow(ctx, 370, by + 42, 250, by + 130, rnd)
  handArrow(ctx, 510, by + 42, 630, by + 130, rnd)
  ctx.strokeRect(140, by + 140, 200, 110)
  text(ctx, 'DESK', 240, by + 205, { font: TYPE, size: 32, align: 'center' })
  ctx.strokeRect(540, by + 140, 200, 110)
  text(ctx, 'WIKI', 640, by + 205, { font: TYPE, size: 32, align: 'center' })
  text(ctx, 'one source, two faces', 300, by + 330, { font: HAND, size: 34, color: '#7a5a2f' })
})

// Per-project drawing figure, keyed by the shared project id. Everything
// else on the sheet — the drawing number, the title, the spec bullets, the
// circled highlight — is derived from src/content/portfolio.js so the desk
// and the simple mode read from the same copy. The desk's ALL-CAPS drafting
// look is just an uppercase of that shared text.
const FIGURES = {
  'asideai': asideFigure,
  'mission-launch-rocketry': rocketryFigure,
  'recco': reccoFigure,
  'rollaway': rollawayFigure,
  'engineering-portfolio': portfolioFigure,
}

const sheets = projects.map((p, i) => ({
  decor,
  cont: cont(p.name.toUpperCase()),
  blocks: [
    head(
      `DRAWING 0${i + 1} — ${p.category.toUpperCase()}`,
      p.name.toUpperCase(),
      p.summary.toUpperCase(),
      p.highlight ? circleHighlight(p.summary, p.highlight) : undefined,
    ),
    FIGURES[p.id],
    ...p.specs.map((s) => bullet([s.lead.toUpperCase(), s.sub])),
    ...detailBlocks(p.detail),
  ],
}))

export const projectPages = flowSheets(sheets, box)
