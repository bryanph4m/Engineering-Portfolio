import { useEffect, useState } from 'react'
import { profile } from '../content/portfolio'

/**
 * The entry sheet shown before any site mode mounts — a drafted cover page
 * in the same hand-drawn language as the desk (ruled paper, technical
 * lettering, a drawing title block). Deliberately its own component and not
 * part of the desk scene: it offers a fork between the two site modes and
 * App mounts whichever mode id onEnter reports. Nothing here touches the desk
 * internals, and picking "simple view" never loads the 3D bundle at all.
 */
const MODES = [
  {
    id: 'desk',
    label: 'enter the desk',
    note: 'the interactive 3D experience',
  },
  {
    id: 'simple',
    label: 'simple view',
    note: 'quick read for recruiters',
  },
]

/** "Bryan Pham" → "B. PHAM", drafting-title-block style. */
const draftedBy = (name) => {
  const parts = name.split(' ')
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`.toUpperCase()
}

/**
 * A rocket sketched in the sheet's bottom margin, climbing away up the page on a
 * dashed ascent arc — the site's own subject, drawn the way the rest of the
 * drawing set is drawn.
 *
 * It is inline SVG strokes and nothing else: no image, no font, no request. The
 * start screen is the very first thing a visitor sees and the only thing between
 * them and the mode fork, so its whole visual budget has to come out of markup
 * that is already in the HTML payload. Same reason the arc reuses the loading
 * doodle's idiom — a faint dashed guide with a solid stroke drawing itself along
 * it — rather than introducing a second kind of motion.
 *
 * The vehicle is drawn with canards up near the nose as well as fins at the
 * tail, which is the one detail that makes it this rocket rather than a generic
 * one (see the Rocketry document, and the desk's model in desk/RocketModel).
 */
function DraftedRocket() {
  return (
    <svg className="start__rocket" viewBox="0 0 190 150" fill="none" aria-hidden="true">
      {/* the ascent arc: a dashed drafting guide, then the drawn flight path */}
      <path
        className="start__arc-rule"
        d="M6 144 C 34 126, 62 104, 88 80 C 110 60, 128 42, 142 26"
        pathLength="1"
      />
      <path
        className="start__arc"
        d="M6 144 C 34 126, 62 104, 88 80 C 110 60, 128 42, 142 26"
        pathLength="1"
      />
      {/* the vehicle, climbing along the arc's tangent */}
      <g className="start__rocket-body" transform="translate(150 30) rotate(38)">
        <path d="M0 -34 C 7 -20, 10 -9, 10 2 L 10 34 L -10 34 L -10 2 C -10 -9, -7 -20, 0 -34 Z" />
        {/* canards, forward */}
        <path d="M10 -4 L 22 -11 L 10 6 Z" />
        <path d="M-10 -4 L -22 -11 L -10 6 Z" />
        {/* fins, aft */}
        <path d="M10 18 L 26 40 L 10 34 Z" />
        <path d="M-10 18 L -26 40 L -10 34 Z" />
        {/* marking band + nozzle */}
        <path d="M-10 10 L 10 10" />
        <path d="M-6 34 L -8 43 L 8 43 L 6 34" />
      </g>
    </svg>
  )
}

/** Hand-wobbled ellipse, like a pencil circling a word a couple of times. */
function ScribbleRing() {
  return (
    <svg className="start__ring" viewBox="0 0 220 84" fill="none" aria-hidden="true">
      <path
        d="M28 44 C 30 20, 84 10, 122 12 C 168 14, 204 24, 200 44 C 196 66, 148 74, 104 72 C 58 70, 16 62, 20 42 C 23 26, 60 14, 96 14"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function StartScreen({ onEnter }) {
  const [leaving, setLeaving] = useState(null)

  const begin = (id) => setLeaving((cur) => cur ?? id)

  // let the sheet's exit transition play out before the mode mounts
  useEffect(() => {
    if (!leaving) return
    const t = setTimeout(() => onEnter(leaving), 600)
    return () => clearTimeout(t)
  }, [leaving, onEnter])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        begin(MODES[0].id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className={`start${leaving ? ' is-leaving' : ''}`}>
      <div className="start__sheet" role="presentation">
        <span className="start__pin" aria-hidden="true" />

        <p className="start__cover">portfolio · drawing set</p>

        <h1 className="start__name">{profile.name.toUpperCase()}</h1>
        <svg className="start__underline" viewBox="0 0 420 14" fill="none" aria-hidden="true">
          <path
            d="M6 9 C 80 4, 180 3, 250 7 C 320 11, 380 9, 414 6"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
        <p className="start__sub">{profile.disciplines.join(' · ')}</p>

        <div className="start__modes">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className="start__begin"
              onClick={() => begin(m.id)}
              disabled={!!leaving}
            >
              <ScribbleRing />
              <span className="start__begin-label">→ {m.label}</span>
              <span className="start__begin-note">{m.note}</span>
            </button>
          ))}
        </div>

        <DraftedRocket />

        <dl className="start__titleblock" aria-label="drawing title block">
          <div>
            <dt>drawn by</dt>
            <dd>{draftedBy(profile.name)}</dd>
          </div>
          <div>
            <dt>sheet</dt>
            <dd>01 / 01</dd>
          </div>
          <div>
            <dt>scale</dt>
            <dd>FULL</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
