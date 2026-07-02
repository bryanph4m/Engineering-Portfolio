import { useSceneStore } from '../store/useSceneStore'

/** Flat UI chrome: the title block and a context-aware nav hint. */
export default function HudHints() {
  const focusedId = useSceneStore((s) => s.focusedId)
  const hoveredId = useSceneStore((s) => s.hoveredId)

  const hint = focusedId
    ? 'click away or press Esc to set it back down'
    : hoveredId
      ? 'click to pick it up'
      : 'pick up a document from the desk'

  return (
    <div className="hud">
      <div className="hud__title">
        <h1>BRYAN PHAM</h1>
        <p>mechanical engineering · rocketry · ai</p>
      </div>
      <div className="hud__hint" style={{ opacity: focusedId ? 0.8 : 0.85 }}>
        {hint}
      </div>
    </div>
  )
}
