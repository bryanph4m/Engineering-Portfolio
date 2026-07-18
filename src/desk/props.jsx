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

// ---------------------------------------------------------------------------
// The turning leaf: a skinned sheet that actually bends
// ---------------------------------------------------------------------------
//
// A page that rotates about its bound edge as one rigid rectangle reads as a
// hinged board, not paper. So the leaf in flight is a real SkinnedMesh: the
// plane is subdivided along its length and a chain of bones runs from the bound
// edge down to the free edge, each bone taking a share of one total bend angle.
// Curl the chain and the sheet curves; the hinge rotation is unchanged.
//
// Two SkinnedMeshes (painted front, plain back) share ONE geometry and ONE
// skeleton, so the bend is evaluated once and the two faces can never disagree.
// They sit at the same transform and differ only by `side`, which also removes
// the z-offset pair the rigid version needed to keep its faces apart.
//
// The rig is built once per document and reused by every flip — nothing is
// allocated during a turn, which is what keeps rapid repeated flips smooth.

const LEAF_SEGMENTS = seg(16)

// Each bone's share of the bend, as a function of p — distance from the hinge,
// 0 at the bound edge, 1 at the free edge. The sine term puts the curvature in
// the middle of the sheet so both edges stay tangent-smooth (a page hinged at a
// clip cannot kink at the clip); subtracting the double-frequency term biases
// bend toward the free half, which is what makes the far corner trail through
// the sweep and flick as it lands.
const bendProfile = (p) => Math.sin(p * Math.PI) - 0.45 * Math.sin(p * 2 * Math.PI)

const MAX_BEND = 0.9 // total radians of curl, hinge to free edge, at fold = 1

/**
 * Build the reusable skinned leaf: geometry with skin attributes, the bone
 * chain, the skeleton, and the two face meshes. Returns the group to drop into
 * the hinge plus the per-bone bend shares.
 *
 * Binding is done while the rig is still detached and at identity, with an
 * explicit identity bind matrix, so the bind pose is captured in the rig's own
 * local space. The skeleton then rides the animated hinge above it without the
 * pivot's rotation being counted twice (SkinnedMesh's default attached bind
 * mode divides the mesh's own world matrix back out each frame).
 */
function buildLeafRig(w, h, segments, backColor, frontMap) {
  const geometry = new THREE.PlaneGeometry(w, h, 1, segments)
  geometry.translate(0, -h / 2, 0) // bound edge at y = 0, free edge at y = -h

  // Skin weights straight off each vertex's height, so they stay correct no
  // matter what order PlaneGeometry happens to emit its rows in: every vertex
  // blends the two bones it sits between.
  const pos = geometry.attributes.position
  const skinIndex = new Uint16Array(pos.count * 4)
  const skinWeight = new Float32Array(pos.count * 4)
  for (let v = 0; v < pos.count; v++) {
    const f = THREE.MathUtils.clamp((-pos.getY(v) / h) * segments, 0, segments)
    const i0 = Math.min(Math.floor(f), segments - 1)
    const frac = f - i0
    skinIndex[v * 4] = i0
    skinIndex[v * 4 + 1] = i0 + 1
    skinWeight[v * 4] = 1 - frac
    skinWeight[v * 4 + 1] = frac
  }
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4))
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4))

  // One bone per segment boundary, chained down the sheet from the hinge.
  const bones = []
  for (let i = 0; i <= segments; i++) {
    const bone = new THREE.Bone()
    if (i > 0) {
      bone.position.y = -h / segments
      bones[i - 1].add(bone)
    }
    bones.push(bone)
  }

  const front = new THREE.SkinnedMesh(
    geometry,
    new THREE.MeshStandardMaterial({ map: frontMap, roughness: 0.9, side: THREE.FrontSide })
  )
  const back = new THREE.SkinnedMesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: backColor, roughness: 0.9, side: THREE.BackSide })
  )
  // A skinned bounding volume is the flat bind pose, which a curled sheet can
  // leave; the leaf is a few dozen triangles, so never culling it is cheaper
  // than keeping the bounds honest.
  front.frustumCulled = false
  back.frustumCulled = false

  const group = new THREE.Group()
  group.add(bones[0], front, back)
  group.updateMatrixWorld(true)

  const skeleton = new THREE.Skeleton(bones)
  const bindMatrix = new THREE.Matrix4()
  front.bind(skeleton, bindMatrix)
  back.bind(skeleton, bindMatrix)

  // Normalised so the shares always sum to MAX_BEND: the profile's shape sets
  // where the sheet curves, MAX_BEND alone sets how much.
  const share = [0]
  let sum = 0
  for (let i = 1; i <= segments; i++) sum += bendProfile(i / segments)
  for (let i = 1; i <= segments; i++) share[i] = (bendProfile(i / segments) / sum) * MAX_BEND

  const dispose = () => {
    geometry.dispose()
    front.material.dispose()
    back.material.dispose()
    skeleton.dispose()
  }

  return { group, bones, share, front, dispose }
}

