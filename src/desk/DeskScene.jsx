import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerspectiveCamera, AdaptiveDpr, Preload } from '@react-three/drei'
import * as THREE from 'three'
import { useSceneStore } from '../store/useSceneStore'
import { CAMERA } from './constants'
import Desk from './Desk'
import DeskLamp from './DeskLamp'
import Clutter from './Clutter'
import Documents from './Documents'
import PhotoFrame from './PhotoFrame'
import FocusScrim from './FocusScrim'
import CameraRig from './CameraRig'
import DevLayoutAudit from './DevLayoutAudit'

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
 * The single Canvas for the whole site. Everything lives under here and is
 * swapped by internal state — the Canvas never remounts. Lighting is a warm
 * lamp key (in DeskLamp) plus a low ambient/hemisphere fill.
 */
export default function DeskScene() {
  return (
    <Canvas
      className="scene-canvas"
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
      }}
    >
      <color attach="background" args={['#160f07']} />
      <fog attach="fog" args={['#160f07', 12, 24]} />

      <PerspectiveCamera makeDefault position={CAMERA.position} fov={CAMERA.fov} near={0.1} far={100} />
      <CameraRig />

      {/* soft, warm fill so shadows never go pure black */}
      <ambientLight intensity={0.35} color="#ffe9c9" />
      <hemisphereLight intensity={0.28} color="#fff2da" groundColor="#2a1c0e" />
      {/* gentle front fill to lift the picked-up document toward the camera */}
      <directionalLight position={[0, 5, 9]} intensity={0.35} color="#fff4e2" />

      <Suspense fallback={null}>
        <DeskLamp />
        <Desk />
        <Clutter />
        <Documents />
        <PhotoFrame />
        <FocusScrim />
        <Preload all />
      </Suspense>

      <FirstFramesGate />
      {import.meta.env.DEV && <DevLayoutAudit />}
      <AdaptiveDpr pixelated />
    </Canvas>
  )
}
