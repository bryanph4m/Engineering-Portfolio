/**
 * A one-bit handshake between "something on the desk handled this tap" and the
 * edge-tap panning that would otherwise also fire for it (desk/TouchControls).
 *
 * The rule the panning needs is "an object outranks the pan zone it overlaps".
 * The tempting way to implement that is to raycast the tap yourself and bail if
 * it hit a document — but that is a *guess* at what r3f's own hit-testing will
 * do with the same tap, and the guess is wrong in both directions. A document's
 * group contains meshes r3f never acts on (the blank fanned leaves under a
 * stack, the pile of already-turned pages): a tap there hits `doc-projects` and
 * so would veto the pan, while r3f quietly does nothing — a tap that lands on
 * neither, which is unexplainable when the zone is invisible and there is no
 * button to look at.
 *
 * So don't predict it — observe it. Whatever actually consumes a tap says so
 * here, and the pan asks. Ordering is what makes this exact rather than
 * approximate: r3f dispatches its click off a listener on the canvas container,
 * and TouchControls reads this from a listener on `window`, which the same event
 * reaches strictly later as it bubbles. The answer is therefore always already
 * in by the time it's read.
 *
 * Kept out of the Zustand store deliberately: this changes on every tap and no
 * component should re-render because of it.
 */

// Long enough to cover the pointerup → click gap for the very same tap, short
// enough that it can never leak into the next one.
const WINDOW_MS = 150

let consumedAt = -Infinity

/** Called by whatever acted on a tap (picking a document or the frame up). */
export function consumeTap() {
  consumedAt = performance.now()
}

/** True if the tap being handled right now was already claimed by an object. */
export function tapWasConsumed() {
  return performance.now() - consumedAt < WINDOW_MS
}
