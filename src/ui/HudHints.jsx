import { useSceneStore } from '../store/useSceneStore'
import { byId } from '../documents/registry'
import { profile } from '../content/portfolio'

/** Flat UI chrome: the title block and a context-aware nav hint. */
export default function HudHints() {
  const focusedId = useSceneStore((s) => s.focusedId)
  const hoveredId = useSceneStore((s) => s.hoveredId)

  const doc = focusedId ? byId(focusedId) : null
  const hint = doc
    ? doc.pages.length > 1
      ? 'tap a bottom corner or press ← → to flip · Esc or click away to set it down'
      : 'click away or press Esc to set it back down'
    : hoveredId
      ? 'click to pick it up'
      : 'pick up a document from the desk'

  return (
    <div className="hud">
      <div className="hud__title">
        <h1>{profile.name.toUpperCase()}</h1>
        <p>{profile.disciplines.join(' · ')}</p>
      </div>
      <div className="hud__hint" style={{ opacity: focusedId ? 0.8 : 0.85 }}>
        {hint}
      </div>
    </div>
  )
}
