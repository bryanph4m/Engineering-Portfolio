import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useSpring } from '@react-spring/three'
import * as THREE from 'three'
import { useSceneStore } from '../store/useSceneStore'
import { seg } from '../lib/quality'
import { softShadowTexture } from '../lib/textures'
import { CARD_ASPECT, CARD_MODEL_FRACTION, rocketCardTexture } from '../lib/rocketTextures'
import { research } from '../content/portfolio'
import { consumeTap } from './tapGuard'
import { setSheetExtent, zoomState } from './docZoom'
import { CAMERA, FOCUS_POSE, ROCKET_PREFIX, rocketPartId } from './constants'

/**
 * The desk's tilt/roll-control rocket: a cutaway shop model of the real
 * research vehicle, laid on two cradle saddles along the front-right of the
 * desk with the nose overhanging the edge, and clickable section by section.
 *
 * ## What it replicates, and from what
 *
 * The vehicle is the one the Rocketry blueprint documents, and the airframe
 * breakdown modelled here — nose cone / avionics bay, body tubes, servo fin can
 * with its canards, static fin can with fins and motor — is the project's own
 * CAD section list, transcribed into src/content/portfolio.js under
 * `research.vehicle.parts` (that file carries the provenance note). This is a
 * hand-authored replica in the desk's procedural idiom, not the reference
 * project's GLB: the desk ships zero binary assets on purpose, and a 19-part CAD
 * export would be a multi-megabyte download for a prop that is a few hundred
 * pixels wide at rest.
 *
 * ## The interaction, and why it isn't a new one
 *
 * Clicking a section rides the *existing* focus machinery rather than a second
 * system: it writes `focusedId` in the shared store (as `rocket:<part>`), so the
 * scrim, the click-away, Esc (ui/KeyControls) and the pinch-to-zoom all work on
 * it for free, exactly as they do for a paper document or the photo album. What
 * is different is what focus *shows*. A document flies to the camera because a
 * document is a thing you read; a rocket section bolted into an airframe is not,
 * so the model stays put on the desk and a blueprint detail card floats to the
 * same FOCUS_POSE instead, with the part itself turning slowly in the card's
 * callout circle. Same pose, same springs, same exits — a different subject.
 *
 * ## Idle cost
 *
 * Everything on the desk is flat-coloured: the rocket adds no textures and no
 * per-frame work to the idle scene. The two things that would cost something —
 * the detail card's canvas (src/lib/rocketTextures) and the interior hardware
 * that is invisible inside a closed airframe anyway (servo mounts, board
 * components) — are both deferred to the first click and then kept for the
 * session. So the idle desk pays for the silhouette only.
 *
 * Layout: the whole model lives under a group named "rocket", which
 * DevLayoutAudit measures against the documents and the clutter the same way it
 * measures the clutter itself. Re-run window.__deskLayoutAudit() if you move it.
 */

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

// The vehicle is 1052 mm long and Ø79 mm — a fineness ratio of about 13:1, which
// is the proportion that actually makes it read as *this* rocket rather than a
// generic model. So LEN is the only size decision here and R follows from the
// real ratio; nothing below is free to be "adjusted until it looks right".
//
// LEN is set by what the fixed vantage can see, not by what fits on the slab.
// The camera spans about 6.5 world units of width at this prop's depth, and the
// pencils occupy the left end of the front strip, which leaves a clear visible
// band of a bit under 4 units. A longer airframe genuinely fits the desk — the
// layout audit stays clean out past 4.6 — but the extra length lands off the
// right of the frame, taking the nose cone's cutaway (and with it the avionics
// sled, a click target) somewhere a desktop visitor can never reach, since the
// edge-tap panning is touch-only and collapses to zero range on a wide viewport.
const LEN = 3.8
const R = LEN * (39.5 / 1052) // ≈ 0.143

// Section stations along the tube axis as fractions of LEN, measured from the
// aft face. These are the CAD's own section proportions (see the reference
// assembly's SECTIONS), renormalised so the sections abut instead of
// telescoping. Fractions rather than metres so the whole airframe rescales from
// LEN alone and the sections cannot drift out of proportion with it.
const at = (f) => f * LEN
const STATION = {
  staticCan: { y0: at(0), y1: at(0.0887) },
  lowerBody: { y0: at(0.0887), y1: at(0.4617) },
  servoCan: { y0: at(0.4617), y1: at(0.577) },
  upperBody: { y0: at(0.577), y1: at(0.6829) },
  nose: { y0: at(0.6829), y1: at(1) },
}
const mid = (s) => (s.y0 + s.y1) / 2
const len = (s) => s.y1 - s.y0

