"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";

/** Visual placeholder only — wired up to an actual theme switch next. */
export function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  return (
    <button
      type="button"
      onClick={() => setIsDark((d) => !d)}
      aria-label="Toggle color theme"
      aria-pressed={!isDark}
      className="relative flex h-7 w-14 shrink-0 items-center rounded-full border border-line-strong bg-inset px-1 transition-colors hover:border-signal"
    >
      <motion.span
        className="flex h-5 w-5 items-center justify-center rounded-full bg-signal text-void"
        animate={{ x: isDark ? 0 : 26 }}
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
      >
        {isDark ? <Moon size={11} /> : <Sun size={11} />}
      </motion.span>
    </button>
  );
}
