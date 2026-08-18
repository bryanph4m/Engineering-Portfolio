import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useSpring } from '@react-spring/three'
import * as THREE from 'three'
import { useSceneStore } from '../store/useSceneStore'
import { calendarFaceTexture, softShadowTexture } from '../lib/textures'
import { consumeTap } from './tapGuard'
import { CAMERA, FOCUS_POSE, HOVER_LIFT, CALENDAR_ID } from './constants'

/**
 * A standing wirebound desk calendar, propped up on a kickstand between the
 * coffee mug and the drafting triangle — same reference silhouette as a
 * standard tabletop flip calendar (wire-bound pad + easel back), built the
 * same way PhotoFrame is: rails + face + a kickstand strut that fades out on
 * pickup. Picked up exactly like the photo frame and the rocket: hover lifts
 * it, a click floats it up to the shared FOCUS_POSE in front of the camera —
 * the same "brought up close to the screen" motion every other prop on this
 * desk uses, so this one doesn't read as a different interaction. Unlike the
 * photo frame it has no content of its own worth reading up close; the real
 * UI is a DOM overlay (ui/CalendarBooking) that fades in over the tail of
 * this same flight, gated on the same focusedId. The panel itself fades out
 * over that same last stretch (see the `panelFade` read in useFrame below),
 * so the physical prop hands off to the DOM card instead of sitting behind
 * it at full size — the two never read as separate, stacked calendars. That
 * overlay is what keeps this model idle-cost-near-zero for the whole
 * session: one small static texture, no new light, no armed/detail plane
 * (see RocketModel's header for why a mid-session light mount is the thing
 * to avoid).
 */

// Camera-to-panel distance at the focus pose — fixed, both poses are.
const FOCUS_DIST = new THREE.Vector3(...FOCUS_POSE.position).distanceTo(
  new THREE.Vector3(...CAMERA.position)
)
const TAN_HALF_FOV = Math.tan((CAMERA.fov * Math.PI) / 360)

const _v = new THREE.Vector3()
const _q = new THREE.Quaternion()

// The face texture (lib/textures.js calendarFaceTexture) is a 384x480 canvas
// — panel proportions match that 4:5 aspect exactly rather than stretching it.
const PANEL = { W: 0.85, H: 1.0625, D: 0.04 }
const WOOD = { color: '#4e3823', roughness: 0.72, metalness: 0.05 }
const SPINE = { color: '#3a3a3f', roughness: 0.35, metalness: 0.6 } // wire-bound spine bar

// Resting pose on the desk: leaning back on its kickstand, standing between
// the coffee mug (x=3.7, z=0.4 — in Clutter.jsx) and the drafting triangle
// (x=3.75, z=-1.35), so this sits at the same x with z between the two.
// Re-check with window.__deskLayoutAudit() after any nudge — see
// documents/registry.js's placement comment for why.
const REST = { position: [3.72, 0.53, -0.5], yaw: -0.12, lean: -0.16 }

const SHADOW_SIZE = [PANEL.W * 1.5, 0.85]
const SHADOW_POS = [REST.position[0], 0.0012, REST.position[2] + 0.14]

