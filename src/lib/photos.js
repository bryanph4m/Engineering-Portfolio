import { texDims } from './docTextures'

/**
 * Desk-mode photo support: turning a section's `photos` (src/content/portfolio.js)
 * into polaroids pinned to the paginated documents.
 *
 * The trick is that a photo is NOT painted into the paper texture — it's a real
 * 3D polaroid (white frame + photo + drop shadow) floated just above the sheet
 * by Polaroids.jsx. But it still has to obey the page's content box and the same
 * pagination the text obeys, so instead of inventing a parallel placement pass
 * we let each photo ride the existing block-flow: `photoBlock` reserves the
 * polaroid's footprint as an ordinary flow block (it paints nothing), so
 * pageFlow.js measures it, keeps it clear of the text, and pushes it onto the
 * next page when the current one is full — exactly like any figure. pageFlow
 * then reports where each photo block landed as a page `anchor`, and
 * `placedPhotos` flattens those anchors into `{ photo, page, rect }` records the
 * 3D renderer converts to world coordinates.
 *
 * Everything here is presentation-agnostic about the photo's meaning: only the
 * image `src` ever reaches the desk. Titles, captions and credits are simple
 * mode's business.
 */

// The polaroid, in world metres. A 4:5 portrait opening (matching the painted
// placeholder) inside a white frame with the classic thicker "chin" at the
// bottom. Kept modest so a rotated polaroid still clears the page margins.
export const POLAROID = {
  photoW: 0.46,
  photoH: 0.575,
  border: 0.04, // white margin on top + both sides
  chin: 0.1, // thicker bottom margin
}

/** Outer white-frame size (world metres). */
export function polaroidFrame() {
  return {
    w: POLAROID.photoW + 2 * POLAROID.border,
    h: POLAROID.photoH + POLAROID.border + POLAROID.chin,
  }
}

// Breathing room reserved below each polaroid so consecutive photos (and the
// text that follows one) never touch the frame, in texture px.
const PHOTO_GAP = 46

/**
 * Polaroid footprint for a paper, in texture px, at an optional uniform scale.
 *
 * `scale` shrinks the physical polaroid, not just its reservation: Polaroids.jsx
 * sizes the mesh from the rect reserved here, so the two can't disagree. The
 * paginated documents leave it at 1; the index card uses it because a full-size
 * polaroid on a small card would take a third of its width (see about.js).
 */
function polaroidPx(paper, scale = 1) {
  const { W, H } = texDims(paper)
  const f = polaroidFrame()
  return { wpx: ((f.w * scale) / paper.w) * W, hpx: ((f.h * scale) / paper.h) * H }
}

/**
 * Flow blocks that reserve each photo's polaroid footprint inside `box`,
 * centred horizontally. They paint nothing — the polaroid mesh is drawn on top
 * by Polaroids.jsx — but their declared height makes pageFlow lay out and
 * paginate around them just like a figure. Each block carries the photo and its
 * footprint so pageFlow can report the landing spot as an anchor.
 *
 * This is the "own band" placement: the polaroid gets a full-width horizontal
 * strip to itself, so nothing sits beside it. Use it when a page has little
 * text or the image is large (open space reads better than a cramped wrap).
 * For text-wrap-around, see `photoFloat`.
 */
export function photoBlocks(photos, paper, box, scale = 1) {
  if (!photos?.length) return []
  const { wpx, hpx } = polaroidPx(paper, scale)
  const x = box.x + Math.max(0, (box.w - wpx) / 2)
  return photos.map((photo) => ({
    h: hpx + PHOTO_GAP,
    inkH: hpx,
    dbg: 'photo',
    photo,
    place: { x, w: wpx, h: hpx },
    draw() {}, // the 3D polaroid renders it; nothing lands on the paper texture
  }))
}

