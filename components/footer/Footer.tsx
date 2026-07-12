import { Mail } from "lucide-react";
import { FaGithub, FaLinkedin } from "react-icons/fa";
import { site } from "@/lib/content";
import { ContactForm } from "./ContactForm";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { Chip } from "@/components/ui/Chip";
import { SectionHeading } from "@/components/ui/SectionHeading";

const ENGAGEMENT_TYPES = ["Internship", "Part-time", "Freelance"];

export function Footer() {
  return (
    <footer id="contact" className="scroll-mt-16 border-t border-line bg-void px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="Contact"
              title="Open to backend-heavy full-stack, cybersecurity, and applied ML roles."
              speed={14}
            />

            <div className="mt-6 flex flex-wrap gap-2">
              {ENGAGEMENT_TYPES.map((type) => (
                <Chip key={type}>{type}</Chip>
              ))}
            </div>

            <TerminalButton href="/Gonzaga_Resume.pdf" className="mt-6">
              ./view-resume.pdf
            </TerminalButton>

            <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4 font-mono text-sm">
              <a
                href={`mailto:${site.email}`}
                className="flex items-center gap-2 text-ash transition-colors hover:text-signal"
              >
                <Mail size={15} aria-hidden="true" />
                {site.email}
              </a>
              <a
                href={site.github}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-ash transition-colors hover:text-signal"
              >
                <FaGithub size={15} aria-hidden="true" />
                github
              </a>
              <a
                href={site.linkedin}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-ash transition-colors hover:text-signal"
              >
                <FaLinkedin size={15} aria-hidden="true" />
                linkedin
              </a>
            </div>
          </div>

          <ContactForm />
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-line pt-6 font-mono text-xs text-ash-dim sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
          <p>connection closed · EOF</p>
        </div>
      </div>
    </footer>
  );
}
