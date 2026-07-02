import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CAMERA, PARALLAX } from './constants'
import { useSceneStore } from '../store/useSceneStore'

const target = new THREE.Vector3(...CAMERA.target)
const base = new THREE.Vector3(...CAMERA.position)

/**
 * Holds the fixed vantage and adds a few degrees of pointer parallax — never a
 * free orbit. Parallax is nearly frozen while a document is being read so the
 * picked-up sheet stays put.
 */
export default function CameraRig() {
  const { camera, pointer } = useThree()

  useFrame(() => {
    const focused = useSceneStore.getState().focusedId != null
    const amt = focused ? 0.12 : 1
    const desiredX = base.x + pointer.x * PARALLAX.maxYaw * 14 * amt
    const desiredY = base.y + pointer.y * PARALLAX.maxPitch * 12 * amt
    camera.position.x += (desiredX - camera.position.x) * PARALLAX.ease
    camera.position.y += (desiredY - camera.position.y) * PARALLAX.ease
    camera.position.z = base.z
    camera.lookAt(target)
  })

  return null
}
