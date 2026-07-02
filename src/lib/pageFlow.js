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
        flush()
        y = box.y
        if (sheet.cont) {
          items.push({ block: sheet.cont, y })
          y += sheet.cont.h
        }
      }
      items.push({ block, y })
      y += block.h
    }
    flush()
  }

  return flowed.map(({ decor, items }) => ({
    decor,
    draw: (ctx, W, H, rnd, link) => {
      for (const it of items) it.block.draw(ctx, W, H, it.y, rnd, link)
    },
  }))
}
