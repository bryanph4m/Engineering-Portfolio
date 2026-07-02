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

  // Reveal the desk once fonts are in (procedural textures are synchronous).
  useEffect(() => {
    let done = false
    const reveal = () => {
      if (done) return
      done = true
      // one extra frame so the first paint isn't the loading screen snapping off
      requestAnimationFrame(() => setReady(true))
    }
    const fonts = document.fonts?.ready ?? Promise.resolve()
    fonts.then(reveal)
    // hard fallback so we never hang on the doodle
    const t = setTimeout(reveal, 2500)
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
