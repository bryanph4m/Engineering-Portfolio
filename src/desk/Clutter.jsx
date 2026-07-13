import { useMemo } from 'react'
import * as THREE from 'three'
import { COLORS } from './constants'
import {
  calcScreenTexture,
  coffeeTexture,
  keyLabelTexture,
  paperTexture,
  pcbTexture,
  triangleScaleTexture,
} from '../lib/textures'

/**
 * Static desk dressing that sells the "older engineer, manual drafting,
 * mid-project" read: T-square, a drafting compass, mechanical pencils,
 * kneaded eraser, slide rule, a vellum roll, a coffee mug, a drafting
 * triangle, a pin dish, stray circuit boards with loose components, a
 * TI-36X Pro calculator and a meshed pair of gears filling the middle of
 * the desk. (The framed photo that used to lean at the back is now its own
 * interactive album — see PhotoFrame.jsx.)
 *
 * Layout rules (enforced by DevLayoutAudit in dev builds):
 *  - every object rests ON the desk: y = half its own height, nothing sunk
 *  - nothing shares footprint with an interactive document
 * The root group is named "clutter" so the audit can find these meshes.
 */

const brass = { color: COLORS.brass, metalness: 0.7, roughness: 0.35 }
const graphite = { color: COLORS.graphite, metalness: 0.4, roughness: 0.5 }
const steel = { color: '#aeb4bc', metalness: 0.85, roughness: 0.3 }

function Pencil({ position, rotation, color = '#7a1f24' }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow>
        <cylinderGeometry args={[0.045, 0.045, 1.5, 12]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.2} />
      </mesh>
      {/* knurled grip */}
      <mesh castShadow position={[0, -0.72, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.22, 12]} />
        <meshStandardMaterial {...graphite} />
      </mesh>
      {/* tip cone */}
      <mesh castShadow position={[0, -0.86, 0]}>
        <coneGeometry args={[0.035, 0.12, 12]} />
        <meshStandardMaterial color="#c9c9c9" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* clip */}
      <mesh castShadow position={[0.05, 0.55, 0]}>
        <boxGeometry args={[0.02, 0.4, 0.04]} />
        <meshStandardMaterial {...brass} />
      </mesh>
    </group>
  )
}

/**
 * The one drafting compass on the desk: a steel bow compass lying flat,
 * legs partially open — needle point on one leg, lead holder on the other,
 * brass hinge barrel and the adjustment bar spanning the legs.
 */
function DraftingCompass({ position, yaw = 0 }) {
  const leg = 0.95
  const half = 0.31 // half the opening angle between the legs

  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {/* hinge barrel + spindle handle, standing proud of the flat legs */}
      <mesh castShadow position={[0, 0.055, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.075, 16]} />
        <meshStandardMaterial {...brass} />
      </mesh>
      <mesh castShadow position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.08, 10]} />
        <meshStandardMaterial {...steel} />
      </mesh>

      {[-1, 1].map((s) => (
        <group key={s} rotation={[0, s * half, 0]}>
          {/* tapered leg lying on the desk, hinge end thicker */}
          <mesh castShadow position={[0, 0.036, leg / 2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.014, 0.026, leg, 10]} />
            <meshStandardMaterial {...steel} />
          </mesh>
          {s < 0 ? (
            // needle point
            <mesh castShadow position={[0, 0.028, leg + 0.045]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.011, 0.09, 8]} />
              <meshStandardMaterial {...steel} />
            </mesh>
          ) : (
            // lead holder: knurled collar + graphite tip
            <group>
              <mesh castShadow position={[0, 0.034, leg - 0.06]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.024, 0.024, 0.09, 10]} />
                <meshStandardMaterial {...brass} />
              </mesh>
              <mesh castShadow position={[0, 0.028, leg + 0.04]} rotation={[Math.PI / 2, 0, 0]}>
                <coneGeometry args={[0.013, 0.08, 8]} />
                <meshStandardMaterial color="#2c2c2e" roughness={0.4} />
              </mesh>
            </group>
          )}
        </group>
      ))}

      {/* adjustment bar spanning the open legs */}
      <mesh castShadow position={[0, 0.036, 0.333]}>
        <boxGeometry args={[0.3, 0.016, 0.016]} />
        <meshStandardMaterial {...steel} />
      </mesh>
    </group>
  )
}

