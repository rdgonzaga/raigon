"use client";

import { useEffect, useRef, useState } from "react";
import { useEffects, useLowMotion } from "@/lib/effects";
import { AsciiBackground } from "./AsciiBackground";

const DARK_TINT = "#39ff6a";
const LIGHT_TINT = "#6e4a0c";

const DARK_OPACITY_DEFAULT = 0.5;
const DARK_OPACITY_DIMMED = 0.3;
const LIGHT_OPACITY_DEFAULT = 0.55;
const LIGHT_OPACITY_DIMMED = 0.38;

const MOBILE_DIM_FACTOR = 0.55;

export function SiteBackground() {
  const reduceMotion = useLowMotion();
  const { reportStruggling } = useEffects();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isLight, setIsLight] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => setIsLight(root.getAttribute("data-theme") === "light");
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

  return (
    <div
      ref={wrapperRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 transition-opacity duration-700 ease-out"
      style={{ opacity: opacityDefault }}
    >
      <AsciiBackground
        color={isLight ? LIGHT_TINT : DARK_TINT}
        animate={!reduceMotion}
        pointerEnabled={!isMobile}
        onStruggling={reportStruggling}
      />
    </div>
  );
}
