import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useSpring } from '@react-spring/three'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { useSceneStore } from '../store/useSceneStore'
import { seg } from '../lib/quality'
import { softShadowTexture } from '../lib/textures'
import {
  PAGE_ASPECT,
  PAGE_CORNER,
  paintRocketPage,
  sledBoardTexture,
} from '../lib/rocketTextures'
import { research } from '../content/portfolio'
import { consumeTap } from './tapGuard'
import { setSheetExtent, zoomState } from './docZoom'
import { CAMERA, FOCUS_POSE, HOVER_LIFT, ROCKET_ID } from './constants'

/**
 * The desk's tilt/roll-control rocket: a cutaway shop model of the real
 * research vehicle, laid on two cradle saddles along the front-right of the
 * desk with the nose overhanging the edge, and picked up to read like a paper.
 *
 * This file is in two halves. Everything down to the part table is the model —
 * geometry, materials, and the sections that make up the airframe. Everything
 * after it is the interaction, and the root component at the bottom carries the
 * header that matters if you are changing how the rocket behaves (including a
 * hard rule about lights that is there for a measured reason).
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
 * ## Idle cost
 *
 * The airframe is flat-coloured and adds no per-frame work to the idle scene.
 * It carries exactly one texture cost at rest: the four avionics boards are
 * painted (three shared 256×160 rasters, ~490 KB desktop / ~120 KB mobile — see
 * lib/rocketTextures sledBoardTexture). The sled is the one part of this prop a
 * visitor is invited to look INTO, so it is held to the desk's circuit-board
 * standard rather than the airframe's; painting that detail is what keeps it
 * from being bought in triangles instead. For scale, the whole board set is
 * about a quarter of the single component page canvas.
 *
 * That cost is now paid slightly early, and knowingly. The nose is solid at rest
 * and only sections open in the hand (see NoseCone), so nothing on the sled is
 * on screen until the first pickup — but the boards keep their maps from the
 * start regardless, because a material whose `map` goes from null to a texture
 * changes its shader defines and recompiles, and trading ~490 KB of upload for a
 * mid-session stall is the wrong way round on this file's own terms. If the
 * board rasters ever grow enough to matter, defer the whole SLED, not the maps.
 *
 * Everything else still defers. The component page's canvas
 * (src/lib/rocketTextures) and the fine board hardware (chips, headers, the
 * antenna whip) both wait for the first pickup; and the servo can's interior is
 * built only when the shell is actually see-through, which on the desk is never
 * (see ServoFinCan). Small repeated hardware on the sled is merged into single
 * geometries rather than mapped to a mesh each — the sled's added detail is
 * ~600 triangles in 4 extra draw calls, less than one of the nose cone's two
 * lathes.
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

// The nose's cutaway window: the arc of the cone that is taken out so the
// avionics sled inside can be seen. Applied ONLY while the rocket is held —
// the resting model is a whole cone (see NoseCone).
//
// Three numbers, each fixing something that looked wrong:
//  ARC    — wide enough to see the sled through, narrow enough that the cone
//           still reads as a cone rather than as an open trough.
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
// wide the slot is — the boards have to ride high in the bay to be seen at all.
const SLED_LIFT = 0.022

/** Ogive radius of curvature for a cone of this length on this base. */
const ogiveRho = (coneLen, baseR) => (baseR * baseR + coneLen * coneLen) / (2 * baseR)

/**
 * Tangent-ogive radius at height `h` above the cone's BASE — so r(0) = baseR at
 * the shoulder and r(coneLen) ≈ 0 at the tip.
 *
 * The direction is the whole point and it is easy to get backwards: measuring
 * `h` from the tip instead inverts the cone, and because the airframe is
 * authored nose-up along +Y (see PLACEMENT) an inverted cone does not read as a
 * cone pointing the other way — it lathes a funnel that flares out ahead of the
 * body tube, and every feature keyed to the skin (the shoulder, the marking
 * band) is left sizing itself against a radius that is no longer there.
 */
const ogiveRadius = (coneLen, baseR, h) => {
  const rho = ogiveRho(coneLen, baseR)
  return Math.sqrt(rho * rho - h * h) - (rho - baseR)
}

/**
 * The cone's lathe profile, base first. Ascending in y for two reasons: it puts
 * the tip forward where the nose goes, and LatheGeometry winds its faces from
 * the point order, so a descending sweep comes out inside-out.
 */
