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

