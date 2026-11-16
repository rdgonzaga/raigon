import type { Project } from "@/lib/content";
import { raceLine, type LatestRace } from "@/lib/parcferme";

const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

export function ProjectCard({ project, latest }: { project: Project; latest?: LatestRace | null }) {
  return (
    <article className="rg-glass rg-card">
      <h3>{project.name}</h3>
      <p className="rg-org">{project.type}</p>
      <p className="rg-desc">{project.description}</p>
      {project.role && <p className="rg-mine">{project.role}</p>}
      {latest && (
        <p className="rg-live">
          <a href={latest.url} {...ext}>{raceLine(latest)}</a>
        </p>
      )}
      <p className="rg-stack">{project.stack.join(", ")}</p>
      <p className="rg-card-links">
        {project.caseStudy && <a href={project.caseStudy} {...ext}>Case study</a>}
        {project.live && <a href={project.live} {...ext}>Live site</a>}
        {project.github && <a href={project.github} {...ext}>Source</a>}
      </p>
    </article>
  );
}
