import { lazy } from 'react'
import { restHeightFor } from '../desk/layout'

// Every top-level "page" of the site is one physical document on the desk.
// `pages` drives the multi-page page-turn behaviour; `Content` is lazily
// loaded so heavier project imagery only arrives once a document is opened.
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
    pages: 1,
    paper: { w: 1.7, h: 1.15 },
    rest: rest('card', -2.45, 1.3, 0.18),
    Content: lazy(() => import('./content/About.jsx')),
  },
  {
    id: 'projects',
    title: 'Projects',
    kind: 'stack',
    pages: 4,
    paper: { w: 2.2, h: 2.9 },
    rest: rest('stack', 1.8, 1.05, -0.12),
    Content: lazy(() => import('./content/Projects.jsx')),
  },
  {
    id: 'research',
    title: 'Rocketry',
    kind: 'blueprint',
    pages: 3,
    paper: { w: 3.2, h: 2.0 },
    rest: rest('blueprint', 0.75, -1.7, 0.05),
    Content: lazy(() => import('./content/Research.jsx')),
  },
  {
    id: 'resume',
    title: 'Resume',
    kind: 'fold',
    pages: 1,
    paper: { w: 1.7, h: 2.3 },
    rest: rest('fold', -2.2, -0.95, -0.12),
    Content: lazy(() => import('./content/Resume.jsx')),
  },
  {
    id: 'contact',
    title: 'Contact',
    kind: 'envelope',
    pages: 1,
    paper: { w: 1.7, h: 1.05 },
    rest: rest('envelope', 3.85, 2.5, -0.28),
    Content: lazy(() => import('./content/Contact.jsx')),
  },
]

export const byId = (id) => DOCUMENTS.find((d) => d.id === id)
