"use client";

import { useEffect, useState } from "react";

const SAMPLE_MS = 2500;
const JANK_FPS_THRESHOLD = 40;

export function useJankWatch(active: boolean) {
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    if (!active) return;
    let frames = 0;
    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      frames++;
      const elapsed = now - start;
      if (elapsed >= SAMPLE_MS) {
        const fps = (frames / elapsed) * 1000;
        if (fps < JANK_FPS_THRESHOLD) setDetected(true);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return detected;
}
