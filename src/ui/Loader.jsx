import { useEffect, useRef } from 'react'
import { useProgress } from '@react-three/drei'
import { useSceneStore } from '../store/useSceneStore'

/**
 * Loading screen for desk mode: a blueprint-sketched fighter jet flying across
 * the screen, its contrail growing behind it. The contrail's length IS the
 * progress bar — it is tied to the scene's real readiness, not a fixed-duration
 * animation, so the jet can neither outrun the load nor sit finished while
 * assets are still coming in.
 *
 * The progress it reports is a monotonic blend of the genuine load signals this
 * scene actually exposes:
 *   - `useProgress()` — drei's read of THREE's DefaultLoadingManager, the real
 *     count of assets routed through a loader (textures, etc.);
 *   - `sceneDrawn`    — the canvas has compiled shaders and painted real frames
 *     (FirstFramesGate in DeskScene), the scene's single biggest wait;
 *   - fonts ready     — the bundled TTFs have swapped in;
 *   - `ready`         — DeskMode's final gate (all of the above + one settle
 *     frame). Only this drives the bar to a true 100%.
 *
 * The bar is capped below 100% until `ready`, then eases the last stretch as the
 * loader crossfades out (the existing `.loader.is-hidden` opacity transition),
 * so the jet finishes its flight exactly as the desk is revealed. Everything it
 * needs is inline SVG + CSS — no images, fonts, or libraries beyond drei, which
 * the desk chunk already carries, so the loading screen loads nothing itself.
 */
export default function Loader() {
  const ready = useSceneStore((s) => s.ready)
  const sceneDrawn = useSceneStore((s) => s.sceneDrawn)
  const { progress: assetProgress, total } = useProgress()

  const flightRef = useRef(null)
  const pctRef = useRef(null)

  // Latest real signals, mirrored into refs so the single rAF loop can read them
  // without re-subscribing. Assigned every render — cheap, and always current.
  const assetFracRef = useRef(0)
  const sceneDrawnRef = useRef(false)
  const readyRef = useRef(false)
  const fontsReadyRef = useRef(false)
  assetFracRef.current = total > 0 ? Math.min(1, assetProgress / 100) : 0
  sceneDrawnRef.current = sceneDrawn
  readyRef.current = ready

  // Fonts are a real milestone but resolve via a promise, not a render prop.
  useEffect(() => {
    let alive = true
    const fonts = document.fonts?.ready ?? Promise.resolve()
    fonts.then(() => {
      if (alive) fontsReadyRef.current = true
    })
    return () => {
      alive = false
    }
  }, [])

  // One rAF loop drives the contrail's length off the real signals above. It
  // eases the drawn value toward a target set purely by load state (the ease is
  // smoothing, never the source of progress) and is strictly monotonic, so the
  // jet only ever moves forward. `--p` (0..1) is the flight fraction; the CSS
  // turns it into both the contrail width and the jet's position.
  useEffect(() => {
    let raf = 0
    let p = 0
    let alive = true
    let lastPct = -1

    const tick = () => {
      if (!alive) return

      // Real, observable readiness — weighted so the big waits move the jet the
      // most, capped short of the end so there is always a final approach left
      // to run as the desk is revealed.
      const target = readyRef.current
        ? 1
        : Math.min(
            0.92,
            0.08 +
              0.32 * assetFracRef.current +
              0.4 * (sceneDrawnRef.current ? 1 : 0) +
              0.14 * (fontsReadyRef.current ? 1 : 0),
          )

      const goal = Math.max(p, target) // never retreat
      p += (goal - p) * 0.08
      if (goal - p < 0.0015) p = goal

      // Written on .loader__flight, the element that declares --p — writing it
      // on an ancestor would be shadowed by that local declaration.
      if (flightRef.current) flightRef.current.style.setProperty('--p', p.toFixed(4))
      const pct = Math.round(p * 100)
      if (pct !== lastPct && pctRef.current) {
        pctRef.current.textContent = `${pct}`
        lastPct = pct
      }

      // Fully arrived and the scene is up — stop burning frames; the CSS fade
      // takes it from here.
      if (readyRef.current && p >= 1) return
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div
      className={`loader${ready ? ' is-hidden' : ''}`}
      role="progressbar"
      aria-label="Loading the desk scene"
      aria-hidden={ready}
    >
      <div ref={flightRef} className="loader__flight">
        {/* dashed drafting under-rule the jet is measured along */}
        <div className="loader__rule" />
        {/* the contrail — its length is the loading progress */}
        <div className="loader__contrail" />
        {/* blueprint fighter jet, nose leading the direction of travel */}
        <svg className="loader__jet" viewBox="0 0 128 56" fill="none" aria-hidden="true">
          {/* fuselage */}
          <path
            d="M12 30 L70 26 Q98 23 122 30 Q98 35 70 34 L18 35 Q6 34 12 30 Z"
            fill="rgba(240,227,198,0.06)"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* pitot / nose probe */}
          <line x1="122" y1="30" x2="128" y2="30" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          {/* canopy */}
          <path d="M84 26 Q95 17 106 26" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          {/* swept delta wing */}
          <path
            d="M74 32 L50 47 L40 47 L66 32 Z"
            fill="rgba(240,227,198,0.06)"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* vertical tail fin */}
          <path
            d="M26 28 L14 8 L22 8 L34 28 Z"
            fill="rgba(240,227,198,0.06)"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* horizontal stabilizer */}
          <path
            d="M22 34 L8 42 L4 42 L18 34 Z"
            fill="rgba(240,227,198,0.06)"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="loader__label">
        <span className="loader__pct" ref={pctRef}>0</span>% · loading
      </div>
    </div>
  )
}
