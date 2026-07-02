import * as THREE from 'three'

/**
 * Paints every page of every document onto high-resolution canvases and hands
 * them to Three as CanvasTextures. The paper mesh is the only place content
 * renders — there is no DOM overlay. Painters live in
 * src/documents/content/*, one module per document, each exporting an array
 * of page painters (the registry wires them up).
 *
 * Painters may register clickable regions through the `link` callback; those
 * regions are raycast against the focused sheet's UVs in Document.jsx.
 *
 * Textures are 1280px tall regardless of paper size, because the pickup
 * animation scales every sheet to the same world height: at the focused
 * camera distance a sheet covers ~940 screen px, so 1280 texels stay sharp.
 */

export const HAND = '"Architects Daughter", "Segoe Script", cursive'
export const TYPE = '"Special Elite", "Courier New", monospace'
export const MONO = '"Cutive Mono", "Courier New", monospace'

export const INK = '#33291d'
export const FAINT = '#8a7a55'
export const RED = '#b3563f'

const TEX_H = 1280
const MAX_W = 2048

const texCache = new Map()
const linkCache = new Map()

const keyFor = (doc, page) => `${doc.id}:${page}`

export function docTexture(doc, page = 0) {
  const key = keyFor(doc, page)
  if (texCache.has(key)) return texCache.get(key)

  const { w, h } = doc.paper
  const c = document.createElement('canvas')
  c.width = Math.min(MAX_W, Math.round((w / h) * TEX_H))
  c.height = TEX_H

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8

  const links = []
  linkCache.set(key, links)

  // First paint may fall back to system fonts; repaint once the real faces
  // arrive so the drafting look survives a cold cache.
  paint(c, doc, page, links)
  tex.needsUpdate = true
  const faces = [`16px ${HAND}`, `16px ${TYPE}`, `16px ${MONO}`]
  Promise.all(faces.map((f) => document.fonts.load(f)))
    .then(() => {
      paint(c, doc, page, links)
      tex.needsUpdate = true
      devVerify(c, key)
    })
    .catch(() => devVerify(c, key))

  texCache.set(key, tex)
  return tex
}

/** Clickable regions of a page, in canvas UV space (u right, v down, 0..1). */
export function docLinks(doc, page = 0) {
  return linkCache.get(keyFor(doc, page)) ?? []
}

function paint(c, doc, page, links) {
  const ctx = c.getContext('2d')
  const painter = doc.pages[page]
  if (!painter) throw new Error(`No page painter for "${doc.id}" page ${page}`)
  const W = c.width
  const H = c.height
  links.length = 0
  const link = (x, y, w, h, href) =>
    links.push({ u0: x / W, v0: y / H, u1: (x + w) / W, v1: (y + h) / H, href })
  const rnd = mulberry32(hashCode(keyFor(doc, page)))
  painter(ctx, W, H, rnd, link)
  if (doc.pages.length > 1) pageChrome(ctx, W, H, rnd, page, doc.pages.length, doc.kind)
}

/**
 * Shared multi-page dressing: hand-drawn tally marks for progress, a corner
 * numeral, and dog-eared "turn me" corners that line up with the UV hotspots
 * in Document.jsx (PAGE_CORNER).
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

export function text(ctx, str, x, y, { font = MONO, size = 32, color = INK, align = 'left', spacing = 0, weight = '' } = {}) {
  ctx.save()
  ctx.font = `${weight ? weight + ' ' : ''}${size}px ${font}`
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'alphabetic'
  if (spacing && 'letterSpacing' in ctx) ctx.letterSpacing = `${spacing}px`
  ctx.fillText(str, x, y)
  const w = ctx.measureText(str).width
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
