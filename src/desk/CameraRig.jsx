import { useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CAMERA, PARALLAX, CAMERA_PAN, panRange } from './constants'
import { useSceneStore } from '../store/useSceneStore'

const base = new THREE.Vector3(...CAMERA.position)
const baseTarget = new THREE.Vector3(...CAMERA.target)

// Scratch, reused every frame so the rig allocates nothing while running.
const _target = new THREE.Vector3()

/**
 * Holds the fixed vantage and adds a few degrees of pointer parallax — never a
 * free orbit. Parallax is nearly frozen while a document is being read so the
 * picked-up sheet stays put.
 *
 * On top of that it carries the edge-tap pan (see CAMERA_PAN in constants and
 * desk/TouchControls, which is the only thing that writes `panStep`). The pan
 * moves the camera and its look-at target by the same amount, so it trucks
 * sideways along the desk instead of orbiting it: the vantage angle stays
 * exactly as fixed as it is on desktop, and only which slice of the desk is
 * centred changes.
 */
export default function CameraRig() {
  const { camera, pointer, size } = useThree()
  // The eased world-space pan, in metres from centre. Lives in a ref, not the
  // store: it changes every frame, and nothing outside this rig cares.
  const panX = useRef(0)

  useFrame(() => {
    const { focusedId, panStep } = useSceneStore.getState()
    const focused = focusedId != null
    const amt = focused ? 0.12 : 1

    // A focused sheet floats at x = 0, so reading folds the pan back to centre
    // to frame it — and releasing restores it, putting the visitor back where
    // they were looking when they picked the document up.
    const range = panRange(size.width / size.height)
    const panTo = focused ? 0 : (panStep / CAMERA_PAN.steps) * range
    panX.current += (panTo - panX.current) * CAMERA_PAN.ease

    const desiredX = base.x + panX.current + pointer.x * PARALLAX.maxYaw * 14 * amt
    const desiredY = base.y + pointer.y * PARALLAX.maxPitch * 12 * amt
    camera.position.x += (desiredX - camera.position.x) * PARALLAX.ease
    camera.position.y += (desiredY - camera.position.y) * PARALLAX.ease
    camera.position.z = base.z

    // The target tracks the pan exactly — that equality is what makes this a
    // truck and not an orbit.
    _target.set(baseTarget.x + panX.current, baseTarget.y, baseTarget.z)
    camera.lookAt(_target)
  })

  return null
}
