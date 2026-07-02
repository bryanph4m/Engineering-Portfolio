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
      onClick={(e) => {
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
