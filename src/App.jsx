import { useEffect } from 'react'
import DeskScene from './desk/DeskScene'
import HudHints from './ui/HudHints'
import KeyControls from './ui/KeyControls'
import Loader from './ui/Loader'
import { useSceneStore } from './store/useSceneStore'

export default function App() {
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
    <div className="app-root">
      <DeskScene />
      <HudHints />
      <KeyControls />
      <Loader />
    </div>
  )
}
