import { useMemo } from 'react'
import { woodTexture, gridPaperTexture } from '../lib/textures'
import { COLORS } from './constants'

/**
 * The desktop itself plus the static "work in progress" graph-paper sheet
 * peeking out from under the documents. Purely set dressing — no interaction.
 *
 * To use a real wood photo instead of the procedural grain, drop
 * /public/assets/textures/desk-wood.jpg and swap woodTexture() for
 * useTexture('/assets/textures/desk-wood.jpg').
 */
export default function Desk() {
  const wood = useMemo(() => {
    const t = woodTexture()
    t.repeat.set(2, 1.5)
    return t
  }, [])
  const grid = useMemo(() => gridPaperTexture(), [])

  return (
    <group>
      {/* desktop slab — top surface sits at y = 0 */}
      <mesh receiveShadow position={[0, -0.4, 0]}>
        <boxGeometry args={[11, 0.8, 7.5]} />
        <meshStandardMaterial map={wood} roughness={0.82} metalness={0.02} />
      </mesh>

      {/* front edge lip for a little depth */}
      <mesh position={[0, -0.42, 3.78]}>
        <boxGeometry args={[11, 0.78, 0.12]} />
        <meshStandardMaterial color={COLORS.woodDark} roughness={0.9} />
      </mesh>

      {/* half-finished graph-paper cross-section, tucked upstage-left —
          kept clear of every interactive document's footprint. It sits
          almost on the desk, so polygonOffset (not a height fudge) keeps
          it in front of the slab. */}
      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0.1]}
        position={[-3.45, 0.002, -2.9]}
      >
        <planeGeometry args={[2.2, 1.3]} />
        <meshStandardMaterial
          map={grid}
          roughness={0.95}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
    </group>
  )
}
