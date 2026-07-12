"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import FaultyTerminal from "@/components/FaultyTerminal";

const DARK_TINT = "#39ff6a";
const LIGHT_TINT = "#8c6a2e";

const DARK_OPACITY_DEFAULT = 0.2;
const DARK_OPACITY_DIMMED = 0.1;
const LIGHT_OPACITY_DEFAULT = 0.2;
const LIGHT_OPACITY_DIMMED = 0.15;

const MOBILE_DIM_FACTOR = 0.55;

export function SiteBackground() {
  const reduceMotion = useReducedMotion();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isLight, setIsLight] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [pageBackground, setPageBackground] = useState("#0a0a0d");

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => {
      setIsLight(root.getAttribute("data-theme") === "light");
      setPageBackground(getComputedStyle(root).getPropertyValue("--color-void").trim());
    };
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const dimFactor = isMobile && !isLight ? MOBILE_DIM_FACTOR : 1;
  const opacityDefault = (isLight ? LIGHT_OPACITY_DEFAULT : DARK_OPACITY_DEFAULT) * dimFactor;
  const opacityDimmed = (isLight ? LIGHT_OPACITY_DIMMED : DARK_OPACITY_DIMMED) * dimFactor;

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const handleScroll = () => {
      wrapper.style.opacity = String(window.scrollY > 4 ? opacityDimmed : opacityDefault);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [opacityDefault, opacityDimmed]);

  if (reduceMotion) return null;

  return (
    <div
      ref={wrapperRef}
      className="transition-opacity duration-700 ease-out"
      style={{ position: "fixed", inset: 0, zIndex: -10, opacity: opacityDefault }}
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
        tint={isLight ? LIGHT_TINT : DARK_TINT}
        background={pageBackground}
        mouseReact
        mouseStrength={0.2}
        brightness={0.9}
        className=""
        style={undefined}
      />
    </div>
  );
}
