import { useEffect } from 'react'
import DeskScene from './DeskScene'
import HudHints from '../ui/HudHints'
import EdgeHint from '../ui/EdgeHint'
import KeyControls from '../ui/KeyControls'
import Loader from '../ui/Loader'
import { useSceneStore } from '../store/useSceneStore'

/**
 * The full interactive desk experience — the Three.js canvas plus its DOM
 * chrome. Lives in its own module so App can lazy-load it: the whole 3D
 * bundle (three, r3f, drei, the canvas textures) only downloads when the
 * visitor actually picks the desk. Choosing the simple mode never pulls any
 * of it in, so that path stays genuinely lightweight.
 */
export default function DeskMode({ onSwitchMode }) {
  const setReady = useSceneStore((s) => s.setReady)
  const sceneDrawn = useSceneStore((s) => s.sceneDrawn)

  // Reveal the desk once fonts are in AND the canvas has painted real frames
  // (FirstFramesGate in DeskScene) — the loader then crossfades over a scene
  // that is actually there, instead of cutting to a canvas mid-compile.
  useEffect(() => {
    if (!sceneDrawn) return
    let done = false
    const reveal = () => {
      if (done) return
      done = true
      // one extra frame so the first paint isn't the loading screen snapping off
      requestAnimationFrame(() => setReady(true))
    }
    const fonts = document.fonts?.ready ?? Promise.resolve()
    fonts.then(reveal)
    // fallback so slow font loads never hang the reveal
    const t = setTimeout(reveal, 2500)
    return () => clearTimeout(t)
  }, [setReady, sceneDrawn])

  // hard fallback: if the canvas never reports frames (WebGL trouble), show
  // the site anyway rather than spinning on the doodle forever
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 6000)
    return () => clearTimeout(t)
  }, [setReady])

  return (
    <>
      <DeskScene />
      <HudHints onSwitchMode={onSwitchMode} />
      {/* first-visit-only nudge toward the invisible edge-tap panning; renders
          nothing on a mouse, or once it has been seen */}
      <EdgeHint />
      <KeyControls />
      <Loader />
    </>
  )
}
