import { useEffect, useState } from 'react'
import { useSceneStore } from '../store/useSceneStore'
import { IS_TOUCH } from '../lib/quality'
import { panRange } from '../desk/constants'

/**
 * The one and only nudge toward the invisible edge-tap panning (TouchControls).
 *
 * The interaction itself is deliberately undiscoverable chrome-free — no
 * arrows, no buttons, nothing drawn over the desk — which is the point, but it
 * means a first-time visitor has no reason to try the edges. So: one line of
 * text, once ever, that leaves on its own and never comes back. It is not UI:
 * it has no pointer events, nothing to press, and it cannot be toggled back on.
 *
 * It stays quiet unless all of this holds:
 *  - the device is touch-only (a mouse gets parallax and never pans),
 *  - the viewport actually has somewhere to pan to (panRange > 0 — a landscape
 *    phone already frames the whole desk, so the hint would be a lie),
 *  - the desk is drawn and idle (no point hinting under the loading screen or
 *    while a document is being read),
 *  - and this browser has never been told before.
 */

const SEEN_KEY = 'desk:edge-hint-seen'
const LINGER_MS = 5200 // long enough to read twice, short enough not to nag

/** Has this visitor already been shown the hint? Storage may be blocked (private
 *  mode), in which case the worst case is showing it once per session. */
function alreadySeen() {
  try {
    return localStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false
  }
}

function remember() {
  try {
    localStorage.setItem(SEEN_KEY, '1')
  } catch {
    // Storage unavailable — the hint still self-dismisses for this session.
  }
}

export default function EdgeHint() {
  const ready = useSceneStore((s) => s.ready)
  const focusedId = useSceneStore((s) => s.focusedId)
  const panStep = useSceneStore((s) => s.panStep)

  const [live, setLive] = useState(
    () =>
      IS_TOUCH &&
      !alreadySeen() &&
      panRange(window.innerWidth / window.innerHeight) > 0.25,
  )
  const [leaving, setLeaving] = useState(false)

  const showing = live && ready && focusedId == null

  // Panning is the hint doing its job — the moment it lands, it has been
  // learned, so retire it for good rather than waiting out the timer.
  useEffect(() => {
    if (live && panStep !== 0) {
      setLeaving(true)
      remember()
    }
  }, [live, panStep])

  // Otherwise it simply leaves. Timed from when it is actually on screen, so a
  // slow load doesn't burn the whole window behind the loading doodle.
  useEffect(() => {
    if (!showing || leaving) return
    const t = setTimeout(() => {
      setLeaving(true)
      remember()
    }, LINGER_MS)
    return () => clearTimeout(t)
  }, [showing, leaving])

  // Unmount only after the fade, so it never pops off mid-transition.
  useEffect(() => {
    if (!leaving) return
    const t = setTimeout(() => setLive(false), 600)
    return () => clearTimeout(t)
  }, [leaving])

  if (!showing) return null
  return (
    <div className={`edge-hint${leaving ? ' is-leaving' : ''}`} aria-hidden="true">
      tap the edges to look around
    </div>
  )
}
