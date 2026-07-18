import * as THREE from 'three'
import { IS_MOBILE, QUALITY } from './quality'
import { HAND, MONO, TYPE } from './docTextures'

/**
 * The component page shown under the picked-up rocket — a blueprint-blue spec
 * sheet in the same drafting language as the Rocketry document, holding one
 * part's name, role, description and spec table (see desk/RocketModel).
 *
 * The rocket is picked up whole, exactly like a paper document, and its parts
 * are then *read* rather than clicked: this page is one "page" of that read,
 * stepped with ← → , a swipe, or the painted bottom corners, on the same store
 * `pageIndex` the multi-page documents use.
 *
 * Deliberately its own tiny module rather than a sixth entry in docTextures:
 * this is not a sheet of paper. It is never measured against a paper content
 * box, never flipped in 3D and never zoom-rastered at a second resolution — the
 * whole fitting pipeline in docTextures would be dead weight, and the page is
 * content-shaped enough (a heading, a rule, a paragraph and a spec table) that
 * laying it out directly is shorter than teaching that pipeline about a non-page.
 *
 * ## Texture budget
 *
 * ONE canvas, for the whole feature, repainted in place on each page turn.
 *
 * That is a deliberate reversal of the obvious design (a cached raster per
 * part, which is what the previous per-part detail cards did). Only one page is
 * ever on screen, so caching five of them bought nothing but five times the
 * VRAM — 2.8 MB each, ~14 MB for a visitor who read them all. Repainting the
 * single sheet costs a canvas paint of a couple of milliseconds on an explicit
 * user action, which is far below the frame budget, and holds the whole feature
 * at ~2.1 MB on desktop (1200×430) and ~0.76 MB on a phone (760×1000 at
 * texScale 0.5) no matter how long someone reads. Re-rastering on demand is
 * already how a zoomed document page works here (lib/docTextures detailScale),
 * so this is the established trade.
 *
 * And none of it runs until the rocket is actually picked up: the resting desk
 * carries no page canvas at all.
 */

const WHITE = '#e9f1fb'
const DIM = 'rgba(233,241,251,0.72)'
const FAINT = 'rgba(233,241,251,0.4)'
const PAPER = '#1f4468'

// Authored page size, in texture px. Everything below is laid out in this
// space; the backing raster may be half this on a phone (QUALITY.texScale) and
// no drawing code has to know.
/**
 * The page comes in two shapes, chosen once at module load, and the reason is
 * legibility rather than taste.
 *
 * The focused composition is clamped to the viewport's WIDTH, so the page
 * always lands at ~94% of the screen's width whatever its canvas is. What that
 * means is that a canvas pixel maps to (screen width / canvas width) screen
 * pixels — so the ONLY lever on how big the type actually reads is how many
 * canvas pixels are laid across that width. The 1200px-wide desktop sheet
 * downsampled onto a 390px phone renders its 23px body text at about 7px. It
 * is not small, it is unreadable.
 *
 * So a phone gets a narrower, taller sheet with proportionally larger type
 * (~30px over 760 → ~15px on screen), stacked in one column. Landscape gets the
 * short two-column sheet, which is what lets the rocket keep the top of the
 * composition on a wide screen. Same content, same painter, two shapes.
 */
const PORTRAIT = IS_MOBILE
const W = PORTRAIT ? 760 : 1200
const H = PORTRAIT ? 1000 : 430
const PAD = PORTRAIT ? 44 : 54
const COL_GAP = 46
// Landscape splits into two columns (description left, specs right); portrait
// runs one column the full width and lets the sheet be tall.
const COL_L = PAD
const COL_L_R = PORTRAIT ? W - PAD : W * 0.52 - COL_GAP / 2
const COL_R = PORTRAIT ? PAD : W * 0.52 + COL_GAP / 2
const COL_R_R = W - PAD
// Type scale, so one set of layout code serves both shapes.
const FS = PORTRAIT
  ? { name: 54, role: 24, desc: 31, label: 20, value: 27, descLine: 40, valueLine: 33 }
  : { name: 44, role: 18, desc: 23, label: 15, value: 20, descLine: 30, valueLine: 25 }

