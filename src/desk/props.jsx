import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useSpring } from '@react-spring/three'
import * as THREE from 'three'
import { useSceneStore } from '../store/useSceneStore'
import { docTexture } from '../lib/docTextures'
import { seg } from '../lib/quality'
import { PAPER_T, SHEET_T } from './layout'

// The physical "prop" for each document, drawn in its own local XY plane
// centred on the origin (normal +Z). All readable content is painted canvas
// texture (docTextures.js) — the sheet itself is the UI, at rest and picked
// up. Multi-page documents stack real leaves and flip them about the bound
// (top) edge; the mesh named "page-face" is the one Document.jsx raycasts
// for link/page-turn hotspots.
//
// Thin-sheet rule: anything that rests within a few millimetres of the desk
// (or of another leaf) gets polygonOffset pulling it toward the camera —
// tiny position deltas alone are not reliable against the big desk slab.

const EDGE = '#ddd1b2' // exposed paper edges of the solid sheets

/** World-local Z of a multi-page document's top sheet. */
export const stackTopZ = (doc) => doc.pages.length * SHEET_T

// Documents deliberately do NOT castShadow: per-caster shadow-map shadows are
// binary (they cannot fade), which is what made pickup shadows pop. Grounding
// comes from the animated contact-shadow plane in Document.jsx instead.

/**
 * True when this document's currently-shown page should be reading from its
 * high-resolution raster — i.e. a finger has pinched it in far enough that the
 * base one would go soft (desk/docZoom, lib/docTextures).
 *
 * It is a store subscription rather than a docZoom read because, unlike the zoom
 * itself, this is a real render input: it changes which texture the material
 * carries, so it has to re-render the prop. It only ever flips when a pinch
 * settles, which is why the live zoom is kept out of the store and this one bit
 * is not.
 */
function useDetailPage(doc, page) {
  return useSceneStore(
    (s) => s.zoomDetail && s.focusedId === doc.id && s.pageIndex === page
  )
}

/** A solid sheet with real thickness; the painted content is the +Z face. */
function BoxSheet({ w, h, doc, back = '#e7dec7' }) {
  const tex = docTexture(doc, 0, useDetailPage(doc, 0))
  return (
    <mesh name="page-face" receiveShadow>
      <boxGeometry args={[w, h, PAPER_T]} />
      <meshStandardMaterial attach="material-0" color={EDGE} roughness={0.9} />
      <meshStandardMaterial attach="material-1" color={EDGE} roughness={0.9} />
      <meshStandardMaterial attach="material-2" color={EDGE} roughness={0.9} />
      <meshStandardMaterial attach="material-3" color={EDGE} roughness={0.9} />
      <meshStandardMaterial attach="material-4" map={tex} roughness={0.85} />
      <meshStandardMaterial attach="material-5" color={back} roughness={0.9} />
    </mesh>
  )
}

// Fixed fan for the leaves under the top sheet, biased down-right so the page
// edges peek out and multi-page documents read as "more inside" at a glance.
// Fixed values so the footprint (checked by DevLayoutAudit) never wanders.
const FAN = [
  { dx: 0.03, dy: -0.024, rot: -0.012 },
  { dx: 0.052, dy: -0.014, rot: 0.01 },
  { dx: 0.068, dy: -0.036, rot: -0.007 },
  { dx: 0.044, dy: -0.046, rot: 0.013 },
]

// Where flipped pages come to rest: a shallow pile hinged just past the top
// (bound) edge, legal-pad style, each leaf stopping a few degrees short of
// dead flat so up to `visible` sheet backs stay readable as the pile grows.
// `base` is the newest leaf's rest angle as a fraction of a half-turn; each
// deeper leaf lies `step` flatter and `drop` lower. `gap` slides a landed
// leaf just past the hinge so the pile clears the bulldog clip, and `lift`
// keeps the newest leaf proud of the hinge plane.
const PILE = {
  base: 0.965,
  step: 0.012,
  lift: 0.008,
  drop: 0.004,
  gap: 0.06,
  visible: 3,
}

