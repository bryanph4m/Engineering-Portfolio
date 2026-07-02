import { restHeightFor } from '../desk/layout'
import { aboutPages } from './content/about'
import { projectPages } from './content/projects'
import { researchPages } from './content/research'
import { resumePages } from './content/resume'
import { contactPages } from './content/contact'

// Every top-level "page" of the site is one physical document on the desk.
// `pages` is an array of canvas painters (src/documents/content/*) — one per
// physical sheet. Documents with more than one entry get the page-flip
// treatment in props.jsx; the paper itself is the only UI.
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
    paper: { w: 1.7, h: 1.15 },
    rest: rest('card', -2.45, 1.3, 0.18),
  },
  {
    id: 'projects',
    title: 'Projects',
    kind: 'stack',
    pages: projectPages,
    paper: { w: 2.2, h: 2.9 },
    rest: rest('stack', 1.8, 1.05, -0.12),
  },
  {
    id: 'research',
    title: 'Rocketry',
    kind: 'blueprint',
    pages: researchPages,
    paper: { w: 3.2, h: 2.0 },
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