// Fin and canard spans, as multiples of the body radius. FIN_TIP is the single
// number that sets the model's lateral footprint on the desk — it is what the
// layout audit is really checking when it clears the projects stack behind and
// the desk's front rim in front, so treat it as a layout constant, not a styling
// one. The static fins are much larger than the canards, which is the real
// vehicle's arrangement: big fixed surfaces aft for passive stability, small
// control surfaces forward.
const FIN_TIP = R * 2.2 // ≈ 0.31 from the axis
const CANARD_TIP = R * 1.56 // ≈ 0.22

// Fin clocking, in the model's own frame. The parent group lays the rocket on
// its side (see PLACEMENT), which maps a fin at local angle θ to the world
// direction (0, −cos θ, −sin θ). So θ = π puts one fin straight up and the other
// two 120° either side of it, splayed down as the natural "feet" — which is both
// how a finished rocket is set down on a cradle and the clocking with the
// smallest desk footprint available to three fins.
const FIN_CLOCK = [Math.PI, Math.PI + (2 * Math.PI) / 3, Math.PI - (2 * Math.PI) / 3]
// The four canards sit on the diagonals, so none of them points straight down
// into the desk and their lateral reach stays inside the static fins'.
const CANARD_CLOCK = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]

// Where the model sits.
//
//  y — lifts the tube far enough that the two lower fins (FIN_TIP × cos 60°
//      below the axis) clear the desk with room to spare.
//  z — the open front strip. It is a compromise between two hard limits and
//      there is very little room between them: any further back and the fins
//      foul the contact envelope's forward corner (which is why that document
//      moved right and back — see documents/registry), any further forward and
//      the model slides out of the bottom of the frame, since the fixed vantage
//      only sees the desk down to about z = 3.4 before the HUD's hint band.
//  x — the aft face, tucked just clear of the kneaded eraser at the left end of
//      the front strip. With LEN chosen above, the whole airframe then lands
//      inside the visible band. (The drafting compass moved off this line to
//      make room — see desk/Clutter.)
const PLACEMENT = { x: -0.6, y: 0.28, z: 3.25 }

// The two cradle saddles: a splayed pair of blocks per station forming a V the
// tube sits down into. Everything is derived rather than eyeballed, because a
// tilted box's real vertical reach is not half its height — getting that wrong
// is exactly what buries a prop in the desk, which the layout audit flags.
const CRADLE = { tilt: 0.42, h: 0.23, thick: 0.026, wide: 0.07, spread: 0.085 }
// Vertical half-extent of one tilted arm, and the centre height that puts its
// lowest corner a whisker above the desk rather than through it.
const CRADLE_HALF =
  (CRADLE.h / 2) * Math.cos(CRADLE.tilt) + (CRADLE.thick / 2) * Math.sin(CRADLE.tilt)
const CRADLE_Y = CRADLE_HALF + 0.002
// Saddle stations, as fractions up the airframe — so they stay under the same
// two body tubes however the model is slid or rescaled. Never under a fin can,
// so no arm has to pass through a fin.
const CRADLE_AT = [at(0.25), at(0.663)]

// The nose's cutaway window: the arc of the cone that is missing so the avionics
// sled inside is both visible and clickable.
//
// Three numbers, each fixing something that looked wrong:
//  ARC    — wide enough to see and click the sled through, narrow enough that
//           the cone still reads as a cone rather than as an open trough.
//  CENTRE — the lathe phi the window is centred on. Straight up: the vantage
//           looks down on the desk at about 40°, so an upward slot is seen well
//           into while the cone's left and right flanks stay whole, which is
//           what reads as a cutaway. Aiming it square at the camera instead
//           (up-and-forward) filled the opening with the flat far wall of the
//           interior and lost the cone's surface altogether.
//  TIP    — the fraction of the cone's length the window stops at. Cutting all
//           the way to the apex left the nose visibly forked; a real cutaway
//           model takes a panel out of the side and leaves the tip whole.
const WINDOW_ARC = 1.7
const WINDOW_CENTRE = -Math.PI / 2
const WINDOW_TIP = 0.6
// How far the sled is lifted off the airframe's centreline toward the window.
// The airframe is slender and the bay is deep, so a sled sitting on the axis is
// simply not visible past the near lip of the slot from a 40° vantage, however
// wide the slot is — the boards have to ride high in the bay to be seen, and to
// be hit by a click, at all.
const SLED_LIFT = 0.022

/** Tangent-ogive radius at height `h` above the cone's base. */
function ogiveProfile(coneLen, baseR, steps) {
  const rho = (baseR * baseR + coneLen * coneLen) / (2 * baseR)
  const pts = []
  for (let i = 0; i <= steps; i++) {
    const h = (i / steps) * coneLen
    const r = Math.sqrt(rho * rho - (coneLen - h) * (coneLen - h)) - (rho - baseR)
    pts.push(new THREE.Vector2(Math.max(0.0015, r), h - coneLen / 2))
  }
  return pts
}

