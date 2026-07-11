"use client";

import { useRef } from "react";

type SpotlightBorderProps = {
  children: React.ReactNode;
  className?: string;
};

// Pointer-tracked ring of light along a box's edge (see `.spotlight-border`
// in globals.css). Extracted so every bordered panel — project cards,
// skill groups, experience/about panels — can share one implementation.
export function SpotlightBorder({ children, className = "" }: SpotlightBorderProps) {
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
      className={`spotlight-border ${className}`}
    >
      {children}
    </div>
  );
}
