/**
 * All copy and data for the site. Components import from here and never hardcode facts.
 *
 * Sources: the owner's resume (November 2026), his LinkedIn profile export (November 2026), his own
 * instructions, and facts verified from his public repositories and live sites.
 * Rule: do not add a metric, date, employer, link or claim that is not backed by them.
 */

export type RoleStatus = 'incoming' | 'current' | 'past'

export interface Fact {
  /** Short figure exactly as the source states it, e.g. "200+". */
  value: string
  /** What the figure measures, lower case, no trailing period. */
  label: string
}

export interface Role {
  id: string
  /** Company or lab name as it should be displayed. */
  company: string
  /** Shortest recognizable form, for tooltips and tight spaces. */
  short: string
  role: string
  team?: string
  /** Human readable period. */
  period: string
  year: string
  status: RoleStatus
  /** White logo file in public/ (the full logo or wordmark). Used flat in the page. */
  logo: string
  /** A compact mark for round or small places such as the face of the company's 3D medallion. Falls back to `logo`. */
  mark?: string
  /**
   * What he did there: one short bullet per entry, one idea each, facts from the resume only.
   * Wrap the figure or name a reader should catch first in **two asterisks**; it is shown in full white.
   */
  description: string[]
  /** A short demo video of the work, shown with the description. Click to play, never autoplay. */
  video?: RoleVideo
  /** More videos from the role, shown after `video` in this order. */
  videos?: RoleVideo[]
  /** Photos from the role (the team, the place), in display order, shown with the description. */
  photos?: RolePhoto[]
  /**
   * 'text': on a wide screen the photos and videos together are exactly as tall as the text beside them. They share
   * the column's width and are cropped to fit, instead of keeping their own shapes at one common height.
   */
  mediaHeight?: 'text'
}

export interface RolePhoto {
  src: string
  width: number
  height: number
  /** What is in the picture, for people who cannot see it. */
  alt: string
  /** One plain line shown under the photo. */
  caption: string
  /** A document the picture is the cover of (a slide deck, a paper). The picture opens it; `label` is shown on it. */
  link?: { href: string; label: string }
  /**
   * Which part of the picture to keep when it is cropped (see `mediaHeight`), as a CSS object-position:
   * '0% 50%' keeps the left edge, '100% 50%' the right. Default: the center.
   */
  focus?: string
}

export interface RoleVideo {
  src: string
  poster: string
  width: number
  height: number
  /** One plain line saying what the video shows. */
  caption: string
}

export interface ProjectLink {
  label: string
  href: string
}

/** Which 3D object would stand for a project. The page has no 3D right now, so nothing reads this. */
export type ProjectObject = 'pages' | 'waveform' | 'podium' | 'garment' | 'gitGraph' | 'plot' | 'powerLaw' | 'layers'

export interface Project {
  id: string
  name: string
  /** One line, sentence case, no period. Always visible. */
  pitch: string
  /** Shown after the visitor opens the project. */
  description: string
  /** "Co-founder", or empty when no role title is documented. */
  role: string
  period: string
  /** Honest state of the project, shown as a small tag. */
  status: string
  facts: Fact[]
  stack: string[]
  links: ProjectLink[]
  /** The project's own logo in public/, when it has one. */
  logo?: string
  /** Which 3D object stands for the project. */
  object: ProjectObject
}

export interface Award {
  /** The name of the award or event. */
  title: string
  /** One sentence: the result, then what makes it hard to get. */
  description: string
}

export interface Tool {
  name: string
  /** White mark in public/logos. */
  logo: string
}

export const profile = {
  name: 'Ethan Varghese',
  title: 'Software engineer',
  location: 'San Francisco Bay Area',
  email: 'ethanv@berkeley.edu',
  linkedin: 'https://www.linkedin.com/in/ethanvarghese/',
  github: 'https://github.com/ethanjoby',
  portrait: { src: '/portrait.png', alt: 'Ethan Varghese', width: 562, height: 846 },
  /** Set to a path such as "/resume.pdf" (file in public/) to show a resume link. Empty hides it. */
  resumeUrl: '',
  /** Public URL of the deployed site, used for canonical and Open Graph tags. Empty leaves them out. */
  siteUrl: '',
} as const

/** A run of intro text. A `strong` run (a place he has worked, or what he is aiming at) is set brighter than the rest. */
export type IntroRun = string | { readonly strong: string } | { readonly link: string; readonly href: string }

