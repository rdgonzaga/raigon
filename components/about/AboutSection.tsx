"use client";

import { motion } from "framer-motion";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { WindowFrame } from "@/components/ui/WindowFrame";
import { useRevealVariants } from "@/lib/motion";
import { site } from "@/lib/content";

export function AboutSection() {
  const { container, item } = useRevealVariants();

  return (
    <section id="about" className="scroll-mt-16 px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
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
                {site.name} (<span className="text-signal">@{site.handle}</span>) — based in{" "}
                {site.location}, currently a 2nd-year Computer Science student at DLSU, majoring
                in Network and Information Security.
              </p>
            </motion.div>

            <motion.div variants={item} className="mt-8">
              <p className="text-trace">## focus</p>
              <p className="mt-3 leading-relaxed text-ash">{site.focus.join(" · ")}</p>
            </motion.div>

            <motion.div variants={item} className="mt-8">
              <p className="text-trace">## currently</p>
              <ul className="mt-3 space-y-1.5">
                <li className="flex gap-2 text-ash">
                  <span className="text-signal">-</span>
                  <span>Software QA &amp; ML work at DeckTradr</span>
                </li>
                <li className="flex gap-2 text-ash">
                  <span className="text-signal">-</span>
                  <span>Learning {site.currentlyLearning}</span>
                </li>
              </ul>
            </motion.div>
          </WindowFrame>
        </motion.div>
      </div>
    </section>
  );
}
