"use client";

import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { EffectsToggle } from "@/components/ui/EffectsToggle";

export function SystemControls() {
  return (
    <div className="flex items-center overflow-hidden rounded-[3px] border border-line-strong bg-panel font-mono text-[11px] uppercase tracking-wider">
      <ThemeToggle />
      <span aria-hidden="true" className="h-4 w-px shrink-0 bg-line" />
      <EffectsToggle />
    </div>
  );
}
