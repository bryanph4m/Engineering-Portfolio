import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useSpring } from '@react-spring/three'
import * as THREE from 'three'
import { useSceneStore } from '../store/useSceneStore'
import { useBookingStore } from '../store/useBookingStore'
import { softShadowTexture } from '../lib/textures'
import { calendarFaceTexture, paintCalendarSheet } from '../lib/calendarFace'
import { consumeTap } from './tapGuard'
import { CAMERA, FOCUS_POSE, HOVER_LIFT, CALENDAR_ID } from './constants'

/**
 * A standing wirebound desk calendar, propped up on a kickstand between the
 * coffee mug and the drafting triangle — same reference silhouette as a
 * standard tabletop flip calendar (wire-bound pad + easel back), built the
 * same way PhotoFrame is: rails + face + a kickstand strut that fades out on
 * pickup. Picked up exactly like the photo frame and the rocket: hover lifts
 * it, a click floats it up to the shared FOCUS_POSE in front of the camera.
 *
 * Unlike the earlier version of this file, the model's own face IS the
 * booking UI now — the month grid, the slot list and the confirmation
 * screen are painted straight onto its canvas texture and hit-tested by UV
 * (lib/calendarFace), the same way every paper document paints and clicks
 * its own content (lib/docTextures, Document.jsx's hotspotAt) and the way
 * RocketModel's component page turns on painted corners. Handing that off to
 * a separate floating DOM card — which is what this file used to do — meant
 * a physical panel and an independent interactive card were both on screen
 * at once, reading as two calendars rather than one prop with a face. Only
 * name and email still surface as DOM (ui/CalendarBooking): a canvas has no
 * way to give a visitor a real, focusable, autofill-able text field, so that
 * one step — and only that step — drops into a small DOM form while the
 * model itself stays put showing what was picked.
 */

// Camera-to-panel distance at the focus pose — fixed, both poses are.
const FOCUS_DIST = new THREE.Vector3(...FOCUS_POSE.position).distanceTo(
  new THREE.Vector3(...CAMERA.position)
)
const TAN_HALF_FOV = Math.tan((CAMERA.fov * Math.PI) / 360)

const _v = new THREE.Vector3()
const _q = new THREE.Quaternion()

// The face texture (lib/calendarFace.js) is a 960x1200 canvas — panel
// proportions match that 4:5 aspect exactly rather than stretching it.
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

// Same allowlist Document.jsx's openLink enforces: painted hotspots are
// first-party content, but nothing downstream should be able to smuggle a
// javascript:/data: URL into a click handler. Cal.com's cancel link is
// https, but the check costs nothing and keeps the two files agreeing.
function openSafeLink(href) {
  if (href.startsWith('https://') || href.startsWith('/')) {
    window.open(href, '_blank', 'noopener,noreferrer')
  } else if (import.meta.env.DEV) {
    console.warn(`[calendar-link] blocked non-allowlisted URL: ${href}`)
  }
}

