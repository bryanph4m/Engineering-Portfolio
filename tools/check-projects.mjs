/**
 * The standing check for the project entries: the five-field shape in
 * src/content/portfolio.js, and the desk pagination that flows from it.
 *
 * Every project carries three prose sections (Objective / Approach / Result)
 * plus two secondary fields (`tools`, `status`). That convention is only worth
 * anything if something fails when it is broken, so this asserts it — along
 * with the two pagination properties the desk's flip-pages have to hold:
 *   - no single block is taller than the content box (pageFlow can't split one,
 *     so an oversized block is clipped), and
 *   - no page ends on a keep-with-next header (an orphaned "APPROACH" sitting
 *     alone at the foot of a page with its prose on the next one).
 *
 * Run it with `npm run check:projects`. It builds through Vite for SSR first,
 * because the content modules are Vite modules — `import.meta.env` and the
 * `?tier=` query handling in lib/quality.js don't exist in bare Node.
 */
import { projects } from '../src/content/portfolio.js'
import { projectPages, PROJECTS_PAPER } from '../src/documents/content/projects.js'
import { pageGeom } from '../src/lib/docTextures.js'

const SECTIONS = ['Objective', 'Approach', 'Result']
const KEEP_WITH_NEXT = new Set(['head', 'subhead', 'cont'])

const problems = []
const fail = (msg) => problems.push(msg)

// ---- 1. the five-field shape ----
for (const p of projects) {
  const headings = (p.detail ?? []).map((s) => s.heading)
  if (String(headings) !== String(SECTIONS)) {
    fail(`${p.id}: detail headings are [${headings}], expected [${SECTIONS}]`)
  }
  for (const sec of p.detail ?? []) {
    if (!sec.body?.length || sec.body.some((b) => !b?.trim())) {
      fail(`${p.id} · ${sec.heading}: empty body`)
    }
  }
  if (!p.tools?.length) fail(`${p.id}: no tools listed`)
  if (!p.status?.trim()) fail(`${p.id}: no status`)
}

// ---- 2. desk pagination ----
const { box } = pageGeom(PROJECTS_PAPER, true)
projectPages.forEach((page, i) => {
  const kinds = page.kinds
  if (!kinds) return // the hand-drawn cover has no flowed blocks
  const last = kinds[kinds.length - 1]
  if (KEEP_WITH_NEXT.has(last)) fail(`page ${i}: ends on an orphaned '${last}' header`)
})

// Oversized blocks: pageFlow warns about these in dev only, where nobody sees
// it. Re-derive the same test from the flowed pages' own anchors and heights.
for (const [i, page] of projectPages.entries()) {
  for (const a of page.anchors ?? []) {
    if (a.h > box.h) fail(`page ${i}: photo block (${a.h}px) is taller than the content box (${box.h}px)`)
  }
}

// ---- report ----
const summary = projects.map((p) => `  ${p.id.padEnd(24)} ${p.status}`).join('\n')
console.log(`${projects.length} projects, ${projectPages.length} desk pages\n${summary}\n`)
if (problems.length) {
  console.error(`FAIL\n${problems.map((p) => `  - ${p}`).join('\n')}`)
  process.exit(1)
}
console.log('OK — five fields on every project, no orphaned headers, no oversized blocks')
