import * as THREE from 'three'
import { QUALITY } from './quality'
import { HAND, MONO, TYPE } from './docTextures'

/**
 * The detail card painted behind a focused rocket part — a blueprint-blue
 * callout sheet in the same drafting language as the Rocketry document, with
 * the left third left deliberately empty because the real 3D part floats there
 * (see desk/RocketModel).
 *
 * Deliberately its own tiny module rather than a sixth entry in docTextures:
 * these are not *pages*. They are never paginated, never measured against a
 * content box, never flipped and never zoom-rastered at a second resolution —
 * the whole fitting pipeline in docTextures would be dead weight here, and the
 * card is content-shaped enough (a heading, a rule, a paragraph and a spec
 * table) that laying it out directly is shorter than teaching that pipeline
 * about a non-page.
 *
 * ## Texture budget
 *
 * Nothing here runs until a part is actually clicked. The idle desk carries a
 * rocket built entirely from flat-coloured materials — zero textures, zero
 * canvas work — and the first focus of a part pays for exactly one 1024×683
 * card (~2.8 MB at texScale 1, ~0.7 MB on a phone), cached for the session.
 * That is the whole reason the card is a texture and the rocket is not: the
 * model is on screen from the first frame, the card is on screen only while
 * someone is reading it.
 */

const WHITE = '#e9f1fb'
const DIM = 'rgba(233,241,251,0.72)'
const FAINT = 'rgba(233,241,251,0.4)'
const PAPER = '#1f4468'

// Authored card size, in texture px. Everything below is laid out in this
// space; the backing raster may be half this on a phone (QUALITY.texScale) and
// no drawing code has to know.
const W = 1024
const H = 683
// The part model floats over this fraction of the card's width, so no text may
// start left of it. It is the one number the 3D side and the paint share.
export const CARD_MODEL_FRACTION = 0.36
const TEXT_X = W * CARD_MODEL_FRACTION + 34
const TEXT_R = W - 56 // right edge of the text column

const cache = new Map()

/** Greedy word wrap; returns the y the next block should start at. */
function wrap(ctx, str, x, y, maxW, lineH) {
  const words = str.split(' ')
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > maxW && line) {
      ctx.fillText(line, x, y)
      y += lineH
      line = word
    } else {
      line = next
    }
  }
  if (line) {
    ctx.fillText(line, x, y)
    y += lineH
  }
  return y
}

/** Hand-wobbled straight rule, so nothing on the card is machine-perfect. */
function rule(ctx, x0, y, x1, alpha = 0.5) {
  ctx.strokeStyle = `rgba(233,241,251,${alpha})`
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(x0, y)
  for (let x = x0; x <= x1; x += 40) ctx.lineTo(x, y + Math.sin(x * 0.06) * 0.9)
  ctx.lineTo(x1, y)
  ctx.stroke()
}

