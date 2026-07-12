export const site = {
  name: "Rainer Gonzaga",
  handle: "raigon",
  tagline:
    "Bridging cybersecurity, backend engineering, and machine learning.",
  focus: ["backend engineering", "devsecops", "machine learning & ai"],
  location: "Philippines",
  study: "BS Computer Science (Network & Information Security) @ DLSU",
  status: "active software QA & ML specialist @ DeckTradr",
  currentlyLearning:
    "offensive security · image recognition & OCR · supervised machine learning · German",
  email: "rainerdgonzaga@gmail.com",
  github: "https://github.com/rdgonzaga",
  linkedin: "https://www.linkedin.com/in/rdgonzaga/",
};

export const navLinks = [
  { label: "About", href: "#about" },
  { label: "Projects", href: "#work" },
  { label: "Experience", href: "#experience" },
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
  inProgress?: boolean;
  github?: string;
};

export const projects: Project[] = [
  {
    slug: "archerbytes",
    name: "ArcherBytes",
    type: "Full-stack platform",
    description:
      "Backend architecture and CMS for a knowledge-sharing platform serving 20,000+ DLSU students. REST APIs and PostgreSQL schemas built with Drizzle ORM power articles, comment threads, and reactions, with Google sign-in through Better Auth.",
    stack: ["Next.js", "TypeScript", "Better Auth", "Drizzle ORM", "PostgreSQL", "Docker"],
    featured: true,
    github: "https://github.com/dlsu-lscs/archerbytes",
  },
  {
    slug: "resole",
    name: "ReSole",
    type: "Mobile / AI marketplace",
    description:
      "An AI-powered peer-to-peer marketplace that predicts fair prices for shoe listings and nudges owners to donate to charity after 30 days unsold. Built with React Native (Expo), backed by a TensorFlow-trained LLM — YOLOv8 Nano for shoe detection, Gemini 2.5 Flash and EfficientNet Lite for condition grading.",
    stack: [
      "React Native (Expo)",
      "Next.js",
      "PostgreSQL",
      "Supabase",
      "Better Auth",
      "Drizzle",
      "TensorFlow Lite",
      "YOLOv8 Nano",
      "Gemini 2.5 Flash",
      "EfficientNet Lite",
    ],
    inProgress: true,
    github: "https://github.com/rdgonzaga/resole",
  },
  {
    slug: "vibe-coded-website-fuzzer",
    name: "Vibe-Coded Website Fuzzer",
    type: "Security tooling",
    description:
      "A hybrid security scanner and fuzzer for auditing \"vibe-coded\" apps — code shipped fast via LLMs like ChatGPT or Claude that runs fine but skips real security controls. It scans for hardcoded secrets, missing auth checks, and weak JWT validation, then fuzzes endpoints for IDOR issues, missing rate limits, and leaked stack traces.",
    stack: ["Python"],
    inProgress: true,
    github: "https://github.com/rdgonzaga/vibe-coded-website-fuzzer",
  },
  {
    slug: "animonotes",
    name: "AnimoNotes",
    type: "Study notes platform",
    description:
      "A study-resource hub for CCS students at DLSU, built so classmates could actually find and share notes instead of digging through group chats. Next.js and TypeScript up front, Prisma over PostgreSQL in back, with Better Auth locking access to verified students only.",
    stack: ["Next.js", "TypeScript", "Prisma", "PostgreSQL", "Better Auth"],
    github: "https://github.com/rdgonzaga/animonotes",
  },
];

export type SkillGroup = {
  label: string;
  items: string[];
};

export const skillGroups: SkillGroup[] = [
  {
    label: "Security",
    items: [
      "Kali Linux",
      "Networking",
      "Python Automation",
      "Wireshark",
      "Nessus",
      "Nmap",
      "Burp Suite",
      "Metasploit",
    ],
  },
  {
    label: "Frontend",
    items: [
      "JavaScript",
      "TypeScript",
      "React",
      "Next.js",
      "Tailwind CSS",
      "Styled Components",
      "HTML5/CSS",
      "Vite",
      "ESLint",
      "Prettier",
    ],
  },
  {
    label: "Backend",
    items: [
      "Node.js",
      "Python",
      "Java",
      "C",
      "PHP",
      "Express.js",
      "NestJS",
      "FastAPI",
      "PostgreSQL",
      "MySQL",
      "Prisma",
      "Drizzle",
      "REST",
      "JWT",
    ],
  },
  {
    label: "DevOps / Cloud",
    items: ["GitHub Actions", "GitLab CI", "Docker"],
  },
  {
    label: "AI & Machine Learning",
    items: [
      "TensorFlow",
      "NumPy",
      "pandas",
      "scikit-learn",
      "Anthropic",
      "Antigravity",
      "Claude Code",
      "OpenCode",
    ],
  },
];

export type ExperienceEntry = {
  org: string;
  role: string;
  type?: string;
  date: string;
  location?: string;
  bullets: string[];
};

export const workExperience: ExperienceEntry[] = [
  {
    org: "DeckTradr",
    role: "Software QA & Machine Learning Specialist",
    type: "Part-time",
    date: "Apr 2026 — Present",
    location: "Phoenix, Arizona, United States · Remote",
    bullets: [
      "Trained custom **ML models** for **OCR**, **Card Recognition** and AI grading, boosting scanner accuracy to **40%+**",
      "Conducted **QA testing** across iOS and web for a **TCG POS & inventory system**",
      "Shaped marketing content strategy around **TCG price trends**",
    ],
  },
  {
    org: "Yergoods",
    role: "Full Stack Shopify Developer",
    type: "Freelance",
    date: "Apr 2026 — Jul 2026",
    location: "Apeldoorn, Gelderland, Netherlands · Remote",
    bullets: [
      "Redesigned the **Shopify storefront**, driving a **55.97% increase** in sales",
      "Built **custom API integrations** to speed up backend and page loads",
      "Ran **Google Ads campaigns** with tracking tuned for **ROAS**",
    ],
  },
  {
    org: "La Salle Computer Society",
    role: "Associate Backend Engineer",
    date: "Oct 2024 — Aug 2026",
    bullets: [
      "Architected backend for **ArcherBytes**, serving **20,000+ DLSU students** on **Next.js** + **PostgreSQL**",
      "Designed schemas with **Drizzle ORM** for content, reactions, and community features",
      "Built secure auth via **Better Auth** + **Google Auth** for school-exclusive access",
      "**Rank 2**, R&D committee, A.Y. 2025–2026",
    ],
  },
];

export const education: ExperienceEntry[] = [
  {
    org: "De La Salle University",
    role: "BS Computer Science, Major in Network and Information Security",
    date: "Expected Sep 2028",
    bullets: ["Manila, Philippines"],
  },
  {
    org: "Mapúa University — Senior High School",
    role: "STEM Strand",
    date: "Jul 2024",
    bullets: ["GWA: 94.95 · Manila, Philippines"],
  },
];
