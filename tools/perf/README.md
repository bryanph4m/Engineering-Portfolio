# Performance harness

Measures the desk against the budget in `CLAUDE.md` § "Performance budget".
It exists so that budget is a thing you check in two minutes rather than a
paragraph nobody can act on.

## Run it

```sh
npm run build
npx vite preview --port 5299          # ?perf=1 only works on a production build

# desktop tier
sh tools/perf/measure.sh "http://localhost:5299/?perf=1" /tmp/desktop.json 1440x900
python tools/perf/report.py /tmp/desktop.json

# mobile tier, forced (src/lib/quality.js) so you don't need a phone
sh tools/perf/measure.sh "http://localhost:5299/?perf=1&tier=mobile" /tmp/mobile.json 390x844
python tools/perf/report.py /tmp/mobile.json
```

`measure.sh` drives gstack's `browse`. Pass `BFLAGS=--headed` to run against a
real GPU — **do this for anything frame-rate related**, because headless
Chromium falls back to SwiftShader, a CPU rasteriser, and its FPS numbers mean
nothing for a scene that is fill-rate bound. Texture memory, draw calls,
triangle counts and canvas paint times are hardware-independent and are the same
either way.

## Why a production build, always

Dev runs two things that the real bundle does not: the ink-bounds readback for
multi-page sheets, and `devVerify`'s `toDataURL` on every page
(`src/lib/docTextures.js`). Profiling dev therefore measures work no visitor
ever pays for, and buries the work they do. `?perf=1` exists precisely so the
handles are reachable from a real build — see `src/lib/perfHook.js`.

## The pieces

| file | what it is |
|---|---|
| `probe.js` | Installs `window.__probe`. Wraps `renderer.render` for CPU submit time, uses `EXT_disjoint_timer_query_webgl2` for true GPU ms where available, and walks the scene graph for texture bytes, unique geometries, triangles, draw calls and shadow-map size. |
| `walk.js` | Steps the scene through the states worth measuring — idle, document pickup, cold and warm page flips, the rocket and its component page — recording each. Fire-and-forget; parks its result on `window.__perfResult`. |
| `measure.sh` | Drives a browser through the above and writes the JSON. Does a discarded warm-up load first: the bundled drafting faces are font-matched on first use, and an unwarmed face makes the first paint of every page several times its steady cost. |
| `report.py` | Prints the JSON as the tables the budget is written in. |

## Reading the output

- **`>20ms` / `>50ms` counts** are dropped frames. On a 60 Hz display the frame
  budget is 16.7 ms, so any of these is visible.
- **`canvas paints`** is the one that matters most. It names each sheet and what
  painting it cost. A page turn onto a never-painted sheet paints it inside the
  flip animation, so anything here over ~16 ms is a guaranteed dropped frame —
  this is what every "the desk is laggy" report has traced back to so far.
- **cold vs warm page flips** separates the paint from the animation: the warm
  pass re-flips sheets already in the texture cache, so if cold is slow and warm
  is smooth, the cost is painting, not the flip.

## A/B-ing a change

Build both versions to separate `--outDir`s, serve each on its own port, and
**alternate which one runs first on each repetition**. Whichever build runs
second inherits whatever the first did to the machine; with a fixed order that
bias lands entirely on one side, and it is large — it showed up here as a
"regression" of 7 fps on an idle scene that paints nothing at all. Take medians
over 4+ repetitions, and treat any delta on a state that your change cannot
possibly touch as a measurement artifact rather than a finding.
