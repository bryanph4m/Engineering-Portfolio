/**
 * The single source of truth for every word of portfolio *substance*.
 *
 * Two presentation layers read from here and neither owns the copy:
 *   - the desk scene (src/documents/content/*) paints these strings onto
 *     canvas paper textures, and
 *   - the simple/recruiter mode (src/simple/*) renders them as a
 *     Wikipedia-style article.
 * Edit a fact once here and both modes update — they never drift.
 *
 * Casing convention: text is stored in its natural, human-readable case
 * (correct acronyms and all). The desk's drafting sheets happen to render a
 * lot of it in ALL CAPS, so those painters uppercase on the way out — an
 * exact, lossless transform. Anything the desk renders verbatim (subtitles,
 * hand-written notes, resume entries, contact links) is stored here exactly
 * as it should appear so both layers stay identical.
 */

export const profile = {
  name: 'Bryan Pham',
  location: 'Los Angeles, CA',
  // the one-line billing used on the cover sheet and as the article subtitle
  disciplines: ['mechanical engineering', 'rocketry', 'ai'],
  // each role is a lead phrase (with its connector) plus the emphasized org
  roles: [
    { lead: 'Mechanical Engineering Student @ ', emphasis: 'UCLA' },
    { lead: 'Founding Engineer — ', emphasis: 'Aria AI' },
    { lead: 'Co-founder & President — ', emphasis: 'Mission Launch Rocketry' },
  ],
  motto: 'design it on paper first — let the wind tunnel argue back.',
  now: ['canard rockets', 'drones', 'AI tooling'],
}

export const projects = [
  {
    id: 'autonomous-drone',
    name: 'Autonomous Drone',
    category: 'Airframe',
    summary: '7" quad · onboard CV · research platform',
    specs: [
      { lead: 'Flight ctrl — STM32H7 · ArduPilot', sub: 'the hard real-time half' },
      { lead: 'Companion — Pi Zero 2 W', sub: 'computer vision + autonomy' },
      { lead: 'Frame — 7" class', sub: 'sized for payload and endurance' },
      { lead: 'Goal — onboard vision', sub: 'the autonomy research target' },
    ],
  },
  {
    id: 'asideai',
    name: 'AsideAI',
    category: 'Software',
    summary: 'CalHacks 2026 · 1st place — Deepgram track',
    specs: [
      { lead: 'Real-time speech via Deepgram', sub: 'transcription while you talk' },
      { lead: 'Low-latency, hands-free loop', sub: 'capture intent, turn it into action' },
      { lead: 'Built end-to-end in a weekend', sub: 'hackathon time pressure included' },
    ],
  },
  {
    id: 'asideai-v2',
    name: 'AsideAI v2',
    category: 'Software',
    summary: 'the production rebuild',
    specs: [
      { lead: 'Reworked streaming + state model', sub: 'reliability over demo luck' },
      { lead: 'Refined voice-first UX', sub: 'the interaction loop, sanded down' },
      { lead: 'Foundations for real users', sub: 'built to stay open all day' },
    ],
  },
  {
    id: 'recco',
    name: 'Recco',
    category: 'Software',
    summary: 'YC AI Growth Hackathon 2026',
    specs: [
      { lead: "Built at YC's AI Growth Hackathon" },
      { lead: 'Raw signal in, recommendations out' },
      { lead: 'Aimed at the product growth loop' },
    ],
  },
]

export const research = {
  title: 'Active-control rocket',
  program: 'Mission Launch Rocketry',
  org: 'UCLA',
  // the article lead; the vehicle → flight pipeline in one line
  lead: 'CAD → CFD → control law → flight for a canard-actuated, actively stabilized rocket.',
  sheets: [
    {
      id: 'vehicle',
      title: 'Active-Control Rocket',
      sub: 'Canard tilt & roll authority · CAD → CFD → control law → flight',
      // rendered verbatim (hand-lettered) on the desk, so stored verbatim
      lead: 'objective: hold attitude through boost, then a controlled coast.',
      notes: [],
    },
    {
      id: 'cfd',
      title: 'CFD & Canard Sweeps',
      sub: 'SimScale · deflection sweeps · control derivatives',
      notes: [
        'Sweeps extract control effectiveness per degree',
        'Force / moment coefficients vs. angle of attack',
        'Feeds the stability derivatives the controller uses',
      ],
    },
    {
      id: 'control',
      title: 'LQR / PID Control Loop',
      sub: 'Linearized dynamics → a loop you can trust on the pad',
      notes: [
        'State-space model from the CFD-derived derivatives',
        'LQR for multi-axis regulation, PID as the robust baseline',
        'Simulation-in-the-loop before anything flies',
      ],
    },
  ],
}

export const resume = {
  name: 'Bryan Pham',
  subtitle: 'RESUME — MECHANICAL ENGINEERING',
  pdf: '/assets/Bryan-Pham-Resume.pdf',
  sections: [
    {
      label: 'Education',
      entries: [
        { title: 'UCLA — B.S. Mechanical Engineering', sub: 'design · embedded systems · in progress' },
      ],
    },
    {
      label: 'Experience',
      entries: [
        { title: 'Aria AI — Founding Engineer', sub: 'part of the Deepgram (YC W16) startup program' },
        { title: 'Mission College — Engineering Research Intern', sub: 'tilt/roll-control rocket program: CAD → CFD → flight' },
      ],
    },
    {
      label: 'Projects',
      entries: [
        { title: 'AsideAI · Recco', sub: 'CalHacks 1st place · YC hackathon' },
      ],
    },
  ],
}

export const contact = {
  name: 'Bryan Pham',
  links: [
    { kind: 'Email', label: 'bryanpham2024@gmail.com', href: 'mailto:bryanpham2024@gmail.com' },
    { kind: 'LinkedIn', label: 'linkedin.com/in/bryanph4m', href: 'https://www.linkedin.com/in/bryanph4m' },
    { kind: 'GitHub', label: 'github.com/bryanph4m', href: 'https://github.com/bryanph4m' },
  ],
}

// Nav order shared by the simple mode's sidebar. The desk registry keeps its
// own titles (e.g. it labels research "Rocketry") since those are 3D-scene
// presentation, not content.
export const sections = [
  { id: 'about', title: 'About' },
  { id: 'projects', title: 'Projects' },
  { id: 'research', title: 'Research' },
  { id: 'resume', title: 'Resume' },
  { id: 'contact', title: 'Contact' },
]

/** disciplines with display casing for prose ("ai" → "AI"). */
export const disciplineLabels = profile.disciplines.map((d) => (d === 'ai' ? 'AI' : d))
