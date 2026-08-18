import { Suspense, useRef } from 'react'
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
        // Preserve a bright lamp pool while letting the room fall into
        // olive-black shadow. The old exposure flattened the prop values.
        gl.toneMappingExposure = 0.88
        // Renderer + scene handles for the performance budget check in
        // CLAUDE.md § "Performance budget" — see lib/perfHook for why they are
        // reachable from a production build at all.
        if (PERF_HOOK && typeof window !== 'undefined') {
          window.__gl = gl
          window.__scene = scene
        }
      }}
    >
      <color attach="background" args={['#0a0c08']} />
      <fog attach="fog" args={['#0a0c08', 10.5, 22]} />

      <PerspectiveCamera makeDefault position={CAMERA.position} fov={CAMERA.fov} near={0.1} far={100} />
      <CameraRig />
      {/* touch-only: edge-tap panning + swipe-to-flip. Renders nothing, and is
          inert on a mouse. */}
      <TouchControls />

      {/* Low fills preserve paper legibility without erasing the lamp's shape. */}
      <ambientLight intensity={0.16} color="#e7d2ad" />
      <hemisphereLight intensity={0.17} color="#ddc79d" groundColor="#10150e" />
      <directionalLight position={[0, 5, 9]} intensity={0.3} color="#f1dfc3" />
      {/* A restrained green-black rim separates silhouettes from the room. */}
      <directionalLight position={[5, 2.5, -5]} intensity={0.16} color="#748066" />

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
        <Preload all />
      </Suspense>

      <FirstFramesGate />
      <ShadowBake />
      {import.meta.env.DEV && <DevLayoutAudit />}
      <AdaptiveDpr pixelated />
    </Canvas>
  )
}
