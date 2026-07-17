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

  setReady: (v = true) => set({ ready: v }),
  setSceneDrawn: (v = true) => set({ sceneDrawn: v }),

  focus: (id) => set({ focusedId: id, pageIndex: 0, flipDir: 0 }),
  close: () => set({ focusedId: null, hoveredId: null, pageIndex: 0, flipDir: 0 }),

  setHovered: (id) =>
    set((s) => (s.hoveredId === id ? s : { hoveredId: id })),

  /** Step the view one edge-tap left (-1) or right (+1), clamped to the range. */
  panBy: (dir) =>
    set((s) => {
      const next = Math.max(-CAMERA_PAN.steps, Math.min(CAMERA_PAN.steps, s.panStep + dir))
      return next === s.panStep ? s : { panStep: next }
    }),

  nextPage: (pageCount) =>
    set((s) => {
      if (s.focusedId == null || s.pageIndex >= pageCount - 1) return s
      return { pageIndex: s.pageIndex + 1, flipDir: 1, flipNonce: s.flipNonce + 1 }
    }),

  prevPage: () =>
    set((s) => {
      if (s.focusedId == null || s.pageIndex <= 0) return s
      return { pageIndex: s.pageIndex - 1, flipDir: -1, flipNonce: s.flipNonce + 1 }
    }),
}))

// Dev-only: let QA tooling and the console drive the scene directly
// (e.g. __sceneStore.getState().focus('projects')) instead of having to
// synthesize clicks against the WebGL canvas.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__sceneStore = useSceneStore
}
