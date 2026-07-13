# Gallery photos

Drop the photos for the desk's framed album here, then list them in the
`gallery.photos` array in `src/content/portfolio.js`.

- A file at `public/assets/gallery/photo-1.jpg` is referenced as
  `/assets/gallery/photo-1.jpg` (everything under `public/` is served from the
  site root).
- Formats: `.jpg`, `.png`, or `.webp`.
- The frame opening is **portrait, ~4 : 5** (e.g. **1200 × 1500 px**) — match
  that aspect so photos aren't cropped oddly. Keep each file ≲ 500 KB.
- The first entry in `gallery.photos` is the one shown resting in the frame;
  the rest appear when the frame is picked up.

Until a listed file exists, the frame shows a painted placeholder for that
slot, so a missing image never breaks the scene.

See the repo README's "Photo frame album" section for the full walkthrough.
