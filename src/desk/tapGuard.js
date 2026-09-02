/**
 * A one-bit handshake between "something on the desk handled this tap" and the
 * two things that would otherwise also fire for it: the edge-tap panning
 * (desk/TouchControls) and click-away, which sets a picked-up document back
 * down (desk/ClickAway).
 *
 * Those two are the only readers, and both ask the same question. Click-away
 * is the reason this is now load-bearing rather than a touch-only nicety: it
 * is what lets "a click sets the focused thing down" be the DEFAULT, with
 * hotspots opting out by claiming their click, instead of every object in the
 * scene having to remember to let a click fall through to a scrim behind it.
 * See desk/ClickAway's header for the five separate bugs that contract caused.
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

/**
 * The claim is ALSO stamped on the event itself, and that is the reading
 * click-away actually trusts. A module-level timestamp is a shared-state
 * channel, and it has two failure modes this file cannot see from the inside:
 *
 *  - **Two copies of this module.** Vite's dev server appends `?t=` to a
 *    module's URL when HMR invalidates it, so an edited importer can end up
 *    holding a *different instance* of this one — writer and reader then have
 *    separate `consumedAt` variables and the handshake silently reads false.
 *    Measured: exactly that, an index row that fired its jump and was then
 *    closed anyway by desk/ClickAway a millisecond later.
 *  - **Order.** The timestamp says "recently", not "for this event", so it
 *    depends on the reader running after the writer.
 *
 * A plain string key on the native event has neither problem: it is the same
 * object every listener for that click receives, it says "this click", and a
 * string (rather than a Symbol) survives even the duplicated-module case.
 */
const CLAIMED = '__deskClaimed'

/** The native event behind an r3f synthetic one, or the event itself. */
const nativeOf = (e) => (e && typeof e === 'object' ? (e.nativeEvent ?? e) : null)

/**
 * Called by whatever acted on a tap — picking a document up, or a hotspot that
 * used the click (a link, a page corner, a cover's index row). Pass the event
 * whenever there is one; the timestamp alone still covers the caller that has
 * no click event to stamp (desk/TouchControls resolves a swipe on `pointerup`,
 * and the browser may synthesise the `click` afterwards).
 */
export function consumeTap(e) {
  consumedAt = performance.now()
  const native = nativeOf(e)
  if (native) native[CLAIMED] = true
}

/** True if the tap being handled right now was already claimed by an object. */
export function tapWasConsumed() {
  return performance.now() - consumedAt < WINDOW_MS
}

/** True if THIS click was claimed — see CLAIMED for why this is the strong one. */
export function clickWasClaimed(e) {
  const native = nativeOf(e)
  return !!(native && native[CLAIMED])
}
