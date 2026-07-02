export default function Resume() {
  return (
    <article>
      <p className="doc-kicker">formal document</p>
      <h1 className="doc-h1">Resume</h1>
      <p className="doc-meta">Bryan Pham · mechanical engineering</p>
      <hr className="doc-rule" />

      <div className="doc-body">
        <p>
          The one-page version — education, the engineering roles, and the flight
          hardware. Pull the full copy below.
        </p>
        <ul className="doc-list">
          <li><strong>UCLA</strong> — B.S. Mechanical Engineering (in progress)</li>
          <li><strong>Aria AI</strong> — Founding Engineer</li>
          <li><strong>Mission Launch Rocketry</strong> — Founder &amp; President</li>
        </ul>
      </div>

      {/* Drop the real PDF at /public/assets/Bryan-Pham-Resume.pdf */}
      <a className="doc-btn" href="/assets/Bryan-Pham-Resume.pdf" download target="_blank" rel="noreferrer">
        ⭳ Download PDF
      </a>
      <p className="doc-meta" style={{ marginTop: 14 }}>
        (opens the printable copy in a new tab)
      </p>
    </article>
  )
}
