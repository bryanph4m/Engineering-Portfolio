import { useSceneStore } from '../store/useSceneStore'

/**
 * Hand-drawn "loading" doodle — a compass sketching an arc — shown until the
 * scene assets and fonts are ready. Fits the drafting theme better than a
 * spinner.
 */
export default function Loader() {
  const ready = useSceneStore((s) => s.ready)
  return (
    <div className={`loader${ready ? ' is-hidden' : ''}`} aria-hidden={ready}>
      <div style={{ textAlign: 'center' }}>
        <svg className="loader__doodle" viewBox="0 0 120 120" fill="none">
          {/* compass arc being drawn */}
          <path
            className="loader__ink"
            d="M20 96 A 44 44 0 0 1 100 60"
            stroke="#f0e3c6"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* compass legs */}
          <line x1="60" y1="18" x2="20" y2="96" stroke="#e9dcbf" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="60" y1="18" x2="100" y2="60" stroke="#e9dcbf" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="60" cy="16" r="4" fill="#b9963f" />
          <circle cx="20" cy="96" r="3" fill="#f0e3c6" />
          <path d="M96 56 l8 4 -4 8" stroke="#e9dcbf" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="loader__label">
          loading<span className="loader__dots" />
        </div>
      </div>
    </div>
  )
}
