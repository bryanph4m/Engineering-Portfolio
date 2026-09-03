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

#### Re-measured 2026-09-02 — draw calls are close to the ceiling

The table above is the original hardware-referenced measurement. Re-measuring
HEAD found it had drifted before anything in that session touched the scene, so
the current numbers are recorded here rather than overwritten into it — these
were taken headless, where texture memory, draw calls and triangles are valid
(CPU rasterisation does not change them) but frame rate is not, so nothing in
the per-frame table below has been restated.

Paired runs, 8 projects → 11 (the résumé's Atrium, Camera Tracking Drone and
RWF DAF tank getting entries), same machine, same session:

| idle | before | after | ceiling |
|---|---|---|---|
| desktop draw calls | 260 | **268** | 270 |
| desktop texture memory | 91.7 MB | 91.7 MB | 95 MB |
| desktop peak, everything opened | 122.8 MB | 122.8 MB | 125 MB |
| mobile draw calls | 149 | **157** | 160 |
| mobile texture memory | 24.1 MB | 24.1 MB | 26 MB |
| mobile peak, everything opened | 33.7 MB | 33.7 MB | 36 MB |

Two things to take from this. First, adding projects costs **no** texture memory
at idle — the projects stack went 29 → 37 pages and idle memory did not move,
because a sheet is painted on the flip that first reaches it, not at mount. That
is the deferral pattern working, and it is why the memory column is boring.

Second, and the reason this note exists: **draw calls are the number with almost
nothing left.** Each project adds ~2.7 calls on both tiers, and the desktop idle
figure is now 2 under its ceiling, the mobile 3. The scene passed the ceiling for
triangles and memory long ago in the safe direction, so draw calls are what a
twelfth project spends. Anyone adding one should expect to batch something in
the same change rather than treat the ceiling as advisory — and the original 247
in the table above is no longer reachable without finding the 13 calls that went
missing between it and HEAD.

#### Re-measured 2026-09-03 — draw calls no longer scale with content

The note above was right that the next content change would spend the last of
the draw-call headroom, and it did: restructuring every project into
Objective/Approach/Result grew the projects stack 37 → 45 flip-pages and took
desktop idle draw calls to **276**, six past the ceiling.

The reason turned out to be structural rather than a per-project cost. A
multi-page document rendered one `<mesh>` per *unread page* — the blank leaves
that give a stack its physical thickness (`desk/props.jsx`, `MultiPageSheets`).
The projects stack alone was 44 of them, and the count grew with every page
added to any document, which is why "each project costs ~2.7 calls" held so
consistently. Those leaves are all the same plane with the same material,
differing only in a fixed fan offset, a z step and one of two paper tints, so
they are now a single `InstancedMesh` (`BlankLeaves`). Same silhouette, same
thickness, one call instead of N.

Paired runs, same machine and session, before → after the restructuring, with
the instancing in the "after":

| idle | 2026-09-02 HEAD | restructured, per-page meshes | restructured + instanced | ceiling |
|---|---|---|---|---|
| desktop draw calls | 268 | 276 (over) | **230** | 270 |
| desktop texture memory | 91.7 MB | 91.7 MB | **91.7 MB** | 95 MB |
| desktop peak, everything opened | 122.8 MB | 122.8 MB | **122.8 MB** | 125 MB |
| mobile draw calls | 157 | — | **119** | 160 |
| mobile texture memory | 24.1 MB | — | **24.1 MB** | 26 MB |
| mobile peak, everything opened | 33.7 MB | — | **33.7 MB** | 36 MB |

The ceilings are left where they are rather than tightened to the new figures:
they are the budget, not a high-water mark, and headroom is the point. What has
changed is what spends it. **Pages are now free in draw calls** — a twelfth
project, or ten more flip-pages on an existing one, adds meshes only for its
photos, so the per-project figure above no longer applies. Draw calls are again
spent by *props and materials*, which is what the number was always meant to
track.

`npm run check:projects` asserts the pagination properties this restructuring
depends on (no orphaned section headers, no block taller than the content box)
along with the five-field project shape. It is a structural check, not a
performance one — the numbers above still come from the harness.

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
