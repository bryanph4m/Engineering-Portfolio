import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useSpring } from '@react-spring/three'
import * as THREE from 'three'
import { useSceneStore } from '../store/useSceneStore'
import { photoPlaceholderTexture, softShadowTexture } from '../lib/textures'
import { loadPhotoTexture } from '../lib/photoTexture'
import { consumeTap } from './tapGuard'
import { gallery } from '../content/portfolio'
import { CAMERA, FOCUS_POSE, HOVER_LIFT, PHOTO_FRAME_ID } from './constants'

/**
 * The desk's framed photo, made interactive as a small album. It behaves like
 * a document: hover lifts it, a click floats it up to the same readable focus
 * pose in front of the camera, and while focused you click the left/right half
 * of the picture (or press ←/→) to page through the album. Click away or Esc
 * sets it back down on the desk. It rides the exact same focus machinery the
 * paper documents use — focusedId in the store is set to PHOTO_FRAME_ID, and
 * the current photo reuses the store's pageIndex (nextPage/prevPage), so the
 * arrow keys, HUD hint and click-away scrim all just work.
 *
 * The whole album is data: src/content/portfolio.js `gallery.photos`. The
 * first entry rests in the frame on the desk; the rest appear once picked up.
 * Photos that haven't been dropped in yet fall back to the painted placeholder.
 */

// Camera-to-frame distance at the focus pose — fixed, both poses are.
const FOCUS_DIST = new THREE.Vector3(...FOCUS_POSE.position).distanceTo(
  new THREE.Vector3(...CAMERA.position)
)

const _v = new THREE.Vector3()
const _q = new THREE.Quaternion()

// Physical frame, authored centred on the photo's centre in a local XY plane
// with the picture facing +Z — exactly like a document prop, so it reuses the
// documents' focus quaternion to tilt flat-on to the camera.
const FRAME = { W: 0.72, H: 0.9, B: 0.06, D: 0.05 }
const WOOD = { color: '#4e3823', roughness: 0.72, metalness: 0.05 }

// Resting pose on the desk: leaning back at the rear edge, propped on its
// kickstand. Matches where the static prop used to sit.
const REST = { position: [1.9, 0.46, -3.38], yaw: 0.08, lean: -0.17 }

// Grounded contact shadow — identical treatment to the paper documents
// (Document.jsx). The frame used to cast a real shadow-map shadow, which is
// binary per caster and so vanished the instant the frame lifted out of the
// lamp's shadow frustum on pickup. Instead a soft blob plane is permanently
// mounted on the desk under the frame's foot and its opacity is written every
// frame from the SAME `open`/`hover` springs that drive the frame's motion —
// so it eases out as the frame lifts and back in as it returns, one coordinated
// animation that can never hard-cut. Numbers mirror Document.jsx.
const SHADOW_FADE_END = 0.45
const SHADOW_REST = 0.18 // opacity flat on the desk
const SHADOW_HOVER = 0.28 // extra opacity at full hover lift
// The frame's desk footprint is roughly its width by the depth of its leaned
// body + kickstand — wider and deeper than the picture opening itself.
const SHADOW_SIZE = [FRAME.W * 1.5, 0.82]
const SHADOW_POS = [REST.position[0], 0.0012, REST.position[2] + 0.16]

/**
 * Loads gallery photos into textures, falling back to the placeholder.
 *
 * Only the first photo — the one resting in the frame on the desk — is fetched
 * up front. Every other slot is unreachable until the frame is picked up, so
 * they are deferred to that first pickup and then kept for the session. The
 * album is the desk's only real image download, and on a phone this is the
 * difference between blocking the first frame on the whole set and blocking it
 * on the one picture that's actually visible.
 */
