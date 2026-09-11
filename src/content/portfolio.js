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
 * `{ heading, body: [paragraphs], photos: [] }` sections. Both faces render it:
 * the desk flipbook flows it across as many flip-pages as it needs
 * (src/documents/content/projects.js), and the simple mode renders it as
 * article prose. `specs` stays the at-a-glance highlight list; `detail` is
 * the narrative. Keep the two complementary, not duplicative.
 *
 * Since 2026-09-03 every project's `detail` is the same three sections in the
 * same order — Objective, Approach, Result — plus two small secondary fields,
 * `tools` and `status`, that both faces render as metadata rather than prose.
 * The full convention is documented on `projects` below; it is the standard for
 * new entries, not just a description of the current ones.
 *
 * Casing convention: text is stored in its natural, human-readable case
 * (correct acronyms and all). The desk's drafting sheets happen to render a
 * lot of it in ALL CAPS, so those painters uppercase on the way out — an
 * exact, lossless transform. Anything the desk renders verbatim (subtitles,
 * hand-written notes, resume entries, contact links) is stored here exactly
 * as it should appear so both layers stay identical.
 *
 * Photos: several sections carry a `photos: []` array. Each entry is one photo,
 * shared by both faces but presented differently and NEVER duplicated:
 *
 *   {
 *     src:     '/assets/photos/name.jpg', // path under /public ('' → placeholder)
 *     title:   'Short figure title',       // simple mode: bold caption lead-in
 *     caption: 'One or two sentences.',    // simple mode: figure description
 *     date:    'June 2026',                // simple mode: optional, muted meta
 *     credit:  'Photo by …',               // simple mode: optional attribution
 *     alt:     'Plain description …',       // simple mode: <img> alt text (a11y)
 *     link:    'https://github.com/…',      // both modes: where the photo clicks through to
 *   }
 *
 *   - Simple / Wikipedia mode renders every field as a floated figure with a
 *     bordered frame, a title, a muted caption and a muted date · credit line.
 *   - Desk mode pulls ONLY `src` and `link`, and pins the bare photo to the page
 *     as a polaroid (white frame, a little tilt, a drop shadow) — no title,
 *     caption or other text is ever shown on or near it there.
 *
 * `link` is the one field both faces read the same way: the photo becomes a
 * click-through to that URL — an anchor around the simple mode's <img>, and a
 * link hotspot on the desk sheet under the polaroid's footprint (lib/photos.js),
 * which opens while the document is held open, just like the desk's other
 * painted links. It is manual editorial data like the rest of the entry, so it
 * points at wherever the work actually lives — often someone else's repo, since
 * team projects are hosted under a teammate's account, and not always GitHub.
 * A photo with no `link` simply isn't clickable in either mode; leave it off
 * rather than guess a URL.
 *
 * Which lists reach the desk:
 *   - `projects[].photos`, `projects[].detail[].photos` and
 *     `research.sheets[].photos` → polaroids that ride the same pagination as
 *     the text (each photo reserves space and flows onto the next page if the
 *     current one is full). A section's own photos land with that section, so
 *     an Approach image follows the Approach prose onto whichever flip-page it
 *     ended up on.
 *   - `profile.photos` → the FIRST entry is a polaroid on the index card,
 *     pinned to a reserved column the card's copy is measured around
 *     (src/documents/content/about.js). Any further entries are simple-mode
 *     figures only — the card has room for one.
 *   - `research.photos` → simple-mode figures only (like the `extended` prose;
 *     the blueprint's intro has no room for one). Per-sheet photos go on
 *     `research.sheets[].photos` instead.
 *
 * Drop image files in /public/assets/photos/ (see that folder's README and the
 * repo README's "Photos" section). Until a listed file exists, both modes show
 * a clear placeholder in its place, so a not-yet-added image never breaks
 * either view. Leave a section's `photos` empty ([]) for none.
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
    // REVIEW: RESOLVED — the "Aria AI" role a previous /sync-content flagged here
    // is no longer in this array, and every role below is résumé-backed. This
    // comment can be deleted. (re-checked by /sync-content)
    { lead: 'Design & Manufacturing Engineering Intern, ', emphasis: 'Mission College' },
    // REVIEW: set to "Co-founder" to match the résumé's role title (re-read
    // 2026-09-02), which is authoritative. Note the résumé disagrees with itself:
    // the title line reads "Co-founder & President of Mission Launch Rocketry"
    // while its own bullet underneath reads "Founded and served as President". If
    // "Founder" is the right word, fix the résumé and this line together — the
    // matching wording in projects[mission-launch-rocketry] was changed with it.
    // (flagged by /sync-content)
    { lead: 'Co-founder & President, ', emphasis: 'Mission Launch Rocketry', section: 'projects' },
  ],
  motto: 'design it on paper first & let the airframe speak for itself.',
  // current focus; `section` is where the simple mode's About article links each one
  now: [
    { label: 'tilt/roll-control rocketry', section: 'research' },
    // REVIEW: RESOLVED — the "Aria AI" entry this flagged is gone; both labels
    // below are résumé-backed. This comment can be deleted. (re-checked by
    // /sync-content)
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
    'I am currently attending the University of California, Los Angeles as a Mechanical Engineering major after graduating with a few AS degrees from Mission College.',
    'During my time at Mission College, I found an interest in amateur rocketry and embedded systems, which led me to found Mission Launch Rocketry, the only project-based engineering club on campus at the time, where I served as president.',
    'The following summer, I was convinced to attend my first hackathon at UC Berkeley, where I realized I enjoyed both the hardware and software aspects of engineering.',
    'I am excited to see where the future takes me and how UCLA can help me grow as an engineer. I am currently looking for internship opportunities.',
  ],
  // Figures for the About section, in the shape documented at the top of this
  // file. Unlike `research.photos` (still simple-mode-only), these DO reach the
  // desk: the simple mode renders each as a Wikipedia figure beside the About
  // article, and the desk's index card pins the first one as a bare polaroid in
  // the reserved photo column (src/documents/content/about.js).
  photos: [
    {
      // TODO: the photo is clearly a park or campus memorial with a pagoda-topped
      // stone tower and Chinese characters laid out in white on the lawn, but I
      // can't tell where or when from the image alone. Name the place in the
      // caption if you want it called out, and confirm the date below.
      src: '/assets/photos/bryan-portrait.jpg',
      title: 'Away from the desk',
      caption: 'Standing on the walkway up to a pagoda-topped stone memorial, with the inscription set in white across the lawn on either side.',
      date: '2026',
      credit: '',
      alt: 'Bryan Pham standing on a stone walkway in a park, wearing a navy zip-up jacket and black pants, in front of a tall stone memorial with a green pagoda roof, with lawns, trees, and large white Chinese characters laid out on the grass behind him.',
    },
  ],
}

/**
 * Every project follows the same five-field shape. This is the standard for new
 * entries too — a project that doesn't fill all five isn't finished.
 *
 *   detail: three sections, in this order and with these exact headings —
 *     Objective  what it set out to do, and why. The problem or the goal.
 *     Approach   how it was built: architecture, technique, the decisions.
 *     Result     what it actually reached: awards, demo state, metrics, and
 *                honestly, where it stopped.
 *   tools:  short list of languages / frameworks / services / hardware. Both
 *           faces render it as small secondary metadata, never as prose.
 *   status: one short label — 'Actively developed', 'Completed',
 *           'In development (bench prototype)', 'On hold'. `'TODO'` where the
 *           real status genuinely isn't knowable from the résumé or the repo;
 *           a guess is worse than a marker.
 *
 * Each `detail` section also takes its own `photos: []`, in exactly the shape
 * documented at the top of this file. Approach and Result carry empty ones
 * ready to fill: drop a photo in there and it lands with that section in both
 * faces — a floated figure in the simple mode, a polaroid pinned to whichever
 * flip-page the section flowed onto in the desk. The project-level `photos`
 * below stays what it was: the entry's lead image.
 */
