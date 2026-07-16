import {
  HAND, TYPE,
  blueprintBase, handLine, handArrow, text, pageGeom,
} from '../../lib/docTextures'
import { flowSheets } from '../../lib/pageFlow'
import { research } from '../../content/portfolio'

// Blueprint roll — the active-control rocket program, authored as block
// sheets and flowed through the content box by pageFlow.js. The drafting
// title block is decor: it lives in the bottom margin, outside the measured
// content area, and renumbers itself as pagination changes.

export const RESEARCH_PAPER = { w: 3.2, h: 2.0 }
const { W: TEX_W, box } = pageGeom(RESEARCH_PAPER, true)

const WHITE = '#e9f1fb'
const DIM = 'rgba(233,241,251,0.75)'

// The drafting title block is decor pinned to the bottom-right of every sheet.
// It overlaps the measured content box (there's no room to sit it fully below
// the box in a 1280px texture), so the flowed annotation notes below the figure
// have to be kept clear of it or a long line runs straight through the DWG
// block. NOTE_X is where notes are lettered from; NOTE_MAXW is the run that
// stops a gutter short of the title block's left edge, so text() auto-fits any
// over-long note down to fit rather than colliding.
const TITLE_BLOCK_LEFT = TEX_W - 660
const NOTE_X = 124
const NOTE_MAXW = TITLE_BLOCK_LEFT - 48 - NOTE_X

function titleBlock(ctx, W, H, rnd, sheet, count) {
  const bx = TITLE_BLOCK_LEFT
  const by = H - 290
  ctx.strokeStyle = WHITE
  ctx.lineWidth = 3
  ctx.strokeRect(bx, by, 520, 190)
  ctx.beginPath(); ctx.moveTo(bx, by + 66); ctx.lineTo(bx + 520, by + 66); ctx.stroke()
  text(ctx, research.program.toUpperCase(), bx + 24, by + 46, { font: TYPE, size: 32, color: WHITE })
  text(ctx, `DWG MC-001 · SHT ${sheet} OF ${count}`, bx + 24, by + 112, { size: 28, color: DIM })
  text(ctx, `SCALE: NTS · ${research.org.toUpperCase()}`, bx + 24, by + 160, { size: 28, color: DIM })
}

const decor = (ctx, W, H, rnd, page, count) => {
  blueprintBase(ctx, W, H, rnd)
  titleBlock(ctx, W, H, rnd, page + 1, count)
}

/** Sheet header: big typewriter title, hand underline, subtitle. */
const head = (title, sub) => ({
  h: 210,
  inkH: 180,
  dbg: 'head',
  keepWithNext: true,
  draw(ctx, W, H, y, rnd) {
    text(ctx, title, 120, y + 94, { font: TYPE, size: 92, color: WHITE, spacing: 4 })
    ctx.strokeStyle = DIM
    ctx.lineWidth = 4
    handLine(ctx, 124, y + 122, 124 + Math.min(1300, title.length * 58), y + 116, rnd, 3)
    text(ctx, sub, 124, y + 172, { size: 34, color: DIM, spacing: 4 })
  },
})

/** One annotation line; its own block so pages split between notes. */
const note = (str, opts = {}) => ({
  h: 60,
  inkH: 44,
  dbg: 'note',
  draw(ctx, W, H, y, rnd) {
    text(ctx, str, NOTE_X, y + 24, { size: 33, color: WHITE, ...opts })
  },
})

/** Small header repeated when a sheet spills onto a continuation page. */
const cont = (title) => ({
  h: 96,
  inkH: 56,
  dbg: 'cont',
  draw(ctx, W, H, y, rnd) {
    text(ctx, `${title} · CONT'D`, 124, y + 40, { font: TYPE, size: 34, color: DIM, spacing: 4 })
    ctx.strokeStyle = DIM
    ctx.lineWidth = 3
    handLine(ctx, 124, y + 58, 560, y + 54, rnd, 2)
  },
})

const figure = (h, inkH, draw) => ({ h, inkH, draw, dbg: 'figure' })

