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
 * /public/assets/Bryan-Pham-Resume.pdf, the public GitHub account
 * (github.com/bryanph4m), and vetted project write-ups provided by the
 * author. If a claim isn't backed by one of those, it doesn't belong here.
 *
 * Per-project prose lives in each entry's `detail` array — a list of
 * `{ heading, body: [paragraphs] }` sections. Both faces render it: the
 * desk flipbook flows it across as many flip-pages as it needs
 * (src/documents/content/projects.js), and the simple mode renders it as
 * article prose. `specs` stays the at-a-glance highlight list; `detail` is
 * the narrative. Keep the two complementary, not duplicative.
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
    // REVIEW: "Aria AI" (Founding Engineer) is not on Bryan-Pham-Resume.pdf and
    // has no backing repo under github.com/bryanph4m. Resume Experience lists only
    // the Mission College intern + senator roles. Confirm this role and add it to
    // the résumé, or remove it from the site. (flagged by /sync-content)
    { lead: 'Design & Manufacturing Engineering Intern, ', emphasis: 'Mission College' },
    { lead: 'Founder & President, ', emphasis: 'Mission Launch Rocketry', section: 'projects' },
  ],
  motto: 'design it on paper first & let the airframe speak for itself.',
  // current focus; `section` is where the simple mode's About article links each one
  now: [
    { label: 'tilt/roll-control rocketry', section: 'research' },
    // REVIEW: "Aria AI" unsupported by résumé/repos — see note on profile.roles above.
    { label: 'embedded systems', section: 'resume' },
  ],
  // Extended About prose for the simple/recruiter mode ONLY. The simple mode
  // renders this as the article body after the generated lead; the desk's index
  // card never reads it (there's no room on the card) and keeps to the fields
  // above as its single source. Structure: an array of paragraph strings, one
  // string per paragraph — matching the `detail`/`body` convention below. Leave
  // empty to render just the lead.
  // TODO: write the fuller About narrative here as an array of paragraph strings.
  extended: [
    'Thanks for taking the time to check out my portfolio! Feel free to check out the interactive render of the site afterward.',
    'I am currently attending the University of California, Los Angeles as a Mechanical Engineering major after graduating with a few AS degrees',
    'from Mission College. During my time at Mission College, I found an interest in amateur rocketry and embedded systems, which led me to found',
    'Mission Launch Rocketry, the only project-based engineering club on campus at the time, where I served as president. The following Summer,',
    'I was convinced to attend my first hackathon at UC Berkeley, where I realized I enjoyed both the hardware and software aspects of engineering.',
    'I am excited to see where the future takes me and how UCLA can help me grow as an engineer. I am currently looking for internship opportunities.',
  ],
}

