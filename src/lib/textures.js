import * as THREE from 'three'

// Procedural canvas textures so the project builds and runs with zero binary
// assets. Each is memoised — created once, on first use, in the browser.
// To swap in real photography later, drop a file in /public/assets/textures
// and load it with useTexture instead (see Desk.jsx for the hook-in point).

const cache = {}

function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

function finish(c, { repeat = false } = {}) {
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.needsUpdate = true
  return tex
}

/** Worn, warm oak desktop with grain, knots and a little grime.
 *  NOT tileable — the vignette and knots would show hard seams at every UV
 *  wrap, so the desk maps it exactly once (repeat 1,1). It is generated at
 *  the desk's aspect and a resolution that matches the old tiled density. */
export function woodTexture() {
  if (cache.wood) return cache.wood
  const W = 2048
  const H = 1536
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  const base = ctx.createLinearGradient(0, 0, W, H * 0.88)
  base.addColorStop(0, '#7c5734')
  base.addColorStop(0.5, '#6a4a2b')
  base.addColorStop(1, '#573b22')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, W, H)

  for (let i = 0; i < 700; i++) {
    const y = Math.random() * H
    ctx.strokeStyle = `rgba(${38 + Math.random() * 46},${24 + Math.random() * 28},12,${0.04 + Math.random() * 0.13})`
    ctx.lineWidth = 0.5 + Math.random() * 2.2
    ctx.beginPath()
    ctx.moveTo(0, y)
    for (let x = 0; x <= W; x += 24) {
      const wobble = Math.sin((x / W) * Math.PI * 4 + i) * 5 + (Math.random() - 0.5) * 2.5
      ctx.lineTo(x, y + wobble)
    }
    ctx.stroke()
  }

  for (let i = 0; i < 14; i++) {
    const x = Math.random() * W
    const y = Math.random() * H
    const r = 12 + Math.random() * 34
    const g = ctx.createRadialGradient(x, y, 1, x, y, r)
    g.addColorStop(0, 'rgba(28,16,7,0.55)')
    g.addColorStop(0.6, 'rgba(28,16,7,0.12)')
    g.addColorStop(1, 'rgba(28,16,7,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // soft edge grime / vignette — spans the whole desk exactly once
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.62)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(1, 'rgba(20,12,4,0.35)')
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, W, H)

  cache.wood = finish(c)
  return cache.wood
}

