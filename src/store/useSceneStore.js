import { create } from 'zustand'
import { CAMERA_PAN } from '../desk/constants'
import { PERF_HOOK } from '../lib/perfHook'

/**
 * Single source of truth for what the desk is doing. Kept deliberately tiny:
 * which document is picked up, which is hovered, where we are in a multi-page
 * stack, and how far the view has been panned. No routing — focus is just
 * internal state so the Canvas never remounts.
 */
export const useSceneStore = create((set) => ({
  ready: false, // assets + fonts loaded; gates the loading doodle
  sceneDrawn: false, // the Canvas has actually rendered frames (see DeskScene)
  focusedId: null, // id of the picked-up document, or null for the idle desk
  hoveredId: null, // id of the document under the cursor (idle state only)
  pageIndex: 0, // current sheet within a multi-page document
  // The page turn currently in flight, or null. `{ docId, dir, idx }`, where
  // `dir` is -1/+1 and `idx` is the leaf that is actually turning.
  //
  // Set in the SAME update as `pageIndex` — this is load-bearing, not tidiness.
  // It replaces an earlier `flipDir` + `flipNonce` pair that the sheet stack
  // turned into a flip in an effect, one render LATER. That gap was a render in
  // which the index had already moved but the turn did not exist yet, so a
  // backward turn briefly resolved to the page it was heading for instead of
  // the one still on screen, and anything keying an animation off "am I the
  // page on top" got spuriously re-triggered. Keeping them in one update is
  // what makes that unrepresentable.
  //
  // A bare nonce is also the reason polaroids used to re-fade across the whole
  // desk on any turn: it carried no document, so every subscriber matched.
  // Anything reading this must scope it with desk/pageFlip's `flipFor`.
  //
  // This has to be shared state rather than the flipping component's own,
  // because a turn is not instantaneous and TWO separate subtrees have to agree
  // about what is on top for its whole duration: the sheet stack
  // (desk/props MultiPageSheets) and the polaroids pinned to those sheets
  // (desk/Polaroids). `pageIndex` moves the instant a turn is REQUESTED, but a
  // BACKWARD turn deliberately keeps the outgoing page painted on the static
  // top sheet until the returning leaf lands — so for the length of that turn
  // `pageIndex` is not the page being presented. Anything that reads
  // `pageIndex` directly disagrees with the paper in one direction only, which
  // is exactly the asymmetry this exists to remove. Read it through
  // desk/pageFlip's `presentedPage`, never raw.
  //
  // Owned by MultiPageSheets, which is the only thing that knows when a leaf
  // has actually come to rest (its spring's onRest clears it).
  flip: null,

  // The multi-hop animated jump currently in flight (desk/ProjectTabs' "jump
  // to this project" tabs), or null. `{ docId, target, dir }` — `target` is
  // the final page the chain is heading for, `dir` is the direction every
  // remaining hop steps in. `jumpToPage` sets the first hop's `flip` directly
  // (same shape `nextPage`/`prevPage` produce, so MultiPageSheets/Polaroids
  // need no changes to render a jump's hops); `endFlip` then walks the chain
  // one hop per landed turn until `pageIndex` reaches `target`.
  //
  // `nextPage`/`prevPage` no-op while this is set, so a corner-click, arrow
  // key or swipe can't interleave a step into an in-flight jump and desync
  // `pageIndex` from the hop actually animating. `focus`/`close` clear it —
  // closing the document (or refocusing another) mid-jump must not leave it
  // set, or the guard above would wedge the document unflippable forever.
  jump: null,

  // How far the view has been panned from centre, in whole edge-taps
  // (-steps…+steps). Stored as a step rather than a distance because the world
  // distance a step covers depends on the viewport — CameraRig owns that math.
  // Deliberately NOT reset by focus/close: a document is read at centre and
  // then set back down where the visitor was looking (see CameraRig).
  panStep: 0,

  // The focused sheet is pinched in far enough to want its high-resolution
  // raster (desk/docZoom, lib/docTextures). The zoom ITSELF is deliberately not
  // here — it changes every frame of a live pinch and belongs in a ref (see
  // docZoom's header). This is only the one-bit "which texture should the paper
  // be showing", which is a real render input and has to re-render the prop.
  // Always false on a mouse: nothing can set it without a second finger.
  zoomDetail: false,

  setReady: (v = true) => set({ ready: v }),
  setSceneDrawn: (v = true) => set({ sceneDrawn: v }),

  setZoomDetail: (v) => set((s) => (s.zoomDetail === v ? s : { zoomDetail: v })),

  // Both entry points to a new sheet drop the zoom flag, so a document always
  // opens at its readable resting size rather than inheriting the last one's
  // magnification. desk/TouchControls resets the matching docZoom offsets off
  // the same transitions.
  focus: (id) => set({ focusedId: id, pageIndex: 0, flip: null, jump: null, zoomDetail: false }),
  close: () =>
    set({ focusedId: null, hoveredId: null, pageIndex: 0, flip: null, jump: null, zoomDetail: false }),

  /** A turning leaf has come to rest. Scoped to the document that owns the
   *  turn so a late onRest from a document that has since been set down cannot
   *  clear a flip belonging to the one picked up after it.
   *
   *  If a multi-hop jump (see `jump` above) is still short of its target, this
   *  is also the chain driver: rather than clearing the turn, it dispatches
   *  the next hop in the same update, exactly the way `nextPage`/`prevPage`
   *  would step it, so MultiPageSheets sees one continuous stream of flips
   *  with no gap for a stray click to land in. */
  endFlip: (docId) =>
    set((s) => {
      if (!s.flip || s.flip.docId !== docId) return s
      const j = s.jump
      if (j && j.docId === docId && s.pageIndex !== j.target) {
        const next = s.pageIndex + j.dir
        const remaining = Math.abs(j.target - next)
        return {
          pageIndex: next,
          flip: { docId, dir: j.dir, idx: j.dir > 0 ? s.pageIndex : next, fast: remaining > 0 },
          jump: remaining > 0 ? j : null,
        }
      }
      return { flip: null, jump: null }
    }),

  setHovered: (id) =>
    set((s) => (s.hoveredId === id ? s : { hoveredId: id })),

  /** Step the view one edge-tap left (-1) or right (+1), clamped to the range. */
  panBy: (dir) =>
    set((s) => {
      const next = Math.max(-CAMERA_PAN.steps, Math.min(CAMERA_PAN.steps, s.panStep + dir))
      return next === s.panStep ? s : { panStep: next }
    }),

  // A page turn also drops the zoom: the incoming sheet is new content, so it
  // starts readable rather than pre-magnified into whichever corner the last one
  // was left in. It also keeps the detail rasters to one page at a time — a flip
  // that kept the zoom would have to paint the new page's hi-res copy in the
  // middle of the turn, which is the one moment there is no frame to spare.
  nextPage: (pageCount) =>
    set((s) => {
      // A multi-hop jump owns the flip chain until it lands (see `jump`
      // above) — a corner-click here mid-jump would desync `pageIndex` from
      // whatever hop `flip` is actually animating.
      if (s.jump) return s
      if (s.focusedId == null || s.pageIndex >= pageCount - 1) return s
      return {
        pageIndex: s.pageIndex + 1,
        // Going forward, the leaf that turns is the page being LEFT: it lifts
        // off and carries itself over to the pile, uncovering the new one.
        flip: { docId: s.focusedId, dir: 1, idx: s.pageIndex },
        zoomDetail: false,
      }
    }),

  prevPage: () =>
    set((s) => {
      if (s.jump) return s
      if (s.focusedId == null || s.pageIndex <= 0) return s
      const back = s.pageIndex - 1
      return {
        pageIndex: back,
        // Coming back, it is the page being RETURNED TO that turns — it comes
        // off the pile and lands face-up, which is why the sheet underneath has
        // to keep painting the outgoing page until it does (desk/pageFlip).
        flip: { docId: s.focusedId, dir: -1, idx: back },
        zoomDetail: false,
      }
    }),

  /**
   * Jump straight to a specific page of document `id`, animated as a chain of
   * ordinary one-page flips (desk/ProjectTabs' index tabs) rather than a hard
   * cut. Opens the document at page 0 first if it isn't the focused one, the
   * same as `focus`; if it's already open, jumps from wherever it currently
   * is, in either direction. Dispatches only the FIRST hop here — `endFlip`
   * walks the rest of the chain as each hop's leaf lands.
   *
   * Every hop but the last runs at the sped-up `fast` config (desk/props.jsx
   * MultiPageSheets) so a long jump reads as "flipping through, quickly"
   * rather than either a slow flip-per-page crawl or a cut; the final hop
   * lands at normal speed.
   */
  jumpToPage: (id, pageCount, target) =>
    set((s) => {
      if (s.jump) return s // a jump is already in flight elsewhere — ignore
      if (s.focusedId != null && s.focusedId !== id) return s // another doc is open
      const opening = s.focusedId !== id
      const start = opening ? 0 : s.pageIndex
      const clamped = Math.max(0, Math.min(pageCount - 1, target))
      if (clamped === start) {
        return { focusedId: id, pageIndex: clamped, flip: null, jump: null, zoomDetail: false }
      }
      const dir = clamped > start ? 1 : -1
      const next = start + dir
      const remaining = Math.abs(clamped - next)
      return {
        focusedId: id,
        pageIndex: next,
        flip: { docId: id, dir, idx: dir > 0 ? start : next, fast: remaining > 0 },
        jump: remaining > 0 ? { docId: id, target: clamped, dir } : null,
        zoomDetail: false,
      }
    }),
}))

// Let QA tooling and the console drive the scene directly
// (e.g. __sceneStore.getState().focus('projects')) instead of having to
// synthesize clicks against the WebGL canvas. Dev always; in a production
// build only under ?perf=1, so a budget run can step the scene through the
// states it has to be measured in (see lib/perfHook).
if (PERF_HOOK && typeof window !== 'undefined') {
  window.__sceneStore = useSceneStore
}
