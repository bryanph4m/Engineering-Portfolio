import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useSpring } from '@react-spring/three'
import * as THREE from 'three'
import { useSceneStore } from '../store/useSceneStore'
import { docLinks } from '../lib/docTextures'
import { softShadowTexture } from '../lib/textures'
import { consumeTap } from './tapGuard'
import { setSheetExtent, zoomState } from './docZoom'
import { DocProp } from './props'
import Polaroids from './Polaroids'
import { CAMERA, FOCUS_POSE, HOVER_LIFT } from './constants'

// Camera-to-sheet distance at the focused pose; fixed because both poses are.
const FOCUS_DIST = new THREE.Vector3(...FOCUS_POSE.position).distanceTo(
  new THREE.Vector3(...CAMERA.position)
)

const _v = new THREE.Vector3()
const _q = new THREE.Quaternion()
// Scratch for the zoom pan's local axes, reused so a pinched sheet allocates
// nothing per frame.
const _ax = new THREE.Vector3()
const _ay = new THREE.Vector3()

// Half the vertical fov, pre-tanned: turns the focus distance into the world
// height the camera can see there, which is the scale factor between docZoom's
// viewport-fraction offsets and world metres.
const TAN_HALF_FOV = Math.tan((CAMERA.fov * Math.PI) / 360)

// Fraction of the sheet, measured from each bottom corner, that acts as the
// page-turn hotspot on a focused multi-page document. Matches the dog-eared
// corners painted by pageChrome in docTextures.js.
const PAGE_CORNER = 0.16