/* ---- sheet A: vehicle overview ---- */
const rocketFigure = figure(794, 782, (ctx, W, H, y, rnd) => {
  // side-view rocket, nose to the right
  const cy = y + 354
  ctx.strokeStyle = WHITE
  ctx.lineWidth = 4
  handLine(ctx, 300, cy - 85, 1330, cy - 85, rnd, 2) // body top
  handLine(ctx, 300, cy + 85, 1330, cy + 85, rnd, 2) // body bottom
  handLine(ctx, 300, cy - 85, 300, cy + 85, rnd, 2) // tail bulkhead
  handLine(ctx, 1330, cy - 85, 1555, cy, rnd, 2) // nose cone
  handLine(ctx, 1330, cy + 85, 1555, cy, rnd, 2)
  // dashed centreline
  ctx.save()
  ctx.setLineDash([26, 18])
  ctx.lineWidth = 2
  ctx.strokeStyle = DIM
  ctx.beginPath(); ctx.moveTo(250, cy); ctx.lineTo(1620, cy); ctx.stroke()
  ctx.restore()
  // tilt/roll control surfaces near the nose
  ctx.lineWidth = 4
  handLine(ctx, 1225, cy - 85, 1265, cy - 150, rnd, 1.5)
  handLine(ctx, 1265, cy - 150, 1305, cy - 85, rnd, 1.5)
  handLine(ctx, 1225, cy + 85, 1265, cy + 150, rnd, 1.5)
  handLine(ctx, 1265, cy + 150, 1305, cy + 85, rnd, 1.5)
  // tail fins
  handLine(ctx, 300, cy - 85, 360, cy - 190, rnd, 1.5)
  handLine(ctx, 360, cy - 190, 470, cy - 85, rnd, 1.5)
  handLine(ctx, 300, cy + 85, 360, cy + 190, rnd, 1.5)
  handLine(ctx, 360, cy + 190, 470, cy + 85, rnd, 1.5)
  // avionics bay
  ctx.strokeRect(690, cy - 52, 190, 104)
  text(ctx, 'AVIONICS', 705, cy + 12, { size: 30, color: DIM })

  // leaders + callouts
  ctx.lineWidth = 3
  handArrow(ctx, 1500, y + 34, 1290, cy - 155, rnd)
  text(ctx, 'TILT/ROLL CONTROL SURFACES', 1340, y + 6, { size: 33, color: WHITE })
  handArrow(ctx, 520, y + 739, 640, cy + 95, rnd)
  text(ctx, 'AERO LOADS FROM SIMSCALE CFD', 300, y + 774, { size: 33, color: WHITE })
  handArrow(ctx, 1035, y + 714, 830, cy + 62, rnd)
  // right-aligned so the label ends before the drafting title block (decor)
  text(ctx, 'MICRO-SERVOS · IMU + ALTIMETER', 1370, y + 739, { size: 33, color: WHITE, align: 'right' })
})

/* ---- sheet B: CFD validation ---- */
const cfdFigure = figure(690, 654, (ctx, W, H, y, rnd) => {
  // left: control-surface profile at three deflections, flow arrows incoming
  const cx = 480
  const cy = y + 334
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = DIM
    ctx.lineWidth = 3
    handArrow(ctx, 130, cy - 90 + i * 60, 250, cy - 90 + i * 60, rnd)
  }
  const fin = (angle, color) => {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(angle)
    ctx.strokeStyle = color
    ctx.lineWidth = 4
    handLine(ctx, -150, 0, 150, -18, rnd, 2)
    handLine(ctx, 150, -18, 150, 6, rnd, 1)
    handLine(ctx, 150, 6, -150, 0, rnd, 2)
    ctx.restore()
  }
  fin(-0.26, 'rgba(233,241,251,0.45)')
  fin(0, WHITE)
  fin(0.26, 'rgba(233,241,251,0.45)')
  text(ctx, 'TILT / ROLL DEFLECTIONS', cx - 190, cy + 130, { size: 32, color: DIM })
  // hinge pivot mark
  ctx.strokeStyle = WHITE
  ctx.lineWidth = 3
  handLine(ctx, cx - 14, cy - 14, cx + 14, cy + 14, rnd, 1, 3)
  handLine(ctx, cx - 14, cy + 14, cx + 14, cy - 14, rnd, 1, 3)

  // right: drag vs alpha plot — baseline airframe vs control surfaces out
  const px = 1180
  const py = y + 594
  const pw = 660
  const ph = 470
  ctx.strokeStyle = WHITE
  ctx.lineWidth = 3.5
  handLine(ctx, px, py, px, py - ph, rnd, 2) // y axis
  handLine(ctx, px, py, px + pw, py, rnd, 2) // x axis
  text(ctx, 'Cd', px - 66, py - ph + 40, { size: 34, color: WHITE })
  text(ctx, 'α (deg)', px + pw - 110, py + 52, { size: 34, color: WHITE })
  // dashed zero line
  ctx.save()
  ctx.setLineDash([18, 14])
  ctx.strokeStyle = DIM
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(px, py - ph / 2); ctx.lineTo(px + pw, py - ph / 2); ctx.stroke()
  ctx.restore()
  const curve = (gain, color, label, ly) => {
    ctx.strokeStyle = color
    ctx.lineWidth = 4
    ctx.beginPath()
    for (let x = 0; x <= pw - 60; x += 20) {
      const t = x / (pw - 60)
      const cyv = py - ph / 2 - gain * (t * ph * 0.42) - (rnd() - 0.5) * 6
      x === 0 ? ctx.moveTo(px + 30 + x, cyv) : ctx.lineTo(px + 30 + x, cyv)
    }
    ctx.stroke()
    text(ctx, label, px + pw - 44, ly, { size: 30, color, align: 'right' })
  }
  curve(1, WHITE, 'surfaces out', py - ph + 62)
  curve(0.45, 'rgba(233,241,251,0.6)', 'baseline', py - ph / 2 - 116)
})