function paint(ctx, part, index, count) {
  // ---- vellum ground + drafting grid ----
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = 'rgba(233,241,251,0.07)'
  ctx.lineWidth = 1
  for (let x = 0; x <= W; x += 48) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, H)
    ctx.stroke()
  }
  for (let y = 0; y <= H; y += 48) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(W, y)
    ctx.stroke()
  }
  // sheet border, inset like a real drawing frame
  ctx.strokeStyle = FAINT
  ctx.lineWidth = 2.5
  ctx.strokeRect(22, 22, W - 44, H - 44)

  // ---- the callout the part model sits inside ----
  // A dashed detail circle in the empty left column, with a leader running to
  // the heading — so the floating 3D part reads as "detail A", pulled off the
  // drawing, rather than as a model that happens to be in front of a card.
  const cx = W * CARD_MODEL_FRACTION * 0.5
  const cy = H * 0.5
  const cr = Math.min(cx, cy) - 46
  ctx.save()
  ctx.setLineDash([9, 8])
  ctx.strokeStyle = 'rgba(233,241,251,0.45)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(cx, cy, cr, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.moveTo(cx + cr * 0.72, cy - cr * 0.72)
  ctx.lineTo(TEXT_X - 18, 96)
  ctx.stroke()
  ctx.restore()

  // ---- heading block ----
  let y = 96
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = WHITE
  ctx.font = `52px ${TYPE}`
  // The name is the one string that must not wrap under the leader line, so it
  // auto-fits down instead (same spirit as docTextures' per-line fit).
  let size = 52
  while (size > 30 && ctx.measureText(part.name.toUpperCase()).width > TEXT_R - TEXT_X) {
    size -= 1.5
    ctx.font = `${size}px ${TYPE}`
  }
  ctx.fillText(part.name.toUpperCase(), TEXT_X, y)

  y += 30
  ctx.fillStyle = DIM
  ctx.font = `21px ${MONO}`
  ctx.fillText(part.role.toUpperCase(), TEXT_X, y)

  y += 26
  rule(ctx, TEXT_X, y, TEXT_R)

  // ---- description, in the drafting hand ----
  y += 40
  ctx.fillStyle = WHITE
  ctx.font = `26px ${HAND}`
  y = wrap(ctx, part.desc, TEXT_X, y, TEXT_R - TEXT_X, 34)

  // ---- spec rows ----
  y += 18
  const labelW = 168
  for (const spec of part.specs) {
    ctx.fillStyle = FAINT
    ctx.font = `17px ${MONO}`
    ctx.fillText(spec.label.toUpperCase(), TEXT_X, y)
    ctx.fillStyle = DIM
    ctx.font = `22px ${HAND}`
    y = wrap(ctx, spec.value, TEXT_X + labelW, y, TEXT_R - TEXT_X - labelW, 27)
    y += 8
  }

  // ---- title block, bottom right ----
  const tbH = 58
  const tbY = H - 22 - tbH
  const tbX = W - 22 - 300
  ctx.strokeStyle = FAINT
  ctx.lineWidth = 2
  ctx.strokeRect(tbX, tbY, 300, tbH)
  ctx.beginPath()
  ctx.moveTo(tbX + 190, tbY)
  ctx.lineTo(tbX + 190, tbY + tbH)
  ctx.stroke()
  ctx.fillStyle = FAINT
  ctx.font = `13px ${MONO}`
  ctx.fillText('ASSEMBLY', tbX + 14, tbY + 22)
  ctx.fillText('DETAIL', tbX + 204, tbY + 22)
  ctx.fillStyle = WHITE
  ctx.font = `18px ${MONO}`
  ctx.fillText('TILT/ROLL ROCKET', tbX + 14, tbY + 45)
  ctx.fillText(`${index + 1} / ${count}`, tbX + 204, tbY + 45)
}

/**
 * The detail card for one rocket part. Built on first request and cached for
 * the session — a part that is never clicked never costs a canvas.
 */
export function rocketCardTexture(part, index, count) {
  if (cache.has(part.id)) return cache.get(part.id)

  const s = QUALITY.texScale
  const c = document.createElement('canvas')
  c.width = Math.round(W * s)
  c.height = Math.round(H * s)
  const ctx = c.getContext('2d')
  if (s !== 1) ctx.scale(s, s)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = QUALITY.anisotropy

  paint(ctx, part, index, count)
  tex.needsUpdate = true

  // The first paint may land before the bundled drafting faces have swapped in,
  // exactly as the document pages do — repaint once they have, so a card opened
  // on a cold load doesn't keep system-font lettering for the session.
  document.fonts?.ready?.then(() => {
    ctx.clearRect(0, 0, W, H)
    paint(ctx, part, index, count)
    tex.needsUpdate = true
  })

  cache.set(part.id, tex)
  return tex
}

/** Card aspect (w / h) in world terms — the mesh is sized from this. */
export const CARD_ASPECT = W / H
