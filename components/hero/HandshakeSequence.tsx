"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import DecryptedText from "@/components/ui/DecryptedText";

const STEPS = ["resolving…", "handshake ok", "status: connected"];
const STEP_MS = 260;

/** Total time until the final step has fully resolved — pass to whatever
 *  should appear next (the headline) so it starts right on cue. */
export const HANDSHAKE_TOTAL_MS = (STEPS.length - 1) * STEP_MS + 350;

export function HandshakeSequence() {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  // Reduced motion skips straight to the resolved state — derived, not synced
  // via an effect, so there's no extra render in between.
  const activeStep = reduceMotion ? STEPS.length - 1 : step;
  const isFinal = activeStep === STEPS.length - 1;

  useEffect(() => {
    if (reduceMotion || isFinal) return;
    const t = setTimeout(() => setStep((s) => s + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [step, isFinal, reduceMotion]);

  return (
    <p className="flex items-center gap-2 font-mono text-sm uppercase tracking-[0.2em] text-signal">
      <DecryptedText key={activeStep} text={STEPS[activeStep]} speed={50} sequential animateOn="view" />
      <span className="caret-blink text-signal">_</span>
    </p>
  );
}
