import * as THREE from 'three'

/**
 * Paints each document's real content onto a high-resolution canvas and hands
 * it to Three as a CanvasTexture — this is what you read on the sheets lying
 * on the desk and while one is picked up. The DOM overlay (ContentOverlay)
 * repeats the same content as crisp selectable text once a document is open;
 * if you edit copy here, keep src/documents/content/* in step.
 *
 * Textures are 1280px tall regardless of paper size, because the pickup
 * animation scales every sheet to the same world height: at the focused
 * camera distance a sheet covers ~940 screen px, so 1280 texels stay sharp.
 */

const HAND = '"Architects Daughter", "Segoe Script", cursive'
const TYPE = '"Special Elite", "Courier New", monospace'
const MONO = '"Cutive Mono", "Courier New", monospace'

const INK = '#33291d'
const FAINT = '#8a7a55'
const RED = '#b3563f'

const TEX_H = 1280
const MAX_W = 2048

const cache = new Map()

export function docTexture(doc) {
  if (cache.has(doc.id)) return cache.get(doc.id)

  const { w, h } = doc.paper
  const c = document.createElement('canvas')
  c.width = Math.min(MAX_W, Math.round((w / h) * TEX_H))
  c.height = TEX_H

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8

  // First paint may fall back to system fonts; repaint once the real faces
  // arrive so the drafting look survives a cold cache.
  paint(c, doc.id)
  tex.needsUpdate = true
  const faces = [`16px ${HAND}`, `16px ${TYPE}`, `16px ${MONO}`]
  Promise.all(faces.map((f) => document.fonts.load(f)))
    .then(() => {
      paint(c, doc.id)
      tex.needsUpdate = true
      devVerify(c, doc.id)
    })
    .catch(() => devVerify(c, doc.id))

  cache.set(doc.id, tex)
  return tex
}

function paint(c, id) {
  const ctx = c.getContext('2d')
  const painter = PAINTERS[id]
  if (!painter) throw new Error(`No paper painter for document "${id}"`)
  painter(ctx, c.width, c.height, mulberry32(hashCode(id)))
}

/** Dev-only sanity check: warn if a texture came out blank, and log a data
 *  URL so the painted sheet can be eyeballed straight from the console. */
function devVerify(c, id) {
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
    console.warn(`[paper:${id}] texture looks blank (luma spread ${(max - min).toFixed(1)})`)
  }
  console.debug(`[paper:${id}] painted ${c.width}x${c.height} —`, c.toDataURL('image/png'))
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

