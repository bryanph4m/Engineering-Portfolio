# Engineer's Desk — Portfolio

A personal portfolio rendered as an old mechanical engineer's drafting desk,
viewed from a fixed, isometric-ish angle. Each "page" of the site is a physical
document on the desk — pick one up to read it, flip through a stack of drawings,
set it back down.

Built with **React + React Three Fiber**, **drei**, **@react-spring/three**,
**Zustand**, and **Vite**. Tailwind dresses only the flat UI chrome.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in /dist
npm run preview  # serve the build
```

## How it works

- **One Canvas, no routing.** `src/desk/DeskScene.jsx` holds the whole scene;
  focus is internal Zustand state (`src/store/useSceneStore.js`) so Three.js
  never remounts.
- **Interaction.** Idle = fixed wide view with a few degrees of pointer
  parallax (`CameraRig`). Hover lifts a document; click floats it to a readable
  pose in front of the camera; the desk dims behind a vignette. Click away or
  press **Esc** to set it down.
- **Documents.** `src/desk/Document.jsx` interpolates each sheet between its
  resting pose on the desk and the picked-up pose (quaternion slerp). The
  physical "props" (card, clipped stack, blueprint, folded resume, envelope)
  live in `src/desk/props.jsx`.
- **Multi-page stacks** (Projects, Rocketry): a physical sheet rotates about the
  left edge on each turn, with an in-world handwritten `1 / 4` tally. Flip with
  the on-screen arrows, the **←/→** keys, or a swipe.
- **Legible content.** Each document's text is real DOM (`src/ui/ContentOverlay.jsx`)
  locked over the sheet — crisp at any zoom, and lazy-loaded on open from
  `src/documents/content/*`.

## Project layout

```
src/
  desk/        3D scene: Desk, DeskLamp, Clutter, Document, props, camera, DeskScene
  documents/   registry.js + content/ (About, Projects, Research, Resume, Contact)
  ui/          DOM chrome: ContentOverlay, HudHints, Loader
  lib/         procedural canvas textures
  store/       Zustand scene state
public/assets/ fonts (bundled TTFs) + textures/ (drop-in real photos)
```

## Swapping in your own material

- **Textures / photos:** see `public/assets/textures/README.md`.
- **Resume PDF:** replace `public/assets/Bryan-Pham-Resume.pdf`.
- **Content:** edit the components in `src/documents/content/`. Add or remove a
  document by editing `src/documents/registry.js` (set `pages` > 1 for a stack).
- **Feel of the desk:** camera, lighting poses, and the pickup pose are all in
  `src/desk/constants.js`.
