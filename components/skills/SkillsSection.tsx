"use client";

import { motion } from "framer-motion";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Chip } from "@/components/ui/Chip";
import { SpotlightBorder } from "@/components/ui/SpotlightBorder";
import { useRevealVariants } from "@/lib/motion";
import { skillGroups } from "@/lib/content";

export function SkillsSection() {
  const { container, item } = useRevealVariants();

  return (
    <section id="skills" className="scroll-mt-16 px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <SectionHeading eyebrow="Skills" title="Two disciplines, one stack" />

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: false, margin: "-80px" }}
          className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          {skillGroups.map((group) => (
            <motion.div key={group.label} variants={item}>
              <SpotlightBorder className="rounded-md border border-line bg-panel p-6 transition-colors hover:border-line-strong">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-trace">
                  {group.label}
                </p>
                <div className="mt-5 flex flex-wrap gap-2.5">
                  {group.items.map((skill) => (
                    <Chip key={skill}>{skill}</Chip>
                  ))}
                </div>
              </SpotlightBorder>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
