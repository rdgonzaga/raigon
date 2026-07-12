"use client";

import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { WindowFrame } from "@/components/ui/WindowFrame";
import { useRevealVariants } from "@/lib/motion";

export function AboutSection() {
  const { container, item } = useRevealVariants();

  return (
    <Section id="about">
      <SectionHeading eyebrow="About" title="README.md" />

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: false, margin: "-80px" }}
        className="mt-8"
      >
        <WindowFrame
          tabs={[{ key: "about", label: "about.md" }]}
          contentClassName="p-6 font-mono text-sm sm:p-8"
        >
          <motion.div variants={item}>
            <p className="text-trace"># whoami</p>
            <p className="mt-3 leading-relaxed text-ash">
              I am a Computer Science student at DLSU majoring in Network and Information
              Security. I focus on the intersection of backend engineering, DevSecOps, and
              automation, designing systems where reliable full-stack architecture meets
              proactive security.
            </p>
            <p className="mt-3 leading-relaxed text-ash">
              Currently, I balance my studies with my role as a Software QA &amp; Machine
              Learning Specialist at DeckTradr, where I train custom ML models for image
              recognition and conduct rigorous QA across platform builds.
            </p>
          </motion.div>

          <motion.div variants={item} className="mt-8">
            <p className="text-trace">## focus</p>
            <ul className="mt-3 space-y-1.5">
              <li className="flex gap-2 text-ash">
                <span className="text-signal">-</span>
                <span>
                  Cybersecurity: offensive security, ethical hacking, vulnerability analysis,
                  and penetration testing.
                </span>
              </li>
              <li className="flex gap-2 text-ash">
                <span className="text-signal">-</span>
                <span>Infrastructure: DevSecOps pipeline automation, cloud, and backend engineering.</span>
              </li>
              <li className="flex gap-2 text-ash">
                <span className="text-signal">-</span>
                <span>
                  AI &amp; Workflows: machine learning and AI-enabled tools for developer
                  productivity.
                </span>
              </li>
            </ul>
          </motion.div>

          <motion.div variants={item} className="mt-8">
            <p className="text-trace">## interests</p>
            <p className="mt-3 leading-relaxed text-ash">
              Outside of software engineering, I spend my time running, playing badminton,
              reading books, studying German, and listening to music.
            </p>
          </motion.div>
        </WindowFrame>
      </motion.div>
    </Section>
  );
}
