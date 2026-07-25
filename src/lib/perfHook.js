/**
 * Is this session allowed to expose the profiling handles?
 *
 * Always true in dev. In a production build it is opt-in via `?perf=1`, which
 * exists so the performance budget in CLAUDE.md can be measured against the
 * bundle visitors actually get. That distinction is load-bearing rather than
 * fussy: dev does per-page canvas readbacks and a `toDataURL` on every sheet
 * (lib/docTextures inkBounds / devVerify), which are stripped from the
 * production build — profiling dev therefore measures work no visitor ever
 * pays for and hides the work they do.
 *
 * Resolved once at module load. The handles it gates (`window.__gl`,
 * `window.__scene`, `window.__sceneStore`) are read-only references; nothing
 * in the site branches on this flag, so a visitor who adds the param gets the
 * identical scene, just with the handles attached.
 */
export const PERF_HOOK =
  import.meta.env.DEV ||
  (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('perf'))

/**
 * Times one canvas paint and records it on `window.__paintLog`, so a budget run
 * can attribute a dropped frame to the sheet that caused it by name instead of
 * inferring it from a flame chart.
 *
 * Canvas painting is the desk's main-thread cost — a page turn onto a sheet
 * that has never been painted runs a full procedural repaint, and that is the
 * one thing on this site that can blow a frame outright. Measuring it is
 * therefore the difference between "page flips feel bad" and a number.
 *
 * Off the hook, this is a plain call-through: no timing, no array, no branch
 * per stroke. It wraps the whole paint rather than sampling inside it, so it
 * cannot itself distort what it measures.
 */
export function perfPaint(key, canvas, run) {
  if (!PERF_HOOK) return run()
  const t0 = performance.now()
  run()
  const ms = performance.now() - t0
  const log = (window.__paintLog ??= [])
  log.push({ key, ms: +ms.toFixed(2), w: canvas.width, h: canvas.height, at: +t0.toFixed(0) })
  return undefined
}
