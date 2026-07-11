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
  // TODO(rainer): swap these placeholders for your real contact details.
  email: "hello@example.com",
  github: "https://github.com/your-username",
  linkedin: "https://linkedin.com/in/your-username",
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
};

// Descriptions are inferred from project names/stack given in the brief —
// worth a pass from Rainer to confirm before this goes live.
export const projects: Project[] = [
  {
    slug: "archerbytes",
    name: "ArcherBytes",
    type: "Full-stack platform",
    description:
      "A full-stack web platform built end to end on Next.js, with PostgreSQL for persistence and Better Auth handling sessions.",
    stack: ["Next.js", "TypeScript", "PostgreSQL", "Better Auth"],
    featured: true,
  },
  {
    slug: "animonotes",
    name: "AnimoNotes",
    type: "Study notes platform",
    description:
      "A notes and study-workflow app for La Salle students, sharing ArcherBytes' stack — Next.js, Postgres, and Better Auth.",
    stack: ["Next.js", "TypeScript", "PostgreSQL", "Better Auth"],
  },
  {
    slug: "pinoy-bot",
    name: "Pinoy Bot",
    type: "ML / language ID",
    description:
      "A supervised learning model that identifies Philippine languages and dialects from raw text.",
    stack: ["Python", "Machine Learning"],
  },
];

export type SkillGroup = {
  label: string;
  items: string[];
};

export const skillGroups: SkillGroup[] = [
  {
    label: "Security",
    items: ["Penetration Testing", "Kali Linux", "Wireshark"],
  },
  {
    label: "Engineering",
    items: ["Python", "TypeScript", "Next.js", "PostgreSQL"],
  },
];
