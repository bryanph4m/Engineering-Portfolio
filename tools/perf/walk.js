// Drives the desk through the states the brief names and records each.
// Fire-and-forget: returns immediately, parks the result on window.__perfResult
// so the driving shell can poll for it instead of holding an eval open.
window.__perfResult = null
;(async () => {
  const P = window.__probe
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const store = window.__sceneStore
  const out = { stats: {}, runs: [], paints: [] }
  const S = () => store.getState()

  const record = async (label, ms = 2500) => {
    P.start(label)
    await sleep(ms)
    out.runs.push(P.stop())
  }

  // 1. idle desk
  out.stats.idle = P.sceneStats()
  await record('idle-desk', 3000)

  // 2. document pickup — projects (a 5-page stack)
  P.start('pickup-projects')
  S().focus('projects')
  await sleep(2000)
  out.runs.push(P.stop())
  out.stats.focusedProjects = P.sceneStats()

  // 3. page flips onto never-painted sheets (the first read of a document)
  P.start('page-flips-cold')
  for (let i = 0; i < 4; i++) {
    S().nextPage(5)
    await sleep(900)
  }
  out.runs.push(P.stop())
  out.stats.afterFlips = P.sceneStats()

  // 3b. flip back over the SAME sheets — now cached, isolates paint from flip
  P.start('page-flips-warm')
  for (let i = 0; i < 4; i++) {
    S().prevPage()
    await sleep(900)
  }
  out.runs.push(P.stop())

  S().close()
  await sleep(1500)

  // 4. the rocket and its blueprint component page
  P.start('rocket-pickup')
  S().focus('rocket')
  await sleep(2500)
  out.runs.push(P.stop())
  out.stats.rocketOpen = P.sceneStats()

  await record('rocket-open-steady', 2500)

  P.start('rocket-page-turns')
  for (let i = 0; i < 5; i++) {
    S().nextPage(19)
    await sleep(700)
  }
  out.runs.push(P.stop())

  S().close()
  await sleep(1500)
  await record('idle-after-everything', 2500)
  out.stats.idleAfter = P.sceneStats()

  out.paints = (window.__paintLog || []).slice()
  window.__perfResult = out
})()
'started'
