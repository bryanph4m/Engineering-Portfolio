# Engineer's Desk — Portfolio

A personal portfolio rendered as an old mechanical engineer's drafting desk,
viewed from a fixed, isometric-ish angle. Each "page" of the site is a physical
document on the desk — pick one up to read it, flip through a stack of drawings,
set it back down.

Built with **React + React Three Fiber**, **drei**, **@react-spring/three**,
**Zustand**, and **Vite**. Tailwind dresses only the flat UI chrome.

Access through Vercel: https://bryan-pham-portfolio.vercel.app/

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
- **Photo frame album** (`src/desk/PhotoFrame.jsx`): the framed photo is
  interactive too — pick it up like a document, then click the left/right half
  of the picture (or press **←/→**) to page through the album, with a `2 / 5`
  indicator in the HUD. Its photos are data — see "Photo frame album" below.
- **Legible content.** Each document's text is real DOM (`src/ui/ContentOverlay.jsx`)
  locked over the sheet — crisp at any zoom, and lazy-loaded on open from
  `src/documents/content/*`.

## The simple / Wikipedia mode

The flat recruiter view (`src/simple/`) reads the same shared content and
reformats it as encyclopedia articles. Two things there are simple-mode-only by
design, and neither can reach the desk:

- **The Resume article is the PDF itself.** Rather than re-typing the resume as
  prose, the article embeds `public/assets/Bryan-Pham-Resume.pdf` inline in an
  `<object>`, with an open/download link above it and a real fallback for
  browsers that have no inline PDF viewer. The resume is authoritative, so a
  recruiter reads exactly what they'd get from the download. The desk's folded
  sheet still paints `resume.sections` (Education / Experience / Projects) as
  drafting copy — that data stays the source for the sheet.
- **The Appearance panel**, matching Wikipedia's: a header toggle opens a docked
  panel with **Text** (small/standard/large), **Width** (standard/wide), and
  **Color** (light/dark/automatic). Settings apply immediately and persist in
  `localStorage` under `wiki:appearance`. `automatic` is resolved against
  `prefers-color-scheme` in JS, so the DOM always carries a concrete light/dark.
  All three ride `data-` attributes on the `.wiki` root and every rule that reads
  them is a `.wiki[data-…]` selector in `simple.css` — which ships only in the
  lazily-loaded simple-mode chunk. Nothing touches `<html>`, `<body>`, or any
  global state, so the desk's styling is untouched either way.

## Project layout

```
src/
  content/     portfolio.js — the single source of truth for all site content
  desk/        3D scene: Desk, DeskLamp, Clutter, Document, props, camera, DeskScene
  documents/   registry.js + content/ (desk page painters for About, Projects, …)
  simple/      the flat Wikipedia-style recruiter mode
  ui/          DOM chrome: StartScreen, HudHints, Loader
  lib/         procedural canvas textures + page-flow pagination + photo layout
  store/       Zustand scene state
public/assets/ fonts (bundled TTFs) + textures/ (drop-in real photos)
```

## Editing the content (the only file you should need)

**All portfolio content lives in one file: `src/content/portfolio.js`.** Both
site modes — the 3D desk and the simple/Wikipedia view — import from it and
own zero copy of their own. To update the site: edit that file, commit, push.
Vercel rebuilds and both modes update together. No cache-busting is needed —
Vite content-hashes every bundle on build.

What each export feeds:

| Export        | Desk mode                                        | Simple mode                   |
| ------------- | ------------------------------------------------ | ----------------------------- |
| `profile`     | start screen, HUD title, About index card        | About article, header brand   |
| `projects`    | the clipped drawing stack (one sheet per entry)  | Projects article sections     |
| `research`    | the blueprint roll (one sheet per `sheets` entry)| Research article sections     |
| `resume`      | the folded resume sheet + PDF link               | the embedded PDF preview      |
| `contact`     | the envelope's addressee links                   | Contact article (lead: `intro`)|
| `gallery`     | the framed photo album (PhotoFrame.jsx)          | —                             |
| `sections`    | —                                                | sidebar nav order             |

Notes:

- Content is stored as plain data (strings/arrays), presentation-agnostic.
  The desk's ALL-CAPS drafting look is applied by the painters on the way
  out — store text in natural case.
- Small data flags drive desk decorations: `roles[].circled` draws the
  pencil ellipse on the About card, `projects[].highlight` names the
  substring of `summary` the drawing sheet circles in red, and `section` on
  a role or `now` entry is where the simple mode cross-links it.
- Projects and Research sheets paginate automatically (`src/lib/pageFlow.js`)
  — longer entries flow onto extra flip-pages without touching desk code.
