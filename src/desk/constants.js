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
export const FOCUS_POSE = {
  position: [0, 3.25, 4.5],
  rotation: [-0.82, 0, 0], // tilts the sheet to face the fixed camera
  targetHeight: 2.2,
}

export const HOVER_LIFT = 0.14 // metres a document rises on hover

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
