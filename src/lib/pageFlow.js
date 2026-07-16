/**
 * Block-flow pagination for multi-page documents (the "measure, then
 * paginate" half of the fit pipeline in docTextures.js — single-page
 * documents shrink instead, multi-page documents flow).
 *
 * A document's content is authored as *sheets* — one per drawing/section —
 * and each sheet is an ordered list of *blocks* (a heading, a figure, one
 * bullet, one note line…). Blocks are flowed top-to-bottom through the
 * paper's content box; a block that doesn't fit the space left on the
 * current page pushes onto a fresh page, so splits only ever happen at
 * block boundaries — never mid-sentence or mid-figure. Growing a sheet's
 * content later simply mints more pages for the existing page-flip system;
 * nothing is re-tuned by hand.
 *
 * Sheet: {
 *   decor(ctx, W, H, rnd, page, count)  full-bleed dressing, repeated on
 *                                       every page the sheet spans
 *   blocks: [Block]
 *   cont?: Block                        optional small "cont'd" header
 *                                       prepended to continuation pages
 * }
 * Block: {
 *   h:    advance height in texture px (how far the cursor moves)
 *   inkH: painted height, if less than `h` — trailing breathing room does
 *         not count against the page bottom
 *   keepWithNext?: true  a header that must never be the last block on a page.
 *                        When a page break falls right after a run of these,
 *                        they are carried onto the next page with the block
 *                        that triggered the break, so a heading is never
 *                        stranded above content that flowed to the next sheet
 *                        (widow/orphan control).
 *   draw(ctx, W, H, y, rnd, link)      paint with the block's top edge at y
 * }
 *
 * Returns `{ decor, draw }` page painters ready for a registry `pages`
 * array (see docTextures.js for the page contract).
 *
 * Floated photos (lib/photos.js `photoFloat`) ride the same flow as an
 * obstacle: a `float` block reserves a side column but does NOT advance the
 * cursor, so the blocks after it flow *beside* it. Two things wrap a block
 * around the float while its rows overlap the photo:
 *   - a `reflowAround(startY, float)` block (the prose paragraphs) re-wraps
 *     itself to the narrow run for the lines beside the photo and the full run
 *     for lines below it (the stepped exclusion), and
 *   - any other block that lands beside the float is drawn through a narrowed
 *     content box so its text and rules can't cross under the photo.
 * A keep-with-next heading is dropped below the float instead of cramped beside
 * it. When wrapped content still overflows the page it paginates onto the next
 * sheet exactly as un-floated content does; the float stays on the page it
 * landed on.
 */
// Gutter between a floated photo and the text column beside it, in texture px.
const FLOAT_GUTTER = 30

/** Wrap a block so it paints through a temporarily narrowed content box (the
 *  column left of a right-side float / right of a left-side float), so its
 *  text() auto-fit and any box-aware rules stay clear of the photo. */
function narrowed(block, box, float) {
  const sub =
    float.side === 'left'
      ? { x: float.narrowRight, y: box.y, w: box.x + box.w - float.narrowRight, h: box.h }
      : { x: box.x, y: box.y, w: float.narrowRight - box.x, h: box.h }
  return {
    ...block,
    draw(ctx, W, H, y, rnd, link) {
      const prev = ctx._contentBox
      ctx._contentBox = sub
      block.draw(ctx, W, H, y, rnd, link)
      ctx._contentBox = prev
    },
  }
}

export function flowSheets(sheets, box) {
  const flowed = [] // { decor, items: [{ block, y }] }
  const bottom = box.y + box.h

  for (const sheet of sheets) {
    let items = []
    let y = box.y
    let float = null // active float on the current page (one at a time)
    const flush = () => {
      if (items.length) flowed.push({ decor: sheet.decor, items })
      items = []
      float = null // a float never spans a page break
    }
    const breakPage = (carried) => {
      flush()
      y = box.y
      if (sheet.cont) {
        items.push({ block: sheet.cont, y })
        y += sheet.cont.h
      }
      for (const b of carried) {
        items.push({ block: b, y })
        y += b.h
      }
    }
    for (const block of sheet.blocks) {
      // ---- floated photo: reserve a side column; the cursor does not move ----
      if (block.float) {
        const inkH = Math.min(block.inkH ?? block.floatSpan, block.floatSpan)
        if (y + inkH > bottom && items.length) breakPage([])
        if (float) {
          // A second photo can't share the column — fall back to an own-band
          // reservation (advance the cursor) so the two never overlap.
          items.push({ block, y })
          y += block.floatSpan
        } else {
          const left = block.side === 'left' ? box.x : box.x + box.w - block.w
          float = {
            top: y,
            bottom: y + block.floatSpan,
            left,
            narrowRight: block.side === 'left' ? box.x + box.w : left - FLOAT_GUTTER,
            side: block.side,
          }
          items.push({ block, y }) // carries the photo anchor; paints nothing
          // cursor stays put — following blocks flow beside the photo
        }
        continue
      }

      // A heading (keep-with-next) beside a float reads badly cramped in the
      // narrow column — drop it below the photo so it spans full width above
      // its body text.
      if (float && y < float.bottom && block.keepWithNext && !block.reflowAround) {
        y = float.bottom
      }

      const beside = float && y < float.bottom
      // Lay the block out for its slot: prose reflows around the float; anything
      // else keeps its declared height (only its draw is later narrowed).
      let placed = beside && block.reflowAround ? block.reflowAround(y, float) : block
      const inkH = Math.min(placed.inkH ?? placed.h, placed.h)
      if (import.meta.env.DEV && inkH > box.h) {
        console.warn(`[pageFlow] a block is taller (${inkH}px) than the content box (${box.h}px) — it will be clipped`)
      }
      if (y + inkH > bottom && items.length) {
        // Widow/orphan control: never let a trailing run of keep-with-next
        // headers be the last thing on the page. Pull them off the page just
        // being flushed and carry them onto the next page as a unit with the
        // block that triggered the break, so a heading always sits above its
        // content. (The remaining items still flush as their own page; if the
        // page was *only* headers, flush drops it rather than mint a blank.)
        const carried = []
        while (items.length && items[items.length - 1].block.keepWithNext) {
          carried.unshift(items.pop().block)
        }
        breakPage(carried)
        // Fresh page has no float yet — re-lay the block full width.
        placed = block
      }
      // A non-reflow block still sitting beside the float paints through a
      // narrowed box so it can't run under the photo.
      if (float && y < float.bottom && !block.reflowAround) {
        placed = narrowed(placed, box, float)
      }
      items.push({ block: placed, y })
      y += placed.h
    }
    flush()
  }

  return flowed.map(({ decor, items }) => ({
    decor,
    // dev-only: the ordered kinds of the blocks that landed on this page, so
    // widow/orphan checks and the debug harness can inspect pagination without
    // re-deriving the flow. Purely metadata; the painters never read it.
    kinds: items.map((it) => it.block.dbg ?? '?'),
    // Photo anchors: any block that carries a `photo` (see lib/photos.js) reports
    // where it landed on this page — its footprint rect in texture px, `y` from
    // the flow. Desk mode reads these to pin a 3D polaroid to the reserved spot
    // (src/desk/Polaroids.jsx). A page with no photos gets an empty list.
    anchors: items
      .filter((it) => it.block.photo)
      .map((it) => ({
        photo: it.block.photo,
        x: it.block.place.x,
        y: it.y,
        w: it.block.place.w,
        h: it.block.place.h,
      })),
    draw: (ctx, W, H, rnd, link) => {
      for (const it of items) it.block.draw(ctx, W, H, it.y, rnd, link)
    },
  }))
}
