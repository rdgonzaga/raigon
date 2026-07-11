"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SpotlightBorder } from "@/components/ui/SpotlightBorder";
import { useRevealVariants } from "@/lib/motion";
import { workExperience, education } from "@/lib/content";

type Tab = "work" | "education";

const TABS: { key: Tab; label: string }[] = [
  { key: "work", label: "work experience" },
  { key: "education", label: "education" },
];

// Bullets use a light `**bold**` markdown convention to call out keywords —
// parsed here rather than at the data layer so `lib/content.ts` stays plain
// strings.
function renderBullet(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-paper">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export function ExperienceSection() {
  const { container, item } = useRevealVariants();
  const [tab, setTab] = useState<Tab>("work");

  const entries = tab === "work" ? workExperience : education;

  return (
    <section id="experience" className="scroll-mt-16 px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Experience"
          title="git log --author=rainer"
          trailing={`${entries.length} entries`}
        />

        <div className="mt-8 flex gap-2 font-mono text-xs">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-pressed={tab === t.key}
              className={`rounded-full border px-4 py-1.5 uppercase tracking-wider transition-colors ${
                tab === t.key
                  ? "border-signal bg-signal/10 text-signal"
                  : "border-line-strong bg-inset text-ash hover:border-signal-dim hover:text-paper"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <SpotlightBorder className="mt-6 rounded-md border border-line bg-panel p-6 sm:p-8">
          <motion.ol
            key={tab}
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: false, margin: "-80px" }}
            className="space-y-8 border-l border-line pl-6"
          >
            {entries.map((entry) => (
              <motion.li key={`${entry.org}-${entry.role}`} variants={item} className="relative">
                <span className="absolute -left-[1.6rem] top-1.5 h-2 w-2 rounded-full border border-signal bg-void" />
                <p className="font-mono text-sm uppercase tracking-wider text-ash">
                  {entry.date}
                  {entry.type ? ` · ${entry.type}` : ""}
                </p>
                <h3 className="mt-1 font-mono text-base font-semibold text-paper">
                  {entry.role} <span className="text-trace">· {entry.org}</span>
                </h3>
                {entry.location && (
                  <p className="mt-1 font-mono text-sm text-ash">{entry.location}</p>
                )}
                <ul className="mt-2 space-y-1">
                  {entry.bullets.map((bullet, i) => (
                    <li key={i} className="flex gap-2 text-sm text-ash">
                      <span className="text-signal">+</span>
                      <span>{renderBullet(bullet)}</span>
                    </li>
                  ))}
                </ul>
              </motion.li>
            ))}
          </motion.ol>
        </SpotlightBorder>
      </div>
    </section>
  );
}
