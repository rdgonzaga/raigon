"use client";

import { useEffect, useRef, useState } from "react";

const targetMode = () =>
  document.documentElement.getAttribute("data-theme") === "light" ? 0 : 1;

type Phase = "loading" | "live" | "still";

/** Live lake scene; a blurred still of the same view stands in while it loads. */
export function MeadowScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [progress, setProgress] = useState(0.04);

  // the page shows once the lake is drawn, or once we know it won't be
  useEffect(() => {
    if (phase !== "loading") document.documentElement.classList.remove("rg-booting");
  }, [phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // ?shot hides everything but the scene (used to render the stills in public/scene); ?shot=morning forces light
    const shot = new URLSearchParams(location.search).get("shot");
    if (shot !== null) document.documentElement.classList.add("rg-shot");
    if (shot === "morning") document.documentElement.setAttribute("data-theme", "light");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.documentElement.classList.remove("rg-booting");
      return;
    }

    let cancelled = false;
    let raf = 0;
    let observer: MutationObserver | undefined;
    let onScroll: (() => void) | undefined;
    const advance = (f: number) => { if (!cancelled) setProgress((p) => Math.max(p, f)); };

    // engine touches window on import
    import("@/lib/meadow/start.js")
      .then(({ startMeadow }) => {
        advance(0.12);
        return startMeadow(canvas, {
          onProgress: advance,
          onFirstFrame: () => { if (!cancelled) { setProgress(1); setPhase("live"); } },
          onContextLost: () => { if (!cancelled) setPhase("loading"); },
          onSlow: () => { if (!cancelled) setPhase("still"); },
        });
      })
      .then((api) => {
        if (cancelled) return;
        // in the morning theme the sun lowers as you read down the page
        let scroll = 0;
        const desired = () => { const base = targetMode(); return base === 0 ? 0.45 * scroll : base; };
        let mode = desired();
        api.setMode(mode);
        const tick = () => {
          const target = desired();
          mode += (target - mode) * 0.06;
          if (Math.abs(target - mode) < 0.004) mode = target;
          api.setMode(mode);
          raf = mode === target ? 0 : requestAnimationFrame(tick);
        };
        observer = new MutationObserver(() => { if (!raf) raf = requestAnimationFrame(tick); });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
        // the camera travels with the page; ?scroll pins it instead (stills)
        if (!new URLSearchParams(location.search).has("scroll")) {
          onScroll = () => {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            scroll = max > 0 ? window.scrollY / max : 0;
            api.setScroll(scroll);
            // setMode redraws the grass colours, so only repaint once the light has moved a step
            if (!raf && Math.abs(desired() - mode) > 0.01) raf = requestAnimationFrame(tick);
          };
          onScroll();
          window.addEventListener("scroll", onScroll, { passive: true });
        }
      })
      .catch((e) => { console.error(e); if (!cancelled) setPhase("still"); }); // no WebGL or a software renderer: the still stays, in focus

    return () => {
      cancelled = true;
      observer?.disconnect();
      if (onScroll) window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className={`rg-scene is-${phase}`} aria-hidden="true">
      <canvas ref={canvasRef} />
      <div className="rg-load">
        <span className="rg-load-label">
          Walking down to the lake <span>{Math.round(progress * 100)}%</span>
        </span>
        <span className="rg-load-track">
          <span className="rg-load-bar" style={{ transform: `scaleX(${progress})` }} />
        </span>
      </div>
      <noscript>
        <style>{".rg-scene::before{filter:none;transform:none}.rg-load{display:none}"}</style>
      </noscript>
    </div>
  );
}
