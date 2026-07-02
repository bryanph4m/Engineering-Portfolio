import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useSpring } from '@react-spring/three'
import { useSceneStore } from '../store/useSceneStore'
import { docTexture } from '../lib/docTextures'
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

/** A solid sheet with real thickness; the painted content is the +Z face. */
function BoxSheet({ w, h, doc, back = '#e7dec7' }) {
  const tex = docTexture(doc, 0)
  return (
    <mesh name="page-face" castShadow receiveShadow>
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

/**
 * Any document with a `pages` array longer than one: real stacked leaves, the
 * current page painted on top, remaining pages peeking out under the right
 * edge, and a physical page-turn about the top (bound) edge driven by the
 * same react-spring stack as the pickup animation.
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
    config: { tension: 130, friction: 21 },
  }))
  const pivotRef = useRef()
  useLayoutEffect(() => {
    if (!anim) return
    const from = anim.dir > 0 ? 0 : 1
    if (pivotRef.current) pivotRef.current.rotation.x = -from * Math.PI * 0.99
    turnApi.start({
      from: { turn: from },
      turn: anim.dir > 0 ? 1 : 0,
      onRest: () => setAnim(null),
    })
  }, [anim, turnApi])

  useFrame(() => {
    if (pivotRef.current) pivotRef.current.rotation.x = -turn.get() * Math.PI * 0.99
  })

  // The static top sheet: while flipping forward it already shows the next
  // page (the turning sheet covers it); while flipping back it keeps the old
  // page until the returning sheet lands.
  const topIndex = anim
    ? anim.dir > 0
      ? pageIndex
      : Math.min(pageIndex + 1, count - 1)
    : page
  const blanksBelow = Math.max(count - 1 - topIndex, 0)
  const flipping = anim && anim.idx >= 0 && anim.idx < count

  return (
    <group>
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
      <mesh name="page-face" castShadow receiveShadow position={[0, 0, topZ]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          map={docTexture(doc, topIndex)}
          roughness={0.9}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>

      {/* the sheet mid-turn, hinged at the top edge */}
      {flipping && (
        <group ref={pivotRef} position={[0, h / 2, topZ + SHEET_T]}>
          <mesh position={[0, -h / 2, 0.001]}>
            <planeGeometry args={[w, h]} />
            <meshStandardMaterial map={docTexture(doc, anim.idx)} roughness={0.9} />
          </mesh>
          <mesh position={[0, -h / 2, -0.001]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[w, h]} />
            <meshStandardMaterial color={back} roughness={0.9} />
          </mesh>
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
      <mesh castShadow position={[0, h / 2 - 0.03, topZ + 0.049]}>
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

/** Folded formal document with a paperclip — the resume. */
export function FoldProp({ doc }) {
  const { w, h } = doc.paper
  return (
    <group>
      <BoxSheet w={w} h={h} doc={doc} />
      {/* paperclip hugging the top-left corner, just proud of the face */}
      <mesh position={[-w / 2 + 0.22, h / 2 - 0.1, PAPER_T / 2 + 0.022]} rotation={[0, 0, 0.2]}>
        <torusGeometry args={[0.12, 0.02, 8, 20, Math.PI * 1.4]} />
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