/**
 * A clipped-delta lifting surface, authored in the XY plane with +X radial out
 * from the body surface and +Y along the tube axis, then extruded thin. Used for
 * both the static fins and the canards — same construction, different span and
 * chord, which is exactly how the real ones differ.
 */
function surfaceGeometry({ tip, rootChord, tipChord, sweep, thick }) {
  const s = new THREE.Shape()
  s.moveTo(R * 0.97, rootChord / 2) // leading root, at the skin
  s.lineTo(tip, tipChord / 2 - sweep) // leading tip, swept back
  s.lineTo(tip, -tipChord / 2 - sweep) // trailing tip
  s.lineTo(R * 0.97, -rootChord / 2) // trailing root
  s.closePath()
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false })
  g.translate(0, 0, -thick / 2) // centre the thickness on the clocking plane
  return g
}

/* ------------------------------------------------------------------ */
/* Materials                                                           */
/* ------------------------------------------------------------------ */

// Colours follow the real vehicle: bright aluminium tubes, dark printed nose and
// fin cans, machined surfaces on the fins and canards, one orange marking band
// on the lower nose.
//
// Every value here is lifted well above the real object's albedo, and that is a
// lighting decision rather than an artistic one. The model lies along the front
// of the desk, which is the one region the lamp's pool does not reach, and the
// scene carries no environment map — so a metallic surface has nothing to
// reflect and a genuinely black printed part (the real nose and fin cans are
// black ASA) renders as a flat silhouette down here, losing the form entirely.
// Charcoal at low metalness keeps the shading that tells you it is a cone.
const HULL = { color: '#ccd1d9', metalness: 0.42, roughness: 0.36 }
const PRINT = { color: '#585f6a', metalness: 0.1, roughness: 0.62 }
const PANEL = { color: '#4a5058', metalness: 0.3, roughness: 0.5 }
const MACHINED = { color: '#b4bac2', metalness: 0.5, roughness: 0.32 }
const ORANGE = { color: '#cf5c2d', metalness: 0.15, roughness: 0.45 }
const BOARD = { color: '#1d2836', metalness: 0.1, roughness: 0.55 }
const GRAPHITE = { color: '#2e333c', metalness: 0.25, roughness: 0.55 }
const BRASS = { color: '#bf9c45', metalness: 0.55, roughness: 0.35 }

// Hover readout. The desk's documents answer a hover with a lift; a section
// bolted into an airframe cannot lift, so it answers with the same idea in the
// only dimension it has — it eases a few millimetres proud of the stack and
// warms up — and HOVER_OUT is small for the same reason HOVER_LIFT is: it has to
// read as "this is a thing" without reading as "this is broken off".
const HOVER_OUT = 0.055
// Near-white rather than amber, and very gently. Emissive adds light on top of
// the shading instead of scaling it, so the right intensity is set by how much
// light the part is ALREADY getting — and along the desk's front edge that is
// very little. Measured against the lit result here, the diffuse term is around
// 0.03; anything near 0.15 is therefore several times the actual shading, which
// repaints the section as a flat warm shape and loses the very form the hover is
// meant to point at. At 0.05 it roughly doubles the brightness and warms it,
// which reads as a section catching the light. The lift does the rest.
const HOT_EMISSIVE = '#ffdcb0'

/** Spreads a base material plus the hover warmth, so every part glows alike. */
const mat = (base, hot) => ({
  ...base,
  emissive: HOT_EMISSIVE,
  emissiveIntensity: hot ? 0.05 : 0,
})

/* ------------------------------------------------------------------ */
/* The sections                                                        */
/* ------------------------------------------------------------------ */

/**
 * Static fin can: three fixed airfoil fins, the motor mount protruding aft with
 * its nozzle, and the lower bearing mount ring forward. Authored centred on its
 * own station so the detail view can render the identical component standalone.
 */
