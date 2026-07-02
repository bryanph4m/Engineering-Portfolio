import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useSpring } from '@react-spring/three'
import * as THREE from 'three'
import { useSceneStore } from '../store/useSceneStore'
import { DocProp } from './props'
import { FOCUS_POSE, HOVER_LIFT } from './constants'

const _v = new THREE.Vector3()
const _q = new THREE.Quaternion()

/**
 * One interactive document. It interpolates between its resting pose on the
 * desk and a "picked up, read me" pose in front of the camera via a single
 * scalar spring (`open`), slerping quaternions so the two very different
 * orientations blend cleanly. The readable content and the page-turn are then
 * handled as crisp DOM in ContentOverlay; this mesh is the physical object you
 * pick up and the sheet that frames the text.
 */
export default function Document({ doc }) {
  const groupRef = useRef()

  const focusedId = useSceneStore((s) => s.focusedId)
  const hoveredId = useSceneStore((s) => s.hoveredId)
  const focus = useSceneStore((s) => s.focus)
  const setHovered = useSceneStore((s) => s.setHovered)

  const isFocused = focusedId === doc.id
  const anyFocused = focusedId != null
  const isHovered = hoveredId === doc.id && !anyFocused

  const focusScale = FOCUS_POSE.targetHeight / doc.paper.h

  // The two orientations as quaternions: flat on the desk (with a yaw spin)
  // and tilted to face the camera when read.
  const { restPos, restQuat, focusPos, focusQuat } = useMemo(() => {
    const yaw = doc.rest.yaw || 0
    const qFlat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2)
    const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
    const rq = qYaw.clone().multiply(qFlat) // flatten first, then spin on the desk
    const fq = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(FOCUS_POSE.rotation[0], FOCUS_POSE.rotation[1], FOCUS_POSE.rotation[2])
    )
    return {
      restPos: new THREE.Vector3(...doc.rest.position),
      restQuat: rq,
      focusPos: new THREE.Vector3(...FOCUS_POSE.position),
      focusQuat: fq,
    }
  }, [doc])

  const [{ open }, openApi] = useSpring(() => ({
    open: 0,
    config: { tension: 150, friction: 24 },
  }))
  const [{ hover }, hoverApi] = useSpring(() => ({
    hover: 0,
    config: { tension: 300, friction: 20 },
  }))

  useEffect(() => {
    openApi.start({ open: isFocused ? 1 : 0 })
  }, [isFocused, openApi])

  useEffect(() => {
    hoverApi.start({ hover: isHovered ? 1 : 0 })
  }, [isHovered, hoverApi])

  useFrame(() => {
    const g = groupRef.current
    if (!g) return
    const t = open.get()
    const hv = hover.get()

    // position: lerp rest -> focus, plus a hover lift while resting
    _v.lerpVectors(restPos, focusPos, t)
    _v.y += HOVER_LIFT * hv * (1 - t)
    g.position.copy(_v)

    // orientation: slerp between the two poses
    _q.copy(restQuat).slerp(focusQuat, t)
    g.quaternion.copy(_q)

    // scale: 1 on the desk -> focusScale in hand, with a tiny hover pop
    const s = THREE.MathUtils.lerp(1 + 0.03 * hv, focusScale, t)
    g.scale.setScalar(s)
  })

  const onOver = (e) => {
    if (anyFocused) return
    e.stopPropagation()
    setHovered(doc.id)
    document.body.style.cursor = 'pointer'
  }
  const onOut = (e) => {
    e.stopPropagation()
    if (hoveredId === doc.id) setHovered(null)
    document.body.style.cursor = 'auto'
  }
  const onClick = (e) => {
    if (anyFocused) return
    e.stopPropagation()
    document.body.style.cursor = 'auto'
    focus(doc.id)
  }

  return (
    <group
      ref={groupRef}
      name={`doc-${doc.id}`}
      onPointerOver={onOver}
      onPointerOut={onOut}
      onClick={onClick}
    >
      <DocProp doc={doc} />
    </group>
  )
}
