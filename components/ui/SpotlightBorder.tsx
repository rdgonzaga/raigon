"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useLowMotion } from "@/lib/effects";

type SpotlightBorderProps = {
  children: React.ReactNode;
  className?: string;
};

const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

function useSpotlightHandlers(ref: React.RefObject<HTMLDivElement | null>) {
  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
    el.style.setProperty("--spot-y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
  };
  return {
    onPointerMove: handlePointerMove,
    onPointerEnter: () => ref.current?.style.setProperty("--spot-o", "1"),
    onPointerLeave: () => ref.current?.style.setProperty("--spot-o", "0"),
  };
}

function ScrollParallaxCard({ children, className = "" }: SpotlightBorderProps) {
  const ref = useRef<HTMLDivElement>(null);
  const handlers = useSpotlightHandlers(ref);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 0.5, 1], [14, 0, -14]);
  const opacity = useTransform(scrollYProgress, [0, 0.25, 0.75, 1], [0, 1, 1, 0], {
    ease: easeInOutQuad,
  });

  return (
    <motion.div
      ref={ref}
      style={{ y, opacity }}
      {...handlers}
      className={`spotlight-border ${className}`}
    >
      {children}
    </motion.div>
  );
}

function StaticCard({ children, className = "" }: SpotlightBorderProps) {
  const ref = useRef<HTMLDivElement>(null);
  const handlers = useSpotlightHandlers(ref);

  return (
    <div ref={ref} {...handlers} className={`spotlight-border ${className}`}>
      {children}
    </div>
  );
}

export function SpotlightBorder({ children, className = "" }: SpotlightBorderProps) {
  const reduceMotion = useLowMotion();
  const [skipMotion, setSkipMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const update = () => setSkipMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  if (reduceMotion || skipMotion) {
    return <StaticCard className={className}>{children}</StaticCard>;
  }
  return <ScrollParallaxCard className={className}>{children}</ScrollParallaxCard>;
}
