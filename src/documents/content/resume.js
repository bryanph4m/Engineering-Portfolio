import {
  HAND, TYPE, INK, FAINT,
  paperBase, handLine, text,
} from '../../lib/docTextures'

// Folded formal document. The fold creases run edge to edge, so they're
// decor; the boxed note at the bottom is a live link to the printable PDF
// (drop the real file at /public/assets/Bryan-Pham-Resume.pdf).

function decorResume(ctx, W, H, rnd) {
  paperBase(ctx, W, H, rnd)

  // fold creases (match the two thirds of the folded prop)
  ctx.strokeStyle = 'rgba(160,145,110,0.5)'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(0, Math.round(H / 3)); ctx.lineTo(W, Math.round(H / 3)); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(0, Math.round((2 * H) / 3)); ctx.lineTo(W, Math.round((2 * H) / 3)); ctx.stroke()
}

function paintResume(ctx, W, H, rnd, link) {
  text(ctx, 'BRYAN PHAM', 96, 165, { font: TYPE, size: 72 })
  text(ctx, 'RESUME — MECHANICAL ENGINEERING', 98, 220, { size: 28, color: FAINT, spacing: 3 })
  ctx.strokeStyle = INK
  ctx.lineWidth = 3.5
  handLine(ctx, 96, 258, W - 96, 252, rnd, 2)

  const section = (label, y) => {
    text(ctx, label, 96, y, { font: TYPE, size: 40 })
    ctx.strokeStyle = 'rgba(60,50,30,0.4)'
    ctx.lineWidth = 2
    handLine(ctx, 96, y + 14, W - 96, y + 12, rnd, 1.5)
  }
  const entry = (title, sub, y) => {
    text(ctx, title, 116, y, { size: 34, color: INK, weight: 'bold', font: 'Georgia, serif' })
    text(ctx, sub, 116, y + 42, { size: 28, color: '#5c5340' })
  }

  section('EDUCATION', 350)
  entry('UCLA — B.S. Mechanical Engineering', 'design · embedded systems · in progress', 415)

  section('EXPERIENCE', 570)
  entry('Aria AI — Founding Engineer', 'part of the Deepgram (YC W16) startup program', 635)
  entry('Mission College — Engineering Research Intern', 'tilt/roll-control rocket program: CAD → CFD → flight', 760)

  section('PROJECTS', 915)
  entry('AsideAI · Recco', 'CalHacks 1st place · YC hackathon', 980)

  // hand-boxed download link — clickable on the sheet itself
  ctx.strokeStyle = 'rgba(58,75,47,0.9)'
  ctx.lineWidth = 4
  handLine(ctx, 96, 1120, 620, 1116, rnd, 2)
  handLine(ctx, 620, 1116, 624, 1210, rnd, 2)
  handLine(ctx, 624, 1210, 100, 1214, rnd, 2)
  handLine(ctx, 100, 1214, 96, 1120, rnd, 2)
  text(ctx, 'download the PDF ↗', 140, 1180, { font: HAND, size: 44, color: '#3a4b2f' })
  link(96, 1116, 528, 98, '/assets/Bryan-Pham-Resume.pdf')
}

export const resumePages = [{ decor: decorResume, draw: paintResume }]
