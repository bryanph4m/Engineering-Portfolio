import {
  HAND, TYPE, FAINT, RED,
  paperBase, handLine, handEllipse, handArrow, text, pageGeom,
} from '../../lib/docTextures'
import { photoSlot } from '../../lib/photos'
import { profile } from '../../content/portfolio'

// Index card — the whole story fits on one card. The card ruling is decor
// (it runs to the paper edge); everything else is measured content that
// shrinks to fit the box if it ever outgrows the card. The words come from
// the shared portfolio data (src/content/portfolio.js) so this card and the
// simple mode never disagree.

export const ABOUT_PAPER = { w: 1.7, h: 1.15 }
const { box } = pageGeom(ABOUT_PAPER, false)

/* ---- the card's photo ------------------------------------------------ */
// The first About figure (profile.photos) rides the card as a bare polaroid:
// image only, no title or caption — that's simple mode's job, same rule as the
// polaroids on the drawings and blueprints.
//
// It's reserved at 0.78× because this is a 1.7 × 1.15 m index card, not a
// drawing sheet: a full-size polaroid would eat a third of its width and leave
// the roles nowhere to go. `photoSlot` returns the reserved rect plus the
// content box narrowed to the column beside it, and the roles — the only copy
// that runs alongside the photo — are painted through that narrowed box, so the
// existing per-line auto-fit in text() keeps them clear of the frame. Everything
// below the photo (the motto, the bottom margin note) keeps the full width.
const PHOTO_SCALE = 0.78
// Top of the polaroid in texture px: under the name/location meta line, and
// high enough that its bottom clears the motto.
const PHOTO_TOP = 180

const slot = profile.photos?.length
  ? photoSlot(profile.photos[0], ABOUT_PAPER, box, { scale: PHOTO_SCALE, y: PHOTO_TOP })
  : null

// Placed polaroid for the card, in the same `{ photo, page, rect }` shape
// pageFlow's anchors flatten to, so the desk registry → Polaroids.jsx reads it
// exactly like the flowed documents'. One page, so it always lands on page 0.
export const aboutPhotos = slot ? [{ photo: slot.photo, page: 0, rect: slot.rect }] : []

const roleBox = slot?.textBox ?? box

/* ---- the roles ------------------------------------------------------- */
const ROLE_SIZE = 56
const ROLE_MIN = 34

/**
 * One size for the whole roles list, measured across every role at once.
 *
 * Each role is painted as two runs (the lead in the hand, the org in bold), and
 * letting each text() call auto-fit on its own would size the two halves of the
 * same line differently — and different roles differently again. So the list is
 * measured as a unit here and painted at one shared size, which is what makes it
 * read as one hand. Sized to the longest role against `maxW`, the run left over
 * once the polaroid has taken its column.
 */
function roleSize(ctx, roles, maxW) {
  const lineW = (s) => {
    let widest = 0
    for (const r of roles) {
      ctx.font = `${s}px ${HAND}`
      const lead = ctx.measureText(r.lead).width
      ctx.font = `bold ${s}px ${HAND}`
      widest = Math.max(widest, lead + ctx.measureText(r.emphasis).width)
    }
    return widest
  }
  let size = ROLE_SIZE
  while (size > ROLE_MIN && lineW(size) > maxW) size -= 0.5
  return size
}

function decorAbout(ctx, W, H, rnd) {
  paperBase(ctx, W, H, rnd, '#f8f2e4')

  // index-card ruling: one red line up top, faint blue below
  ctx.strokeStyle = 'rgba(179,86,63,0.65)'
  ctx.lineWidth = 4
  handLine(ctx, 70, 330, W - 70, 330, rnd, 2)
  ctx.strokeStyle = 'rgba(120,140,170,0.30)'
  ctx.lineWidth = 2
  for (let y = 460; y < H - 130; y += 130) {
    ctx.beginPath(); ctx.moveTo(70, y); ctx.lineTo(W - 70, y); ctx.stroke()
  }
}

function paintAbout(ctx, W, H, rnd) {
  text(ctx, 'INDEX CARD · NO. 01', 100, 140, { size: 34, color: FAINT, spacing: 8 })
  text(ctx, `${profile.name} · ${profile.location}`, W - 100, 140, { size: 36, color: '#5c5340', align: 'right' })
  text(ctx, 'ABOUT', 96, 285, { font: TYPE, size: 128 })
  ctx.strokeStyle = RED
  ctx.lineWidth = 5
  handLine(ctx, 100, 308, 540, 302, rnd, 4)

  // The roles run beside the polaroid, so they're measured against the narrowed
  // box for the whole pass — text()'s auto-fit reads ctx._contentBox.
  const prevBox = ctx._contentBox
  ctx._contentBox = roleBox
  const size = roleSize(ctx, profile.roles, roleBox.x + roleBox.w - 110)
  // spacing tightens as roles are added so the list stays clear of the motto
  const step = profile.roles.length > 3 ? 108 : 130
  let y = 445
  for (const r of profile.roles) {
    const w1 = text(ctx, r.lead, 110, y, { font: HAND, size })
    const w2 = text(ctx, r.emphasis, 110 + w1, y, { font: HAND, size, weight: 'bold' })
    if (r.circled) {
      ctx.strokeStyle = 'rgba(179,86,63,0.8)'
      ctx.lineWidth = 4
      handEllipse(ctx, 110 + w1 + w2 / 2, y - size * 0.32, w2 / 2 + 34, size * 0.79, rnd)
    }
    y += step
  }
  ctx._contentBox = prevBox

  // the motto, scribbled between the rules — below the photo, so full width
  text(ctx, `"${profile.motto}"`, 130, 880, {
    font: HAND, size: 44, color: '#7a5a2f',
  })

  text(ctx, 'the short version', 110, H - 100, { size: 30, color: FAINT, spacing: 4 })

  // margin doodle: arrow to the current-work note
  ctx.strokeStyle = 'rgba(122,90,47,0.9)'
  ctx.lineWidth = 4
  handArrow(ctx, 470, H - 165, 545, H - 118, rnd)
  text(ctx, `now: ${profile.now.map((n) => n.label).join(' · ')}`, 565, H - 100, {
    font: HAND, size: 42, color: '#7a5a2f',
  })
}

export const aboutPages = [{ decor: decorAbout, draw: paintAbout }]
