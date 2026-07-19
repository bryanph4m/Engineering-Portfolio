/**
 * The one rule for "which page is this document actually showing right now".
 *
 * A page turn takes about a second, and during it `pageIndex` (the store's
 * record of where the reader has got to) and the page the paper is PAINTING
 * are not the same thing:
 *
 *   forward  — the outgoing leaf turns away and uncovers the new page, so the
 *              static top sheet switches to `pageIndex` immediately and the
 *              turning leaf carries the old page away on top of it.
 *   backward — the returning leaf is what brings the new page back, so the
 *              static top sheet has to KEEP the outgoing page until that leaf
 *              lands. Switching early would show the incoming page twice: once
 *              on the sheet and once on the leaf still swinging over it.
 *
 * That asymmetry is deliberate and correct for the paper. It is a bug for
 * anything that reads `pageIndex` on its own, because such a thing agrees with
 * the paper going forward and disagrees with it coming back — the polaroids
 * used to do exactly this, and the symptom was a photo snapping onto a sheet
 * that was still painting the previous page for the whole reverse turn.
 *
 * So both halves derive the presented page from here instead, and forward and
 * backward are symmetric by construction rather than by two components
 * happening to be edited in step.
 */
export function presentedPage(pageIndex, flip, pageCount) {
  if (!flip) return pageIndex
  return flip.dir > 0 ? pageIndex : Math.min(pageIndex + 1, pageCount - 1)
}

/** The store's in-flight turn, but only if it belongs to `docId`. Every
 *  document is mounted at once, so a raw `flip` read would let one document's
 *  turn skew another's presented page. */
export function flipFor(flip, docId) {
  return flip && flip.docId === docId ? flip : null
}
