// Single source of truth for site copy. The console reads from the same
// data as the page sections so the two never drift out of sync.

export const site = {
  name: "Rainer Gonzaga",
  handle: "raigon",
  tagline:
    "Bridging network security, machine learning, and scalable backend architecture.",
  focus: ["network security", "machine learning", "backend systems"],
  location: "Philippines",
  status: "available for opportunities",
  currentlyLearning: "German",
  email: "rainerdgonzaga@gmail.com",
  github: "https://github.com/rdgonzaga",
  linkedin: "https://www.linkedin.com/in/rdgonzaga/",
};

export const navLinks = [
  { label: "Work", href: "#work" },
  { label: "Skills", href: "#skills" },
  { label: "Contact", href: "#contact" },
];

export type Project = {
  slug: string;
  name: string;
  type: string;
  description: string;
  stack: string[];
  featured?: boolean;
  // TODO(rainer): replace with each project's real repo URL.
  github?: string;
};

const GITHUB_PLACEHOLDER = "https://github.com/your-username";

export const projects: Project[] = [
  {
    slug: "archerbytes",
    name: "ArcherBytes",
    type: "Full-stack platform",
    description:
      "Backend architecture for a digital knowledge-sharing platform and CMS serving 20,000+ DLSU students — articles, nested comment threads, and reactions on Next.js and PostgreSQL.",
    stack: ["Next.js", "TypeScript", "Drizzle ORM", "PostgreSQL", "Better Auth", "Docker"],
    featured: true,
    github: GITHUB_PLACEHOLDER,
  },
  {
    slug: "animonotes",
    name: "AnimoNotes",
    type: "Study notes platform",
    description:
      "Full-stack study-resource app for College of Computer Studies students at De La Salle University — student-exclusive auth, type-safe frontend, Prisma-backed storage.",
    stack: ["Next.js", "TypeScript", "Prisma", "PostgreSQL", "Better Auth"],
    github: GITHUB_PLACEHOLDER,
  },
  {
    slug: "udp-voip",
    name: "Reliable Data Transfer over UDP",
    type: "Networking / VoIP",
    description:
      "Peer-to-peer VoIP application implementing SIP for call signaling and RTP/RTCP for real-time audio streaming over UDP.",
    stack: ["Python", "SIP", "RTP/RTCP"],
    github: GITHUB_PLACEHOLDER,
  },
  {
    slug: "pinoy-bot",
    name: "Pinoy Bot",
    type: "ML / language ID",
    description:
      "Supervised learning model identifying Filipino code-switched text — custom lexical features, scikit-learn, evaluated across a 70-15-15 split.",
    stack: ["Python", "scikit-learn", "NLP"],
    github: GITHUB_PLACEHOLDER,
  },
];

export type SkillGroup = {
  label: string;
  items: string[];
};

export const skillGroups: SkillGroup[] = [
  {
    label: "Languages",
    items: ["C", "Java", "Python", "JavaScript", "TypeScript"],
  },
  {
    label: "Security",
    items: [
      "Kali Linux",
      "Penetration Testing",
      "Networking",
      "Python Automation",
      "Wireshark",
      "Vulnerability Analysis",
    ],
  },
  {
    label: "Web & Data",
    items: ["Next.js", "HTML5/CSS", "PostgreSQL", "MySQL", "Prisma", "Docker", "Drizzle"],
  },
];

export type ExperienceEntry = {
  org: string;
  role: string;
  date: string;
  bullets: string[];
};

export const experience: ExperienceEntry[] = [
  {
    org: "DeckTradr",
    role: "Software QA & Machine Learning Specialist",
    date: "Apr 2026 — Present",
    bullets: [
      "Annotated datasets and trained custom ML models for OCR and an AI condition grading system, improving scanner accuracy by over 40%",
      "Conducted QA testing across iOS and web builds for a TCG point-of-sale and inventory management system",
      "Collaborated on data-driven marketing initiatives, conceptualizing content strategies based on TCG price trends",
    ],
  },
  {
    org: "La Salle Computer Society",
    role: "Associate Backend Engineer",
    date: "Oct 2024 — Aug 2026",
    bullets: [
      "Architected the backend infrastructure for ArcherBytes, a centralized academic resource platform for 20,000+ DLSU students, using Next.js and PostgreSQL",
      "Designed scalable database schemas with Drizzle ORM for complex content types, user reactions, and community features",
      "Engineered secure authentication by integrating Better Auth with Google Auth for school-exclusive access",
      "Rank 2, Research and Development committee, Term 1 & Term 2, A.Y. 2025–2026",
    ],
  },
  {
    org: "De La Salle University",
    role: "BS Computer Science, Major in Network and Information Security",
    date: "Expected Sep 2028",
    bullets: ["Manila, Philippines"],
  },
  {
    org: "Mapúa University Senior High School Student Council",
    role: "Publicity and Content Committee Supervisor",
    date: "Sep 2022 — Sep 2023",
    bullets: [
      "Supervised a 24-member team producing graphic design materials for the 2022–2023 academic year",
      'Awarded "Best Committee" in 2 of 4 quarters',
    ],
  },
  {
    org: "Mapúa University — Senior High School",
    role: "STEM Strand",
    date: "Jul 2024",
    bullets: ["GWA: 94.95 · Manila, Philippines"],
  },
];