/**
 * The top section of the page. The intro is the owner's own wording (November 2026), with capitals and punctuation
 * added: a CS major at UC Berkeley who loves building cool things, is interested in RL post-training, AI safety and
 * startups, and wants to hear from people doing something cool who need his help or want to hear about him.
 * One entry per paragraph.
 */
export const about = {
  intro: [
    ['I’m a CS major at UC Berkeley and love building cool things!'],
    [
      'I’m interested in RL post-training, AI safety, and startups. Reach out at ',
      { link: profile.email, href: `mailto:${profile.email}` },
      ' if you’re doing something cool and need my help, or want to hear about me.',
    ],
  ] as readonly (readonly IntroRun[])[],
  primaryCta: { label: 'See the work', href: '#experience' },
  secondaryCta: { label: 'Get in touch', href: '#contact' },
} as const

export const sections = {
  experience: { title: 'Experience', hint: 'Select a company to read more.' },
  projects: { title: 'Projects', hint: 'Select a project to read more.' },
  awards: { title: 'Awards' },
  toolkit: { title: 'Toolkit' },
  contact: {
    title: 'Interested in chatting?',
    body: 'Reach out about agents, research, or a hard engineering problem.',
  },
} as const

export const roles: Role[] = [
  {
    id: 'spacex',
    company: 'SpaceX',
    short: 'SpaceX',
    role: 'Software Engineer Intern',
    team: 'Starshield',
    period: 'Summer 2027',
    year: '2027',
    status: 'incoming',
    logo: '/logos/spacex.svg',
    mark: '/logos/spacex-mark.svg',
    // Nothing but the logo, the role and the "Incoming" tag, at the owner's request: no bullets, no photos.
    description: [],
  },
  {
    id: 'replit',
    company: 'Replit',
    short: 'Replit',
    role: 'Software Engineer Contractor',
    period: 'Aug 2026 to present',
    year: '2026',
    status: 'current',
    logo: '/logos/replit.svg',
    mark: '/logos/replit-mark.svg',
    description: [
      'Built a full-stack analytics platform (React, FastAPI, Supabase) that tracks how **100+ Berkeley students** build agents.',
      'Surfaced ML-driven insights on the student experience and the pitfalls students hit most.',
      'Ran **two live activation sessions** and delivered the findings to Replit’s education leadership, informing product decisions on the agent-building experience.',
    ],
    photos: [
      {
        src: '/photos/replit-1.jpg',
        width: 1600,
        height: 1030,
        alt: 'Five people in a classroom holding cupcakes with small Replit flags, in front of a projected slide with the Replit logo.',
        caption: 'At a Replit event.',
      },
    ],
  },
  {
    id: 'chevron',
    company: 'Chevron',
    short: 'Chevron',
    role: 'Software Engineer Intern',
    team: 'Subsurface and Wells Data Modernization',
    period: 'May to Aug 2026',
    year: '2026',
    status: 'past',
    logo: '/logos/chevron.svg',
    mark: '/logos/chevron-mark.svg',
    description: [
      'Built a GitHub Copilot-like agentic platform for **200+ engineers**, deployed across Chevron’s full petrophysics department.',
      'It lets engineers index **petabytes of subsurface data** (PDFs, LAS, DLIS, PPTX), then query well log structure, draw conclusions and generate visualizations in natural language.',
      'Cut the time spent understanding well data from **80+ hours to 1 to 2 hours**.',
    ],
    photos: [
      {
        src: '/photos/chevron-1.jpg',
        width: 768,
        height: 1376,
        alt: 'A downtown skyline at sunset, seen from a high floor between two glass towers.',
        caption: 'Downtown at sunset.',
        focus: '10% 50%',
      },
      {
        src: '/photos/chevron-2.jpg',
        width: 900,
        height: 1200,
        alt: 'A desk monitor showing a dark web app: a file tree on the left, a scatter plot in the middle and a chat assistant on the right.',
        caption: 'The platform drawing a neutron-density crossplot from a chat request.',
      },
    ],
  },
  {
    id: 'amazon',
    company: 'Amazon',
    short: 'Amazon',
    role: 'Software Engineer, contract',
    period: 'Feb to May 2026',
    year: '2026',
    status: 'past',
    logo: '/logos/amazon.svg',
    description: [
      'Developed an NLP pipeline (TF-IDF, clustering, sentiment analysis) to analyze **100+ employee reviews** from Amazon Fulfillment Centers.',
      'Uncovered the key drivers of **burnout and attrition**.',
      'Built Python and SQL pipelines to surface ML-driven insights on workforce sentiment and retention.',
    ],
    photos: [
      {
        src: '/photos/amazon-1.jpg',
        width: 1280,
        height: 960,
        alt: 'The floor of a fulfillment center seen from above: conveyor belts, packing machines, yellow walkways and bins.',
        caption: 'Inside a fulfillment center.',
      },
      {
        src: '/photos/amazon-2.png',
        width: 1600,
        height: 906,
        alt: 'A spreadsheet of employee reviews, one row per review, with columns for the date, employment status and ratings.',
        caption: 'The employee review data the pipeline analyzed.',
      },
    ],
    mediaHeight: 'text',
  },
  {
    id: 'un',
    company: 'United Nations',
    short: 'UN',
    role: 'Machine Learning Engineer, contract',
    period: 'Feb to Apr 2026',
    year: '2026',
    status: 'past',
    logo: '/logos/un.svg',
    description: [
      'Engineered an AI-powered multilingual research agent for **1,000+ UN journalists** across **20 languages**.',
      'Built the full stack and deployment pipeline (Next.js, TypeScript, Tailwind CSS, FastAPI, Supabase, Vercel), delivering a production-ready tool for global newsroom use.',
    ],
    photos: [
      {
        src: '/photos/un-1.jpg',
        width: 1600,
        height: 1066,
        alt: 'Five people standing together in a kitchen, smiling at the camera.',
        caption: 'With the team.',
      },
      {
        src: '/photos/un-2.jpg',
        width: 1200,
        height: 1600,
        alt: 'Hands holding cupcakes topped with paper United Nations emblems.',
        caption: 'Cupcakes with the United Nations emblem.',
      },
    ],
  },
  {
    id: 'ucsf',
    company: 'UCSF Abbasi Lab',
    short: 'UCSF',
    role: 'Artificial Intelligence Researcher',
    period: 'Sep 2025 to Aug 2026',
    year: '2025',
    status: 'past',
    logo: '/logos/ucsf.svg',
    description: [
      'Contributed to RECITE, a RAG pipeline for automated clinical trial eligibility revision.',
      'Built an **11,913-instance benchmark** from ClinicalTrials.gov and benchmarked 8 LLMs, reaching **85.8% binary equivalence**.',
      'Created an agentic PubMed crawler that identified 44 paper-to-trial matches, with accrual gains of up to **246%**.',
    ],
    photos: [
      {
        src: '/photos/ucsf-1.png',
        width: 1440,
        height: 810,
        alt: 'Title slide: RAG System that expands Eligibility Criteria for Clinical Trial, beside a diagram of a basic RAG pipeline.',
        caption: 'Slides on the retrieval system.',
        link: { href: '/docs/ucsf-rag-slides.pdf', label: 'Open all 9 slides (PDF)' },
      },
    ],
  },
  {
    id: 'adobe',
    company: 'Adobe',
    short: 'Adobe',
    role: 'Software Engineer Contractor',
    period: 'Sep to Dec 2025',
    year: '2025',
    status: 'past',
    logo: '/logos/adobe-lockup.svg',
    mark: '/logos/adobe.svg',
    description: [
      'Built a full-stack invoice automation platform (React, TypeScript, FastAPI) for content creator workflows, with two-way Airtable sync.',
      'Automated PDF contract generation with ReportLab, cutting processing time **35%** across **10K+ contracts a year**.',
    ],
    photos: [
      {
        src: '/photos/adobe-1.jpg',
        width: 1200,
        height: 1200,
        alt: 'Six teammates in a group selfie in front of the Adobe sign on a brick wall.',
        caption: 'With the team at Adobe.',
      },
      {
        src: '/photos/adobe-2.jpg',
        width: 1600,
        height: 1200,
        alt: 'Seven people at a long white table in a cafeteria, smiling for a group selfie over lunch.',
        caption: 'Lunch with the team.',
      },
    ],
  },
  {
    id: 'caltech',
    company: 'Caltech Netlab',
    short: 'Caltech',
    role: 'Engineering Intern',
    period: 'Dec 2023 to Aug 2025',
    year: '2023',
    status: 'past',
    logo: '/logos/caltech.svg',
    description: [
      'Built a real-time outage detection system under Dr. Steven Low that watches campus eGauge meters for voltage deviations and data dropout.',
      'Automated SMS alerts for faculty and validated the system against 8 historical events, with a **95% detection rate**.',
    ],
    video: {
      src: '/videos/caltech-netlab.mp4',
      poster: '/videos/caltech-netlab.jpg',
      width: 1280,
      height: 726,
      caption: 'The outage detection system: live voltage and current across campus meters, and the text alerts it sends.',
    },
    photos: [
      {
        src: '/photos/caltech-2.jpg',
        width: 1200,
        height: 1600,
        alt: 'Three people standing side by side in an office, in front of shelves of journals.',
        caption: 'At the Netlab.',
      },
    ],
  },
  {
    id: 'icuro',
    company: 'ICURO',
    short: 'ICURO',
    role: 'Software Engineer Intern',
    period: 'Summers of 2022 and 2023',
    year: '2022',
    status: 'past',
    logo: '/logos/icuro.png',
    description: [
      '2022: Deployed an AI picking robot (YOLO, LiDAR, RGB-D, semantic segmentation) for real-time object detection, demoed at the **Intel Partner Showcase**.',
      '2023: Engineered an autonomous sanitizing robot (OpenCV, PyTorch) with **94% object classification accuracy** across 10K+ sq ft.',
    ],
    video: {
      src: '/videos/icuro-robot.mp4',
      poster: '/videos/icuro-robot.jpg',
      width: 480,
      height: 848,
      caption: 'The ICURO mobile picking robot at a trade show.',
    },
    videos: [
      {
        src: '/videos/icuro-sanitizer.mp4',
        poster: '/videos/icuro-sanitizer.jpg',
        width: 1280,
        height: 718,
        caption: 'The ICURO sanitizing robot spraying a workstation in an office.',
      },
    ],
  },
]

