"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { circleViewTransition } from "@/lib/viewTransition";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useIsomorphicLayoutEffect(() => {
    setIsDark(document.documentElement.getAttribute("data-theme") !== "light");
  }, []);

  const toggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    const next = isDark ? "light" : "dark";
    const applyTheme = () => {
      setIsDark(!isDark);
      if (next === "light") {
        document.documentElement.setAttribute("data-theme", "light");
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
      localStorage.setItem("theme", next);
    };

    circleViewTransition(event, applyTheme);
  };

  return (
    <motion.button
      type="button"
      onClick={toggle}
      suppressHydrationWarning
      aria-label="Toggle color theme"
      aria-pressed={!isDark}
      whileTap={{ scale: 0.94 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="flex items-center gap-1 px-2 py-1.5 text-ash-dim transition-colors hover:bg-signal/5 hover:text-paper sm:gap-1.5 sm:px-2.5"
    >
      {isDark ? <Moon size={12} /> : <Sun size={12} />}
      <span>{isDark ? "dark" : "light"}</span>
    </motion.button>
  );
}
