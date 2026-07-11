"use client";

import { useRef } from "react";
import { Code } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import type { Project } from "@/lib/content";

type ProjectCardProps = {
  project: Project;
  className?: string;
};

export function ProjectCard({ project, className = "" }: ProjectCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
    el.style.setProperty("--spot-y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
  };

  return (
    <div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerEnter={() => ref.current?.style.setProperty("--spot-o", "1")}
      onPointerLeave={() => ref.current?.style.setProperty("--spot-o", "0")}
      className={`spotlight-border relative flex h-full flex-col rounded-md border border-line bg-panel p-6 transition-colors hover:border-line-strong ${className}`}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-mono text-lg font-semibold text-paper">{project.name}</h3>
          {project.github && (
            <a
              href={project.github}
              target="_blank"
              rel="noreferrer"
              aria-label={`${project.name} on GitHub`}
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 text-ash-dim transition-all hover:scale-110 hover:text-signal"
            >
              <Code size={16} />
            </a>
          )}
        </div>
        <p className="mt-1 font-mono text-xs uppercase tracking-wider text-trace">
          {project.type}
        </p>
        <p className="mt-4 text-sm leading-relaxed text-ash">{project.description}</p>
      </div>

      <div className="mt-6">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ash-dim">
          stack
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {project.stack.map((s) => (
            <Chip key={s}>{s}</Chip>
          ))}
        </div>
      </div>
    </div>
  );
}
