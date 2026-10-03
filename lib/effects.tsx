"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { useReducedMotion } from "framer-motion";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

type EffectsContextValue = {
  enabled: boolean;
  toggle: () => void;
  struggling: boolean;
  reportStruggling: () => void;
};

const EffectsContext = createContext<EffectsContextValue | null>(null);

export function EffectsProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [struggling, setStruggling] = useState(false);
  const reportStruggling = useCallback(() => setStruggling(true), []);

  useIsomorphicLayoutEffect(() => {
    setEnabled(document.documentElement.getAttribute("data-effects") !== "off");
  }, []);

  const toggle = () => {
    setEnabled((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.removeAttribute("data-effects");
      } else {
        document.documentElement.setAttribute("data-effects", "off");
      }
      localStorage.setItem("effects", next ? "on" : "off");
      return next;
    });
  };

  return <EffectsContext.Provider value={{ enabled, toggle, struggling, reportStruggling }}>{children}</EffectsContext.Provider>;
}

export function useEffects() {
  const ctx = useContext(EffectsContext);
  if (!ctx) throw new Error("useEffects must be used within EffectsProvider");
  return ctx;
}

export function useLowMotion() {
  const osReduced = useReducedMotion();
  const { enabled } = useEffects();
  return osReduced || !enabled;
}

/** OS-level reduced-motion signal only — unaffected by the site's own effects toggle. */
export function usePrefersReducedMotion() {
  return useReducedMotion() ?? false;
}
