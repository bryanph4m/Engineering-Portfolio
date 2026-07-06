import { useEffect, useState } from 'react'

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

        <h1 className="start__name">BRYAN PHAM</h1>
        <svg className="start__underline" viewBox="0 0 420 14" fill="none" aria-hidden="true">
          <path
            d="M6 9 C 80 4, 180 3, 250 7 C 320 11, 380 9, 414 6"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
        <p className="start__sub">mechanical engineering · rocketry · ai</p>

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

        <dl className="start__titleblock" aria-label="drawing title block">
          <div>
            <dt>drawn by</dt>
            <dd>B. PHAM</dd>
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