export const projects = [
  {
    id: 'asideai',
    name: 'Aside AI',
    category: 'Hardware · Software',
    summary: '1st place, Deepgram track · Berkeley AI Hackathon',
    // substring of `summary` the desk sheet circles in red; must appear verbatim
    highlight: '1st place',
    // Auto-managed by /sync-content — refreshed from the GitHub API. Do not
    // hand-edit; manual editorial fields live outside this sub-object.
    // NOTE: bryanph4m/AsideAI is a FORK of the team repo (Da0t/AsideAI, the URL
    // the photo below links). `createdAt` is therefore the fork date, not the
    // project's — do not surface these dates as project dates.
    github: {
      repo: 'AsideAI',
      url: 'https://github.com/bryanph4m/AsideAI',
      language: null,
      stars: 0,
      description: null,
      createdAt: '2026-07-30T20:16:35Z',
      pushedAt: '2026-06-24T21:14:55Z',
    },
    specs: [
      { lead: 'Clip-on camera + mic', sub: 'narrates surroundings live via AI personalities' },
      { lead: 'Raspberry Pi on QNX 8.0', sub: 'Python coordination · React Native app' },
      // matched to the résumé's figure (1.8–2.2 s on 24 KB frames every 0.5 s);
      // this read "1–2 s" before, which the résumé does not support
      { lead: 'End-to-end narration in 1.8–2.2 s', sub: 'Deepgram speech + Redis' },
    ],
    tools: [
      'C++', 'QNX 8.0', 'Raspberry Pi', 'TensorFlow Lite', 'Python',
      'Claude Haiku 4.5', 'Deepgram STT/TTS', 'Redis', 'Sentry',
      'React Native', 'Expo',
    ],
    status: 'Completed (hackathon build)',
    detail: [
      {
        heading: 'Objective',
        body: [
          'Aside AI is a real-time narration and companion system that runs across on-device capture and cloud AI: a clip-on camera and microphone that narrates your surroundings live in the voice of whichever AI personality you have picked.',
          'It has three parts — firmware on the device, a laptop backend, and a mobile app — and the number the whole thing is built around is end-to-end latency, because a narrator that describes what happened five seconds ago has stopped being a narrator.',
        ],
      },
      {
        heading: 'Approach',
        body: [
          'The firmware runs on a Raspberry Pi under QNX, written in C++. It captures camera frames over QSF plus microphone audio, runs TensorFlow Lite on-device for fast event detection (entrance, wave, fall), and ships frames, audio, and event signals to the laptop over the LAN.',
          'A Python backend on a laptop on the same LAN handles coordination. It sends each camera frame straight to Claude Haiku 4.5 vision, so one call both reads the scene and returns the in-character line.',
          'It pulls speech from Deepgram STT and the active personality from Redis, builds the prompt, and sends the reply to Deepgram TTS for voice. Redis holds memory and state, and Sentry watches the run. Keeping the orchestrator on the laptop keeps the cloud SDKs off QNX.',
          'A React Native and Expo app switches personalities and modes and includes a custom personality builder. An audio manager ducks or cuts music under narration so the voice always has priority, and manual cue buttons fire an entrance theme or a laugh track.',
        ],
        photos: [],
      },
      {
        heading: 'Result',
        body: [
          'Aside AI took 1st place in the Deepgram track at the Berkeley AI Hackathon.',
          'Narration lands 1.8–2.2 s after the frame it is describing, on 24 KB frames sampled every 0.5 s — fast enough that the line still fits the moment it is about.',
        ],
        photos: [],
      },
    ],
    photos: [
      {
        // TODO: the filename says device, but neither frame actually shows the
        // clip-on hardware. If the person on the left is wearing it, say so and
        // the caption can point at it.
        src: '/assets/photos/aside-ai-device.jpg',
        title: 'AI vision mode, mid-run',
        caption: 'Two frames from the Berkeley AI Hackathon: the app on the right in AI vision mode, walking through what it sees, what it hears, what it makes of that, and the hype-man line it ends up speaking, next to the demo running in the student union on the left.',
        date: 'June 2026',
        credit: '',
        alt: 'Two frames side by side. On the left, two students standing and talking in a university student union lobby. On the right, the Aside AI app in AI vision mode, showing a live camera feed above a thought process list with sees, hears, thinks, and speaks entries.',
        link: 'https://github.com/Da0t/AsideAI.git',
      },
    ],
  },
  {
    // REVIEW: drafted from the résumé (re-read 2026-09-02) plus the repo README
    // at github.com/bryanph4m/Atrium. Every figure below traces to one of those
    // two: the award line and the "my part" paragraph are the résumé's, the
    // pipeline names, node labels and the grouping story are the README's.
    // Check the copy reads right before treating it as final. (drafted by
    // /sync-content)
    id: 'atrium',
    name: 'Atrium',
    category: 'Software',
    summary: '1st place overall · Devnovate Memory Meets Motion hackathon',
    // substring of `summary` the desk sheet circles in red; must appear verbatim
    highlight: '1st place overall',
    // Auto-managed by /sync-content — refreshed from the GitHub API. Do not
    // hand-edit; manual editorial fields live outside this sub-object.
    // NOTE: bryanph4m/Atrium is a FORK of the team repo (nathansso/Atrium).
    // `createdAt` is the fork date, not the project's — the hackathon was
    // August 3 2026, which `pushedAt` reflects and `createdAt` does not.
    github: {
      repo: 'Atrium',
      url: 'https://github.com/bryanph4m/Atrium',
      language: null,
      stars: 0,
      description:
        '1st Place Overall, Memory Meets Motion. Learn anything with a single search — researches the web, builds a cited curriculum, and rewrites it around the misconception a simulated classroom actually produced.',
      createdAt: '2026-08-21T23:21:49Z',
      pushedAt: '2026-08-06T07:36:02Z',
    },
    specs: [
      { lead: 'Reads lesson material and student work', sub: 'groups students by shared misunderstanding, not by score' },
      { lead: 'Four RocketRide pipelines', sub: 'concept extraction · variant generation · misconception explanation · lesson-plan synthesis' },
      { lead: '11 schema-validated events', sub: 'one contract every layer speaks, over an 8-node FalkorDB graph' },
      { lead: 'Firecrawl research, cited per claim', sub: 'no draft reaches a student without an educator approving it' },
    ],
    tools: ['RocketRide', 'FalkorDB', 'Cypher', 'Firecrawl'],
    status: 'Completed (hackathon build)',
    detail: [
      {
        heading: 'Objective',
        body: [
          'Atrium turns one search into a taught lesson. It researches a topic on the web, binds every claim to a citation, and chunks the material into sequenced lessons — then runs those lessons against a simulated class to find out who each one fails and why, and rewrites the next day around the answer.',
          'The premise is that a score is not a diagnosis. Two students who both get 40% on integer operations can be failing for opposite reasons — one drops the sign on negatives, the other applies the operations out of order — and a gradebook puts them in the same remediation bucket. Atrium makes the misconception its own node in a graph, so a room is whoever shares that node.',
        ],
      },
      {
        heading: 'Approach',
        body: [
          'I built the four-stage RocketRide pipeline: extracting concepts from an uploaded assignment, generating room-level assignment variants that preserve the objective and the rigour, diagnosing what a wrong answer actually shows, and synthesising the next day’s lesson plan. The stages are coordinated by 11 schema-validated events over an 8-node FalkorDB graph, and each stage is fed by the decision before it rather than restarting from the event topic.',
          'Grouping students is a two-hop traversal — student to misconception to concept — and the room is formed by the middle node, not the endpoint. A flat table cannot express that, and a vector search actively hides it, because in embedding space two students who failed the same concept for opposite reasons look nearly identical. So the grouping is a Cypher query rather than a prompt, and every room traces back to a path the interface can show you.',
        ],
        photos: [],
      },
      {
        heading: 'Result',
        body: [
          'Atrium took 1st place overall at the Devnovate Memory Meets Motion hackathon.',
          'End to end, one search researches the web, builds a cited curriculum, and rewrites it around the misconception a simulated classroom actually produced — with an educator approving every draft before it reaches a student.',
        ],
        photos: [],
      },
    ],
    photos: [],
  },
  {
    // REVIEW: drafted from the résumé (re-read 2026-09-02), which is the ONLY
    // source for this project — there is no repo under github.com/bryanph4m, so
    // there is no README to check the copy against and no `github` sub-object.
    // Everything below is a restatement of the résumé's two bullets; nothing is
    // extrapolated. (drafted by /sync-content)
    // TODO: the 2026-07-22 résumé described this as a "sub-250 g" drone and the
    // 2026-09-02 one describes a 7-inch airframe. Those are different vehicles —
    // a 7-inch build is well over 250 g. Confirm which is current; the copy below
    // follows the newer résumé.
    // TODO: no photos yet. A bench shot of the tracking prototype or a CAD render
    // would carry this entry, which is currently the only project with neither a
    // figure nor a photo. The Approach and Result sections both have an empty
    // `photos` slot ready for one.
    id: 'camera-tracking-drone',
    name: 'Camera Tracking Drone',
    category: 'Hardware · Software',
    summary: 'an autonomous drone that follows only the people it has been told to',
    specs: [
      { lead: '7-inch autonomous tracking airframe', sub: 'follows only knowingly registered users' },
      { lead: 'CUDA-accelerated YOLO11n detection', sub: 'ByteTrack persistent IDs across frames, real-time Python' },
      { lead: 'Click-to-select targeting', sub: 'emits a normalized frame-center error signal' },
      { lead: 'Validated Raspberry Pi prototype', sub: 'tracking pipeline and CAD design ahead of the airframe' },
    ],
    tools: ['Python', 'YOLO11n', 'CUDA', 'ByteTrack', 'Raspberry Pi', 'CAD'],
    status: 'In development (bench prototype)',
    detail: [
      {
        heading: 'Objective',
        body: [
          'The goal is a 7-inch autonomous drone that tracks a person and follows only users who have knowingly registered to be followed — consent is the design constraint, not an afterthought bolted onto a tracker that works on anyone.',
        ],
      },
      {
        heading: 'Approach',
        body: [
          'It is being built prototype-first. The real-time Python pipeline runs CUDA-accelerated YOLO11n detection with ByteTrack for persistent identities across frames, and click-to-select targeting that emits a normalized frame-center error signal — the one number a flight controller needs to keep a subject centred.',
        ],
        photos: [],
      },
      {
        // NOTE: thin by necessity. The résumé records progress, not an outcome,
        // and there is no repo to check it against, so nothing beyond the bench
        // validation can be claimed here yet.
        heading: 'Result',
        body: [
          'The tracking pipeline and the CAD design are validated on a Raspberry Pi bench setup. The airframe itself has not been built or flown, so the working prototype is the result so far.',
        ],
        photos: [],
      },
    ],
    photos: [],
  },
  {
    // REVIEW: generated from the repo README (no site copy existed before) —
    // check summary/specs read right. (drafted by /sync-content)
    id: 'intentguard',
    name: 'IntentGuard',
    category: 'Software',
    summary: 'legacy fixture, corpus generator & reconciliation UI for an AI-rewrite safety checker',
    github: {
      repo: 'IntentGuard',
      url: 'https://github.com/bryanph4m/IntentGuard',
      language: 'TypeScript',
      stars: 0,
      description: null,
      createdAt: '2026-08-14T03:25:10Z',
      pushedAt: '2026-08-14T20:01:50Z',
    },
    specs: [
      { lead: 'Own everything the user sees or tests', sub: 'legacy fixture, rewrite candidates, corpus, replay harness, frontend' },
      { lead: 'Team project, 3-person split', sub: 'Forge/control API/policy and the Daytona · Snyk · RocketRide adapters owned by teammates' },
      { lead: 'Strict TypeScript', sub: 'React/Vite reconciliation interface' },
    ],
    tools: ['TypeScript', 'React', 'Vite', 'Forge', 'Daytona', 'Snyk', 'RocketRide'],
    // TODO: the repo was created and last pushed on the same day (2026-08-14),
    // and neither it nor the résumé says whether this is finished, parked, or
    // still moving. Set a real label here rather than inferring one from dates.
    status: 'TODO',
    detail: [
      {
        heading: 'Objective',
        body: [
          'IntentGuard checks whether an AI-rewritten service is safe to ship by running every rewrite candidate against test inputs built from the business rules recovered from the legacy source, then comparing candidate behavior to what the legacy system actually does — a human approves or blocks based on that evidence, never on a model’s opinion of the diff.',
        ],
      },
      {
        heading: 'Approach',
        body: [
          'A three-person team split the system into parallel workstreams. My ownership covered everything the user sees and everything being tested: the legacy fixture and candidate services, the corpus generator, the replay harness, and the strict-TypeScript React/Vite reconciliation frontend. A teammate owned Forge, the control API, and the comparison/policy pipeline; another owned every integration with a third party (Daytona sandboxes, Snyk scans, RocketRide).',
        ],
        photos: [],
      },
      {
        // NOTE: genuinely thin — nothing in the repo README or the résumé
        // records an award, a demo state, or a metric for IntentGuard.
        heading: 'Result',
        body: [
          'TODO: no outcome is recorded for IntentGuard — no award, no demo state, no metric in either the repo or the résumé. What exists is the three-way split above, built in strict TypeScript. Say here how far it actually got.',
        ],
        photos: [],
      },
    ],
    photos: [],
  },
  {
    id: 'mission-launch-rocketry',
    name: 'Mission Launch Rocketry',
    category: 'Rocketry',
    summary: 'co-founded & led a 52-member college rocketry club',
    specs: [
      // "Co-founder" per the résumé's role title; see the note in profile.roles
      { lead: 'Co-founder & President', sub: 'Aug 2025 – Aug 2026 · budget + design-build-launch, concept → flight' },
      { lead: 'Two-stage high-power rocket', sub: 'dual-deployment recovery (drogue + main)' },
      { lead: 'EasyMini + EasyMega computers', sub: 'staged separation sequencing' },
      { lead: 'Onshape · 3D printing', sub: 'microcontrollers + microcomputers' },
      { lead: 'Minimum-diameter airframe, L2-class motor', sub: 'simulated top speed Mach 2.6' },
    ],
    tools: [
      'Onshape', '3D printing', 'EasyMini', 'EasyMega',
      'microcontrollers', 'microcomputers',
    ],
    status: 'Completed (term ended Aug 2026)',
    // NOTE: this project had no `detail` prose at all before this pass. The
    // three sections below are assembled from the résumé bullets already in
    // `specs` and from profile.extended — nothing new is asserted, so the
    // narrative is plainer than the projects that already had one.
    detail: [
      {
        heading: 'Objective',
        body: [
          'Mission Launch Rocketry was founded to give Mission College a project-based engineering club — the only one on campus at the time — and to carry a high-power rocket the whole way from concept to flight rather than stopping at a paper design.',
        ],
      },
      {
        heading: 'Approach',
        body: [
          'The vehicle is a two-stage high-power rocket on a minimum-diameter airframe with an L2-class motor, simulated to a top speed of Mach 2.6. An EasyMini and an EasyMega flight computer sequence the staged separation, and recovery is dual-deployment: a drogue at apogee and the main lower down.',
          'Parts were designed in Onshape and 3D printed, with microcontrollers and microcomputers carrying the electronics. As co-founder and president from August 2025 to August 2026 I ran the club budget alongside the design-build-launch cycle.',
        ],
        photos: [],
      },
      {
        heading: 'Result',
        body: [
          'The club grew to 52 members and took the two-stage vehicle through the full design-build-launch cycle, concept to flight, across the 2025–2026 year.',
        ],
        photos: [],
      },
    ],
    photos: [
      {
        // TODO: the filename says launch day, but the photo is a garage build
        // shot, no pad or rail in frame. If this was taken the morning of a
        // launch, say so here and the caption can call that out.
        src: '/assets/photos/mlr-launch-day.jpg',
        title: 'The finished airframe',
        caption: 'The assembled two-stage rocket standing in the garage it was built in, next to the printer, drills, and recovery gear that went into it.',
        date: '2026',
        credit: 'Mission Launch Rocketry',
        alt: 'A tall black two-stage model rocket standing upright on a work table in an open garage, with a 3D printer, cordless drills, cardboard boxes, and a spare body tube around it.',
      },
      {
        src: '/assets/photos/mlr-team.jpg',
        title: 'Recruiting on campus',
        caption: 'Two of us at the club table on campus, with an airframe stood up behind the sign-up poster and stickers out for anyone who stopped by.',
        date: '2026',
        credit: '',
        alt: 'Two college students sitting at a black table indoors with a Mission Launch Rocketry poster, a large orange and black rocket standing on the table, and stickers spread across it.',
      },
    ],
  },
  {
    // REVIEW: generated from the repo README (no site copy existed before) —
    // check summary/specs read right. (drafted by /sync-content)
    // TODO: the README splits the build into `perception` (Person 1) and
    // `enforcement` (Person 2) branches and never names Bryan against either
    // one. Confirm which half he built before trusting the specs below —
    // they're written branch-neutral until that's settled.
    id: 'nightshift',
    name: 'Night Shift',
    category: 'Software',
    summary: 'two AI agents get paged at 2am, each holding only its own engineer’s real GitHub access',
    github: {
      repo: 'NightShift',
      url: 'https://github.com/bryanph4m/NightShift',
      language: null,
      stars: 0,
      description: null,
      createdAt: '2026-07-25T18:44:15Z',
      pushedAt: '2026-07-25T23:25:36Z',
    },
    specs: [
      { lead: 'Per-agent OAuth via ScaleKit', sub: 'permission boundary enforced by GitHub itself, not a config file' },
      { lead: 'Google Meet coordination', sub: 'MeetStream bots, live transcription, Claude Sonnet 5 diagnosis, Groq extraction' },
      { lead: 'Built for ScaleKit x MeetStream hackathon', sub: '"Agents in Production"' },
    ],
    tools: [
      'ScaleKit', 'GitHub OAuth', 'MeetStream', 'Google Meet',
      'Claude Sonnet 5', 'Groq', 'Slack',
    ],
    status: 'Completed (demo ready)',
    detail: [
      {
        heading: 'Objective',
        body: [
          'When CI fails at 2am, Night Shift pages two AI agents instead of two humans. The point it argues is about permissions: an agent should be able to do exactly what the engineer behind it can do and nothing else, with that boundary enforced by the system being called rather than by a rule someone wrote down.',
        ],
      },
      {
        heading: 'Approach',
        body: [
          'Each agent executes GitHub actions under its own engineer’s real OAuth credentials via ScaleKit, so when an agent lacks write access to fix a bug it hands off to the agent that has it — and when neither does, it escalates to a human on Slack. The permission boundary is enforced by GitHub’s real 403s, not a hardcoded rule.',
          'The agents coordinate in a Google Meet through MeetStream bots, with live transcription feeding Claude Sonnet 5 for diagnosis and Groq for extraction.',
        ],
        photos: [],
      },
      {
        heading: 'Result',
        body: [
          'Night Shift took 2nd Overall and 1st in the MeetStream track at the ScaleKit x MeetStream "Agents in Production" hackathon. The build is demo ready: the hand-off-and-escalate loop runs end to end, and the audit log is what it argues from — every action an agent took, whose credentials it took it under, and which ones GitHub refused.',
        ],
        photos: [],
      },
    ],
    photos: [],
  },
  {
    id: 'recco',
    name: 'Recco',
    category: 'Software',
    summary: 'YC AI Growth Hackathon · camera-first iOS networking assistant',
    // Auto-managed by /sync-content — refreshed from the GitHub API. Do not
    // hand-edit; manual editorial fields live outside this sub-object.
    // NOTE: bryanph4m/Recco is a FORK of the team repo (Cheemasukh962/Recco, the
    // URL the photo below links). `createdAt` is the fork date, not the project's.
    github: {
      repo: 'Recco',
      url: 'https://github.com/bryanph4m/Recco',
      language: null,
      stars: 0,
      description: 'YC AI Growth Hackathon',
      createdAt: '2026-07-30T20:17:41Z',
      pushedAt: '2026-06-30T17:07:28Z',
    },
    specs: [
      { lead: 'Identifies people at events, live', sub: 'face tracking + cloud vision + identity lookup' },
      { lead: 'SwiftUI + AVFoundation pipeline', sub: 'Apple Vision tracking · target-lock reticle · AR overlay' },
      { lead: 'Voice or text commands', sub: 'resolves the person nearest screen center' },
    ],
    tools: [
      'SwiftUI', 'AVFoundation', 'Apple Vision', 'Convex', 'FastAPI',
      'InsightFace', 'OpenAI Vision', 'Fiber', 'Deepgram',
    ],
    status: 'Completed (hackathon build)',
    detail: [
      {
        heading: 'Objective',
        body: [
          "Recco is built for the moment at a busy event when you're holding your phone and want to know who someone is and whether they're worth talking to. Everything happens in the AR camera lens rather than in a separate dashboard.",
        ],
      },
      {
        heading: 'Approach',
        body: [
          'You set a mission on first launch: “looking for investors,” “hiring a Swift engineer,” “trying to get hired.” A fullscreen camera opens with an AR intelligence layer: a target reticle, face brackets, and a minimal scan / mic / keyboard dock.',
          'Recco locks the person closest to center; you ask by voice or type, and the backend resolves their identity and hands back the answer over the same lens.',
          'Identity comes from reading the badge and context with OpenAI Vision, searching profile data with Fiber, and verifying faces through a computer-vision service. Every resolved scan becomes a memory node in “Brain”: name, role, company, LinkedIn, confidence, lead score, and follow-up state.',
          'Recco then drafts a cold email or DM tailored to the mission and the person, and Lazy GTM mode turns “find me 8 Swift engineers” into a prospect graph and an outreach queue.',
          'On the stack: a SwiftUI iOS app carries the fullscreen camera, AR overlay, Brain graph, mission setup, Lazy GTM, and a Deepgram voice client. A Convex backend handles identity, voice tokens, memories, mission scoring, GTM runs, and outreach drafts over HTTP Actions, and a FastAPI + InsightFace service returns 512-dimension face embeddings. Secrets live in Convex environment variables, never in the app.',
        ],
        photos: [],
      },
      {
        // NOTE: thin on outcome by design — no placement is claimed for this
        // hackathon and none should be invented. The demo state below is what
        // the app screenshot in `photos` actually shows.
        heading: 'Result',
        body: [
          'Recco was built at the YC AI Growth Hackathon and runs end to end on the phone: lock the face nearest screen center, ask by voice or text, and the identity card comes back over the same lens — marked verified, with the person’s role and event, a LinkedIn link, and the raw badge text it read to get there.',
        ],
        photos: [],
      },
    ],
    photos: [
      {
        src: '/assets/photos/recco-app.jpg',
        title: 'A resolved scan',
        caption: 'Recco right after it locks onto someone at a hackathon: the card marks them verified, gives their role and the event, links their LinkedIn, and shows the badge text it read to get there.',
        date: '2026',
        credit: '',
        alt: "The Recco iOS app over a live camera view, showing a verified identity card with an attendee's name, role and event, a LinkedIn button, and a detail sheet listing their headline and the raw text read from their badge.",
        link: 'https://github.com/Cheemasukh962/Recco.git',
      },
    ],
  },
  {
    id: 'rollaway',
    name: 'RollAway',
    category: 'Software',
    summary: '1st place, Beginner track · MLH × DigitalOcean AI for Social Good',
    highlight: '1st place',
    // Auto-managed by /sync-content — refreshed from the GitHub API. Do not
    // hand-edit; manual editorial fields live outside this sub-object.
    // NOTE: bryanph4m/RollAway is a FORK of the team repo (nathansso/RollAway, the
    // URL the photo below links). `createdAt` is the fork date, not the project's.
    github: {
      repo: 'RollAway',
      url: 'https://github.com/bryanph4m/RollAway',
      language: null,
      stars: 0,
      description:
        "An location intelligence tool for food truck operators, powered by Digital Ocean's Gradient AI: forecasts foot traffic, dodges saturated blocks, and get your permits in order.",
      createdAt: '2026-08-29T22:06:24Z',
      pushedAt: '2026-07-20T18:08:04Z',
    },
    specs: [
      { lead: 'Permit planning for SF food vendors', sub: 'ranks legal, low-competition spots per time window' },
      { lead: 'React + TypeScript', sub: 'DigitalOcean serverless backend · permit checklist' },
      { lead: 'Zustand-driven UI', sub: 'auto-filled forms from user-ingested data' },
    ],
    tools: [
      'React 19', 'TypeScript', 'Vite 8', 'Tailwind v4', 'Zustand', 'Mapbox GL',
      'DigitalOcean Functions', 'DigitalOcean Gradient', 'Google Places',
      'Street View', 'Ticketmaster', 'SF open data',
    ],
    status: 'Completed (hackathon build)',
    detail: [
      {
        heading: 'Objective',
        body: [
          "RollAway is a map-first location-intelligence and permit-planning PWA for mobile food vendors in San Francisco. It ranks legal, low-competition places to set up for a chosen time window, explains the reasoning behind each pick, and collapses the city's four-agency permit maze into a single guided checklist.",
        ],
      },
      {
        heading: 'Approach',
        body: [
          'Scoring, hard constraints like setbacks and closures, travel time, and legality are all computed deterministically in DigitalOcean Functions, never inside a language model. The LLMs only phrase explanations and read menus or forms, always grounded in the precomputed signals and cited sources.',
          'The map renders a wide candidate pool as pins but promotes only the top three to tray tiles. Each spot opens a detail sheet with a good / check / avoid verdict, a one-line why, a Navigate action, Street View, and the grounded facts behind the score: foot traffic, competition, closures, and legality.',
          'A Permit Copilot turns permitting into a cited, ordered checklist across all four SF agencies, complete with fillable agency PDFs. Vendors sign up and ingest their menu through Gradient-backed extraction from text, links, images, or PDFs.',
          'On the stack: React 19 and TypeScript on Vite 8, Tailwind v4, Zustand for path-based routing with no router library, and Mapbox GL code-split off the landing page. Seven DigitalOcean Functions handle serverless data and deterministic scoring, and a dependency-free agents runtime on DigitalOcean Gradient powers the spot scout, permit copilot, menu RAG, and grounded form-fill. External data comes from SF open data, a Bay Wheels foot-traffic proxy, Google Places and Street View, Ticketmaster events, and Mapbox tiles and travel times.',
        ],
        photos: [],
      },
      {
        heading: 'Result',
        body: [
          'RollAway took 1st place in the Beginner track at the MLH × DigitalOcean AI for Social Good hackathon.',
          'It ships as an installable PWA with an offline shell and a schematic-map fallback for when the tiles do not load, so a vendor can set a vending window, get ranked spots back with a good-fit or avoid verdict and the reasoning behind each one, and walk the four-agency permit checklist from the same app.',
        ],
        photos: [],
      },
    ],
    photos: [
      {
        src: '/assets/photos/rollaway-app.jpg',
        title: 'Picking a spot and a time',
        caption: 'Setting up a vending window over the San Francisco map. Once the times are in, RollAway ranks spots and each card gives a good fit or avoid verdict with the travel time and the reasoning behind it.',
        date: '2026',
        credit: '',
        alt: 'The RollAway web app over a map of San Francisco, with a panel setting a start and end time for a date and a Find spots button, and three ranked spot cards along the bottom showing good fit or avoid verdicts, travel times, and a one-line explanation each.',
        link: 'https://github.com/nathansso/RollAway.git',
      },
    ],
  },
  {
    // REVIEW: drafted from the résumé (re-read 2026-09-02), the only source —
    // this is professional drafting work, not a repo, so there is no `github`
    // sub-object and nothing here can be checked against source. Every number
    // below is the résumé's own. (drafted by /sync-content)
    // TODO: the résumé links a "Document" for this project; if that is a public
    // drawing set or a sheet excerpt that can be shown, add it as a photo or a
    // link so the entry has something to look at — the Approach and Result
    // sections each carry an empty `photos` slot for exactly that.
    // TODO: `category` is a guess — 'Mechanical · Electrical' matches the three
    // sheets drafted, but this is the only non-software, non-rocketry project on
    // the site and the desk prints the category as the drawing kicker. Confirm it
    // reads right there.
    id: 'rwf-daf-tank',
    name: 'RWF DAF Saturation Tank',
    category: 'Mechanical · Electrical',
    summary: 'replacement-in-kind design for a regional wastewater facility',
    specs: [
      { lead: 'DAF saturation tank, replacement in kind', sub: 'San José–Santa Clara Regional Wastewater Facility' },
      { lead: 'Drafted 3 of 12 engineering sheets', sub: 'process mechanical · P&ID · electrical single-line' },
      { lead: '6 process streams, 42 valves', sub: '14 check valves · 4 pumps · 1–8 in. piping · Ø48 in. tank' },
      { lead: 'AutoCAD', sub: 'mechanical, instrumentation, civil, tank and electrical scope' },
    ],
    tools: ['AutoCAD'],
    // REVIEW: "Completed" here means the three sheets were drafted and handed
    // over. The résumé does not say whether the replacement was ever built, so
    // that is deliberately not claimed.
    status: 'Completed (drafting deliverable)',
    detail: [
      {
        heading: 'Objective',
        body: [
          'A replacement in kind of a dissolved air flotation (DAF) saturation tank at the San José–Santa Clara Regional Wastewater Facility. "In kind" is the whole constraint: the replacement has to drop into a plant that keeps running, so the design spans mechanical, instrumentation, civil, tank and electrical scope rather than redesigning any one of them in isolation.',
        ],
      },
      {
        heading: 'Approach',
        body: [
          'I drafted 3 of the 12 engineering sheets in AutoCAD — the process mechanical, the P&ID, and the electrical single-line — which meant working across three disciplines on one tank rather than staying inside one of them.',
        ],
        photos: [],
      },
      {
        // NOTE: thin — the résumé records the scope delivered, not what happened
        // to the design after handover.
        heading: 'Result',
        body: [
          'The three sheets cover 6 process streams, 1–8 in. piping, 42 valves, 14 check valves, 4 pumps, and the 48-inch-diameter saturation tank itself.',
        ],
        photos: [],
      },
    ],
    photos: [],
  },
  {
    // REVIEW: generated from the repo README (no site copy existed before) —
    // check summary/specs read right. (drafted by /sync-content)
    id: 'secondcurrent',
    name: 'SecondCurrent',
    category: 'Software',
    summary: 'helps people decide whether to resell, donate, repair, or recycle old electronics',
    github: {
      repo: '2ndCurrent',
      url: 'https://github.com/bryanph4m/2ndCurrent',
      language: 'TypeScript',
      stars: 0,
      description: null,
      createdAt: '2026-08-15T17:25:03Z',
      pushedAt: '2026-08-16T02:33:04Z',
    },
    specs: [
      { lead: 'Photo-in, item record out', sub: 'checks visible identity/condition, requests missing evidence, short human review' },
      { lead: 'Suggests resell, donate, repair, or recycle', sub: 'matches approved local items with buyer requests' },
      { lead: 'Node/pnpm + Postgres + private object storage', sub: 'photos re-encoded to WebP with metadata stripped before storage' },
    ],
    tools: ['TypeScript', 'Node', 'pnpm', 'Postgres', 'private object storage', 'WebP'],
    // TODO: the repo spans a single overnight (2026-08-15 to 2026-08-16) and
    // neither it nor the résumé says whether this is finished or parked. Set a
    // real label rather than inferring one from those dates.
    status: 'TODO',
    detail: [
      {
        heading: 'Objective',
        body: [
          'SecondCurrent helps people decide what to do with old electronics. The hard part is not the recommendation, it is trusting it — a suggested next step is only worth anything if it rests on what the item visibly is and what condition it is visibly in.',
        ],
      },
      {
        heading: 'Approach',
        body: [
          'Send photos of an item by text, and the app checks the visible evidence, requests anything missing, runs a short human review when needed, and returns a shareable item record with a suggested next step — resell, donate, repair, or recycle — plus matching against approved local buyer requests.',
          'It runs on Node and pnpm with Postgres and private object storage. Photos are re-encoded to WebP and stripped of their metadata before anything is stored, so an item record never carries the place the photo was taken.',
        ],
        photos: [],
      },
      {
        // NOTE: genuinely thin — the README describes the intended flow and
        // nothing anywhere records how much of it runs.
        heading: 'Result',
        body: [
          'TODO: nothing in the repo or the résumé records how far SecondCurrent got — no demo state, no metric, no outcome. Say here what actually runs end to end.',
        ],
        photos: [],
      },
    ],
    photos: [],
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
      pushedAt: '2026-09-03T12:03:24Z',
    },
    specs: [
      { lead: 'React + Three.js desk scene', sub: 'every section is a physical document' },
      { lead: 'Wikipedia-style simple mode', sub: 'same content, a few KB of DOM' },
      { lead: 'Open source', sub: 'github.com/bryanph4m/Engineering-Portfolio' },
    ],
    tools: [
      'React', 'React Three Fiber', 'Three.js', 'drei', '@react-spring/three',
      'Zustand', 'Vite', 'Tailwind',
    ],
    status: 'Actively developed',
    detail: [
      {
        heading: 'Objective',
        body: [
          "This site is a personal portfolio rendered as an old mechanical engineer's drafting desk, viewed from a fixed isometric-ish angle. Each page of the site is a physical document you pick up, read, flip through, and set back down.",
          'The constraint it is built around is that the desk cannot be the only way in. A recruiter with two minutes gets a Wikipedia-style article instead, and both faces read from one content file so a fact edited once can never drift between them.',
        ],
      },
      {
        heading: 'Approach',
        body: [
          'It is one Canvas with no routing; the whole scene lives in a single component, with focus held in Zustand state so Three.js never remounts. Idle is a fixed wide view with a few degrees of pointer parallax; hover lifts a document, a click floats it to a readable pose while the desk dims behind a vignette, and click-away or Esc sets it down.',
          'Multi-page stacks rotate a physical sheet about its left edge on each turn, with an in-world handwritten tally, flippable by on-screen arrows, arrow keys, or a swipe. Document text is real DOM locked over the sheet, so it stays crisp at any zoom and is lazy-loaded on open.',
          'Built with React and React Three Fiber, drei, @react-spring/three, Zustand, and Vite, with Tailwind dressing only the flat UI.',
        ],
        photos: [],
      },
      {
        heading: 'Result',
        body: [
          'The site is live and open source at github.com/bryanph4m/Engineering-Portfolio, and it opens in the simple view by default with the desk one click away.',
          'Both faces render from the single shared content file, and the desk holds a measured performance budget — texture memory, draw calls and per-flip paint cost — that every new visual feature is checked against before it lands.',
        ],
        photos: [],
      },
    ],
    photos: [
      {
        src: '/assets/photos/portfolio-desk.jpg',
        title: 'The desk, in 3D',
        caption: "The portfolio's desk mode. Every document on the drafting desk is a page you pick up and read, rendered in a single Three.js scene.",
        date: '2026',
        credit: '',
        alt: 'A 3D drafting desk seen from above, with a resume, a rocket blueprint, handwritten project notes, a calculator, gears and a model rocket scattered across the wood.',
        link: 'https://github.com/bryanph4m/Engineering-Portfolio.git',
      },
    ],
  },
  // REVIEW: every project on the résumé (re-read 2026-09-02) now has an entry
  // above — Atrium, Camera Tracking Drone and RWF DAF Saturation Tank were all
  // drafted in this pass and are marked with their own REVIEW blocks. Two of the
  // three are résumé-backed only, with no repo to check them against, so they are
  // the ones to read closely.
  //
  // Going the other way, three projects on this site are NOT on the résumé:
  // IntentGuard, Night Shift and SecondCurrent. All three are backed by real
  // repos under github.com/bryanph4m, so they are legitimate site content under
  // the content rules — but if the résumé is the front door, they are invisible
  // from it. Worth deciding whether they belong on the PDF too.
  // (flagged by /sync-content)
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
  // empty to render just the lead. Sourced from the Avionics-Bay project README
  // (github.com/Thrust-Stack/Avionics-Bay).
  extended: [
    'This is the avionics and control side of the tilt/roll-control rocket, an active system that keeps the airframe from spinning up in flight. Most rockets pick up roll from tiny fin misalignments, and left alone that roll builds through boost. The vehicle carries movable canards that deflect to generate a roll moment, and the job of the avionics bay is to read how fast the airframe is rolling and drive those canards to hold it near zero roll rate through boost and coast. It is built to fly on an AeroTech H219.',
    'The bay runs on an ESP32 that handles both the sensors and the actuators. There is an IMU for angular rate and acceleration, a barometric altimeter for altitude, and a GPS, plus the two mirrored canard servos and an optional LoRa radio for telemetry. A Raspberry Pi 5 takes care of onboard camera capture. Instead of closing the whole loop on the ESP32, I run it hardware-in-the-loop: the board streams sensor data out at a fixed rate, a Python controller on a laptop works out the canard deflection, and the command comes back to the ESP32 to move the servos. That kept the flight code quick to iterate on and easy to log.',
    'The flight controller estimates roll rate with a Kalman filter and fuses GPS, accelerometer, and barometer readings to track vertical velocity. It schedules its gain against that velocity so control authority scales with dynamic pressure rather than overreacting at low speed, and it only commands the canards when altitude, tilt, and telemetry freshness all check out, falling back to neutral otherwise. A second, more aggressive controller exists for restrained bench testing and deliberately skips the flight safety gates. At the moment roll control is the part that is actually implemented and tested on the bench. Tilt is estimated from the accelerometer but not yet actively controlled, and the rocket has not flown under power, so validating the loop in flight is the next step. The airframe and bay are modeled in SolidWorks.',
  ],
  // Simple-mode-only figures for the Research article intro (rendered after the
  // lead, like `extended`). Per-page desk polaroids live on `sheets[].photos`
  // below, not here. Same entry shape documented at the top of this file.
  photos: [],
  /**
   * The airframe broken into its named sections — the content behind the desk's
   * interactive rocket model (src/desk/RocketModel.jsx), which replicates the
   * vehicle as a cutaway shop model you can click part by part.
   *
   * Provenance: every part below is a named section of the team's real CAD
   * assembly, transcribed from the project's own public site and source —
   * abgsccc-website.vercel.app and github.com/Thrust-Stack/ABGSWebsite (see
   * `src/data/project.js` there, `airframe` + `components`). Nothing is invented
   * and nothing here is auto-managed; it is manual editorial copy like the rest
   * of this file.
   *
   * Shape, per part:
   *   id     — the desk's click-target id; must match a section in RocketModel
   *   name   — the part's name as the project calls it
   *   role   — its one-line job on the vehicle
   *   desc   — a sentence or two of detail (painted on the desk's detail card)
   *   specs  — [{ label, value }] at-a-glance rows, same spirit as projects[].specs
   *
   * Desk mode paints all five fields onto the focused part's detail card. The
   * simple mode does not render this list at all — the Research article already
   * covers the vehicle in `extended` prose, and repeating it as a spec table
   * there would duplicate rather than complement.
   */
  vehicle: {
    parts: [
      {
        id: 'nose',
        name: 'Nose Cone',
        role: 'Forward Section · Avionics Bay',
        desc: '3D-printed forward section that doubles as the avionics bay. The whole sled — flight computer, sensors, radio and power — rides inside it, which is why the desk model is cut away here.',
        specs: [
          { label: 'Build', value: '3D-printed ASA' },
          { label: 'Bay', value: 'Ø71.6 mm × 348.7 mm, full length of the cone' },
          { label: 'Carries', value: 'The complete avionics sled' },
        ],
      },
      {
        id: 'avionics',
        name: 'Avionics Sled',
        role: 'Flight Computer · Sensors · Power',
        desc: 'The board stack that flies inside the nose. An ESP32 reads the sensors and drives the servos while a Raspberry Pi 5 handles onboard camera capture; the control loop itself runs hardware-in-the-loop on a laptop over the telemetry link.',
        specs: [
          { label: 'Compute', value: 'Raspberry Pi 5 · ESP32' },
          { label: 'Sensing', value: 'MPU6050 IMU · BMP585 altimeter · GPS' },
          { label: 'Actuation', value: 'PCA9685 servo driver' },
          { label: 'Link', value: 'RFM95W LoRa downlink' },
          { label: 'Power', value: '7.4 V pack via 5 V 5 A UBEC' },
        ],
      },
      {
        id: 'servo-can',
        name: 'Servo Fin Can',
        role: 'Canard Control Section',
        desc: 'Structural section carrying the servo mounts, shaft bearings and the airfoil canards. The canards are the only surfaces the control system actually drives — deflecting them generates the corrective roll moment.',
        specs: [
          // REVIEW: two sources disagree on canard count and this model shows four.
          // The project's CAD assembly (github.com/Thrust-Stack/ABGSWebsite) names
          // four "Airfoil Canard" parts, while this file's own control-system prose
          // (from the Avionics-Bay README) describes the firmware driving a mirrored
          // PAIR. The résumé (re-read 2026-09-02) sides with the pair — "driving two
          // mirrored micro-servo canards clamped to ±7.5° in flight and ±15° in
          // firmware" — which supports the "four in structure, two driven" reading
          // and matches the ±15° Travel row below. Still worth one confirmation
          // against the build before the four-canard Surfaces row is treated as
          // settled. (re-checked by /sync-content)
          { label: 'Surfaces', value: 'Four airfoil canards (CFD-analyzed profile)' },
          { label: 'Servos', value: 'BlueBird BMS-127WV+ digital, high-voltage' },
          { label: 'Mounts', value: 'In-house SolidWorks design, bearing-supported' },
          { label: 'Travel', value: 'Clamped to ±15° about a 90° neutral' },
        ],
      },
      {
        id: 'airframe',
        name: 'Body Tubes',
        role: 'Upper & Lower Airframe',
        desc: 'The two body tubes: a forward coupler between the nose and the canard section, and the main lower airframe running back to the aft end. Passive structure — they carry load and nothing else.',
        specs: [
          { label: 'Upper', value: 'Coupler, nose → servo fin can' },
          { label: 'Lower', value: 'Main section, servo fin can → aft end' },
          { label: 'Airframe', value: '≈1052 mm long, Ø79 mm' },
        ],
      },
      {
        id: 'static-can',
        name: 'Static Fin Can',
        role: 'Passive Stability · Motor Mount',
        desc: 'Fixed airfoil fins, the lower bearing mount and the motor mount. This is the passive stability at the aft end — it sets where the vehicle wants to point before the canards ever move.',
        specs: [
          { label: 'Fins', value: 'Fixed airfoil section' },
          { label: 'Motor', value: 'Built around an AeroTech H219' },
          { label: 'Also carries', value: 'Lower bearing mount for the canard shafts' },
        ],
      },
    ],
  },
  // Per-sheet `sub`/`lead`/`notes` are the desk blueprint's copy (desk mode reads
  // only those; see src/documents/content/research.js). Each sheet's `extended`
  // is longer-form prose for the simple/recruiter mode ONLY — the simple mode
  // renders it under that subsection's bullets, the desk never reads it. Same
  // shape as research.extended above: an array of paragraph strings, one per
  // paragraph. Sourced from the Avionics-Bay README
  // (github.com/Thrust-Stack/Avionics-Bay); leave empty to render just the bullets.
  sheets: [
    {
      id: 'vehicle',
      title: 'Tilt/Roll-Control Rocket',
      sub: 'High-powered model rocket · tilt & roll control · SolidWorks',
      // rendered verbatim (hand-lettered) on the desk, so stored verbatim
      lead: 'objective: structural integrity with active tilt/roll control on board.',
      notes: [],
      extended: [
        'This is the vehicle the whole program is built around, a high-powered model rocket from Thrust-Stack meant to fly on an AeroTech H219 and stay pointed straight instead of spinning up under thrust. The airframe pairs fixed airfoil fins at the tail with two movable canards up near the nose, and those canards are the only surfaces the system actually drives. I modeled the full rocket in SolidWorks: the body tubes, nose cone, and couplers, the top and bottom avionics bay plates, and the mechanical bits around them like the servo mounts, bearings, the static fin and lower bearing mount, and a fin jig for repeatable alignment. The bay also carries a Raspberry Pi 5 and a Pi Camera Module 3 on their own mount for onboard video. The real motor is left out of the model and stands in as an inert fake-motor part used only for mass and fit, since the project keeps no thrust curve on hand. Despite the tilt-and-roll name, the built vehicle only actively controls roll for now, with tilt read off the accelerometer but not yet driven.',
      ],
      photos: [
        {
          src: '/assets/photos/rocket-airframe.jpg',
          title: 'The airframe',
          caption: 'The assembled airframe laid out beside its avionics, with the Raspberry Pi, radio boards, and servo being bench tested against live telemetry and the SolidWorks model.',
          date: '2026',
          credit: '',
          alt: 'A model rocket airframe with its nose cone laid diagonally across a round table, surrounded by a Raspberry Pi, breadboarded electronics and a servo, with a monitor and laptops showing flight code, telemetry, and a SolidWorks model of the rocket.',
          link: 'https://abgsccc-website.vercel.app/',
        },
      ],
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
      // REVIEW: RESOLVED — the bullets above are now résumé-backed. The résumé
      // (re-read 2026-09-02) states "Conducted 3000+ simulation hours of
      // computational fluid dynamics (CFD) simulations in SimScale, validating
      // aerodynamic performance, drag, pressure distribution, and stability prior
      // to fabrication", which is the primary source the earlier TODO asked for.
      // The Avionics-Bay README still records no CFD results, so the paragraph
      // below stays as written. This comment can be deleted.
      // (re-checked by /sync-content)
      extended: [
        'Before anything got fabricated, the airframe went through CFD to check that the aerodynamics held up. The repo keeps a dedicated CFD variant of the SolidWorks assembly, cleaned up and exported to STEP so it drops into the solver without the mechanical detail that would choke a mesh, and the motor is stubbed out with an inert fake-motor part so it still contributes mass and fit without standing in as a real thrust source. I ran the aerodynamic work in SimScale. The point was to understand how the airframe and canards sit in the flow before committing to cut parts, so the fin and canard geometry could be settled on the model rather than discovered on the pad.',
      ],
      photos: [],
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
      extended: [
        'The control system is what makes the rocket active, and it runs hardware-in-the-loop rather than closing everything on the board. The ESP32 streams sensor frames over USB serial at 115200, tagging IMU data at 20 Hz and ground-zeroed altitude at 10 Hz while passing the GPS NMEA through untouched. On the laptop, a logger called GPSReader records all of it to SQLite and rebroadcasts the packets on a local UDP port; the controller listens there, computes a canard angle, and sends back a short ROLL command on a second UDP port, which GPSReader relays to the board over the serial link it already owns. The ESP32 takes that single signed angle and drives both mirrored canards around a 90 degree neutral with direct PWM, clamped to plus or minus 15 degrees of travel. The flight controller keeps its own command tighter, near 7.5 degrees, and scales that authority with speed so it is not overreacting at low dynamic pressure. There is no hardware arm switch or pyro interlock anywhere in the firmware, so arming is entirely software gating in the host code, and the canards jump to neutral the instant the board boots.',
      ],
      photos: [],
    },
  ],
}

