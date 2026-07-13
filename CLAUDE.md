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

## Content commands

Three project-scoped slash commands live in `.claude/commands/` (version-controlled,
invoke-only — they never fire autonomously): `/sync-content`, `/draft-project`,
`/check-site`. Usage details are in README.md § "Content commands".
