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
  flipDir: 0, // -1 / +1 — direction of the last page turn, drives the 3D flip
  flipNonce: 0, // bumps on every turn so the flip animation re-fires

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
  focus: (id) => set({ focusedId: id, pageIndex: 0, flipDir: 0, zoomDetail: false }),
  close: () =>
    set({ focusedId: null, hoveredId: null, pageIndex: 0, flipDir: 0, zoomDetail: false }),

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
      return { pageIndex: s.pageIndex + 1, flipDir: 1, flipNonce: s.flipNonce + 1, zoomDetail: false }
    }),

  prevPage: () =>
    set((s) => {
      if (s.focusedId == null || s.pageIndex <= 0) return s
      return { pageIndex: s.pageIndex - 1, flipDir: -1, flipNonce: s.flipNonce + 1, zoomDetail: false }
    }),
}))

// Dev-only: let QA tooling and the console drive the scene directly
// (e.g. __sceneStore.getState().focus('projects')) instead of having to
// synthesize clicks against the WebGL canvas.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__sceneStore = useSceneStore
}
