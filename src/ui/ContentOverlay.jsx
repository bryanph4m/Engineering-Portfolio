import { Suspense, useEffect, useRef, useState } from 'react'
import { useSceneStore } from '../store/useSceneStore'
import { byId } from '../documents/registry'

/**
 * The readable face of a picked-up document. Rendered as real, crisp DOM
 * locked over the centre of the screen (where the 3D sheet floats), rather
 * than a baked texture that would blur. Handles Escape-to-close, arrow-key /
 * swipe page turns, and lazy-loads each document's content on open.
 */
export default function ContentOverlay() {
  const focusedId = useSceneStore((s) => s.focusedId)
  const pageIndex = useSceneStore((s) => s.pageIndex)
  const flipDir = useSceneStore((s) => s.flipDir)
  const close = useSceneStore((s) => s.close)
  const nextPage = useSceneStore((s) => s.nextPage)
  const prevPage = useSceneStore((s) => s.prevPage)

  // keep the last document mounted through the fade-out
  const [renderId, setRenderId] = useState(null)
  useEffect(() => {
    if (focusedId) setRenderId(focusedId)
  }, [focusedId])

  const open = !!focusedId
  const doc = renderId ? byId(renderId) : null
  const multiPage = doc && doc.pages > 1

  // keyboard: Esc closes, arrows flip pages
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') close()
      else if (multiPage && e.key === 'ArrowRight') nextPage(doc.pages)
      else if (multiPage && e.key === 'ArrowLeft') prevPage()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, multiPage, doc, close, nextPage, prevPage])

  // swipe to flip on touch / drag
  const swipe = useRef({ x: 0, y: 0, active: false })
  const onDown = (e) => {
    swipe.current = { x: e.clientX, y: e.clientY, active: true }
  }
  const onUp = (e) => {
    if (!swipe.current.active || !multiPage) return
    swipe.current.active = false
    const dx = e.clientX - swipe.current.x
    const dy = e.clientY - swipe.current.y
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) nextPage(doc.pages)
      else prevPage()
    }
  }

  const stop = (e) => e.stopPropagation()

  return (
    <div
      className={`overlay${open ? ' is-open' : ''}`}
      onClick={close}
      onTransitionEnd={() => {
        if (!focusedId) setRenderId(null)
      }}
    >
      {doc && (
        <div
          className="doc-paper"
          onClick={stop}
          onPointerDown={onDown}
          onPointerUp={onUp}
          style={{
            // next turns in from the left edge, prev from the right
            '--turn-origin': flipDir >= 0 ? 'left center' : 'right center',
            '--turn-angle': flipDir >= 0 ? '-100deg' : '100deg',
          }}
        >
          <button className="doc-close" onClick={close} aria-label="Close document">
            ✕
          </button>

          <div className="doc-page" key={pageIndex}>
            <Suspense fallback={<p className="doc-meta">unrolling…</p>}>
              <doc.Content page={pageIndex} />
            </Suspense>
          </div>

          {multiPage && (
            <div className="pager" onClick={stop}>
              <button onClick={prevPage} disabled={pageIndex === 0} aria-label="Previous page">
                ‹
              </button>
              <span className="pager__count">
                {pageIndex + 1} of {doc.pages}
              </span>
              <button
                onClick={() => nextPage(doc.pages)}
                disabled={pageIndex === doc.pages - 1}
                aria-label="Next page"
              >
                ›
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
