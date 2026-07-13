import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useSpring } from '@react-spring/three'
import * as THREE from 'three'
import { useSceneStore } from '../store/useSceneStore'
import { photoPlaceholderTexture } from '../lib/textures'
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

/** Loads each gallery photo into a texture, falling back to the placeholder. */
function useGalleryTextures() {
  const placeholder = useMemo(() => photoPlaceholderTexture(), [])
  const list = gallery.photos
  const [textures, setTextures] = useState(() => list.map(() => placeholder))
  useEffect(() => {
    let alive = true
    const loader = new THREE.TextureLoader()
    list.forEach((p, i) => {
      loader.load(
        p.src,
        (t) => {
          if (!alive) return
          t.colorSpace = THREE.SRGBColorSpace
          t.anisotropy = 8
          setTextures((prev) => {
            const next = prev.slice()
            next[i] = t
            return next
          })
        },
        undefined,
        () => {} // not dropped in yet — keep the placeholder for this slot
      )
    })
    return () => {
      alive = false
    }
  }, [list])
  // An empty gallery still shows one placeholder photo in the frame.
  return textures.length ? textures : [placeholder]
}

export default function PhotoFrame() {
  const groupRef = useRef()
  const kickRef = useRef()
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
    focus(PHOTO_FRAME_ID)
  }

  const { W, H, B, D } = FRAME
  return (
    <group
      ref={groupRef}
      name={`photo-${PHOTO_FRAME_ID}`}
      onPointerOver={onOver}
      onPointerMove={onMove}
      onPointerOut={onOut}
      onClick={onClick}
    >
      {/* wooden rails, centred on the photo */}
      <mesh castShadow position={[0, H / 2 - B / 2, 0]}>
        <boxGeometry args={[W, B, D]} />
        <meshStandardMaterial {...WOOD} />
      </mesh>
      <mesh castShadow position={[0, -(H / 2 - B / 2), 0]}>
        <boxGeometry args={[W, B, D]} />
        <meshStandardMaterial {...WOOD} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} castShadow position={[(s * (W - B)) / 2, 0, 0]}>
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
      <mesh ref={kickRef} castShadow position={[0, -0.14, -0.22]} rotation={[0.267, 0, 0]}>
        <boxGeometry args={[0.09, 0.63, 0.016]} />
        <meshStandardMaterial {...WOOD} />
      </mesh>
    </group>
  )
}
