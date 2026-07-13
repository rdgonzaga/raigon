"use client";

import { motion } from "framer-motion";
import { Zap, ZapOff } from "lucide-react";
import { useEffects } from "@/lib/effects";
import { circleViewTransition } from "@/lib/viewTransition";

export function EffectsToggle() {
  const { enabled, toggle } = useEffects();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    circleViewTransition(event, toggle);
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      aria-label="Toggle visual effects"
      aria-pressed={!enabled}
      title={enabled ? "Disable visual effects" : "Enable visual effects"}
      whileTap={{ scale: 0.94 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`flex items-center gap-1 px-2 py-1.5 transition-colors sm:gap-1.5 sm:px-2.5 ${
        enabled
          ? "text-ash-dim hover:bg-signal/5 hover:text-paper"
          : "bg-signal/10 text-signal ring-1 ring-inset ring-signal/30"
      }`}
    >
      {enabled ? <Zap size={12} /> : <ZapOff size={12} />}
      <span>effects</span>
    </motion.button>
  );
}