// Easing of the bend, deliberately separate from the turn's own spring: the
// hinge angle and the curl are two different physical things and must not share
// a curve. The fold is damped per-frame toward its target rather than tweened,
// so it survives a flip being interrupted mid-flight by the next one.
//
//  - FOLD_LAMBDA — how fast the curl chases its target, per second. This has to
//    be read against how long a turn actually lasts: the hinge spring sweeps a
//    sheet through its full half-turn in roughly 170ms, so anything gentle here
//    means the curl is still winding up as the page lands and the sheet reads
//    flat through the part of the arc the eye is actually on. At 26 the curl is
//    ~60% of target one frame in, which still lags the hinge enough to read as
//    paper with mass, but lands that lag inside the flip instead of after it.
//  - FOLD_BASE   — curl of an unhurried single flip.
//  - FOLD_VEL    — extra curl bought by hinge speed, so hammering the corner
//    through several pages visibly whips them harder than one deliberate turn.
//  - VEL_REF     — the hinge speed (turn units/sec) that counts as full tilt.
//    Set above the spring's own peak so a normal flip sits partway up the
//    range; clamping it lower would saturate every turn and flatten the
//    distinction this term exists to draw.
const FOLD_LAMBDA = 26
const FOLD_BASE = 0.55
const FOLD_VEL = 0.5
const VEL_REF = 6

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

  // The bending leaf, built once and reused by every flip this document ever
  // does. Mounting/unmounting the <primitive> below only attaches and detaches
  // it; the geometry, skeleton and materials outlive the turn.
  const rig = useMemo(
    () => buildLeafRig(w, h, LEAF_SEGMENTS, back, docTexture(doc, 0)),
    [w, h, back, doc]
  )
  useEffect(() => rig.dispose, [rig])

  const fold = useRef(0) // live curl amount, eased per frame (never a tween)
  const prevTurn = useRef(0)

  /** Curl the bone chain to `f`, signed by flip direction. */
  const applyBend = (f) => {
    for (let i = 1; i < rig.bones.length; i++) rig.bones[i].rotation.x = rig.share[i] * f
  }

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
    // Seed the velocity estimate at the start angle so an opening frame can't
    // read as an enormous jump and slam the sheet to full curl.
    prevTurn.current = from
    rig.front.material.map = docTexture(doc, anim.idx)
    turnApi.start({
      from: { turn: from },
      turn: anim.dir > 0 ? PILE.base : 0,
      onRest: () => setAnim(null),
    })
    // applyTurn is re-created per render but only reads refs + constants
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anim, turnApi, rig, doc])

  useFrame((_, delta) => {
    // Clamped so a backgrounded tab or a dropped frame resumes with a sane step
    // instead of snapping the curl to its target in one jump.
    const dt = Math.min(delta, 1 / 30)

    if (anim) {
      const t = turn.get()
      applyTurn(t)

      // Progress along the actual travel, so the curl is zero at BOTH ends of a
      // flip in either direction: a page at rest — front stack or pile — is
      // flat, and the sheet hands off to a flat PileLeaf without a step.
      const tc = THREE.MathUtils.clamp(t, 0, 1)
      const u = THREE.MathUtils.clamp(tc / PILE.base, 0, 1)
      const vel = Math.abs(tc - prevTurn.current) / dt
      prevTurn.current = tc

      const speed = Math.min(vel / VEL_REF, 1)
      const target =
        Math.sin(u * Math.PI) * (FOLD_BASE + FOLD_VEL * speed) * anim.dir
      fold.current += (target - fold.current) * (1 - Math.exp(-FOLD_LAMBDA * dt))
      applyBend(fold.current)
    } else if (Math.abs(fold.current) > 1e-4) {
      // Nothing in flight: relax whatever curl was left when the leaf handed
      // off, so the next flip starts from a flat sheet even if it starts now.
      fold.current *= Math.exp(-FOLD_LAMBDA * dt)
      applyBend(fold.current)
    }
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

      {/* the sheet mid-turn, hinged at the top edge; the inner group slides it
          past the hinge as it turns so it settles onto the pile, and the leaf
          itself bends about that hinge via its bone chain (buildLeafRig) */}
      {flipping && (
        <group ref={pivotRef} position={[0, h / 2, topZ + SHEET_T]}>
          <group ref={slideRef}>
            <primitive object={rig.group} />
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
