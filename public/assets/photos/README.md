# Section photos (figures + polaroids)

Drop the photos that attach to content sections here, then list them in the
matching `photos: []` array in `src/content/portfolio.js`.

- A file at `public/assets/photos/mlr-launch-day.jpg` is referenced as
  `/assets/photos/mlr-launch-day.jpg` (everything under `public/` is served
  from the site root).
- Formats: `.jpg`, `.png`, or `.webp`. Keep each file ≲ 500 KB.
- The desk polaroids crop to a **portrait ~4 : 5** opening (e.g. **1000 × 1250
  px**) — match that aspect so the polaroid photo isn't stretched. Simple-mode
  figures show the whole image at its own aspect, so any shape works there.

Each photo is one entry shared by both site modes, but used differently:

```js
{
  src:     '/assets/photos/mlr-launch-day.jpg', // path under /public
  title:   'Launch day',                        // simple mode: bold caption lead-in
  caption: 'The two-stage rocket on the pad.',  // simple mode: figure description
  date:    '2026',                              // simple mode: optional, muted
  credit:  'Mission Launch Rocketry',           // simple mode: optional attribution
  alt:     'A model rocket on a launch rail.',  // simple mode: <img> alt text (a11y)
}
```

Where to list them:

| Array in `portfolio.js`      | Simple mode (Wikipedia figure) | Desk mode (polaroid)            |
| ---------------------------- | ------------------------------ | ------------------------------- |
| `profile.photos`             | About article                  | — (index card has no room)      |
| `projects[i].photos`         | that project's section         | pinned to the drawing's page(s) |
| `research.photos`            | Research article intro         | — (article-level only)          |
| `research.sheets[i].photos`  | that sheet's subsection        | pinned to the blueprint sheet   |

Desk mode pulls **only the image** — the polaroid never shows the title,
caption, date or credit. Those appear only on the simple-mode figure. Desk
polaroids ride the same pagination as the text: a photo on an already-full page
flows onto the next sheet, and multiple photos on one section stack without
overlapping.

Until a listed file exists (or if one fails to load), **both modes show a clear
placeholder** in its place — a painted "photo goes here" polaroid on the desk,
a hatched placeholder box in the Wikipedia figure — so a not-yet-added image
never breaks either view.

See the repo README's "Photos" section for the full walkthrough.
