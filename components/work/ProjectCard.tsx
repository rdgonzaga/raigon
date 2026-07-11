"use client";

import { useRef } from "react";
import { Chip } from "@/components/ui/Chip";
import type { Project } from "@/lib/content";

type ProjectCardProps = {
  project: Project;
  className?: string;
};

// lucide-react 1.x dropped brand/logo icons (Github included) in favor of
// generic UI icons only — inlined here rather than pulling in a whole
// second icon package for one mark.
function GithubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.09 3.29 9.4 7.86 10.93.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.34-1.28-1.7-1.28-1.7-1.04-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.02 11.02 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .31.2.67.8.56A10.99 10.99 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
    </svg>
  );
}

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
              <GithubIcon size={16} />
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
