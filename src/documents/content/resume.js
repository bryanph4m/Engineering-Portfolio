import {
  HAND, TYPE, INK, FAINT,
  paperBase, handLine, text,
} from '../../lib/docTextures'
import { resume } from '../../content/portfolio'

// Folded formal document. The fold creases run edge to edge, so they're
// decor; the boxed note at the bottom is a live link to the printable PDF
// (drop the real file at /public/assets/Bryan-Pham-Resume.pdf). The entries
// are read from the shared portfolio data so the resume shown here matches
// the one in the simple mode. Positions stay hand-tuned to the folded prop.

function decorResume(ctx, W, H, rnd) {
  paperBase(ctx, W, H, rnd)

  // fold creases (match the two thirds of the folded prop)
  ctx.strokeStyle = 'rgba(160,145,110,0.5)'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(0, Math.round(H / 3)); ctx.lineTo(W, Math.round(H / 3)); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(0, Math.round((2 * H) / 3)); ctx.lineTo(W, Math.round((2 * H) / 3)); ctx.stroke()
}

function paintResume(ctx, W, H, rnd, link) {
  text(ctx, resume.name.toUpperCase(), 96, 165, { font: TYPE, size: 72 })
  text(ctx, resume.subtitle, 98, 220, { size: 28, color: FAINT, spacing: 3 })
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

  // Section header + entry Y positions stay hand-tuned to the folded thirds;
  // only the words are pulled from the shared data.
  const [education, experience, projects] = resume.sections
  section(education.label.toUpperCase(), 350)
  entry(education.entries[0].title, education.entries[0].sub, 415)

  section(experience.label.toUpperCase(), 570)
  entry(experience.entries[0].title, experience.entries[0].sub, 635)
  entry(experience.entries[1].title, experience.entries[1].sub, 760)

  section(projects.label.toUpperCase(), 915)
  entry(projects.entries[0].title, projects.entries[0].sub, 980)

  // hand-boxed download link — clickable on the sheet itself
  ctx.strokeStyle = 'rgba(58,75,47,0.9)'
  ctx.lineWidth = 4
  handLine(ctx, 96, 1120, 620, 1116, rnd, 2)
  handLine(ctx, 620, 1116, 624, 1210, rnd, 2)
  handLine(ctx, 624, 1210, 100, 1214, rnd, 2)
  handLine(ctx, 100, 1214, 96, 1120, rnd, 2)
  text(ctx, 'download the PDF ↗', 140, 1180, { font: HAND, size: 44, color: '#3a4b2f' })
  link(96, 1116, 528, 98, resume.pdf)
}

export const resumePages = [{ decor: decorResume, draw: paintResume }]
