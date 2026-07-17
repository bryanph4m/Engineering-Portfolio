import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useSceneStore } from '../store/useSceneStore'
import { pageCountOf } from '../documents/registry'
import { IS_TOUCH } from '../lib/quality'
import { disposeDetailTextures } from '../lib/docTextures'
import { tapWasConsumed } from './tapGuard'
import { beginPinch, endPinch, isZoomed, pinchBy, pinchWasActive, resetZoom } from './docZoom'
import { CAMERA_PAN, DOC_ZOOM } from './constants'

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
 *  - **Pinch a focused document** to magnify it for reading, and drag with both
 *    fingers to move around the magnified sheet (desk/docZoom). Only ever the
 *    focused sheet: on the idle desk two fingers do nothing, because the vantage
 *    there is fixed by design and the edge taps already own moving it.
 *
 * The three are told apart by finger count, which is the only signal that is
 * unambiguous at the moment the gesture starts: one finger is a tap or a swipe,
 * two are a pinch. The moment a second finger lands the one-finger gesture in
 * flight is abandoned rather than completed (see `onDown`), so spreading two
 * fingers can never also turn a page, and lifting them can never also set the
 * document down — that last one matters because two fingers never leave the
 * glass together, and the stray final pointerup is a perfectly ordinary tap as
 * far as everything downstream is concerned (docZoom's guard).
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
  const focusedId = useSceneStore((s) => s.focusedId)
  const pageIndex = useSceneStore((s) => s.pageIndex)
  const zoomDetail = useSceneStore((s) => s.zoomDetail)

  // Every arrival at a new sheet starts unzoomed. The store drops `zoomDetail`
  // on the same transitions (focus/close/page turn); this is the other half of
  // that reset — the live offsets, which are not store state.
  useEffect(() => {
    resetZoom()
  }, [focusedId, pageIndex])

  // Free the hi-res rasters once nothing is showing one. Keyed on the flag, so
  // this runs *after* the render that put the base textures back on the paper —
  // disposing them in the same breath as clearing the flag would pull the map
  // out from under a material that is still on screen for one more frame.
  useEffect(() => {
    if (!zoomDetail) disposeDetailTextures()
  }, [zoomDetail])

  useEffect(() => {
    if (!IS_TOUCH) return
    const el = gl.domElement

    let pointerId = null
    let startX = 0
    let startY = 0
    let startT = 0
    let moved = false

    // Live pinch: the second finger's id, plus the previous span and centroid to
    // difference each move against.
    let pinchId = null
    let lastSpan = 0
    let lastCx = 0
    let lastCy = 0
    const pts = new Map() // pointerId -> {x, y}, only while down

    // The canvas rect, read once when a pinch starts rather than per move:
    // getBoundingClientRect forces layout, and doing that on every pointermove
    // of a live gesture is exactly the wrong place to spend a frame. The canvas
    // fills a fixed viewport and cannot resize mid-pinch.
    let rectW = 1
    let rectH = 1

    /**
     * The two live fingers, as docZoom wants them: `span` stays in raw px —
     * it is only ever used as a ratio against the previous one, and DOC_ZOOM.slop
     * is a px threshold — while the centroid is in fractions of the viewport from
     * its centre, +y up, which is the space docZoom's offsets and anchors live in.
     */
    const pinchGeom = () => {
      const [a, b] = [...pts.values()]
      return {
        span: Math.hypot(a.x - b.x, a.y - b.y),
        cx: (a.x + b.x) / 2 / rectW - 0.5,
        cy: -((a.y + b.y) / 2 / rectH - 0.5),
      }
    }

    const onDown = (e) => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (pointerId === null) {
        pointerId = e.pointerId
        startX = e.clientX
        startY = e.clientY
        startT = at(e)
        moved = false
        return
      }

      // A second finger. Whatever the first one was starting to be, it is not
      // that any more: mark it moved so it can never resolve as a tap or a
      // swipe on the way out, and take over as a pinch — but only on a focused
      // sheet, since there is nothing to magnify on the idle desk.
      if (pinchId !== null || pts.size !== 2) return
      moved = true
      if (useSceneStore.getState().focusedId == null) return
      pinchId = e.pointerId
      const rect = el.getBoundingClientRect()
      rectW = rect.width || 1
      rectH = rect.height || 1
      const g = pinchGeom()
      lastSpan = g.span
      lastCx = g.cx
      lastCy = g.cy
      beginPinch()
    }

    const onMove = (e) => {
      const p = pts.get(e.pointerId)
      if (p) {
        p.x = e.clientX
        p.y = e.clientY
      }

      if (pinchId !== null && pts.size === 2) {
        const g = pinchGeom()
        // Two fingers resting are not a pinch; below the slop the span noise
        // would jitter the zoom, so only the drag half applies until they move.
        const factor =
          lastSpan > 0 && Math.abs(g.span - lastSpan) > DOC_ZOOM.slop ? g.span / lastSpan : 1
        pinchBy(factor, g.cx, g.cy, g.cx - lastCx, g.cy - lastCy)
        if (factor !== 1) lastSpan = g.span
        lastCx = g.cx
        lastCy = g.cy
        return
      }

      if (e.pointerId !== pointerId || moved) return
      if (Math.hypot(e.clientX - startX, e.clientY - startY) > TAP_SLOP) moved = true
    }

    /**
     * The pinch is over the moment either finger leaves. The magnified sheet
     * stays exactly where it was left — this only ends the *gesture*.
     *
     * The hi-res repaint is deliberately deferred to here rather than done as
     * the fingers move: a detail raster is a full page repaint plus a GPU
     * upload, and firing that mid-pinch would stutter the very gesture it is
     * meant to serve. Nobody reads a sheet while it is still moving, so it lands
     * the frame after they stop — and only if they actually magnified it enough
     * for the base raster to show (isZoomed).
     */
    const endPinchGesture = () => {
      if (pinchId === null) return
      pinchId = null
      lastSpan = 0
      endPinch()
      useSceneStore.getState().setZoomDetail(isZoomed())
    }

    // Page turns resolve here, on the gesture itself. Panning deliberately does
    // not (see onClick below).
    const onUp = (e) => {
      pts.delete(e.pointerId)
      if (pinchId !== null) {
        endPinchGesture()
        // The finger still down is the tail of a pinch, not the start of a
        // swipe: drop it rather than let it flip a page on its way up.
        pointerId = null
        return
      }
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

    const onCancel = (e) => {
      // The OS took the gesture (a system edge swipe, an incoming call). Not a
      // tap — drop it rather than acting on wherever the finger happened to be.
      pts.delete(e.pointerId)
      endPinchGesture()
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
      if (pinchWasActive()) return // the tail of a pinch, not a tap (docZoom)
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