// Grounded contact shadow: documents don't cast real shadow-map shadows
// (those are binary per caster — they can only pop). Instead a soft blob
// plane sits permanently mounted at each document's rest footprint, and its
// opacity is written every frame from the SAME `open`/`hover` spring values
// that drive the paper's position — one progress value, one easing, nothing
// ever mounts or unmounts. It is fully faded by SHADOW_FADE_END of the
// pickup and eases back in over the same slice of the return.
const SHADOW_FADE_END = 0.45
const SHADOW_REST = 0.16 // opacity flat on the desk (soft ambient rim)
const SHADOW_HOVER = 0.3 // extra opacity at full hover lift
const SHADOW_PAD = 1.22 // blob plane size relative to the paper footprint

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
  // pageIndex is read on demand inside hotspotAt (a pointer handler), not
  // subscribed: a page flip only concerns the one focused document, so
  // subscribing here would re-render all five documents on every turn for
  // nothing. The prop mesh reads pageIndex through its own subscription.
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
  const visH = 2 * TAN_HALF_FOV * FOCUS_DIST
  const visW = visH * (vw / vh)
  const focusScale = Math.min(
    FOCUS_POSE.targetHeight / doc.paper.h,
    (visW * 0.94) / doc.paper.w
  )

  // Tell docZoom how much of the view this sheet fills, so a pinch's pan can be
  // clamped to the paper's own edges. Only the focused sheet's extent matters,
  // and only one thing is ever focused.
  useEffect(() => {
    if (!isFocused) return
    setSheetExtent((doc.paper.w * focusScale) / visW, (doc.paper.h * focusScale) / visH)
  }, [isFocused, doc.paper.w, doc.paper.h, focusScale, visW, visH])

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

  const shadowMeshRef = useRef()
  const shadowMatRef = useRef()

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

    // Pinch-to-zoom (touch only). With no second finger this is a flat
    // {scale: 1, x: 0, y: 0}, so every line below collapses to exactly what it
    // computed before any of this existed — which is what keeps mouse and
    // keyboard behaviour unchanged rather than merely similar. Both the scale
    // and the pan are gated by the pickup progress `t` (the scale through the
    // lerp below, the pan explicitly), so a sheet that is still on its way up
    // cannot arrive pre-magnified.
    const z = zoomState()

    // orientation: slerp between the two poses
    _q.copy(restQuat).slerp(focusQuat, t)
    g.quaternion.copy(_q)

    // position: lerp rest -> focus, plus a hover lift while resting
    _v.lerpVectors(restPos, focusPos, t)
    _v.y += HOVER_LIFT * hv * (1 - t)
    // …then slide along the sheet's own plane by the pinch's pan. The sheet is
    // tilted flat-on to the camera at focus, so its local X/Y read as screen
    // right/up; docZoom's offsets are fractions of what the camera sees at this
    // distance, so multiplying by that visible size makes the paper track the
    // fingers exactly, on any viewport.
    if (z.x !== 0 || z.y !== 0) {
      _ax.set(1, 0, 0).applyQuaternion(_q)
      _ay.set(0, 1, 0).applyQuaternion(_q)
      _v.addScaledVector(_ax, z.x * visW * t)
      _v.addScaledVector(_ay, z.y * visH * t)
    }
    g.position.copy(_v)

    // scale: 1 on the desk -> focusScale in hand, with a tiny hover pop
    const s = THREE.MathUtils.lerp(1 + 0.03 * hv, focusScale * z.scale, t)
    g.scale.setScalar(s)

    // Contact shadow, from the very same spring reads as the motion above:
    // smoothstep the lift fraction so the fade accelerates out of rest and
    // settles gently, matching how the paper itself eases.
    const k = Math.min(t / SHADOW_FADE_END, 1)
    const fade = 1 - k * k * (3 - 2 * k)
    if (shadowMatRef.current) {
      shadowMatRef.current.opacity = (SHADOW_REST + SHADOW_HOVER * hv) * fade
    }
    if (shadowMeshRef.current) {
      // spread slightly as the sheet rises, like a real softening shadow
      shadowMeshRef.current.scale.setScalar(1 + 0.06 * hv + 0.25 * (1 - fade))
    }
  })

  /** What a pointer event on the focused sheet is aimed at, if anything. */
  const hotspotAt = (e) => {
    if (e.object?.name !== 'page-face' || !e.uv) return null
    const u = e.uv.x
    const v = 1 - e.uv.y // canvas space: v runs top -> bottom
    const pageIndex = useSceneStore.getState().pageIndex
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

  // Scheme allowlist: painted hotspots are first-party content, but nothing
  // downstream should ever be able to smuggle a javascript:/data: URL into a
  // click handler. Same-origin paths and https/mailto only.
  const openLink = (href) => {
    if (href.startsWith('mailto:')) {
      window.location.href = href
    } else if (href.startsWith('https://') || href.startsWith('/')) {
      window.open(href, '_blank', 'noopener,noreferrer')
    } else if (import.meta.env.DEV) {
      console.warn(`[doc-link] blocked non-allowlisted URL: ${href}`)
    }
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
    // Deliberately NOT gated on the return animation. A sheet on its way back
    // to the desk sweeps across a wide slice of it — the blueprint passes right
    // over the projects stack — so for a few hundred ms after clicking away, a
    // click aimed at another document can land on the one still in flight and
    // reopen it. That was tried and reverted: making the returning sheet
    // click-through fixes it only by making a click on the sheet's OWN pixels do
    // nothing at all, and a silent no-op is strictly worse than an obvious wrong
    // pickup you can see happen and undo. Both are sub-second and both are
    // self-explanatory on screen, which is the bar the two real bugs here
    // (desk/FocusScrim, desk/RocketModel's page) did not clear.
    e.stopPropagation()
    document.body.style.cursor = 'auto'
    // Claim the tap so the edge-tap panning stands down: this document may be
    // sitting over a pan zone, and picking it up must win (desk/tapGuard).
    consumeTap()
    focus(doc.id)
  }

  return (
    <>
      {/* permanently-mounted contact shadow at the rest footprint — opacity
          animated in useFrame above, never unmounted, so it cannot hard-cut */}
      <group
        position={[doc.rest.position[0], 0.0012, doc.rest.position[2]]}
        rotation={[0, doc.rest.yaw || 0, 0]}
      >
        <mesh ref={shadowMeshRef} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[doc.paper.w * SHADOW_PAD, doc.paper.h * SHADOW_PAD]} />
          <meshBasicMaterial
            ref={shadowMatRef}
            map={softShadowTexture()}
            transparent
            opacity={SHADOW_REST}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
      </group>
      <group
        ref={groupRef}
        name={`doc-${doc.id}`}
        onPointerOver={onOver}
        onPointerMove={onMove}
        onPointerOut={onOut}
        onClick={onClick}
      >
        <DocProp doc={doc} />
        {/* bare polaroids pinned to the pages their photos flowed onto; they
            ride this group's pickup/scale and are raycast-transparent so they
            never block a page flip (src/desk/Polaroids.jsx) */}
        <Polaroids doc={doc} />
      </group>
    </>
  )
}