/**
 * A single photo as a *float*: a polaroid pinned to one side of the content box
 * with the surrounding text reflowing around it (pageFlow.js reads `float` and
 * narrows the text column for the rows the photo spans, full width above and
 * below — a stepped/rectangular exclusion, the wrap-around simplification the
 * brief allows). Unlike `photoBlocks`, a float does NOT advance the text cursor
 * on its own: it declares the side column it occupies and lets following blocks
 * flow beside it. If those blocks outgrow the page they paginate onto the next
 * sheet exactly as before, so overflow behaviour is unchanged.
 *
 * `side` is 'right' by default (the Wikipedia convention, and the only side the
 * desk painters use — a right float needs no x-translation of the left-anchored
 * text, only a narrower run). Returns one block; the photo anchor it carries is
 * reported by pageFlow just like a band photo, so Polaroids.jsx pins the mesh
 * to the reserved spot.
 */
export function photoFloat(photo, paper, box, side = 'right', scale = 1) {
  const { wpx, hpx } = polaroidPx(paper, scale)
  const x = side === 'left' ? box.x : box.x + box.w - wpx
  return {
    float: true,
    side,
    w: wpx,
    // vertical span the text keeps clear of (frame + breathing room)
    floatSpan: hpx + PHOTO_GAP,
    inkH: hpx, // used only for the page-fit check when the float lands
    h: 0, // a float never advances the cursor; text flows beside it
    dbg: 'photo-float',
    photo,
    place: { x, w: wpx, h: hpx },
    draw() {}, // the 3D polaroid renders it; nothing lands on the paper texture
  }
}

/**
 * Reserve a polaroid column on a document that is NOT block-flowed — the
 * hand-painted, single-page sheets whose art is placed at absolute coordinates
 * (the index card). Those have no cursor for `photoBlocks` / `photoFloat` to
 * ride, but they still owe the photo the same guarantee the flowed documents
 * get: the copy must be measured against a box that already excludes the photo,
 * so text can never land under it.
 *
 * So instead of a flow block this returns the two things such a painter needs:
 *   - `rect`: the reserved footprint in texture px, pinned to `side` of `box`
 *     with its top at `y` — the same rect shape pageFlow reports as an anchor,
 *     so `Polaroids.jsx` consumes it identically.
 *   - `textBox`: `box` narrowed to the column beside the photo (minus the same
 *     PHOTO_GAP breathing room the flowed photos reserve). A painter sets it as
 *     `ctx._contentBox` while painting the runs that sit alongside the photo, and
 *     docTextures' per-line auto-fit then measures them against that narrowed
 *     run — the existing bounding-box machinery, pointed at a smaller box.
 *
 * Pagination is a no-op here by construction: these documents are one page, so
 * the photo always lands on page 0 and there is no next sheet to flow onto.
 */
export function photoSlot(photo, paper, box, { scale = 1, y = box.y, side = 'right' } = {}) {
  const { wpx, hpx } = polaroidPx(paper, scale)
  const x = side === 'left' ? box.x : box.x + box.w - wpx
  const textBox =
    side === 'left'
      ? { x: x + wpx + PHOTO_GAP, y: box.y, w: box.x + box.w - (x + wpx + PHOTO_GAP), h: box.h }
      : { x: box.x, y: box.y, w: x - PHOTO_GAP - box.x, h: box.h }
  return { photo, rect: { x, y, w: wpx, h: hpx }, textBox }
}

/**
 * Flatten the per-page `anchors` pageFlow produced into placed-photo records:
 * `{ photo, page, rect }`, where `rect` is the polaroid footprint in texture px
 * on that page. Photos that flowed onto a later page carry that page index, so
 * the polaroid shows on the sheet it actually landed on.
 */
export function placedPhotos(pages) {
  return pages.flatMap((pg, page) =>
    (pg.anchors ?? []).map((a) => ({
      photo: a.photo,
      page,
      rect: { x: a.x, y: a.y, w: a.w, h: a.h },
    })),
  )
}
