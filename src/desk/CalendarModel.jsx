import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useSpring } from '@react-spring/three'
import { useSceneStore } from '../store/useSceneStore'
import { calendarFaceTexture, softShadowTexture } from '../lib/textures'
import { consumeTap } from './tapGuard'
import { HOVER_LIFT, CALENDAR_ID } from './constants'

/**
 * A small desk calendar block, picked up like the photo frame and the
 * rocket: hover lifts it, a click focuses it. Unlike either of them it has
 * no content of its own to read once focused — the actual booking UI is a
 * real DOM overlay (ui/CalendarBooking), gated on the same focusedId — so
 * this model stays idle-cost-near-zero for the whole session: one small
 * static texture, no new light, no armed/detail plane (see RocketModel's
 * header for why a mid-session light mount is the thing to avoid).
 */

const BLOCK = { w: 0.46, d: 0.36, h: 0.14 }
const WOOD = { color: '#4e3823', roughness: 0.72, metalness: 0.05 }

// Resting pose on the desk. Re-check with window.__deskLayoutAudit() after
// any nudge — see documents/registry.js's placement comment for why.
const REST = { position: [-0.9, BLOCK.h / 2, 2.6], yaw: 0.1 }

const SHADOW_SIZE = [BLOCK.w * 1.35, BLOCK.d * 1.6]
const SHADOW_POS = [REST.position[0], 0.0012, REST.position[2]]

export default function CalendarModel() {
  const groupRef = useRef()
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
    g.rotation.set(0, REST.yaw, 0)
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
    // A small, honest "picked up" motion — lift and tilt slightly toward the
    // camera — rather than the paper documents' full reading pose: nothing on
    // the calendar itself is worth reading up close, the real content is the
    // DOM overlay that opens alongside this.
    g.position.set(
      REST.position[0],
      REST.position[1] + HOVER_LIFT * hv * (1 - t) + 0.22 * t,
      REST.position[2] - 0.12 * t
    )
    g.rotation.set(-0.35 * t, REST.yaw, 0)
    g.scale.setScalar(1 + 0.03 * hv + 0.08 * t)

    if (shadowMatRef.current) {
      shadowMatRef.current.opacity = (0.16 + 0.1 * hv) * (1 - 0.6 * t)
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

  const { w, d, h } = BLOCK
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
        {/* base block — does not castShadow, like the photo frame's rails:
            grounding is the animated blob above, so nothing pops on pickup */}
        <mesh castShadow={false}>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial {...WOOD} />
        </mesh>
        {/* painted face, flat on top */}
        <mesh position={[0, h / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w * 0.94, d * 0.94]} />
          <meshStandardMaterial map={faceTex} roughness={0.6} />
        </mesh>
      </group>
    </>
  )
}
