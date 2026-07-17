import { restHeightFor } from '../desk/layout'
import { PHOTO_FRAME_ID } from '../desk/constants'
import { gallery } from '../content/portfolio'
import { aboutPages, aboutPhotos, ABOUT_PAPER } from './content/about'
import { projectPages, projectPhotos, PROJECTS_PAPER } from './content/projects'
import { researchPages, researchPhotos, RESEARCH_PAPER } from './content/research'
import { resumePages } from './content/resume'
import { contactPages } from './content/contact'

// Every top-level "page" of the site is one physical document on the desk.
// `pages` is an array of page painters (src/documents/content/*) — one
// `{ decor, draw }` pair per physical sheet, all rendered through the
// measured/clipped fit pipeline in src/lib/docTextures.js. Documents with
// more than one entry get the page-flip treatment in props.jsx; the paper
// itself is the only UI. Projects and Research author their content as
// blocks and are paginated by src/lib/pageFlow.js, so their paper dims live
// with their content (the flow needs the content box at build time).
//
// Positions are world coordinates on the desktop (top surface at y = 0).
// The Y component is always computed from the paper's real thickness in
// layout.js — never hardcode it, that's how sheets end up z-fighting.
// `yaw` spins the sheet flat on the desk.
//
// Footprints are checked against each other and the clutter by
// DevLayoutAudit in dev builds; if you move or add a document here, watch
// the console for [desk-layout] warnings.

const rest = (kind, x, z, yaw) => ({ position: [x, restHeightFor(kind), z], yaw })

export const DOCUMENTS = [
  {
    id: 'about',
    title: 'About',
    kind: 'card',
    pages: aboutPages,
    photos: aboutPhotos,
    paper: ABOUT_PAPER,
    rest: rest('card', -2.45, 1.3, 0.18),
  },
  {
    id: 'projects',
    title: 'Projects',
    kind: 'stack',
    pages: projectPages,
    // Polaroids pinned to the pages their photos flowed onto (Polaroids.jsx).
    // Absent/empty on a document simply means no photos.
    photos: projectPhotos,
    paper: PROJECTS_PAPER,
    rest: rest('stack', 1.8, 1.05, -0.12),
  },
  {
    id: 'research',
    title: 'Rocketry',
    kind: 'blueprint',
    pages: researchPages,
    photos: researchPhotos,
    paper: RESEARCH_PAPER,
    rest: rest('blueprint', 0.75, -1.7, 0.05),
  },
  {
    id: 'resume',
    title: 'Resume',
    kind: 'fold',
    pages: resumePages,
    paper: { w: 1.7, h: 2.3 },
    rest: rest('fold', -2.2, -0.95, -0.12),
  },
  {
    id: 'contact',
    title: 'Contact',
    kind: 'envelope',
    pages: contactPages,
    paper: { w: 1.7, h: 1.05 },
    rest: rest('envelope', 3.85, 2.5, -0.28),
  },
]

export const byId = (id) => DOCUMENTS.find((d) => d.id === id)

/**
 * How many sheets the focused thing flips through — 0 if nothing is focused,
 * 1 for a single-sheet document. The photo album isn't a document (it's the
 * frame's `gallery.photos`, keyed by PHOTO_FRAME_ID) but it rides the same
 * store paging, so every input that can turn a page — the arrow keys
 * (ui/KeyControls), a swipe (desk/TouchControls) and the HUD's counter — needs
 * this exact same answer. It lives here so those three can't drift apart.
 */
export const pageCountOf = (id) =>
  id === PHOTO_FRAME_ID
    ? Math.max(1, gallery.photos.length)
    : byId(id)?.pages.length ?? 0