- The one intentional exception: the `<title>`/`<meta description>` in
  `index.html` are static HTML (they can't import JS) — update them by hand
  if the name or tagline changes.

## Content commands (Claude Code)

Three project-scoped slash commands live in `.claude/commands/`, so they're
version-controlled and travel with the repo. All three produce **reviewable
drafts/reports only** — none of them commits, pushes, or deploys, and none runs
unless you explicitly type it (`disable-model-invocation: true`).

| Command | What it does | When to use it |
| ------- | ------------ | -------------- |
| `/sync-content` | Pulls fresh `bryanph4m` repo metadata, refreshes only the auto-managed `github: {…}` fields in `portfolio.js` (never the editorial copy), then diffs the resume against the site and reports drift. | After pushing new repos or updating the resume PDF. |
| `/draft-project <repo>` | Reads a repo's metadata + README and drafts a project entry in the exact `portfolio.js` shape, inserted under a `// REVIEW:` marker with `TODO`s where info is missing. | When a new repo deserves a spot on the site. |
| `/check-site` | Read-only health check: link validity, resume ↔ site consistency, no hardcoded content outside the shared file, both modes wired to it. Reports a pass/fail checklist, fixes nothing. | Before committing content changes or deploying. |

The standing content rules these follow (single source of truth, resume is
authoritative, no invented projects, manual vs auto-managed fields) live in
`CLAUDE.md`.

## Photo frame album

The framed photo on the desk is a small, clickable album, driven entirely by
data — no code change needed to add or remove pictures.

1. **Drop your image files** in `public/assets/gallery/`. Anything under
   `public/` is served from the site root, so a file at
   `public/assets/gallery/photo-2.jpg` is referenced as `/assets/gallery/photo-2.jpg`.
2. **List them** in the `gallery.photos` array in `src/content/portfolio.js`.
   Each entry is `{ src, caption? }`:

   ```js
   export const gallery = {
     photos: [
       { src: '/assets/gallery/photo-1.jpg', caption: 'Bryan Pham' },
       { src: '/assets/gallery/photo-2.jpg', caption: 'Launch day, 2026' },
       { src: '/assets/gallery/photo-3.jpg' }, // caption is optional
     ],
   }
   ```

   The **first entry** is the photo shown resting in the frame on the desk; the
   rest appear once you pick the frame up and page through it. Order in the
   array is the order you flip through.
3. **Formats & sizing.** Use `.jpg`, `.png`, or `.webp`. The picture opening is
   **portrait, roughly a 4 : 5 ratio** (e.g. **1200 × 1500 px**). Match that
   aspect so images aren't stretched — anything wider or taller is scaled to
   fill and cropped by the frame. Keep files reasonable (≲ 500 KB each) so the
   scene stays quick to load.
4. **Captions** are optional per photo (the `caption` field). Leave it off and
   the photo simply shows without one.

If a listed file hasn't been added yet, the frame falls back to a painted
"photo goes here" placeholder for that slot, so a missing image never breaks
the scene. (Captions are stored in the data and available to the frame; they
don't render on the picture itself by default.)

## Photos (section figures + polaroids)

Separate from the framed album, individual content **sections** can carry
photos, drawn from one shared list per section so both modes read the same
entries — and each mode presents them its own way.

1. **Drop image files** in `public/assets/photos/` (see that folder's README).
   A file at `public/assets/photos/mlr-launch-day.jpg` is referenced as
   `/assets/photos/mlr-launch-day.jpg`.
2. **List them** in the matching `photos: []` array in
   `src/content/portfolio.js`. Each entry carries everything both modes need:

   ```js
   {
     src:     '/assets/photos/mlr-launch-day.jpg',
     title:   'Launch day',                        // simple mode caption title
     caption: 'The two-stage rocket on the pad.',  // simple mode description
     date:    '2026',                              // optional, muted meta
     credit:  'Mission Launch Rocketry',           // optional attribution
     alt:     'A model rocket on a launch rail.',  // <img> alt text (a11y)
   }
   ```

   The arrays live on `profile.photos` (About), each `projects[i].photos`,
   `research.photos` (article intro), and each `research.sheets[i].photos`.
3. **Simple / Wikipedia mode** renders each photo as a proper floated figure:
   a bordered thumbnail with a **bold title**, a muted caption, a muted
   `date · credit` line, and real `alt` text on the image.
4. **Desk mode** pins the **bare photo only** to the page as a polaroid — white
   frame, a little tilt, a drop shadow — with *no* title, caption or other text
   anywhere near it. `projects[].photos` and `research.sheets[].photos` become
   polaroids on a paginated document's pages, and the **first** entry of
   `profile.photos` becomes one on the About index card (reserved at 0.78× — a
   full-size polaroid would swallow a card that small). Any further
   `profile.photos`, and all of `research.photos`, are simple-mode figures only:
   the card has room for one and the blueprint's intro has room for none.

Desk polaroids **ride the same pagination as the text** (`src/lib/photos.js` +
`src/lib/pageFlow.js`): a photo on an already-full drawing flows onto the next
sheet, several photos on one section stack without overlapping, and the polaroid
is raycast-transparent so a page-flip still works even where one sits near an
edge. As with the album, any not-yet-added file shows a clear placeholder in
both modes rather than breaking.

The index card is the one document that isn't block-flowed (its art is placed at
absolute coordinates), so it reserves its polaroid with `photoSlot` instead: that
returns the footprint **and** the content box narrowed to the column beside it,
which `about.js` paints the roles through — so the same bounding-box measuring
that keeps flowed text off a photo keeps the card's copy off this one. Whatever
size a document reserves, `Polaroids.jsx` builds the mesh from that rect, so the
physical polaroid and the space the text was kept out of can never disagree.

## Swapping in your own material

- **Photos in the frame:** see "Photo frame album" above.
- **Section photos (figures + polaroids):** see "Photos" above and
  `public/assets/photos/README.md`.
- **Textures:** see `public/assets/textures/README.md`.
- **Resume PDF:** replace `public/assets/Bryan-Pham-Resume.pdf`.
- **Words:** edit `src/content/portfolio.js` (see above). Add or remove a
  desk document by editing `src/documents/registry.js` and giving it a
  painter in `src/documents/content/`.
- **Feel of the desk:** camera, lighting poses, and the pickup pose are all in
  `src/desk/constants.js`.