/** Rest angle (radians about the hinge) for the pile leaf at `depth`. */
const pileAngle = (depth) => -Math.min(PILE.base + depth * PILE.step, 0.995) * Math.PI

/** One already-read leaf at rest on the flipped-over pile. */
function PileLeaf({ doc, idx, depth, back }) {
  const { w, h } = doc.paper
  const topZ = stackTopZ(doc)
  return (
    <group
      position={[0, h / 2, topZ + SHEET_T + PILE.lift - depth * PILE.drop]}
      rotation={[pileAngle(depth), 0, 0]}
    >
      <group position={[0, -PILE.gap, 0]}>
        <mesh position={[0, -h / 2, 0.001]}>
          <planeGeometry args={[w, h]} />
          <meshStandardMaterial map={docTexture(doc, idx)} roughness={0.9} />
        </mesh>
        <mesh position={[0, -h / 2, -0.001]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[w, h]} />
          <meshStandardMaterial color={back} roughness={0.9} />
        </mesh>
      </group>
    </group>
  )
}

/**
 * Any document with a `pages` array longer than one: real stacked leaves, the
 * current page painted on top, remaining pages peeking out under the right
 * edge, and a physical page-turn about the top (bound) edge driven by the
 * same react-spring stack as the pickup animation. Turned pages land on the
 * flipped-over pile past the bound edge (PileLeaf) instead of vanishing; the
 * spring is underdamped and the rotation clamps against the pile / the front
 * stack, so a landing page presses flat, relaxes back a touch and settles —
 * in both flip directions.
 */
