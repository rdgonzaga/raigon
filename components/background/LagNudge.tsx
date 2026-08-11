"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useEffects, usePrefersReducedMotion } from "@/lib/effects";

const SEEN_KEY = "raigon-lag-nudge-seen";
const DELAY_MS = 8000;

export function LagNudge() {
  const { enabled, toggle } = useEffects();
  const reduceMotion = usePrefersReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(SEEN_KEY)) return;
    const timer = setTimeout(() => setVisible(true), DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const markSeen = () => {
    window.localStorage.setItem(SEEN_KEY, "1");
    setVisible(false);
  };

  const handleToggle = () => {
    toggle();
    markSeen();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
          className="fixed bottom-6 inset-x-4 z-50 flex items-center gap-3 rounded-md border border-line-strong bg-panel px-4 py-2.5 font-mono text-xs text-ash shadow-lg shadow-black/40 sm:inset-x-auto sm:left-6 sm:right-auto sm:w-auto"
        >
          <span className="text-paper">{enabled ? "Site running slow?" : "Like some flair?"}</span>
          <button
            onClick={handleToggle}
            className="text-signal transition-colors hover:text-paper"
          >
            {enabled ? "Turn off effects" : "Turn on effects"}
          </button>
          <button
            onClick={markSeen}
            aria-label="Dismiss"
            className="-m-2 p-2 text-ash-dim transition-colors hover:text-paper"
          >
            ×
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
