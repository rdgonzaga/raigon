"use client";

import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { WindowFrame } from "@/components/ui/WindowFrame";
import { useRevealVariants } from "@/lib/motion";
import { certifications } from "@/lib/content";
import { renderBullet } from "@/lib/renderBullet";

export function CertificationsSection() {
  const { container, item } = useRevealVariants();

  return (
    <Section id="certifications">
      <SectionHeading
        eyebrow="Certifications"
        title="cat certifications.log"
        trailing={`${String(certifications.length).padStart(2, "0")} earned`}
      />

      <WindowFrame
        tabs={[{ key: "certifications", label: "certifications.log" }]}
        className="mt-8"
        contentClassName="p-6 sm:p-8"
      >
        <motion.ol
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: false, margin: "-80px" }}
          className="divide-y divide-line"
        >
          {certifications.map((cert) => (
            <motion.li key={cert.name} variants={item} className="py-6 first:pt-0 last:pb-0">
              <p className="font-mono text-xs lowercase text-ash-dim">{cert.reference}</p>
              <h3 className="mt-1 font-mono text-base font-semibold text-paper">
                {cert.name} <span className="text-trace">· {cert.issuer}</span>
              </h3>
              <ul className="mt-2 space-y-1">
                {cert.bullets.map((bullet, i) => (
                  <li key={i} className="flex gap-2 text-sm text-ash">
                    <span className="text-signal">+</span>
                    <span>{renderBullet(bullet)}</span>
                  </li>
                ))}
              </ul>
              <a
                href={cert.image}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 font-mono text-xs text-ash transition-colors hover:text-signal"
              >
                <ExternalLink size={13} aria-hidden="true" />
                view certificate
              </a>
            </motion.li>
          ))}
        </motion.ol>

        <p className="mt-6 flex items-center gap-2 border-t border-line pt-6 font-mono text-xs text-ash-dim">
          <span className="rounded-[3px] border border-alert/40 px-1.5 py-0.5 uppercase tracking-wider text-alert">
            in progress
          </span>
          more credentials in cyberrsecurity and cloud soon
        </p>
      </WindowFrame>
    </Section>
  );
}
