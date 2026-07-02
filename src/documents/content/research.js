import {
  HAND, TYPE,
  blueprintBase, handLine, handArrow, text,
} from '../../lib/docTextures'

// Blueprint roll — three sheets on the active-control rocket program.

const WHITE = '#e9f1fb'
const DIM = 'rgba(233,241,251,0.75)'

function titleBlock(ctx, W, H, rnd, sheet) {
  const bx = W - 660
  const by = H - 290
  ctx.strokeStyle = WHITE
  ctx.lineWidth = 3
  ctx.strokeRect(bx, by, 520, 190)
  ctx.beginPath(); ctx.moveTo(bx, by + 66); ctx.lineTo(bx + 520, by + 66); ctx.stroke()
  text(ctx, 'MISSION LAUNCH ROCKETRY', bx + 24, by + 46, { font: TYPE, size: 32, color: WHITE })
  text(ctx, `DWG MLR-001 · SHT ${sheet} OF 3`, bx + 24, by + 112, { size: 28, color: DIM })
  text(ctx, 'SCALE: NTS · UCLA', bx + 24, by + 160, { size: 28, color: DIM })
}

function sheetHead(ctx, rnd, title, sub) {
  text(ctx, title, 120, 190, { font: TYPE, size: 92, color: WHITE, spacing: 4 })
  ctx.strokeStyle = DIM
  ctx.lineWidth = 4
  handLine(ctx, 124, 218, 124 + Math.min(1300, title.length * 58), 212, rnd, 3)
  text(ctx, sub, 124, 268, { size: 34, color: DIM, spacing: 4 })
}

