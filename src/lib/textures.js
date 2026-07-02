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

/** Worn, warm oak desktop with grain, knots and a little grime. */
export function woodTexture() {
  if (cache.wood) return cache.wood
  const c = canvas(1024, 1024)
  const ctx = c.getContext('2d')
  const base = ctx.createLinearGradient(0, 0, 1024, 900)
  base.addColorStop(0, '#7c5734')
  base.addColorStop(0.5, '#6a4a2b')
  base.addColorStop(1, '#573b22')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, 1024, 1024)

  for (let i = 0; i < 260; i++) {
    const y = Math.random() * 1024
    ctx.strokeStyle = `rgba(${38 + Math.random() * 46},${24 + Math.random() * 28},12,${0.04 + Math.random() * 0.13})`
    ctx.lineWidth = 0.5 + Math.random() * 2.2
    ctx.beginPath()
    ctx.moveTo(0, y)
    for (let x = 0; x <= 1024; x += 24) {
      const wobble = Math.sin((x / 1024) * Math.PI * 2 + i) * 5 + (Math.random() - 0.5) * 2.5
      ctx.lineTo(x, y + wobble)
    }
    ctx.stroke()
  }

  for (let i = 0; i < 7; i++) {
    const x = Math.random() * 1024
    const y = Math.random() * 1024
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

  // soft edge grime / vignette
  const vg = ctx.createRadialGradient(512, 512, 200, 512, 512, 720)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(1, 'rgba(20,12,4,0.35)')
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, 1024, 1024)

  cache.wood = finish(c, { repeat: true })
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

/** MathPrint-style multi-line LCD for the TI-36X Pro — mid-calculation. */
export function calcScreenTexture() {
  if (cache.calcScreen) return cache.calcScreen
  const c = canvas(352, 112)
  const ctx = c.getContext('2d')
  // grey-green LCD glass with a soft top sheen
  ctx.fillStyle = '#aeb89d'
  ctx.fillRect(0, 0, 352, 112)
  const sheen = ctx.createLinearGradient(0, 0, 0, 112)
  sheen.addColorStop(0, 'rgba(255,255,255,0.16)')
  sheen.addColorStop(0.35, 'rgba(255,255,255,0)')
  ctx.fillStyle = sheen
  ctx.fillRect(0, 0, 352, 112)
  ctx.fillStyle = '#2d3226'
  // status row
  ctx.font = '13px "Cutive Mono", monospace'
  ctx.fillText('DEG', 8, 18)
  // expression + result rows, like a paused calculation
  ctx.font = '24px "Cutive Mono", monospace'
  ctx.fillText('4·π²·(0.18)/9.81', 10, 52)
  ctx.textAlign = 'right'
  ctx.fillText('0.0724', 340, 88)
  ctx.textAlign = 'left'
  // block cursor on the entry line
  ctx.fillRect(10, 96, 13, 5)
  cache.calcScreen = finish(c)
  return cache.calcScreen
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

