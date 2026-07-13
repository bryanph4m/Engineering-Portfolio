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
 * Provenance: everything factual below is sourced from the resume PDF at
 * /public/assets/Bryan-Pham-Resume.pdf and the public GitHub account
 * (github.com/bryanph4m). If a claim isn't backed by one of those two, it
 * doesn't belong in this file.
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
  disciplines: ['mechanical engineering', 'rocketry', 'ai', 'embedded systems'],
  // each role is a lead phrase (with its connector) plus the emphasized org.
  // `circled: true` gets the hand-drawn ellipse on the desk's index card;
  // `section` cross-links the org in the simple mode's About article.
  roles: [
    { lead: 'Mechanical Engineering Student @ ', emphasis: 'UCLA', circled: true },
    { lead: 'Founding Engineer — ', emphasis: 'Aria AI' },
    { lead: 'Design & Manufacturing Engineering Intern — ', emphasis: 'Mission College' },
    { lead: 'Founder & President — ', emphasis: 'Mission Launch Rocketry', section: 'projects' },
  ],
  motto: 'design it on paper first & let the airframe speak for itself.',
  // current focus; `section` is where the simple mode's About article links each one
  now: [
    { label: 'active-control rocketry', section: 'research' },
    { label: 'voice AI hardware at Aria AI', section: 'resume' },
  ],
}

export const projects = [
  {
    id: 'asideai',
    name: 'Aside AI',
    category: 'Hardware · Software',
    summary: '1st place — Deepgram track · Berkeley AI Hackathon',
    // substring of `summary` the desk sheet circles in red; must appear verbatim
    highlight: '1st place',
    specs: [
      { lead: 'Clip-on camera + mic', sub: 'narrates surroundings live via AI personalities' },
      { lead: 'Raspberry Pi on QNX 8.0', sub: 'Python coordination · React Native app' },
      { lead: 'End-to-end narration in 1–2 s', sub: 'Deepgram speech + Redis' },
    ],
  },
  {
    id: 'mission-launch-rocketry',
    name: 'Mission Launch Rocketry',
    category: 'Rocketry',
    summary: 'founded & led a 52-member college rocketry club',
    specs: [
      { lead: 'Founder & President', sub: 'budget + design-build-launch, concept → flight' },
      { lead: 'Two-stage high-power rocket', sub: 'dual-deployment recovery — drogue + main' },
      { lead: 'EasyMini + EasyMega computers', sub: 'staged separation sequencing' },
      { lead: 'Onshape · 3D printing', sub: 'microcontrollers + microcomputers' },
    ],
  },
  {
    id: 'recco',
    name: 'Recco',
    category: 'Software',
    summary: 'YC AI Growth Hackathon · camera-first iOS networking assistant',
    specs: [
      { lead: 'Identifies people at events, live', sub: 'face tracking + cloud vision + identity lookup' },
      { lead: 'SwiftUI + AVFoundation pipeline', sub: 'Apple Vision tracking · target-lock reticle · AR overlay' },
      { lead: 'Voice or text commands', sub: 'resolves the person nearest screen center' },
    ],
  },
  {
    id: 'rollaway',
    name: 'RollAway',
    category: 'Software',
    summary: '1st place — Beginner track · MLH × DigitalOcean AI for Social Good',
    highlight: '1st place',
    specs: [
      { lead: 'Permit planning for SF food vendors', sub: 'ranks legal, low-competition spots per time window' },
      { lead: 'React + TypeScript', sub: 'DigitalOcean serverless backend · permit checklist' },
      { lead: 'Zustand-driven UI', sub: 'auto-filled forms from user-ingested data' },
    ],
  },
  {
    id: 'engineering-portfolio',
    name: 'Engineering Portfolio',
    category: 'Software',
    summary: 'this site — a 3D desk & a wiki view, one shared content source',
    specs: [
      { lead: 'React + Three.js desk scene', sub: 'every section is a physical document' },
      { lead: 'Wikipedia-style simple mode', sub: 'same content, a few KB of DOM' },
      { lead: 'Open source', sub: 'github.com/bryanph4m/Engineering-Portfolio' },
    ],
  },
]

export const research = {
  title: 'Active-Control Rocket',
  program: 'Mission College',
  org: 'Santa Clara, CA',
  // the article lead; the vehicle → flight pipeline in one line
  lead: 'SolidWorks airframe → SimScale CFD → an active tilt/roll control system for a high-powered model rocket.',
  // full-sentence attribution the simple mode appends to the lead
  credit: 'Built at Mission College as a Design & Manufacturing Engineering intern.',
  sheets: [
    {
      id: 'vehicle',
      title: 'Active-Control Rocket',
      sub: 'High-powered model rocket · tilt & roll control · SolidWorks',
      // rendered verbatim (hand-lettered) on the desk, so stored verbatim
      lead: 'objective: structural integrity with active tilt/roll control on board.',
      notes: [],
    },
    {
      id: 'cfd',
      title: 'CFD Validation',
      sub: 'SimScale · aerodynamic performance before fabrication',
      notes: [
        'Validates drag, pressure distribution, and stability',
        'Airframe design informed by 3000+ hours of CFD',
        'Simulated prior to fabrication',
      ],
    },
    {
      id: 'control',
      title: 'Tilt/Roll Control System',
      sub: 'Micro-servos · IMU + altimeter avionics',
      notes: [
        'Micro-servos actuate the tilt/roll control system',
        'IMU and altimeter feed live data from the avionics bay',
        'Components integrated in the vehicle without compromising structure',
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
        {
          title: 'UCLA — B.S. Mechanical Engineering',
          sub: 'transfer GPA 4.0 · June 2026 – May 2028 · Los Angeles, CA',
        },
        {
          title: 'Relevant coursework',
          sub: 'circuit analysis, engineering graphics & design, statics, dynamics, MATLAB, materials',
        },
      ],
    },
    {
      label: 'Experience',
      entries: [
        {
          title: 'Mission College — Design & Manufacturing Engineering Intern',
          sub: 'June 2026 – present · high-powered rocket airframe · SolidWorks · SimScale CFD',
        },
        {
          title: 'Aria AI — Founding Engineer',
          sub: 'June 2026 – present · Deepgram (YC W16) Startup Program · voice AI hardware',
        },
        {
          title: 'Mission College — Associated Student Government Senator',
          sub: 'Aug 2025 – May 2026 · student advocacy with campus leadership',
        },
      ],
    },
    {
      label: 'Projects',
      entries: [
        {
          title: 'Aside AI · Recco · RollAway · Mission Launch Rocketry',
          sub: 'two hackathon wins · a 52-member rocketry club',
        },
      ],
    },
    {
      label: 'Skills',
      entries: [
        {
          title: 'Languages',
          sub: 'C, C++, Python, TypeScript, JavaScript, MATLAB, Swift, HTML/CSS',
        },
        {
          title: 'CAD',
          sub: 'SolidWorks, Onshape, AutoCAD, Fusion360',
        },
        {
          title: 'Manufacturing & lab tools',
          sub: '3D printing, soldering, microcontrollers, SimScale, microcomputers, computer vision, PSpice, LTSpice, oscilloscope, function generator',
        },
      ],
    },
  ],
}

export const contact = {
  name: 'Bryan Pham',
  links: [
    { kind: 'Email', label: 'bryanpham2024@gmail.com', href: 'mailto:bryanpham2024@gmail.com' },
    { kind: 'LinkedIn', label: 'linkedin.com/in/bryan-pham2028', href: 'https://www.linkedin.com/in/bryan-pham2028' },
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
