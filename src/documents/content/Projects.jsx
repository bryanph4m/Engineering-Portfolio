// A clipped stack of technical drawings — one project per sheet.
// `page` selects which drawing is on top.

function Drone() {
  return (
    <article>
      <p className="doc-kicker">drawing 01 — airframe</p>
      <h1 className="doc-h1">Autonomous Drone</h1>
      <p className="doc-meta">7&quot; quad · companion-computer autonomy · CV research target</p>
      <hr className="doc-rule" />
      <div className="doc-body">
        <p>
          A 7-inch quadcopter built as a research platform for onboard computer
          vision and autonomous flight — everything sized to fly the perception
          stack, not just to hover.
        </p>
        <ul className="doc-list">
          <li><strong>Flight controller:</strong> STM32H7 running ArduPilot</li>
          <li><strong>Companion computer:</strong> Raspberry Pi Zero 2 W for CV + autonomy</li>
          <li><strong>Frame:</strong> 7&quot; class, tuned for payload and endurance</li>
          <li><strong>Goal:</strong> onboard vision as the autonomy research target</li>
        </ul>
      </div>
      <div>
        <span className="doc-tag">STM32H7</span>
        <span className="doc-tag">ArduPilot</span>
        <span className="doc-tag">Pi Zero 2 W</span>
        <span className="doc-tag">computer vision</span>
      </div>
    </article>
  )
}

function AsideAI() {
  return (
    <article>
      <p className="doc-kicker">drawing 02 — software</p>
      <h1 className="doc-h1">AsideAI</h1>
      <p className="doc-meta">
        CalHacks 2026 · 1st place <span className="doc-note">Deepgram track</span>
      </p>
      <hr className="doc-rule" />
      <div className="doc-body">
        <p>
          A voice-first AI assistant that lives alongside your work — capturing
          intent as you speak and turning it into action. Took first place on the
          Deepgram track at CalHacks 2026.
        </p>
        <ul className="doc-list">
          <li>Real-time speech via Deepgram</li>
          <li>Low-latency, hands-free interaction model</li>
          <li>Built end-to-end under hackathon time pressure</li>
        </ul>
      </div>
      <div>
        <span className="doc-tag">Deepgram</span>
        <span className="doc-tag">real-time voice</span>
        <span className="doc-tag">1st place</span>
      </div>
    </article>
  )
}

function AsideAIv2() {
  return (
    <article>
      <p className="doc-kicker">drawing 03 — software</p>
      <h1 className="doc-h1">AsideAI v2</h1>
      <p className="doc-meta">the rebuild — production-minded</p>
      <hr className="doc-rule" />
      <div className="doc-body">
        <p>
          The second iteration of AsideAI: the hackathon prototype rebuilt with a
          cleaner architecture, sturdier real-time pipeline, and an eye toward
          something people actually keep open all day.
        </p>
        <ul className="doc-list">
          <li>Reworked streaming + state model for reliability</li>
          <li>Refined UX around the voice-first interaction loop</li>
          <li>Foundations laid for real users, not just a demo</li>
        </ul>
      </div>
      <div>
        <span className="doc-tag">v2 architecture</span>
        <span className="doc-tag">streaming</span>
      </div>
    </article>
  )
}

function Recco() {
  return (
    <article>
      <p className="doc-kicker">drawing 04 — software</p>
      <h1 className="doc-h1">Recco</h1>
      <p className="doc-meta">YC AI Growth Hackathon 2026</p>
      <hr className="doc-rule" />
      <div className="doc-body">
        <p>
          An AI growth tool built at the Y Combinator AI Growth Hackathon 2026 —
          focused on turning raw signal into recommendations that actually move a
          product's growth loop.
        </p>
        <ul className="doc-list">
          <li>Built at YC's AI Growth Hackathon</li>
          <li>Growth-focused recommendation engine</li>
        </ul>
      </div>
      <div>
        <span className="doc-tag">YC hackathon</span>
        <span className="doc-tag">growth</span>
      </div>
    </article>
  )
}

const PAGES = [Drone, AsideAI, AsideAIv2, Recco]

export default function Projects({ page = 0 }) {
  const Page = PAGES[Math.max(0, Math.min(page, PAGES.length - 1))]
  return <Page />
}
