import { Suspense, useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera, AdaptiveDpr, Preload } from '@react-three/drei'
import * as THREE from 'three'
import { useSceneStore } from '../store/useSceneStore'
import { QUALITY } from '../lib/quality'
import { PERF_HOOK } from '../lib/perfHook'
import { CAMERA } from './constants'
import Desk from './Desk'
import DeskLamp from './DeskLamp'
import Clutter from './Clutter'
import Documents from './Documents'
import PhotoFrame from './PhotoFrame'
import RocketModel from './RocketModel'
import CalendarModel from './CalendarModel'
import FocusScrim from './FocusScrim'
import CameraRig from './CameraRig'
import TouchControls from './TouchControls'
import DevLayoutAudit from './DevLayoutAudit'
import DeskAtmosphere from './DeskAtmosphere'

/**
 * Flags the store once the canvas has really put frames on screen (shaders
 * compiled, first paints done). The loading screen's fade-out is gated on
 * this so it crossfades into a drawn desk, not a black canvas mid-compile.
 */
function FirstFramesGate() {
  const setSceneDrawn = useSceneStore((s) => s.setSceneDrawn)
  const frames = useRef(0)
  useFrame(() => {
    if (frames.current > 2) return
    frames.current += 1
    if (frames.current > 2) setSceneDrawn(true)
  })
  return null
}

/**
 * Bakes the shadow map once, then freezes it. The desk is a static set — the
 * lamp and every shadow-casting prop are fixed, and the documents deliberately
 * cast no shadow (Document.jsx grounds them with an animated contact plane).
 * So the shadow map is identical every frame; re-rendering all ~110 casters
 * into the 1024² depth map on every frame is pure waste. We let it auto-update
 * for the first frames (covering the async font-swap texture repaints and the
 * scene settling under Suspense), then force one final bake and switch
 * autoUpdate off. Nothing in the scene ever invalidates it afterward.
 */
function ShadowBake({ frames = 20 }) {
  const gl = useThree((s) => s.gl)
  const n = useRef(0)
  useFrame(() => {
    if (!gl.shadowMap.autoUpdate) return
    n.current += 1
    if (n.current >= frames) {
      gl.shadowMap.needsUpdate = true // one last bake this frame…
      gl.shadowMap.autoUpdate = false // …then never again
    }
  })
  return null
}

const FACETED_GEOMETRY = /Cylinder|Cone|Sphere|Torus|Lathe|Polyhedron/

function createWearTexture() {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  const image = context.createImageData(size, size)
  let seed = 0x1a2b3c4d
  const random = () => {
    seed = (1664525 * seed + 1013904223) >>> 0
    return seed / 0x100000000
  }

  for (let i = 0; i < image.data.length; i += 4) {
    const value = 158 + Math.floor(random() * 82)
    image.data[i] = value
    image.data[i + 1] = value
    image.data[i + 2] = value
    image.data[i + 3] = 255
  }
  context.putImageData(image, 0, 0)
  context.strokeStyle = 'rgba(255, 255, 255, 0.34)'
  context.lineWidth = 0.65
  for (let i = 0; i < 12; i += 1) {
    const x = random() * size
    const y = random() * size
    context.beginPath()
    context.moveTo(x, y)
    context.lineTo(x + 5 + random() * 17, y - 2 + random() * 4)
    context.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.NoColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2.6, 2.6)
  texture.anisotropy = 2
  return texture
}

/**
 * Gives the hand-built primitives one shared physical language. Curved metal
 * and painted props get the slightly faceted silhouettes seen in carved game
 * pieces, while a tiny reusable wear texture breaks up otherwise perfect CGI
 * highlights. Image-bearing paper and photos are deliberately left alone.
 */
