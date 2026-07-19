import { create } from 'zustand'
import { CAMERA_PAN } from '../desk/constants'

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
  focus: (id) => set({ focusedId: id, pageIndex: 0, flip: null, zoomDetail: false }),
  close: () =>
    set({ focusedId: null, hoveredId: null, pageIndex: 0, flip: null, zoomDetail: false }),

  /** A turning leaf has come to rest. Scoped to the document that owns the
   *  turn so a late onRest from a document that has since been set down cannot
   *  clear a flip belonging to the one picked up after it. */
  endFlip: (docId) =>
    set((s) => (s.flip && s.flip.docId === docId ? { flip: null } : s)),

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
}))

// Dev-only: let QA tooling and the console drive the scene directly
// (e.g. __sceneStore.getState().focus('projects')) instead of having to
// synthesize clicks against the WebGL canvas.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__sceneStore = useSceneStore
}
