import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useSceneStore } from '../store/useSceneStore'
import { pageCountOf } from '../documents/registry'
import { IS_TOUCH } from '../lib/quality'
import { tapWasConsumed } from './tapGuard'
import { CAMERA_PAN } from './constants'

/**
 * Every touch gesture the desk understands, in one place. Mounts only on touch
 * devices (a mouse has parallax, hover and the arrow keys instead) and renders
 * nothing at all:
 *
 *  - **Tap either screen edge** to pan the view along the desk, FNAF-style —
 *    invisible zones, no arrows, no button chrome, nothing painted over the
 *    scene. It writes `panStep`; CameraRig turns that into camera motion.
 *  - **Swipe left/right on a focused document** to turn the page, the touch
 *    equivalent of the ←/→ keys (ui/KeyControls) and the painted dog-eared
 *    corners, which keep working too.
 *
 * Why listeners rather than two invisible DOM divs over the scene: a div would
 * eat every tap in the outer 13% of the screen, including taps meant for the
 * contact envelope, the projects stack and the photo frame — all of which sit
 * under a pan zone on a phone. Instead an object that handles a tap says so
 * (desk/tapGuard) and the pan stands down, so an object always outranks the
 * zone it overlaps. See tapGuard for why this is observed rather than raycast.
 */

// A tap is a press that neither travelled nor lingered. Both bounds are loose:
// misreading a sloppy tap as a swipe does nothing, while misreading a swipe as
// a tap would jump the view sideways mid-gesture.
const TAP_SLOP = 12 // px of travel still counted as a tap, not a drag
const TAP_MS = 500 // press longer than this is a hold, not a tap

// A page-turning swipe: mostly horizontal, far enough to be deliberate, and
// flicked rather than dragged.
const SWIPE_MIN = 48 // px of horizontal travel
const SWIPE_MS = 700

/**
 * When the finger did this, not when we got around to hearing about it.
 *
 * Every duration below is measured from event timestamps rather than a
 * `performance.now()` read inside the handler, and on this scene that is a
 * correctness fix rather than a nicety: the desk can hold the main thread for
 * hundreds of milliseconds at a time (a page flip repaints a 2048×1280 canvas
 * texture), which delays when a handler *runs* without changing when the finger
 * actually moved. Clock-reading the handler therefore inflates a 200ms flick
 * into a "too slow" reject exactly on the low-end devices this all exists for,
 * and the harder the phone is working the worse it gets. `timeStamp` is set by
 * the browser at input time and doesn't drift with load.
 */
const at = (e) => e.timeStamp

export default function TouchControls() {
  const gl = useThree((s) => s.gl)

  useEffect(() => {
    if (!IS_TOUCH) return
    const el = gl.domElement

    let pointerId = null
    let startX = 0
    let startY = 0
    let startT = 0
    let moved = false

    const onDown = (e) => {
      if (pointerId !== null) return // a second finger — this is not a tap
      pointerId = e.pointerId
      startX = e.clientX
      startY = e.clientY
      startT = at(e)
      moved = false
    }

    const onMove = (e) => {
      if (e.pointerId !== pointerId || moved) return
      if (Math.hypot(e.clientX - startX, e.clientY - startY) > TAP_SLOP) moved = true
    }

    // Page turns resolve here, on the gesture itself. Panning deliberately does
    // not (see onClick below).
    const onUp = (e) => {
      if (e.pointerId !== pointerId) return
      pointerId = null
      if (!moved) return

      const store = useSceneStore.getState()
      if (store.focusedId == null) return
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      if (at(e) - startT > SWIPE_MS) return
      if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) <= Math.abs(dy)) return
      const count = pageCountOf(store.focusedId)
      if (count <= 1) return
      // Swiping left pulls the next sheet in, like dragging paper aside.
      if (dx < 0) store.nextPage(count)
      else store.prevPage()
    }

    const onCancel = () => {
      // The OS took the gesture (a system edge swipe, an incoming call). Not a
      // tap — drop it rather than acting on wherever the finger happened to be.
      pointerId = null
    }

    /**
     * The pan decision, resolved on `click` at the window rather than on
     * pointerup at the canvas. Both details are load-bearing: `click` is the
     * event r3f dispatches its own handlers from, and `window` is downstream of
     * the container r3f listens on — so by the time this runs, a document that
     * wanted this tap has already taken it and said so through tapGuard.
     */
    const onClick = (e) => {
      if (moved) return
      if (at(e) - startT > TAP_MS) return
      if (tapWasConsumed()) return // a document took it; it outranks the zone

      const store = useSceneStore.getState()
      // While reading, a tap belongs to the sheet (links, page corners, the
      // album's halves) or to the scrim behind it, which sets the document
      // down. Panning here would fight all three.
      if (store.focusedId != null) return

      const rect = el.getBoundingClientRect()
      const frac = (e.clientX - rect.left) / rect.width
      if (frac > CAMERA_PAN.zone && frac < 1 - CAMERA_PAN.zone) return
      store.panBy(frac <= CAMERA_PAN.zone ? -1 : 1)
    }

    // Nothing here calls preventDefault, so passive listeners are fine. The
    // canvas already carries `touch-action: none` (index.css), so the browser
    // is not scrolling or zooming underneath us anyway.
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onCancel)
    window.addEventListener('click', onClick)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onCancel)
      window.removeEventListener('click', onClick)
    }
  }, [gl])

  return null
}