// TI-36X Pro colourway: near-black shell, charcoal function keys, white
// digit/operator keys, the blue [2nd] key and blue-grey arrow pad.
const TI_BODY = '#26262b'
const TI_KEY_DARK = '#35353c'
const TI_KEY_WHITE = '#f2efe6'
const TI_BLUE = '#4a7fb5'
const TI_INK_LIGHT = '#e9e9ee'
const TI_INK_DARK = '#26262b'

// Everything on the shell face uses the same physical rule that fixed the
// paper z-fighting: bases embedded a real KEY_EMBED into the body, tops a
// real thickness proud of it — never hairline gaps or coplanar faces.
const SHELL_TOP = 0.16
const KEY_EMBED = 0.004
const BEZEL_TOP = 0.176 // display bezel face (0.166 centre + 0.02/2)
const PAD_TOP = 0.176 // arrow pad face (0.163 centre + 0.026/2)

/** Key cap layout: position, legend and colour only — pure set dressing. */
const calcKeys = (() => {
  const list = []
  const add = (label, x, z, opts = {}) =>
    list.push({
      id: `${x}:${z}`,
      label,
      x,
      z,
      w: 0.085,
      d: 0.05,
      h: 0.022,
      color: TI_KEY_DARK,
      ink: TI_INK_LIGHT,
      ...opts,
    })

  // charcoal function rows — the top two stop short of the arrow pad
  const fx = [-0.245, -0.15, -0.055, 0.04]
  add('2nd', fx[0], -0.19, { color: TI_BLUE })
  add('mode', fx[1], -0.19)
  add('del', fx[2], -0.19)
  add('clear', fx[3], -0.19)
  ;['math', 'num', 'data', 'stat'].forEach((l, i) => add(l, fx[i], -0.115))

  // full-width scientific rows
  const sx = [-0.245, -0.1225, 0, 0.1225, 0.245]
  ;['x^2', 'x^-1', '√', '(', ')'].forEach((l, i) => add(l, sx[i], -0.04))
  ;['sin', 'cos', 'tan', 'π', 'ans'].forEach((l, i) => add(l, sx[i], 0.035))

  // white digit/operator pad
  const grid = [
    ['7', '8', '9', '÷'],
    ['4', '5', '6', '×'],
    ['1', '2', '3', '−'],
    ['0', '.', '+', '='],
  ]
  grid.forEach((row, r) =>
    row.forEach((l, c) =>
      add(l, [-0.22, -0.08, 0.06, 0.22][c], [0.115, 0.195, 0.275, 0.355][r], {
        w: 0.11,
        d: 0.058,
        h: 0.026,
        color: TI_KEY_WHITE,
        ink: TI_INK_DARK,
      })
    )
  )
  return list
})()

/**
 * TI-36X Pro scientific calculator, pushed aside mid-use — static set
 * dressing only. No pointer handlers, no state, no computation: the LCD is a
 * painted mid-calculation and the key caps are inert labelled meshes, so the
 * prop costs nothing per-frame and never participates in raycasting. Same
 * desk footprint as always, so the layout audit stays valid.
 */
