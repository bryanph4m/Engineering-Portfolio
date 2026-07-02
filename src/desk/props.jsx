import { useMemo } from 'react'
import { docTexture } from '../lib/docTextures'
import { PAPER_T, SHEET_T } from './layout'

// The physical "prop" for each document, drawn in its own local XY plane
// centred on the origin (normal +Z). The readable face is a painted canvas
// texture (docTextures.js) so every sheet shows its real content lying on
// the desk; ContentOverlay repeats it as crisp DOM once picked up.
//
// Thin-sheet rule: anything that rests within a few millimetres of the desk
// (or of another leaf) gets polygonOffset pulling it toward the camera —
// tiny position deltas alone are not reliable against the big desk slab.

const EDGE = '#ddd1b2' // exposed paper edges of the solid sheets

/** A solid sheet with real thickness; the painted content is the +Z face. */
function BoxSheet({ w, h, doc, back = '#e7dec7' }) {
  const tex = docTexture(doc)
  return (
    <mesh castShadow receiveShadow>
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

/** Index card — small, bright. */
export function CardProp({ doc }) {
  const { w, h } = doc.paper
  return <BoxSheet w={w} h={h} doc={doc} />
}

/**
 * A clipped stack of technical drawings. Leaves sit at `index * SHEET_T`
 * so the stack keeps real thickness no matter how many pages exist; the
 * top leaf carries the painted content.
 */
export function StackProp({ doc }) {
  const { w, h } = doc.paper
  const tex = docTexture(doc)
  const leaves = Math.min(doc.pages, 5)
  const topZ = leaves * SHEET_T

  // fixed fan so the footprint (checked by DevLayoutAudit) never wanders
  const fan = useMemo(
    () => [
      { dx: 0.028, dy: -0.012, rot: -0.014 },
      { dx: -0.016, dy: -0.022, rot: 0.011 },
      { dx: 0.024, dy: 0.01, rot: -0.008 },
      { dx: -0.008, dy: 0.018, rot: 0.015 },
      { dx: 0.014, dy: -0.006, rot: -0.011 },
    ],
    []
  )

  return (
    <group>
      {Array.from({ length: leaves }).map((_, i) => {
        const f = fan[i % fan.length]
        return (
          <mesh
            key={i}
            receiveShadow
            position={[f.dx, f.dy, i * SHEET_T]}
            rotation={[0, 0, f.rot]}
          >
            <planeGeometry args={[w, h]} />
            <meshStandardMaterial
              color={i % 2 ? '#e8dfca' : '#ece3ce'}
              roughness={0.9}
              polygonOffset
              polygonOffsetFactor={-1}
              polygonOffsetUnits={-1}
            />
          </mesh>
        )
      })}
      {/* top sheet with the painted drawing */}
      <mesh castShadow receiveShadow position={[0, 0, topZ]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          map={tex}
          roughness={0.9}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>
      {/* bulldog clip pinching the top edge — lifted clear of the sheet plane */}
      <mesh castShadow position={[0, h / 2 - 0.03, topZ + 0.049]}>
        <boxGeometry args={[0.5, 0.16, 0.09]} />
        <meshStandardMaterial color="#3b3b40" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  )
}

/** Blueprint sheet — a single vellum plane; the painting carries the title block. */
export function BlueprintProp({ doc }) {
  const { w, h } = doc.paper
  const tex = docTexture(doc)
  return (
    <mesh castShadow receiveShadow>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial
        map={tex}
        roughness={0.85}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
      />
    </mesh>
  )
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
