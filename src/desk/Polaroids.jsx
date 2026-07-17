import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useSpring } from '@react-spring/three'
import { useSceneStore } from '../store/useSceneStore'
import { texDims } from '../lib/docTextures'
import { photoPlaceholderTexture, softShadowTexture } from '../lib/textures'
import { loadPhotoTexture } from '../lib/photoTexture'
import { POLAROID, polaroidFrame } from '../lib/photos'
import { PAPER_T, SHEET_T } from './layout'

/**
 * Bare polaroid photos pinned to a document's pages. Each document carries a
 * placed-photo list on `doc.photos` (`{ photo, page, rect }`, built by
 * lib/photos.js from the same pageFlow pass that lays out the text), and this
 * renders one physical polaroid — white frame, the photo, a soft drop shadow,
 * a little tilt — floated just above the sheet at the reserved spot.
 *
 * Desk mode shows ONLY the image: nothing here reads the photo's title,
 * caption, date or credit. Those are simple mode's job (src/simple/SimpleMode).
 *
 * The polaroids are children of the same moving group the paper is in
 * (Document.jsx), so they inherit the pickup lift, tilt and scale for free and
 * stay sharp at every zoom. They are raycast-transparent, so a click or drag
 * over one still reaches the sheet behind it — page flips and painted links
 * keep working even where a polaroid sits near an edge or a corner. A polaroid
 * is visible only while the page it belongs to is the one on top, and fades in
 * as an incoming page settles from a flip so it never shows through the turning
 * leaf.
 */

const FRAME = polaroidFrame()
// The photo keeps equal top/side borders with a thicker "chin" at the bottom,
// so its centre sits a little above the frame's centre.
const PHOTO_OFFSET_Y = (POLAROID.chin - POLAROID.border) / 2
const Z_LIFT = 0.02 // metres the polaroid floats proud of the top sheet

// Deterministic per-photo tilt so a page of polaroids reads hand-placed, not
// gridded. Indexed by the photo's slot, wrapping.
const TILTS = [-0.05, 0.045, -0.03, 0.06, -0.055, 0.035]

/** Local Z of the sheet a polaroid attaches to (top leaf of a stack/roll, or
 *  the front face of a solid box sheet). */
function topSheetZ(doc) {
  if (doc.kind === 'stack' || doc.kind === 'blueprint') return doc.pages.length * SHEET_T
  return PAPER_T / 2
}

/** Centre of a texture-px rect in the sheet's local XY plane (metres). The
 *  paper mesh maps the texture with its top at +Y, so canvas Y is flipped. */
function rectCentreLocal(rect, paper) {
  const { W, H } = texDims(paper)
  const cx = rect.x + rect.w / 2
  const cy = rect.y + rect.h / 2
  return {
    x: (cx / W - 0.5) * paper.w,
    y: (0.5 - cy / H) * paper.h,
  }
}

/**
 * How big to build this polaroid, as a multiple of the base frame — read back
 * out of the footprint the layout actually reserved rather than assumed to be 1.
 *
 * The reservation is the single source of truth for the polaroid's size: if a
 * document asked lib/photos.js for a scaled slot (the index card does), the mesh
 * has to match, or the photo would overhang the space the text was kept out of.
 * The flowed documents reserve at 1:1, so this returns 1 for them and nothing
 * about their polaroids changes.
 */
function frameScale(rect, paper) {
  const { W } = texDims(paper)
  return (rect.w / W) * paper.w / FRAME.w
}

/**
 * Loads each placed photo's image into a texture, falling back to the painted
 * placeholder for any slot whose file isn't in /public/assets/photos/ yet.
 *
 * Only the photos on the resting top sheet (page 0) are fetched up front —
 * those are the ones actually on screen while the document lies on the desk.
 * Photos on deeper pages are behind at least a pickup, so they wait for the
 * document to be opened and are then kept for the session. Every document
 * mounts at load, so without this split the desk pulls every polaroid on every
 * page of every document before it can show a first frame — the single largest
 * front-loaded download on the desk, and the one mobile pays the most for.
 */
