"use client";

import { motion } from "framer-motion";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useRevealVariants } from "@/lib/motion";
import { projects } from "@/lib/content";
import { ProjectCard } from "./ProjectCard";

export function ProjectsGrid() {
  const { container, item } = useRevealVariants();
  const featured = projects.find((p) => p.featured) ?? projects[0];
  const rest = projects.filter((p) => p !== featured);

  return (
    <section id="work" className="scroll-mt-16 px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Work"
          title="What I've built"
          trailing={`${String(projects.length).padStart(2, "0")} shipped`}
        />

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: false, margin: "-80px" }}
          className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <motion.div variants={item} className="md:col-span-2">
            <ProjectCard project={featured} className="md:min-h-[16rem]" />
          </motion.div>
          {rest.map((p) => (
            <motion.div key={p.slug} variants={item}>
              <ProjectCard project={p} className="md:min-h-[16rem]" />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