/* ---- sheet A: vehicle overview ---- */
function paintOverview(ctx, W, H, rnd) {
  blueprintBase(ctx, W, H, rnd)
  sheetHead(ctx, rnd, 'ACTIVE-CONTROL ROCKET', 'CANARD TILT & ROLL AUTHORITY · CAD → CFD → CONTROL LAW → FLIGHT')
  text(ctx, 'objective: hold attitude through boost, then a controlled coast.', 124, 330, {
    font: HAND, size: 40, color: '#cfe0f4',
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

  titleBlock(ctx, W, H, rnd, 'A')
}

/* ---- sheet B: CFD & canard sweeps ---- */
function paintCFD(ctx, W, H, rnd) {
  blueprintBase(ctx, W, H, rnd)
  sheetHead(ctx, rnd, 'CFD & CANARD SWEEPS', 'SIMSCALE · DEFLECTION SWEEPS · CONTROL DERIVATIVES')

  // left: canard profile at three deflections, flow arrows incoming
  const cx = 480
  const cy = 640
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = DIM
    ctx.lineWidth = 3
    handArrow(ctx, 130, cy - 90 + i * 60, 250, cy - 90 + i * 60, rnd)
  }
  const fin = (angle, color) => {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(angle)
    ctx.strokeStyle = color
    ctx.lineWidth = 4
    handLine(ctx, -150, 0, 150, -18, rnd, 2)
    handLine(ctx, 150, -18, 150, 6, rnd, 1)
    handLine(ctx, 150, 6, -150, 0, rnd, 2)
    ctx.restore()
  }
  fin(-0.26, 'rgba(233,241,251,0.45)')
  fin(0, WHITE)
  fin(0.26, 'rgba(233,241,251,0.45)')
  text(ctx, 'δ = -15° / 0° / +15°', cx - 170, cy + 130, { size: 32, color: DIM })
  // hinge pivot mark
  ctx.strokeStyle = WHITE
  ctx.lineWidth = 3
  handLine(ctx, cx - 14, cy - 14, cx + 14, cy + 14, rnd, 1, 3)
  handLine(ctx, cx - 14, cy + 14, cx + 14, cy - 14, rnd, 1, 3)

  // right: Cm vs alpha plot with two deflection curves
  const px = 1180
  const py = 900
  const pw = 660
  const ph = 470
  ctx.strokeStyle = WHITE
  ctx.lineWidth = 3.5
  handLine(ctx, px, py, px, py - ph, rnd, 2) // y axis
  handLine(ctx, px, py, px + pw, py, rnd, 2) // x axis
  text(ctx, 'Cm', px - 66, py - ph + 40, { size: 34, color: WHITE })
  text(ctx, 'α (deg)', px + pw - 110, py + 52, { size: 34, color: WHITE })
  // dashed zero line
  ctx.save()
  ctx.setLineDash([18, 14])
  ctx.strokeStyle = DIM
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(px, py - ph / 2); ctx.lineTo(px + pw, py - ph / 2); ctx.stroke()
  ctx.restore()
  const curve = (gain, color, label, ly) => {
    ctx.strokeStyle = color
    ctx.lineWidth = 4
    ctx.beginPath()
    for (let x = 0; x <= pw - 60; x += 20) {
      const t = x / (pw - 60)
      const y = py - ph / 2 - gain * (t * ph * 0.42) - (rnd() - 0.5) * 6
      x === 0 ? ctx.moveTo(px + 30 + x, y) : ctx.lineTo(px + 30 + x, y)
    }
    ctx.stroke()
    text(ctx, label, px + pw - 44, ly, { size: 30, color, align: 'right' })
  }
  curve(1, WHITE, 'δ = 15°', py - ph + 62)
  curve(0.45, 'rgba(233,241,251,0.6)', 'δ = 5°', py - ph / 2 - 116)

  // notes, bottom left
  text(ctx, '· SWEEPS EXTRACT CONTROL EFFECTIVENESS PER DEGREE', 124, 1020, { size: 33, color: WHITE })
  text(ctx, '· FORCE / MOMENT COEFFICIENTS VS. ANGLE OF ATTACK', 124, 1080, { size: 33, color: WHITE })
  text(ctx, '· FEEDS THE STABILITY DERIVATIVES THE CONTROLLER USES', 124, 1140, { size: 33, color: WHITE })

  titleBlock(ctx, W, H, rnd, 'B')
}

/* ---- sheet C: the control loop ---- */
function paintControl(ctx, W, H, rnd) {
  blueprintBase(ctx, W, H, rnd)
  sheetHead(ctx, rnd, 'LQR / PID CONTROL LOOP', 'LINEARIZED DYNAMICS → A LOOP YOU CAN TRUST ON THE PAD')

  // block diagram
  const by = 520
  const box = (x, w, label, sub) => {
    ctx.strokeStyle = WHITE
    ctx.lineWidth = 4
    ctx.strokeRect(x, by, w, 150)
    text(ctx, label, x + w / 2, by + 66, { font: TYPE, size: 36, color: WHITE, align: 'center' })
    if (sub) text(ctx, sub, x + w / 2, by + 116, { size: 26, color: DIM, align: 'center' })
  }
  // summing junction
  const sx = 330
  const sy = by + 75
  ctx.strokeStyle = WHITE
  ctx.lineWidth = 4
  ctx.beginPath(); ctx.arc(sx, sy, 46, 0, Math.PI * 2); ctx.stroke()
  text(ctx, '+', sx - 22, sy - 8, { size: 34, color: WHITE, align: 'center' })
  text(ctx, '−', sx - 4, sy + 36, { size: 34, color: WHITE, align: 'center' })

  text(ctx, 'θ ref', 130, sy - 24, { size: 32, color: DIM })
  handArrow(ctx, 128, sy, sx - 52, sy, rnd)
  box(450, 330, 'LQR / PID', 'attitude regulation')
  handArrow(ctx, sx + 52, sy, 444, sy, rnd)
  box(880, 360, 'CANARD SERVOS', 'δ commands')
  handArrow(ctx, 786, sy, 874, sy, rnd)
  box(1340, 400, 'VEHICLE DYNAMICS', 'from CFD derivatives')
  handArrow(ctx, 1246, sy, 1334, sy, rnd)
  handArrow(ctx, 1746, sy, 1900, sy, rnd)
  text(ctx, 'θ', 1920, sy + 12, { size: 36, color: WHITE })

  // feedback path
  handLine(ctx, 1850, sy, 1850, by + 300, rnd, 2)
  handLine(ctx, 1850, by + 300, sx, by + 304, rnd, 2)
  handArrow(ctx, sx, by + 304, sx, sy + 52, rnd)
  text(ctx, 'IMU · STATE ESTIMATE', 980, by + 350, { size: 30, color: DIM, align: 'center' })

  // notes
  text(ctx, '· STATE-SPACE MODEL FROM THE CFD-DERIVED DERIVATIVES', 124, 1000, { size: 33, color: WHITE })
  text(ctx, '· LQR FOR MULTI-AXIS REGULATION, PID AS THE ROBUST BASELINE', 124, 1060, { size: 33, color: WHITE })
  text(ctx, '· SIMULATION-IN-THE-LOOP BEFORE ANYTHING FLIES', 124, 1120, { size: 33, color: WHITE })

  titleBlock(ctx, W, H, rnd, 'C')
}

export const researchPages = [paintOverview, paintCFD, paintControl]
