---
description: Refresh auto-managed GitHub project fields in portfolio.js and report resume/site drift — drafts only, never commits
allowed-tools: Read, Edit, Grep, Glob, WebFetch, Bash(gh api:*), Bash(curl:*)
disable-model-invocation: true
---

# /sync-content — refresh GitHub data & flag drift

Follow the Content Rules in CLAUDE.md. Never commit, push, or deploy. Never touch
manual editorial fields.

## 1. Pull fresh GitHub metadata

Check `scripts/` and `package.json` for a dedicated sync script first (none exists as
of this writing — if one has been added, run it instead). Otherwise pull the live
repo list yourself:

```
curl -s "https://api.github.com/users/bryanph4m/repos?per_page=100"
```

(or `gh api users/bryanph4m/repos --paginate`).

## 2. Merge auto-managed fields only

For each entry in the `projects` export of `src/content/portfolio.js` that traces to
a real repo, refresh ONLY the auto-managed sub-object, creating it if absent:

```js
github: { repo, url, language, stars, description, createdAt, pushedAt }
```

- NEVER modify the manual editorial fields: `name`, `category`, `summary`,
  `highlight`, `specs`, or any other field outside `github`.
- If a repo backing a project has vanished or been renamed, flag it in the report —
  do not delete or rename the project entry.
- New repos with no project entry: list them in the report as candidates for
  `/draft-project`; do not add entries yourself.

## 3. Resume drift check

Read `public/assets/Bryan-Pham-Resume.pdf` and compare it against the `resume`,
`profile`, and `projects` exports. Report:

- anything on the resume not reflected on the site (roles, education, skills,
  projects, awards),
- anything on the site not supported by the resume or a real repo,
- mismatched titles, orgs, dates, or award wording.

## 4. Report — and stop

Output a summary: which `github` fields were refreshed per project, what drift was
found, and what was ambiguous. For ambiguities, insert a `// REVIEW:` comment next to
the relevant entry in `portfolio.js` rather than editing the content itself. End by
reminding that all changes are uncommitted working-tree edits awaiting review.
