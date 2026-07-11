"use client";

import { useReducedMotion } from "framer-motion";
import FaultyTerminal from "@/components/FaultyTerminal";

export function SiteBackground() {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return null;

  return (
    <FaultyTerminal
      scale={1.7}
      digitSize={0.9}
      scanlineIntensity={0.4}
      glitchAmount={1}
      flickerAmount={1}
      noiseAmp={1}
      chromaticAberration={0.035}
      dither={0.1}
      curvature={0.1}
      tint="#FFB454"
      mouseReact
      mouseStrength={0.2}
      brightness={0.6}
      dpr={1}
      className="opacity-[0.25]"
      style={{ position: "fixed", inset: 0, zIndex: -10 }}
    />
  );
}