/**
 * Research first (the alignment recipes, the scaling laws replication, the Transformer from scratch), then the
 * hackathon lab and the prototype, then the three ventures: the order the owner asked for.
 */
export const projects: Project[] = [
  {
    id: 'alignment-recipes',
    name: 'Alignment-preserving post-training recipes',
    pitch: 'Can RL fine-tuning keep its gains without the alignment tax?',
    description:
      'Research in progress. A harness that fine-tunes an aligned model with GRPO on a task built to tempt misbehavior, then measures fabrication, grader gaming, truthfulness, bias and refusals at every checkpoint, so nine training recipes can be compared at matched capability. No results reported yet.',
    role: '',
    period: 'Nov 2026, in progress',
    status: 'Research in progress',
    facts: [
      { value: '9', label: 'training recipes compared' },
      { value: 'GRPO', label: 'on GSM8K with unanswerable problems' },
    ],
    stack: ['Python', 'PyTorch', 'TRL', 'PEFT (LoRA)', 'vLLM'],
    links: [
      {
        label: 'View on GitHub',
        href: 'https://github.com/ethanjoby/Alignment-Preserving-Post-Training-Recipes-for-RL-Fine-Tuned-LLMs',
      },
    ],
    object: 'plot',
  },
  {
    id: 'scaling-laws',
    name: 'Scaling laws, replicated on a laptop',
    pitch: 'Do the scaling laws for language models hold on a laptop?',
    description:
      'A small-scale replication of Kaplan et al. (2020), Scaling Laws for Neural Language Models, on an Apple M4. Thirteen GPT-style models, from 25K to 0.8M non-embedding parameters, were trained on C4. The paper’s qualitative findings reproduce, with exponents in the same range but mostly lower. It is a sanity check of the general picture, not an independent proof.',
    role: '',
    period: 'Nov 2026',
    status: 'Paper replication',
    facts: [
      { value: '13', label: 'GPT-style models trained' },
      { value: '4.4', label: 'GPU-hours on an Apple M4' },
    ],
    stack: ['Python', 'PyTorch', 'NumPy', 'SciPy', 'Matplotlib'],
    links: [{ label: 'View on GitHub', href: 'https://github.com/ethanjoby/scaling_laws_replicated' }],
    object: 'powerLaw',
  },
  {
    id: 'transformer-from-scratch',
    name: 'Transformer from scratch',
    pitch: 'A Transformer language model written layer by layer in PyTorch',
    description:
      'Built for Assignment 1 of Stanford CS336. A decoder-only Transformer language model written from basic tensor operations instead of prebuilt layers: linear and embedding layers, RMSNorm, a SwiGLU feed-forward network, rotary position embeddings, scaled dot-product attention, causal multi-head self-attention, and the pre-norm blocks that stack into the full model.',
    role: '',
    period: 'Nov 2026',
    status: 'Stanford CS336',
    facts: [],
    stack: ['Python', 'PyTorch', 'einops'],
    links: [{ label: 'View on GitHub', href: 'https://github.com/ethanjoby/making-a-transformer-from-scratch' }],
    object: 'layers',
  },
  {
    id: 'ramp-model-labs',
    name: 'Ramp Model Labs',
    pitch: 'One prompt in, a cheap specialist model out',
    description:
      'An automated ML lab that benchmarks classical, fine-tuned (LoRA/QLoRA), and frontier models side by side for financial tasks, then deploys the cheapest model that meets the accuracy threshold. A planner, curator, trainer, judge and deployer run the whole lab from one plain-English prompt.',
    role: '',
    period: 'Oct 2026 to present',
    status: 'Hackathon finalist',
    facts: [
      { value: 'Finalist', label: 'BBS x Ramp Hackathon' },
      { value: '1,000+', label: 'applicants' },
    ],
    stack: ['Python', 'FastAPI', 'PyTorch', 'Transformers', 'LoRA/QLoRA', 'Next.js'],
    links: [{ label: 'View on GitHub', href: 'https://github.com/ethanjoby/Ramp-Model-Labs' }],
    object: 'podium',
  },
  {
    id: 'gitty',
    name: 'Gitty',
    pitch: 'A hiring platform where real pull requests replace the interview',
    description:
      'A prototype built with a collaborator. Engineers practice on open issues from real repositories and interview by shipping pull requests. A FastAPI evaluator pulls the issue and pull request context from GitHub and asks Claude for a structured score and feedback.',
    role: '',
    period: 'Feb to Mar 2026',
    status: 'Prototype',
    facts: [],
    stack: ['React', 'TypeScript', 'Firebase Auth', 'FastAPI', 'Claude', 'Browserbase'],
    links: [
      { label: 'Front end on GitHub', href: 'https://github.com/ethanjoby/gitty' },
      { label: 'Evaluator on GitHub', href: 'https://github.com/ethanjoby/gittybackend' },
    ],
    logo: '/logos/gitty.png',
    object: 'gitGraph',
  },
  {
    id: 'collegestory',
    name: 'CollegeStory.ai',
    pitch: 'Agents that build a student’s story and find opportunities that fit',
    description:
      'An agentic B2B platform for college counseling firms that autonomously builds a student’s narrative and discovers personalized opportunities. Launched across three counseling firms that serve 10K+ students.',
    role: 'Co-founder',
    period: 'Sep 2025 to present',
    status: 'Active startup',
    facts: [
      { value: '3', label: 'counseling firms launched' },
      { value: '10K+', label: 'students served by those firms' },
      { value: 'YC', label: 'waitlisted at Y Combinator' },
    ],
    stack: ['React', 'FastAPI', 'Claude', 'Browserbase', 'LangChain'],
    links: [{ label: 'Visit site', href: 'https://collegestory.vercel.app' }],
    logo: '/logos/collegestory.svg',
    object: 'pages',
  },
  {
    id: 'lingosage',
    name: 'LingoSage',
    pitch: 'AI dubbing that turns a video into a lesson in another language',
    description:
      'An AI language acquisition tool for students, built on a patent-pending multilingual dubbing pipeline that syncs transcription, translation, and audio-video re-encoding. It reached 15K users and was deployed in ESL classrooms.',
    role: 'Co-founder, LingoSage LLC',
    period: 'Dec 2022 to 2025',
    status: 'Startup, 2022 to 2025',
    facts: [
      { value: '15K', label: 'users' },
      { value: 'Patent pending', label: 'multilingual dubbing pipeline' },
    ],
    stack: ['React', 'Flask', 'GCP', 'Docker', 'AssemblyAI', 'Azure TTS', 'OpenAI'],
    links: [{ label: 'Visit site', href: 'https://lingosage.vercel.app' }],
    logo: '/logos/lingosage.png',
    object: 'waveform',
  },
  {
    id: 'origins-customs',
    name: 'Origins Customs',
    pitch: 'Custom apparel and merch, built to order',
    description:
      'A custom-merch business run on a full-stack ordering platform. It generated $70K+ in annual revenue and worked with Wingstop and LegalZoom.',
    role: 'Co-founder',
    period: 'Dec 2023 to Dec 2024',
    status: 'Business, 2023 to 2024',
    facts: [
      { value: '$70K+', label: 'annual revenue' },
      { value: 'Wingstop, LegalZoom', label: 'worked with' },
    ],
    stack: ['React', 'TypeScript', 'Firebase'],
    links: [{ label: 'Visit site', href: 'https://www.originscustoms.com' }],
    logo: '/logos/originscustoms.svg',
    object: 'garment',
  },
]

