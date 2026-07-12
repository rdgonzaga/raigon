"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Chip } from "@/components/ui/Chip";
import { WindowFrame } from "@/components/ui/WindowFrame";
import { useRevealVariants } from "@/lib/motion";
import { skillGroups } from "@/lib/content";

function toFileName(label: string) {
  return `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}.txt`;
}

export function SkillsSection() {
  const { container, item } = useRevealVariants();

  return (
    <Section id="skills">
      <SectionHeading eyebrow="Skills" title="cat skills.txt" />

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: false, margin: "-80px" }}
        className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {skillGroups.map((group) => (
          <motion.div key={group.label} variants={item}>
            <WindowFrame
              tabs={[{ key: group.label, label: toFileName(group.label) }]}
              className="transition-colors hover:border-line-strong"
            >
              <p className="font-mono text-sm text-trace"># {group.label.toLowerCase()}</p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                {group.items.map((skill) => (
                  <Chip key={skill}>{skill}</Chip>
                ))}
              </div>
            </WindowFrame>
          </motion.div>
        ))}
      </motion.div>
    </Section>
  );
}
