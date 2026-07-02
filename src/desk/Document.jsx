import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useSpring } from '@react-spring/three'
import * as THREE from 'three'
import { useSceneStore } from '../store/useSceneStore'
import { docLinks } from '../lib/docTextures'
import { DocProp } from './props'
import { CAMERA, FOCUS_POSE, HOVER_LIFT } from './constants'

// Camera-to-sheet distance at the focused pose; fixed because both poses are.
const FOCUS_DIST = new THREE.Vector3(...FOCUS_POSE.position).distanceTo(
  new THREE.Vector3(...CAMERA.position)
)

const _v = new THREE.Vector3()
const _q = new THREE.Quaternion()

// Fraction of the sheet, measured from each bottom corner, that acts as the
// page-turn hotspot on a focused multi-page document. Matches the dog-eared
// corners painted by pageChrome in docTextures.js.
const PAGE_CORNER = 0.16

/**
 * One interactive document. It interpolates between its resting pose on the
 * desk and a "picked up, read me" pose in front of the camera via a single
 * scalar spring (`open`), slerping quaternions so the two very different
 * orientations blend cleanly. The paper itself carries all content; while
 * focused, clicks are raycast against the painted sheet's UVs for links and
 * page-turn corners. Clicking the dimmed desk (FocusScrim) sets it back down.
 */
export default function Document({ doc }) {
  const groupRef = useRef()

  const focusedId = useSceneStore((s) => s.focusedId)
  const hoveredId = useSceneStore((s) => s.hoveredId)
  const pageIndex = useSceneStore((s) => s.pageIndex)
  const focus = useSceneStore((s) => s.focus)
  const setHovered = useSceneStore((s) => s.setHovered)
  const nextPage = useSceneStore((s) => s.nextPage)
  const prevPage = useSceneStore((s) => s.prevPage)

  const isFocused = focusedId === doc.id
  const anyFocused = focusedId != null
  const isHovered = hoveredId === doc.id && !anyFocused

  // Fill the view to targetHeight, but never wider than the viewport can
  // show at the focus distance — wide sheets (the blueprint, the index card)
  // would otherwise run off both edges of a portrait phone. The fov is
  // vertical, so height framing is aspect-independent; width is not.
  const { width: vw, height: vh } = useThree((s) => s.size)
  const visW = 2 * Math.tan((CAMERA.fov * Math.PI) / 360) * FOCUS_DIST * (vw / vh)
  const focusScale = Math.min(
    FOCUS_POSE.targetHeight / doc.paper.h,
    (visW * 0.94) / doc.paper.w
  )

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

  /** What a pointer event on the focused sheet is aimed at, if anything. */
  const hotspotAt = (e) => {
    if (e.object?.name !== 'page-face' || !e.uv) return null
    const u = e.uv.x
    const v = 1 - e.uv.y // canvas space: v runs top -> bottom
    for (const l of docLinks(doc, pageIndex)) {
      if (u >= l.u0 && u <= l.u1 && v >= l.v0 && v <= l.v1) {
        return { type: 'link', href: l.href }
      }
    }
    const count = doc.pages.length
    if (count > 1 && v > 1 - PAGE_CORNER) {
      if (u > 1 - PAGE_CORNER && pageIndex < count - 1) return { type: 'next' }
      if (u < PAGE_CORNER && pageIndex > 0) return { type: 'prev' }
    }
    return null
  }

  const openLink = (href) => {
    if (href.startsWith('mailto:')) window.location.href = href
    else window.open(href, '_blank', 'noopener,noreferrer')
  }

  const onOver = (e) => {
    if (anyFocused) return
    e.stopPropagation()
    setHovered(doc.id)
    document.body.style.cursor = 'pointer'
  }
  const onMove = (e) => {
    if (!isFocused) return
    document.body.style.cursor = hotspotAt(e) ? 'pointer' : 'auto'
  }
  const onOut = (e) => {
    e.stopPropagation()
    if (isFocused) {
      document.body.style.cursor = 'auto'
      return
    }
    if (hoveredId === doc.id) setHovered(null)
    document.body.style.cursor = 'auto'
  }
  const onClick = (e) => {
    if (isFocused) {
      // never let a click on the sheet fall through to the scrim behind it
      e.stopPropagation()
      const hit = hotspotAt(e)
      if (!hit) return
      if (hit.type === 'link') openLink(hit.href)
      else if (hit.type === 'next') nextPage(doc.pages.length)
      else prevPage()
      return
    }
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
      onPointerMove={onMove}
      onPointerOut={onOut}
      onClick={onClick}
    >
      <DocProp doc={doc} />
    </group>
  )
}