function MultiPageSheets({ doc, blank = ['#e8dfca', '#ece3ce'], back = '#e7dec7' }) {
  const { w, h } = doc.paper
  const count = doc.pages.length
  const topZ = stackTopZ(doc)

  const focusedId = useSceneStore((s) => s.focusedId)
  const pageIndex = useSceneStore((s) => s.pageIndex)
  const flipDir = useSceneStore((s) => s.flipDir)
  const flipNonce = useSceneStore((s) => s.flipNonce)
  const isFocused = focusedId === doc.id
  const page = isFocused ? pageIndex : 0

  // one flip in flight at a time: which sheet is turning, and which way
  const [anim, setAnim] = useState(null)
  const lastNonce = useRef(flipNonce)
  useEffect(() => {
    if (flipNonce !== lastNonce.current) {
      lastNonce.current = flipNonce
      if (isFocused && flipDir !== 0) {
        setAnim({ dir: flipDir, idx: flipDir > 0 ? pageIndex - 1 : pageIndex })
      }
    }
    if (!isFocused && anim) setAnim(null)
  }, [flipNonce, flipDir, pageIndex, isFocused, anim])

  const [{ turn }, turnApi] = useSpring(() => ({
    turn: 0,
    // underdamped on purpose: the overshoot past the rest angle is clamped by
    // applyTurn, which reads as the page pressing flat and springing back
    config: { tension: 140, friction: 15 },
  }))
  const pivotRef = useRef()
  const slideRef = useRef()

  // Drive the turning sheet from the spring value: rotation about the hinge
  // (clamped so it can't pass through the pile or the front stack), plus the
  // slide past the hinge and the lift up to the pile's top slot, both
  // proportional to progress so the sheet lands exactly where the static
  // PileLeaf will take over.
  const applyTurn = (t) => {
    const tc = THREE.MathUtils.clamp(t, 0, 1)
    const k = Math.min(tc / PILE.base, 1)
    if (pivotRef.current) {
      pivotRef.current.rotation.x = -tc * Math.PI
      pivotRef.current.position.z = topZ + SHEET_T + PILE.lift * k
    }
    if (slideRef.current) slideRef.current.position.y = -PILE.gap * k
  }

  useLayoutEffect(() => {
    if (!anim) return
    const from = anim.dir > 0 ? 0 : PILE.base
    applyTurn(from)
    turnApi.start({
      from: { turn: from },
      turn: anim.dir > 0 ? PILE.base : 0,
      onRest: () => setAnim(null),
    })
    // applyTurn is re-created per render but only reads refs + constants
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anim, turnApi])

  useFrame(() => {
    if (anim) applyTurn(turn.get())
  })

  // The static top sheet: while flipping forward it already shows the next
  // page (the turning sheet covers it); while flipping back it keeps the old
  // page until the returning sheet lands.
  const topIndex = anim
    ? anim.dir > 0
      ? pageIndex
      : Math.min(pageIndex + 1, count - 1)
    : page
  // Only the sheet actually on top is ever worth a hi-res raster — the pile and
  // the turning leaf are mid-animation or edge-on, and a zoom resets on every
  // page turn anyway, so `topIndex` is the only page a pinch can be reading.
  const detail = useDetailPage(doc, topIndex)
  const blanksBelow = Math.max(count - 1 - topIndex, 0)
  const flipping = anim && anim.idx >= 0 && anim.idx < count

  // Already-read pages resting past the bound edge. The turning sheet is
  // never in this list — it hands off to a PileLeaf (or the front stack) the
  // frame its spring rests. While a page is inbound the resident leaves sit
  // one slot deeper so the newcomer's slot is free.
  const pileCount = anim ? anim.idx : page
  const pileDepthShift = anim && anim.dir > 0 ? 1 : 0

  return (
    <group>
      {Array.from({ length: Math.min(pileCount, PILE.visible) }).map((_, k) => (
        <PileLeaf
          key={pileCount - 1 - k}
          doc={doc}
          idx={pileCount - 1 - k}
          depth={k + pileDepthShift}
          back={back}
        />
      ))}
      {Array.from({ length: blanksBelow }).map((_, i) => {
        const f = FAN[i % FAN.length]
        return (
          <mesh
            key={i}
            receiveShadow
            position={[f.dx, f.dy, topZ - (i + 1) * SHEET_T]}
            rotation={[0, 0, f.rot]}
          >
            <planeGeometry args={[w, h]} />
            <meshStandardMaterial
              color={blank[i % blank.length]}
              roughness={0.9}
              polygonOffset
              polygonOffsetFactor={-1}
              polygonOffsetUnits={-1}
            />
          </mesh>
        )
      })}

      {/* top sheet with the painted content */}
      <mesh name="page-face" receiveShadow position={[0, 0, topZ]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          map={docTexture(doc, topIndex, detail)}
          roughness={0.9}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>

      {/* the sheet mid-turn, hinged at the top edge; the inner group slides
          it past the hinge as it turns so it settles onto the pile */}
      {flipping && (
        <group ref={pivotRef} position={[0, h / 2, topZ + SHEET_T]}>
          <group ref={slideRef}>
            <mesh position={[0, -h / 2, 0.001]}>
              <planeGeometry args={[w, h]} />
              <meshStandardMaterial map={docTexture(doc, anim.idx)} roughness={0.9} />
            </mesh>
            <mesh position={[0, -h / 2, -0.001]} rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[w, h]} />
              <meshStandardMaterial color={back} roughness={0.9} />
            </mesh>
          </group>
        </group>
      )}
    </group>
  )
}

/** Index card — small, bright. */
export function CardProp({ doc }) {
  const { w, h } = doc.paper
  return <BoxSheet w={w} h={h} doc={doc} />
}

/** A clipped stack of technical drawings — the bulldog clip binds the top. */
export function StackProp({ doc }) {
  const { h } = doc.paper
  const topZ = stackTopZ(doc)
  return (
    <group>
      <MultiPageSheets doc={doc} />
      {/* bulldog clip pinching the top edge — lifted clear of the sheet plane */}
      <mesh position={[0, h / 2 - 0.03, topZ + 0.049]}>
        <boxGeometry args={[0.5, 0.16, 0.09]} />
        <meshStandardMaterial color="#3b3b40" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  )
}