// Fraction of the page, in from each bottom corner, that steps a page. Matches
// desk/RocketModel's PAGE_CORNER and the arrows painted below — the hit target
// and the ink that advertises it are the same number.
const CORNER = 0.16

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

  // ---- heading, role, description ----
  let y = PORTRAIT ? 96 : 84
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = WHITE
  // The name is the one string that must not wrap, so it auto-fits down
  // instead (same spirit as docTextures' per-line fit).
  let size = FS.name
  ctx.font = `${size}px ${TYPE}`
  while (size > FS.name * 0.6 && ctx.measureText(part.name.toUpperCase()).width > COL_L_R - COL_L) {
    size -= 1.5
    ctx.font = `${size}px ${TYPE}`
  }
  ctx.fillText(part.name.toUpperCase(), COL_L, y)

  y += FS.role + 10
  ctx.fillStyle = DIM
  ctx.font = `${FS.role}px ${MONO}`
  ctx.fillText(part.role.toUpperCase(), COL_L, y)

  y += 24
  rule(ctx, COL_L, y, COL_L_R)

  y += FS.descLine + 4
  ctx.fillStyle = WHITE
  ctx.font = `${FS.desc}px ${HAND}`
  const descEnd = wrap(ctx, part.desc, COL_L, y, COL_L_R - COL_L, FS.descLine)

  // ---- the spec table ----
  // Landscape puts it in its own column with a hairline between, so the two
  // read as one sheet split rather than two things side by side. Portrait
  // simply continues down the page under a second rule.
  let sy
  if (PORTRAIT) {
    sy = descEnd + 26
    rule(ctx, COL_L, sy, COL_L_R, 0.3)
    sy += FS.valueLine + 4
  } else {
    ctx.strokeStyle = 'rgba(233,241,251,0.16)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(COL_R - COL_GAP / 2, 74)
    ctx.lineTo(COL_R - COL_GAP / 2, H - 96)
    ctx.stroke()
    sy = 84
  }

  const labelW = PORTRAIT ? 180 : 132
  for (const spec of part.specs) {
    ctx.fillStyle = FAINT
    ctx.font = `${FS.label}px ${MONO}`
    ctx.fillText(spec.label.toUpperCase(), COL_R, sy)
    ctx.fillStyle = DIM
    ctx.font = `${FS.value}px ${HAND}`
    sy = wrap(ctx, spec.value, COL_R + labelW, sy, COL_R_R - COL_R - labelW, FS.valueLine)
    sy += 10
  }

  // ---- title block, bottom centre ----
  // Centred rather than in the usual bottom-right corner because both bottom
  // corners are page-step hit targets here (see CORNER); a title block parked
  // in one of them would sit under the arrow advertising the tap.
  const tbH = 58
  const tbY = H - 22 - tbH
  const tbX = (W - 300) / 2
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
  ctx.fillText('SECTION', tbX + 204, tbY + 22)
  ctx.fillStyle = WHITE
  ctx.font = `18px ${MONO}`
  ctx.fillText('TILT/ROLL ROCKET', tbX + 14, tbY + 45)
  ctx.fillText(`${index + 1} / ${count}`, tbX + 204, tbY + 45)

  // ---- step arrows in the bottom corners ----
  // Painted only where there is somewhere to go, because these are the whole
  // affordance on touch: the corner is the hit target (desk/RocketModel reads
  // the same CORNER fraction off the page's UVs) and this is the ink that says
  // so. A document dog-ears its corners for the identical job; this sheet is
  // not paper, so it gets arrows instead of a fold.
  const arrow = (x, dir) => {
    const ay = H - 46
    ctx.strokeStyle = 'rgba(233,241,251,0.72)'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(x + dir * 9, ay - 11)
    ctx.lineTo(x - dir * 9, ay)
    ctx.lineTo(x + dir * 9, ay + 11)
    ctx.stroke()
  }
  if (index > 0) arrow(W * CORNER * 0.5, 1)
  if (index < count - 1) arrow(W - W * CORNER * 0.5, -1)
}

// The one page canvas, created on the rocket's first pickup and reused for
// every part after. Module-level rather than per-component so a remount cannot
// silently orphan a texture on the GPU.
let sheet = null
// What is currently painted on it, so a re-render that changes nothing (a
// hover, a resize, a spring frame) cannot trigger a needless repaint+re-upload.
let painted = null

function ensureSheet() {
  if (sheet) return sheet
  const s = QUALITY.texScale
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(W * s)
  canvas.height = Math.round(H * s)
  const ctx = canvas.getContext('2d')
  if (s !== 1) ctx.scale(s, s)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = QUALITY.anisotropy
  sheet = { ctx, tex }

  // The first paint may land before the bundled drafting faces have swapped in,
  // exactly as the document pages do — repaint once they have, so a page opened
  // on a cold load doesn't keep system-font lettering.
  document.fonts?.ready?.then(() => {
    if (!painted) return
    const { part, index, count } = painted
    painted = null // force the repaint below to actually run
    paintRocketPage(part, index, count)
  })
  return sheet
}

/**
 * Paint one part onto the shared page and return its texture.
 *
 * Idempotent: asking for the page that is already up is free, which matters
 * because this is called from a render pass that also runs on hover and resize.
 */
export function paintRocketPage(part, index, count) {
  const { ctx, tex } = ensureSheet()
  if (painted && painted.part === part && painted.index === index && painted.count === count) {
    return tex
  }
  ctx.clearRect(0, 0, W, H)
  paint(ctx, part, index, count)
  tex.needsUpdate = true
  painted = { part, index, count }
  return tex
}

