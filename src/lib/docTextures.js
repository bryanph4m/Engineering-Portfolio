import * as THREE from 'three'
import { QUALITY } from './quality'

/**
 * Paints every page of every document onto high-resolution canvases and hands
 * them to Three as CanvasTextures. The paper mesh is the only place content
 * renders — there is no DOM overlay. Page painters live in
 * src/documents/content/*, one module per document (the registry wires them
 * up). Each page is `{ decor?, draw }`:
 *
 *  - `decor(ctx, W, H, rnd, page, count)` paints full-bleed dressing that is
 *    allowed to touch the paper edge (backgrounds, ruled lines, envelope
 *    flaps, drafting title blocks). It is never measured or clipped.
 *  - `draw(ctx, W, H, rnd, link)` paints the actual content. It runs on an
 *    offscreen layer, is measured against the page's safe content box, and is
 *    hard-clipped to that box when composited — nothing it paints can escape
 *    the box no matter how long the content grows.
 *
 * Fitting rules, applied automatically (never hand-tuned per page):
 *  - every `text()` call measures itself against the content box first and
 *    steps its font size down (0.5px at a time, to a minimum scale) so a
 *    single line never runs off the right edge;
 *  - if a single-page document's painted content still exceeds the box, the
 *    whole content layer is rescaled in small steps down to MIN_PAGE_SCALE.
 *    Below that the content is clipped and a dev warning says to trim it;
 *  - multi-page documents are never shrunk — their content is paginated up
 *    front by src/lib/pageFlow.js, which pushes overflow onto new sheets at
 *    block boundaries. If a flowed sheet still overflows, that's a bug in a
 *    block's declared height and a dev warning calls it out.
 *
 * Painters may register clickable regions through the `link` callback; those
 * regions are raycast against the focused sheet's UVs in Document.jsx (they
 * are re-mapped automatically when the content layer is rescaled).
 *
 * Textures are 1280px tall regardless of paper size, because the pickup
 * animation scales every sheet to the same world height: at the focused
 * camera distance a sheet covers ~850 screen px on a 1080p viewport, so 1280
 * texels stay sharp.
 *
 * On phones the *raster* is halved on each axis (QUALITY.texScale) while this
 * 1280px space stays the authored coordinate system — see docTexture(). That
 * distinction is load-bearing: every margin, font size and page break in
 * src/lib/pageFlow.js and src/documents/content/* is expressed in these texture
 * px, so shrinking the coordinate space (rather than just the raster) would
 * silently re-flow and overflow every page. A focused sheet covers ~600 device
 * px on a phone at the capped DPR, so 640 texels of paper height still resolve
 * the drafting hand.
 */

export const HAND = '"Architects Daughter", "Segoe Script", cursive'
export const TYPE = '"Special Elite", "Courier New", monospace'
export const MONO = '"Cutive Mono", "Courier New", monospace'

export const INK = '#33291d'
export const FAINT = '#8a7a55'
export const RED = '#b3563f'

const TEX_H = 1280
const MAX_W = 2048

// Safe content areas, inset from the paper edge. Multi-page documents keep a
// deeper bottom margin so content never collides with the page chrome (tally
// marks, dog-eared corners) painted there.
const MARGIN_SINGLE = { side: 60, top: 60, bottom: 60 }
const MARGIN_MULTI = { side: 96, top: 96, bottom: 120 }

const MIN_TEXT_SCALE = 0.7 // per-line auto-fit floor (fraction of asked size)
const PAGE_FIT_STEP = 0.0125 // whole-page shrink quantum (~0.5px on a 40px face)
const MIN_PAGE_SCALE = 0.75 // whole-page shrink floor — below this, trim content
const FIT_TOL = 4 // px of measured-ink slack before the fit pass reacts

/** Texture pixel dimensions for a paper size (world metres). */
export function texDims(paper) {
  return { W: Math.min(MAX_W, Math.round((paper.w / paper.h) * TEX_H)), H: TEX_H }
}

/** The hard content bounding box for a paper, in texture px. */
export function contentBoxFor(paper, multi) {
  const { W, H } = texDims(paper)
  const m = multi ? MARGIN_MULTI : MARGIN_SINGLE
  return { x: m.side, y: m.top, w: W - 2 * m.side, h: H - m.top - m.bottom }
}

