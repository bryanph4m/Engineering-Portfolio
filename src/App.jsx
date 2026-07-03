import { useEffect, useState } from 'react'
import DeskScene from './desk/DeskScene'
import HudHints from './ui/HudHints'
import KeyControls from './ui/KeyControls'
import Loader from './ui/Loader'
import StartScreen from './ui/StartScreen'
import { useSceneStore } from './store/useSceneStore'

/**
 * The full interactive desk experience — everything the site used to mount
 * directly. Self-contained so App can swap whole site modes without the desk
 * internals knowing how they were entered (a flat "professional" mode will
 * become a sibling of this component later).
 */
function DeskMode() {
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
      <HudHints />
      <KeyControls />
      <Loader />
    </>
  )
}

export default function App() {
  // Which site mode is mounted; null shows the start screen. Adding the
  // "professional" mode later is one more branch here plus one more entry in
  // StartScreen's MODES — no entry-flow rework.
  const [mode, setMode] = useState(null)

  return (
    <div className="app-root">
      {mode === 'desk' ? <DeskMode /> : <StartScreen onEnter={setMode} />}
    </div>
  )
}