function Calculator({ position, yaw = 0 }) {
  const screen = calcScreenTexture()
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {/* shell */}
      <mesh castShadow position={[0, 0.08, 0]}>
        <boxGeometry args={[0.62, 0.16, 0.9]} />
        <meshStandardMaterial color={TI_BODY} roughness={0.5} metalness={0.05} />
      </mesh>
      {/* solar strip beside the branding — same embed/proud rule as the keys */}
      <mesh position={[0.185, 0.162, -0.405]}>
        <boxGeometry args={[0.17, 0.012, 0.055]} />
        <meshStandardMaterial color="#141828" roughness={0.25} metalness={0.3} />
      </mesh>
      {/* display bezel + the painted LCD, a real 0.004 above the bezel face */}
      <mesh castShadow position={[0, 0.166, -0.315]}>
        <boxGeometry args={[0.54, 0.02, 0.21]} />
        <meshStandardMaterial color="#1c1c21" roughness={0.5} />
      </mesh>
      <mesh position={[0, BEZEL_TOP + 0.004, -0.315]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.46, 0.147]} />
        <meshStandardMaterial map={screen} roughness={0.35} />
      </mesh>
      {/* blue-grey four-way arrow pad, top right; the centre disk's base is
          buried in the pad and its face sits a real 0.008 proud — the old
          hairline 0.0005 overlap here is what made the pad flicker */}
      <mesh castShadow position={[0.2, 0.163, -0.1525]}>
        <cylinderGeometry args={[0.075, 0.08, 0.026, 20]} />
        <meshStandardMaterial color={TI_BLUE} roughness={0.5} />
      </mesh>
      <mesh position={[0.2, PAD_TOP + 0.002, -0.1525]}>
        <cylinderGeometry args={[0.026, 0.026, 0.012, 14]} />
        <meshStandardMaterial color={TI_BODY} roughness={0.5} />
      </mesh>
      {/* inert labelled key caps — no handlers, so r3f never raycasts them */}
      {calcKeys.map(({ id, label, x, z, w, d, h, color, ink }) => (
        <mesh key={id} castShadow position={[x, SHELL_TOP + h / 2 - KEY_EMBED, z]}>
          <boxGeometry args={[w, h, d]} />
          {[0, 1, 3, 4, 5].map((i) => (
            <meshStandardMaterial key={i} attach={`material-${i}`} color={color} roughness={0.45} />
          ))}
          <meshStandardMaterial attach="material-2" map={keyLabelTexture(label, color, ink)} roughness={0.45} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * A loose steel spur gear lying flat, cut like the real thing: trapezoidal
 * teeth with angled flanks around a round root circle, a true through-bore,
 * and a raised brass hub ring. `phase` spins the tooth pattern into the
 * geometry (the prop itself never rotates) so two touching gears can be
 * clocked to interlock: give both the same `module`, set their centre
 * distance to the sum of their pitch radii (module * teeth / 2), and phase
 * one with a tooth on the centre line and the other with a gap.
 * Shape-space angle b lands at world angle -b once the extrusion is laid
 * flat, so a tooth aimed at world angle t needs phase = -t.
 */
function Gear({ position, teeth = 12, module = 0.04, thickness = 0.05, phase = 0, bore = 0.05 }) {
  const pitchR = (module * teeth) / 2
  const { plate, hub } = useMemo(() => {
    const tip = pitchR + module * 0.9 // addendum
    const root = pitchR - module * 1.1 // dedendum
    const p = (Math.PI * 2) / teeth
    const s = new THREE.Shape()
    for (let i = 0; i < teeth; i++) {
      const a = phase + i * p
      // one tooth: root -> leading flank -> tip flat -> trailing flank,
      // then the root arc across the gap to the next tooth
      const pts = [
        [a - p * 0.24, root],
        [a - p * 0.1, tip],
        [a + p * 0.1, tip],
        [a + p * 0.24, root],
      ]
      for (const [ang, rad] of pts) {
        if (i === 0 && ang === pts[0][0]) s.moveTo(Math.cos(ang) * rad, Math.sin(ang) * rad)
        else s.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad)
      }
      for (let k = 1; k <= 3; k++) {
        const ang = a + p * 0.24 + ((p * 0.52) * k) / 3
        s.lineTo(Math.cos(ang) * root, Math.sin(ang) * root)
      }
    }
    s.closePath()
    s.holes.push(new THREE.Path().absarc(0, 0, bore, 0, Math.PI * 2, true))
    const plate = new THREE.ExtrudeGeometry(s, { depth: thickness, bevelEnabled: false })

    const hs = new THREE.Shape()
    hs.absarc(0, 0, bore * 2.1, 0, Math.PI * 2, false)
    hs.holes.push(new THREE.Path().absarc(0, 0, bore, 0, Math.PI * 2, true))
    const hub = new THREE.ExtrudeGeometry(hs, { depth: 0.024, bevelEnabled: false })
    return { plate, hub }
  }, [teeth, module, thickness, phase, bore, pitchR])

  return (
    <group position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh castShadow geometry={plate}>
        <meshStandardMaterial {...steel} />
      </mesh>
      {/* hub ring sits proud of the plate; the bore stays open through both */}
      <mesh castShadow geometry={hub} position={[0, 0, thickness]}>
        <meshStandardMaterial {...brass} />
      </mesh>
    </group>
  )
}

/** A bare PCB set down mid-project; children are its through-hole parts. */
function CircuitBoard({ position, yaw = 0, w = 0.95, d = 0.62, mask = 'green', children }) {
  const tex = pcbTexture(mask)
  const edge = mask === 'blue' ? '#0d2440' : '#0b3a1e'
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.012, 0]}>
        <boxGeometry args={[w, 0.024, d]} />
        <meshStandardMaterial attach="material-0" color={edge} roughness={0.6} />
        <meshStandardMaterial attach="material-1" color={edge} roughness={0.6} />
        <meshStandardMaterial attach="material-2" map={tex} roughness={0.45} />
        <meshStandardMaterial attach="material-3" color={edge} roughness={0.7} />
        <meshStandardMaterial attach="material-4" color={edge} roughness={0.6} />
        <meshStandardMaterial attach="material-5" color={edge} roughness={0.6} />
      </mesh>
      {children}
    </group>
  )
}

