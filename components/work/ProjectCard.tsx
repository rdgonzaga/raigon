"use client";

import { useRef } from "react";
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
        <h3 className="font-mono text-lg font-semibold text-paper">{project.name}</h3>
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
