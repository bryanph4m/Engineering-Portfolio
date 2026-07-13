---
description: Read-only consistency and health check of site content — reports a pass/fail checklist, fixes nothing
allowed-tools: Read, Grep, Glob, WebFetch
disable-model-invocation: true
---

# /check-site — read-only consistency & health check

Diagnose and report ONLY. Do not edit, create, or delete any file. If something
fails, describe it precisely so the user can decide the fix.

Run these checks and report each as a ✅/❌ checklist item with specifics:

## 1. Links

- Collect every `href`/URL/path in `src/content/portfolio.js` (contact links, the
  `resume.pdf` path, any `github.url` fields, URLs inside specs).
- Internal paths (e.g. `/assets/…`): verify the file exists under `public/`.
- External URLs: verify they're well-formed; fetch each (WebFetch) and report ones
  that error or 404. Skip LinkedIn fetching per the Content Rules — check its URL
  shape only.
- Simple-mode cross-links: every `section` value on `profile.roles` / `profile.now`
  must match an id in the `sections` export; every `research.sheets[].id` and project
  `id` must be unique (they're DOM anchors).

## 2. Resume ↔ site consistency

Read `public/assets/Bryan-Pham-Resume.pdf` and compare with the `resume`, `profile`,
and `projects` exports: experience titles/orgs/dates, education, skills, award
wording, and that every project traces to the resume or a real `bryanph4m` repo.
Report each mismatch as a drift item.

## 3. No hardcoded content outside the shared file

- Grep `src/documents/`, `src/simple/`, `src/desk/`, `src/ui/` for content-shaped
  string literals: names, orgs, project names, claims, dates, URLs. Presentation
  strings (decor labels like "INDEX CARD · NO. 01", figure sketch captions, ARIA
  labels) are fine; facts are not. Flag anything factual not read from
  `src/content/portfolio.js`.
- Known accepted exceptions: `index.html` `<title>`/meta description (static by
  design, see README) and the drafting-decor labels inside the desk painters.

## 4. Both modes read the shared file

- Confirm `src/simple/SimpleMode.jsx` and every painter in `src/documents/content/`
  import from `../content/portfolio` / `../../content/portfolio`.
- Confirm every project `id` in the data has a figure in the `FIGURES` map of
  `src/documents/content/projects.js` (a missing figure breaks the desk stack).
- Flag any leftover `// REVIEW:` or `TODO` markers in `portfolio.js` as pending
  review items.

## Output

A single checklist grouped by the four sections above, ✅/❌ per item, with file:line
specifics for every ❌, followed by a one-paragraph verdict. Never apply fixes.