/** Page aspect (w / h) in world terms — the mesh is sized from this. */
export const PAGE_ASPECT = W / H

/** Fraction of the page, in from each bottom corner, that steps a page. */
export const PAGE_CORNER = CORNER

/* ------------------------------------------------------------------ */
/* Avionics sled board faces                                           */
/* ------------------------------------------------------------------ */

/**
 * The printed face of one sled board: solder mask, routed traces, gold pads and
 * silkscreen — the same drawing vocabulary as the desk's loose circuit boards
 * (lib/textures pcbTexture), so the sled reads as the same class of object
 * rather than as four painted blocks.
 *
 * ## Why a texture and not geometry
 *
 * Everything this draws — traces, pads, part outlines, a board label — is
 * sub-millimetre detail on a board that is a couple of hundred pixels across at
 * rest. Modelled, it would be thousands of triangles and a draw call per part
 * for detail that never resolves; painted, it is one 256×160 canvas that costs
 * a few hundred KB and reads correctly at every distance the prop is ever seen
 * from. That is the trade this prop is specifically supposed to make.
 *
 * ## Budget
 *
 * Keyed by board colour, not by board, so the four boards share three rasters
 * (two are the same dark stock). At texScale 1 that is ~490 KB total, ~123 KB
 * on a phone — built on the sled's first render and cached for the session.
 * There is no normal map on purpose: a second canvas per board would double
 * that for relief that is well under a pixel at this prop's on-screen size.
 */
const BOARD_W = 256
const BOARD_H = 160
const boardCache = new Map()

function paintBoard(ctx, color) {
  ctx.fillStyle = color
  ctx.fillRect(0, 0, BOARD_W, BOARD_H)

  // ground-plane hatch, barely there — it stops the mask reading as flat paint
  ctx.strokeStyle = 'rgba(255,255,255,0.035)'
  ctx.lineWidth = 1
  for (let x = -BOARD_H; x < BOARD_W; x += 7) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x + BOARD_H, BOARD_H)
    ctx.stroke()
  }

  // manhattan-routed traces, with a gold pad at each end
  const pads = []
  ctx.strokeStyle = 'rgba(190,205,220,0.34)'
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  for (let i = 0; i < 22; i++) {
    let x = 12 + Math.random() * (BOARD_W - 24)
    let y = 12 + Math.random() * (BOARD_H - 24)
    pads.push([x, y])
    ctx.beginPath()
    ctx.moveTo(x, y)
    const legs = 2 + Math.floor(Math.random() * 3)
    for (let s = 0; s < legs; s++) {
      if (s % 2 === 0) x = Math.max(8, Math.min(BOARD_W - 8, x + (Math.random() - 0.5) * 110))
      else y = Math.max(8, Math.min(BOARD_H - 8, y + (Math.random() - 0.5) * 80))
      ctx.lineTo(x, y)
    }
    ctx.stroke()
    pads.push([x, y])
  }
  for (const [x, y] of pads) {
    ctx.fillStyle = '#c9a227'
    ctx.beginPath()
    ctx.arc(x, y, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, 1.1, 0, Math.PI * 2)
    ctx.fill()
  }

  // silkscreen: part outlines, a header footprint, a board designator
  ctx.strokeStyle = 'rgba(238,240,236,0.7)'
  ctx.lineWidth = 1.4
  for (let i = 0; i < 6; i++) {
    ctx.strokeRect(
      14 + Math.random() * 170,
      14 + Math.random() * 110,
      16 + Math.random() * 40,
      12 + Math.random() * 26
    )
  }
  ctx.fillStyle = 'rgba(238,240,236,0.55)'
  for (let i = 0; i < 12; i++) ctx.fillRect(20 + i * 9, BOARD_H - 26, 5, 5)
  ctx.fillStyle = 'rgba(238,240,236,0.8)'
  ctx.font = `11px ${MONO}`
  ctx.fillText('AV-SLED', 20, BOARD_H - 34)
}

/**
 * The board face for one solder-mask colour, built once per colour and cached.
 * Callers pass the board's own colour so a board keeps its identity (the Pi's
 * green, the radio's violet) instead of being repainted into a shared palette.
 */
export function sledBoardTexture(color) {
  if (boardCache.has(color)) return boardCache.get(color)

  const s = QUALITY.texScale
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(BOARD_W * s))
  c.height = Math.max(1, Math.round(BOARD_H * s))
  const ctx = c.getContext('2d')
  if (s !== 1) ctx.scale(s, s)

  paintBoard(ctx, color)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = QUALITY.anisotropy
  tex.needsUpdate = true
  boardCache.set(color, tex)
  return tex
}
