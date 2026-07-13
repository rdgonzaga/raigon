"use client";

import { useEffect, useState } from "react";
import DecryptedText from "@/components/ui/DecryptedText";
import { useLowMotion } from "@/lib/effects";

const STEPS = ["resolving…", "handshake ok", "status: connected"];
const STEP_MS = 260;

export const HANDSHAKE_TOTAL_MS = (STEPS.length - 1) * STEP_MS + 350;

export function HandshakeSequence() {
  const reduceMotion = useLowMotion();
  const [step, setStep] = useState(0);
  const activeStep = reduceMotion ? STEPS.length - 1 : step;
  const isFinal = activeStep === STEPS.length - 1;

  useEffect(() => {
    if (reduceMotion || isFinal) return;
    const t = setTimeout(() => setStep((s) => s + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [step, isFinal, reduceMotion]);

  return (
    <p className="flex items-center gap-2 font-mono text-sm uppercase tracking-[0.2em] text-signal [[data-theme=light]_&]:font-bold">
      <DecryptedText key={activeStep} text={STEPS[activeStep]} speed={30} sequential animateOn="view" />
      <span className="caret-blink text-signal">_</span>
    </p>
  );
}
