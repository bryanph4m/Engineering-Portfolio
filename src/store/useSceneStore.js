import { create } from 'zustand'

/**
 * Single source of truth for what the desk is doing. Kept deliberately tiny:
 * which document is picked up, which is hovered, and where we are in a
 * multi-page stack. No routing — focus is just internal state so the Canvas
 * never remounts.
 */
export const useSceneStore = create((set) => ({
  ready: false, // assets + fonts loaded; gates the loading doodle
  focusedId: null, // id of the picked-up document, or null for the idle desk
  hoveredId: null, // id of the document under the cursor (idle state only)
  pageIndex: 0, // current sheet within a multi-page document
  flipDir: 0, // -1 / +1 — direction of the last page turn, drives the 3D flip
  flipNonce: 0, // bumps on every turn so the flip animation re-fires

  setReady: (v = true) => set({ ready: v }),

  focus: (id) => set({ focusedId: id, pageIndex: 0, flipDir: 0 }),
  close: () => set({ focusedId: null, hoveredId: null, pageIndex: 0, flipDir: 0 }),

  setHovered: (id) =>
    set((s) => (s.hoveredId === id ? s : { hoveredId: id })),

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