/** Everything a content builder needs to lay pages out ahead of painting. */
export function pageGeom(paper, multi) {
  return { ...texDims(paper), box: contentBoxFor(paper, multi) }
}

const texCache = new Map()
const linkCache = new Map()

const keyFor = (doc, page) => `${doc.id}:${page}`

export function docTexture(doc, page = 0) {
  const key = keyFor(doc, page)
  if (texCache.has(key)) return texCache.get(key)

  // W/H are the authored texture-space dimensions every painter and pageFlow
  // measures against. The raster below may be smaller (mobile), but the drawing
  // coordinate system is always exactly this.
  const { W, H } = texDims(doc.paper)
  const s = QUALITY.texScale
  const c = document.createElement('canvas')
  c.width = Math.round(W * s)
  c.height = Math.round(H * s)
  // Pre-scale once, so every paint() below composites authored px into whatever
  // raster this tier allocated. Halves each axis on a phone: the five resting
  // sheets go from ~52 MB of GPU texture to ~13 MB, which is the single biggest
  // cut to what the desk uploads before it can show a first frame.
  if (s !== 1) c.getContext('2d').scale(s, s)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = QUALITY.anisotropy

  const links = []
  linkCache.set(key, links)

  // First paint may fall back to system fonts; repaint once the real faces
  // arrive so the drafting look survives a cold cache. On a warm cache the
  // faces are already in, and the first paint is the real one — repainting
  // every sheet a second time for an identical result is pure cost, so skip it.
  paint(c, doc, page, links, W, H)
  tex.needsUpdate = true
  const faces = [`16px ${HAND}`, `16px ${TYPE}`, `16px ${MONO}`]
  if (faces.every((f) => document.fonts.check(f))) {
    devVerify(c, key)
  } else {
    Promise.all(faces.map((f) => document.fonts.load(f)))
      .then(() => {
        paint(c, doc, page, links, W, H)
        tex.needsUpdate = true
        devVerify(c, key)
      })
      .catch(() => devVerify(c, key))
  }

  texCache.set(key, tex)
  return tex
}

/** Clickable regions of a page, in canvas UV space (u right, v down, 0..1). */
export function docLinks(doc, page = 0) {
  return linkCache.get(keyFor(doc, page)) ?? []
}

// Shared offscreen canvases: `layer` catches the content pass so it can be
// measured and (re)composited; `meas` is a half-scale alpha readback target.
const scratch = { layer: null, meas: null }

function scratchCanvas(name, w, h) {
  let c = scratch[name]
  if (!c) c = scratch[name] = document.createElement('canvas')
  if (c.width !== w) c.width = w
  if (c.height !== h) c.height = h
  return c
}

