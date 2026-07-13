import { useSceneStore } from '../store/useSceneStore'
import { byId } from '../documents/registry'
import { profile, gallery } from '../content/portfolio'
import { PHOTO_FRAME_ID } from '../desk/constants'

/** Flat UI chrome: the title block, a context-aware nav hint, and — when the
 *  photo album is open — a small position indicator. */
export default function HudHints() {
  const focusedId = useSceneStore((s) => s.focusedId)
  const hoveredId = useSceneStore((s) => s.hoveredId)
  const pageIndex = useSceneStore((s) => s.pageIndex)

  const isPhotos = focusedId === PHOTO_FRAME_ID
  const photoCount = Math.max(1, gallery.photos.length)
  const doc = focusedId && !isPhotos ? byId(focusedId) : null

  let hint
  if (isPhotos) {
    hint = photoCount > 1
      ? 'click the sides or press ← → to browse · Esc or click away to set it down'
      : 'click away or press Esc to set it back down'
  } else if (doc) {
    hint = doc.pages.length > 1
      ? 'tap a bottom corner or press ← → to flip · Esc or click away to set it down'
      : 'click away or press Esc to set it back down'
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