/** Blueprint pad — three vellum sheets, flipped like a wall calendar. */
export function BlueprintProp({ doc }) {
  return <MultiPageSheets doc={doc} blank={['#26507a', '#214a72']} back="#2a5580" />
}

// Paperclip wire path constants, local to the sheet's top edge (y = 0 is the
// paper edge, negative y runs down the face, z is the paper normal).
const CLIP_R = 0.011 // wire radius

/** Wire gem clip gripping the top edge of a sheet: the double loop rides the
 *  front face, the return leg passes behind, and the one bend that crosses
 *  the paper plane arcs over the edge in free space — the wire never passes
 *  through the sheet, it wraps it at its real thickness. */
function paperclipGeometry() {
  const zF = PAPER_T / 2 + CLIP_R // wire centreline resting on the front face
  const zB = -PAPER_T / 2 - CLIP_R // …and on the back face
  const pts = []
  const pt = (x, y, z) => pts.push(new THREE.Vector3(x, y, z))
  const arc = (cx, cy, r, a0, a1, z0, z1, n = 10) => {
    for (let s = 0; s <= n; s++) {
      const t = s / n
      const a = a0 + (a1 - a0) * t
      pt(cx + Math.cos(a) * r, cy + Math.sin(a) * r, z0 + (z1 - z0) * t)
    }
  }
  // outer loop, on the face: left leg up, over the edge, right leg down
  pt(-0.05, -0.28, zF)
  pt(-0.05, -0.15, zF)
  pt(-0.05, -0.03, zF)
  arc(0, 0, 0.05, Math.PI, 0, zF, zF) // top outer bend, past the paper edge
  pt(0.05, -0.15, zF)
  pt(0.05, -0.292, zF)
  arc(0.042, -0.3, 0.008, 0, -Math.PI, zF, zF, 6) // bottom bend
  // inner leg back up the face…
  pt(0.034, -0.15, zF)
  pt(0.034, -0.012, zF)
  // …then the crossing bend: past the edge, front plane -> back plane
  arc(0, -0.012, 0.034, 0, Math.PI, zF, zB)
  // return leg down the back of the sheet
  pt(-0.034, -0.12, zB)
  pt(-0.034, -0.24, zB)
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal')
  // The densest single prop on the desk: at desktop tessellation this one wire
  // is ~2.5k triangles for a clip a few millimetres wide. The curve is what
  // sells it, not the tube's roundness, so phones keep the path and halve the
  // sweep (see seg() in src/lib/quality.js).
  return new THREE.TubeGeometry(curve, seg(160), CLIP_R, seg(8))
}

/** Folded formal document with a paperclip — the resume. */
export function FoldProp({ doc }) {
  const { w, h } = doc.paper
  const clip = useMemo(() => paperclipGeometry(), [])
  return (
    <group>
      <BoxSheet w={w} h={h} doc={doc} />
      {/* gem clip slid over the top edge, near the top-left corner */}
      <mesh geometry={clip} position={[-w / 2 + 0.3, h / 2, 0]}>
        <meshStandardMaterial color="#c9c9cf" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  )
}

/** Addressed envelope — flap, stamp and postmark are painted, not meshes. */
export function EnvelopeProp({ doc }) {
  const { w, h } = doc.paper
  return <BoxSheet w={w} h={h} doc={doc} back="#e6dcc4" />
}

export function DocProp({ doc }) {
  switch (doc.kind) {
    case 'stack':
      return <StackProp doc={doc} />
    case 'blueprint':
      return <BlueprintProp doc={doc} />
    case 'fold':
      return <FoldProp doc={doc} />
    case 'envelope':
      return <EnvelopeProp doc={doc} />
    case 'card':
    default:
      return <CardProp doc={doc} />
  }
}
