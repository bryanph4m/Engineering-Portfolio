import { useSceneStore } from '../store/useSceneStore'
import { pageCountOf } from '../documents/registry'
import { profile, gallery, research } from '../content/portfolio'
import { IS_TOUCH } from '../lib/quality'
import { PHOTO_FRAME_ID, ROCKET_PREFIX, isRocketId } from '../desk/constants'

/** Flat UI chrome: the title block, the switch to the simple view, a
 *  context-aware nav hint, and — when the photo album is open — a small position
 *  indicator.
 *
 *  The hint names the input the visitor actually has: a touch device has no
 *  cursor to click and no Esc key, so it is told about taps and swipes
 *  (desk/TouchControls) while a mouse is told about clicks and the arrow keys
 *  (ui/KeyControls). Both sets of gestures always work — only the wording
 *  changes. The edge-tap panning is pointedly absent from all of it: that one
 *  is discovered, with a single first-visit nudge from ui/EdgeHint.
 *
 *  Everything here is inside a `pointer-events: none` layer so it can never
 *  steal a click from the scene underneath. The one control that has to be
 *  clickable — the mode switch — takes `pointer-events: auto` back for itself
 *  alone (see .hud__switch in index.css). */
export default function HudHints({ onSwitchMode }) {
  const focusedId = useSceneStore((s) => s.focusedId)
  const hoveredId = useSceneStore((s) => s.hoveredId)
  const pageIndex = useSceneStore((s) => s.pageIndex)

  const isPhotos = focusedId === PHOTO_FRAME_ID
  const isRocket = isRocketId(focusedId)
  const photoCount = Math.max(1, gallery.photos.length)
  const pages = focusedId && !isPhotos && !isRocket ? pageCountOf(focusedId) : 0

  const setDown = IS_TOUCH
    ? 'tap away to set it back down'
    : 'click away or press Esc to set it back down'
  const closeDetail = IS_TOUCH
    ? 'tap away to close the detail'
    : 'click away or press Esc to close the detail'

  /** The name of whatever rocket section is open or under the cursor. */
  const rocketPartName = (id) =>
    research.vehicle.parts.find((p) => p.id === id.slice(ROCKET_PREFIX.length))?.name

  let hint
  if (isRocket) {
    hint = closeDetail
  } else if (isPhotos) {
    hint = photoCount > 1
      ? IS_TOUCH
        ? `tap the sides or swipe to browse · ${setDown}`
        : 'click the sides or press ← → to browse · Esc or click away to set it down'
      : setDown
  } else if (pages) {
    hint = pages > 1
      ? IS_TOUCH
        ? `swipe or tap a bottom corner to flip · ${setDown}`
        : 'tap a bottom corner or press ← → to flip · Esc or click away to set it down'
      : setDown
  } else if (isRocketId(hoveredId)) {
    // Naming the part under the cursor is what tells a visitor the rocket is
    // made of parts at all — without it, a section lighting up reads as the
    // whole model being hoverable.
    const name = rocketPartName(hoveredId)
    hint = IS_TOUCH ? `tap the ${name?.toLowerCase()}` : `click to inspect the ${name?.toLowerCase()}`
  } else if (IS_TOUCH) {
    hint = 'tap a document to pick it up'
  } else {
    hint = hoveredId ? 'click to pick it up' : 'pick up a document from the desk'
  }

  return (
    <div className="hud">
      <div className="hud__title">
        <h1>{profile.name.toUpperCase()}</h1>
        <p>{profile.disciplines.join(' · ')}</p>
        {/* Routes through App's mode state, the same fork the start screen
            takes — there is no second navigation path to keep in step. */}
        <button type="button" className="hud__switch" onClick={onSwitchMode}>
          switch to simple view
        </button>
      </div>
      {isPhotos && photoCount > 1 && (
        <div className="hud__count">
          {Math.min(pageIndex, photoCount - 1) + 1} / {photoCount}
        </div>
      )}
      <div className="hud__hint" style={{ opacity: focusedId ? 0.8 : 0.85 }}>
        {hint}
      </div>
    </div>
  )
}
