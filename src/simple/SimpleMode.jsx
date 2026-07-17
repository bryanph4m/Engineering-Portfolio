import { useEffect, useMemo, useRef, useState } from 'react'
import {
  profile, projects, research, resume, contact, sections, disciplineLabels,
} from '../content/portfolio'
import { IS_MOBILE } from '../lib/quality'
import './simple.css'

/**
 * Simple / recruiter mode — the flat, Wikipedia-style reading view.
 *
 * It reads the exact same content as the desk scene (src/content/portfolio.js)
 * and reformats it as encyclopedia-style articles: a left nav of sections, a
 * serif article column, a collapsible Contents box, underlined headers and
 * plain blue hyperlinks. No Three.js, no canvas — this whole tree is a few KB
 * of DOM, and App only ever loads it when the visitor picks this mode.
 */

/** "a, b, and c" for prose. */
function andList(a) {
  if (a.length === 0) return ''
  if (a.length === 1) return a[0]
  if (a.length === 2) return `${a[0]} and ${a[1]}`
  return `${a.slice(0, -1).join(', ')}, and ${a[a.length - 1]}`
}

/** Render nodes inline as "x, y, and z" (nodes, not strings). */
function InlineList({ items }) {
  return items.map((node, i) => {
    let sep = ''
    if (i < items.length - 2) sep = ', '
    else if (i === items.length - 2) sep = items.length > 2 ? ', and ' : ' and '
    return (
      <span key={i}>
        {node}
        {sep}
      </span>
    )
  })
}

/**
 * A Wikipedia-style figure: a bordered, right-floated thumbnail with a bold
 * title lead-in, a muted caption, and a muted "date · credit" line beneath —
 * all pulled from a shared photo entry (src/content/portfolio.js). Real `alt`
 * text rides the image for accessibility. If the file isn't in
 * /public/assets/photos/ yet (or fails to load) the frame shows a labelled
 * placeholder instead of a broken image, so an unadded photo never looks broken.
 *
 * A photo carrying a `link` clicks through to it in a new tab. Following
 * Wikipedia, only the image itself is the link — the caption below stays plain
 * text, since a linked title would read as a second, different destination.
 */
