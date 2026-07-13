import {
  HAND, TYPE, MONO, INK, FAINT,
  paperBase, handLine, text,
} from '../../lib/docTextures'
import { resume } from '../../content/portfolio'

// Folded formal document. The fold creases run edge to edge, so they're
// decor; the boxed note at the bottom is a live link to the printable PDF
// (the real file lives at /public/assets/Bryan-Pham-Resume.pdf). Every
// section and entry is read from the shared portfolio data and laid out
// dynamically, so adding or editing an entry there reflows this sheet and
// the simple mode together. If the flow runs slightly past the content box
// the whole-page fit pass in docTextures.js shrinks it back in.

function decorResume(ctx, W, H, rnd) {
  paperBase(ctx, W, H, rnd)

  // fold creases (match the two thirds of the folded prop)
  ctx.strokeStyle = 'rgba(160,145,110,0.5)'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(0, Math.round(H / 3)); ctx.lineTo(W, Math.round(H / 3)); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(0, Math.round((2 * H) / 3)); ctx.lineTo(W, Math.round((2 * H) / 3)); ctx.stroke()
}

/** Greedy word-wrap measured in the sub line's actual face. */
function wrapSub(ctx, str, size, maxW) {
  ctx.save()
  ctx.font = `${size}px ${MONO}`
  const lines = []
  let line = ''
  for (const word of str.split(' ')) {
    const probe = line ? `${line} ${word}` : word
    if (line && ctx.measureText(probe).width > maxW) {
      lines.push(line)
      line = word
    } else {
      line = probe
    }
  }
  if (line) lines.push(line)
  ctx.restore()
  return lines
}

/**
 * Walk the sections at metric scale `k`, painting when `apply` is true.
 * Returns the y the flow ends at, so a k=1 dry run can measure the natural
 * height and pick the k that fits everything (sections + link box) above the
 * canvas bottom — ink that never lands on the canvas can't be rescued by the
 * whole-page fit pass.
 */
function flowSections(ctx, W, rnd, k, y0, apply) {
  const subSize = 21 * k
  const subLine = 25 * k
  const subMaxW = W - 116 - 96
  let y = y0
  for (const sec of resume.sections) {
    if (apply) {
      text(ctx, sec.label.toUpperCase(), 96, y + 30 * k, { font: TYPE, size: 34 * k })
      ctx.strokeStyle = 'rgba(60,50,30,0.4)'
      ctx.lineWidth = 2
      handLine(ctx, 96, y + 44 * k, W - 96, y + 42 * k, rnd, 1.5)
    }
    y += 62 * k

    for (const e of sec.entries) {
      if (apply) {
        text(ctx, e.title, 116, y + 24 * k, { size: 29 * k, color: INK, weight: 'bold', font: 'Georgia, serif' })
      }
      y += 34 * k
      if (e.sub) {
        for (const line of wrapSub(ctx, e.sub, subSize, subMaxW)) {
          if (apply) text(ctx, line, 116, y + 18 * k, { size: subSize, color: '#5c5340' })
          y += subLine
        }
      }
      y += 8 * k
    }
    y += 14 * k
  }
  return y
}

function paintResume(ctx, W, H, rnd, link) {
  text(ctx, resume.name.toUpperCase(), 96, 165, { font: TYPE, size: 72 })
  text(ctx, resume.subtitle, 98, 220, { size: 28, color: FAINT, spacing: 3 })
  ctx.strokeStyle = INK
  ctx.lineWidth = 3.5
  handLine(ctx, 96, 258, W - 96, 252, rnd, 2)

  // dry-run at k=1, then shrink the metrics so sections + link box always
  // end above the content-box bottom
  const y0 = 300
  const LINK_H = 92
  const bottom = H - 64
  const natural = flowSections(ctx, W, rnd, 1, y0, false) + LINK_H
  const k = natural > bottom ? (bottom - y0) / (natural - y0) : 1
  let y = flowSections(ctx, W, rnd, k, y0, true)

  // hand-boxed download link — clickable on the sheet itself
  const by = y + 6
  const bw = 424 * Math.max(k, 0.85)
  const bh = 70 * Math.max(k, 0.85)
  ctx.strokeStyle = 'rgba(58,75,47,0.9)'
  ctx.lineWidth = 4
  handLine(ctx, 96, by, 96 + bw, by - 4, rnd, 2)
  handLine(ctx, 96 + bw, by - 4, 100 + bw, by + bh - 4, rnd, 2)
  handLine(ctx, 100 + bw, by + bh - 4, 100, by + bh, rnd, 2)
  handLine(ctx, 100, by + bh, 96, by, rnd, 2)
  text(ctx, 'download the PDF ↗', 130, by + bh * 0.66, { font: HAND, size: 38 * Math.max(k, 0.85), color: '#3a4b2f' })
  link(96, by - 4, bw + 8, bh + 8, resume.pdf)
}

export const resumePages = [{ decor: decorResume, draw: paintResume }]