function ogiveProfile(coneLen, baseR, steps) {
  const pts = []
  for (let i = 0; i <= steps; i++) {
    const h = (i / steps) * coneLen
    const r = ogiveRadius(coneLen, baseR, h)
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

// Colours follow the real vehicle: muted blue-gray body tubes, black printed
// nose and fin cans, black airfoils on the fins and canards, one orange marking
// band on the lower nose.
//
// The black parts are near-black rather than #000, and that is a lighting
// decision rather than a hedge on the colour. The model lies along the front of
// the desk, which is the one region the lamp's pool does not reach, and the
// scene carries no environment map — so a metallic surface has nothing to
// reflect and a true-black part renders as a flat silhouette down here, losing
// the form entirely. These values sit a few points off black: they read as the
// black ASA the real parts are printed in, and still keep the shading gradient
// that tells you the nose is a cone and not a triangle. Anything darker starts
// dropping that gradient, so check the model against the desk before lowering
// them — this is the floor, not a starting point.
//
// Metalness is kept low on every black part for the same reason: with no
// environment to reflect, metalness only subtracts diffuse, so a "shinier" black
// here is just a darker one.
const HULL = { color: '#7e8a99', metalness: 0.26, roughness: 0.48 }
const PRINT = { color: '#191c21', metalness: 0.08, roughness: 0.64 }
// The airfoils are black too, but a harder, slightly glossier finish than the
// printed cans — enough separation that a fin does not merge into the can it
// grows out of when the two are seen edge-on.
const AIRFOIL = { color: '#1e2229', metalness: 0.2, roughness: 0.46 }
const PANEL = { color: '#4a5058', metalness: 0.3, roughness: 0.5 }
const MACHINED = { color: '#b4bac2', metalness: 0.5, roughness: 0.32 }
const ORANGE = { color: '#cf5c2d', metalness: 0.15, roughness: 0.45 }
const BOARD = { color: '#1d2836', metalness: 0.1, roughness: 0.55 }
const GRAPHITE = { color: '#2e333c', metalness: 0.25, roughness: 0.55 }
const BRASS = { color: '#bf9c45', metalness: 0.55, roughness: 0.35 }
// Sled hardware: nylon standoffs (matte, non-metallic — they have to read as
// plastic posts against the machined rails) and the wiring loom.
const NYLON = { color: '#8d94a0', metalness: 0.05, roughness: 0.78 }
const HARNESS = { color: '#2a2f38', metalness: 0.08, roughness: 0.72 }

// Hover readout. The rocket is one object now, so it answers a hover exactly
// the way a document does — the whole model rises by HOVER_LIFT and warms. It
// used to be a per-section displacement instead (each section easing radially
// proud of the airframe), which existed only because each section was its own
// click target; nothing is picked up section by section any more.
//
// Near-white rather than amber, and very gently. Emissive adds light on top of
// the shading instead of scaling it, so the right intensity is set by how much
// light the part is ALREADY getting — and along the desk's front edge that is
// very little. Measured against the lit result here, the diffuse term is around
// 0.03; anything near 0.15 is therefore several times the actual shading, which
// repaints the section as a flat warm shape and loses the very form the hover is
// meant to point at. At 0.05 it roughly doubles the brightness and warms it,
// which reads as a section catching the light. The lift does the rest.
const HOT_EMISSIVE = '#ffdcb0'
const HOVER_GLOW = 0.05
// The extra on the one section the open page is describing. Emissive is the
// right tool for THIS job — a local accent on a model that is already properly
// lit — and the wrong tool for lighting the model itself; see READING_KEY.
const ACTIVE_GLOW = 0.06

// The albedo the two constants above were tuned against — the charcoal the nose
// and fin cans used to be printed in. See `glowScale`.
const GLOW_REF_LUMA = 0.37

/**
 * How much of the glow a given base colour should actually take.
 *
 * This exists because the airframe's parts no longer share a brightness. The
 * numbers above were measured against one mid-charcoal, and they describe a
 * RELATIONSHIP — "roughly double what the part is already getting" — not an
 * absolute. Emissive, though, adds an absolute amount of light. So the moment
 * the nose and fin cans went black, a constant 0.06 stopped being a doubling
 * and became several times their albedo, which repainted the whole nose as a
 * flat cream cut-out in the focused view: the exact failure the comment above
 * describes, arrived at by changing the paint instead of the number.
 *
 * Scaling by the part's own luminance restores the relationship, so the glow
 * means the same thing on every part and the constants stay meaningful when a
 * colour changes again. Rec. 709 weights on the sRGB values — not linearised,
 * deliberately: strict linear proportionality is *too* faithful here and leaves
 * a doubled near-black still reading as near-black, losing the active-section
 * cue on four of the five sections. This sits between the two and was picked by
 * looking at the focused model, which is the only place it shows.
 */
const glowScale = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / GLOW_REF_LUMA
}

/**
 * Spreads a base material plus a warmth, so every part glows alike.
 *
 * `glow` is a number, not a flag, because three things add into it — the hover
 * warmth, the lift the whole model gets while it is held up to be read, and the
 * extra on the one section the open page is describing — and they have to
 * combine on ONE channel. `emissiveIntensity` is a plain uniform, so animating
 * it is free and, unlike adding a light, invisible to the shader program cache.
 * That is the entire reason the focused rocket is lit this way and not with a
 * key light (see the root component's header).
 *
 * The one thing it does NOT do is take `glow` at face value — see `glowScale`.
 */
const mat = (base, glow = 0) => ({
  ...base,
  emissive: HOT_EMISSIVE,
  emissiveIntensity: glow * glowScale(base.color),
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
          <meshStandardMaterial {...mat(AIRFOIL, hot)} side={THREE.DoubleSide} />
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

/**
 * Servo fin can: the canard control section.
 *
 * The shell is opaque, and there is no way to make it otherwise. It briefly had
 * an x-ray mode, inherited from the reference viewer, that turned the printed
 * shell see-through so the servo mounts inside could be read. Both that mode
 * and the servo mounts it existed to reveal are gone, because the thing that
 * used them — a floating per-part detail card — is gone. Two notes for anyone
 * tempted to bring it back:
 *
 *  - It was wired to a session-sticky flag, so one click anywhere turned this
 *    section transparent on the RESTING desk and left it that way. At 0.22
 *    opacity with depthWrite off it did not read as glass, it vanished, leaving
 *    the canards and collars floating in a gap in the airframe.
 *  - Toggling `transparent` on a material changes its shader defines and forces
 *    a recompile, which is the class of stall this prop was rebuilt to avoid.
 *
 * The servo hardware is described on this section's component page instead,
 * which is where the rest of what you cannot see from outside is described too.
 */
function ServoFinCan({ hot }) {
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
      {/* Same PRINT stock, roughness and side treatment as the static can's
          shell — the two are the same printed part family on the real vehicle
          and are modelled from one material so they cannot drift apart. */}
      <mesh castShadow>
        <cylinderGeometry args={[R * 1.02, R * 1.02, L, seg(20)]} />
        <meshStandardMaterial {...mat(PRINT, hot)} side={THREE.FrontSide} />
      </mesh>
      {CANARD_CLOCK.map((a) => (
        <group key={a} rotation={[0, a, 0]} position={[0, shaftY, 0]}>
          <mesh castShadow geometry={canard}>
            <meshStandardMaterial {...mat(AIRFOIL, hot)} side={THREE.DoubleSide} />
          </mesh>
          {/* shaft bearing collar where the canard passes through the skin */}
          <mesh position={[R * 0.99, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.026, 0.026, 0.02, seg(12)]} />
            <meshStandardMaterial {...mat(BRASS, hot)} />
          </mesh>
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
 * Nose cone — on this vehicle the nose *is* the avionics bay, so the model can
 * be cut away: the lathe sweeps everything except WINDOW_ARC, leaving a
 * longitudinal slot the sled inside shows through. Two sided, because a
 * cutaway's whole point is that you see the inside wall.
 *
 * ## The cutaway is a FOCUSED-VIEW feature, not a resting one
 *
 * At rest on the desk the cone is swept whole and the nose is solid — no slot,
 * no view into the bay, nothing see-through. The slot only opens once the rocket
 * has been picked up, which is where the avionics bay is meant to be read.
 *
 * That is a deliberate reversal of how this started. The slot used to be open
 * always, and a cutaway in a prop the size of a thumbnail does not read as "a
 * shop model sectioned to show its guts" — it reads as a nose cone that has gone
 * transparent, or as a hole in the airframe, because at that scale the eye gets
 * the boards showing through before it gets the cut edge that explains them. A
 * resting model on a stand should look like a finished vehicle; the visitor
 * reaches the bay by clicking into the component view, which is a page that can
 * actually name what it is showing. So: do not open this at rest again.
 *
 * The sled itself stays mounted either way, occluded rather than removed. It
 * carries the bay lamp, and this file's hard rule is that no light is ever
 * mounted or unmounted mid-session (see the root component's header). The lamp's
 * `distance` keeps it inside the cone, so a closed nose leaks nothing.
 */
// The orange marking band, as height above the cone's base and band height.
const BAND_AT = 0.185
const BAND_H = 0.07

function NoseCone({ hot, focused = false }) {
  const L = len(STATION.nose)
  // …a hair proud of the skin (×1.006) so it reads as a band painted on the
  // cone rather than z-fighting the surface it sits on.
  const bandAftR = ogiveRadius(L, R, BAND_AT) * 1.006
  const bandFwdR = ogiveRadius(L, R, BAND_AT + BAND_H) * 1.006
  // Split the ogive into the panelled part (where the bay is, and where the
  // window is taken out) and the whole tip above it. Two lathes off one profile,
  // so the surfaces are guaranteed to meet exactly at the split station.
  const { bay, tip } = useMemo(() => {
    const steps = seg(18)
    const pts = ogiveProfile(L, R, steps)
    const k = Math.max(1, Math.round(steps * WINDOW_TIP))
    return { bay: pts.slice(0, k + 1), tip: pts.slice(k) }
  }, [L])
  // The skin's sweep: a full turn while the model rests, the window's arc once
  // it has been picked up. One pair of numbers, shared by the cone and by the
  // marking band painted on it, so the two can never disagree about where the
  // skin stops. `side` is NOT switched with them — DoubleSide stays on through
  // both states, because toggling it is the kind of material change that costs a
  // shader recompile, and a closed cone renders correctly double-sided anyway.
  const sweep = focused
    ? [WINDOW_CENTRE + WINDOW_ARC / 2, Math.PI * 2 - WINDOW_ARC]
    : [0, Math.PI * 2]
  return (
    <group>
      <mesh castShadow>
        <latheGeometry args={[bay, seg(28), ...sweep]} />
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
      {/* Orange marking band on the lower cone. Its two radii are READ OFF the
          ogive at the band's own two stations rather than typed in as fractions
          of R: the cone's radius varies over the band's height, so any pair of
          constants is wrong at one edge or both, and on a taper that steep
          "wrong" means a ring hanging in space around nothing. Derived, it
          cannot come loose from the skin however the cone is rescaled. */}
      {/* …and swept over the same arc the cone is (`sweep` above), so the window
          takes the band out with the skin it is painted on. A full ring across an
          OPEN cutaway would bridge it with an unsupported arc of paint hanging
          in the opening — the same "floating ring" read as sizing it wrong,
          arrived at from the other direction. CylinderGeometry's theta and
          LatheGeometry's phi share a convention, so the cone's own two numbers
          drop straight in, and the closed state's full turn does too. */}
      <mesh position={[0, -L / 2 + BAND_AT + BAND_H / 2, 0]}>
        <cylinderGeometry args={[bandFwdR, bandAftR, BAND_H, seg(20), 1, true, ...sweep]} />
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
// Where the sled is seated, as a fraction of the cone's length above its base,
// and how long its deck is. Shared with the SECTIONS table below so the seat
// used to size the deck and the seat it is actually mounted at cannot drift.
const SLED_SEAT = 0.27
const SLED_HALF_LEN = LEN * 0.11
// The deck's forward corners are the widest part of the sled AND they sit at the
// narrowest station it reaches, so they are what sizes the deck. Sizing it off
// the bay's bore at the cone's base instead — the number it is tempting to use,
// since that is the diameter the real bay is quoted at — is wrong by the whole
// taper: the corners end up hanging through the cone's underside well before the
// cutaway ends, as a thin blade of deck sticking out of an otherwise closed
// nose. Derived from the ogive at the deck's own forward station (with a little
// clearance inside the skin, and the corner's SLED_LIFT offset taken off in
// quadrature), it cannot poke through however the airframe is rescaled.
const SLED_FWD_H = len(STATION.nose) * SLED_SEAT + SLED_HALF_LEN
const SLED_HALF_W = Math.sqrt(
  Math.max(0, (ogiveRadius(len(STATION.nose), R, SLED_FWD_H) * 0.94) ** 2 - SLED_LIFT ** 2)
)
const SLED = { len: SLED_HALF_LEN * 2, width: SLED_HALF_W * 2, deck: 0.012 }
// Height of the nylon standoffs every board is bolted up on. Small, but it is
// what turns "boxes resting on a plate" into "boards mounted on a sled" — the
// shadow gap under a board is most of what reads as hardware.
const STANDOFF_H = 0.009
const BOARDS = [
  { z: -0.28, w: 0.1, h: 0.014, d: 0.15, color: '#1c4d2e' }, // Raspberry Pi 5
  { z: -0.08, w: 0.055, h: 0.01, d: 0.1, color: '#16202b' }, // ESP32
  { z: 0.07, w: 0.05, h: 0.009, d: 0.075, color: '#16202b' }, // PCA9685
  { z: 0.19, w: 0.055, h: 0.009, d: 0.07, color: '#2a1a3d' }, // GPS / LoRa
]
/** Board deck height — the underside of a board, above the sled's centre. */
const boardY = (b) => SLED.deck / 2 + STANDOFF_H + b.h / 2

/**
 * Every standoff on the sled as ONE geometry.
 *
 * Sixteen posts is sixteen draw calls if they are sixteen meshes, which is a
 * silly price for a prop the size of a thumbnail — and this prop has already
 * cost a performance pass once. Merged, the whole set is one call and one
 * material, and the cost of the detail is the ~380 triangles it actually is.
 * The same argument applies to any small repeated hardware added here later:
 * merge it, don't map it to meshes.
 */
function useStandoffs() {
  return useMemo(() => {
    const parts = []
    for (const b of BOARDS) {
      const y = SLED.deck / 2 + STANDOFF_H / 2
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const g = new THREE.CylinderGeometry(0.0035, 0.0035, STANDOFF_H, seg(6))
          g.translate(sx * b.w * 0.36, y, b.z + sz * b.d * 0.36)
          parts.push(g)
        }
      }
    }
    const merged = mergeGeometries(parts)
    for (const g of parts) g.dispose()
    return merged
  }, [])
}

/** The wiring harness, likewise merged: a loom running the length of the deck
 *  with a drop to each board. Tubes rather than boxes so it reads as cable. */
function useHarness() {
  return useMemo(() => {
    const parts = []
    const runY = SLED.deck / 2 + 0.004
    for (const sx of [-1, 1]) {
      const g = new THREE.CylinderGeometry(0.0032, 0.0032, SLED.len * 0.82, seg(6))
      g.rotateX(Math.PI / 2)
      g.translate(sx * SLED.width * 0.42, runY, -0.02)
      parts.push(g)
    }
    for (const b of BOARDS) {
      const g = new THREE.CylinderGeometry(0.0026, 0.0026, SLED.width * 0.34, seg(6))
      g.rotateZ(Math.PI / 2)
      g.translate(-SLED.width * 0.26, runY + 0.002, b.z + b.d * 0.3)
      parts.push(g)
    }
    const merged = mergeGeometries(parts)
    for (const g of parts) g.dispose()
    return merged
  }, [])
}

/**
 * The avionics sled: the deck and its board stack, the part of the vehicle that
 * makes it *active* rather than just aerodynamic.
 *
 * ## Where its detail comes from
 *
 * This is the one prop on the rocket a visitor is invited to look INTO — it sits
 * in the nose's cutaway with a light on it — so it is held to the same standard
 * as the desk's loose circuit boards rather than to the airframe's flat-colour
 * idiom. The detail is split by what each kind actually buys:
 *
 *  - **Texture** carries everything flat: traces, pads, silkscreen, part
 *    outlines, board labels (lib/rocketTextures sledBoardTexture). Three small
 *    rasters shared across the four boards, and no normal maps — see that
 *    function's header for the budget and why relief isn't worth a second
 *    canvas at this prop's on-screen size.
 *  - **Geometry** carries only what breaks the silhouette and would look wrong
 *    painted on: the standoffs the boards ride up on, the rails and end plates
 *    that make the deck a frame, the connector stack, the harness. All of it is
 *    low-segment, and the repeated hardware is merged (see useStandoffs).
 *
 * The genuinely fine parts — individual ICs, header pins, the antenna whip —
 * stay deferred to `detail`, because none of them resolve to more than a pixel
 * or two until the sled is actually inspected.
 */
function AvionicsSled({ hot, detail = false, focused = false }) {
  const standoffs = useStandoffs()
  const harness = useHarness()
  const railY = -SLED.deck / 2 - 0.004

  return (
    <group>
      {/* deck plate */}
      <mesh castShadow>
        <boxGeometry args={[SLED.width, SLED.deck, SLED.len]} />
        <meshStandardMaterial {...mat(PANEL, hot)} />
      </mesh>
      {/* the two threaded rods the deck is built around */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * SLED.width) / 2.4, railY, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.005, 0.005, SLED.len, seg(8)]} />
          <meshStandardMaterial {...mat(MACHINED, hot)} />
        </mesh>
      ))}
      {/* end plates the rods run between — they close the frame, so the sled
          reads as an assembly with ends rather than a plate that stops */}
      {[-1, 1].map((s) => (
        <mesh key={s} castShadow position={[0, railY + 0.004, (s * SLED.len) / 2]}>
          <boxGeometry args={[SLED.width * 0.92, 0.03, 0.008]} />
          <meshStandardMaterial {...mat(MACHINED, hot)} />
        </mesh>
      ))}
      <mesh castShadow geometry={standoffs}>
        <meshStandardMaterial {...mat(NYLON, hot)} />
      </mesh>
      <mesh geometry={harness}>
        <meshStandardMaterial {...mat(HARNESS, hot)} />
      </mesh>
      {BOARDS.map((b) => (
        <group key={b.z} position={[0, boardY(b), b.z]}>
          {/* Printed face on top, bare laminate on the edges — the same
              treatment (and face order) as desk/Clutter's CircuitBoard. */}
          <mesh castShadow>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial attach="material-0" {...mat({ ...BOARD, color: b.color }, hot)} />
            <meshStandardMaterial attach="material-1" {...mat({ ...BOARD, color: b.color }, hot)} />
            <meshStandardMaterial
              attach="material-2"
              {...mat(BOARD, hot)}
              color="#ffffff"
              map={sledBoardTexture(b.color)}
            />
            <meshStandardMaterial attach="material-3" {...mat({ ...BOARD, color: b.color }, hot)} />
            <meshStandardMaterial attach="material-4" {...mat({ ...BOARD, color: b.color }, hot)} />
            <meshStandardMaterial attach="material-5" {...mat({ ...BOARD, color: b.color }, hot)} />
          </mesh>
          {/* The board's connector stack, on its outboard edge the way a USB or
              pin block sits. Dark housing rather than MACHINED: bright metal at
              this size reads as a blob of highlight sitting on the board, not as
              a connector, and the bay's own light is warm enough to pick a matte
              housing out on its own. */}
          <mesh castShadow position={[b.w * 0.34, b.h / 2 + 0.005, -b.d * 0.22]}>
            <boxGeometry args={[b.w * 0.28, 0.01, b.d * 0.32]} />
            <meshStandardMaterial {...mat(GRAPHITE, hot)} />
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
          cutaway is lit.

          Turned down to nothing while the rocket rests, because the cutaway it
          exists to light is closed then (see NoseCone) and a point light is not
          stopped by the cone the way sight is: it went on washing a warm pool
          onto the desk under a nose that no longer had an opening to explain it.
          Intensity, not mounting — the light stays in the scene at zero so the
          count never changes, which is this file's hard rule (see the root
          component's header). `distance` still bounds it either way. */}
      <pointLight
        position={[0, 0.1, -0.05]}
        intensity={focused ? 0.55 : 0}
        distance={0.62}
        color="#fff0d8"
      />

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
// component that draws it and where that component sits on the airframe. The
// ids are the join: a part exists in the content file and is drawn here, and
// nothing else needs to agree about it.
//
// The sled is a sibling of the nose rather than a child so its rotation and
// SLED_LIFT offset stay independent of the cone's — it is seated INTO the bay,
// not attached to it, which is also true of the real thing.
const SECTIONS = [
  { id: 'nose', Part: NoseCone, y: mid(STATION.nose), roll: true },
  {
    id: 'avionics',
    Part: AvionicsSled,
    // Rolls with the nose (see FOCUS_ROLL). It has to: the sled is aimed at the
    // window, so anything that turns the window has to turn the sled with it or
    // the boards end up facing the inside of the skin.
    roll: true,
    // Seated so the board stack falls inside the cutaway rather than under the
    // solid tip above it — the sled is longer than the window, so where it sits
    // decides which boards are actually visible through it.
    y: STATION.nose.y0 + len(STATION.nose) * SLED_SEAT,
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
  { id: 'servo-can', Part: ServoFinCan, y: mid(STATION.servoCan) },
  {
    id: 'airframe',
    Part: BodyTubes,
    y: (mid(STATION.lowerBody) + mid(STATION.upperBody)) / 2,
  },
  { id: 'static-can', Part: StaticFinCan, y: mid(STATION.staticCan) },
]

/**
 * How far the nose and its sled roll about the tube axis on the way up, so the
 * cutaway ends up facing the reader.
 *
 * ## Why any roll is needed
 *
 * The window is cut at a FIXED angle on the cone (WINDOW_CENTRE), aimed to be
 * seen from the desk's vantage — where it points straight up and the camera
 * looks down on it at about 40°. The focused pose then tilts the model by
 * FOCUS_POSE.rotation, which is a rotation about world X… and the laid-down
 * rocket's own long axis is world X. So that tilt is not a tilt at all from the
 * airframe's point of view: it is a 47° ROLL about its own axis, and it carries
 * the window from "up" round to "up and away", pointing behind the model. The
 * slot opens and shows nothing. That is worth knowing before touching either
 * pose: the two rotations are not independent, and the focus pose silently
 * spends its whole rotation budget rolling this window out of view.
 *
 * ## How the number is arrived at
 *
 * Derived, not dialled in. Take the direction from the focused model to the
 * camera, carry it back through the focused orientation into the model's own
 * frame, and read off the lathe phi that points there — that is the window angle
 * which would face the reader dead-on, and the roll is the difference between it
 * and where the window actually is. Nothing here needs revisiting if either pose
 * moves; it re-derives.
 *
 * LEAN is then the one taste number, and it is the same judgement the window's
 * own CENTRE records: dead-on fills the opening with the flat far wall of the
 * bay and loses the cone's surface, so the window is left leaning back from
 * square by this much. The reader looks INTO the bay at a slight angle, which is
 * what reads as a sectioned model rather than a trough.
 */
const FOCUS_LEAN = 0.42
const FOCUS_ROLL = (() => {
  const lay = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -Math.PI / 2))
  const plane = new THREE.Quaternion().setFromEuler(new THREE.Euler(...FOCUS_POSE.rotation))
  const focusQ = plane.multiply(lay)
  const toCam = new THREE.Vector3(...CAMERA.position)
    .sub(new THREE.Vector3(...FOCUS_POSE.position))
    .normalize()
    .applyQuaternion(focusQ.invert()) // …back into the model's own frame
  // LatheGeometry lays its profile at (r sin φ, y, r cos φ), so this is the phi
  // of the direction the reader is sitting in.
  const facing = Math.atan2(toCam.x, toCam.z)
  return facing - WINDOW_CENTRE - FOCUS_LEAN
})()

/**
 * The airframe: every section at its station, authored centred on the model's
 * own length so one transform can carry the whole rocket between the desk and
 * the hand (see the root's restPos/focusPos).
 *
 * `activeId` is the section the open page is describing, which warms up so the
 * text and the metal agree about which part is being read. It rides the exact
 * same `hot` channel as the hover warmth rather than a second mechanism, so a
 * section can only ever be lit one way and `emissiveIntensity` stays a plain
 * uniform — no material variant, and so no shader recompile, on a page turn.
 *
 * `focused` opens the nose's cutaway (see NoseCone) and lights the bay. It is
 * geometry and a light intensity, not a material — nothing here recompiles when
 * it flips.
 *
 * `rollRefs` collects the groups that turn with the pickup — the nose and the
 * sled inside it (see FOCUS_ROLL). They are handed up to the root rather than
 * animated here on purpose: the roll is written straight to the object every
 * frame from the same spring the rest of the motion reads, so this component
 * re-renders on a hover or a page turn and never on a frame.
 */
function Airframe({ glow, activeId, detail, focused, rollRefs }) {
  return (
    <group position={[0, -LEN / 2, 0]}>
      {SECTIONS.map((s) => {
        const lit = glow + (activeId === s.id ? ACTIVE_GLOW : 0)
        // reduceRight, so tilt[0] ends up the OUTERMOST rotation — the list reads
        // outside-in, the way the comment on `tilt` describes it.
        const inner = (s.tilt ?? []).reduceRight(
          (child, rot) => <group rotation={rot}>{child}</group>,
          <s.Part hot={lit} detail={detail} focused={focused} />
        )
        // The roll sits OUTSIDE the section's offset, so a section mounted off
        // the centreline (the sled, lifted toward the window by SLED_LIFT) swings
        // around the tube axis with the window instead of pivoting in place.
        return (
          <group key={s.id} position={[0, s.y, 0]}>
            <group ref={s.roll ? (el) => (rollRefs.current[s.id] = el) : undefined}>
              <group position={s.offset ?? [0, 0, 0]}>{inner}</group>
            </group>
          </group>
        )
      })}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Root                                                                */
/* ------------------------------------------------------------------ */

// Camera-to-sheet distance at the focused pose, and half the vertical fov
// pre-tanned. Both fixed, because both poses are. Same derivation as
// desk/Document — the rocket is framed by the identical contract.
const FOCUS_DIST = new THREE.Vector3(...FOCUS_POSE.position).distanceTo(
  new THREE.Vector3(...CAMERA.position)
)
const TAN_HALF_FOV = Math.tan((CAMERA.fov * Math.PI) / 360)

// The focused composition, in its own units: the rocket laid across the top,
// its component page below. `rocketW` is the unit everything else is measured
// against, so the layout scales as one piece.
//
// The page is WIDER than the rocket on purpose. The rocket is 13:1 and the page
// is a spec sheet, so sizing the page to the rocket's width made a tall slab of
// mostly-empty blue that dominated the composition and pushed the model up into
// the top edge of the frame. Letting the page run wider lets it be short, which
// is what keeps the rocket the subject and the text its caption.
const LAYOUT = {
  rocketW: 3.15,
  pageW: 3.3,
  // Vertical room the airframe needs: the static fins are the widest thing on
  // it, so this is their span in composition units plus a little air.
  rocketBand: ((FIN_TIP * 2) / LEN) * 3.15 + 0.08,
  gap: 0.04,
  // …and then the model is dropped this much toward its page. The band above is
  // the honest geometric extent, but the fins splay BELOW the tube (FIN_CLOCK
  // puts one up and two down), so the band's geometric centre sits visibly
  // higher than the airframe's visual centre — which reads as the rocket
  // drifting away from the text it belongs to. This is that correction, and it
  // is a separate number so the band stays a measurement rather than a taste.
  drop: 0.1,
}
LAYOUT.pageH = LAYOUT.pageW / PAGE_ASPECT
LAYOUT.totalH = LAYOUT.rocketBand + LAYOUT.gap + LAYOUT.pageH
// Centres of the two bands, measured from the composition's own centre.
LAYOUT.rocketY = LAYOUT.totalH / 2 - LAYOUT.rocketBand / 2 - LAYOUT.drop
LAYOUT.pageY = -LAYOUT.totalH / 2 + LAYOUT.pageH / 2

/**
 * The reading key light.
 *
 * ## Why there is a light here at all, given the rule
 *
 * The rule is that the light COUNT never changes, not that there are no lights.
 * This one is mounted for the life of the scene at `intensity: 0` and animated
 * up with the pickup — intensity is a uniform, so it is free to animate and
 * invisible to the shader program cache. The count stays at 7 whether the
 * rocket is on the desk or in the hand, which is the whole property that makes
 * the interaction cheap. Mounting this same light on focus instead would
 * reintroduce exactly the stall this rewrite removed.
 *
 * ## Why not emissive instead
 *
 * Tried first, and it does not work — worth writing down so it is not tried
 * again. The focus pose sits out over the middle of the desk where the lamp's
 * pool does not reach, so the diffuse term on the airframe there is very small.
 * Emissive ADDS on top of shading rather than scaling it, so any value large
 * enough to make the model read is also several times its diffuse, and the
 * airframe stops being lit metal and becomes a flat cream cut-out. There is no
 * value that lights it without flattening it: dark enough to need the help is
 * exactly dark enough for the help to dominate.
 *
 * ## The cost, stated plainly
 *
 * A seventh light is a few percent of extra fragment work on every lit material
 * in the scene, always — this desk is fill-rate bound, so that is not nothing.
 * It buys the removal of a scene-wide shader recompile per interaction. A small
 * constant cost in place of a large intermittent one is the trade, and it is
 * the right way round.
 */
const READING_KEY = {
  // In front of and above the focused composition, on the focus plane's own
  // axes so it stays put if the pose is retuned. Derived, not typed in.
  position: (() => {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...FOCUS_POSE.rotation))
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(q)
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q)
    return new THREE.Vector3(...FOCUS_POSE.position)
      .addScaledVector(normal, 1.6)
      .addScaledVector(up, 0.6)
  })(),
  intensity: 3.6,
  // Cut off just short of the desk surface below it, so a light that exists to
  // read the held rocket cannot quietly brighten the dimmed desk behind it.
  distance: 4.5,
}

// The page fades in over the back half of the pickup: text that is legible
// while the model is still travelling reads as a card that teleported in, and
// text that swims into focus at the end reads as the rocket arriving with its
// notes. Same idea as the document contact shadow's SHADOW_FADE_END, other end.
const PAGE_FADE_START = 0.55

// The model's desk footprint, for the contact shadow under it. Deliberately the
// ON-DESK span rather than the airframe's: the nose overhangs the right rim, and
// a blob sized to the whole rocket would hang off the edge as a dark plane
// floating in the void. Width is the static fins' span, the widest thing on it.
const SHADOW_LEN = LEN * 0.82
const SHADOW_CENTRE_X = PLACEMENT.x + LEN * 0.4
const SHADOW_SIZE = [SHADOW_LEN, FIN_TIP * 2.4]
// Opacity flat on the desk, and the extra it gains at full hover lift — the
// same two-number treatment every document's contact shadow gets.
const SHADOW_REST = 0.26
const SHADOW_HOVER = 0.12
const SHADOW_FADE_END = 0.45

const _v = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _centre = new THREE.Vector3()
const _ax = new THREE.Vector3()
const _ay = new THREE.Vector3()

/**
 * The desk's tilt/roll-control rocket, picked up and read like a document.
 *
 * ## The interaction, and why it is the documents' one
 *
 * Clicking the rocket writes `focusedId = ROCKET_ID` and nothing else. Every
 * behaviour a visitor then has — the dimming scrim, click-away, Esc, arrow
 * keys, a swipe, pinch-to-zoom — is the machinery the papers and the photo
 * album already run on, reached by being one focusable thing with a page count
 * (documents/registry pageCountOf). The rocket flies to the documents' own
 * FOCUS_POSE on the documents' own spring, with its component page under it,
 * and `pageIndex` steps through research.vehicle.parts. The section the open
 * page describes warms up, so the reader can see which part they are reading
 * about without the model needing to be clickable at all.
 *
 * ## What this replaced, and what that cost
 *
 * Each section used to be its own click target opening its own floating 3D
 * detail card. It was removed for two reasons, one of them measured.
 *
 * The measured one: that card mounted a `<pointLight>`. three.js bakes the
 * light COUNT into every material's program cache key, so a light appearing
 * mid-session invalidates every material in the scene at once. Focusing a part
 * took the desk from 6 lights to 7 and from 18 compiled shader programs to 27 —
 * a scene-wide recompile on the click, repeated for each part a visitor tried,
 * on the main thread, and worst exactly where it is least affordable (a phone).
 * That is what the lag was. It is why the rule below is a rule.
 *
 * ## The rule this file now keeps
 *
 * **Nothing here mounts or unmounts a light, ever.** The bay lamp inside the
 * avionics sled is mounted for the life of the scene; the focused rocket is lit
 * by the desk's existing lights plus an emissive lift on its own materials
 * (`emissiveIntensity` is a uniform — free to animate, and invisible to the
 * program cache). If a future change wants the focused rocket brighter, raise
 * the emissive or brighten an EXISTING light. Do not add one.
 *
 * ## Idle cost
 *
 * The resting desk pays for the airframe and nothing else: no page canvas, no
 * fine board hardware, no per-section state, one hover subscription and one
 * useFrame for the whole prop. The page canvas (lib/rocketTextures — a single
 * sheet, repainted per page rather than one raster per part) and the sled's
 * fine hardware are both built on the first pickup and kept for the session.
 */
export default function RocketModel() {
  const groupRef = useRef()
  const keyRef = useRef()
  const pageRef = useRef()
  const pageMatRef = useRef()
  const shadowMeshRef = useRef()
  const shadowMatRef = useRef()
  // The nose and its sled, which roll toward the reader with the pickup. Keyed
  // by section id and filled by Airframe; see FOCUS_ROLL.
  const rollRefs = useRef({})

  const focusedId = useSceneStore((s) => s.focusedId)
  const hoveredId = useSceneStore((s) => s.hoveredId)
  const pageIndex = useSceneStore((s) => s.pageIndex)
  const focus = useSceneStore((s) => s.focus)
  const setHovered = useSceneStore((s) => s.setHovered)
  const nextPage = useSceneStore((s) => s.nextPage)
  const prevPage = useSceneStore((s) => s.prevPage)

  const isFocused = focusedId === ROCKET_ID
  const anyFocused = focusedId != null
  const isHovered = hoveredId === ROCKET_ID && !anyFocused

  const parts = research.vehicle.parts
  const page = Math.min(pageIndex, parts.length - 1)

  // Everything the focused view needs — the page canvas and the sled's fine
  // hardware — is built on the first pickup and kept for the session. Nothing
  // below runs on a desk nobody has touched.
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (isFocused) setArmed(true)
  }, [isFocused])

  // Repaint the shared page whenever the part being read changes. Idempotent in
  // rocketTextures, so the hover and resize re-renders that also reach here
  // cost a comparison rather than a canvas.
  const pageTex = armed ? paintRocketPage(parts[page], page, parts.length) : null

  const { width: vw, height: vh } = useThree((s) => s.size)
  const visH = 2 * TAN_HALF_FOV * FOCUS_DIST
  const visW = visH * (vw / vh)
  // Same framing contract as a document: fill to the focus height, but never
  // wider than the viewport can show at this distance, so the composition
  // cannot run off the edges of a portrait phone.
  // Width is clamped against the PAGE, the widest thing in the composition.
  const compScale = Math.min(
    FOCUS_POSE.targetHeight / LAYOUT.totalH,
    (visW * 0.94) / LAYOUT.pageW
  )

  // Tell docZoom how much of the view the composition fills, so a pinch's pan
  // clamps to its edges — the same publish a focused document makes.
  useEffect(() => {
    if (!isFocused) return
    setSheetExtent((LAYOUT.pageW * compScale) / visW, (LAYOUT.totalH * compScale) / visH)
  }, [isFocused, compScale, visW, visH])

  // The two orientations. Resting is the lay-down alone: the model is authored
  // nose-up along +Y (the way a rocket is drawn) and this rotation lays it along
  // world +X on the cradles. Focused is that same lay-down carried into the
  // documents' focus plane, so the rocket arrives broadside-on and level.
  const { restPos, restQuat, focusQuat, planeQuat } = useMemo(() => {
    const lay = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -Math.PI / 2))
    const plane = new THREE.Quaternion().setFromEuler(new THREE.Euler(...FOCUS_POSE.rotation))
    return {
      // +LEN/2 because the airframe is authored centred on its own length; the
      // model sits on the desk exactly where PLACEMENT has always put its aft face.
      restPos: new THREE.Vector3(PLACEMENT.x + LEN / 2, PLACEMENT.y, PLACEMENT.z),
      restQuat: lay,
      focusQuat: plane.clone().multiply(lay),
      planeQuat: plane,
    }
  }, [])

  const [{ open }, openApi] = useSpring(() => ({
    open: 0,
    config: { tension: 150, friction: 24 },
  }))
  const [{ hover }, hoverApi] = useSpring(() => ({
    hover: 0,
    config: { tension: 300, friction: 20 },
  }))

  useEffect(() => {
    openApi.start({ open: isFocused ? 1 : 0 })
  }, [isFocused, openApi])
  useEffect(() => {
    hoverApi.start({ hover: isHovered ? 1 : 0 })
  }, [isHovered, hoverApi])

  useFrame(() => {
    const g = groupRef.current
    if (!g) return
    const t = open.get()
    const hv = hover.get()

    // Pinch-to-zoom, on the same terms as a document (desk/docZoom): flat
    // 1/0/0 without a second finger, so nothing changes on a mouse.
    const z = zoomState()
    const s = compScale * z.scale

    // The composition's centre in world space — the focus pose, slid along its
    // own plane by the pinch's pan, gated by the pickup progress so a rocket
    // still on its way up cannot arrive pre-panned.
    _centre.set(...FOCUS_POSE.position)
    _ax.set(1, 0, 0).applyQuaternion(planeQuat)
    _ay.set(0, 1, 0).applyQuaternion(planeQuat)
    if (z.x !== 0 || z.y !== 0) {
      _centre.addScaledVector(_ax, z.x * visW * t)
      _centre.addScaledVector(_ay, z.y * visH * t)
    }

    // The airframe: rest pose -> its band of the composition.
    _q.copy(restQuat).slerp(focusQuat, t)
    g.quaternion.copy(_q)
    _v.copy(_centre).addScaledVector(_ay, LAYOUT.rocketY * s)
    _v.lerpVectors(restPos, _v, t)
    _v.y += HOVER_LIFT * hv * (1 - t)
    g.position.copy(_v)
    g.scale.setScalar(THREE.MathUtils.lerp(1 + 0.03 * hv, s * (LAYOUT.rocketW / LEN), t))

    // The nose and its sled turn their cutaway toward the reader as the model
    // comes up, off the very same `t` — so the bay opens into view over the
    // pickup instead of being somewhere behind the model once it lands. Written
    // to the objects directly: a rotation is not worth a re-render (see
    // Airframe's rollRefs).
    const roll = FOCUS_ROLL * t
    for (const id in rollRefs.current) {
      const r = rollRefs.current[id]
      if (r) r.rotation.y = roll
    }

    // The component page, in the band below it.
    const p = pageRef.current
    if (p) {
      // Hidden outright while the rocket is down, so a fully transparent plane
      // is neither drawn nor raycast against on an idle desk.
      const shown = t > 0.001
      p.visible = shown
      if (shown) {
        p.quaternion.copy(planeQuat)
        _v.copy(_centre).addScaledVector(_ay, LAYOUT.pageY * s)
        p.position.copy(_v)
        p.scale.setScalar(s)
      }
      if (pageMatRef.current) {
        const f = Math.max(0, (t - PAGE_FADE_START) / (1 - PAGE_FADE_START))
        pageMatRef.current.opacity = f * f * (3 - 2 * f)
      }
    }

    // The reading key, from the same spring: mounted always, lit only while the
    // rocket is up. Intensity is a uniform — see READING_KEY.
    if (keyRef.current) keyRef.current.intensity = READING_KEY.intensity * t

    // Contact shadow, from the very same spring reads as the motion above:
    // smoothstep the lift fraction so the fade accelerates out of rest and
    // settles gently, matching how the model itself eases.
    const k = Math.min(t / SHADOW_FADE_END, 1)
    const fade = 1 - k * k * (3 - 2 * k)
    if (shadowMatRef.current) {
      shadowMatRef.current.opacity = (SHADOW_REST + SHADOW_HOVER * hv) * fade
    }
    if (shadowMeshRef.current) {
      shadowMeshRef.current.scale.setScalar(1 + 0.06 * hv + 0.25 * (1 - fade))
    }
  })

  /** Which page-step, if any, a click on the focused page is aimed at. */
  const cornerAt = (e) => {
    if (!e.uv) return null
    const u = e.uv.x
    const v = 1 - e.uv.y // canvas space: v runs top -> bottom
    if (v < 1 - PAGE_CORNER) return null
    if (u > 1 - PAGE_CORNER && page < parts.length - 1) return 'next'
    if (u < PAGE_CORNER && page > 0) return 'prev'
    return null
  }

  const onOver = (e) => {
    if (anyFocused) return
    e.stopPropagation()
    setHovered(ROCKET_ID)
    document.body.style.cursor = 'pointer'
  }
  const onOut = (e) => {
    e.stopPropagation()
    if (hoveredId === ROCKET_ID) setHovered(null)
    document.body.style.cursor = 'auto'
  }
  const onClick = (e) => {
    // A click on the focused model is a click on the thing you are already
    // holding: swallow it so it never reaches the scrim and sets it down.
    if (isFocused) {
      e.stopPropagation()
      return
    }
    if (anyFocused) return
    e.stopPropagation()
    document.body.style.cursor = 'auto'
    // Claim the tap so the edge-tap panning stands down: the model lies along
    // the desk's right half and sits squarely under a pan zone on a phone.
    consumeTap()
    focus(ROCKET_ID)
  }

  const onPageMove = (e) => {
    if (!isFocused) return
    document.body.style.cursor = cornerAt(e) ? 'pointer' : 'auto'
  }
  const onPageClick = (e) => {
    e.stopPropagation()
    if (!isFocused) return
    const hit = cornerAt(e)
    if (hit === 'next') nextPage(parts.length)
    else if (hit === 'prev') prevPage()
  }

  return (
    <>
      {/* The reading key — mounted for the life of the scene at zero intensity
          and turned up with the pickup, so the scene's light COUNT never
          changes and no material ever has to recompile. See READING_KEY. */}
      <pointLight
        ref={keyRef}
        position={READING_KEY.position}
        intensity={0}
        distance={READING_KEY.distance}
        decay={2}
        color="#ffe9c9"
      />

      {/* Permanently-mounted contact shadow at the rest footprint — opacity
          animated in useFrame above, never unmounted, so it cannot hard-cut.
          The cradle feet are the only real contact, and a hard shadow-map
          shadow under a cantilevered rocket reads worse than a soft blob. */}
      <group position={[SHADOW_CENTRE_X, 0.0012, PLACEMENT.z]}>
        <mesh ref={shadowMeshRef} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={SHADOW_SIZE} />
          <meshBasicMaterial
            ref={shadowMatRef}
            map={softShadowTexture()}
            transparent
            opacity={SHADOW_REST}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
      </group>

      <group name="rocket">
        {/* The cradle saddles. Dark stained wood, like a shop stand. They stay
            on the desk when the rocket is lifted off them, which is the point of
            a stand — so they are deliberately outside the group that flies. */}
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

        <group ref={groupRef} onPointerOver={onOver} onPointerOut={onOut} onClick={onClick}>
          <Airframe
            glow={isHovered ? HOVER_GLOW : 0}
            activeId={isFocused ? parts[page].id : null}
            detail={armed}
            focused={isFocused}
            rollRefs={rollRefs}
          />
        </group>
      </group>

      {/* The component page.
          Mounted on the first pickup and then kept for the life of the scene —
          `armed` is sticky, so this costs one mesh once, never once per pickup.
          It is deliberately NOT mounted from the start with an empty map: a
          material whose `map` goes from null to a texture changes its shader
          defines and has to recompile, which is precisely the class of hitch
          this rewrite exists to remove. Built with its map already attached, it
          compiles once and every page turn after is a texture re-upload. */}
      {armed && (
        <group ref={pageRef} visible={false}>
          <mesh name="rocket-page" onPointerMove={onPageMove} onClick={onPageClick}>
            <planeGeometry args={[LAYOUT.pageW, LAYOUT.pageH]} />
            <meshBasicMaterial
              ref={pageMatRef}
              map={pageTex}
              transparent
              opacity={0}
              toneMapped={false}
            />
          </mesh>
        </group>
      )}
    </>
  )
}
