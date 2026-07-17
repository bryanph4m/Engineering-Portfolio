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

> **Three files here are well over that budget** and are the biggest thing a
> phone downloads on this site:
>
> | File | Now | Budget |
> | ---- | --- | ------ |
> | `mlr-team.jpg` | 2160 × 2880, 2.4 MB | ≲ 500 KB |
> | `mlr-launch-day.jpg` | 2160 × 2880, 1.8 MB | ≲ 500 KB |
> | `bryan-portrait.jpg` | 2160 × 2720, 1.1 MB | ≲ 500 KB |
>
> Re-exporting them at **1000 × 1250** would cut ~4.5 MB off the desk with no
> visible change: a polaroid is a couple of hundred pixels wide on a phone, and
> even a picked-up album photo is only ~600. They are left as-is because they
> are the originals and re-encoding them is lossy — the call belongs to whoever
> owns the photos.
>
> The desk already downscales every photo to a tier-appropriate cap before it
> reaches the GPU (`src/lib/photoTexture.js`), so the *memory* cost is handled
> either way. Only the download and decode still scale with what's in this
> folder, and nothing in the code can fix that from here.

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
