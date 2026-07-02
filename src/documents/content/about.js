import {
  HAND, TYPE, FAINT, RED,
  paperBase, handLine, handEllipse, handArrow, text,
} from '../../lib/docTextures'

// Index card — the whole story fits on one card.

function paintAbout(ctx, W, H, rnd) {
  paperBase(ctx, W, H, rnd, '#f8f2e4')

  // index-card ruling: one red line up top, faint blue below
  ctx.strokeStyle = 'rgba(179,86,63,0.65)'
  ctx.lineWidth = 4
  handLine(ctx, 70, 330, W - 70, 330, rnd, 2)
  ctx.strokeStyle = 'rgba(120,140,170,0.30)'
  ctx.lineWidth = 2
  for (let y = 460; y < H - 130; y += 130) {
    ctx.beginPath(); ctx.moveTo(70, y); ctx.lineTo(W - 70, y); ctx.stroke()
  }

  text(ctx, 'INDEX CARD · NO. 01', 100, 140, { size: 34, color: FAINT, spacing: 8 })
  text(ctx, 'Bryan Pham · Los Angeles, CA', W - 100, 140, { size: 36, color: '#5c5340', align: 'right' })
  text(ctx, 'ABOUT', 96, 285, { font: TYPE, size: 128 })
  ctx.strokeStyle = RED
  ctx.lineWidth = 5
  handLine(ctx, 100, 308, 540, 302, rnd, 4)

  const lines = [
    ['Mechanical engineering student @ ', 'UCLA'],
    ['Founding engineer — ', 'Aria AI'],
    ['Founder & president — ', 'Mission Launch Rocketry'],
  ]
  let y = 445
  for (const [head, tail] of lines) {
    const w1 = text(ctx, head, 110, y, { font: HAND, size: 56 })
    const w2 = text(ctx, tail, 110 + w1, y, { font: HAND, size: 56, weight: 'bold' })
    if (tail === 'UCLA') {
      ctx.strokeStyle = 'rgba(179,86,63,0.8)'
      ctx.lineWidth = 4
      handEllipse(ctx, 110 + w1 + w2 / 2, y - 18, w2 / 2 + 34, 44, rnd)
    }
    y += 130
  }

  // the motto, scribbled between the rules
  text(ctx, '"design it on paper first — let the wind tunnel argue back."', 130, 880, {
    font: HAND, size: 44, color: '#7a5a2f',
  })

  // margin doodle: arrow to the current-work note
  ctx.strokeStyle = 'rgba(122,90,47,0.9)'
  ctx.lineWidth = 4
  handArrow(ctx, W - 620, H - 165, W - 520, H - 118, rnd)
  text(ctx, 'now: canard rockets · drones · AI tooling', W - 490, H - 100, {
    font: HAND, size: 42, color: '#7a5a2f',
  })
  text(ctx, 'the short version', 110, H - 100, { size: 30, color: FAINT, spacing: 4 })
}

export const aboutPages = [paintAbout]