function useGalleryTextures() {
  const placeholder = useMemo(() => photoPlaceholderTexture(), [])
  const list = gallery.photos
  const [textures, setTextures] = useState(() => list.map(() => placeholder))

  // Once the album has been opened it stays loaded: setting the frame back down
  // must not drop photos the visitor can reach again with one tap.
  const opened = useSceneStore((s) => s.focusedId === PHOTO_FRAME_ID)
  const [wantAll, setWantAll] = useState(false)
  useEffect(() => {
    if (opened) setWantAll(true)
  }, [opened])
  const wanted = wantAll ? list.length : Math.min(1, list.length)

  // Aliveness is tracked for the component, not per-effect: `wanted` growing
  // re-runs the effect, and a per-effect flag would strand a photo that was
  // still in flight when the frame was picked up on its placeholder forever.
  const aliveRef = useRef(true)
  useEffect(() => () => { aliveRef.current = false }, [])

  const requested = useRef(new Set())
  useEffect(() => {
    for (let i = 0; i < wanted; i++) {
      if (requested.current.has(i)) continue
      requested.current.add(i)
      loadPhotoTexture(list[i].src, (t) => {
        if (!aliveRef.current) return
        setTextures((prev) => {
          const next = prev.slice()
          next[i] = t
          return next
        })
      })
    }
  }, [list, wanted])

  // An empty gallery still shows one placeholder photo in the frame.
  return textures.length ? textures : [placeholder]
}

