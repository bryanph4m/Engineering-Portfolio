import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { PREFERS_REDUCED_MOTION, QUALITY } from '../lib/quality'

/**
 * One draw call of slow-moving dust caught in the drafting lamp. The particles
 * are deliberately sparse and tiny: they should register as air in the light,
 * not as a magical particle effect. Positions are deterministic so the desk
 * does not visibly reshuffle between mounts or screenshots.
 */
export default function DeskAtmosphere() {
  const motes = useRef()
  const positions = useMemo(() => {
    const count = QUALITY.mobile ? 24 : 52
    const points = new Float32Array(count * 3)
    let seed = 0x1a2b3c4d
    const random = () => {
      seed = (1664525 * seed + 1013904223) >>> 0
      return seed / 4294967296
    }

    for (let i = 0; i < count; i += 1) {
      points[i * 3] = -3.1 + random() * 6.2
      points[i * 3 + 1] = 0.32 + random() * 3.2
      points[i * 3 + 2] = -2.4 + random() * 4.6
    }
    return points
  }, [])

  useFrame((_, delta) => {
    if (!motes.current || PREFERS_REDUCED_MOTION) return
    motes.current.rotation.y += delta * 0.008
    motes.current.position.y = Math.sin(motes.current.rotation.y * 7) * 0.035
  })

  return (
    <points ref={motes} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#dfac68"
        size={QUALITY.mobile ? 0.018 : 0.014}
        sizeAttenuation
        transparent
        opacity={0.2}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  )
}