function WikiFigure({ photo }) {
  const [failed, setFailed] = useState(!photo.src)
  const meta = [photo.date, photo.credit].filter(Boolean).join(' · ')
  const visual = failed ? (
    <div
      className="wiki__figure-ph"
      role="img"
      aria-label={photo.alt || photo.title || 'Photo placeholder'}
    >
      photo
    </div>
  ) : (
    <img
      className="wiki__figure-img"
      src={photo.src}
      alt={photo.alt || photo.caption || photo.title || ''}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
  return (
    <figure className="wiki__figure">
      {photo.link ? (
        <a
          className="wiki__figure-link"
          href={photo.link}
          target="_blank"
          rel="noopener noreferrer"
        >
          {visual}
        </a>
      ) : (
        visual
      )}
      <figcaption className="wiki__figure-cap">
        {photo.title ? <span className="wiki__figure-title">{photo.title}</span> : null}
        {photo.caption ? <span className="wiki__figure-desc">{photo.caption}</span> : null}
        {meta ? <span className="wiki__figure-meta">{meta}</span> : null}
      </figcaption>
    </figure>
  )
}

/** Render a section's photo list as a stack of floated figures, or nothing. */
function Figures({ photos }) {
  if (!photos?.length) return null
  return photos.map((p, i) => <WikiFigure key={i} photo={p} />)
}

/**
 * The resume, embedded inline — simple mode's whole Resume article.
 *
 * This view deliberately shows the real PDF rather than a re-typed transcript:
 * the resume file (public/assets/Bryan-Pham-Resume.pdf, `resume.pdf` in the
 * shared content) is authoritative, so a recruiter reads exactly what they'd get
 * from the download instead of a copy that can drift from it. The desk mode is
 * unaffected — its folded resume sheet still paints `resume.sections` verbatim
 * (src/documents/content/resume.js), so that data stays the single source for
 * the sheet.
 *
 * `<object>` (not `<iframe>`) so browsers with no inline PDF viewer render the
 * children as a real fallback instead of a blank box; the download link above
 * the frame is always there regardless.
 *
 * Mobile skips the embed entirely and offers the card below instead. This is
 * not a size or taste judgement — it is that phone browsers have no inline PDF
 * viewer to embed into: iOS Safari and Android Chrome both refuse to render a
 * plugin-type `<object>`, and (the part that actually bites) they refuse
 * *silently*, painting an empty box without ever falling through to the child
 * content that exists for exactly this case. So the fallback cannot be left to
 * the browser to trigger — on the tier where it is always needed, it must be
 * chosen up front. Tapping through hands the file to the OS viewer, which is
 * where a phone reads a PDF well anyway.
 */
function ResumePreview() {
  if (IS_MOBILE) {
    return (
      <div className="wiki__pdf wiki__pdf--linked">
        <div className="wiki__pdf-fallback">
          <p>The resume is a PDF — phone browsers open it in their own viewer.</p>
          <a className="wiki__download" href={resume.pdf} target="_blank" rel="noreferrer">
            Open resume (PDF) ↗
          </a>
        </div>
      </div>
    )
  }
  return (
    <div className="wiki__pdf">
      <object
        className="wiki__pdf-frame"
        data={`${resume.pdf}#view=FitH`}
        type="application/pdf"
        aria-label={`${resume.name} — resume (PDF)`}
      >
        <div className="wiki__pdf-fallback">
          <p>This browser can&rsquo;t display the PDF inline.</p>
          <a className="wiki__download" href={resume.pdf} target="_blank" rel="noreferrer">
            Download resume (PDF) ↗
          </a>
        </div>
      </object>
    </div>
  )
}

/**
 * Article definitions, keyed by section id. Each is a function of `go` (the
 * navigation callback) so bodies can carry internal cross-links. Every string
 * here comes straight from the shared portfolio data.
 */
function buildArticles(go) {
  const link = (label, section, anchor) => (
    <a className="wiki-link" onClick={() => go(section, anchor)}>{label}</a>
  )

  return {
    about: {
      title: 'About',
      lead: (
        <p>
          <strong>{profile.name}</strong> is a mechanical engineering student based in{' '}
          {profile.location}, working across {andList(disciplineLabels)}.
        </p>
      ),
      // Longer-form body prose the simple mode shows after the lead. Desk mode
      // never reads this; see profile.extended in portfolio.js.
      extended: profile.extended,
      // Article-level figures (simple mode only), floated beside the intro.
      photos: profile.photos,
      subsections: [
        {
          id: 'roles',
          heading: 'Roles',
          render: () => (
            <ul className="wiki__list">
              {profile.roles.map((r, i) => (
                <li key={i}>
                  {r.lead}
                  {r.section
                    ? link(r.emphasis, r.section)
                    : <strong>{r.emphasis}</strong>}
                </li>
              ))}
            </ul>
          ),
        },
        {
          id: 'focus',
          heading: 'Current focus',
          render: () => (
            <>
              <p>
                Current work spans{' '}
                <InlineList
                  items={profile.now.map((n) =>
                    n.section ? link(n.label, n.section) : n.label,
                  )}
                />.
              </p>
              <blockquote className="wiki__quote">&ldquo;{profile.motto}&rdquo;</blockquote>
            </>
          ),
        },
      ],
    },

    projects: {
      title: 'Projects',
      lead: (
        <p>
          Selected hardware and software projects. Jump to{' '}
          <InlineList items={projects.map((p) => link(p.name, 'projects', p.id))} />.
        </p>
      ),
      subsections: projects.map((p) => ({
        id: p.id,
        heading: p.name,
        photos: p.photos,
        render: () => (
          <>
            <p className="wiki__meta">{p.category} · {p.summary}</p>
            <ul className="wiki__list">
              {p.specs.map((s, i) => (
                <li key={i}>
                  <span className="wiki__spec-lead">{s.lead}</span>
                  {s.sub ? <> · <span className="wiki__spec-sub">{s.sub}</span></> : null}
                </li>
              ))}
            </ul>
            {p.detail?.map((sec, i) => (
              <div key={i}>
                {sec.heading ? <h3 className="wiki__h3">{sec.heading}</h3> : null}
                {sec.body.map((para, j) => <p key={j}>{para}</p>)}
              </div>
            ))}
          </>
        ),
      })),
    },

    research: {
      title: 'Research',
      lead: (
        <p>
          {research.lead} {research.credit}
        </p>
      ),
      // Longer-form body prose the simple mode shows after the lead. Desk mode
      // never reads this; see research.extended in portfolio.js.
      extended: research.extended,
      // Article-level figures (simple mode only). Per-sheet figures live on the
      // subsections below; the desk polaroids come from those, not from here.
      photos: research.photos,
      subsections: research.sheets.map((s) => ({
        id: s.id,
        heading: s.title,
        photos: s.photos,
        render: () => (
          <>
            <p className="wiki__meta">{s.sub}</p>
            {s.lead ? <p>{s.lead}</p> : null}
            {s.notes?.length ? (
              <ul className="wiki__list">
                {s.notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            ) : null}
            {s.extended?.length ? (
              <div className="wiki__extended">
                {s.extended.map((para, i) => <p key={i}>{para}</p>)}
              </div>
            ) : null}
          </>
        ),
      })),
    },

    // The resume PDF, embedded — this article IS the preview. It carries no
    // subsections: the Education / Experience / Projects / Skills breakdown is
    // in the PDF itself, so re-typing it here would only be a second copy that
    // can drift from the authoritative file. Desk mode still renders those
    // sections from `resume.sections` on its folded sheet.
    resume: {
      title: 'Resume',
      // "shown below" is only true where the PDF actually embeds, and the lead's
      // download link would be a second copy of the one on mobile's link card
      // (ResumePreview) — so on that tier the lead just introduces it and lets
      // the card carry the single call to action.
      lead: IS_MOBILE ? (
        <p>
          The full resume for <strong>{resume.name}</strong>.
        </p>
      ) : (
        <>
          <p>
            The full resume for <strong>{resume.name}</strong>, shown below.
          </p>
          <p>
            <a
              className="wiki__download"
              href={resume.pdf}
              target="_blank"
              rel="noreferrer"
            >
              Open or download the PDF ↗
            </a>
          </p>
        </>
      ),
      body: () => <ResumePreview />,
      subsections: [],
    },

    contact: {
      title: 'Contact',
      // Simple-mode-only lead copy; see `contact.intro` in portfolio.js. The
      // desk's envelope never reads it.
      lead: <p>{contact.intro}</p>,
      subsections: [
        {
          id: 'contact-links',
          heading: 'Contact details',
          render: () => (
            <ul className="wiki__list wiki__contacts">
              {contact.links.map((l, i) => (
                <li key={i}>
                  <span className="wiki__contact-kind">{l.kind}</span>
                  <a
                    className="wiki-link"
                    href={l.href}
                    target={l.href.startsWith('mailto:') ? undefined : '_blank'}
                    rel="noreferrer"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          ),
        },
      ],
    },
  }
}

// Flat search index over every section and subsection. Built once — it only
// depends on the static content.
const SEARCH_INDEX = [
  {
    section: 'about', anchor: 'roles', label: 'About',
    text: `${profile.name} ${profile.location} ${profile.roles.map((r) => r.lead + r.emphasis).join(' ')} ${profile.motto} ${profile.now.map((n) => n.label).join(' ')}`,
  },
  ...projects.map((p) => ({
    section: 'projects', anchor: p.id, label: p.name,
    text: `${p.name} ${p.category} ${p.summary} ${p.specs.map((s) => `${s.lead} ${s.sub ?? ''}`).join(' ')} ${(p.detail ?? []).map((d) => `${d.heading ?? ''} ${d.body.join(' ')}`).join(' ')} ${(p.photos ?? []).map((ph) => `${ph.title ?? ''} ${ph.caption ?? ''}`).join(' ')}`,
  })),
  {
    section: 'research', anchor: research.sheets[0].id, label: 'Research',
    text: `${research.title} ${research.lead} ${research.program} ${research.org}`,
  },
  ...research.sheets.map((s) => ({
    section: 'research', anchor: s.id, label: s.title,
    text: `${s.title} ${s.sub} ${s.lead ?? ''} ${(s.notes ?? []).join(' ')} ${(s.photos ?? []).map((ph) => `${ph.title ?? ''} ${ph.caption ?? ''}`).join(' ')}`,
  })),
  // The Resume article is the embedded PDF, so it has no subsections to index.
  // Its one entry still searches the resume's own words (the section labels and
  // entries desk mode paints) so a query like "SolidWorks" or "Skills" lands on
  // the preview — the document that actually answers it.
  {
    section: 'resume', anchor: null, label: 'Resume (PDF)',
    text: resume.sections
      .map((sec) => `${sec.label} ${sec.entries.map((e) => `${e.title} ${e.sub}`).join(' ')}`)
      .join(' '),
  },
  {
    section: 'contact', anchor: 'contact-links', label: 'Contact',
    text: `${contact.intro} ${contact.links.map((l) => `${l.kind} ${l.label}`).join(' ')}`,
  },
].map((e, i) => ({ ...e, key: i, haystack: `${e.label} ${e.text}`.toLowerCase() }))

function scrollToAnchor(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/* ------------------------------------------------------------------ */
/* Appearance settings — SIMPLE MODE ONLY                              */
/* ------------------------------------------------------------------ */
/**
 * Wikipedia's Appearance panel: text size, content width, and colour mode,
 * applied live and remembered across reloads.
 *
 * Everything here is scoped to the simple mode and cannot reach the desk:
 * the settings are applied as data attributes on the `.wiki` root element and
 * every rule that reads them is a `.wiki[data-…]` selector in simple.css, which
 * only ships in the lazily-loaded simple-mode chunk. Nothing touches <html>,
 * <body>, or any global state, so the 3D scene's styling is untouched whether or
 * not a visitor has ever opened this panel. (App.jsx hard-forks the two modes,
 * so `.wiki` doesn't even exist while the desk is mounted.)
 */
const APPEARANCE_KEY = 'wiki:appearance'
const APPEARANCE_DEFAULTS = { text: 'standard', width: 'standard', color: 'automatic' }
// value → label, in the order Wikipedia lists them.
const APPEARANCE_OPTIONS = {
  text: [['small', 'Small'], ['standard', 'Standard'], ['large', 'Large']],
  width: [['standard', 'Standard'], ['wide', 'Wide']],
  color: [['automatic', 'Automatic'], ['light', 'Light'], ['dark', 'Dark']],
}

/** Read saved settings, keeping only values the CSS actually has a rule for —
 *  a stale or hand-edited entry falls back to the default for that field
 *  instead of wedging the view into an unstyled state. */
function loadAppearance() {
  try {
    const saved = JSON.parse(localStorage.getItem(APPEARANCE_KEY) ?? 'null')
    const next = { ...APPEARANCE_DEFAULTS }
    for (const key of Object.keys(APPEARANCE_DEFAULTS)) {
      if (APPEARANCE_OPTIONS[key].some(([v]) => v === saved?.[key])) next[key] = saved[key]
    }
    return next
  } catch {
    return APPEARANCE_DEFAULTS // storage blocked or unparseable — use defaults
  }
}

function useAppearance() {
  const [appearance, setAppearance] = useState(loadAppearance)
  // The OS preference, tracked live so 'Automatic' resolves to a real theme and
  // follows a system change without a reload.
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(APPEARANCE_KEY, JSON.stringify(appearance))
    } catch {
      // Storage unavailable (private mode / blocked cookies). The settings still
      // apply for this session; only persistence is lost.
    }
  }, [appearance])

  const set = (key, value) => setAppearance((a) => ({ ...a, [key]: value }))
  // 'automatic' is stored as the preference but never applied as-is — the DOM
  // always carries a concrete light/dark so the CSS needs no media query.
  const resolvedColor =
    appearance.color === 'automatic' ? (systemDark ? 'dark' : 'light') : appearance.color

  return { appearance, set, resolvedColor }
}

// An appearance/contrast glyph on the WikimediaUI 20×20 grid: a ring with its
// right half filled, the standard "theme" mark.
function AppearanceIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path fill="currentColor" d="M10 2a8 8 0 0 1 0 16z" />
    </svg>
  )
}

/** The docked Appearance panel. Each control writes straight to state, so the
 *  change lands on the next render — no apply button, no reload. */
function AppearancePanel({ appearance, set }) {
  const group = (key, legend) => (
    <fieldset className="wiki__appearance-group">
      <legend className="wiki__appearance-legend">{legend}</legend>
      {APPEARANCE_OPTIONS[key].map(([value, label]) => (
        <label className="wiki__appearance-opt" key={value}>
          <input
            type="radio"
            name={`wiki-appearance-${key}`}
            value={value}
            checked={appearance[key] === value}
            onChange={() => set(key, value)}
          />
          <span>{label}</span>
        </label>
      ))}
    </fieldset>
  )
  return (
    <aside className="wiki__appearance" aria-label="Appearance">
      <div className="wiki__appearance-inner">
        <p className="wiki__appearance-title">Appearance</p>
        {group('text', 'Text')}
        {group('width', 'Width')}
        {group('color', 'Color')}
      </div>
    </aside>
  )
}

// WikimediaUI "menu" icon — the exact three-bar glyph Vector 2022 uses for
// its main-menu toggle (20×20, bars at y = 3 / 9 / 15).
function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path fill="currentColor" d="M1 3v2h18V3zm0 6v2h18V9zm0 6v2h18v-2z" />
    </svg>
  )
}

