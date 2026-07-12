"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import FaultyTerminal from "@/components/FaultyTerminal";

// Shader opacity: DEFAULT applies at the top of the page, DIMMED kicks in
// once scrollY > 4 (see the effect below). To retune by hand, just edit
// these two values — DIMMED should stay lower than DEFAULT since the goal
// is to fade the background out of the way once you scroll past the hero.
const OPACITY_DEFAULT = "0.25";
const OPACITY_DIMMED = "0.15";

export function SiteBackground() {
  const reduceMotion = useReducedMotion();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Dim the background as soon as the page scrolls at all, so the texture
  // stays out of the way of everything below the landing screen. Mutates
  // the wrapper's opacity directly via ref rather than React state —
  // FaultyTerminal mounts a WebGL context in an effect keyed on its props
  // (including an unmemoized default array, `gridMul`, which gets a new
  // reference on every render), so re-rendering it on every scroll-driven
  // state change was tearing down and rebuilding the whole renderer,
  // causing a visible stutter.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const handleScroll = () => {
      wrapper.style.opacity = window.scrollY > 4 ? OPACITY_DIMMED : OPACITY_DEFAULT;
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (reduceMotion) return null;

  return (
    <div
      ref={wrapperRef}
      className="transition-opacity duration-700 ease-out"
      style={{ position: "fixed", inset: 0, zIndex: -10, opacity: OPACITY_DEFAULT }}
    >
      <FaultyTerminal
        scale={2.8}
        digitSize={1.3}
        timeScale={0.2}
        scanlineIntensity={0.4}
        glitchAmount={1}
        flickerAmount={1}
        noiseAmp={1}
        chromaticAberration={0.035}
        dither={0.1}
        curvature={0.1}
        tint="#39ff6a"
        mouseReact
        mouseStrength={0.2}
        brightness={0.9}
        className=""
        style={undefined}
      />
    </div>
  );
}
