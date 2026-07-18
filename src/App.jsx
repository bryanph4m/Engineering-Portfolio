import { lazy, Suspense, useState } from 'react'
import StartScreen from './ui/StartScreen'

// Both site modes are code-split. The desk chunk carries all of three.js /
// r3f / drei; the simple chunk is a few KB of DOM. Whichever mode the visitor
// picks on the start screen is the only one whose bundle is ever fetched, so
// the simple/recruiter path never downloads (let alone mounts) the 3D scene.
const DeskMode = lazy(() => import('./desk/DeskMode'))
const SimpleMode = lazy(() => import('./simple/SimpleMode'))

export default function App() {
  // Which site mode is mounted; null shows the start screen. Routing is a
  // hard fork between separate component trees — not a visibility toggle —
  // so the desk's Canvas simply never exists in the simple mode.
  const [mode, setMode] = useState(null)

  return (
    <div className="app-root">
      {mode === null && <StartScreen onEnter={setMode} />}

      {mode === 'desk' && (
        <Suspense fallback={null}>
          {/* The desk's own switch to the simple view is this same fork, taken
              from inside the scene instead of from the start screen — so both
              routes are one line of state and cannot drift apart. */}
          <DeskMode onSwitchMode={() => setMode('simple')} />
        </Suspense>
      )}

      {mode === 'simple' && (
        <Suspense fallback={null}>
          <SimpleMode
            onExit={() => setMode(null)}
            onEnterDesk={() => setMode('desk')}
          />
        </Suspense>
      )}
    </div>
  )
}