export const awards: Award[] = [
  {
    title: 'USACO Gold',
    description:
      'Gold division of the USA Computing Olympiad, the national competitive programming contest. Second highest of four divisions, reached by roughly the top 10% of competitors.',
  },
  {
    title: 'Hackswift',
    description: '1st place out of 924 participants in a global online hackathon with a $40K prize pool.',
  },
  {
    title: 'AAE Hackathon',
    description: '1st place out of 158 participants.',
  },
  {
    title: 'Worthy Hacks',
    description: '2nd place out of 177 participants in a virtual hackathon run by the nonprofit WorthyWorks.',
  },
  {
    title: 'YC Startup School',
    description:
      'Selected for Y Combinator’s Startup School in San Francisco, about 6,000 attendees chosen from 30,000+ applicants.',
  },
  {
    title: 'Stanford TreeHacks',
    description: 'Accepted to Stanford’s flagship 36-hour hackathon, which takes about 6% of applicants.',
  },
  {
    title: 'International Biology Bowl',
    description: 'Semi-finalist, top 16 of 300+ teams from around the world.',
  },
  {
    title: 'National Quiz Bowl Championship',
    description: 'Qualified for the high school national championship tournament.',
  },
  {
    title: 'President’s Volunteer Service Award',
    description: 'Gold, the highest annual tier, for 100+ hours of volunteer service in a year.',
  },
]

