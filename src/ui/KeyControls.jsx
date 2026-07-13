import { useEffect } from 'react'
import { useSceneStore } from '../store/useSceneStore'
import { byId } from '../documents/registry'
import { PHOTO_FRAME_ID } from '../desk/constants'
import { gallery } from '../content/portfolio'

/** Keyboard chrome for a picked-up document or the photo album: Esc sets it
 *  down, ←/→ flip pages (or step through photos). */
export default function KeyControls() {
  const focusedId = useSceneStore((s) => s.focusedId)

  useEffect(() => {
    if (!focusedId) return
    // The photo album isn't in the registry; it flips through gallery.photos
    // via the same store paging as a multi-page document.
    const count =
      focusedId === PHOTO_FRAME_ID
        ? Math.max(1, gallery.photos.length)
        : byId(focusedId)?.pages.length ?? 0
    const multiPage = count > 1
    const onKey = (e) => {
      const s = useSceneStore.getState()
      if (e.key === 'Escape') s.close()
      else if (multiPage && e.key === 'ArrowRight') s.nextPage(count)
      else if (multiPage && e.key === 'ArrowLeft') s.prevPage()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusedId])

  return null
}
