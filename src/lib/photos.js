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
 * Flow blocks that reserve each photo's polaroid footprint inside `box`,
 * centred horizontally. They paint nothing — the polaroid mesh is drawn on top
 * by Polaroids.jsx — but their declared height makes pageFlow lay out and
 * paginate around them just like a figure. Each block carries the photo and its
 * footprint so pageFlow can report the landing spot as an anchor.
 */
export function photoBlocks(photos, paper, box) {
  if (!photos?.length) return []
  const { W, H } = texDims(paper)
  const f = polaroidFrame()
  const wpx = (f.w / paper.w) * W
  const hpx = (f.h / paper.h) * H
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
