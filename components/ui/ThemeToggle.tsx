"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

    if (typeof document.startViewTransition === "function") {
      const { left, top, width, height } = event.currentTarget.getBoundingClientRect();
      const x = left + width / 2;
      const y = top + height / 2;
      const radius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );
      document.documentElement.style.setProperty("--theme-toggle-x", `${x}px`);
      document.documentElement.style.setProperty("--theme-toggle-y", `${y}px`);
      document.documentElement.style.setProperty("--theme-toggle-r", `${radius}px`);
      document.startViewTransition(applyTheme);
    } else {
      applyTheme();
    }
  };

  return (
    <motion.button
      type="button"
      onClick={toggle}
      aria-label="Toggle color theme"
      aria-pressed={!isDark}
      whileTap={{ scale: 0.9 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="relative flex h-7 w-14 shrink-0 items-center rounded-full border border-line-strong bg-inset px-1 transition-colors hover:border-signal active:border-signal"
    >
      <motion.span
        className="flex h-5 w-5 items-center justify-center rounded-full bg-signal text-void"
        animate={{ x: isDark ? 0 : 26 }}
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
      >
        {isDark ? <Moon size={11} /> : <Sun size={11} />}
      </motion.span>
    </motion.button>
  );
}