export const projects = [
  {
    id: 'asideai',
    name: 'Aside AI',
    category: 'Hardware · Software',
    summary: '1st place, Deepgram track · Berkeley AI Hackathon',
    // substring of `summary` the desk sheet circles in red; must appear verbatim
    highlight: '1st place',
    specs: [
      { lead: 'Clip-on camera + mic', sub: 'narrates surroundings live via AI personalities' },
      { lead: 'Raspberry Pi on QNX 8.0', sub: 'Python coordination · React Native app' },
      { lead: 'End-to-end narration in 1–2 s', sub: 'Deepgram speech + Redis' },
    ],
    detail: [
      {
        heading: 'Overview',
        body: [
          'Aside AI is a real-time narration and companion system that runs across on-device capture and cloud AI. It has three parts: firmware on the device, a laptop backend, and a mobile app.',
        ],
      },
      {
        heading: 'On the device',
        body: [
          'The firmware runs on a Raspberry Pi under QNX, written in C++. It captures camera frames over QSF plus microphone audio, runs TensorFlow Lite on-device for fast event detection (entrance, wave, fall), and ships frames, audio, and event signals to the laptop over the LAN.',
        ],
      },
      {
        heading: 'The orchestrator',
        body: [
          'A Python backend on a laptop on the same LAN handles coordination. It sends each camera frame straight to Claude Haiku 4.5 vision, so one call both reads the scene and returns the in-character line.',
          'It pulls speech from Deepgram STT and the active personality from Redis, builds the prompt, and sends the reply to Deepgram TTS for voice. Redis holds memory and state, and Sentry watches the run. Keeping the orchestrator on the laptop keeps the cloud SDKs off QNX.',
        ],
      },
      {
        heading: 'The app',
        body: [
          'A React Native and Expo app switches personalities and modes and includes a custom personality builder. An audio manager ducks or cuts music under narration so the voice always has priority, and manual cue buttons fire an entrance theme or a laugh track.',
        ],
      },
    ],
  },
  {
    id: 'mission-launch-rocketry',
    name: 'Mission Launch Rocketry',
    category: 'Rocketry',
    summary: 'founded & led a 52-member college rocketry club',
    specs: [
      { lead: 'Founder & President', sub: 'budget + design-build-launch, concept → flight' },
      { lead: 'Two-stage high-power rocket', sub: 'dual-deployment recovery (drogue + main)' },
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
    detail: [
      {
        heading: 'Overview',
        body: [
          "Recco is built for the moment at a busy event when you're holding your phone and want to know who someone is and whether they're worth talking to. Everything happens in the AR camera lens rather than in a separate dashboard.",
        ],
      },
      {
        heading: 'The flow',
        body: [
          "You set a mission on first launch: “looking for investors,” “hiring a Swift engineer,” “trying to get hired.” A fullscreen camera opens with an AR intelligence layer: a target reticle, face brackets, and a minimal scan / mic / keyboard dock.",
          'Recco locks the person closest to center; you ask by voice or type, and the backend resolves their identity and hands back the answer over the same lens.',
        ],
      },
      {
        heading: 'Under the hood',
        body: [
          'Identity comes from reading the badge and context with OpenAI Vision, searching profile data with Fiber, and verifying faces through a computer-vision service. Every resolved scan becomes a memory node in “Brain”: name, role, company, LinkedIn, confidence, lead score, and follow-up state.',
          "Recco then drafts a cold email or DM tailored to the mission and the person, and Lazy GTM mode turns “find me 8 Swift engineers” into a prospect graph and an outreach queue.",
        ],
      },
      {
        heading: 'Stack',
        body: [
          'A SwiftUI iOS app carries the fullscreen camera, AR overlay, Brain graph, mission setup, Lazy GTM, and a Deepgram voice client. A Convex backend handles identity, voice tokens, memories, mission scoring, GTM runs, and outreach drafts over HTTP Actions, and a FastAPI + InsightFace service returns 512-dimension face embeddings. Secrets live in Convex environment variables, never in the app.',
        ],
      },
    ],
  },
  {
    id: 'rollaway',
    name: 'RollAway',
    category: 'Software',
    summary: '1st place, Beginner track · MLH × DigitalOcean AI for Social Good',
    highlight: '1st place',
    specs: [
      { lead: 'Permit planning for SF food vendors', sub: 'ranks legal, low-competition spots per time window' },
      { lead: 'React + TypeScript', sub: 'DigitalOcean serverless backend · permit checklist' },
      { lead: 'Zustand-driven UI', sub: 'auto-filled forms from user-ingested data' },
    ],
    detail: [
      {
        heading: 'Overview',
        body: [
          "RollAway is a map-first location-intelligence and permit-planning PWA for mobile food vendors in San Francisco. It ranks legal, low-competition places to set up for a chosen time window, explains the reasoning behind each pick, and collapses the city's four-agency permit maze into a single guided checklist.",
        ],
      },
      {
        heading: 'How it decides',
        body: [
          'Scoring, hard constraints like setbacks and closures, travel time, and legality are all computed deterministically in DigitalOcean Functions, never inside a language model. The LLMs only phrase explanations and read menus or forms, always grounded in the precomputed signals and cited sources.',
          'The map renders a wide candidate pool as pins but promotes only the top three to tray tiles. Each spot opens a detail sheet with a good / check / avoid verdict, a one-line why, a Navigate action, Street View, and the grounded facts behind the score: foot traffic, competition, closures, and legality.',
        ],
      },
      {
        heading: 'Permit Copilot',
        body: [
          'A Permit Copilot turns permitting into a cited, ordered checklist across all four SF agencies, complete with fillable agency PDFs. Vendors sign up and ingest their menu through Gradient-backed extraction from text, links, images, or PDFs.',
        ],
      },
      {
        heading: 'Stack',
        body: [
          'RollAway is an installable PWA with an offline shell and a schematic-map fallback: React 19 and TypeScript on Vite 8, Tailwind v4, Zustand for path-based routing with no router library, and Mapbox GL code-split off the landing page.',
          'Seven DigitalOcean Functions handle serverless data and deterministic scoring, and a dependency-free agents runtime on DigitalOcean Gradient powers the spot scout, permit copilot, menu RAG, and grounded form-fill. External data comes from SF open data, a Bay Wheels foot-traffic proxy, Google Places and Street View, Ticketmaster events, and Mapbox tiles and travel times.',
        ],
      },
    ],
  },
  {
    id: 'engineering-portfolio',
    name: 'Engineering Portfolio',
    category: 'Software',
    summary: 'this site, a 3D desk & a wiki view from one shared content source',
    // Auto-managed by /sync-content — refreshed from the GitHub API. Do not
    // hand-edit; manual editorial fields live outside this sub-object.
    github: {
      repo: 'Engineering-Portfolio',
      url: 'https://github.com/bryanph4m/Engineering-Portfolio',
      language: 'JavaScript',
      stars: 0,
      description: null,
      createdAt: '2026-07-02T03:25:29Z',
      pushedAt: '2026-07-13T22:00:02Z',
    },
    specs: [
      { lead: 'React + Three.js desk scene', sub: 'every section is a physical document' },
      { lead: 'Wikipedia-style simple mode', sub: 'same content, a few KB of DOM' },
      { lead: 'Open source', sub: 'github.com/bryanph4m/Engineering-Portfolio' },
    ],
    detail: [
      {
        heading: 'Overview',
        body: [
          "This site is a personal portfolio rendered as an old mechanical engineer's drafting desk, viewed from a fixed isometric-ish angle. Each page of the site is a physical document you pick up, read, flip through, and set back down.",
        ],
      },
      {
        heading: 'How it works',
        body: [
          'It is one Canvas with no routing; the whole scene lives in a single component, with focus held in Zustand state so Three.js never remounts. Idle is a fixed wide view with a few degrees of pointer parallax; hover lifts a document, a click floats it to a readable pose while the desk dims behind a vignette, and click-away or Esc sets it down.',
          'Multi-page stacks rotate a physical sheet about its left edge on each turn, with an in-world handwritten tally, flippable by on-screen arrows, arrow keys, or a swipe. Document text is real DOM locked over the sheet, so it stays crisp at any zoom and is lazy-loaded on open.',
        ],
      },
      {
        heading: 'Stack',
        body: [
          'Built with React and React Three Fiber, drei, @react-spring/three, Zustand, and Vite, with Tailwind dressing only the flat UI.',
        ],
      },
    ],
  },
]

/**
 * The desk's framed photo, as a small album. The frame is interactive — pick
 * it up like a document and click / arrow through the photos. Drive it entirely
 * from this list: the first entry is the one shown resting in the frame on the
 * desk. Each entry is `{ src, caption? }`; `src` is a path under /public (so
 * it resolves from the site root). See the README's "Photo frame album"
 * section for how to add your own. If the list is empty, the frame falls back
 * to a painted placeholder.
 */
export const gallery = {
  photos: [
    { src: '/assets/gallery/photo-1.jpg', caption: 'Bryan Pham' },
    // Add more photos by dropping files in /public/assets/gallery and listing
    // them here, e.g.:
    // { src: '/assets/gallery/photo-2.jpg', caption: 'Mission Launch Rocketry, launch day' },
  ],
}

export const research = {
  title: 'Tilt/Roll-Control Rocket',
  program: 'Mission College',
  org: 'Santa Clara, CA',
  // the article lead; the vehicle → flight pipeline in one line
  lead: 'SolidWorks airframe → SimScale CFD → an active tilt/roll control system for a high-powered model rocket.',
  // full-sentence attribution the simple mode appends to the lead
  credit: 'Built at Mission College as a Design & Manufacturing Engineering intern.',
  // Extended Research prose for the simple/recruiter mode ONLY. The simple mode
  // renders this as the article body after the lead; the desk blueprint never
  // reads it and keeps to `lead`/`credit` plus the per-sheet notes below.
  // Structure: an array of paragraph strings, one string per paragraph. Leave
  // empty to render just the lead.
  // TODO: write the fuller Research narrative here as an array of paragraph strings.
  extended: [],
  sheets: [
    {
      id: 'vehicle',
      title: 'Tilt/Roll-Control Rocket',
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
  subtitle: 'RESUME · MECHANICAL ENGINEERING',
  pdf: '/assets/Bryan-Pham-Resume.pdf',
  sections: [
    {
      label: 'Education',
      entries: [
        {
          title: 'UCLA, B.S. Mechanical Engineering',
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
          title: 'Mission College, Design & Manufacturing Engineering Intern',
          sub: 'June 2026 – present · high-powered rocket airframe · SolidWorks · SimScale CFD',
        },

        {
          title: 'Mission College, Associated Student Government Senator',
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
