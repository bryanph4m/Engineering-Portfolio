import { useSceneStore } from '../store/useSceneStore'
import { pageCountOf } from '../documents/registry'
import { profile, gallery } from '../content/portfolio'
import { IS_TOUCH } from '../lib/quality'
import { PHOTO_FRAME_ID } from '../desk/constants'

/** Flat UI chrome: the title block, a context-aware nav hint, and — when the
 *  photo album is open — a small position indicator.
 *
 *  The hint names the input the visitor actually has: a touch device has no
 *  cursor to click and no Esc key, so it is told about taps and swipes
 *  (desk/TouchControls) while a mouse is told about clicks and the arrow keys
 *  (ui/KeyControls). Both sets of gestures always work — only the wording
 *  changes. The edge-tap panning is pointedly absent from all of it: that one
 *  is discovered, with a single first-visit nudge from ui/EdgeHint. */
export default function HudHints() {
  const focusedId = useSceneStore((s) => s.focusedId)
  const hoveredId = useSceneStore((s) => s.hoveredId)
  const pageIndex = useSceneStore((s) => s.pageIndex)

  const isPhotos = focusedId === PHOTO_FRAME_ID
  const photoCount = Math.max(1, gallery.photos.length)
  const pages = focusedId && !isPhotos ? pageCountOf(focusedId) : 0

  const setDown = IS_TOUCH
    ? 'tap away to set it back down'
    : 'click away or press Esc to set it back down'

  let hint
  if (isPhotos) {
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
