export const site = {
  name: "Rainer Gonzaga",
  handle: "raigon",
  tagline:
    "Bridging cybersecurity, backend engineering, and machine learning.",
  focus: ["backend engineering", "cybersecurity", "machine learning & ai"],
  location: "Philippines",
  study: "compsci student, major in network & information security @ DLSU",
  status: "software QA & ML specialist @ DeckTradr",
  currentlyLearning:
    "offensive security · image recognition & OCR · supervised machine learning · German",
  email: "rainerdgonzaga@gmail.com",
  github: "https://github.com/rdgonzaga",
  linkedin: "https://www.linkedin.com/in/rdgonzaga/",
};

export const navLinks = [
  { label: "About", href: "#about" },
  { label: "Experience", href: "#experience" },
  { label: "Projects", href: "#work" },
  { label: "Skills", href: "#skills" },
  { label: "Certs", href: "#certifications" },
  { label: "Activity", href: "#activity" },
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
  ext?: string;
};

export const projects: Project[] = [
  {
    slug: "archerbytes",
    name: "ArcherBytes",
    type: "Full-stack platform",
    description:
      "Built the scalable backend architecture for a university-wide knowledge-sharing platform. Designed to handle 20,000+ students with robust content APIs, scalable schemas, and secure authentication.",
    stack: ["Next.js", "TypeScript", "Better Auth", "Drizzle ORM", "PostgreSQL", "Docker"],
    featured: true,
    github: "https://github.com/dlsu-lscs/archerbytes",
  },
  {
    slug: "resole",
    name: "ReSole",
    type: "Mobile / AI marketplace",
    description:
      "AI-powered peer-to-peer marketplace for footwear. Integrates computer vision and multimodal LLMs for automated condition grading and real-time price prediction.",
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
    ],
    inProgress: true,
    github: "https://github.com/rdgonzaga/resole",
  },
  {
    slug: "vibe-coded-website-fuzzer",
    name: "Vibe-Coded Website Fuzzer",
    type: "Security tooling",
    description:
      "Hybrid security scanner designed to audit LLM-generated web applications. Automates the detection of exposed secrets, missing auth controls, and endpoint vulnerabilities.",
    stack: ["Python"],
    inProgress: true,
    github: "https://github.com/rdgonzaga/vibe-coded-website-fuzzer",
    ext: "py",
  },
  {
    slug: "animonotes",
    name: "AnimoNotes",
    type: "Study notes platform",
    description:
      "Centralized academic resource hub for computer science students. Replaces fragmented group chats with a secure, searchable database of verified study materials.",
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
      "Engineered a custom **JS Web Pixel** to bypass Shopify's sandbox for accurate conversion tracking",
      "Established **backend API linkages** connecting Shopify with Google Ads and Analytics",
      "Optimized data pipelines and checkout conversions, driving a **55.97% increase** in total sales",
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
      "**Rank 2 Engineer**, Research & Development committee, A.Y. 2025–2026",
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
    bullets: ["**Graduated with Honors**", "GWA: 94.95 · Manila, Philippines"],
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
    name: "Certified DLSU OffSec Vulnerability Analyst",
    issuer: "DLSU — NSSECU02",
    reference: "Class Ref. S04",
    bullets: [
      "Placed among the **highest scores** in the NSSECU02 (Advanced & Offensive Security) hands-on VAPT class examination",
      "Recognized for competency in **vulnerability analysis**",
    ],
    image: "/certs/certified_offsec_dlsu.png",
  },
];