function StaticFinCan({ hot }) {
  const L = len(STATION.staticCan)
  const fin = useMemo(
    () =>
      surfaceGeometry({
        tip: FIN_TIP,
        rootChord: L * 0.94,
        tipChord: L * 0.42,
        sweep: L * 0.2,
        thick: 0.013,
      }),
    [L]
  )
  return (
    <group>
      <mesh castShadow rotation={[0, 0, 0]}>
        <cylinderGeometry args={[R * 1.01, R * 1.01, L, seg(20)]} />
        <meshStandardMaterial {...mat(PRINT, hot)} />
      </mesh>
      {/* lower bearing mount — the collar the canard shafts run down to */}
      <mesh castShadow position={[0, L / 2, 0]}>
        <cylinderGeometry args={[R * 1.05, R * 1.05, 0.035, seg(20)]} />
        <meshStandardMaterial {...mat(MACHINED, hot)} />
      </mesh>
      {FIN_CLOCK.map((a) => (
        <mesh key={a} castShadow geometry={fin} rotation={[0, a, 0]}>
          <meshStandardMaterial {...mat(MACHINED, hot)} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* motor mount + nozzle, protruding aft */}
      <mesh castShadow position={[0, -L / 2 - 0.055, 0]}>
        <cylinderGeometry args={[R * 0.6, R * 0.6, 0.12, seg(16)]} />
        <meshStandardMaterial {...mat(GRAPHITE, hot)} />
      </mesh>
      <mesh position={[0, -L / 2 - 0.15, 0]}>
        <cylinderGeometry args={[R * 0.52, R * 0.34, 0.08, seg(16), 1, true]} />
        <meshStandardMaterial {...mat(GRAPHITE, hot)} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

/** One servo mount + horn, the in-house part inside the can. Interior hardware:
 *  only ever built once the section has been inspected (see `detail`). */
function ServoMount({ hot }) {
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.055, 0.075, 0.045]} />
        <meshStandardMaterial {...mat(PANEL, hot)} />
      </mesh>
      {/* output spline + horn */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.011, 0.011, 0.03, seg(10)]} />
        <meshStandardMaterial {...mat(MACHINED, hot)} />
      </mesh>
      <mesh position={[0, 0.066, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.006, 0.05, 0.012]} />
        <meshStandardMaterial {...mat(BRASS, hot)} />
      </mesh>
    </group>
  )
}

/**
 * Servo fin can: the canard control section. Under inspection the printed shell
 * goes x-ray — the same trick the reference viewer uses — and the servo mounts
 * and bearing collars inside become visible, which is the only way to show the
 * part of this section that actually does the work.
 */
