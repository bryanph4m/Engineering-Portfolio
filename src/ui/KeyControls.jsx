import { useEffect } from 'react'
import { useSceneStore } from '../store/useSceneStore'
import { pageCountOf } from '../documents/registry'

/** Keyboard chrome for a picked-up document or the photo album: Esc sets it
 *  down, ←/→ flip pages (or step through photos). The touch equivalents (a
 *  swipe, the painted page corners) live in desk/TouchControls. */
export default function KeyControls() {
  const focusedId = useSceneStore((s) => s.focusedId)

  useEffect(() => {
    if (!focusedId) return
    const count = pageCountOf(focusedId)
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
