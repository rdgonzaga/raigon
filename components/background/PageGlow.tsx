"use client";

import { useLowMotion } from "@/lib/effects";

const GLOW_BACKGROUND = [
  "radial-gradient(26rem 22rem at 0% 40%, color-mix(in srgb, var(--color-signal) 14%, transparent) 0%, transparent 70%)",
  "radial-gradient(26rem 22rem at 100% 64%, color-mix(in srgb, var(--color-signal) 14%, transparent) 0%, transparent 70%)",
  "radial-gradient(26rem 22rem at 0% 88%, color-mix(in srgb, var(--color-signal) 14%, transparent) 0%, transparent 70%)",
].join(", ");

export function PageGlow() {
  const reduceMotion = useLowMotion();

  if (!reduceMotion) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10"
      style={{ background: GLOW_BACKGROUND }}
    />
  );
}
