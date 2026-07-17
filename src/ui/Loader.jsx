import { useEffect, useRef } from 'react'
import { useProgress } from '@react-three/drei'
import { useSceneStore } from '../store/useSceneStore'

// The single arc the jet flies. It launches level at the lower-left (near the
// viewer, so the jet reads large), then curves up and to the right, receding
// toward a vanishing point in the upper-right where the jet ends up small and
// far away. Authored once, in the SVG's own user units (viewBox 0 0 600 300),
// and shared by the contrail path AND the jet's per-frame placement, so the
// trail's tip and the jet's tail are always the exact same point on the curve.
const ARC = 'M60 250 C 200 250 380 165 520 72'

/**
 * Loading screen for desk mode: a blueprint-sketched fighter jet on a launch-like
 * arc — it starts close and large, then curves up and away, shrinking into the
 * distance the way SpaceX's rocket animation sells a departure, with its contrail
 * tracing the same curve and tapering off behind it. The contrail's length IS the
 * progress bar — it is tied to the scene's real readiness, not a fixed-duration
 * animation, so the jet can neither outrun the load nor sit finished while assets
 * are still coming in.
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
 * loader crossfades out (the existing `.loader.is-hidden` opacity transition), so
 * the jet finishes its climb exactly as the desk is revealed.
 *
 * Depth is faked, not rendered: `p` (0..1) is the real flight fraction, and every
 * frame we sample the shared arc with getPointAtLength to place the jet, bank it
 * along the tangent, and scale it down on an ease-out curve so it appears to
 * accelerate away into perspective. The contrail is the same arc revealed to the
 * same `p` via stroke-dashoffset, so it tapers away with the jet as one receding
 * shape. Everything it needs is inline SVG + CSS — no images, fonts, or libraries
 * beyond drei, which the desk chunk already carries, so the loading screen loads
 * nothing itself.
 */
export default function Loader() {
  const ready = useSceneStore((s) => s.ready)
  const sceneDrawn = useSceneStore((s) => s.sceneDrawn)
  const { progress: assetProgress, total } = useProgress()

  const pathRef = useRef(null) // the arc's geometry — sampled for the jet's placement
  const contrailRef = useRef(null) // same arc, revealed to `p` behind the jet
  const jetRef = useRef(null)
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

  // One rAF loop drives the flight off the real signals above. It eases the drawn
  // value toward a target set purely by load state (the ease is smoothing, never
  // the source of progress) and is strictly monotonic, so the jet only ever moves
  // forward. `p` (0..1) is the flight fraction; from it we derive the jet's point
  // on the arc, its bank, its receding scale, and the contrail's revealed length.
  useEffect(() => {
    const path = pathRef.current
    if (!path) return

    let raf = 0
    let p = 0
    let alive = true
    let lastPct = -1
    const total = path.getTotalLength()

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

      // Where the jet is on the arc, and the tangent just ahead so it banks into
      // the curve instead of flying flat through it.
      const at = path.getPointAtLength(p * total)
      const ahead = path.getPointAtLength(Math.min(p + 0.002, 1) * total)
      const angle = (Math.atan2(ahead.y - at.y, ahead.x - at.x) * 180) / Math.PI

      // Ease-out on the recession: it shrinks fast early, then settles, so the jet
      // reads as accelerating away rather than shrinking at a constant rate. The
      // arc position stays linear in `p` so the jet's tail never parts from the
      // contrail's tip — only the scale is eased.
      const ease = p * (2 - p) // ease-out quad
      const scale = 1 - 0.74 * ease

      // translate → rotate → scale → recentre the art (its centroid is ~66,28 in
      // the 128×56 jet viewBox), so the jet sits centred on the arc point, banked
      // along the tangent, at its receding size.
      jetRef.current.setAttribute(
        'transform',
        `translate(${at.x} ${at.y}) rotate(${angle}) scale(${scale}) translate(-66 -28)`,
      )
      jetRef.current.style.opacity = (1 - 0.4 * ease).toFixed(3)

      // Reveal the contrail from the launch point up to the jet. pathLength is
      // normalised to 1, so the offset is simply the unflown remainder.
      contrailRef.current.style.strokeDashoffset = (1 - p).toFixed(4)

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
      <svg
        className="loader__flight"
        viewBox="0 0 600 300"
        fill="none"
        aria-hidden="true"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Bright and dense in the plume's body, dissolving at the launch tip so
              the trail doesn't look hard-anchored, and thinning toward the far end
              where the jet has receded. Axis roughly follows the arc. */}
          <linearGradient id="contrailFade" gradientUnits="userSpaceOnUse" x1="60" y1="250" x2="520" y2="72">
            <stop offset="0%" stopColor="#f0e3c6" stopOpacity="0" />
            <stop offset="18%" stopColor="#f0e3c6" stopOpacity="0.5" />
            <stop offset="70%" stopColor="#f0e3c6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#f0e3c6" stopOpacity="0.55" />
          </linearGradient>
        </defs>

        {/* the drafting under-rule: the full arc the jet measures itself along */}
        <path ref={pathRef} className="loader__rule" d={ARC} pathLength="1" />
        {/* soft plume — a wide, faint halo that reads as the contrail's near, thick
            body tapering away with the same reveal as the core */}
        <path className="loader__plume" d={ARC} pathLength="1" />
        {/* the contrail core — its revealed length is the loading progress */}
        <path ref={contrailRef} className="loader__contrail" d={ARC} pathLength="1" />

        {/* blueprint fighter jet, nose along +x so the tangent bank points it in
            the direction of travel; recentred and placed each frame from JS */}
        <g
          ref={jetRef}
          className="loader__jet"
          transform="translate(60 250) scale(1) translate(-66 -28)"
        >
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
        </g>
      </svg>

      <div className="loader__label">
        <span className="loader__pct" ref={pctRef}>0</span>% · loading
      </div>
    </div>
  )
}
