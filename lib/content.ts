const role = "Java Engineer Intern";
const employer = "ING Hubs Philippines";

export const site = {
  name: "Rainer Gonzaga",
  role,
  employer,
  handle: "raigon",
  tagline: "Full-stack and AI engineer, trained in cybersecurity.",
  about: [
    "Network and information security started as my major at DLSU and turned into the thing I explore for fun: how systems get attacked, and how to defend them.",
    "I carry that into what I build, from Java services at ING to ML models and full-stack apps.",
    "Off the keyboard I play badminton, lift, study German, and follow F1 and MotoGP closely enough that I built a model to predict the races.",
  ],
  focus: ["full-stack development", "machine learning & ai", "cybersecurity"],
  location: "Philippines",
  email: "rainerdgonzaga@gmail.com",
  github: "https://github.com/rdgonzaga",
  linkedin: "https://www.linkedin.com/in/rdgonzaga/",
};

export type Project = {
  slug: string;
  name: string;
  type: string;
  description: string;
  stack: string[];
  featured?: boolean;
  inProgress?: boolean;
  /** what I did, for team projects */
  role?: string;
  /** a write-up page on this site */
  caseStudy?: string;
  github?: string;
  live?: string;
  ext?: string;
};

export const projects: Project[] = [
  {
    slug: "f1-prediction",
    name: "Parc Fermé",
    type: "ML / race predictions",
    description:
      "XGBoost model that sets each driver's win, podium, points and DNF odds once qualifying is done, published every race weekend. Since going live it has called 78% of podium finishers, against 56% from the starting grid.",
    stack: ["Python", "XGBoost", "scikit-learn", "pandas", "FastF1", "Jinja2", "GitHub Actions"],
    github: "https://github.com/rdgonzaga/f1-prediction",
    live: "https://f1.raigon.dev",
    caseStudy: "/work/parc-ferme",
    ext: "py",
    featured: true,
  },
  {
    slug: "vibecheck",
    name: "VibeCheck",
    type: "Security tooling",
    description:
      "Hybrid SAST + DAST scanner for AI-generated web apps. Flags hardcoded secrets, unauthenticated routes and weak JWT config, then fuzzes the running app for IDOR, missing rate limits and leaky errors.",
    stack: ["Python", "requests", "PyJWT", "Rich"],
    github: "https://github.com/rdgonzaga/vibecheck",
    ext: "py",
  },
  {
    slug: "resole",
    name: "ReSole",
    type: "Mobile / marketplace",
    description:
      "Marketplace for buying, selling, swapping and donating used sneakers in the Philippines. Gemini checks each listing's condition photos and matches it to known models by embedding search before it goes live.",
    stack: ["React Native (Expo)", "Next.js", "PostgreSQL", "Supabase", "Drizzle", "Gemini"],
    role: "One of three developers: I built the Gemini photo pipeline, the six-angle upload, and the schema and migrations.",
    github: "https://github.com/resole-ph/resole",
  },
  {
    slug: "wordwork",
    name: "wordwork",
    type: "Offline-first PWA",
    description:
      "Daily language study app for German, Italian and Japanese: spaced-repetition flashcards, a der/die/das drill, a study log with streaks and a one-sentence journal. Works offline from IndexedDB and syncs through Supabase.",
    stack: ["React", "TypeScript", "Vite", "Dexie", "Supabase", "PWA"],
    github: "https://github.com/rdgonzaga/wordwork",
    live: "https://wordwork.raigon.dev",
  },
  {
    slug: "animonotes",
    name: "AnimoNotes",
    type: "Student forum",
    description:
      "Note-sharing forum for DLSU students: rich-text posts with votes and bookmarks, threaded comments, polls, messages and reporting tools.",
    stack: ["Next.js", "TypeScript", "Prisma", "PostgreSQL", "Better Auth", "Tiptap"],
    role: "Led the team and built most of the app.",
    github: "https://github.com/rdgonzaga/animonotes",
  },
];

export type SkillGroup = {
  label: string;
  items: string[];
};

export const skillGroups: SkillGroup[] = [
  { label: "Backend", items: ["Java", "Spring Boot", "Python", "Node.js", "PostgreSQL", "SQL", "REST APIs", "FastAPI"] },
  { label: "Payments", items: ["Real-Time Payments", "ISO 20022", "SEPA Credit Transfer", "SEPA Direct Debit"] },
  { label: "Security", items: ["Burp Suite", "Metasploit", "Nmap", "Nessus", "Wireshark", "Kali Linux"] },
  { label: "ML and data", items: ["pandas", "scikit-learn", "XGBoost", "TensorFlow", "NumPy", "Jupyter"] },
  { label: "Frontend", items: ["TypeScript", "React", "Next.js", "React Native", "Tailwind CSS"] },
  { label: "Tooling", items: ["Git", "GitHub Actions", "Docker", "Azure DevOps", "Claude Code"] },
];

export type ExperienceEntry = {
  org: string;
  role: string;
  type?: string;
  /** company website, linked from the org name */
  url?: string;
  date: string;
  location?: string;
  /** the one number that sums the role up, shown large on the site */
  highlight?: { value: string; label: string };
  bullets: string[];
};

