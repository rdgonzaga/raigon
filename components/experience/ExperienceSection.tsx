"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { WindowFrame } from "@/components/ui/WindowFrame";
import { useRevealVariants } from "@/lib/motion";
import { workExperience, education } from "@/lib/content";
import { renderBullet } from "@/lib/renderBullet";

type Tab = "work" | "education";

const TABS: { key: Tab; label: string }[] = [
  { key: "work", label: "work.log" },
  { key: "education", label: "education.log" },
];

export function ExperienceSection() {
  const { container, item } = useRevealVariants();
  const [tab, setTab] = useState<Tab>("work");

  const entries = tab === "work" ? workExperience : education;

  return (
    <Section id="experience">
      <SectionHeading
        eyebrow="Experience"
        title="git log --author=rainer"
        trailing={`${String(entries.length).padStart(2, "0")} entries`}
      />

      <WindowFrame
        tabs={TABS}
        activeTab={tab}
        onTabChange={(key) => setTab(key as Tab)}
        className="mt-8"
        contentClassName="p-6 sm:p-8"
      >
        <motion.ol
          key={tab}
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: false, margin: "-80px" }}
          className="divide-y divide-line"
        >
          {entries.map((entry) => (
            <motion.li
              key={`${entry.org}-${entry.role}`}
              variants={item}
              className="py-6 first:pt-0 last:pb-0"
            >
              <p className="font-mono text-xs lowercase text-ash-dim">
                {entry.date}
                {entry.type ? ` · ${entry.type}` : ""}
              </p>
              <h3 className="mt-1 font-mono text-base font-semibold text-paper">
                {entry.role} <span className="text-trace">· {entry.org}</span>
              </h3>
              {entry.location && (
                <p className="mt-1 font-mono text-xs text-ash">{entry.location}</p>
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
      </WindowFrame>
    </Section>
  );
}
