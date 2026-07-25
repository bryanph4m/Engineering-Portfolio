# Engineer's Desk — Portfolio

Two presentation modes — the 3D desk scene and the Wikipedia-style simple view —
render the same shared content. See README.md for architecture.

## Content Rules (standing brief — every session follows these)

1. **Single source of truth.** All site content lives in `src/content/portfolio.js`.
   Never hardcode content into the desk-mode components (`src/documents/`, `src/desk/`,
   `src/ui/`) or the simple mode (`src/simple/`). Any content change is made in the
   shared file so both modes update together.
2. **No invented facts.** Projects may only come from real GitHub repos under
   `github.com/bryanph4m` or from the resume — never invent a project or a
   fact that isn't backed by one of those.
3. **The resume is authoritative** for experience, education, and skills:
   `public/assets/Bryan-Pham-Resume.pdf`. If site copy conflicts with it, the resume wins.
4. **LinkedIn is manual by design** — a static link plus manually maintained fields.
   No automated LinkedIn fetching or scraping, ever.
5. **Auto-managed vs manual fields.** Auto-managed project data (refreshed by the
   GitHub sync: language, stars, dates, raw repo description) lives only under a
   project's `github: { … }` sub-object in `portfolio.js`. Everything else —
   `name`, `category`, `summary`, `highlight`, `specs` — is manual editorial copy
   that automated tooling must never overwrite.
6. **Drafts, not deploys.** All content tooling proposes drafts for review: mark
   generated entries with `// REVIEW:` and unknowns with `TODO`. Nothing
   auto-commits, auto-pushes, or auto-deploys.

## Performance budget (standing brief — check every visual feature against it)

The desk has been through several optimisation passes, and each one held only
until the next feature landed, because nothing recorded what "fine" was. These
are the numbers. They are measured, not aspirational: they are what the scene
actually costs today, with a little headroom. A change that exceeds one is not
automatically wrong, but it is a decision someone has to make on purpose.

### How to measure

A production build exposes the profiling handles under `?perf=1`, and the tier
can be forced with `?tier=mobile` / `?tier=desktop` (`src/lib/quality.js`) so
the phone budget is checkable from a desktop browser:

```sh
npm run build && npx vite preview --port 5299
sh tools/perf/measure.sh "http://localhost:5299/?perf=1" /tmp/desk.json 1440x900
python tools/perf/report.py /tmp/desk.json
```

`tools/perf/README.md` explains the harness and how to read each number. In the
page itself the handles are `window.__gl`, `window.__scene`, `window.__sceneStore`
and `window.__paintLog`. For anything frame-rate related run it with
`BFLAGS=--headed`: headless Chromium rasterises on the CPU (SwiftShader), and
its FPS numbers are meaningless for a fill-rate-bound scene. Memory, draw calls,
triangles and paint times are hardware-independent either way.

Profile the **production** build, never `npm run dev`. Dev runs an ink-bounds
readback and a `toDataURL` on every sheet (`src/lib/docTextures.js`) that are
stripped from the real bundle, so dev numbers measure work no visitor pays for
and hide the work they do.

### Idle desk — the budget

Nothing is picked up, nothing is animating. Measured on a 1440×900 desktop at
DPR 1 and a 390×844 phone viewport at the mobile tier.

| | desktop | mobile tier | ceiling |
|---|---|---|---|
| GPU texture memory | 85.8 MB | 22.6 MB | **95 MB / 26 MB** |
| draw calls | 247 | 141 | **270 / 160** |
| triangles | 12.4k | 6.5k | **14k / 7.5k** |
| draw calls, rocket open | 258 | 203 | **280 / 220** |
| peak texture memory, everything opened | 110.6 MB | 30.6 MB | **125 MB / 36 MB** |

