"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import DecryptedText from "@/components/ui/DecryptedText";
import { HandshakeSequence, HANDSHAKE_TOTAL_MS } from "./HandshakeSequence";
import { WhoAmI } from "./WhoAmI";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { usePrefersReducedMotion } from "@/lib/effects";

function TextGlow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-4 -inset-y-3 -z-10"
        style={{
          background:
            "radial-gradient(70% 70% at 50% 50%, color-mix(in srgb, var(--color-void) var(--hero-glow-mix), transparent) 0%, transparent 100%)",
        }}
      />
      {children}
    </div>
  );
}

function ScrollCue() {
  const reduceMotion = usePrefersReducedMotion();
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 sm:flex"
      animate={reduceMotion ? { y: 0 } : { y: [0, 8, 0] }}
      transition={{ duration: reduceMotion ? 0 : 2, repeat: reduceMotion ? 0 : Infinity, ease: "easeInOut" }}
    >
      <span className="font-mono text-[0.65rem] uppercase tracking-[0.3em] text-ash-dim">
        scroll
      </span>
      <span className="h-8 w-px bg-line-strong" />
    </motion.div>
  );
}

export function Hero() {
  const reduceMotion = usePrefersReducedMotion();
  const handshakeS = HANDSHAKE_TOTAL_MS / 1000;
  const whoamiDelay = handshakeS + 0.4;
  const buttonDelay = whoamiDelay + 0.35;

  const [headlineReady, setHeadlineReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setHeadlineReady(true), HANDSHAKE_TOTAL_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <section
      id="top"
      className="relative flex min-h-screen scroll-mt-16 flex-col justify-center overflow-hidden px-4 pb-16 pt-24 sm:px-6"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[38%] -z-10 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal opacity-[0.07] blur-[140px]"
      />

      <div className="mx-auto w-full max-w-6xl">
        <HandshakeSequence />

        <h1 className="mt-6 block text-[clamp(2.25rem,7.5vw,5.5rem)] font-bold uppercase leading-[0.95] tracking-[-0.02em] text-paper">
          {headlineReady ? (
            <DecryptedText text="RAINER GONZAGA" speed={30} sequential animateOn="view" />
          ) : (
            "RAINER GONZAGA"
          )}
        </h1>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: reduceMotion ? 0 : whoamiDelay,
            duration: reduceMotion ? 0 : 0.6,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="mt-3 sm:mt-5"
        >
          <TextGlow>
            <WhoAmI />
          </TextGlow>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: reduceMotion ? 0 : buttonDelay,
            duration: reduceMotion ? 0 : 0.6,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="mt-8"
        >
          <TerminalButton href="/Gonzaga_Resume.pdf">./view-resume.pdf</TerminalButton>
        </motion.div>
      </div>

      <ScrollCue />
    </section>
  );
}
