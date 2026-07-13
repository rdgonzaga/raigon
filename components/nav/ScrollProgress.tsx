"use client";

import { motion, useScroll } from "framer-motion";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-y-0 right-0 z-50 w-[2px] bg-line"
    >
      <motion.div className="h-full w-full origin-top bg-signal" style={{ scaleY: scrollYProgress }} />
    </div>
  );
}
