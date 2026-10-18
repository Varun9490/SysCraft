/**
 * Curated external learning sources — the "Library".
 *
 * Sixteen canonical, free, creator-vetted references that SysCraft pairs its
 * interactive modules with. Every entry carries the syllabus outline you can
 * expect inside, why it earns slot, and an internal SysCraft pairing URL so
 * learners can turn reading into building. Rendered by /library.
 */

export type LibraryTrack =
  | 'dsa'
  | 'system-design'
  | 'cs-fundamentals'
  | 'backend'
  | 'ai'
  | 'devops'
  | 'cloud'
  | 'language'
  | 'api'
  | 'open-source';

export interface LibraryResource {
  id: string;
  name: string;
  url: string;
  track: LibraryTrack;
  /** One-line positioning — what makes this source the one to keep. */
  blurb: string;
  /** Why this pick over a generic search result. */
  why: string;
  /** Syllabus outline you can expect inside the source. */
  syllabus: string[];
  bestFor: string;
  /** Internal deep-dive that turns the reading into building. */
  pairWith: { label: string; href: string };
  accent: string;
  hours: string;
}

const RESOURCES: LibraryResource[] = [
  {
    id: 'tuf-a2z-dsa',
    name: 'Striver A2Z DSA Course Sheet',
    url: 'https://takeuforward.org/dsa/strivers-a2z-dsa-course-sheet-2/',
    track: 'dsa',
    blurb: 'The zero-to-pro data-structures ladder — leveled steps from patterns to DP trees graphs.',
    why: 'A single sheet ordered from "what is a vector" to "diameter of trees" — every step has lecture theory, a hand-picked problem list, and solved notes, so you never choose what to study next.',
    syllabus: [
      'Step 1 · Learn the basics: language shapes, hashing, STL basics',
      'Sorting — merge, quick, count inversions in one landing',
      'Arrays, binary search, sliding window, basic hard problems',
      'Recursion, backtracking, linked lists, stacks, queues and sliding window maxi',
      'Trees, BSTs, priority queues, greedy — then graphs and dynamic programming as the final bosses',
    ],
    bestFor: 'Interview grind with a definite finish line',
    pairWith: { label: 'Practice: Estimate Sprint', href: '/play' },
    accent: 'sky',
    hours: '150–250 h',
  },
  {
    id: 'neetcode-io',
    name: 'NeetCode — 150 & Roadmap',
    url: 'https://neetcode.io',
    track: 'dsa',
    blurb: 'Pattern-first DSA: the 150 that cover 90% of interviews, video singular explanations.',
    why: 'Groups problems by pattern (two pointers, sliding window, backtracking…) and gives one crisp video per pattern before you grind. The roadmap view tells you whether 150 or 250 hours of your time go to DSA or system design.',
    syllabus: [
      'NeetCode 150 — 14 grouped problem categories with curated videos',
      'Roadmap tracks for DSA, Advanced algorithms, System design, Behavioral',
      'Topic sprees: linked lists, trees, tries, interval problems, heaps',
      'Mock interview runner + solutions in multiple languages',
    ],
    bestFor: 'Pattern-led prep with video walkthroughs',
    pairWith: { label: 'Wiki: sharding & partitioning', href: '/wiki/sharding-partitioning' },
    accent: 'violet',
    hours: '80–120 h',
  },
  {
    id: 'system-design-primer',
    name: 'System Design Primer',
    url: 'https://github.com/donnemartin/system-design-primer',
    track: 'system-design',
    blurb: 'The open-source bible: study card first, worked interview answers after.',
    why: 'Short notes on the primitives (load balancing, caching, sharding, CAP), then long-form worked designs (URL shortener, chat, notification farms) — the same species of primitive you can simulate live, deep-linked across every SysCraft wiki page.',
    syllabus: [
      'System design basics: memory/latency numbers, horizontal vs vertical sizing',
      'Load balancing, caching, proxies, DNS, CDNs, N/Primary Diana replication',
      'Consensus, CAP, PACELC, event delivery patterns (at-least / at-most / exactly-once)',
      'Worked interviews: URL shortener, pastebin, Snapchat YouTube, notification farm',
      'Studying for a system design interview + README flashcards',
    ],
    bestFor: 'Interview-ready notes + worked designs',
    pairWith: { label: 'Build: Design Doctor', href: '/canvas' },
    accent: 'amber',
    hours: '30–60 h',
  },
  {
    id: 'ossu-cs',
    name: 'OSSU Computer Science',
    url: 'https://github.com/ossu/computer-science',
    track: 'cs-fundamentals',
    blurb: 'A complete undergrad CS curriculum assembled entirely from free courses.',
    why: 'Deduce the degree: 100% free courses (SPU/MOOC-crowd-checked) at a self-paced rhythm, with community Discord for help. It gives what topics underpin the distributed systems SysCraft simulates.',
    syllabus: [
      'Intro CS: programming fundamentals, math for CS, discrete structures',
      'Core: data structures and algorithms, systems programming, networks',
      'Core math: linear algebra, probability, calculus (prereqs first)',
      'Advanced: OS (Segment), parallel computing, distributed systems (Cornell)',
    ],
    bestFor: 'The missing CS degree for bootcamp and self-thought engineers',
    pairWith: { label: 'Wiki: ACID vs BASE', href: '/wiki/acid-vs-base' },
    accent: 'emerald',
    hours: '2+ yrs',
  },
  {
    id: 'roadmap-backend',
    name: 'roadmap.sh — Backend',
    url: 'https://roadmap.sh/backend',
    track: 'backend',
    blurb: 'Clickable skill tree: every backend competence, linked to primary sources.',
    why: 'The map from "I write endpoints" to "I can own a platform": in the right dependency order — Linux, networking, databases, CI/CD, API design, security, scaling — with most-popular links curated per node.',
    syllabus: [
      'Internet basics, Linux, bash, version control (git god level)',
      'RDBMS + NoSQL + ORMs, caching (Redis/Memcached) patterns',
      'API design: REST, GraphQL, gRPC, auth/Authorization: JWT, OAuth',
      'CI/CD, containerization (docker), observability: Prometheus + Grafana',
      'Scaling: replication, load balancing, message queues, microservices vs monolith',
    ],
    bestFor: 'A dependency-ordered backend checklist',
    pairWith: { label: 'Topic: message queues', href: '/wiki/message-queues' },
    accent: 'rose',
    hours: '40–80 h',
  },
  {
    id: 'genai-beginners',
    name: 'Generative AI for Beginners',
    url: 'https://github.com/microsoft/generative-ai-for-beginners',
    track: 'ai',
    blurb: 'Microsoft’s 18-lesson course: prompts → apps → RAG → agents → final projects.',
    why: 'The friendliest serious grounding: each lesson is imagine → code → recap, with runnable JNotebook repos in Python/JS, cost notes, and Azure/OpenAI-free alternatives mentioned.',
    syllabus: [
      'Intro to generative AI + prompt engineering core',
      'Building apps: text, images, function calling, low-code flows',
      'RAG and vector DBs: embeddings, retrieval evaluation',
      'Agents + AI tools, responsible AI checklist',
      'Capstone ideas + continued learning paths',
    ],
    bestFor: 'Builders who learn by running notebooks',
    pairWith: { label: 'Wiki: LLM systems', href: '/wiki/llm-systems' },
    accent: 'violet',
    hours: '25–40 h',
  },
  {
    id: 'github-skills',
    name: 'GitHub Skills',
    url: 'https://skills.github.com',
    track: 'devops',
    blurb: 'Hands-on GitHub courses that run inside real PRs and Actions.',
    why: 'Learning by doing on the actual platform: each course forks a template repo, opens为指导 PRs you close by committing — version control muscle memory that tutorials never give.',
    syllabus: [
      'Intro to GitHub: repos, branching, PR flow, review etiquette',
      'GitHub Actions: automation, build-test-deploy workflows',
      'Security: secret scanning, dep review, dependabot',
      'Projects & pages: issue triage boards, static documentation hosting',
    ],
    bestFor: 'Real-repo Git & CI practice',
    pairWith: { label: 'Export: IaC from a design', href: '/canvas' },
    accent: 'sky',
    hours: '6–14 h',
  },
  {
    id: 'sqlbolt',
    name: 'SQLBolt',
    url: 'https://sqlbolt.com',
    track: 'backend',
    blurb: 'Interactive SQL in one sitting: SELECT → JOINs → aggregations → schema.',
    why: 'Only a few hours long and entirely in-browser: every lesson is an editable query against a live table, so SQL becomes prose you write, not theory you read.',
    syllabus: [
      'SELECT * and columns — the anatomy of a query',
      'Constraints (WHERE) and filtering (IN, LIKE, ranges)',
      'JOINs: inner, outer, then multi-table chains',
      'Aggregations, HAVING, CREATE/ALTER schema, UPDATE/DELETE',
    ],
    bestFor: 'Fast in-browser SQL COMPETENCE',
    pairWith: { label: 'Wiki: B-trees vs LSM', href: '/wiki/btree-vs-lsm' },
    accent: 'amber',
    hours: '3–5 h',
  },
  {
    id: 'docker-get-started',
    name: 'Docker — Get Started',
    url: 'https://docs.docker.com/get-started/',
    track: 'devops',
    blurb: 'The official Part 1–9 arc: containers → images → compose → swarm → deploy.',
    why: 'The canonical Docker path, written by the team that ships Docker: simple language, incremental, ends by deploying a compose stack to the cloud with CI — no third-party content drift.',
    syllabus: [
      'Orientation + containerizing your app (Dockerfile basics)',
      'Image build/publish layers, volumes and bind mounts',
      'Multi-container apps with Docker Compose',
      'Kubernetes intro, CI, deploy to cloud + design/keep-reading pointers',
    ],
    bestFor: 'Official, no-drift containerization onboarding',
    pairWith: { label: 'Canvas: K8s view', href: '/canvas' },
    accent: 'sky',
    hours: '8–12 h',
  },
  {
    id: 'aws-getting-started',
    name: 'AWS — Getting Started',
    url: 'https://aws.amazon.com/getting-started/',
    track: 'cloud',
    blurb: 'Guided AWS tutorials + learning paths across every top service.',
    why: 'First-party tutorials ship with console screenshots that stay current, plus free-tier guidance and cost-cleanup steps most tutorials forget — start with the sandbox, end with a real architecture.',
    syllabus: [
      'Console orientation + account security (MFA, budgets, billing alarms)',
      'Hands-on: S3 static site, EC2 app, Lambda + API Gateway functions',
      'Path: serverless, databases (RDS, DynamoDB), and VPC networking',
      'Projects: full-stack on AWS, then architecture decision guides',
    ],
    bestFor: 'Step-by-step official cloud onboarding',
    pairWith: { label: 'Primitives: cloud regions', href: '/wiki/primitives' },
    accent: 'amber',
    hours: '10–20 h',
  },
  {
    id: 'dev-java',
    name: 'Official Java Tutorials',
    url: 'https://dev.java/learn/',
    track: 'language',
    blurb: 'dev.java’s official “learn” hub: modern Java 21+, JVM mental models included.',
    why: 'Written and kept current by the Java team — new-generation features (records, virtual threads, pattern matching) are taught as first-class idioms, not appended as chapters.',
    syllabus: [
      'Getting started: JDK, toolchains, text blocks, records',
      'Class-first OOP, interfaces, generics and collections idioms',
      'Streams, records, sealed types, pattern matching switch',
      'Memory model, virtual threads, performance guidance',
    ],
    bestFor: 'Modern-Java-first language learning',
    pairWith: { label: 'Wiki: observability', href: '/wiki/observability-tracing' },
    accent: 'rose',
    hours: '30–60 h',
  },
  {
    id: 'python-tutorial',
    name: 'Official Python Tutorial',
    url: 'https://docs.python.org/3/tutorial/',
    track: 'language',
    blurb: 'The language itself, in its own words — concise, canonical chapters.',
    why: 'The most precise introduction that exists: authority over py-isms (indentation memory model, duck typing, the std-batteries) with nothing dumbbled down — pairs with the stdlib docs for total coverage.',
    syllabus: [
      'Interpreter, strings, lists — data shapes first',
      'Control flow, functions (params, unpacking, first-class functions)',
      'Data structures: dicts/sets vs tuples vs lists — when to choose which',
      'Modules, I/O, errors, classes to the stdlib tour',
    ],
    bestFor: 'Canonical, precise Python from the source',
    pairWith: { label: 'Play: Bottleneck Hunt', href: '/play' },
    accent: 'emerald',
    hours: '20–40 h',
  },
  {
    id: 'javascript-info',
    name: 'The Modern JavaScript Tutorial',
    url: 'https://javascript.info',
    track: 'language',
    blurb: 'Three parts: JS core → browser DOM → advanced — with executable snippets.',
    why: 'The complete JS book: every snippet is editable in the page, edge-case callouts come from real polyglot experience, and Part 2/3 bridge to apps (events, network, storage) that backend devs keep missing.',
    syllabus: [
      'Part 1: values, scope + hoisting, closures, prototypes, classes',
      'Part 2: DOM, events bubbling, forms — browser building blocks',
      'Part 3: event loop, async/await, Promises, modules, regex',
      'Interview-grade deep dives: microtask order, timers, error handling',
    ],
    bestFor: 'Full-depth JS for browser and Node alike',
    pairWith: { label: 'Topic: JS storage', href: '/topics/web-storage' },
    accent: 'amber',
    hours: '40–70 h',
  },
  {
    id: 'postgresql-docs',
    name: 'Postgres Documentation',
    url: 'https://postgresql.org/docs/',
    track: 'backend',
    blurb: 'The reference manual that reads like a course — tutorial → admin → replication.',
    why: 'Other DBs hide their model; Postgres documents it: the tutorial walks you up from psql to window functions, then server-admin chapters (VACUUM, WAL, replication) are the deep dive senior engineers quote.',
    syllabus: [
      'Tutorial: SQL language from SELECT to window functions',
      'Advanced features: CTEs, FTS, jsonb, full-text indexes',
      'Server administration: configuration, backup (pg_dump, WAL archiving)',
      'Replication, HA patterns, monitoring and tuning',
    ],
    bestFor: 'Postgres depth — data modeling to ops',
    pairWith: { label: 'Wiki: replication', href: '/wiki/replication' },
    accent: 'sky',
    hours: '15–30 h',
  },
  {
    id: 'mdn-server-side',
    name: 'MDN — Server-side APIs',
    url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Server-side/First_steps/Introduction',
    track: 'api',
    blurb: 'MDN’s beginner course for what the web server actually does, with tutorials networked across languages.',
    why: 'Concept-first and rendered in actual quality: HTTP request lifecycle, static vs dynamic, the shape of a framework (Express or Django are worked through), security checklist for APIs — neutral, linkable, canonical.',
    syllabus: [
      'Server-side first steps: clients, servers, the HTTP conversation',
      'Dynamic vs static serving, web frameworks anatomy',
      'Express Node tutorial: routing, templates, forms, auth',
      'Django track + web security first steps (CORS, cookies, CSP)',
    ],
    bestFor: 'Neutral, canonical API/web-server grounding',
    pairWith: { label: 'Wiki: rate limiting', href: '/wiki/rate-limiting' },
    accent: 'violet',
    hours: '10–20 h',
  },
  {
    id: 'good-first-issue',
    name: 'goodfirstissue.dev',
    url: 'https://goodfirstissue.dev',
    track: 'open-source',
    blurb: 'Curated, live-parsed first issues to make your first OSS PR or contribution real.',
    why: 'Filters actual repo issues labeled good-first-issue by language and difficulty, but importantly are live issues (not stale scraped lists) — so first contributions turn into review flow with real maintainers today.',
    syllabus: [
      'Browse issues by language (JS/TS, Python, Go, Rust, …)',
      'Star and follow issues → PR checklist: reading CONTRIBUTING.md first',
      'Re-read: how maintainers review — small diffs, tests, clear commit messages',
      'Track your picks in a progress journal; graduate to good-second issues',
    ],
    bestFor: 'First open-source contribution',
    pairWith: { label: 'Practice: review etiquette', href: '/library' },
    accent: 'rose',
    hours: 'Sprints',
  },
];

