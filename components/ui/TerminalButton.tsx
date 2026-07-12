"use client";

import { motion } from "framer-motion";

type TerminalButtonProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md";
};

const SIZE_CLASS: Record<"sm" | "md", string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
};

export function TerminalButton({
  href,
  children,
  className = "",
  size = "md",
}: TerminalButtonProps) {
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noreferrer"
      whileTap={{ scale: 0.94 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`group inline-flex items-center gap-2 rounded-[3px] border border-signal/50 bg-panel font-mono text-signal transition-[background-color,box-shadow] active:bg-signal/20 active:shadow-[0_0_14px_color-mix(in_srgb,var(--color-signal)_50%,transparent)] hover:bg-signal/10 ${SIZE_CLASS[size]} ${className}`}
    >
      <span className="text-ash-dim">$</span>
      {children}
      <span className="transition-transform group-hover:translate-x-0.5">→</span>
    </motion.a>
  );
}
