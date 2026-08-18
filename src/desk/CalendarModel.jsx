import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useSpring } from '@react-spring/three'
import { useSceneStore } from '../store/useSceneStore'
import { calendarFaceTexture, softShadowTexture } from '../lib/textures'
import { consumeTap } from './tapGuard'
import { HOVER_LIFT, CALENDAR_ID } from './constants'

/**
 * A standing wirebound desk calendar, propped up on a kickstand between the
 * coffee mug and the drafting triangle — same reference silhouette as a
 * standard tabletop flip calendar (wire-bound pad + easel back), built the
 * same way PhotoFrame is: rails + face + a kickstand strut that fades out on
 * pickup. Picked up like the photo frame and the rocket: hover lifts it, a
 * click focuses it. Unlike either of them it has no content of its own to
 * read once focused — the actual booking UI is a real DOM overlay
 * (ui/CalendarBooking), gated on the same focusedId — so this model stays
 * idle-cost-near-zero for the whole session: one small static texture, no
 * new light, no armed/detail plane (see RocketModel's header for why a
 * mid-session light mount is the thing to avoid).
 */

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

  const [{ open }, openApi] = useSpring(() => ({ open: 0, config: { tension: 170, friction: 22 } }))
  const [{ hover }, hoverApi] = useSpring(() => ({ hover: 0, config: { tension: 300, friction: 20 } }))

  useLayoutEffect(() => {
    const g = groupRef.current
    if (!g) return
    g.position.set(...REST.position)
    g.rotation.set(REST.lean, REST.yaw, 0)
  }, [])

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
    // A small, honest "picked up" motion — lift and tilt further toward the
    // camera from its resting lean — rather than the paper documents' full
    // reading pose: nothing on the calendar itself is worth reading up
    // close, the real content is the DOM overlay that opens alongside this.
    g.position.set(
      REST.position[0],
      REST.position[1] + HOVER_LIFT * hv * (1 - t) + 0.22 * t,
      REST.position[2] - 0.12 * t
    )
    g.rotation.set(REST.lean + (-0.35 - REST.lean) * t, REST.yaw, 0)
    g.scale.setScalar(1 + 0.03 * hv + 0.08 * t)

    if (shadowMatRef.current) {
      shadowMatRef.current.opacity = (0.16 + 0.1 * hv) * (1 - 0.6 * t)
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
        <mesh castShadow={false}>
          <boxGeometry args={[W, H, D]} />
          <meshStandardMaterial {...WOOD} />
        </mesh>
        {/* printed calendar face, recessed just in front of the backing */}
        <mesh position={[0, 0, D / 2 + 0.001]}>
          <planeGeometry args={[W * 0.94, H * 0.94]} />
          <meshStandardMaterial map={faceTex} roughness={0.6} />
        </mesh>
        {/* wire-bound spine along the top edge */}
        <mesh position={[0, H / 2 - 0.02, D / 2 + 0.012]}>
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
