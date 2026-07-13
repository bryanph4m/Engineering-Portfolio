import { useEffect, useMemo, useRef, useState } from 'react'
import {
  profile, projects, research, resume, contact, sections, disciplineLabels,
} from '../content/portfolio'
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

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')

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
        render: () => (
          <>
            <p className="wiki__meta">{p.category} · {p.summary}</p>
            <ul className="wiki__list">
              {p.specs.map((s, i) => (
                <li key={i}>
                  <span className="wiki__spec-lead">{s.lead}</span>
                  {s.sub ? <> — <span className="wiki__spec-sub">{s.sub}</span></> : null}
                </li>
              ))}
            </ul>
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
      subsections: research.sheets.map((s) => ({
        id: s.id,
        heading: s.title,
        render: () => (
          <>
            <p className="wiki__meta">{s.sub}</p>
            {s.lead ? <p>{s.lead}</p> : null}
            {s.notes?.length ? (
              <ul className="wiki__list">
                {s.notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            ) : null}
          </>
        ),
      })),
    },

    resume: {
      title: 'Resume',
      lead: (
        <>
          <p>
            <a
              className="wiki__download"
              href={resume.pdf}
              target="_blank"
              rel="noreferrer"
            >
              Download resume (PDF) ↗
            </a>
          </p>
          <p>A plain-text version follows.</p>
        </>
      ),
      subsections: resume.sections.map((sec) => ({
        id: `resume-${slug(sec.label)}`,
        heading: sec.label,
        render: () => (
          <ul className="wiki__list">
            {sec.entries.map((e, i) => (
              <li key={i}>
                <span className="wiki__spec-lead">{e.title}</span>
                {e.sub ? <> — <span className="wiki__spec-sub">{e.sub}</span></> : null}
              </li>
            ))}
          </ul>
        ),
      })),
    },

    contact: {
      title: 'Contact',
      lead: <p>Reach {contact.name} directly:</p>,
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
    text: `${p.name} ${p.category} ${p.summary} ${p.specs.map((s) => `${s.lead} ${s.sub ?? ''}`).join(' ')}`,
  })),
  {
    section: 'research', anchor: research.sheets[0].id, label: 'Research',
    text: `${research.title} ${research.lead} ${research.program} ${research.org}`,
  },
  ...research.sheets.map((s) => ({
    section: 'research', anchor: s.id, label: s.title,
    text: `${s.title} ${s.sub} ${s.lead ?? ''} ${(s.notes ?? []).join(' ')}`,
  })),
  ...resume.sections.map((sec) => ({
    section: 'resume', anchor: `resume-${slug(sec.label)}`, label: `Resume — ${sec.label}`,
    text: sec.entries.map((e) => `${e.title} ${e.sub}`).join(' '),
  })),
  {
    section: 'contact', anchor: 'contact-links', label: 'Contact',
    text: contact.links.map((l) => `${l.kind} ${l.label}`).join(' '),
  },
].map((e, i) => ({ ...e, key: i, haystack: `${e.label} ${e.text}`.toLowerCase() }))

function scrollToAnchor(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
      <div className="wiki__lead">{article.lead}</div>
      {article.subsections.map((s) => (
        <section key={s.id} id={s.id} className="wiki__section">
          <h2 className="wiki__h2">{s.heading}</h2>
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
      className={`wiki${navOpen ? '' : ' wiki--nav-closed'}${searchOpen ? ' wiki--search-open' : ''}`}
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
    </div>
  )
}