// WikimediaUI "search" magnifying glass (20×20).
function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7.5 13c3.04 0 5.5-2.46 5.5-5.5S10.54 2 7.5 2 2 4.46 2 7.5 4.46 13 7.5 13zm4.55.46A7.43 7.43 0 0 1 7.5 15C3.36 15 0 11.64 0 7.5S3.36 0 7.5 0C11.64 0 15 3.36 15 7.5c0 1.71-.57 3.29-1.54 4.55l6.49 6.49-1.41 1.41-6.49-6.49z"
      />
    </svg>
  )
}

/**
 * Live clock in the slot Wikipedia gives its Donate / Create account / Log in
 * cluster. Isolated component so the 1 s tick only re-renders this <time>,
 * never the article tree.
 */
function HeaderClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <time className="wiki__clock" dateTime={now.toISOString()}>
      <span className="wiki__clock-date">
        {now.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
        {' · '}
      </span>
      {now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
    </time>
  )
}

function Toc({ items }) {
  if (items.length < 2) return null
  return (
    <details className="wiki__toc" open>
      <summary className="wiki__toc-title">Contents</summary>
      <ol className="wiki__toc-list">
        {items.map((it, i) => (
          <li key={it.id}>
            <a
              href={`#${it.id}`}
              onClick={(e) => { e.preventDefault(); scrollToAnchor(it.id) }}
            >
              <span className="wiki__toc-num">{i + 1}</span>{it.heading}
            </a>
          </li>
        ))}
      </ol>
    </details>
  )
}

