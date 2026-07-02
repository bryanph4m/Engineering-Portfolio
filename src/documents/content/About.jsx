export default function About() {
  return (
    <article>
      <p className="doc-kicker">index card — no. 01</p>
      <h1 className="doc-h1">About</h1>
      <p className="doc-meta">Bryan Pham · Los Angeles, CA</p>
      <hr className="doc-rule" />

      <div className="doc-body">
        <p>
          Mechanical engineering student at <strong>UCLA</strong>, happiest where hardware,
          controls, and a little bit of software meet — flight vehicles, embedded systems,
          and the messy real-world tuning that makes them actually fly.
        </p>
        <p>
          Founding engineer at <strong>Aria AI</strong>, building from the ground up.
          Founder &amp; president of <strong>Mission Launch Rocketry</strong>, where I lead
          an active-control rocketry program from CAD and CFD through flight test.
        </p>
        <p className="doc-hand" style={{ fontSize: 17, color: '#7a5a2f' }}>
          "Design it on paper first, then let the wind tunnel argue back."
        </p>
      </div>

      <hr className="doc-rule" />
      <p className="doc-meta">
        currently &rarr; canard-controlled rockets, autonomous drones, and AI tooling
      </p>
    </article>
  )
}
