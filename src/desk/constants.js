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
