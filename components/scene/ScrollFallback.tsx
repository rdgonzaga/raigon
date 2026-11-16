"use client";

import { useEffect } from "react";

// Mirrors the scroll choreography in site.css for browsers without animation-timeline
// (Firefox, older Safari): the same keyframes, driven from the scroll position.

type Range = (h: number, vh: number) => [number, number]; // rect.top where progress is 0 and 1
type Track = { anim: Animation; el: HTMLElement; range: Range | "root"; rootFrac?: number; top?: number; h?: number; refresh?: (h: number, vh: number) => void };

// page position from layout offsets, so the element's own (animated) transform doesn't skew it
const layoutBox = (el: HTMLElement) => {
  let top = 0;
  for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) top += n.offsetTop;
  return { top, h: el.offsetHeight };
};

const cover = (p: number) => (h: number, vh: number) => vh - p * (vh + h);
const span = (a: (h: number, vh: number) => number, b: (h: number, vh: number) => number): Range => (h, vh) => [a(h, vh), b(h, vh)];

const panelFrames = (offIn: number, offOut: number): Keyframe[] => [
  { offset: 0, opacity: 0, transform: "translateY(48px)" },
  // at rest: no transform at all, so Firefox keeps the glass (backdrop-filter) on the panel
  { offset: offIn, opacity: 1, transform: "none" },
  { offset: offOut, opacity: 1, transform: "none" },
  { offset: 1, opacity: 0, transform: "translateY(-24px)" },
];

export function ScrollFallback() {
  useEffect(() => {
    if (CSS.supports("animation-timeline: view()")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof Element.prototype.animate !== "function") return;

    const tracks: Track[] = [];
    const add = (el: HTMLElement, frames: Keyframe[], range: Track["range"], opts: Partial<Track> = {}) => {
      const anim = el.animate(frames, { duration: 1000, fill: "both", easing: "linear" });
      anim.pause();
      tracks.push({ anim, el, range, ...opts, ...layoutBox(el) });
    };

    const vh0 = window.innerHeight;
    document.querySelectorAll<HTMLElement>(".rg-hero > *").forEach((el) => {
      const end = el.classList.contains("rg-eyebrow") ? 0.55 : el.classList.contains("rg-lead") || el.tagName === "NAV" ? 0.7 : 0.85;
      add(el, [{}, { opacity: 0, transform: "translateY(-14vh) scale(0.94)", filter: "blur(10px)" }], "root", { rootFrac: end });
    });

    // panels: one animation over the whole cover range; the in/out offsets depend on size
    const panelOffsets = (h: number, vh: number) => {
      const m = Math.min(h, vh) / (vh + h);
      return [m, 1 - m] as const;
    };
    document.querySelectorAll<HTMLElement>(".rg-panel, .rg-tab, .rg-job, .rg-card").forEach((el) => {
      const [a, b] = panelOffsets(el.offsetHeight, vh0);
      add(el, panelFrames(a, b), span(cover(0), cover(1)), {
        refresh: (h, vh) => {
          const [x, y] = panelOffsets(h, vh);
          (tracks.find((t) => t.el === el)?.anim.effect as KeyframeEffect | null)?.setKeyframes(panelFrames(x, y));
        },
      });
      el.style.transformOrigin = "50% 100%";
    });


    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      for (const t of tracks) {
        let p: number;
        if (t.range === "root") {
          p = window.scrollY / ((t.rootFrac ?? 1) * vh);
        } else {
          const top = (t.top ?? 0) - window.scrollY;
          const [start, end] = t.range(t.h ?? 0, vh);
          p = (start - top) / (start - end || 1);
        }
        t.anim.currentTime = Math.min(1, Math.max(0, p)) * 1000;
      }
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
    const onResize = () => {
      const vh = window.innerHeight;
      for (const t of tracks) {
        Object.assign(t, layoutBox(t.el));
        t.refresh?.(t.h ?? 0, vh);
      }
      schedule();
    };
    // fonts, the contact form and skill tabs can shift layout after start
    const resizeWatch = new ResizeObserver(onResize);
    resizeWatch.observe(document.body);

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", onResize);
      resizeWatch.disconnect();
      if (raf) cancelAnimationFrame(raf);
      for (const t of tracks) t.anim.cancel();
    };
  }, []);

  return null;
}
