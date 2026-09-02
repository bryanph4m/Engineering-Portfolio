import { lazy, Suspense, useState } from 'react'
import SimpleMode from './simple/SimpleMode'

// The desk is code-split because its chunk carries all of three.js / r3f /
// drei; a visitor who never asks for it never downloads (let alone mounts)
// the 3D scene. The simple mode is NOT split: it is what the site opens in,
// so splitting it only buys a gap between first paint and its chunk landing —
// which is visible, as a flash of bare background. It is a few KB of DOM.
const DeskMode = lazy(() => import('./desk/DeskMode'))

export default function App() {
  // Which site mode is mounted. Routing is a hard fork between separate
  // component trees — not a visibility toggle — so the desk's Canvas simply
  // never exists in the simple mode.
  const [mode, setMode] = useState('simple')

  return (
    <div className="app-root">
      {mode === 'desk' && (
        <Suspense fallback={null}>
          {/* The desk's own switch back to the simple view is this same fork,
              taken from inside the scene — so both routes are one line of
              state and cannot drift apart. */}
          <DeskMode onSwitchMode={() => setMode('simple')} />
        </Suspense>
      )}

      {mode === 'simple' && <SimpleMode onEnterDesk={() => setMode('desk')} />}
    </div>
  )
}
