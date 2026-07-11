"use client";

import { motion, useReducedMotion } from "framer-motion";
import { GlitchText } from "@/components/ui/GlitchText";
import { HandshakeSequence, HANDSHAKE_TOTAL_MS } from "./HandshakeSequence";
import { WhoAmI } from "./WhoAmI";
import { site } from "@/lib/content";

function ScrollCue() {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 sm:flex"
      animate={reduceMotion ? undefined : { y: [0, 8, 0] }}
      transition={reduceMotion ? undefined : { duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      <span className="font-mono text-[0.65rem] uppercase tracking-[0.3em] text-ash-dim">
        scroll
      </span>
      <span className="h-8 w-px bg-line-strong" />
    </motion.div>
  );
}

export function Hero() {
  const reduceMotion = useReducedMotion();
  const handshakeS = HANDSHAKE_TOTAL_MS / 1000;
  const taglineDelay = handshakeS + 0.4;
  const whoamiDelay = taglineDelay + 0.35;

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

        <GlitchText
          as="h1"
          text="RAINER GONZAGA"
          trigger="mount"
          startDelayMs={HANDSHAKE_TOTAL_MS}
          charDelayMs={26}
          cycleMs={240}
          className="mt-6 block text-[clamp(2.25rem,7.5vw,5.5rem)] font-bold uppercase leading-[0.95] tracking-[-0.02em] text-paper"
        />

        <motion.p
          initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ delay: taglineDelay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 max-w-xl text-lg text-ash sm:text-xl"
        >
          {site.tagline}
        </motion.p>

        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ delay: whoamiDelay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <WhoAmI />
        </motion.div>

        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ delay: whoamiDelay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8"
        >
          <a
            href="/Gonzaga_Resume.pdf"
            target="_blank"
            rel="noreferrer"
            className="font-mono text-sm text-ash underline decoration-line-strong underline-offset-4 transition-colors hover:text-signal hover:decoration-signal"
          >
            → view résumé
          </a>
        </motion.div>
      </div>

      <ScrollCue />
    </section>
  );
}