export const workExperience: ExperienceEntry[] = [
  {
    org: "ING Hubs Philippines",
    url: "https://inghubsphilippines.com/",
    role: "Java Engineer Intern",
    type: "Internship",
    date: "Oct 2026 — Present",
    location: "Makati, National Capital Region, Philippines · Hybrid",
    bullets: [
      "Run daily **SQL** and **Jupyter** reconciliation reports over **hundreds of GBs** of transaction and balance data, flagging discrepancies for the finance team",
      "Ship features, endpoints, and bug fixes in **Java (Spring Boot)** and **SQL** services alongside senior engineers",
    ],
  },
  {
    org: "DeckTradr",
    url: "https://decktradr.com/",
    role: "AI & Brand Design Engineer",
    type: "Part-time",
    date: "Apr 2026 — Sept 2026",
    location: "Phoenix, Arizona, United States · Remote",
    highlight: { value: "30%+", label: "better card scanner accuracy" },
    bullets: [
      "Annotated datasets and trained custom **ML models** for **OCR**, image recognition, and **AI card grading**, boosting scanner accuracy **30%+**",
      "Conducted **QA testing** across iOS and web builds for a **TCG point-of-sale and inventory system**",
      "Automated marketing workflows with **Claude** for AI-generated content and **TCG price-trend analysis**",
    ],
  },
  {
    org: "Yergoods",
    url: "https://yerkoo.com/",
    role: "Full Stack Shopify Developer",
    type: "Freelance",
    date: "Apr 2026 — Jul 2026",
    location: "Apeldoorn, Gelderland, Netherlands · Remote",
    highlight: { value: "+56%", label: "total sales after the tracking rebuild" },
    bullets: [
      "Analyzed multi-platform data to optimize checkout conversions, contributing to a **56% increase in total sales**",
      "Engineered a custom **JavaScript Web Pixel** within Shopify's sandbox for accurate purchase and conversion tracking",
      "Integrated Shopify with **Google Merchant Center**, Google Ads, and Google Analytics",
    ],
  },
  {
    org: "La Salle Computer Society",
    url: "https://dlsu-lscs.org/",
    role: "Associate Backend Engineer",
    type: "Student organization",
    date: "Sep 2025 — Aug 2026",
    highlight: { value: "20,000+", label: "DLSU students ArcherBytes is built for" },
    bullets: [
      "Architected backend for **ArcherBytes**, built for **20,000+ DLSU students** on **Next.js** + **PostgreSQL**",
      "Designed schemas with **Drizzle ORM** for content, reactions, and community features",
      "Implemented **Better Auth** with Google sign-in restricted to DLSU accounts",
    ],
  },
];

export const education: ExperienceEntry[] = [
  {
    org: "De La Salle University",
    role: "BS Computer Science, Major in Network and Information Security",
    date: "Expected Aug 2028",
    bullets: ["Manila, Philippines"],
  },
  {
    org: "Mapúa University — Senior High School",
    role: "STEM Strand",
    date: "Jul 2024",
    bullets: ["**Graduated with Honors**", "Manila, Philippines"],
  },
];

export type Certification = {
  name: string;
  issuer: string;
  reference: string;
  bullets: string[];
  image: string;
};

export const certifications: Certification[] = [
  {
    name: "CTF Competition 2026 — Champion",
    issuer: "From my Advanced & Offensive Security class at De La Salle University",
    reference: "Certificate of Achievement · Team PromptPatrol",
    bullets: [
      "**Champion**, Capture The Flag (CTF) Challenge, for outstanding **teamwork and problem-solving** under NSSECU02 (Advanced & Offensive Security)",
      "Held at Gokongwei Hall, De La Salle University – Manila, Jul 2026",
    ],
    image: "/certs/ctf_champion_2026.webp",
  },
  {
    name: "Certified DLSU OffSec Vulnerability Analyst",
    issuer: "From my Advanced & Offensive Security class at De La Salle University",
    reference: "Class Ref. S04",
    bullets: [
      "Placed among the **highest scores** in the NSSECU02 (Advanced & Offensive Security) hands-on class examination",
      "Recognized for competency in **vulnerability analysis**",
    ],
    image: "/certs/certified_offsec_dlsu.webp",
  },
  {
    name: "Junior VAPT Practitioner",
    issuer: "From my Advanced & Offensive Security class at De La Salle University",
    reference: "Certificate of Competency",
    bullets: [
      "Demonstrated foundational competency in **Vulnerability Assessment and Penetration Testing (VAPT)** — recon, enumeration, vulnerability validation, controlled exploitation, and privilege escalation",
      "Certified in **CVSS v3.1 risk assessment**, technical reporting, and presentation of security findings",
    ],
    image: "/certs/junior_vapt_practitioner.webp",
  },
  {
    name: "VAPT Best Presenter",
    issuer: "From my Advanced & Offensive Security class at De La Salle University",
    reference: "Certificate of Appreciation · PromptPatrol (S04 - Group 9)",
    bullets: [
      "Recognized for **outstanding presentation, professionalism, and technical depth** communicating VAPT assessment findings",
      "Awarded at the **VAPT final presentation** for NSSECU02, Aug 2026",
    ],
    image: "/certs/vapt_best_presenter.webp",
  },
];