/** Axis-aligned bounds of everything painted on `layer`, or null if blank. */
function inkBounds(layer, W, H) {
  const mw = Math.ceil(W / 2)
  const mh = Math.ceil(H / 2)
  const meas = scratchCanvas('meas', mw, mh)
  const mctx = meas.getContext('2d', { willReadFrequently: true })
  mctx.clearRect(0, 0, mw, mh)
  mctx.drawImage(layer, 0, 0, mw, mh)
  const px = mctx.getImageData(0, 0, mw, mh).data
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (let y = 0; y < mh; y++) {
    for (let x = 0; x < mw; x++) {
      if (px[(y * mw + x) * 4 + 3] > 16) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < minX) return null
  // back to full-res px, padded a texel outward for the downsample blur
  return { x: minX * 2 - 2, y: minY * 2 - 2, x2: (maxX + 1) * 2 + 2, y2: (maxY + 1) * 2 + 2 }
}

/**
 * Paints one page. `W`/`H` are the authored texture-space size — passed in
 * rather than read off `c.width`, because on mobile the canvas raster is
 * smaller than the coordinate space its context draws in (see docTexture).
 * Everything downstream — the content box, the fit pass, the measured ink, the
 * link UVs — is therefore tier-independent and lands identically either way.
 */
function paint(c, doc, page, links, W, H) {
  const ctx = c.getContext('2d')
  const spec = doc.pages[page]
  if (!spec) throw new Error(`No page painter for "${doc.id}" page ${page}`)
  const decor = typeof spec === 'function' ? null : spec.decor
  const draw = typeof spec === 'function' ? spec : spec.draw
  const key = keyFor(doc, page)
  const count = doc.pages.length
  const multi = count > 1
  const box = contentBoxFor(doc.paper, multi)

  // 1. full-bleed dressing straight onto the sheet
  ctx.clearRect(0, 0, W, H)
  decor?.(ctx, W, H, mulberry32(hashCode(key + ':decor')), page, count)

  // 2. content on its own layer so it can be measured before it lands
  const layer = scratchCanvas('layer', W, H)
  const lctx = layer.getContext('2d')
  const raw = [] // link rects in the painter's coordinate space
  const runContent = (s = 1, tx = 0, ty = 0) => {
    lctx.setTransform(1, 0, 0, 1, 0, 0)
    lctx.clearRect(0, 0, W, H)
    lctx.setTransform(s, 0, 0, s, tx, ty)
    lctx._contentBox = box
    lctx._paperKey = key
    raw.length = 0
    draw(lctx, W, H, mulberry32(hashCode(key)), (x, y, w, h, href) => raw.push({ x, y, w, h, href }))
    lctx._contentBox = null
    lctx.setTransform(1, 0, 0, 1, 0, 0)
  }
  runContent()

  // 3. measure against the box; shrink single-page docs, warn on the rest
  const fit = { s: 1, tx: 0, ty: 0 }
  const ink = inkBounds(layer, W, H)
  if (ink) {
    const over = Math.max(
      box.x - ink.x,
      ink.x2 - (box.x + box.w),
      box.y - ink.y,
      ink.y2 - (box.y + box.h)
    )
    if (over > FIT_TOL) {
      if (!multi) {
        const iw = ink.x2 - ink.x
        const ih = ink.y2 - ink.y
        let s = Math.min(1, box.w / iw, box.h / ih)
        s = Math.floor(s / PAGE_FIT_STEP) * PAGE_FIT_STEP // step down, not jump
        const clamped = s < MIN_PAGE_SCALE
        fit.s = Math.max(s, MIN_PAGE_SCALE)
        // slide the scaled ink inside the box, moving it as little as possible
        const targetX = Math.min(Math.max(ink.x, box.x), Math.max(box.x, box.x + box.w - iw * fit.s))
        const targetY = Math.min(Math.max(ink.y, box.y), Math.max(box.y, box.y + box.h - ih * fit.s))
        fit.tx = targetX - ink.x * fit.s
        fit.ty = targetY - ink.y * fit.s
        runContent(fit.s, fit.tx, fit.ty)
        if (clamped && import.meta.env.DEV) {
          console.warn(
            `[paper:${key}] content still overflows its box at minimum scale ` +
              `(${MIN_PAGE_SCALE}) — it is clipped; trim the content`
          )
        }
      } else if (import.meta.env.DEV) {
        console.warn(
          `[paper:${key}] flowed sheet overflows its content box by ${Math.round(over)}px — ` +
            `a block's declared height is too small (see pageFlow.js); overflow is clipped`
        )
      }
    }
  }

  // 4. composite through the hard clip — the box is the law
  ctx.save()
  ctx.beginPath()
  ctx.rect(box.x, box.y, box.w, box.h)
  ctx.clip()
  ctx.drawImage(layer, 0, 0)
  ctx.restore()

  // 5. hotspots, re-mapped through whatever fit transform actually applied
  links.length = 0
  for (const r of raw) {
    links.push({
      u0: (r.x * fit.s + fit.tx) / W,
      v0: (r.y * fit.s + fit.ty) / H,
      u1: ((r.x + r.w) * fit.s + fit.tx) / W,
      v1: ((r.y + r.h) * fit.s + fit.ty) / H,
      href: r.href,
    })
  }

  if (multi) pageChrome(ctx, W, H, mulberry32(hashCode(key + ':chrome')), page, count, doc.kind)
}

/**
 * Shared multi-page dressing: hand-drawn tally marks for progress, a corner
 * numeral, and dog-eared "turn me" corners that line up with the UV hotspots
 * in Document.jsx (PAGE_CORNER). It lives in the reserved bottom margin,
 * below the content box.
 */
function pageChrome(ctx, W, H, rnd, page, count, kind) {
  const light = kind === 'blueprint'
  const ink = light ? 'rgba(223,233,247,0.9)' : 'rgba(51,41,29,0.8)'
  const faint = light ? 'rgba(223,233,247,0.4)' : 'rgba(51,41,29,0.3)'

  // tally marks, bottom centre — one stroke per sheet, read pages inked darker
  const gap = 26
  const x0 = W / 2 - ((count - 1) * gap) / 2
  for (let i = 0; i < count; i++) {
    ctx.strokeStyle = i <= page ? ink : faint
    ctx.lineWidth = i === page ? 5 : 3.5
    handLine(ctx, x0 + i * gap, H - 72, x0 + i * gap + 4, H - 30, rnd, 1.2, 4)
  }

  const fold = Math.round(Math.max(130, W * 0.085))

  if (page < count - 1) {
    // dog-eared next corner, bottom right
    ctx.fillStyle = light ? 'rgba(233,241,251,0.10)' : 'rgba(51,41,29,0.06)'
    ctx.beginPath()
    ctx.moveTo(W, H - fold)
    ctx.lineTo(W - fold, H)
    ctx.lineTo(W, H)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = ink
    ctx.lineWidth = 3.5
    handLine(ctx, W - fold, H, W, H - fold, rnd, 2, 6)
    handArrow(ctx, W - fold + 26, H - 40, W - 34, H - 40, rnd)
    text(ctx, `${page + 1}/${count}`, W - 40, H - fold - 16, {
      font: HAND, size: 38, color: ink, align: 'right',
    })
  } else {
    text(ctx, `${page + 1}/${count}`, W - 40, H - 44, {
      font: HAND, size: 38, color: ink, align: 'right',
    })
  }

  if (page > 0) {
    // back corner, bottom left
    ctx.strokeStyle = ink
    ctx.lineWidth = 3.5
    handArrow(ctx, fold - 26, H - 40, 34, H - 40, rnd)
  }
}

/** Dev-only sanity check: warn if a texture came out blank, and log a data
 *  URL so the painted sheet can be eyeballed straight from the console. */
function devVerify(c, key) {
  if (!import.meta.env.DEV) return
  const s = document.createElement('canvas')
  s.width = s.height = 24
  const sctx = s.getContext('2d')
  sctx.drawImage(c, 0, 0, 24, 24)
  const px = sctx.getImageData(0, 0, 24, 24).data
  let min = 255
  let max = 0
  for (let i = 0; i < px.length; i += 4) {
    const l = (px[i] + px[i + 1] + px[i + 2]) / 3
    if (l < min) min = l
    if (l > max) max = l
  }
  if (max - min < 8) {
    console.warn(`[paper:${key}] texture looks blank (luma spread ${(max - min).toFixed(1)})`)
  }
  console.debug(`[paper:${key}] painted ${c.width}x${c.height} —`, c.toDataURL('image/png'))
}

/* ------------------------------------------------------------------ */
/* deterministic jitter so repaints (font swap) don't shift the art    */
/* ------------------------------------------------------------------ */

function hashCode(s) {
  let x = 0
  for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0
  return x
}

function mulberry32(seed) {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ------------------------------------------------------------------ */
/* hand-drawn stroke helpers                                           */
/* ------------------------------------------------------------------ */

export function handLine(ctx, x1, y1, x2, y2, rnd, jitter = 2.5, segs = 10) {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  for (let i = 1; i <= segs; i++) {
    const t = i / segs
    const nx = x1 + (x2 - x1) * t
    const ny = y1 + (y2 - y1) * t
    const off = i === segs ? 0 : (rnd() - 0.5) * 2 * jitter
    // offset perpendicular to the stroke
    const len = Math.hypot(x2 - x1, y2 - y1) || 1
    ctx.lineTo(nx + (-(y2 - y1) / len) * off, ny + ((x2 - x1) / len) * off)
  }
  ctx.stroke()
}

export function handEllipse(ctx, cx, cy, rx, ry, rnd) {
  // two slightly misaligned passes read as a pen circling a word
  for (let p = 0; p < 2; p++) {
    ctx.beginPath()
    const rot = (rnd() - 0.5) * 0.3
    const start = rnd() * Math.PI
    for (let i = 0; i <= 24; i++) {
      const a = start + (i / 24) * Math.PI * 2.15
      const jr = 1 + (rnd() - 0.5) * 0.07
      const x = cx + Math.cos(a) * rx * jr * Math.cos(rot) - Math.sin(a) * ry * jr * Math.sin(rot)
      const y = cy + Math.cos(a) * rx * jr * Math.sin(rot) + Math.sin(a) * ry * jr * Math.cos(rot)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
}

export function handArrow(ctx, x1, y1, x2, y2, rnd) {
  handLine(ctx, x1, y1, x2, y2, rnd, 3, 8)
  const a = Math.atan2(y2 - y1, x2 - x1)
  const s = 16
  handLine(ctx, x2, y2, x2 - s * Math.cos(a - 0.45), y2 - s * Math.sin(a - 0.45), rnd, 1, 3)
  handLine(ctx, x2, y2, x2 - s * Math.cos(a + 0.45), y2 - s * Math.sin(a + 0.45), rnd, 1, 3)
}

/**
 * Draw one line of text. When a content box is active (i.e. inside a page's
 * `draw` pass) the line is measured first and its size stepped down 0.5px at
 * a time until it fits the box's remaining run — so no single line can cross
 * the paper's safe margin, whatever the copy grows into. Returns the painted
 * width.
 */
export function text(ctx, str, x, y, { font = MONO, size = 32, color = INK, align = 'left', spacing = 0, weight = '', maxW } = {}) {
  ctx.save()
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'alphabetic'
  const setFace = (s) => {
    ctx.font = `${weight ? weight + ' ' : ''}${s}px ${font}`
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${(spacing * s) / size}px`
  }
  // available run to the box edge, in the direction the text grows
  const box = ctx._contentBox
  let avail = maxW ?? Infinity
  if (box) {
    const run =
      align === 'right' ? x - box.x
      : align === 'center' ? 2 * Math.min(x - box.x, box.x + box.w - x)
      : box.x + box.w - x
    avail = Math.min(avail, run)
  }
  let s = size
  setFace(s)
  let w = ctx.measureText(str).width
  if (w > avail) {
    const min = Math.max(14, size * MIN_TEXT_SCALE)
    while (w > avail && s - 0.5 >= min) {
      s -= 0.5
      setFace(s)
      w = ctx.measureText(str).width
    }
    if (w > avail && import.meta.env.DEV) {
      console.warn(
        `[paper:${ctx._paperKey ?? '?'}] line "${str.slice(0, 40)}…" doesn't fit its run ` +
          `even at minimum size (${min}px) — it will be clipped; shorten the copy`
      )
    }
  }
  ctx.fillText(str, x, y)
  ctx.restore()
  return w
}

/* ------------------------------------------------------------------ */
/* paper backgrounds                                                   */
/* ------------------------------------------------------------------ */

export function paperBase(ctx, W, H, rnd, tone = '#f3ebd6') {
  ctx.fillStyle = tone
  ctx.fillRect(0, 0, W, H)
  for (let i = 0; i < (W * H) / 600; i++) {
    ctx.fillStyle = `rgba(${120 + rnd() * 90},${110 + rnd() * 80},${90 + rnd() * 70},${rnd() * 0.05})`
    ctx.fillRect(rnd() * W, rnd() * H, 2, 2)
  }
  for (let i = 0; i < 5; i++) {
    const x = rnd() * W
    const y = rnd() * H
    const r = 60 + rnd() * 130
    const g = ctx.createRadialGradient(x, y, 1, x, y, r)
    g.addColorStop(0, 'rgba(150,120,70,0.05)')
    g.addColorStop(1, 'rgba(150,120,70,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
}

export function gridBase(ctx, W, H, rnd) {
  paperBase(ctx, W, H, rnd, '#f4efe0')
  ctx.strokeStyle = 'rgba(120,150,120,0.30)'
  ctx.lineWidth = 1.5
  for (let y = 0; y <= H; y += 54) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
  }
  for (let x = 0; x <= W; x += 54) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(180,80,80,0.45)'
  ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(96, 0); ctx.lineTo(96, H); ctx.stroke()
}

export function blueprintBase(ctx, W, H, rnd) {
  ctx.fillStyle = '#1f4468'
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = 'rgba(220,235,255,0.14)'
  ctx.lineWidth = 1
  for (let x = 0; x <= W; x += 52) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
  }
  for (let y = 0; y <= H; y += 52) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
  }
  // mottled cyanotype wash
  for (let i = 0; i < 8; i++) {
    const x = rnd() * W
    const y = rnd() * H
    const r = 100 + rnd() * 200
    const g = ctx.createRadialGradient(x, y, 1, x, y, r)
    g.addColorStop(0, 'rgba(255,255,255,0.03)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.strokeStyle = 'rgba(230,240,255,0.75)'
  ctx.lineWidth = 6
  ctx.strokeRect(50, 50, W - 100, H - 100)
}
