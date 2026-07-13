---
description: Draft a portfolio project entry from a GitHub repo's metadata and README — inserted as a // REVIEW: draft, never final
argument-hint: <repo name or URL>
allowed-tools: Read, Edit, Grep, Glob, WebFetch, Bash(gh api:*), Bash(curl:*)
disable-model-invocation: true
---

# /draft-project — turn a repo into a formatted project entry

Repo to draft: **$ARGUMENTS** (a repo name under `bryanph4m` or a full GitHub URL).
Follow the Content Rules in CLAUDE.md. Never commit.

## 1. Gather the source material

- Fetch the repo's metadata (`gh api repos/bryanph4m/<repo>` or the public API) and
  its README. If the repo doesn't exist under `bryanph4m`, stop and say so — do not
  draft from guesswork.
- Check `public/assets/Bryan-Pham-Resume.pdf`: if the resume describes the same
  project, prefer its wording for the summary when it's better written, and merge
  tech/dates from the repo.

## 2. Draft in the exact shape `src/content/portfolio.js` uses

Match the existing `projects` entries exactly — study them first:

```js
{
  id: '<kebab-case>',
  name: '<display name>',
  category: '<Software / Hardware / Rocketry / …>',
  summary: '<one line; include award wording if real>',
  // highlight: '<verbatim substring of summary to circle>',  // only if earned
  specs: [
    { lead: '<short headline fact>', sub: '<supporting detail>' },
    // 3–4 specs
  ],
  github: { repo, url, language, stars, description, createdAt, pushedAt },
}
```

Write clean portfolio prose: short leads (≤ ~40 chars — the desk sheets render them
in large type), concrete facts only. If key info is missing from the repo/README
(category, what it actually does, dates), put `TODO` in that field — never invent.

## 3. Deliver as a draft, never final

Insert the entry at the end of the `projects` array preceded by a
`// REVIEW: drafted by /draft-project from <repo> on <date> — edit or delete` comment,
OR (if the user asked, or the edit is risky) print the block for manual pasting.

Note in your summary: a new project id needs a matching desk figure in
`src/documents/content/projects.js` (`FIGURES` map) — flag this; do not draw one
unless asked.

End by listing any `TODO`s left and reminding that nothing was committed.