export default function CalendarModel() {
  const groupRef = useRef()
  const kickRef = useRef()
  const faceRef = useRef()
  const shadowMatRef = useRef()
  const regionsRef = useRef([])
  const shadowTex = useMemo(() => softShadowTexture(), [])
  const faceTex = useMemo(() => calendarFaceTexture(), [])

  const focusedId = useSceneStore((s) => s.focusedId)
  const hoveredId = useSceneStore((s) => s.hoveredId)
  const focus = useSceneStore((s) => s.focus)
  const close = useSceneStore((s) => s.close)
  const setHovered = useSceneStore((s) => s.setHovered)

  const isFocused = focusedId === CALENDAR_ID
  const anyFocused = focusedId != null
  const isHovered = hoveredId === CALENDAR_ID && !anyFocused

  const viewYM = useBookingStore((s) => s.viewYM)
  const selectedDate = useBookingStore((s) => s.selectedDate)
  const slots = useBookingStore((s) => s.slots)
  const loadingSlots = useBookingStore((s) => s.loadingSlots)
  const selectedSlot = useBookingStore((s) => s.selectedSlot)
  const error = useBookingStore((s) => s.error)
  const confirmation = useBookingStore((s) => s.confirmation)
  const resetBooking = useBookingStore((s) => s.reset)

  // Full reset whenever the panel closes, so the next open always starts
  // fresh rather than resuming a half-finished booking from last time.
  useEffect(() => {
    if (!isFocused) resetBooking()
  }, [isFocused, resetBooking])

  // Repaint the face whenever what it should show changes. isDayBookable /
  // canGoPrev / canGoNext / monthDays are cheap pure functions of the state
  // above (see useBookingStore) — calling them here, not subscribing to
  // them, is what keeps this list to the fields that actually vary.
  useEffect(() => {
    const s = useBookingStore.getState()
    regionsRef.current = paintCalendarSheet({
      viewYM,
      monthDays: s.monthDays(),
      isDayBookable: s.isDayBookable,
      canGoPrev: s.canGoPrev(),
      canGoNext: s.canGoNext(),
      selectedDate,
      slots,
      loadingSlots,
      selectedSlot,
      error,
      confirmation,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewYM, selectedDate, slots, loadingSlots, selectedSlot, error, confirmation])

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

    // Rest -> focus interpolation, same as Document.jsx / PhotoFrame.jsx.
    // Unlike the earlier version of this file, the panel is the payload now
    // (it's what gets read and clicked), so it stays fully opaque through
    // the whole flight rather than dissolving into a DOM card at the end.
    _q.copy(restQuat).slerp(focusQuat, t)
    g.quaternion.copy(_q)

    _v.lerpVectors(restPos, focusPos, t)
    _v.y += HOVER_LIFT * hv * (1 - t)
    g.position.copy(_v)

    const s = THREE.MathUtils.lerp(1 + 0.03 * hv, focusScale, t)
    g.scale.setScalar(s)

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

  /** Which painted region, if any, a pointer event on the focused face landed
   *  on — mirrors RocketModel's cornerAt / Document.jsx's hotspotAt. */
  const regionAt = (e) => {
    if (!e.uv) return null
    const u = e.uv.x
    const v = 1 - e.uv.y // canvas space: v runs top -> bottom, matches calendarFace's pxRegion
    return regionsRef.current.find((r) => u >= r.u0 && u <= r.u1 && v >= r.v0 && v <= r.v1) || null
  }

  const onFaceMove = (e) => {
    if (!isFocused) return
    document.body.style.cursor = regionAt(e) ? 'pointer' : 'auto'
  }
  const onFaceClick = (e) => {
    // Not focused yet: let the click bubble up to the group's onClick and
    // pick the calendar up, same as clicking the board or spine.
    if (!isFocused) return
    const hit = regionAt(e)
    // A miss is the same as clicking the desk around the panel: fall through
    // to the scrim and close it, matching every paper document's own
    // click-off behaviour (Document.jsx's onClick).
    if (!hit) return
    e.stopPropagation()
    const b = useBookingStore.getState()
    switch (hit.action) {
      case 'close':
        close()
        break
      case 'prevMonth':
        b.goPrevMonth()
        break
      case 'nextMonth':
        b.goNextMonth()
        break
      case 'selectDate':
        b.selectDate(hit.day)
        break
      case 'selectSlot':
        b.selectSlot(hit.iso)
        break
      case 'backToCalendar':
        b.backToCalendar()
        break
      case 'backToSlots':
        b.backToSlots()
        break
      case 'cancel':
        openSafeLink(hit.href)
        break
      default:
        break
    }
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
        {/* the calendar's own face — painted and hit-tested by lib/calendarFace,
            clickable only while focused (onFaceClick no-ops and lets the click
            bubble to pick-up otherwise) */}
        <mesh ref={faceRef} position={[0, 0, D / 2 + 0.001]} onPointerMove={onFaceMove} onClick={onFaceClick}>
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
