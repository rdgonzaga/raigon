"use client";

import { useReducedMotion } from "framer-motion";

/** Shared scroll-reveal variants: fade + rise, staggered across children,
 *  collapsing to an instant opacity-only reveal under reduced motion. */
export function useRevealVariants() {
  const reduceMotion = useReducedMotion();

  const container = {
    hidden: {},
    show: {
      transition: { staggerChildren: reduceMotion ? 0 : 0.09 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 16 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: reduceMotion ? 0.01 : 0.5,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  };

  return { container, item };
}
