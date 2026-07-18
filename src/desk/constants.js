// Tunable scene geometry. Everything the camera and the pickup animation need
// lives here so the whole feel of the desk can be adjusted from one file.

export const CAMERA = {
  position: [0, 6.4, 7.6], // fixed, isometric-ish vantage over the desk
  fov: 32,
  target: [0, 0, 0.4],
}

// A few degrees of parallax on pointer move — never a free orbit.
export const PARALLAX = {
  maxYaw: 0.05, // radians
  maxPitch: 0.035,
  ease: 0.045,
}

/**
 * Touch-only edge-tap panning (desk/TouchControls + desk/CameraRig).
 *
 * The camera's fov is vertical, so a portrait phone sees roughly a quarter of
 * the desk's 11-unit width at the fixed vantage — the desk simply does not fit,
 * and dragging to orbit is not an option (it fights picking a sheet up). So a
 * tap in either screen edge trucks the vantage sideways one step, FNAF-style:
 * the camera and its look-at target slide together, which is a lateral pan, NOT
 * an orbit — the vantage angle is as fixed on a phone as it is on desktop, and
 * pointer parallax still rides on top of it.
 *
 * `reach` is the clamp and the whole safety property: pan can never travel
 * further from centre than the outermost thing worth seeing, so there is no way
 * to end up looking at the void past the desk edge. The usable range is derived
 * from it per-viewport in CameraRig (reach minus half of what's already on
 * screen), which self-tunes: a landscape phone already frames the whole desk, so
 * its range collapses to zero and the edge taps quietly do nothing.
 */
export const CAMERA_PAN = {
  // Metres from centre to the outermost desk content: the slide rule sits at
  // x = -4.4 and the contact envelope's far edge lands near +4.7 (its clutter
  // neighbours are within this too). The slab itself runs to ±5.5, so this
  // deliberately stops short of the bare rim.
  reach: 4.9,
  steps: 3, // taps from centre to the clamp, each way
  ease: 0.075, // per-frame approach to the stepped target
  // Outer fraction of the viewport width that reads as an edge tap. ~13% is
  // about a thumb's width on a phone without reaching into the desk's middle,
  // where the documents actually are.
  zone: 0.13,
}

/**
 * How far from centre the view may pan, in metres, for a given viewport aspect.
 *
 * It is whatever is left over once the desk that's already on screen is
 * accounted for: enough to bring the outermost props (CAMERA_PAN.reach) to the
 * screen edge, and not a metre further. The fov is vertical, so a portrait
 * phone spans little width and earns a wide range, while anything already
 * framing the whole desk — every desktop window, a phone turned landscape —
 * lands at exactly 0 and cannot pan at all. CameraRig clamps to this, and the
 * first-time hint (ui/EdgeHint) reads it to stay quiet when there is nothing
 * to look around at.
 */
export function panRange(aspect) {
  const camPos = CAMERA.position
  const tgt = CAMERA.target
  const dist = Math.hypot(camPos[0] - tgt[0], camPos[1] - tgt[1], camPos[2] - tgt[2])
  const visibleW = 2 * Math.tan((CAMERA.fov * Math.PI) / 360) * dist * aspect
  return Math.max(0, CAMERA_PAN.reach - visibleW / 2)
}

/**
 * Pinch-to-zoom on a focused document (desk/docZoom + desk/TouchControls).
 * Touch-only: a mouse has no pinch, and the desktop pose is already sized to
 * fill the view, so nothing here is reachable with a pointer.
 *
 * `min` is 1 because the focus pose already frames the sheet as large as it can
 * go without running off the viewport (see FOCUS_POSE) — zooming out past that
 * would only shrink readable paper into dead space, so the floor is "the size it
 * lands at".
 *
 * `max` is 2 for a reason that is really a texture-resolution decision, not a
 * taste one. A focused sheet covers ~600 device px on a phone, and its paper
 * texture is rastered at QUALITY.texScale (0.5 → 640 texels tall), so it starts
 * life at roughly 1 texel per device pixel. Magnifying it is therefore only
 * worth doing as far as we are willing to re-raster the page: at 2× the sheet
 * wants ~1200 device px, which `detailScale` below supplies exactly. Raising
 * `max` without raising `detailScale` would not make the text more readable —
 * it would make blurry text bigger, which is the whole trap here.
 */
export const DOC_ZOOM = {
  min: 1,
  max: 2,
  // Zoom past this and the base raster starts to show, so the focused page is
  // repainted at `detailScale` (see lib/docTextures). Just above 1 so an
  // incidental pinch doesn't pay for a repaint.
  detailAt: 1.08,
  // Finger-span change, in px, before a two-finger gesture counts as a pinch at
  // all. Below this it is two fingers resting, and zoom would jitter.
  slop: 8,
}

// Resting pose of a picked-up document: floated in front of the camera,
// tilted back so it reads flat-on. `targetHeight` is the world height each
// paper is scaled to so large and small documents fill the view evenly.
//
// Framing contract: the bottom ~12% of the viewport is reserved for the HUD
// hint (.hud__hint in index.css). This pose puts the focused sheet ~75% of
// the viewport tall with its bottom edge ~13% above the viewport bottom, so
// paper content never sits under the flip instructions. The camera fov is
// vertical, so that clearance holds on every aspect ratio — verify against
// this contract if you retune the pose, at the focused zoom, on both a wide
// desktop and a short mobile viewport.
export const FOCUS_POSE = {
  position: [0, 3.05, 3.77],
  rotation: [-0.82, 0, 0], // tilts the sheet to face the fixed camera
  targetHeight: 2.2,
}

export const HOVER_LIFT = 0.14 // metres a document rises on hover

// The framed photo album shares the desk's focus machinery (pick up, flip,
// Esc to set down) but isn't a paper document, so it lives outside the
// registry. This id is the value focusedId takes when the frame is picked up —
// shared by PhotoFrame, KeyControls and HudHints so they never drift.
export const PHOTO_FRAME_ID = 'photos'

/**
 * The rocket model is picked up whole, exactly like a document or the photo
 * frame — one id, one focus, one thing on the desk you can pick up. Its parts
 * are then READ rather than clicked: the focused rocket floats over a component
 * page, and the store's `pageIndex` steps through `research.vehicle.parts`
 * (src/content/portfolio.js) the same way it steps a multi-page document's
 * sheets or the photo album's photos.
 *
 * It used to be several ids (`rocket:nose`, `rocket:servo-can`, …), one per
 * clickable section, each opening its own floating 3D detail card. That is gone:
 * the card mounted a light, and a light mounting mid-session forces three.js to
 * recompile every material in the scene, which is what made clicking a part
 * lurch. See desk/RocketModel's header for the measurements.
 */
export const ROCKET_ID = 'rocket'

export const COLORS = {
  wood: '#6f4c2c',
  woodDark: '#49301a',
  paper: '#efe6d0',
  paperBright: '#f8f2e4',
  blueprint: '#1f4468',
  ink: '#2b2620',
  lampWarm: '#ffd8a1',
  brass: '#b9963f',
  graphite: '#3a3a3f',
}