// REVIEW: the résumé gained an Achievements section in the working-tree PDF
// (re-read 2026-09-10) that has NO counterpart in `sections` below:
//   "6x Hackathon Winner: 2nd Overall & 1st Meetstream @ Scalekit x Meetstream,
//    1st Beginner @ MLH, 2nd Runloop @ Codex"
// The six count reconciles: those four plus Aside AI (1st Deepgram track) and
// Atrium (1st overall), both already on the site. Of the four new ones:
//   · Scalekit x Meetstream → Night Shift (see its entry above)
//   · 1st Beginner @ MLH    → RollAway, whose summary already claims it — now
//                             résumé-backed, where before it rested on the repo
//   · 2nd Runloop @ Codex   → Antibody (confirmed by the author 2026-09-10):
//                             2nd place, Runloop track, Codex Community
//                             Hackathon. Antibody has NO entry in `projects`
//                             and no repo under github.com/bryanph4m — a GitHub
//                             search finds nothing matching either, so it is
//                             presumably a teammate's repo or private. Needs
//                             /draft-project plus a source for the write-up.
//                             Note the résumé compresses this to "2nd Runloop @
//                             Codex", which names neither the project nor the
//                             full hackathon name.
// Adding an Achievements section here is editorial, so it was not written.
// (flagged by /sync-content)
export const resume = {
  name: 'Bryan Pham',
  subtitle: 'RESUME · MECHANICAL ENGINEERING',
  pdf: '/assets/Bryan-Pham-Resume.pdf',
  sections: [
    {
      label: 'Education',
      entries: [
        // REVIEW: the "transfer" qualifier was dropped to match the résumé, which
        // says plainly "GPA: 4.0" under the UCLA heading. Nothing on the résumé
        // supports calling it a transfer GPA, and the two read very differently to
        // a recruiter. If it IS the transfer GPA, say so on the résumé first and
        // then restore the word here. Dates and location match.
        // (flagged by /sync-content)
        {
          title: 'UCLA, B.S. Mechanical Engineering',
          sub: 'GPA 4.0 · June 2026 – May 2028 · Los Angeles, CA',
        },
      ],
    },
    // REVIEW: this list now mirrors the résumé's Experience section as re-read on
    // 2026-09-02, which rewrote it. Two changes, both reversible:
    //   · Mission Launch Rocketry was ADDED — it is the résumé's second Experience
    //     entry and was missing here entirely.
    //   · "Associated Student Government Senator" was REMOVED, because the current
    //     PDF no longer carries it and nothing else backs it. If it should stay on
    //     the site, put it back on the résumé first, then paste this entry back:
    //       {
    //         title: 'Mission College, Associated Student Government Senator',
    //         sub: 'Aug 2025 – May 2026 · represented 6,000+ students · presented
    //               recommendations to district executives at a leadership retreat',
    //       },
    // (reconciled by /sync-content)
    {
      label: 'Experience',
      entries: [
        {
          title: 'Mission College, Design & Manufacturing Engineering Intern',
          sub: 'June 2026 – present · Santa Clara, CA · high-powered rocket airframe · SolidWorks · SimScale CFD',
        },

        {
          title: 'Mission College, Co-founder & President, Mission Launch Rocketry',
          sub: 'Aug 2025 – Aug 2026 · Santa Clara, CA · 52 members · budget, events, and design-build-launch from concept to flight',
        },
      ],
    },
    // REVIEW: rewritten to match the résumé's Projects section (Camera Tracking
    // Drone · RWF DAF Saturation Tank · Aside AI · Recco · Atrium). RollAway and
    // Mission Launch Rocketry came out: the résumé dropped RollAway from Projects
    // and moved the club to Experience, where it now appears above. The two
    // 1st-place finishes counted below are Aside AI (Deepgram track, Berkeley) and
    // Atrium (overall, Memory Meets Motion) — Recco carries no award.
    // (reconciled by /sync-content)
    {
      label: 'Projects',
      entries: [
        {
          title: 'Aside AI · Atrium · Recco · Camera Tracking Drone · RWF DAF Tank',
          sub: 'two 1st-place hackathon finishes · consent-gated drone tracking · municipal process design',
        },
      ],
    },
    {
      label: 'Skills',
      entries: [
        // REVIEW: set to the résumé's Languages line exactly (re-read 2026-09-02),
        // which dropped C and Swift. Worth one look before this is settled: the
        // résumé's own Recco bullet still says "Engineered a SwiftUI and
        // AVFoundation pipeline", so Swift IS résumé-backed elsewhere and arguably
        // belongs back on both. C is backed by nothing on the current résumé.
        // (reconciled by /sync-content)
        {
          title: 'Languages',
          sub: 'MATLAB, C++, Python, TypeScript, JavaScript, HTML/CSS',
        },
        {
          title: 'CAD',
          sub: 'SolidWorks, Onshape, AutoCAD, Fusion360, MecAgent, Zoo.dev',
        },
        {
          title: 'Manufacturing & lab tools',
          sub: '3D printing, soldering, microcontrollers, SimScale, microcomputers, computer vision, PSpice, LTSpice, oscilloscope, function generator, mechanical systems, manufacturing processes, engineering drawings, technical specifications',
        },
        {
          title: 'Tools & Platforms',
          sub: 'Claude Code, Codex, Cursor, Git/GitHub, GitHub Actions, Microsoft Office, Redis, Mapbox',
        },
      ],
    },
  ],
}

export const contact = {
  name: 'Bryan Pham',
  // The Contact article's lead line — simple/recruiter mode ONLY. The desk's
  // envelope has no lead of its own (it paints the CORRESPONDENCE kicker plus
  // the addressee block from `links` below), so changing this never touches the
  // desk. Same simple-mode-only convention as `profile.extended`.
  intro: 'I would be happy to respond if you have further questions about me!',
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
