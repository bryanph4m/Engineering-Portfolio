import { useEffect } from 'react'
import { useSceneStore } from '../store/useSceneStore'
import { byId } from '../documents/registry'

/** Keyboard chrome for a picked-up document: Esc sets it down, arrows flip. */
export default function KeyControls() {
  const focusedId = useSceneStore((s) => s.focusedId)

  useEffect(() => {
    if (!focusedId) return
    const doc = byId(focusedId)
    const multiPage = doc && doc.pages.length > 1
    const onKey = (e) => {
      const s = useSceneStore.getState()
      if (e.key === 'Escape') s.close()
      else if (multiPage && e.key === 'ArrowRight') s.nextPage(doc.pages.length)
      else if (multiPage && e.key === 'ArrowLeft') s.prevPage()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusedId])

  return null
}
