import { Text } from '@react-three/drei'
import { useSceneStore } from '../store/useSceneStore'
import { docTexture } from '../lib/docTextures'
import { consumeTap } from './tapGuard'
import { SHEET_T } from './layout'

/**
 * Sticky-note index tabs down the left edge of the Projects stack — one per
 * `doc.tabs` entry (documents/content/projects.js), so a visitor can jump
 * straight to a project instead of flipping through every page ahead of it.
 * Left rather than right so they clear the UCLA pennant sitting in the desk
 * clutter beside the stack's right edge (see TAB_PROTRUDE below).
 *
 * Deliberately cheap: each tab is one flat, unlit plane (no new texture) plus
 * a drei `<Text>` label — SDF glyphs sampled from the site's own bundled TTFs
 * (src/index.css: "troika reads the same TTFs for in-world text"), so the
 * label scales to any number of projects for free rather than costing a
 * raster per tab.
 *
 * Tabs sit entirely at x <= -w/2 — never overlapping the paper's own XY
 * footprint. That sidesteps the occlusion trap documented in Polaroids.jsx
 * (anything standing taller than ~SHEET_T * 0.4 above the top sheet WITHIN
 * the paper's footprint intersects a landing leaf and draws through it): a
 * tab positioned entirely off that footprint can't be clipped by a turning
 * page no matter what Z it sits at, so it is free to sit right at the top of
 * the stack where it reads clearly.
 *
 * Visibility is intentionally NOT tied to the current page — real index tabs
 * are a permanent fixture of the book's edge, visible together whether it's
 * closed on the desk or open to any page, which is the whole point: aim for
 * one without opening the document first. This group rides the same moving
 * group as the paper (mounted from StackProp, a sibling of MultiPageSheets),
 * so it inherits the pickup lift/rotation/scale for free, exactly like
 * Polaroids.
 */

// How far a tab sticks out past the paper's edge, and which edge (-1 = local
// -X, i.e. left) — both exported so DevLayoutAudit can widen (and recentre)
// the Projects document's checked footprint by exactly this much rather than
// guessing a margin.
//
// Tabs stick out the LEFT edge, not the right: the Projects stack's rest spot
// (documents/registry.js, x=1.8 z=1.05) sits close enough to the UCLA pennant
// in the desk clutter (desk/Clutter.jsx, centred at x=4.05) that a right-side
// protrusion this size clips it — confirmed via window.__deskLayoutAudit().
// The left side is clear at this size (verified the same way), so the tabs
// stay legible-sized instead of being shrunk to clear an obstacle that's only
// on one side.
export const TAB_PROTRUDE = 0.18
export const TAB_SIDE = -1
const TAB_H = 0.26
const TAB_MARGIN_Y = 0.22 // clearance from the paper's top/bottom edge
const LABEL_COLOR = '#2b2620'
const LABEL_FONT = '/assets/fonts/SpecialElite-Regular.ttf'

function Tab({ doc, tab, y }) {
  const jumpToPage = useSceneStore((s) => s.jumpToPage)
  const { w } = doc.paper
  const x = TAB_SIDE * (w / 2 + TAB_PROTRUDE / 2)

  const stop = (e) => e.stopPropagation()

  const onOver = (e) => {
    e.stopPropagation()
    document.body.style.cursor = 'pointer'
  }
  const onOut = (e) => {
    e.stopPropagation()
    document.body.style.cursor = 'auto'
  }
  const onClick = (e) => {
    e.stopPropagation()
    consumeTap()
    // Read on demand rather than subscribed: a tab click is a one-off
    // dispatch, not a per-render concern (same reasoning as Document.jsx's
    // hotspotAt reading pageIndex through getState()).
    const { focusedId, pageIndex, jump } = useSceneStore.getState()
    if (jump) return // a jump is already in flight — ignore, don't queue
    if (focusedId != null && focusedId !== doc.id) return // another doc is open
    const start = focusedId === doc.id ? pageIndex : 0
    if (start === tab.page) return
    // Pre-warm every intervening page's texture before the chain starts, so a
    // fast hop never has to paint a never-seen sheet inside its own
    // animation — docTexture is memoized (lib/docTextures' texCache), so this
    // is a no-op for pages already painted.
    const lo = Math.min(start, tab.page)
    const hi = Math.max(start, tab.page)
    for (let i = lo; i <= hi; i++) docTexture(doc, i)
    jumpToPage(doc.id, doc.pages.length, tab.page)
  }

  return (
    <group
      position={[x, y, 0]}
      onPointerOver={onOver}
      onPointerMove={stop}
      onPointerOut={onOut}
      onClick={onClick}
    >
      <mesh>
        <planeGeometry args={[TAB_PROTRUDE, TAB_H]} />
        <meshBasicMaterial color={tab.color} />
      </mesh>
      <Text
        position={[0, 0, 0.001]}
        fontSize={0.095}
        color={LABEL_COLOR}
        font={LABEL_FONT}
        anchorX="center"
        anchorY="middle"
        maxWidth={TAB_PROTRUDE * 0.9}
      >
        {tab.label}
      </Text>
    </group>
  )
}

export default function ProjectTabs({ doc }) {
  const tabs = doc.tabs ?? []
  if (!tabs.length) return null
  const { h } = doc.paper
  const topZ = doc.pages.length * SHEET_T

  const usable = h - 2 * TAB_MARGIN_Y
  const step = tabs.length > 1 ? usable / (tabs.length - 1) : 0
  const top = h / 2 - TAB_MARGIN_Y

  return (
    <group position={[0, 0, topZ]}>
      {tabs.map((tab, i) => (
        <Tab key={tab.id} doc={doc} tab={tab} y={top - i * step} />
      ))}
    </group>
  )
}