function usePhotoTextures(photos, docId) {
  const placeholder = useMemo(() => photoPlaceholderTexture(), [])
  const [textures, setTextures] = useState(() => photos.map(() => placeholder))

  // Once opened, stay loaded: setting the document down must not drop photos a
  // single tap can bring back.
  const opened = useSceneStore((s) => s.focusedId === docId)
  const [wantAll, setWantAll] = useState(false)
  useEffect(() => {
    if (opened) setWantAll(true)
  }, [opened])

  // Aliveness is tracked for the component, not per-effect: `wantAll` flipping
  // re-runs the effect, and a per-effect flag would strand a page-0 photo that
  // was still in flight at pickup on its placeholder forever.
  const aliveRef = useRef(true)
  useEffect(() => () => { aliveRef.current = false }, [])

  const requested = useRef(new Set())
  useEffect(() => {
    photos.forEach((p, i) => {
      const src = p.photo?.src
      if (!src || requested.current.has(i)) return
      if (!wantAll && p.page !== 0) return
      requested.current.add(i)
      loadPhotoTexture(src, (t) => {
        if (!aliveRef.current) return
        setTextures((prev) => {
          const next = prev.slice()
          next[i] = t
          return next
        })
      })
    })
  }, [photos, wantAll])
  return textures
}

function Polaroid({ doc, placed, tex, index }) {
  const groupRef = useRef()
  const frameMat = useRef()
  const photoMat = useRef()
  const shadowMat = useRef()

  const focusedId = useSceneStore((s) => s.focusedId)
  const pageIndex = useSceneStore((s) => s.pageIndex)
  const flipNonce = useSceneStore((s) => s.flipNonce)

  const isFocused = focusedId === doc.id
  // Which sheet is on top: the flip index while focused, page 0 on the desk.
  const topPage = isFocused ? pageIndex : 0
  const showing = placed.page === topPage

  const pos = useMemo(() => rectCentreLocal(placed.rect, doc.paper), [placed, doc.paper])
  const z = useMemo(() => topSheetZ(doc) + Z_LIFT, [doc])
  const tilt = TILTS[index % TILTS.length]
  // Uniform scale, so the frame, the photo opening and the chin offset all keep
  // their proportions at any reserved size.
  const s = useMemo(() => frameScale(placed.rect, doc.paper), [placed, doc.paper])

  const [{ vis }, visApi] = useSpring(() => ({
    vis: 1,
    config: { tension: 90, friction: 22 },
  }))
  // Re-fire the fade-in on every page turn, so the incoming page's polaroid
  // eases in as the leaf lands instead of popping over a mid-flip sheet.
  useEffect(() => {
    if (flipNonce === 0) return
    visApi.start({ from: { vis: 0 }, vis: 1 })
  }, [flipNonce, visApi])

  useFrame(() => {
    const g = groupRef.current
    if (!g) return
    g.visible = showing
    if (!showing) return
    const v = vis.get()
    if (frameMat.current) frameMat.current.opacity = v
    if (photoMat.current) photoMat.current.opacity = v
    if (shadowMat.current) shadowMat.current.opacity = 0.34 * v
  })

  return (
    <group ref={groupRef} position={[pos.x, pos.y, z]} rotation={[0, 0, tilt]} visible={showing}>
      {/* soft drop shadow, nudged down-right and set just under the frame */}
      <mesh position={[0.03 * s, -0.035 * s, -0.006]} raycast={() => null}>
        <planeGeometry args={[FRAME.w * 1.06 * s, FRAME.h * 1.06 * s]} />
        <meshBasicMaterial
          ref={shadowMat}
          map={softShadowTexture()}
          transparent
          opacity={0.34}
          depthWrite={false}
        />
      </mesh>
      {/* white polaroid frame */}
      <mesh raycast={() => null}>
        <planeGeometry args={[FRAME.w * s, FRAME.h * s]} />
        <meshStandardMaterial ref={frameMat} color="#f7f5ee" roughness={0.85} transparent />
      </mesh>
      {/* the photo — desk mode uses the image only, never the caption/title */}
      <mesh position={[0, PHOTO_OFFSET_Y * s, 0.002]} raycast={() => null}>
        <planeGeometry args={[POLAROID.photoW * s, POLAROID.photoH * s]} />
        <meshStandardMaterial ref={photoMat} map={tex} roughness={0.55} transparent />
      </mesh>
    </group>
  )
}

export default function Polaroids({ doc }) {
  const photos = doc.photos ?? []
  const textures = usePhotoTextures(photos, doc.id)
  if (!photos.length) return null
  return (
    <group>
      {photos.map((placed, i) => (
        <Polaroid key={i} doc={doc} placed={placed} tex={textures[i]} index={i} />
      ))}
    </group>
  )
}