Texture memory is the one to watch. This scene is fill-rate and memory bound,
not geometry bound — 12k triangles is nothing on anything that runs WebGL at
all, so do not go hunting for polygons. Where the desktop's 85.8 MB actually
goes: the desk slab's 2048×1536 wood is 16 MB and the five documents' page-0
sheets are ~52 MB between them. Both are correctly sized — a focused sheet
covers ~1870 device px on a 1440p display at the capped DPR, so 1280 texels of
paper height is if anything under-sampled — so that ~68 MB is simply what this
scene is, and the budget is set around it rather than against it.

### Per-frame and per-interaction

Frame figures are from an AMD Radeon 860M laptop iGPU at 1440×900, DPR 1.

| | measured | ceiling |
|---|---|---|
| idle frame, GPU | 1.9 ms | **4 ms** |
| idle frame, `renderer.render()` CPU | 3.9 ms | **6 ms** |
| idle frame rate | 60 (vsync-bound) | **no dropped frames** |
| worst frame during a page flip | 32–44 ms | **50 ms** |
| canvas paint on a page flip | ≤11 ms | **16 ms, or defer it** |
| canvas paint at mount, per sheet | ≤45 ms | **load-time only — never on an interaction** |

The last two rows are what has actually caused every "the desk is laggy" report
so far. Canvas painting is synchronous main-thread work, and a page turn onto a
sheet that has never been painted runs a full procedural repaint *inside* the
flip animation — anything over ~16 ms there IS a dropped frame, by definition.
`window.__paintLog` names the sheet and its cost, so this is one line to check
rather than something to infer from a flame chart.

Mount-time paints get a looser ceiling because they land behind the loading
screen, not inside an animation. That licence is specifically for work that
happens once, at load, for a sheet that is then cached for the session. It is
not a licence to make an interaction slow.

One caution about measuring frame rate at all: a laptop that drops into a
power-limited state (this one capped itself at 2.0 GHz partway through a long
profiling session) will halve every FPS figure you take, with no code change
involved. Compare paired runs of two builds under the same conditions, never a
number today against a number from last week — and if a state your change
cannot possibly touch (the idle desk paints nothing) moves too, you are
measuring the machine.

### The check, for any new visual feature

Before a feature counts as done — not after someone reports lag:

1. **Does it need lazy loading?** Every document mounts at load, so anything
   added to one is paid for by every visitor before the first frame, whether
   they open it or not. The established pattern is deferral behind first use:
   polaroids past page 0 wait for a pickup (`desk/Polaroids`), the rocket's
   component page and fine board hardware wait for `armed` (`desk/RocketModel`),
   zoom rasters are built on a pinch and disposed after (`lib/docTextures`).
2. **Does it need a texture-budget check?** Size a texture against the device
   pixels its surface actually covers, not against its source file. That
   question is why `lib/photoTexture` carries two caps rather than one — a
   framed album photo reaches ~1600 device px, a polaroid pinned to a page
   ~372, and one cap sized for the first cost the second 11× the texels it can
   ever sample.
3. **Does it add per-frame computation?** A `useFrame` that runs on the idle
   desk runs ~60 times a second forever. Check it is doing nothing when its
   feature is inactive (the model here is `desk/TouchControls`, which is
   listener-only and has no `useFrame` at all, and `desk/docZoom`, whose state
   is a single mutated object with an early-out at every reader).
4. **Then profile it.** Load the production build with `?perf=1`, take the idle
   numbers and `window.__paintLog`, and compare against the tables above — on
   BOTH tiers, because they do not track each other. The mobile tier shrinks
   texture rasters but not the CPU cost of painting them: page paints measured
   within ~15% of desktop's at a quarter of the pixels, so a phone pays roughly
   desktop's paint time on a much slower core.

If a number moves past a ceiling, either fix it or update the table in the same
change with the new measurement and a line saying why it is worth it. A ceiling
that is quietly exceeded is exactly how this became a recurring problem.

## Content commands

Three project-scoped slash commands live in `.claude/commands/` (version-controlled,
invoke-only — they never fire autonomously): `/sync-content`, `/draft-project`,
`/check-site`. Usage details are in README.md § "Content commands".
