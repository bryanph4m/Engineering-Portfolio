import {
  HAND, INK, FAINT, RED,
  paperBase, handLine, handEllipse, text,
} from '../../lib/docTextures'
import { contact } from '../../content/portfolio'

// Addressed envelope — the address block doubles as the live links. The
// flap, stamp and postmark hug the paper edge, so they're decor; the
// addressee block is measured content pulled from the shared portfolio data
// so the envelope and the simple mode list the same links.

function decorContact(ctx, W, H, rnd) {
  paperBase(ctx, W, H, rnd, '#f0e7d2')

  // painted envelope flap: darker triangle folded down from the top edge
  const flapY = H * 0.42
  ctx.fillStyle = 'rgba(120,100,60,0.10)'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(W, 0)
  ctx.lineTo(W / 2, flapY)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(120,100,60,0.45)'
  ctx.lineWidth = 3
  handLine(ctx, 0, 4, W / 2, flapY, rnd, 2)
  handLine(ctx, W, 4, W / 2, flapY, rnd, 2)

  // stamp + postmark, top right
  const sx = W - 300
  ctx.strokeStyle = 'rgba(179,86,63,0.85)'
  ctx.lineWidth = 4
  ctx.strokeRect(sx, 78, 190, 230)
  ctx.lineWidth = 2.5
  ctx.strokeRect(sx + 14, 92, 162, 202)
  // tiny rocket doodle on the stamp
  ctx.lineWidth = 3.5
  handLine(ctx, sx + 95, 130, sx + 95, 240, rnd, 1.5)
  handLine(ctx, sx + 95, 130, sx + 75, 168, rnd, 1)
  handLine(ctx, sx + 95, 130, sx + 115, 168, rnd, 1)
  handLine(ctx, sx + 75, 240, sx + 95, 210, rnd, 1)
  handLine(ctx, sx + 115, 240, sx + 95, 210, rnd, 1)
  text(ctx, 'MLR', sx + 95, 282, { size: 26, color: RED, align: 'center' })
  ctx.strokeStyle = 'rgba(70,60,45,0.5)'
  ctx.lineWidth = 3
  handEllipse(ctx, sx - 60, 170, 95, 95, rnd)
  for (let i = 0; i < 3; i++) {
    handLine(ctx, sx - 190, 140 + i * 34, sx + 30, 132 + i * 34, rnd, 3)
  }
}

function paintContact(ctx, W, H, rnd, link) {
  text(ctx, 'CORRESPONDENCE', 110, 130, { size: 30, color: FAINT, spacing: 7 })

  // addressee block, written by hand — the name plus the live links, all
  // from the shared portfolio data.
  const lines = [
    [contact.name, 62, INK, null],
    ...contact.links.map((l) => [l.label, 52, '#2f5d86', l.href]),
  ]
  let y = H * 0.5 + 40
  for (const [str, size, color, href] of lines) {
    const w = text(ctx, str, W * 0.3, y, { font: HAND, size, color })
    if (href) link(W * 0.3 - 10, y - size - 8, w + 20, size + 26, href)
    y += 96
  }
  // underline the email like a scribbled emphasis
  ctx.strokeStyle = 'rgba(47,93,134,0.7)'
  ctx.lineWidth = 3.5
  handLine(ctx, W * 0.3, H * 0.5 + 152, W * 0.3 + 590, H * 0.5 + 146, rnd, 3)

  // signed with the first name, pulled from the shared data
  text(ctx, `— ${contact.name.split(' ')[0]}`, W - 130, H - 78, { font: HAND, size: 46, color: '#7a5a2f', align: 'right' })
}

export const contactPages = [{ decor: decorContact, draw: paintContact }]