export default function CalendarModel() {
  const groupRef = useRef()
  const kickRef = useRef()
  const boardRef = useRef()
  const faceRef = useRef()
  const spineRef = useRef()
  const shadowMatRef = useRef()
  const faceTex = useMemo(() => calendarFaceTexture(), [])
  const shadowTex = useMemo(() => softShadowTexture(), [])

  const focusedId = useSceneStore((s) => s.focusedId)
  const hoveredId = useSceneStore((s) => s.hoveredId)
  const focus = useSceneStore((s) => s.focus)
  const setHovered = useSceneStore((s) => s.setHovered)

  const isFocused = focusedId === CALENDAR_ID
  const anyFocused = focusedId != null
  const isHovered = hoveredId === CALENDAR_ID && !anyFocused

  // Scale the panel to the same focus height as a document, but never wider
  // than the viewport can show at the focus distance (matches Document.jsx /
  // PhotoFrame.jsx).
  const { width: vw, height: vh } = useThree((s) => s.size)
  const visH = 2 * TAN_HALF_FOV * FOCUS_DIST
  const visW = visH * (vw / vh)
  const focusScale = Math.min(FOCUS_POSE.targetHeight / PANEL.H, (visW * 0.94) / PANEL.W)

  const { restPos, restQuat, focusPos, focusQuat } = useMemo(() => {
    const qLean = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), REST.lean)
    const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), REST.yaw)
    const rq = qYaw.clone().multiply(qLean) // lean the panel back, then yaw it
    const fq = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(FOCUS_POSE.rotation[0], FOCUS_POSE.rotation[1], FOCUS_POSE.rotation[2])
    )
    return {
      restPos: new THREE.Vector3(...REST.position),
      restQuat: rq,
      focusPos: new THREE.Vector3(...FOCUS_POSE.position),
      focusQuat: fq,
    }
  }, [])

  const [{ open }, openApi] = useSpring(() => ({
    open: 0,
    config: { tension: 150, friction: 24 },
  }))
  const [{ hover }, hoverApi] = useSpring(() => ({ hover: 0, config: { tension: 300, friction: 20 } }))

  // Seat the panel at its rest pose before the first paint so it never
  // flashes at the origin (matches PhotoFrame.jsx).
  useLayoutEffect(() => {
    const g = groupRef.current
    if (!g) return
    g.position.copy(restPos)
    g.quaternion.copy(restQuat)
    g.scale.setScalar(1)
  }, [restPos, restQuat])

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

    // Same rest -> focus interpolation as Document.jsx / PhotoFrame.jsx: this
    // panel gets brought up close to the screen exactly like every other
    // pickable prop on the desk, even though there's nothing on its face
    // worth reading once it arrives — the DOM overlay is the payload.
    _q.copy(restQuat).slerp(focusQuat, t)
    g.quaternion.copy(_q)

    _v.lerpVectors(restPos, focusPos, t)
    _v.y += HOVER_LIFT * hv * (1 - t)
    g.position.copy(_v)

    const s = THREE.MathUtils.lerp(1 + 0.03 * hv, focusScale, t)
    g.scale.setScalar(s)

    // The panel itself has nothing worth reading up close (see the header) —
    // the DOM booking card is the actual content, and it fades in over the
    // tail of this same flight (index.css's cal-panel-in). Without this, the
    // physical panel arrives at full size right as the card appears, and the
    // two sit stacked on screen reading as two separate calendars. Fading
    // the panel out over the flight's own last third hands off to the card
    // instead of competing with it, so only one is ever visible at rest.
    const panelFade = 1 - THREE.MathUtils.clamp((t - 0.7) / 0.3, 0, 1)
    for (const ref of [boardRef, faceRef, spineRef]) {
      const m = ref.current?.material
      if (!m) continue
      m.transparent = true
      m.opacity = panelFade
    }

    if (shadowMatRef.current) {
      shadowMatRef.current.opacity = (0.16 + 0.1 * hv) * (1 - 0.6 * t) * panelFade
    }
    // The kickstand only makes sense while the calendar rests on the desk —
    // fade it out early in the pickup and hide it once airborne, exactly
    // like PhotoFrame's.
    const k = kickRef.current
    if (k) {
      k.visible = t < 0.98
      k.material.transparent = true
      k.material.opacity = 1 - Math.min(t / 0.4, 1)
    }
  })

  const onOver = (e) => {
    if (anyFocused) return
    e.stopPropagation()
    setHovered(CALENDAR_ID)
    document.body.style.cursor = 'pointer'
  }
  const onOut = (e) => {
    e.stopPropagation()
    if (hoveredId === CALENDAR_ID) setHovered(null)
    document.body.style.cursor = 'auto'
  }
  const onClick = (e) => {
    if (anyFocused) return
    e.stopPropagation()
    // Claim the tap so the edge-tap panning stands down (desk/tapGuard) — the
    // same reason PhotoFrame/RocketModel do this.
    consumeTap()
    focus(CALENDAR_ID)
  }

  const { W, H, D } = PANEL
  return (
    <>
      {/* permanently-mounted contact shadow, opacity animated above — never
          unmounted, so it cannot hard-cut (matches PhotoFrame/Document). */}
      <group position={SHADOW_POS} rotation={[0, REST.yaw, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={SHADOW_SIZE} />
          <meshBasicMaterial
            ref={shadowMatRef}
            map={shadowTex}
            transparent
            opacity={0.16}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
      </group>
      <group
        ref={groupRef}
        name={`prop-${CALENDAR_ID}`}
        onPointerOver={onOver}
        onPointerOut={onOut}
        onClick={onClick}
      >
        {/* wooden backing board — does not castShadow, like the photo frame's
            rails: grounding is the animated blob above, so nothing pops on
            pickup */}
        <mesh ref={boardRef} castShadow={false}>
          <boxGeometry args={[W, H, D]} />
          <meshStandardMaterial {...WOOD} />
        </mesh>
        {/* printed calendar face, recessed just in front of the backing */}
        <mesh ref={faceRef} position={[0, 0, D / 2 + 0.001]}>
          <planeGeometry args={[W * 0.94, H * 0.94]} />
          <meshStandardMaterial map={faceTex} roughness={0.6} />
        </mesh>
        {/* wire-bound spine along the top edge */}
        <mesh ref={spineRef} position={[0, H / 2 - 0.02, D / 2 + 0.012]}>
          <boxGeometry args={[W * 0.96, 0.04, 0.024]} />
          <meshStandardMaterial {...SPINE} />
        </mesh>
        {/* kickstand strut down to the desk behind the panel — faded on pickup */}
        <mesh ref={kickRef} position={[0, -0.15, -0.26]} rotation={[0.26, 0, 0]}>
          <boxGeometry args={[0.09, 0.71, 0.018]} />
          <meshStandardMaterial {...WOOD} />
        </mesh>
      </group>
    </>
  )
}
