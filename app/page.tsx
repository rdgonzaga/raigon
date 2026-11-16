import "./site.css";
import { ArrowUpRight } from "lucide-react";
import { MeadowScene } from "@/components/scene/MeadowScene";
import { TimeToggle } from "@/components/scene/TimeToggle";
import { ViewToggle } from "@/components/scene/ViewToggle";
import { SectionNav } from "@/components/scene/SectionNav";
import { GlassContactForm } from "@/components/scene/GlassContactForm";
import { ScrollCue } from "@/components/scene/ScrollCue";
import { SkillList } from "@/components/scene/SkillList";
import { ProjectCard } from "@/components/scene/ProjectCard";
import { ScrollFallback } from "@/components/scene/ScrollFallback";
import { JobStack } from "@/components/scene/JobStack";
import { certifications, education, projects, site } from "@/lib/content";
import { latestRace } from "@/lib/parcferme";

// the Parc Fermé line refreshes hourly
export const revalidate = 3600;

const CV = "/cv";
const ext = { target: "_blank", rel: "noopener noreferrer" } as const;
const [firstName, ...restOfName] = site.name.split(" ");

export default async function Home() {
  const latest = await latestRace();
  return (
    <div className="rg">
      <MeadowScene />
      <SectionNav />
      <div className="rg-bar">
        <ViewToggle />
        <TimeToggle />
      </div>
      <ScrollFallback />
      <p className="rg-credit">
        scene engine · <a href="https://www.andreelias.dev/en" {...ext}>André Elias</a>
      </p>

      <main>
        <header className="rg-hero">
          <p className="rg-eyebrow">
            {site.role} at {site.employer}
          </p>
          <h1>
            {firstName}{" "}
            <br />
            {restOfName.join(" ")}
          </h1>
          <p className="rg-lead">{site.tagline}</p>
          <nav aria-label="Links">
            <a href={CV} {...ext}>CV</a>
            <a href={site.github} {...ext}>GitHub</a>
            <a href={site.linkedin} {...ext}>LinkedIn</a>
            <a href={`mailto:${site.email}`}>Email</a>
          </nav>
          <ScrollCue href="#experience" />
        </header>

        <section id="experience">
          <div className="rg-tabrow">
            <h2 className="rg-glass rg-tab">Experience</h2>
            <a className="rg-dl" href={CV} {...ext}>Open CV <ArrowUpRight aria-hidden /></a>
          </div>
          <JobStack />
        </section>

        <section id="work" className="rg-projects">
          <div className="rg-tabrow">
            <h2 className="rg-glass rg-tab">Projects</h2>
            <a className="rg-dl" href={site.github} {...ext}>More on GitHub <ArrowUpRight aria-hidden /></a>
          </div>
          <div className="rg-grid">
            {projects.map((project) => (
              <ProjectCard project={project} key={project.slug} latest={project.slug === "f1-prediction" ? latest : undefined} />
            ))}
          </div>
        </section>

        <section id="skills" className="rg-glass rg-panel">
          <h2>Skills</h2>
          <SkillList />
        </section>

        <section id="education" className="rg-glass rg-panel">
          <h2>Education</h2>
          {education.map((school) => (
            <div className="rg-row" key={school.org}>
              <h3>{school.org}</h3>
              <span className="rg-when">{school.date}</span>
              <p className="rg-org">{school.role}</p>
            </div>
          ))}
        </section>

        <section id="certifications" className="rg-glass rg-panel">
          <h2>Certifications and awards</h2>
          {/* one row per course: the awards from one class read as one achievement, not four */}
          {Object.entries(Object.groupBy(certifications, (cert) => cert.issuer)).map(([issuer, certs]) => (
            <div className="rg-row" key={issuer}>
              <h3>{issuer}</h3>
              <ul>
                {certs?.map((cert) => <li key={cert.name}>{cert.name}</li>)}
              </ul>
            </div>
          ))}
        </section>

        <section id="about" className="rg-glass rg-panel">
          <h2>About</h2>
          <p className="rg-about">{site.about.join(" ")}</p>
        </section>

        <section id="contact" className="rg-glass rg-panel">
          <h2>Get in touch</h2>
          <p className="rg-intro">
            Write here, or email <a href={`mailto:${site.email}`}>{site.email}</a>.
          </p>
          <GlassContactForm />
        </section>
      </main>
    </div>
  );
}