/** Cream drafting paper with faint fibres and a corner shadow. */
export function paperTexture(bright = false) {
  const key = bright ? 'paperBright' : 'paper'
  if (cache[key]) return cache[key]
  const c = canvas(512, 512)
  const ctx = c.getContext('2d')
  ctx.fillStyle = bright ? '#f8f2e4' : '#efe6d0'
  ctx.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = `rgba(${120 + Math.random() * 90},${110 + Math.random() * 80},${90 + Math.random() * 70},${Math.random() * 0.05})`
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5)
  }
  // faint age blotches
  for (let i = 0; i < 5; i++) {
    const x = Math.random() * 512
    const y = Math.random() * 512
    const r = 30 + Math.random() * 60
    const g = ctx.createRadialGradient(x, y, 1, x, y, r)
    g.addColorStop(0, 'rgba(150,120,70,0.06)')
    g.addColorStop(1, 'rgba(150,120,70,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  cache[key] = finish(c)
  return cache[key]
}

/** Soldermask + traces + pads for the stray circuit boards. */
export function pcbTexture(mask = 'green') {
  const key = `pcb-${mask}`
  if (cache[key]) return cache[key]
  const c = canvas(512, 336)
  const ctx = c.getContext('2d')
  const base = mask === 'blue' ? '#14395f' : '#12572f'
  const trace = mask === 'blue' ? 'rgba(90,140,200,0.55)' : 'rgba(60,170,105,0.55)'
  const pad = '#c9a227'
  ctx.fillStyle = base
  ctx.fillRect(0, 0, 512, 336)

  // manhattan-routed traces with gold pads at the ends
  ctx.strokeStyle = trace
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  const ends = []
  for (let i = 0; i < 30; i++) {
    let x = 20 + Math.random() * 472
    let y = 20 + Math.random() * 296
    ends.push([x, y])
    ctx.beginPath()
    ctx.moveTo(x, y)
    const segs = 2 + Math.floor(Math.random() * 3)
    for (let s = 0; s < segs; s++) {
      if (s % 2 === 0) x = Math.max(14, Math.min(498, x + (Math.random() - 0.5) * 220))
      else y = Math.max(14, Math.min(322, y + (Math.random() - 0.5) * 160))
      ctx.lineTo(x, y)
    }
    ctx.stroke()
    ends.push([x, y])
  }
  ctx.fillStyle = pad
  for (const [x, y] of ends) {
    ctx.beginPath()
    ctx.arc(x, y, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = base
    ctx.beginPath()
    ctx.arc(x, y, 2.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = pad
  }
  // silkscreen: component outlines + a board label
  ctx.strokeStyle = 'rgba(240,240,235,0.8)'
  ctx.lineWidth = 2
  for (let i = 0; i < 7; i++) {
    ctx.strokeRect(30 + Math.random() * 400, 30 + Math.random() * 250, 26 + Math.random() * 50, 18 + Math.random() * 34)
  }
  ctx.fillStyle = 'rgba(240,240,235,0.85)'
  ctx.font = '22px "Cutive Mono", monospace'
  ctx.fillText('MLR-01 REV B', 26, 320)
  cache[key] = finish(c)
  return cache[key]
}

/** Sepia stand-in portrait for the picture frame until the real photo lands
 *  at /public/assets/profile-photo.jpg. */
export function photoPlaceholderTexture() {
  if (cache.photoPh) return cache.photoPh
  const c = canvas(512, 640)
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, 640)
  g.addColorStop(0, '#d9c9a6')
  g.addColorStop(1, '#b4a07c')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 512, 640)
  // vignette
  const vg = ctx.createRadialGradient(256, 300, 120, 256, 320, 460)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(1, 'rgba(60,40,15,0.35)')
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, 512, 640)
  // head-and-shoulders silhouette
  ctx.fillStyle = 'rgba(122,96,60,0.75)'
  ctx.beginPath()
  ctx.ellipse(256, 250, 105, 125, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(256, 610, 200, 190, 0, Math.PI, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(50,38,22,0.85)'
  ctx.font = '30px "Architects Daughter", cursive'
  ctx.textAlign = 'center'
  ctx.fillText('photo goes here', 256, 500)
  ctx.font = '20px "Cutive Mono", monospace'
  ctx.fillText('/assets/profile-photo.jpg', 256, 540)
  cache.photoPh = finish(c)
  return cache.photoPh
}

/**
 * Live multi-line LCD for the TI-36X Pro — a CanvasTexture plus a `draw`
 * function the Calculator repaints on every key press. Entry line on top
 * (tail-scrolls like the real machine when it outgrows the glass), result
 * right-aligned below, DEG badge in the status row.
 */
export function createCalcScreen() {
  const W = 512
  const H = 164
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8

  let last = { expr: '', result: null, error: false }

  const render = () => {
    // grey-green LCD glass with a soft top sheen
    ctx.fillStyle = '#aeb89d'
    ctx.fillRect(0, 0, W, H)
    const sheen = ctx.createLinearGradient(0, 0, 0, H)
    sheen.addColorStop(0, 'rgba(255,255,255,0.16)')
    sheen.addColorStop(0.35, 'rgba(255,255,255,0)')
    ctx.fillStyle = sheen
    ctx.fillRect(0, 0, W, H)

    ctx.fillStyle = '#2d3226'
    ctx.textBaseline = 'alphabetic'
    ctx.font = '20px "Cutive Mono", monospace'
    ctx.textAlign = 'left'
    ctx.fillText('DEG', 10, 24)

    // entry line — show the tail when the expression outgrows the glass
    ctx.font = '34px "Cutive Mono", monospace'
    const expr = last.expr
    const cursorW = 16
    const maxW = W - 20 - cursorW
    if (ctx.measureText(expr).width <= maxW) {
      ctx.textAlign = 'left'
      ctx.fillText(expr, 12, 78)
      ctx.fillRect(14 + ctx.measureText(expr).width, 60, cursorW, 20)
    } else {
      ctx.textAlign = 'right'
      ctx.fillText(expr, 12 + maxW, 78)
      ctx.fillRect(16 + maxW, 60, cursorW, 20)
    }

    // result line
    ctx.textAlign = 'right'
    if (last.error) {
      ctx.font = '42px "Cutive Mono", monospace'
      ctx.fillText('Error', W - 14, 140)
    } else if (last.result != null) {
      ctx.font = '46px "Cutive Mono", monospace'
      let out = last.result
      while (ctx.measureText(out).width > W - 28 && out.length > 1) out = out.slice(0, -1)
      ctx.fillText(out, W - 14, 142)
    }
    ctx.textAlign = 'left'
    tex.needsUpdate = true
  }

  const draw = (expr, result, error = false) => {
    last = { expr, result, error }
    render()
  }
  render()
  // first paint can land before the webfont — repaint once it arrives
  document.fonts?.load('16px "Cutive Mono"').then(render).catch(() => {})

  return { texture: tex, draw }
}

// TI key caps: legends drawn once per label+colour pair and cached. System
// sans, not the drafting webfonts — key caps need to stay legible at a few
// screen pixels, and this also avoids any font-load repaint dance.
const KEY_TEX_W = 128
const KEY_TEX_H = 72

export function keyLabelTexture(label, base, ink) {
  const key = `key:${label}:${base}:${ink}`
  if (cache[key]) return cache[key]
  const c = canvas(KEY_TEX_W, KEY_TEX_H)
  const ctx = c.getContext('2d')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, KEY_TEX_W, KEY_TEX_H)
  // soft top-edge highlight so the cap reads slightly domed
  const hl = ctx.createLinearGradient(0, 0, 0, KEY_TEX_H)
  hl.addColorStop(0, 'rgba(255,255,255,0.14)')
  hl.addColorStop(0.5, 'rgba(255,255,255,0)')
  hl.addColorStop(1, 'rgba(0,0,0,0.10)')
  ctx.fillStyle = hl
  ctx.fillRect(0, 0, KEY_TEX_W, KEY_TEX_H)

  ctx.fillStyle = ink
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  // "x^2"-style labels render as a main glyph plus a raised superscript
  const [main, sup] = label.split('^')
  const size = main.length > 3 ? 34 : main.length > 1 ? 40 : 52
  ctx.font = `600 ${size}px "Segoe UI", Arial, sans-serif`
  if (sup) {
    const mw = ctx.measureText(main).width
    ctx.fillText(main, KEY_TEX_W / 2 - 10, KEY_TEX_H / 2 + 4)
    ctx.font = `600 ${Math.round(size * 0.6)}px "Segoe UI", Arial, sans-serif`
    ctx.fillText(sup, KEY_TEX_W / 2 - 10 + mw / 2 + ctx.measureText(sup).width / 2 + 2, KEY_TEX_H / 2 - 12)
  } else {
    ctx.fillText(main, KEY_TEX_W / 2, KEY_TEX_H / 2 + 4)
  }
  cache[key] = finish(c)
  return cache[key]
}

/** Coffee surface — dark liquid with a painted glare so it always reads as
 *  liquid even where the lamp's specular misses the camera. */
export function coffeeTexture() {
  if (cache.coffee) return cache.coffee
  const c = canvas(128, 128)
  const ctx = c.getContext('2d')
  const base = ctx.createRadialGradient(64, 64, 8, 64, 64, 64)
  base.addColorStop(0, '#2b1709')
  base.addColorStop(0.75, '#33200e')
  base.addColorStop(1, '#3d2a15')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, 128, 128)
  // faint ring where the liquid climbs the wall
  ctx.strokeStyle = 'rgba(214,160,110,0.18)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(64, 64, 58, 0, Math.PI * 2)
  ctx.stroke()
  // soft window/lamp glare, off-centre
  let g = ctx.createRadialGradient(44, 40, 2, 44, 40, 34)
  g.addColorStop(0, 'rgba(255,224,180,0.30)')
  g.addColorStop(0.4, 'rgba(255,224,180,0.10)')
  g.addColorStop(1, 'rgba(255,224,180,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  // a sharper crescent highlight on the meniscus side
  ctx.strokeStyle = 'rgba(255,236,205,0.35)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(60, 60, 46, Math.PI * 1.05, Math.PI * 1.45)
  ctx.stroke()
  cache.coffee = finish(c)
  return cache.coffee
}

/**
 * Scale markings for the drafting triangle, painted in shape space (texture
 * u,v = shape x,y / SIZE) so ticks hug the two legs and the hypotenuse.
 * Semi-transparent base keeps the acrylic translucent; each tick gets a dark
 * line plus an offset pale line so it reads engraved, not printed.
 */
export function triangleScaleTexture(size = 1.6) {
  if (cache.triScale) return cache.triScale
  const PX = 512
  const c = canvas(PX, PX)
  const ctx = c.getContext('2d')
  const px = (u) => (u / size) * PX
  const py = (v) => PX - (v / size) * PX // shape y runs up, canvas y runs down
  // translucent smoke-blue acrylic body
  ctx.fillStyle = 'rgba(143,185,201,0.55)'
  ctx.fillRect(0, 0, PX, PX)

  const engraved = (x0, y0, x1, y1, w = 2) => {
    ctx.strokeStyle = 'rgba(252,255,255,0.55)'
    ctx.lineWidth = w
    ctx.beginPath()
    ctx.moveTo(x0 + 1.6, y0 + 1.6)
    ctx.lineTo(x1 + 1.6, y1 + 1.6)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(10,28,36,0.95)'
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()
  }

  ctx.font = '26px "Cutive Mono", monospace'
  const label = (t, x, y) => {
    ctx.fillStyle = 'rgba(252,255,255,0.45)'
    ctx.fillText(t, x + 1.4, y + 1.4)
    ctx.fillStyle = 'rgba(10,28,36,0.9)'
    ctx.fillText(t, x, y)
  }

  const inset = 0.012 // ticks start just inside the edge
  // continuous rule line along each scale edge, like the engraved baseline
  engraved(px(inset), py(inset), px(size - 0.05), py(inset), 2.6)
  engraved(px(inset), py(inset), px(inset), py(size - 0.05), 2.6)
  for (let i = 0; i <= Math.round(size * 10); i++) {
    const d = i / 10
    if (d > size - 0.06) break
    const major = i % 5 === 0
    const len = major ? 0.095 : 0.05
    // bottom leg (y = 0): ticks point up into the face
    engraved(px(d), py(inset), px(d), py(inset + len), major ? 3.4 : 2.2)
    // vertical leg (x = 0): ticks point right
    engraved(px(inset), py(d), px(inset + len), py(d), major ? 3.4 : 2.2)
    if (major && i > 0) {
      ctx.textAlign = 'center'
      label(String(i), px(d), py(inset + len + 0.04))
      ctx.textAlign = 'left'
      label(String(i), px(inset + len + 0.014), py(d - 0.014))
    }
  }
  // plain half-centimetre ticks along the hypotenuse (x + y = size)
  const diag = Math.SQRT1_2
  for (let i = 1; i < Math.round(size * 10); i++) {
    const d = i / 10
    const hx = d * diag // distance d along the hypotenuse from the right corner
    const x0 = size - hx - inset * diag
    const y0 = hx - inset * diag
    const len = i % 5 === 0 ? 0.075 : 0.045
    engraved(px(x0), py(y0), px(x0 - len * diag), py(y0 - len * diag), i % 5 === 0 ? 3 : 2)
  }
  cache.triScale = finish(c)
  return cache.triScale
}

/**
 * Uniform-noise alpha map for fading a mesh's cast shadow. Real shadow maps
 * are binary per caster, so Document.jsx gives each picked-up sheet a
 * MeshDepthMaterial with this as alphaMap and animates alphaTest along the
 * pickup spring: the shadow dissolves texel-by-texel instead of snapping.
 * Values are capped at 254 so alphaTest ≈ 1 discards every texel, and the
 * texture is linear (not sRGB) because it encodes coverage, not colour.
 */
export function shadowDitherTexture() {
  if (cache.shadowDither) return cache.shadowDither
  const size = 64
  const data = new Uint8Array(size * size * 4)
  for (let i = 0; i < size * size; i++) {
    const v = Math.floor(Math.random() * 255) // 0..254
    data[i * 4] = v
    data[i * 4 + 1] = v // alphaMap samples the green channel
    data[i * 4 + 2] = v
    data[i * 4 + 3] = 255
  }
  const tex = new THREE.DataTexture(data, size, size)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.needsUpdate = true
  cache.shadowDither = tex
  return tex
}

/** Pale green engineering-pad ruling — hinted on interactive sheets. */
export function gridPaperTexture() {
  if (cache.grid) return cache.grid
  const c = canvas(512, 512)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#f4efe0'
  ctx.fillRect(0, 0, 512, 512)
  ctx.strokeStyle = 'rgba(120,150,120,0.35)'
  ctx.lineWidth = 1
  for (let i = 0; i <= 512; i += 22) {
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke()
  }
  // red left margin
  ctx.strokeStyle = 'rgba(180,80,80,0.5)'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(44, 0); ctx.lineTo(44, 512); ctx.stroke()
  cache.grid = finish(c)
  return cache.grid
}