export default function PhotoFrame() {
  const groupRef = useRef()
  const kickRef = useRef()
  const shadowMeshRef = useRef()
  const shadowMatRef = useRef()
  const textures = useGalleryTextures()
  const count = textures.length

  const focusedId = useSceneStore((s) => s.focusedId)
  const hoveredId = useSceneStore((s) => s.hoveredId)
  const pageIndex = useSceneStore((s) => s.pageIndex)
  const focus = useSceneStore((s) => s.focus)
  const setHovered = useSceneStore((s) => s.setHovered)
  const nextPage = useSceneStore((s) => s.nextPage)
  const prevPage = useSceneStore((s) => s.prevPage)

  const isFocused = focusedId === PHOTO_FRAME_ID
  const anyFocused = focusedId != null
  const isHovered = hoveredId === PHOTO_FRAME_ID && !anyFocused
  // Rest shows the first photo; picked up, follow the shared page index.
  const displayIndex = isFocused ? Math.min(pageIndex, count - 1) : 0

  // Scale the frame to the same focus height as a document, but never wider
  // than the viewport can show at the focus distance (matches Document.jsx).
  const { width: vw, height: vh } = useThree((s) => s.size)
  const visW = 2 * Math.tan((CAMERA.fov * Math.PI) / 360) * FOCUS_DIST * (vw / vh)
  const focusScale = Math.min(
    FOCUS_POSE.targetHeight / FRAME.H,
    (visW * 0.94) / FRAME.W
  )

  const { restPos, restQuat, focusPos, focusQuat } = useMemo(() => {
    const qLean = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), REST.lean)
    const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), REST.yaw)
    const rq = qYaw.clone().multiply(qLean) // lean the frame back, then yaw it
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
  const [{ hover }, hoverApi] = useSpring(() => ({
    hover: 0,
    config: { tension: 300, friction: 20 },
  }))

  // Seat the frame at its rest pose before the first paint so it never flashes
  // at the origin.
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

    _v.lerpVectors(restPos, focusPos, t)
    _v.y += HOVER_LIFT * hv * (1 - t)
    g.position.copy(_v)

    _q.copy(restQuat).slerp(focusQuat, t)
    g.quaternion.copy(_q)

    const s = THREE.MathUtils.lerp(1 + 0.03 * hv, focusScale, t)
    g.scale.setScalar(s)

    // Contact shadow, read from the very same spring as the motion above:
    // smoothstep the lift fraction so it eases out of rest and settles gently,
    // matching how the frame itself eases (same math as Document.jsx).
    const kf = Math.min(t / SHADOW_FADE_END, 1)
    const fade = 1 - kf * kf * (3 - 2 * kf)
    if (shadowMatRef.current) {
      shadowMatRef.current.opacity = (SHADOW_REST + SHADOW_HOVER * hv) * fade
    }
    if (shadowMeshRef.current) {
      shadowMeshRef.current.scale.setScalar(1 + 0.06 * hv + 0.25 * (1 - fade))
    }

    // The kickstand only makes sense while the frame rests on the desk: fade it
    // out early in the pickup and hide it once the frame is airborne.
    const k = kickRef.current
    if (k) {
      k.visible = t < 0.98
      k.material.transparent = true
      k.material.opacity = 1 - Math.min(t / 0.4, 1)
    }
  })

  /** Which album control a focused pointer event is over, if any. */
  const hotspotAt = (e) => {
    if (e.object?.name !== 'photo-face' || !e.uv || count <= 1) return null
    if (e.uv.x < 0.5) return pageIndex > 0 ? 'prev' : null
    return pageIndex < count - 1 ? 'next' : null
  }

  const onOver = (e) => {
    if (anyFocused) return
    e.stopPropagation()
    setHovered(PHOTO_FRAME_ID)
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
    if (hoveredId === PHOTO_FRAME_ID) setHovered(null)
    document.body.style.cursor = 'auto'
  }
  const onClick = (e) => {
    if (isFocused) {
      e.stopPropagation()
      const hit = hotspotAt(e)
      if (hit === 'next') nextPage(count)
      else if (hit === 'prev') prevPage()
      return
    }
    if (anyFocused) return
    e.stopPropagation()
    document.body.style.cursor = 'auto'
    // Claim the tap so the edge-tap panning stands down (desk/tapGuard) — the
    // frame rests well right of centre and lands under a pan zone on a phone.
    consumeTap()
    focus(PHOTO_FRAME_ID)
  }

  const { W, H, B, D } = FRAME
  return (
    <>
      {/* permanently-mounted contact shadow at the rest footprint — opacity
          animated in useFrame above, never unmounted, so it cannot hard-cut.
          A sibling of the moving frame group, so it stays put on the desk. */}
      <group position={SHADOW_POS} rotation={[0, REST.yaw, 0]}>
        <mesh ref={shadowMeshRef} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={SHADOW_SIZE} />
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
        name={`photo-${PHOTO_FRAME_ID}`}
        onPointerOver={onOver}
        onPointerMove={onMove}
        onPointerOut={onOut}
        onClick={onClick}
      >
        {/* wooden rails, centred on the photo. They deliberately do NOT
            castShadow: like the documents, grounding is the animated blob
            above, so nothing pops when the frame lifts off the desk. */}
        <mesh position={[0, H / 2 - B / 2, 0]}>
          <boxGeometry args={[W, B, D]} />
          <meshStandardMaterial {...WOOD} />
        </mesh>
        <mesh position={[0, -(H / 2 - B / 2), 0]}>
          <boxGeometry args={[W, B, D]} />
          <meshStandardMaterial {...WOOD} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[(s * (W - B)) / 2, 0, 0]}>
            <boxGeometry args={[B, H - 2 * B, D]} />
            <meshStandardMaterial {...WOOD} />
          </mesh>
        ))}

        {/* the picture, recessed just behind the front face of the rails */}
        <mesh name="photo-face" position={[0, 0, D / 2 - 0.012]}>
          <planeGeometry args={[W - 2 * B + 0.02, H - 2 * B + 0.02]} />
          <meshStandardMaterial map={textures[displayIndex]} roughness={0.5} />
        </mesh>

        {/* kickstand strut down to the desk behind the frame — faded on pickup */}
        <mesh ref={kickRef} position={[0, -0.14, -0.22]} rotation={[0.267, 0, 0]}>
          <boxGeometry args={[0.09, 0.63, 0.016]} />
          <meshStandardMaterial {...WOOD} />
        </mesh>
      </group>
    </>
  )
}
