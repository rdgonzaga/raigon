"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { useRevealVariants } from "@/lib/motion";
import { projects, site } from "@/lib/content";
import { ProjectCard } from "./ProjectCard";

export function ProjectsGrid() {
  const { container, item } = useRevealVariants();
  const featured = projects.find((p) => p.featured) ?? projects[0];
  const rest = projects.filter((p) => p !== featured);

  return (
    <Section id="work">
      <SectionHeading
        eyebrow="Projects"
        title="What I've built"
        trailing={`${String(projects.length).padStart(2, "0")} shipped`}
      />

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: false, margin: "-80px" }}
        className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        <motion.div variants={item} className="md:col-span-3">
          <ProjectCard project={featured} className="md:min-h-[16rem]" />
        </motion.div>
        {rest.map((p) => (
          <motion.div key={p.slug} variants={item}>
            <ProjectCard project={p} className="md:min-h-[16rem]" />
          </motion.div>
        ))}
      </motion.div>

      <div className="mt-8 flex justify-center">
        <TerminalButton href={site.github}>more on github.com/rdgonzaga</TerminalButton>
      </div>
    </Section>
  );
}
