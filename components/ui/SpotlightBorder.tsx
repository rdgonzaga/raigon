"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

type SpotlightBorderProps = {
  children: React.ReactNode;
  className?: string;
};

const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export function SpotlightBorder({ children, className = "" }: SpotlightBorderProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 0.5, 1], [14, 0, -14]);
  const opacity = useTransform(scrollYProgress, [0, 0.25, 0.75, 1], [0, 1, 1, 0], {
    ease: easeInOutQuad,
  });

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
    el.style.setProperty("--spot-y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
  };

  return (
    <motion.div
      ref={ref}
      style={reduceMotion ? undefined : { y, opacity }}
      onPointerMove={handlePointerMove}
      onPointerEnter={() => ref.current?.style.setProperty("--spot-o", "1")}
      onPointerLeave={() => ref.current?.style.setProperty("--spot-o", "0")}
      className={`spotlight-border ${className}`}
    >
      {children}
    </motion.div>
  );
}
