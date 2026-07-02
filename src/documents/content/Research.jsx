// Blueprint roll — three sheets on the active-control rocket program.

function Overview() {
  return (
    <article>
      <p className="doc-kicker">sheet A — overview</p>
      <h1 className="doc-h1">Active-Control Rocket</h1>
      <p className="doc-meta">tilt &amp; roll authority via canards · Mission Launch Rocketry</p>
      <hr className="doc-rule" />
      <div className="doc-body">
        <p>
          A sounding-rocket program built around active aerodynamic control:
          deflecting canards in flight to command <strong>tilt</strong> and{' '}
          <strong>roll</strong>, rather than flying purely ballistic.
        </p>
        <ul className="doc-list">
          <li>Canard-actuated pitch / yaw / roll authority</li>
          <li>Onboard state estimation feeding a real-time controller</li>
          <li>Design pipeline: CAD &rarr; CFD &rarr; control law &rarr; flight test</li>
        </ul>
        <p className="doc-hand" style={{ color: '#7a5a2f' }}>
          objective: hold attitude through the boost phase, then a controlled coast.
        </p>
      </div>
    </article>
  )
}

function CFD() {
  return (
    <article>
      <p className="doc-kicker">sheet B — aerodynamics</p>
      <h1 className="doc-h1">CFD &amp; Canard Sweeps</h1>
      <p className="doc-meta">SimScale · deflection sweeps · control derivatives</p>
      <hr className="doc-rule" />
      <div className="doc-body">
        <p>
          Aerodynamic characterization in <strong>SimScale</strong>: sweeping canard
          deflection angles across the flight envelope to map how much control
          moment each degree of deflection actually buys.
        </p>
        <ul className="doc-list">
          <li>Canard deflection sweeps to extract control effectiveness</li>
          <li>Force / moment coefficients vs. angle of attack</li>
          <li>Feeds the stability derivatives used by the controller</li>
        </ul>
      </div>
      <div>
        <span className="doc-tag">SimScale</span>
        <span className="doc-tag">CFD</span>
        <span className="doc-tag">stability derivatives</span>
      </div>
    </article>
  )
}

function Control() {
  return (
    <article>
      <p className="doc-kicker">sheet C — controls</p>
      <h1 className="doc-h1">LQR / PID Control</h1>
      <p className="doc-meta">from linearized dynamics to a flyable loop</p>
      <hr className="doc-rule" />
      <div className="doc-body">
        <p>
          The control work: linearizing the vehicle dynamics, then designing and
          comparing <strong>LQR</strong> and <strong>PID</strong> loops to hold
          attitude with the canards — trading optimality against something simple
          and robust enough to trust on the pad.
        </p>
        <ul className="doc-list">
          <li>State-space model from the CFD-derived derivatives</li>
          <li>LQR for multi-axis attitude regulation</li>
          <li>PID baselines for robustness and easy tuning</li>
          <li>Simulation-in-the-loop before flight</li>
        </ul>
      </div>
      <div>
        <span className="doc-tag">LQR</span>
        <span className="doc-tag">PID</span>
        <span className="doc-tag">state estimation</span>
      </div>
    </article>
  )
}

const PAGES = [Overview, CFD, Control]

export default function Research({ page = 0 }) {
  const Page = PAGES[Math.max(0, Math.min(page, PAGES.length - 1))]
  return <Page />
}