/** A loose axial resistor — tan body, colour bands, bent silver leads. */
function LooseResistor({ position, yaw = 0 }) {
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh castShadow position={[0, 0.024, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.024, 0.024, 0.11, 10]} />
        <meshStandardMaterial color="#d2b48c" roughness={0.6} />
      </mesh>
      {[-0.03, 0, 0.032].map((dx, i) => (
        <mesh key={i} position={[dx, 0.024, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.0255, 0.0255, 0.013, 10]} />
          <meshStandardMaterial color={['#7a3b1f', '#1d1d1d', '#b3402a'][i]} roughness={0.6} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.12, 0.007, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.005, 0.005, 0.13, 6]} />
          <meshStandardMaterial color="#b9bec6" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

export default function Clutter() {
  const paper = paperTexture(true)
  return (
    <group name="clutter">
      {/* ---- T-square along the front-left, head hanging left ---- */}
      <group position={[-3.05, 0, 2.7]} rotation={[0, -1.43, 0]}>
        {/* blade rides on top of the head, like the real tool */}
        <mesh castShadow position={[0, 0.046, 0]}>
          <boxGeometry args={[0.09, 0.03, 3.2]} />
          <meshStandardMaterial color="#c7b28a" roughness={0.6} />
        </mesh>
        <mesh castShadow position={[0, 0.021, 1.55]}>
          <boxGeometry args={[1.6, 0.04, 0.14]} />
          <meshStandardMaterial color="#b99a68" roughness={0.6} />
        </mesh>
      </group>

      {/* ---- The drafting compass, set down by the pencils mid-layout ---- */}
      <DraftingCompass position={[0.15, 0, 2.95]} yaw={1.25} />

      {/* ---- Middle-of-desk fillers: calculator pushed aside mid-use, and a
           meshed gear pair between the papers. Both sit in the open pocket
           bounded by the about card, resume, blueprint and project stack —
           re-run window.__deskLayoutAudit() after moving either. ----
           Gear mesh: pitch radii 0.24 + 0.16 = the 0.40 centre distance, and
           the phases clock a wheel tooth into a pinion gap along the centre
           line (world angle -2.7172 rad from the wheel; see Gear docs). */}
      <Calculator position={[-0.62, 0, 1.25]} yaw={-0.38} />
      <Gear position={[-0.12, 0, -0.1]} teeth={12} module={0.04} phase={2.7172} bore={0.05} />
      <Gear
        position={[-0.485, 0, -0.265]}
        teeth={8}
        module={0.04}
        thickness={0.04}
        phase={-0.0317}
        bore={0.035}
      />

      {/* ---- Mechanical pencils + kneaded eraser, front-centre-left ---- */}
      <Pencil position={[-1.8, 0.048, 2.98]} rotation={[Math.PI / 2, 0, 0.9]} color="#7a1f24" />
      <Pencil position={[-1.45, 0.048, 3.2]} rotation={[Math.PI / 2, 0, 1.0]} color="#1f3a5a" />
      <mesh castShadow position={[-0.85, 0.062, 3.25]} rotation={[0, 0.4, 0]}>
        <boxGeometry args={[0.28, 0.12, 0.2]} />
        <meshStandardMaterial color="#4a4a48" roughness={0.95} />
      </mesh>

      {/* ---- Slide rule along the left edge ---- */}
      <group position={[-4.4, 0, 0.9]} rotation={[0, 0.15, 0]}>
        <mesh castShadow position={[0, 0.027, 0]}>
          <boxGeometry args={[0.5, 0.05, 2.6]} />
          <meshStandardMaterial color="#e9e2cf" roughness={0.5} />
        </mesh>
        <mesh castShadow position={[0, 0.057, 0]}>
          <boxGeometry args={[0.2, 0.06, 2.6]} />
          <meshStandardMaterial color="#f2ecdb" roughness={0.4} />
        </mesh>
        {/* cursor slide */}
        <mesh castShadow position={[0, 0.082, 0.5]}>
          <boxGeometry args={[0.56, 0.02, 0.22]} />
          <meshStandardMaterial color="#cfd6db" metalness={0.5} roughness={0.3} transparent opacity={0.85} />
        </mesh>
      </group>

      {/* ---- Vellum roll with a loose tail, rear-right ---- */}
      <group position={[3.55, 0.2, -3.15]}>
        <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.2, 0.2, 2.2, 24]} />
          <meshStandardMaterial color={COLORS.paperBright} roughness={0.85} />
        </mesh>
        {/* the unrolled tail lying flat on the desk in front of the roll */}
        <mesh receiveShadow position={[0, -0.194, 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.7, 0.5]} />
          <meshStandardMaterial
            map={paper}
            color={COLORS.paper}
            roughness={0.9}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
      </group>

      {/* ---- Coffee mug (warmth), mid-right — an open cup so the coffee
           inside actually reads from the high camera angle ---- */}
      <group position={[3.7, 0, 0.4]}>
        {/* tapered wall, open at the top */}
        <mesh castShadow position={[0, 0.33, 0]}>
          <cylinderGeometry args={[0.32, 0.28, 0.66, 24, 1, true]} />
          <meshStandardMaterial color="#7c3b2a" roughness={0.4} side={THREE.DoubleSide} />
        </mesh>
        {/* rolled rim capping the wall edge */}
        <mesh castShadow position={[0, 0.657, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.318, 0.014, 10, 32]} />
          <meshStandardMaterial color="#7c3b2a" roughness={0.4} />
        </mesh>
        {/* the coffee, a hand below the rim; glossy + painted glare so it
            reads as liquid from every parallax angle */}
        <mesh castShadow position={[0, 0.56, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.313, 32]} />
          <meshStandardMaterial map={coffeeTexture()} roughness={0.12} metalness={0.08} />
        </mesh>
        {/* handle */}
        <mesh castShadow position={[0.36, 0.34, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.16, 0.045, 12, 24]} />
          <meshStandardMaterial color="#7c3b2a" roughness={0.4} />
        </mesh>
      </group>

      {/* ---- Drafting triangle, mid-right between blueprint and roll:
           translucent acrylic with an engraved tick scale along both legs
           and the hypotenuse (texture UVs are shape-space, so the repeat
           maps the 1.6-unit legs onto the canvas exactly) ---- */}
      <group position={[3.75, 0.004, -1.35]} rotation={[-Math.PI / 2, 0, 0.9]}>
        <mesh castShadow>
          <extrudeGeometry
            args={[
              (() => {
                const s = new THREE.Shape()
                s.moveTo(0, 0)
                s.lineTo(1.6, 0)
                s.lineTo(0, 1.6)
                s.lineTo(0, 0)
                // hollow centre
                s.holes.push(
                  (() => {
                    const h = new THREE.Path()
                    h.moveTo(0.28, 0.28)
                    h.lineTo(1.0, 0.28)
                    h.lineTo(0.28, 1.0)
                    h.lineTo(0.28, 0.28)
                    return h
                  })()
                )
                return s
              })(),
              { depth: 0.03, bevelEnabled: false },
            ]}
          />
          {/* material 0 = faces (scale markings), material 1 = side walls */}
          <meshStandardMaterial
            attach="material-0"
            map={(() => {
              const t = triangleScaleTexture(1.6)
              t.repeat.set(1 / 1.6, 1 / 1.6)
              return t
            })()}
            transparent
            roughness={0.2}
            metalness={0.1}
          />
          <meshStandardMaterial
            attach="material-1"
            color="#8fb9c9"
            transparent
            opacity={0.55}
            roughness={0.2}
            metalness={0.1}
          />
        </mesh>
      </group>

      {/* ---- Stray electronics, rear-centre: set down mid-project ---- */}
      <CircuitBoard position={[-1.62, 0, -3.22]} yaw={0.35} mask="green">
        {/* MCU + electrolytic cap + header row */}
        <mesh castShadow position={[-0.18, 0.046, 0.05]} rotation={[0, 0.08, 0]}>
          <boxGeometry args={[0.18, 0.045, 0.14]} />
          <meshStandardMaterial color="#1b1b1f" roughness={0.5} />
        </mesh>
        <mesh castShadow position={[0.14, 0.079, -0.14]}>
          <cylinderGeometry args={[0.05, 0.05, 0.11, 14]} />
          <meshStandardMaterial color="#26375c" roughness={0.45} />
        </mesh>
        <mesh position={[0.14, 0.137, -0.14]}>
          <cylinderGeometry args={[0.047, 0.047, 0.006, 14]} />
          <meshStandardMaterial color="#c9ccd2" metalness={0.7} roughness={0.3} />
        </mesh>
        <group position={[0.26, 0, 0.18]} rotation={[0, -0.06, 0]}>
          <mesh castShadow position={[0, 0.049, 0]}>
            <boxGeometry args={[0.28, 0.05, 0.05]} />
            <meshStandardMaterial color="#141416" roughness={0.55} />
          </mesh>
          {[-2, -1, 0, 1, 2].map((i) => (
            <mesh key={i} castShadow position={[i * 0.055, 0.105, 0]}>
              <cylinderGeometry args={[0.007, 0.007, 0.062, 6]} />
              <meshStandardMaterial color="#c9a227" metalness={0.85} roughness={0.3} />
            </mesh>
          ))}
        </group>
      </CircuitBoard>

      <CircuitBoard position={[0.15, 0, -3.28]} yaw={-0.42} w={0.68} d={0.5} mask="blue">
        {/* small IC + crystal can + a ceramic cap */}
        <mesh castShadow position={[-0.1, 0.044, -0.04]} rotation={[0, -0.05, 0]}>
          <boxGeometry args={[0.13, 0.04, 0.1]} />
          <meshStandardMaterial color="#1b1b1f" roughness={0.5} />
        </mesh>
        <mesh castShadow position={[0.12, 0.052, 0.08]} rotation={[0, 0.3, Math.PI / 2]}>
          <cylinderGeometry args={[0.028, 0.028, 0.08, 12]} />
          <meshStandardMaterial {...steel} />
        </mesh>
        <mesh castShadow position={[0.2, 0.05, -0.12]}>
          <sphereGeometry args={[0.026, 10, 10]} />
          <meshStandardMaterial color="#c77b3a" roughness={0.6} />
        </mesh>
      </CircuitBoard>

      <LooseResistor position={[-0.62, 0, -3.06]} yaw={0.7} />

      {/* loose header pin strip, waiting to be soldered */}
      <group position={[0.82, 0, -3.12]} rotation={[0, -0.3, 0]}>
        <mesh castShadow position={[0, 0.026, 0]}>
          <boxGeometry args={[0.3, 0.052, 0.055]} />
          <meshStandardMaterial color="#141416" roughness={0.55} />
        </mesh>
        {[-2, -1, 0, 1, 2].map((i) => (
          <mesh key={i} castShadow position={[i * 0.055, 0.077, 0]}>
            <cylinderGeometry args={[0.007, 0.007, 0.05, 6]} />
            <meshStandardMaterial color="#c9a227" metalness={0.85} roughness={0.3} />
          </mesh>
        ))}
      </group>

      {/* ---- Pushpin dish, front-left corner ---- */}
      <group position={[-3.3, 0, 3.4]}>
        <mesh castShadow position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.3, 0.26, 0.1, 24]} />
          <meshStandardMaterial color="#4a4033" roughness={0.6} metalness={0.2} />
        </mesh>
        {[['#b23b3b', 0.1, 0.05], ['#3b6bb2', -0.08, 0.11], ['#d4a23b', 0.06, -0.09]].map(
          ([c, x, z], i) => (
            <mesh key={i} castShadow position={[x, 0.08, z]}>
              <sphereGeometry args={[0.05, 10, 10]} />
              <meshStandardMaterial color={c} roughness={0.4} />
            </mesh>
          )
        )}
      </group>
    </group>
  )
}