export const LIBRARY_RESOURCES = RESOURCES;

export const TRACK_LABELS: Record<LibraryTrack, string> = {
  dsa: 'DSA',
  'system-design': 'System design',
  'cs-fundamentals': 'CS fundamentals',
  backend: 'Backend',
  ai: 'AI engineering',
  devops: 'DevOps',
  cloud: 'Cloud',
  language: 'Languages',
  api: 'APIs',
  'open-source': 'Open source',
};

export const ACCENTS: Record<string, { border: string; text: string; chip: string; glow: string; bar: string }> = {
  sky: { border: 'hover:border-sky-500/40', text: 'text-sky-300', chip: 'border-sky-500/30 bg-sky-500/10 text-sky-300', glow: 'hover:shadow-[0_18px_50px_-18px_rgba(56,189,248,0.4)]', bar: 'from-sky-400 to-cyan-300' },
  violet: { border: 'hover:border-violet-500/40', text: 'text-violet-300', chip: 'border-violet-500/30 bg-violet-500/10 text-violet-300', glow: 'hover:shadow-[0_18px_50px_-18px_rgba(167,139,250,0.4)]', bar: 'from-violet-400 to-fuchsia-300' },
  amber: { border: 'hover:border-amber-500/40', text: 'text-amber-300', chip: 'border-amber-500/30 bg-amber-500/10 text-amber-300', glow: 'hover:shadow-[0_18px_50px_-18px_rgba(251,191,36,0.4)]', bar: 'from-amber-400 to-yellow-300' },
  emerald: { border: 'hover:border-emerald-500/40', text: 'text-emerald-300', chip: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300', glow: 'hover:shadow-[0_18px_50px_-18px_rgba(52,211,153,0.4)]', bar: 'from-emerald-400 to-teal-300' },
  rose: { border: 'hover:border-rose-500/40', text: 'text-rose-300', chip: 'border-rose-500/30 bg-rose-500/10 text-rose-300', glow: 'hover:shadow-[0_18px_50px_-18px_rgba(251,113,133,0.4)]', bar: 'from-rose-400 to-red-300' },
};
