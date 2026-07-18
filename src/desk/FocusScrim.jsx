import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useSpring } from '@react-spring/three'
import * as THREE from 'three'
import { useSceneStore } from '../store/useSceneStore'
import { CAMERA } from './constants'

// A huge view-filling plane slid in between the picked-up document and the
// desk: it dims everything behind the sheet (replacing the old DOM vignette)
// and catches the "click away to set it down" interaction in-world. It sits
// at ~5.4 units down the view ray — behind the focus pose (~4.4) and in front
// of every desk surface (>7).
const camPos = new THREE.Vector3(...CAMERA.position)
const viewDir = new THREE.Vector3(...CAMERA.target).sub(camPos).normalize()
const SCRIM_POS = camPos.clone().addScaledVector(viewDir, 5.4)

/**
 * Makes the scrim invisible to the raycaster, which is NOT the same thing as
 * making it invisible.
 *
 * The scrim outlives the document it dims: `present` is cleared on the fade's
 * `onRest`, so for the whole of the fade-out there is still a 40×40 plane
 * sitting nearer the camera than every desk surface, still carrying the
 * click-to-set-down handler. That handler stops propagation, so during the fade
 * it silently ate every click aimed at the desk behind it — pick up a document,
 * set it down, immediately reach for another, and nothing happened. Measured at
 * ~0.5s on a warm desktop frame loop and about ten times that on a throttled
 * one, which is exactly why it read as random rather than as a rule.
 *
 * The fade is decoration; the interaction is over the moment `focusedId` goes
 * null. So the plane stops being a click target on that transition and only its
 * pixels linger. A `raycast` swap costs nothing — it is a plain object property,
 * not a material change, so nothing recompiles (see desk/RocketModel's header
 * for why that distinction is load-bearing on this desk).
 */
const NO_RAYCAST = () => null
// Passed explicitly rather than `undefined` for the active case: r3f treats an
// undefined prop as "restore the default", and relying on that to hand back a
// working hit test is a subtlety this file does not need. Naming the method is
// the same thing, stated.
const MESH_RAYCAST = THREE.Mesh.prototype.raycast

export default function FocusScrim() {
  const focusedId = useSceneStore((s) => s.focusedId)
  const close = useSceneStore((s) => s.close)

  const meshRef = useRef()
  const matRef = useRef()
  const [present, setPresent] = useState(false)
  const [{ o }, api] = useSpring(() => ({ o: 0, config: { tension: 170, friction: 26 } }))

  useEffect(() => {
    if (focusedId) {
      setPresent(true)
      api.start({ o: 0.58 })
    } else {
      api.start({ o: 0, onRest: () => setPresent(false) })
    }
  }, [focusedId, api])

  useEffect(() => {
    if (present) meshRef.current?.lookAt(camPos)
  }, [present])

  useFrame(() => {
    if (matRef.current) matRef.current.opacity = o.get()
  })

  if (!present) return null
  return (
    <mesh
      ref={meshRef}
      position={SCRIM_POS}
      // Only a scrim that is dimming something answers clicks; a fading one is
      // already spent (see NO_RAYCAST).
      raycast={focusedId ? MESH_RAYCAST : NO_RAYCAST}
      onClick={(e) => {
        // Belt and braces: if a click is ever dispatched against this plane
        // while nothing is focused, let it fall through to the desk rather
        // than swallowing it on a close() that has already happened.
        if (!focusedId) return
        e.stopPropagation()
        close()
      }}
    >
      <planeGeometry args={[40, 40]} />
      <meshBasicMaterial
        ref={matRef}
        color="#0a0603"
        transparent
        opacity={0}
        depthWrite={false}
        fog={false}
        toneMapped={false}
      />
    </mesh>
  )
}
