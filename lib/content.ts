export const site = {
  name: "Rainer Gonzaga",
  handle: "raigon",
  tagline:
    "Bridging backend engineering, cybersecurity, and machine learning.",
  focus: ["backend engineering", "cybersecurity", "machine learning & ai"],
  location: "Philippines",
  study: "compsci student, major in network & information security @ DLSU",
  status: "software developer / cybersecurity specialist",
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
      "Built the backend architecture for a university-wide knowledge-sharing platform. Designed to handle 20,000+ students with robust content APIs, scalable schemas, and secure authentication.",
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
    github: "https://github.com/rdgonzaga/resole",
  },
  {
    slug: "vibe-coded-website-fuzzer",
    name: "PromptPatrol",
    type: "Security tooling",
    description:
      "Hybrid SAST + DAST scanner that audits LLM-generated ('vibe-coded') web apps for the architectural blind spots AI codegen tends to leave behind. Statically greps for hardcoded secrets, unauthenticated routes, and weak JWT config, then dynamically fires live requests to catch IDOR, rate-limiting gaps, and verbose error leaks — scoring every finding with a built-in CVSS v3.1 engine.",
    stack: ["Python"],
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
    date: "Apr 2026 — Aug 2026",
    location: "Phoenix, Arizona, United States · Remote",
    bullets: [
      "Annotated datasets and trained custom **ML models** for **OCR**, image recognition, and **AI card grading**, boosting scanner accuracy **30%+**",
      "Conducted **QA testing** across iOS and web for a **TCG POS & inventory system**, streamlining the support funnel and platform reliability",
      "Automated marketing workflows with **Claude** for AI-driven content generation and **TCG price-trend analysis**",
      "Designed marketing-facing frontend interfaces in **React** and **TypeScript** for campaign and promotional content",
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
      "Established **backend API linkages** connecting Shopify with **Google Merchant Center**, Ads, and Analytics",
      "Performed end-to-end simulated checkout **QA testing** to debug and optimize tracking pipelines",
      "Synthesized multi-platform data to optimize checkout conversions, driving a **55.97% increase** in total sales",
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
    issuer: "NSSECU02",
    reference: "Class Ref. S04",
    bullets: [
      "Placed among the **highest scores** in the NSSECU02 (Advanced & Offensive Security) hands-on class examination",
      "Recognized for competency in **vulnerability analysis**",
    ],
    image: "/certs/certified_offsec_dlsu.webp",
  },
  {
    name: "Junior VAPT Practitioner",
    issuer: "NSSECU02",
    reference: "Certificate of Competency",
    bullets: [
      "Demonstrated foundational competency in **Vulnerability Assessment and Penetration Testing (VAPT)** — recon, enumeration, vulnerability validation, controlled exploitation, and privilege escalation",
      "Certified in **CVSS v3.1 risk assessment**, technical reporting, and presentation of security findings",
    ],
    image: "/certs/junior_vapt_practitioner.webp",
  },
  {
    name: "VAPT Best Presenter",
    issuer: "NSSECU02",
    reference: "Certificate of Appreciation · PromptPatrol (S04 - Group 9)",
    bullets: [
      "Recognized for **outstanding presentation, professionalism, and technical depth** communicating VAPT assessment findings",
      "Awarded at the **VAPT final presentation** for NSSECU02, Aug 2026",
    ],
    image: "/certs/vapt_best_presenter.webp",
  },
  {
    name: "CTF Competition 2026 — Champion",
    issuer: "DLSU Department of Computer Technology",
    reference: "Certificate of Achievement · Team PromptPatrol",
    bullets: [
      "**Champion**, Capture The Flag (CTF) Challenge, for outstanding **teamwork and problem-solving** under NSSECU02 (Advanced & Offensive Security)",
      "Held at Gokongwei Hall, De La Salle University – Manila, Jul 2026",
    ],
    image: "/certs/ctf_champion_2026.webp",
  },
];