function SceneSurfaceTreatment() {
  const scene = useThree((state) => state.scene)
  const wearTexture = useMemo(createWearTexture, [])

  useLayoutEffect(() => {
    const original = new Map()

    scene.traverse((object) => {
      if (!object.isMesh) return
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      const faceted = FACETED_GEOMETRY.test(object.geometry?.type ?? '')

      materials.forEach((material) => {
        if (!material?.isMeshStandardMaterial && !material?.isMeshPhysicalMaterial) return
        if (!original.has(material)) {
          original.set(material, {
            roughness: material.roughness,
            metalness: material.metalness,
            envMapIntensity: material.envMapIntensity,
            flatShading: material.flatShading,
            bumpMap: material.bumpMap,
            bumpScale: material.bumpScale,
            roughnessMap: material.roughnessMap,
          })
        }

        const hasPrintedSurface = Boolean(material.map)
        const isEmissive = material.emissiveIntensity > 0.2
        material.roughness = Math.max(material.roughness ?? 0.5, hasPrintedSurface ? 0.54 : 0.62)
        material.metalness = Math.min(material.metalness ?? 0, 0.76)
        material.envMapIntensity = material.metalness > 0.15 ? 0.72 : 0.34

        if (!hasPrintedSurface && !material.transparent && !isEmissive) {
          material.bumpMap = wearTexture
          material.bumpScale = material.metalness > 0.15 ? 0.012 : 0.018
          material.roughnessMap = wearTexture
          if (faceted) material.flatShading = true
        }
        material.needsUpdate = true
      })
    })

    return () => {
      original.forEach((values, material) => {
        Object.assign(material, values)
        material.needsUpdate = true
      })
    }
  }, [scene, wearTexture])

  useLayoutEffect(() => () => wearTexture.dispose(), [wearTexture])
  return null
}

/**
 * The single Canvas for the whole site. Everything lives under here and is
 * swapped by internal state — the Canvas never remounts. Lighting is a warm
 * lamp key (in DeskLamp) plus a low ambient/hemisphere fill.
 */
export default function DeskScene() {
  return (
    <Canvas
      className="scene-canvas"
      shadows
      // The readable paper textures are 1280px tall and a focused sheet fills
      // ~850 CSS px, so beyond ~1.5x device pixels we're only upsampling a
      // fixed-res canvas — more fragments, no sharper text. Cap the ratio at
      // 1.5 (AdaptiveDpr still drops it further while the camera moves). The
      // scene is fill-rate bound, so this is the single biggest perf lever —
      // and the one phones pull hardest on: QUALITY drops the cap to 1.25 and
      // turns MSAA off there (src/lib/quality.js explains both numbers).
      dpr={[1, QUALITY.dprCap]}
      gl={{ antialias: QUALITY.antialias, powerPreference: 'high-performance' }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        // Keep the room dark without making the side props disappear. The
        // lamp still owns the highlights, while the higher exposure leaves
        // enough midtone range for paper copy and worn material edges.
        gl.toneMappingExposure = 1.02
        // Renderer + scene handles for the performance budget check in
        // CLAUDE.md § "Performance budget" — see lib/perfHook for why they are
        // reachable from a production build at all.
        if (PERF_HOOK && typeof window !== 'undefined') {
          window.__gl = gl
          window.__scene = scene
        }
      }}
    >
      <color attach="background" args={['#10120e']} />
      <fog attach="fog" args={['#10120e', 11.5, 25]} />

      <PerspectiveCamera makeDefault position={CAMERA.position} fov={CAMERA.fov} near={0.1} far={100} />
      <CameraRig />
      {/* touch-only: edge-tap panning + swipe-to-flip. Renders nothing, and is
          inert on a mouse. */}
      <TouchControls />

      {/* Broad cabin fill keeps the whole work surface legible. Directional
          side lights reveal silhouettes without competing with the lamp. */}
      <ambientLight intensity={0.27} color="#ead8b7" />
      <hemisphereLight intensity={0.29} color="#e2cda8" groundColor="#182016" />
      <directionalLight position={[0, 5, 9]} intensity={0.44} color="#f2dfbf" />
      <directionalLight position={[-7, 4, -2]} intensity={0.24} color="#cda879" />
      <directionalLight position={[7, 3, 1]} intensity={0.22} color="#939b80" />
      {/* A restrained olive rim separates silhouettes from the room. */}
      <directionalLight position={[5, 2.5, -5]} intensity={0.2} color="#7f896f" />

      <Suspense fallback={null}>
        <DeskLamp />
        <Desk />
        <Clutter />
        <Documents />
        <PhotoFrame />
        <RocketModel />
        <CalendarModel />
        <FocusScrim />
        <DeskAtmosphere />
        <SceneSurfaceTreatment />
        <Preload all />
      </Suspense>

      <FirstFramesGate />
      <ShadowBake />
      {import.meta.env.DEV && <DevLayoutAudit />}
      <AdaptiveDpr pixelated />
    </Canvas>
  )
}
