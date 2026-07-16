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
 */
export function flowSheets(sheets, box) {
  const flowed = [] // { decor, items: [{ block, y }] }
  const bottom = box.y + box.h

  for (const sheet of sheets) {
    let items = []
    let y = box.y
    const flush = () => {
      if (items.length) flowed.push({ decor: sheet.decor, items })
      items = []
    }
    for (const block of sheet.blocks) {
      const inkH = Math.min(block.inkH ?? block.h, block.h)
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
      items.push({ block, y })
      y += block.h
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
