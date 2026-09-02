import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useSceneStore } from '../store/useSceneStore'
import { clickWasClaimed, consumeTap, tapWasConsumed } from './tapGuard'
import { pinchWasActive } from './docZoom'

/**
 * The one place that sets a picked-up thing back down. Renders nothing.
 *
 * ## Why this exists rather than each prop falling through to the scrim
 *
 * Click-away used to be an OPT-OUT contract: desk/FocusScrim carried the
 * close handler, and every interactive object in the scene had to remember
 * *not* to claim a click it had no use for, so the click could travel past it
 * to the scrim behind. Five components had to keep that promise
 * (desk/Document, desk/PhotoFrame, desk/RocketModel's airframe and its page,
 * desk/CalendarModel), and the promise was broken five separate times:
 *
 *   d552322  Document.jsx stopPropagation'd before testing for a hotspot, so
 *            clicking the middle of a focused sheet did nothing.
 *   01cfc76  the rocket's component page swallowed every off-corner click.
 *   b40cfcd  the scrim itself stayed a click target through its fade-out.
 *            …and the airframe, the album's rails, and an index row added to
 *            a cover page each reintroduced it again afterwards.
 *
 * Every one of those was the same defect wearing a different file name, and
 * every fix was one more mole whacked. The contract is now INVERTED: nothing
 * has to opt out, because click-away no longer depends on the click reaching
 * any particular object. A click on the canvas sets the focused thing down
 * unless something explicitly claims it (desk/tapGuard), so a new prop, page
 * or hotspot cannot silently break it — the default is "closes", and only
 * code that does something with a click has to say so.
 *
 * ## Why the decision is deferred a task, and not taken inline
 *
 * This observes the outcome of a click rather than predicting it, so it has to
 * run after every other handler for that click — and "later in the bubble" is
 * NOT enough to guarantee that. Measured: with the close taken inline from a
 * `window` listener, clicking an index row on the Projects cover set the sheet
 * down instead of jumping (verified against the same build, viewport and pixel
 * that jumped to page 13 before this file existed). Whatever the exact
 * registration order between this listener and r3f's own, taking the decision
 * inline raced it, and the close won: the store was already cleared by the time
 * the row's handler ran, so its `gotoPage` no-op'd against a null `focusedId`
 * and the jump vanished.
 *
 * Deferring to a macrotask removes the race rather than re-tuning it. By the
 * time the callback runs the event has finished dispatching entirely, so a
 * hotspot that wanted the click has already claimed it (desk/tapGuard), and
 * ordering — which element r3f connects to, which listener registered first —
 * stops being something this file has to know or depend on. The claim window is
 * 150ms, comfortably longer than the ~0-4ms this defers by.
 */
export default function ClickAway() {
  const gl = useThree((s) => s.gl)

  useEffect(() => {
    const el = gl.domElement

    const onClick = (e) => {
      if (useSceneStore.getState().focusedId == null) return // nothing is picked up
      // A DOM control took this click, not the desk: the HUD's mode switch, or
      // the booking panel's inputs and buttons (ui/CalendarBooking, which is a
      // pointer-events:none layer around a pointer-events:auto card — a click
      // in the layer's empty area does land on the canvas and does close, which
      // is the behaviour that panel's CSS documents).
      if (e.target !== el) return
      if (pinchWasActive()) return // the tail of a pinch, not a tap (desk/docZoom)

      setTimeout(() => {
        const s = useSceneStore.getState()
        if (s.focusedId == null) return // something already set it down
        // Claimed by a hotspot or a pickup (desk/tapGuard). The flag on the
        // event is the reliable half; the timestamp covers the one claimer that
        // has no click event to stamp — a swipe, resolved on pointerup.
        if (clickWasClaimed(e) || tapWasConsumed()) return
        // Claim it in turn, so the edge-tap panning underneath does not also act
        // on the tap that just set the document down (desk/TouchControls).
        consumeTap()
        s.close()
      }, 0)
    }

    window.addEventListener('click', onClick)
    return () => window.removeEventListener('click', onClick)
  }, [gl])

  return null
}