function ServoFinCan({ hot, detail = false }) {
  const L = len(STATION.servoCan)
  const canard = useMemo(
    () =>
      surfaceGeometry({
        tip: CANARD_TIP,
        rootChord: 0.2,
        tipChord: 0.12,
        sweep: 0.03,
        thick: 0.011,
      }),
    []
  )
  const shaftY = -L * 0.1 // canard shaft centreline within the can
  return (
    <group>
      <mesh castShadow>
        <cylinderGeometry args={[R * 1.02, R * 1.02, L, seg(20)]} />
        <meshStandardMaterial
          {...mat(PRINT, hot)}
          transparent={detail}
          opacity={detail ? 0.22 : 1}
          side={detail ? THREE.DoubleSide : THREE.FrontSide}
          depthWrite={!detail}
        />
      </mesh>
      {CANARD_CLOCK.map((a) => (
        <group key={a} rotation={[0, a, 0]} position={[0, shaftY, 0]}>
          <mesh castShadow geometry={canard}>
            <meshStandardMaterial {...mat(MACHINED, hot)} side={THREE.DoubleSide} />
          </mesh>
          {/* shaft bearing collar where the canard passes through the skin */}
          <mesh position={[R * 0.99, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.026, 0.026, 0.02, seg(12)]} />
            <meshStandardMaterial {...mat(BRASS, hot)} />
          </mesh>
          {/* the servo that drives it, inboard on the shaft axis */}
          {detail && (
            <group position={[R * 0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <ServoMount hot={hot} />
            </group>
          )}
        </group>
      ))}
    </group>
  )
}

/** The two body tubes, authored about the midpoint of the pair with the servo
 *  can's length as the gap between them — so the standalone detail view reads as
 *  the upper and lower airframe pulled apart, which is what they are. */
function BodyTubes({ hot }) {
  const lower = STATION.lowerBody
  const upper = STATION.upperBody
  const centre = (mid(lower) + mid(upper)) / 2
  return (
    <group>
      <mesh castShadow position={[0, mid(lower) - centre, 0]}>
        <cylinderGeometry args={[R, R, len(lower), seg(20)]} />
        <meshStandardMaterial {...mat(HULL, hot)} />
      </mesh>
      <mesh castShadow position={[0, mid(upper) - centre, 0]}>
        <cylinderGeometry args={[R, R, len(upper), seg(20)]} />
        <meshStandardMaterial {...mat(HULL, hot)} />
      </mesh>
      {/* coupler bands at the joints, a hair proud of the skin so they read as
          rings rather than fighting the tube surface underneath */}
      {[
        [lower.y0 + 0.03, lower],
        [lower.y1 - 0.03, lower],
        [upper.y1 - 0.03, upper],
      ].map(([y]) => (
        <mesh key={y} position={[0, y - centre, 0]}>
          <cylinderGeometry args={[R * 1.03, R * 1.03, 0.03, seg(20)]} />
          <meshStandardMaterial {...mat(PANEL, hot)} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Nose cone — on this vehicle the nose *is* the avionics bay, so the model is
 * cut away: the lathe sweeps everything except WINDOW_ARC, leaving a
 * longitudinal slot facing the camera that the sled inside shows through. Two
 * sided, because a cutaway's whole point is that you see the inside wall.
 */
function NoseCone({ hot }) {
  const L = len(STATION.nose)
  // Split the ogive into the panelled part (where the bay is, and where the
  // window is taken out) and the whole tip above it. Two lathes off one profile,
  // so the surfaces are guaranteed to meet exactly at the split station.
  const { bay, tip } = useMemo(() => {
    const steps = seg(18)
    const pts = ogiveProfile(L, R, steps)
    const k = Math.max(1, Math.round(steps * WINDOW_TIP))
    return { bay: pts.slice(0, k + 1), tip: pts.slice(k) }
  }, [L])
  return (
    <group>
      <mesh castShadow>
        <latheGeometry
          args={[bay, seg(28), WINDOW_CENTRE + WINDOW_ARC / 2, Math.PI * 2 - WINDOW_ARC]}
        />
        <meshStandardMaterial {...mat(PRINT, hot)} side={THREE.DoubleSide} />
      </mesh>
      <mesh castShadow>
        <latheGeometry args={[tip, seg(28)]} />
        <meshStandardMaterial {...mat(PRINT, hot)} />
      </mesh>
      {/* shoulder that telescopes into the upper body tube */}
      <mesh position={[0, -L / 2 + 0.02, 0]}>
        <cylinderGeometry args={[R * 0.97, R * 0.97, 0.05, seg(20)]} />
        <meshStandardMaterial {...mat(PANEL, hot)} />
      </mesh>
      {/* orange marking band on the lower cone, sized to the cone's real radius
          at its own station so it hugs the skin instead of floating */}
      <mesh position={[0, -L / 2 + 0.22, 0]}>
        <cylinderGeometry args={[R * 0.9, R * 0.95, 0.07, seg(20), 1, true]} />
        <meshStandardMaterial
          {...mat(ORANGE, hot)}
          side={THREE.DoubleSide}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
    </group>
  )
}

// The sled's board stack, in sled-local metres: deck runs along ±Z, boards sit
// on the deck's +Y face. The deck is sized off the airframe rather than typed in
// so it cannot silently outgrow the cone it has to fit inside — the real bay is
// Ø71.6 mm in a Ø79 mm airframe, i.e. very nearly the full bore.
const SLED = { len: LEN * 0.22, width: R * 1.3, deck: 0.012 }
const BOARDS = [
  { z: -0.28, w: 0.1, h: 0.014, d: 0.15, color: '#1c4d2e' }, // Raspberry Pi 5
  { z: -0.08, w: 0.055, h: 0.01, d: 0.1, color: '#16202b' }, // ESP32
  { z: 0.07, w: 0.05, h: 0.009, d: 0.075, color: '#16202b' }, // PCA9685
  { z: 0.19, w: 0.055, h: 0.009, d: 0.07, color: '#2a1a3d' }, // GPS / LoRa
]

/**
 * The avionics sled: the deck and its board stack, the part of the vehicle that
 * makes it *active* rather than just aerodynamic. Its fine hardware (chips,
 * headers, the antenna whip) only builds once the sled has been inspected —
 * none of it resolves to more than a pixel or two at rest.
 */
function AvionicsSled({ hot, detail = false }) {
  return (
    <group>
      {/* deck plate */}
      <mesh castShadow>
        <boxGeometry args={[SLED.width, SLED.deck, SLED.len]} />
        <meshStandardMaterial {...mat(PANEL, hot)} />
      </mesh>
      {/* the two threaded rods the deck is built around */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * SLED.width) / 2.4, -0.014, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.005, 0.005, SLED.len, seg(8)]} />
          <meshStandardMaterial {...mat(MACHINED, hot)} />
        </mesh>
      ))}
      {BOARDS.map((b) => (
        <group key={b.z} position={[0, SLED.deck / 2 + b.h / 2, b.z]}>
          <mesh castShadow>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial {...mat({ ...BOARD, color: b.color }, hot)} />
          </mesh>
          {detail && (
            <>
              {/* the one big IC and a header row — only worth building once
                  someone is actually looking at the boards up close */}
              <mesh position={[0, b.h / 2 + 0.005, 0]}>
                <boxGeometry args={[b.w * 0.42, 0.008, b.d * 0.3]} />
                <meshStandardMaterial {...mat(GRAPHITE, hot)} />
              </mesh>
              <mesh position={[b.w * 0.32, b.h / 2 + 0.004, b.d * 0.25]}>
                <boxGeometry args={[b.w * 0.16, 0.007, b.d * 0.4]} />
                <meshStandardMaterial {...mat(BRASS, hot)} />
              </mesh>
            </>
          )}
        </group>
      ))}
      {/* Interior fill for the bay. A cutaway model whose cutaway is a black
          hole shows nothing, and the desk lamp does not reach the front edge —
          so the bay carries its own small light, exactly the way a display
          cutaway is lit. Tightly bounded by `distance` so it stays inside the
          cone and never spills onto the desk. */}
      <pointLight position={[0, 0.1, -0.05]} intensity={0.55} distance={0.62} color="#fff0d8" />

      {/* battery pack, aft of the boards */}
      <mesh castShadow position={[0, SLED.deck / 2 + 0.022, 0.33]}>
        <boxGeometry args={[0.075, 0.04, 0.11]} />
        <meshStandardMaterial {...mat({ ...GRAPHITE, color: '#3a2a1c' }, hot)} />
      </mesh>
      {/* LoRa antenna whip, trailing forward out of the stack */}
      {detail && (
        <mesh position={[0.04, SLED.deck / 2 + 0.02, -0.4]} rotation={[Math.PI / 2, 0, 0.25]}>
          <cylinderGeometry args={[0.0035, 0.0035, 0.16, seg(6)]} />
          <meshStandardMaterial {...mat(MACHINED, hot)} />
        </mesh>
      )}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Part table                                                          */
/* ------------------------------------------------------------------ */

// Each entry ties one content record (research.vehicle.parts, by id) to the
// component that draws it, where that component sits on the airframe, and how
// big it is — `span` is only ever used to size the part inside the detail card's
// callout circle, so a part is never authored twice at two scales.
//
// The sled is deliberately a sibling of the nose rather than a child: it is its
// own click target, and nesting it would mean every click on a board also had to
// be stopped from bubbling into the nose cone's handler.
const SECTIONS = [
  { id: 'nose', Part: NoseCone, y: mid(STATION.nose), span: len(STATION.nose) },
  {
    id: 'avionics',
    Part: AvionicsSled,
    // Seated so the board stack falls inside the cutaway rather than under the
    // solid tip above it — the sled is longer than the window, so where it sits
    // decides which boards are actually visible (and clickable) through it.
    y: STATION.nose.y0 + len(STATION.nose) * 0.27,
    span: SLED.len,
    // Laid along the tube axis with the boards facing out through the cutaway.
    // Outermost first: the inner rotation swings the deck's length onto the tube
    // axis, the outer one turns its board face around to the window. That outer
    // angle is WINDOW_CENTRE + π and nothing else — the inner rotation leaves the
    // board normal at local −Z, and a Y-rotation of ψ carries it to
    // (−sin ψ, 0, −cos ψ), which equals the window normal (sin φ, 0, cos φ)
    // exactly when ψ = φ + π. Worth writing down: the two happen to coincide at
    // φ = −π/4, so a formula that is wrong everywhere else still looks right if
    // that is the only angle it was ever tried at.
    tilt: [
      [0, WINDOW_CENTRE + Math.PI, 0],
      [-Math.PI / 2, 0, 0],
    ],
    // …and lifted along that same window normal so the stack rides high in the
    // bay (see SLED_LIFT).
    offset: [Math.sin(WINDOW_CENTRE) * SLED_LIFT, 0, Math.cos(WINDOW_CENTRE) * SLED_LIFT],
  },
  { id: 'servo-can', Part: ServoFinCan, y: mid(STATION.servoCan), span: len(STATION.servoCan) },
  {
    id: 'airframe',
    Part: BodyTubes,
    y: (mid(STATION.lowerBody) + mid(STATION.upperBody)) / 2,
    span: STATION.upperBody.y1 - STATION.lowerBody.y0,
  },
  { id: 'static-can', Part: StaticFinCan, y: mid(STATION.staticCan), span: FIN_TIP * 2 },
]

const partContent = (id) => research.vehicle.parts.find((p) => p.id === id)

/* ------------------------------------------------------------------ */
/* One clickable section                                               */
/* ------------------------------------------------------------------ */

/**
 * Wraps a section in the desk's standard affordance: hover warms it and eases it
 * a few millimetres radially proud of the stack, a click focuses it. The radial
 * direction is the section's own local −X, which the parent group's lay-down
 * rotation maps to world up — so a hovered section rises off the airframe rather
 * than sliding along it, which is the same read as a document's hover lift.
 */
function Section({ section, detail }) {
  const groupRef = useRef()
  const focusedId = useSceneStore((s) => s.focusedId)
  const hoveredId = useSceneStore((s) => s.hoveredId)
  const focus = useSceneStore((s) => s.focus)
  const setHovered = useSceneStore((s) => s.setHovered)

  const id = rocketPartId(section.id)
  const anyFocused = focusedId != null
  const isHovered = hoveredId === id && !anyFocused
  const isFocused = focusedId === id

  const [{ out }, api] = useSpring(() => ({
    out: 0,
    config: { tension: 300, friction: 22 },
  }))

  useEffect(() => {
    api.start({ out: isHovered || isFocused ? 1 : 0 })
  }, [isHovered, isFocused, api])

  useFrame(() => {
    if (groupRef.current) groupRef.current.position.x = -HOVER_OUT * out.get()
  })

  const onOver = (e) => {
    if (anyFocused) return
    e.stopPropagation()
    setHovered(id)
    document.body.style.cursor = 'pointer'
  }
  const onOut = (e) => {
    e.stopPropagation()
    if (hoveredId === id) setHovered(null)
    document.body.style.cursor = 'auto'
  }
  const onClick = (e) => {
    if (anyFocused) return
    e.stopPropagation()
    document.body.style.cursor = 'auto'
    // Claim the tap so the edge-tap panning stands down: the model lies along
    // the desk's right half and sits squarely under a pan zone on a phone.
    consumeTap()
    focus(id)
  }

  const { Part } = section
  const hot = isHovered || isFocused
  // reduceRight, so tilt[0] ends up the OUTERMOST rotation — the list reads
  // outside-in, the way the comment on `tilt` describes it.
  const inner = (section.tilt ?? []).reduceRight(
    (child, rot) => <group rotation={rot}>{child}</group>,
    <Part hot={hot} detail={detail} />
  )

  return (
    <group
      position={[0, section.y, 0]}
      onPointerOver={onOver}
      onPointerOut={onOut}
      onClick={onClick}
    >
      {/* the section's own resting offset, and — separately, so the two can
          never fight over one transform — the hover displacement */}
      <group position={section.offset ?? [0, 0, 0]}>
        <group ref={groupRef}>{inner}</group>
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* The focused detail card                                             */
/* ------------------------------------------------------------------ */

const FOCUS_DIST = new THREE.Vector3(...FOCUS_POSE.position).distanceTo(
  new THREE.Vector3(...CAMERA.position)
)
const TAN_HALF_FOV = Math.tan((CAMERA.fov * Math.PI) / 360)

// Authored card size in world metres; the aspect is the texture's, so the art
// can never be stretched by a number chosen here.
const CARD_H = 2.0
const CARD_W = CARD_H * CARD_ASPECT
// How far off the sheet the part floats. Enough to read as lifted off the paper
// rather than printed on it; see `near` in DetailCard for what it costs.
const MODEL_LIFT = 0.42

const _ax = new THREE.Vector3()
const _ay = new THREE.Vector3()
const _v = new THREE.Vector3()

/**
 * The blueprint detail card for whichever section is focused, floated to the
 * documents' own FOCUS_POSE with the part turning slowly in its callout circle.
 * Mounted only while a section is focused — which is what keeps the card's canvas
 * (and the sections' interior hardware) off the idle desk entirely.
 */
function DetailCard({ section, index, detail }) {
  const groupRef = useRef()
  const spinRef = useRef()
  const matRef = useRef()

  const content = partContent(section.id)
  const tex = useMemo(
    () => rocketCardTexture(content, index, SECTIONS.length),
    [content, index]
  )

  const { width: vw, height: vh } = useThree((s) => s.size)
  const visH = 2 * TAN_HALF_FOV * FOCUS_DIST
  const visW = visH * (vw / vh)
  // Same framing contract as a document: fill to the focus height, but never
  // wider than the viewport can show at this distance, so the card cannot run off
  // the edges of a portrait phone.
  const scale = Math.min(FOCUS_POSE.targetHeight / CARD_H, (visW * 0.94) / CARD_W)

  useEffect(() => {
    setSheetExtent((CARD_W * scale) / visW, (CARD_H * scale) / visH)
  }, [scale, visW, visH])

  const quat = useMemo(
    () =>
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(...FOCUS_POSE.rotation)
      ),
    []
  )
  const pos = useMemo(() => new THREE.Vector3(...FOCUS_POSE.position), [])

  const [{ open }, api] = useSpring(() => ({
    open: 0,
    config: { tension: 170, friction: 24 },
  }))
  useEffect(() => {
    api.start({ open: 1 })
  }, [api])

  useFrame((state, dt) => {
    const g = groupRef.current
    if (!g) return
    const t = open.get()
    // Pinch-to-zoom, on the same terms as a document (desk/docZoom): flat 1/0/0
    // without a second finger, so nothing changes on a mouse.
    const z = zoomState()
    g.quaternion.copy(quat)
    _v.copy(pos)
    if (z.x !== 0 || z.y !== 0) {
      _ax.set(1, 0, 0).applyQuaternion(quat)
      _ay.set(0, 1, 0).applyQuaternion(quat)
      _v.addScaledVector(_ax, z.x * visW)
      _v.addScaledVector(_ay, z.y * visH)
    }
    g.position.copy(_v)
    g.scale.setScalar(scale * z.scale * THREE.MathUtils.lerp(0.92, 1, t))
    if (matRef.current) matRef.current.opacity = t
    // A slow turn, not a spin: fast enough to show the part is three-dimensional,
    // slow enough to read the card beside it.
    if (spinRef.current) spinRef.current.rotation.y += dt * 0.45
  })

  const { Part } = section
  // Sized to the callout circle painted on the card, and offset onto its centre.
  //
  // Both numbers carry a perspective correction, and it is not optional. The
  // part floats MODEL_LIFT in front of the sheet, so it is nearer the camera
  // than the circle it is supposed to sit in — which magnifies it and throws it
  // further out from the view axis. Since the circle is off-centre, that reads
  // as the part sliding off the left of its own callout (and, for the longest
  // parts, off the card entirely). Scaling both the offset and the size by how
  // much nearer it is puts it back exactly where the ink says it should be, on
  // any viewport.
  const near = (FOCUS_DIST - MODEL_LIFT * scale) / FOCUS_DIST
  const modelScale = ((CARD_W * CARD_MODEL_FRACTION * 0.56) / section.span) * near
  const modelX = (-CARD_W / 2 + (CARD_W * CARD_MODEL_FRACTION) / 2) * near

  return (
    <group ref={groupRef} onClick={(e) => e.stopPropagation()}>
      <mesh>
        <planeGeometry args={[CARD_W, CARD_H]} />
        <meshBasicMaterial ref={matRef} map={tex} transparent opacity={0} toneMapped={false} />
      </mesh>
      {/* the part itself, floating off the sheet inside its detail circle */}
      <group position={[modelX, 0, MODEL_LIFT]} scale={modelScale}>
        <group ref={spinRef}>
          <group rotation={[0, 0, 1.05]}>
            <Part hot={false} detail={detail} />
          </group>
        </group>
      </group>
      {/* a small key light so the floating part reads against the dimmed desk */}
      <pointLight position={[modelX + 0.6, 0.7, 1.4]} intensity={2.4} distance={4} color="#ffe9c9" />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Root                                                                */
/* ------------------------------------------------------------------ */

// The model's desk footprint, for the contact shadow under it. Deliberately the
// ON-DESK span rather than the airframe's: the nose overhangs the right rim, and
// a blob sized to the whole rocket would hang off the edge as a dark plane
// floating in the void. Width is the static fins' span, the widest thing on it.
const SHADOW_LEN = LEN * 0.82
const SHADOW_CENTRE_X = PLACEMENT.x + LEN * 0.4
const SHADOW_SIZE = [SHADOW_LEN, FIN_TIP * 2.4]
const SHADOW_OPACITY = 0.26

export default function RocketModel() {
  const focusedId = useSceneStore((s) => s.focusedId)
  const focusedPart = focusedId?.startsWith(ROCKET_PREFIX)
    ? focusedId.slice(ROCKET_PREFIX.length)
    : null

  // Interior hardware and the detail card's canvas are built on the first
  // inspection and kept for the session — setting a part back down must not
  // throw away work the visitor can ask for again with one click.
  const [detail, setDetail] = useState(false)
  useEffect(() => {
    if (focusedPart) setDetail(true)
  }, [focusedPart])

  const index = SECTIONS.findIndex((s) => s.id === focusedPart)
  const section = index >= 0 ? SECTIONS[index] : null

  return (
    <>
      {/* Grounded contact shadow at the model's footprint, the same soft blob the
          documents and the photo frame use rather than a shadow-map caster — the
          cradle feet are the only real contact, and a hard shadow under a
          cantilevered rocket reads worse than a soft one. */}
      <group position={[SHADOW_CENTRE_X, 0.0012, PLACEMENT.z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={SHADOW_SIZE} />
          <meshBasicMaterial
            map={softShadowTexture()}
            transparent
            opacity={SHADOW_OPACITY}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
      </group>

      <group name="rocket">
        {/* The cradle saddles. Dark stained wood, like a shop stand. */}
        {CRADLE_AT.map((at) => (
          <group key={at} position={[PLACEMENT.x + at, 0, PLACEMENT.z]}>
            {[-1, 1].map((s) => (
              <mesh
                key={s}
                castShadow
                position={[0, CRADLE_Y, s * CRADLE.spread]}
                rotation={[s * CRADLE.tilt, 0, 0]}
              >
                <boxGeometry args={[CRADLE.wide, CRADLE.h, CRADLE.thick]} />
                <meshStandardMaterial color="#3a2c1c" roughness={0.72} metalness={0.05} />
              </mesh>
            ))}
          </group>
        ))}

        {/* The airframe, laid on its side: the model is authored nose-up along
            local +Y (the way a rocket is drawn), and this one rotation lays it
            down along world +X with the nose overhanging the desk's right rim. */}
        <group
          position={[PLACEMENT.x, PLACEMENT.y, PLACEMENT.z]}
          rotation={[0, 0, -Math.PI / 2]}
        >
          {SECTIONS.map((s) => (
            <Section key={s.id} section={s} detail={detail} />
          ))}
        </group>
      </group>

      {section && <DetailCard section={section} index={index} detail={detail} />}
    </>
  )
}