/** Tools with a mark, shown as 3D coins in the toolkit. Order is the order on the resume. */
export const tools: Tool[] = [
  { name: 'Python', logo: '/logos/python.svg' },
  { name: 'C++', logo: '/logos/cplusplus.svg' },
  { name: 'Java', logo: '/logos/java.svg' },
  { name: 'JavaScript', logo: '/logos/javascript.svg' },
  { name: 'TypeScript', logo: '/logos/typescript.svg' },
  { name: 'React', logo: '/logos/react.svg' },
  { name: 'Next.js', logo: '/logos/nextjs.svg' },
  { name: 'Flask', logo: '/logos/flask.svg' },
  { name: 'FastAPI', logo: '/logos/fastapi.svg' },
  { name: 'Firebase', logo: '/logos/firebase.svg' },
  { name: 'Supabase', logo: '/logos/supabase.svg' },
  { name: 'MongoDB', logo: '/logos/mongodb.svg' },
  { name: 'SQL', logo: '/logos/sql.svg' },
  { name: 'AWS', logo: '/logos/aws.svg' },
  { name: 'Azure', logo: '/logos/azure.svg' },
  { name: 'GCP', logo: '/logos/gcp.svg' },
  { name: 'Docker', logo: '/logos/docker.svg' },
  { name: 'Git', logo: '/logos/git.svg' },
  { name: 'PyTorch', logo: '/logos/pytorch.svg' },
  { name: 'LangChain', logo: '/logos/langchain.svg' },
  { name: 'Databricks', logo: '/logos/databricks.svg' },
]

/** Where else to find him. Each has a white icon in public/logos. */
export const social = [
  { id: 'email', label: 'Email', href: 'mailto:ethanv@berkeley.edu', icon: '/logos/email.svg' },
  { id: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/in/ethanvarghese/', icon: '/logos/linkedin.svg' },
  { id: 'github', label: 'GitHub', href: 'https://github.com/ethanjoby', icon: '/logos/github.svg' },
] as const

export const nav = [
  { label: 'About', href: '#top' },
  { label: 'Experience', href: '#experience' },
  { label: 'Projects', href: '#projects' },
  { label: 'Awards', href: '#awards' },
] as const

export const meta = {
  title: 'Hi I’m Ethan!',
  description:
    'Ethan Varghese is a CS student at UC Berkeley who loves building cool things. Now at Replit, joining SpaceX Starshield in summer 2027.',
} as const
