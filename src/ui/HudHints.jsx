import { useSceneStore } from '../store/useSceneStore'
import { pageCountOf } from '../documents/registry'
import { profile, gallery, research } from '../content/portfolio'
import { IS_TOUCH } from '../lib/quality'
import { PHOTO_FRAME_ID, ROCKET_ID } from '../desk/constants'

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
  const isRocket = focusedId === ROCKET_ID
  const photoCount = Math.max(1, gallery.photos.length)
  const partCount = Math.max(1, research.vehicle.parts.length)
  const pages = focusedId && !isPhotos && !isRocket ? pageCountOf(focusedId) : 0

  const setDown = IS_TOUCH
    ? 'tap away to set it back down'
    : 'click away or press Esc to set it back down'

  let hint
  if (isRocket) {
    // Worded like a multi-page document's hint, because that is exactly what
    // the picked-up rocket is now: one object, stepped part by part.
    hint = partCount > 1
      ? IS_TOUCH
        ? `swipe or tap a bottom corner for the next part · ${setDown}`
        : 'tap a bottom corner or press ← → for the next part · Esc or click away to set it down'
      : setDown
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
  } else if (hoveredId === ROCKET_ID) {
    // Named, because "pick it up" alone would not tell a visitor that the thing
    // they are about to pick up comes apart into readable sections.
    hint = IS_TOUCH
      ? 'tap the rocket to read it part by part'
      : 'click the rocket to read it part by part'
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