function Article({ article }) {
  return (
    <article className="wiki__article">
      <h1 className="wiki__title">{article.title}</h1>
      <Toc items={article.subsections} />
      {/* Article-level figures float beside the intro (simple mode only). */}
      <Figures photos={article.photos} />
      <div className="wiki__lead">{article.lead}</div>
      {/* Optional longer-form body prose (simple mode only). Renders after the
          lead like a Wikipedia intro; absent or empty just leaves the lead. */}
      {article.extended?.length ? (
        <div className="wiki__extended">
          {article.extended.map((para, i) => <p key={i}>{para}</p>)}
        </div>
      ) : null}
      {/* Optional custom article body (the Resume article's embedded PDF), shown
          between the prose and any subsections. Most articles omit it. */}
      {article.body?.()}
      {article.subsections.map((s) => (
        <section key={s.id} id={s.id} className="wiki__section">
          <h2 className="wiki__h2">{s.heading}</h2>
          {/* Per-subsection figures float right; text wraps beside them. */}
          <Figures photos={s.photos} />
          {s.render()}
        </section>
      ))}
    </article>
  )
}

export default function SimpleMode({ onExit, onEnterDesk }) {
  const [active, setActive] = useState('about')
  const [pending, setPending] = useState(null)
  const [query, setQuery] = useState('')
  const [resultsOpen, setResultsOpen] = useState(false)
  // Sidebar visibility, toggled by the header hamburger the way Wikipedia's
  // main-menu button works: open by default on desktop, closed on narrow
  // screens where the hamburger is the primary way into the nav.
  const [navOpen, setNavOpen] = useState(
    () => window.matchMedia('(min-width: 800px)').matches,
  )
  // Below Wikipedia's 1120px header breakpoint the search bar collapses to an
  // icon-only button; tapping it expands search across the whole bar.
  const [searchOpen, setSearchOpen] = useState(false)
  // Appearance panel: closed until the header toggle opens it, like Wikipedia's.
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const { appearance, set: setAppearance, resolvedColor } = useAppearance()
  const mainRef = useRef(null)
  const searchInputRef = useRef(null)

  // Focus the input when the collapsed (mobile) search expands.
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus()
  }, [searchOpen])

  const go = (section, anchor = null) => {
    setActive(section)
    setPending(anchor)
    setQuery('')
    setResultsOpen(false)
  }

  // After a navigation commits, jump to the requested anchor or the top of the
  // article. Runs on section change so switching also resets the scroll.
  useEffect(() => {
    const main = mainRef.current
    if (!main) return
    if (pending) {
      const el = document.getElementById(pending)
      if (el) {
        el.scrollIntoView({ block: 'start' })
        return
      }
    }
    main.scrollTo({ top: 0 })
  }, [active, pending])

  const articles = useMemo(() => buildArticles(go), [])
  const article = articles[active]

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    return SEARCH_INDEX.filter((e) => e.haystack.includes(q)).slice(0, 8)
  }, [query])

  return (
    <div
      className={`wiki${navOpen ? '' : ' wiki--nav-closed'}${searchOpen ? ' wiki--search-open' : ''}${appearanceOpen ? ' wiki--appearance-open' : ''}`}
      // The appearance settings ride the root element as data attributes; every
      // rule that reads them is scoped to `.wiki` (see useAppearance above).
      data-text-size={appearance.text}
      data-width={appearance.width}
      data-color={resolvedColor}
    >
      {/*
        Header replicating Wikipedia's Vector 2022 top bar structure:
        [hamburger][wordmark + tagline][search input + Search button] ... [right slot]
        with the branding swapped for this portfolio and the Donate/Create
        account/Log in cluster replaced by a live clock.
      */}
      <header className="wiki__top">
        <button
          type="button"
          className="wiki__menu"
          aria-label="Main menu"
          aria-expanded={navOpen}
          title="Main menu"
          onClick={() => setNavOpen((v) => !v)}
        >
          <MenuIcon />
        </button>

        <button className="wiki__brand" type="button" onClick={() => go('about')}>
          <span className="wiki__brand-name">{profile.name}</span>
          <span className="wiki__brand-tag">engineering portfolio</span>
        </button>

        <div className="wiki__search" role="search">
          <div className="wiki__search-field">
            <span className="wiki__search-icon"><SearchIcon /></span>
            <input
              ref={searchInputRef}
              className="wiki__search-input"
              type="search"
              placeholder={`Search ${profile.name}`}
              aria-label={`Search ${profile.name}`}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setResultsOpen(true) }}
              onFocus={() => setResultsOpen(true)}
              onBlur={() => setTimeout(() => { setResultsOpen(false); setSearchOpen(false) }, 150)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setQuery(''); setResultsOpen(false); setSearchOpen(false) }
              }}
            />
          </div>
          <button
            type="button"
            className="wiki__search-btn"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              if (results.length) go(results[0].section, results[0].anchor)
              else searchInputRef.current?.focus()
            }}
          >
            Search
          </button>
          {resultsOpen && query.trim().length >= 2 && (
            results.length ? (
              <ul className="wiki__results">
                {results.map((r) => (
                  <li key={r.key}>
                    <button
                      type="button"
                      className="wiki__result"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => go(r.section, r.anchor)}
                    >
                      <span className="wiki__result-label">{r.label}</span>{' '}
                      <span className="wiki__result-in">in {r.section}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="wiki__results">
                <p className="wiki__results-empty">No matches for &ldquo;{query.trim()}&rdquo;.</p>
              </div>
            )
          )}
        </div>

        {/* Icon-only search toggle, shown below the 1120px header breakpoint
            exactly where Wikipedia collapses its search box. */}
        <button
          type="button"
          className="wiki__search-toggle"
          aria-label="Search"
          onClick={() => setSearchOpen(true)}
        >
          <SearchIcon />
        </button>

        {/* Appearance toggle, in Wikipedia's slot: the last control before the
            top-right cluster (here the clock). Shows and hides the docked panel. */}
        <button
          type="button"
          className="wiki__appearance-toggle"
          aria-label="Appearance"
          aria-expanded={appearanceOpen}
          title="Appearance"
          onClick={() => setAppearanceOpen((v) => !v)}
        >
          <AppearanceIcon />
        </button>

        <HeaderClock />
      </header>

      <nav className="wiki__side" aria-label="Sections">
        <p className="wiki__nav-head">Contents</p>
        <ul className="wiki__nav">
          {sections.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className={`wiki__nav-link${active === s.id ? ' is-active' : ''}`}
                aria-current={active === s.id ? 'page' : undefined}
                onClick={() => go(s.id)}
              >
                {s.title}
              </button>
            </li>
          ))}
        </ul>
        <div className="wiki__side-foot">
          {onEnterDesk && (
            <a className="wiki-link" onClick={onEnterDesk}>Enter the 3D desk ↗</a>
          )}
          {onExit && (
            <a className="wiki-link" onClick={onExit}>← Back to start</a>
          )}
        </div>
      </nav>

      <main className="wiki__main" ref={mainRef}>
        {article && <Article article={article} />}
      </main>

      {appearanceOpen && <AppearancePanel appearance={appearance} set={setAppearance} />}
    </div>
  )
}
