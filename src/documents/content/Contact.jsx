export default function Contact() {
  return (
    <article>
      <p className="doc-kicker">correspondence</p>
      <h1 className="doc-h1">Contact</h1>
      <p className="doc-meta">drop a line — I read everything</p>
      <hr className="doc-rule" />

      <div className="doc-body">
        <ul className="doc-list">
          <li>
            <strong>Email</strong> —{' '}
            <a className="doc-link" href="mailto:bryanpham2024@gmail.com">
              bryanpham2024@gmail.com
            </a>
          </li>
          <li>
            <strong>GitHub</strong> —{' '}
            <a className="doc-link" href="https://github.com/bryanph4m" target="_blank" rel="noreferrer">
              github.com/bryanph4m
            </a>
          </li>
          <li>
            <strong>LinkedIn</strong> —{' '}
            <a className="doc-link" href="https://www.linkedin.com/in/bryanph4m" target="_blank" rel="noreferrer">
              linkedin.com/in/bryanph4m
            </a>
          </li>
        </ul>
      </div>

      <hr className="doc-rule" />
      <p className="doc-hand" style={{ fontSize: 17, color: '#7a5a2f' }}>
        — Bryan
      </p>
    </article>
  )
}
