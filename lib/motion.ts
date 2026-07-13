"use client";

import type { Transition, Variants } from "framer-motion";
import { useLowMotion } from "./effects";

const REVEAL_CONTAINER: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

const REVEAL_ITEM: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } as Transition,
  },
};

const REVEAL_PROPS_MOTION = {
  initial: "hidden" as const,
  whileInView: "show" as const,
  viewport: { once: false, margin: "-80px" },
};

const REVEAL_PROPS_STATIC = {
  animate: "show" as const,
};

export function useRevealVariants() {
  const reduceMotion = useLowMotion();

  return {
    container: REVEAL_CONTAINER,
    item: REVEAL_ITEM,
    reveal: reduceMotion ? REVEAL_PROPS_STATIC : REVEAL_PROPS_MOTION,
  };
}
