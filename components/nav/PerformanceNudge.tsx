"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffects, useLowMotion } from "@/lib/effects";
import { useJankWatch } from "@/lib/useJankWatch";

const SEEN_KEY = "raigon-fx-nudge-seen";
const AUTO_DISMISS_MS = 9000;

export function PerformanceNudge() {
  const { enabled, toggle } = useEffects();
  const reduceMotion = useLowMotion();
  const jankDetected = useJankWatch(enabled && !reduceMotion);
  const [seen] = useState(() =>
    typeof window === "undefined" ? true : window.localStorage.getItem(SEEN_KEY) === "1"
  );
  const [dismissed, setDismissed] = useState(false);

  const visible = jankDetected && enabled && !seen && !dismissed;

  const dismiss = () => {
    window.localStorage.setItem(SEEN_KEY, "1");
    setDismissed(true);
  };

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [visible]);

  const handleTurnOff = () => {
    toggle();
    dismiss();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
          className="fixed right-4 top-[4.5rem] z-50 flex items-center gap-2 whitespace-nowrap rounded-[3px] border border-line-strong bg-panel px-3 py-2 font-mono text-xs text-ash shadow-lg shadow-black/40 sm:right-6"
        >
          <span>lagging?</span>
          <button
            type="button"
            onClick={handleTurnOff}
            className="text-signal underline decoration-signal/40 underline-offset-2 transition-colors hover:decoration-signal"
          >
            turn off effects
          </button>
          <button
            type="button"
            onClick={dismiss}
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
