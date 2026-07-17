/**
 * Pinch-to-zoom state for the one focused document, plus the guard that keeps a
 * pinch from being mistaken for any of the desk's one-finger gestures.
 *
 * Why a module singleton rather than the Zustand store: this changes on every
 * pointermove of a live pinch, and its only reader is a `useFrame` in
 * desk/Document. Putting it in the store would re-render every document sixty
 * times a second in order to move one sheet. That is the same call CameraRig
 * makes for its eased pan (`panX` lives in a ref, not the store), and the same
 * one desk/tapGuard makes for its handshake — read that file first, the guard at
 * the bottom here deliberately mirrors its shape.
 *
 * ## The units
 *
 * `x`/`y` are an offset **in fractions of what the camera can see at the focus
 * plane**, and `+y` is up. That sounds indirect, but it is the one space in
 * which every part of this is trivial:
 *
 *  - a finger that travels a tenth of the viewport moves the sheet a tenth of
 *    the viewport, on any screen, at any aspect — Document.jsx multiplies by the
 *    visible world size at the focus distance and the paper tracks the finger;
 *  - the pinch anchor is just the centroid's position from the middle of the
 *    screen, in the same fractions;
 *  - it is independent of which document is focused, so this module never has to
 *    know about papers, poses or scales.
 *
 * The one thing it does need per document is how much of the view the sheet
 * covers, for the pan clamp — the focused component publishes that through
 * `setSheetExtent`, because it is the only thing that knows its own focusScale.
 *
 * The zoom applies only to the focused sheet, never to the desk: the idle
 * vantage and its edge-tap panning (CAMERA_PAN) are untouched.
 */

import { DOC_ZOOM } from './constants'

// Live zoom for whatever is focused. One object, mutated in place and read
// per-frame, so a running pinch allocates nothing.
const state = { scale: 1, x: 0, y: 0 }

// How much of the view the focused sheet covers, as fractions of the visible
// world at the focus plane. Only the pan clamp reads it. Defaults are a
// harmless mid-size sheet, used only in the frame before the focused component
// publishes the real thing.
const extent = { w: 0.9, h: 0.75 }

/** The live zoom. Read per-frame; never held across frames. */
export const zoomState = () => state

/** True once the sheet is magnified enough that its base raster would show. */
export const isZoomed = () => state.scale > DOC_ZOOM.detailAt

/**
 * Publish the focused sheet's on-screen size (fractions of the view at the
 * focus plane). Called by whatever is focused — the papers and the photo frame
 * each know their own focusScale and nothing else does.
 */
export function setSheetExtent(w, h) {
  extent.w = w
  extent.h = h
}

/**
 * Hold the sheet over the middle of the view.
 *
 * At scale s the sheet covers s × its resting size, so its centre may travel at
 * most half of the overhang — (s·extent − extent) / 2 — before the paper's edge
 * crosses the centre of the screen and the visitor is panning across empty
 * space. At scale 1 that is exactly 0 on both axes: an un-zoomed sheet is pinned
 * where the focus pose puts it, which is what keeps a document that nobody
 * pinched behaving precisely as it did before any of this existed.
 */
function clampPan() {
  const limX = Math.max(0, (extent.w * (state.scale - 1)) / 2)
  const limY = Math.max(0, (extent.h * (state.scale - 1)) / 2)
  state.x = Math.min(limX, Math.max(-limX, state.x))
  state.y = Math.min(limY, Math.max(-limY, state.y))
}

/**
 * Apply one step of a live pinch.
 *
 * `factor` is how much the span between the fingers changed since the last move;
 * `ax`/`ay` are the centroid and `dx`/`dy` its travel, all in the units above.
 * The zoom is anchored at the centroid — the paper under the fingers stays under
 * the fingers — which is what makes the gesture feel attached to the sheet
 * rather than to the screen, and is also what lets a pinch reach the margins of
 * a magnified page without a separate pan gesture.
 */
export function pinchBy(factor, ax, ay, dx, dy) {
  const next = Math.min(DOC_ZOOM.max, Math.max(DOC_ZOOM.min, state.scale * factor))
  // Not `factor`: at the clamps the zoom stops but the fingers don't, and
  // anchoring against the ratio we actually applied is what stops the sheet
  // creeping while a pinch pushes past the limit.
  const applied = next / state.scale
  state.x = ax + (state.x - ax) * applied + dx
  state.y = ay + (state.y - ay) * applied + dy
  state.scale = next
  clampPan()
}

/** Back to a plain, unzoomed focused sheet. */
export function resetZoom() {
  state.scale = 1
  state.x = 0
  state.y = 0
}

/* ------------------------------------------------------------------ */
/* pinch guard — the two-finger analogue of desk/tapGuard              */
/* ------------------------------------------------------------------ */

/**
 * A pinch must never also read as a tap (pick up / set down / edge-tap pan) or
 * as a swipe (page turn). Two fingers never leave the glass together, so the
 * last one up produces a perfectly ordinary pointerup — and the browser may then
 * synthesise a `click` from it, which r3f dispatches at whatever the finger was
 * over. On a focused sheet that is a page corner or a link; on the desk it is a
 * pan zone. All of them would fire off the end of a zoom.
 *
 * So, exactly as tapGuard does it: observe, don't predict. A live pinch says so
 * here and every one-finger gesture asks first. The window outlives the gesture
 * by enough to cover the pointerup → click gap for the very fingers that were
 * pinching, and no longer, so it can never swallow the next real tap.
 */
const PINCH_TAIL_MS = 260

let pinching = false
let endedAt = -Infinity

export function beginPinch() {
  pinching = true
}

export function endPinch() {
  pinching = false
  endedAt = performance.now()
}

/** True while a pinch is live, or so recently over that this event is its tail. */
export function pinchWasActive() {
  return pinching || performance.now() - endedAt < PINCH_TAIL_MS
}

// Dev-only, mirroring the __sceneStore hook in store/useSceneStore: a pinch is
// awkward to drive against a WebGL canvas from QA tooling, so let the console
// read the zoom it produced.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__zoom = { zoomState, resetZoom, isZoomed, pinchWasActive }
}