/* ---- sheet C: the control loop ---- */
const loopFigure = figure(670, 572, (ctx, W, H, y, rnd) => {
  // block diagram
  const by = y + 214
  const block = (x, w, label, sub) => {
    ctx.strokeStyle = WHITE
    ctx.lineWidth = 4
    ctx.strokeRect(x, by, w, 150)
    text(ctx, label, x + w / 2, by + 66, { font: TYPE, size: 36, color: WHITE, align: 'center' })
    if (sub) text(ctx, sub, x + w / 2, by + 116, { size: 26, color: DIM, align: 'center' })
  }
  // summing junction
  const sx = 330
  const sy = by + 75
  ctx.strokeStyle = WHITE
  ctx.lineWidth = 4
  ctx.beginPath(); ctx.arc(sx, sy, 46, 0, Math.PI * 2); ctx.stroke()
  text(ctx, '+', sx - 22, sy - 8, { size: 34, color: WHITE, align: 'center' })
  text(ctx, '−', sx - 4, sy + 36, { size: 34, color: WHITE, align: 'center' })

  text(ctx, 'θ ref', 130, sy - 24, { size: 32, color: DIM })
  handArrow(ctx, 128, sy, sx - 52, sy, rnd)
  block(450, 330, 'CONTROLLER', 'tilt / roll commands')
  handArrow(ctx, sx + 52, sy, 444, sy, rnd)
  block(880, 360, 'MICRO-SERVOS', 'surface deflection')
  handArrow(ctx, 786, sy, 874, sy, rnd)
  block(1340, 400, 'VEHICLE DYNAMICS', 'validated in CFD')
  handArrow(ctx, 1246, sy, 1334, sy, rnd)
  handArrow(ctx, 1746, sy, 1900, sy, rnd)
  text(ctx, 'θ', 1920, sy + 12, { size: 36, color: WHITE })

  // feedback path
  handLine(ctx, 1850, sy, 1850, by + 300, rnd, 2)
  handLine(ctx, 1850, by + 300, sx, by + 304, rnd, 2)
  handArrow(ctx, sx, by + 304, sx, sy + 52, rnd)
  text(ctx, 'IMU + ALTIMETER · AVIONICS BAY', 980, by + 350, { size: 30, color: DIM, align: 'center' })
})

// Each blueprint sheet's drawing is keyed by the shared sheet id; the title,
// subtitle and annotation notes all come from src/content/portfolio.js. The
// blueprint's ALL-CAPS lettering is an uppercase of that shared copy, and
// each note gets the drafting "· " tick prepended. The one hand-lettered
// objective line is stored verbatim and rendered as-is.
const FIGURES = { vehicle: rocketFigure, cfd: cfdFigure, control: loopFigure }

const sheets = research.sheets.map((s) => {
  const blocks = [head(s.title.toUpperCase(), s.sub.toUpperCase())]
  if (s.lead) {
    blocks.push(note(s.lead, { font: HAND, size: 40, color: '#cfe0f4' }))
  }
  blocks.push(FIGURES[s.id])
  // Notes flow below the figure, into the vertical band the title block sits
  // in — cap their run so a long line auto-fits instead of running under it.
  for (const n of s.notes ?? []) blocks.push(note(`· ${n.toUpperCase()}`, { maxW: NOTE_MAXW }))
  return { decor, cont: cont(s.title.toUpperCase()), blocks }
})

export const researchPages = flowSheets(sheets, box)