function handLine(ctx, x1, y1, x2, y2, rnd, jitter = 2.5, segs = 10) {
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

function handEllipse(ctx, cx, cy, rx, ry, rnd) {
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

function handArrow(ctx, x1, y1, x2, y2, rnd) {
  handLine(ctx, x1, y1, x2, y2, rnd, 3, 8)
  const a = Math.atan2(y2 - y1, x2 - x1)
  const s = 16
  handLine(ctx, x2, y2, x2 - s * Math.cos(a - 0.45), y2 - s * Math.sin(a - 0.45), rnd, 1, 3)
  handLine(ctx, x2, y2, x2 - s * Math.cos(a + 0.45), y2 - s * Math.sin(a + 0.45), rnd, 1, 3)
}

function text(ctx, str, x, y, { font = MONO, size = 32, color = INK, align = 'left', spacing = 0, weight = '' } = {}) {
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

function paperBase(ctx, W, H, rnd, tone = '#f3ebd6') {
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

function gridBase(ctx, W, H, rnd) {
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

function blueprintBase(ctx, W, H, rnd) {
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

/* ------------------------------------------------------------------ */
/* per-document painters                                               */
/* ------------------------------------------------------------------ */

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

  // margin doodle: arrow to the current-work note
  ctx.strokeStyle = 'rgba(122,90,47,0.9)'
  ctx.lineWidth = 4
  handArrow(ctx, W - 620, H - 165, W - 520, H - 118, rnd)
  text(ctx, 'now: canard rockets · drones · AI tooling', W - 490, H - 100, {
    font: HAND, size: 42, color: '#7a5a2f',
  })
  text(ctx, 'pick up to read', 110, H - 100, { size: 30, color: FAINT, spacing: 4 })
}

function paintProjects(ctx, W, H, rnd) {
  gridBase(ctx, W, H, rnd)

  // top ~90px stays clear for the bulldog clip
  text(ctx, 'PROJECT DRAWINGS — 4 SHEETS', 130, 165, { size: 27, color: FAINT, spacing: 5 })
  text(ctx, 'PROJECTS', 126, 268, { font: TYPE, size: 88 })
  ctx.strokeStyle = INK
  ctx.lineWidth = 4
  handLine(ctx, 130, 292, 590, 286, rnd, 3)

  // hand-sketched 7" quad: X frame, four rotors, center plate
  const qx = W / 2 + 40
  const qy = 445
  ctx.strokeStyle = 'rgba(51,41,29,0.85)'
  ctx.lineWidth = 4
  handLine(ctx, qx - 130, qy - 82, qx + 130, qy + 82, rnd, 2)
  handLine(ctx, qx - 130, qy + 82, qx + 130, qy - 82, rnd, 2)
  for (const [sx, sy] of [[-130, -82], [130, -82], [-130, 82], [130, 82]]) {
    handEllipse(ctx, qx + sx, qy + sy, 52, 52, rnd)
  }
  ctx.strokeRect(qx - 30, qy - 22, 60, 44)
  handArrow(ctx, qx - 285, qy + 10, qx - 165, qy - 8, rnd)
  text(ctx, '7in', qx - 350, qy + 22, { font: HAND, size: 38, color: '#7a5a2f' })

  const items = [
    ['01', 'AUTONOMOUS DRONE', 'Pi Zero 2 W · STM32H7 · ArduPilot'],
    ['02', 'ASIDEAI', 'CalHacks 2026 — 1st place, Deepgram'],
    ['03', 'ASIDEAI V2', 'the production rebuild'],
    ['04', 'RECCO', 'YC AI Growth Hackathon 2026'],
  ]
  let y = 690
  for (const [no, title, sub] of items) {
    text(ctx, no, 130, y, { size: 34, color: RED })
    text(ctx, title, 200, y, { font: TYPE, size: 46 })
    text(ctx, sub, 200, y + 46, { size: 30, color: '#5c5340' })
    if (no === '02') {
      // circle the win
      ctx.save()
      ctx.font = `30px ${MONO}`
      const pre = ctx.measureText('CalHacks 2026 — ').width
      const word = ctx.measureText('1st place').width
      ctx.restore()
      ctx.strokeStyle = 'rgba(179,86,63,0.8)'
      ctx.lineWidth = 3.5
      handEllipse(ctx, 200 + pre + word / 2, y + 36, word / 2 + 28, 34, rnd)
    }
    y += 142
  }
}

function paintResearch(ctx, W, H, rnd) {
  blueprintBase(ctx, W, H, rnd)
  const WHITE = '#e9f1fb'
  const DIM = 'rgba(233,241,251,0.75)'

  text(ctx, 'ACTIVE-CONTROL ROCKET', 120, 190, { font: TYPE, size: 92, color: WHITE, spacing: 4 })
  ctx.strokeStyle = DIM
  ctx.lineWidth = 4
  handLine(ctx, 124, 218, 1290, 212, rnd, 3)
  text(ctx, 'CANARD DEFLECTION SWEEPS · CFD (SIMSCALE) · LQR / PID', 124, 268, {
    size: 34, color: DIM, spacing: 4,
  })

  // side-view rocket, nose to the right
  const cy = 720
  ctx.strokeStyle = WHITE
  ctx.lineWidth = 4
  handLine(ctx, 300, cy - 85, 1330, cy - 85, rnd, 2) // body top
  handLine(ctx, 300, cy + 85, 1330, cy + 85, rnd, 2) // body bottom
  handLine(ctx, 300, cy - 85, 300, cy + 85, rnd, 2) // tail bulkhead
  handLine(ctx, 1330, cy - 85, 1555, cy, rnd, 2) // nose cone
  handLine(ctx, 1330, cy + 85, 1555, cy, rnd, 2)
  // dashed centreline
  ctx.save()
  ctx.setLineDash([26, 18])
  ctx.lineWidth = 2
  ctx.strokeStyle = DIM
  ctx.beginPath(); ctx.moveTo(250, cy); ctx.lineTo(1620, cy); ctx.stroke()
  ctx.restore()
  // canards near the nose
  ctx.lineWidth = 4
  handLine(ctx, 1225, cy - 85, 1265, cy - 150, rnd, 1.5)
  handLine(ctx, 1265, cy - 150, 1305, cy - 85, rnd, 1.5)
  handLine(ctx, 1225, cy + 85, 1265, cy + 150, rnd, 1.5)
  handLine(ctx, 1265, cy + 150, 1305, cy + 85, rnd, 1.5)
  // tail fins
  handLine(ctx, 300, cy - 85, 360, cy - 190, rnd, 1.5)
  handLine(ctx, 360, cy - 190, 470, cy - 85, rnd, 1.5)
  handLine(ctx, 300, cy + 85, 360, cy + 190, rnd, 1.5)
  handLine(ctx, 360, cy + 190, 470, cy + 85, rnd, 1.5)
  // avionics bay
  ctx.strokeRect(690, cy - 52, 190, 104)
  text(ctx, 'AVIONICS', 705, cy + 12, { size: 30, color: DIM })

  // leaders + callouts
  ctx.lineWidth = 3
  handArrow(ctx, 1500, 400, 1290, cy - 155, rnd)
  text(ctx, 'CANARDS — δ SWEEPS ±15°', 1370, 372, { size: 33, color: WHITE })
  handArrow(ctx, 520, 1105, 640, cy + 95, rnd)
  text(ctx, 'Cm(α, δ) FROM CFD', 300, 1140, { size: 33, color: WHITE })
  handArrow(ctx, 1035, 1080, 830, cy + 62, rnd)
  text(ctx, 'LQR / PID ATTITUDE LOOP', 1060, 1105, { size: 33, color: WHITE })

  // drawing title block
  const bx = W - 590
  const by = H - 260
  ctx.strokeStyle = WHITE
  ctx.lineWidth = 3
  ctx.strokeRect(bx, by, 520, 190)
  ctx.beginPath(); ctx.moveTo(bx, by + 66); ctx.lineTo(bx + 520, by + 66); ctx.stroke()
  text(ctx, 'MISSION LAUNCH ROCKETRY', bx + 24, by + 46, { font: TYPE, size: 32, color: WHITE })
  text(ctx, 'DWG MLR-001 · SHT A OF 3', bx + 24, by + 112, { size: 28, color: DIM })
  text(ctx, 'SCALE: NTS · UCLA', bx + 24, by + 160, { size: 28, color: DIM })
}

function paintResume(ctx, W, H, rnd) {
  paperBase(ctx, W, H, rnd)

  // fold creases (match the two thirds of the folded prop)
  ctx.strokeStyle = 'rgba(160,145,110,0.5)'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(0, Math.round(H / 3)); ctx.lineTo(W, Math.round(H / 3)); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(0, Math.round((2 * H) / 3)); ctx.lineTo(W, Math.round((2 * H) / 3)); ctx.stroke()

  text(ctx, 'BRYAN PHAM', 96, 165, { font: TYPE, size: 72 })
  text(ctx, 'RESUME — MECHANICAL ENGINEERING', 98, 220, { size: 28, color: FAINT, spacing: 3 })
  ctx.strokeStyle = INK
  ctx.lineWidth = 3.5
  handLine(ctx, 96, 258, W - 96, 252, rnd, 2)

  const section = (label, y) => {
    text(ctx, label, 96, y, { font: TYPE, size: 40 })
    ctx.strokeStyle = 'rgba(60,50,30,0.4)'
    ctx.lineWidth = 2
    handLine(ctx, 96, y + 14, W - 96, y + 12, rnd, 1.5)
  }
  const entry = (title, sub, y) => {
    text(ctx, title, 116, y, { size: 34, color: INK, weight: 'bold', font: 'Georgia, serif' })
    text(ctx, sub, 116, y + 42, { size: 28, color: '#5c5340' })
  }

  section('EDUCATION', 350)
  entry('UCLA — B.S. Mechanical Engineering', 'controls · aero structures · in progress', 415)

  section('EXPERIENCE', 570)
  entry('Aria AI — Founding Engineer', 'building the product & systems from zero', 635)
  entry('Mission Launch Rocketry — Founder / President', 'active-control rocket program: CAD → CFD → flight', 760)

  section('PROJECTS', 915)
  entry('Autonomous drone · AsideAI · Recco', 'STM32H7 + ArduPilot · CalHacks 1st place · YC hackathon', 980)

  // hand-boxed download note (the live link is in the opened document)
  ctx.strokeStyle = 'rgba(58,75,47,0.9)'
  ctx.lineWidth = 4
  handLine(ctx, 96, 1120, 620, 1116, rnd, 2)
  handLine(ctx, 620, 1116, 624, 1210, rnd, 2)
  handLine(ctx, 624, 1210, 100, 1214, rnd, 2)
  handLine(ctx, 100, 1214, 96, 1120, rnd, 2)
  text(ctx, 'pick up for the PDF ↗', 140, 1180, { font: HAND, size: 44, color: '#3a4b2f' })
}

function paintContact(ctx, W, H, rnd) {
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

  text(ctx, 'CORRESPONDENCE', 110, 130, { size: 30, color: FAINT, spacing: 7 })

  // addressee block, written by hand
  const lines = [
    ['Bryan Pham', 62, INK],
    ['bryanpham2024@gmail.com', 52, '#2f5d86'],
    ['github.com/bryanph4m', 52, '#2f5d86'],
    ['linkedin.com/in/bryanph4m', 52, '#2f5d86'],
  ]
  let y = H * 0.5 + 40
  for (const [str, size, color] of lines) {
    text(ctx, str, W * 0.30, y, { font: HAND, size, color })
    y += 96
  }
  // underline the email like a scribbled emphasis
  ctx.strokeStyle = 'rgba(47,93,134,0.7)'
  ctx.lineWidth = 3.5
  handLine(ctx, W * 0.30, H * 0.5 + 152, W * 0.30 + 590, H * 0.5 + 146, rnd, 3)

  text(ctx, 'click to open →', W - 130, H - 78, { font: HAND, size: 40, color: '#7a5a2f', align: 'right' })
}

const PAINTERS = {
  about: paintAbout,
  projects: paintProjects,
  research: paintResearch,
  resume: paintResume,
  contact: paintContact,
}
