"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import DecryptedText from "@/components/ui/DecryptedText";
import { HandshakeSequence, HANDSHAKE_TOTAL_MS } from "./HandshakeSequence";
import { WhoAmI } from "./WhoAmI";
import { site } from "@/lib/content";
import { TerminalButton } from "@/components/ui/TerminalButton";

// Soft radial fade behind a block of text — enough to lift it off the busy
// animated background without boxing it in a card or border.
function TextGlow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-4 -inset-y-3 -z-10"
        style={{
          background:
            "radial-gradient(70% 70% at 50% 50%, color-mix(in srgb, var(--color-void) 40%, transparent) 0%, transparent 100%)",
        }}
      />
      {children}
    </div>
  );
}

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

  // Manual break before the last clause so it doesn't wrap into a lone
  // orphan word at the container's max-width.
  const [taglineLead, taglineTail] = site.tagline.split(", and ");

  // Headline stays plain text while the handshake sequence plays, then
  // decrypts in right on cue — same sequencing GlitchText's startDelayMs did.
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
          initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ delay: taglineDelay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 max-w-xl"
        >
          <TextGlow>
            <p className="text-lg text-ash sm:text-xl">
              {taglineTail ? (
                <>
                  {taglineLead},
                  <br />
                  and {taglineTail}
                </>
              ) : (
                site.tagline
              )}
            </p>
          </TextGlow>
        </motion.div>

        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ delay: whoamiDelay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8"
        >
          <TextGlow>
            <WhoAmI />
          </TextGlow>
        </motion.div>

        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ delay: whoamiDelay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8"
        >
          <TerminalButton href="/Gonzaga_Resume.pdf">./view-resume.pdf</TerminalButton>
        </motion.div>
      </div>

      <ScrollCue />
    </section>
  );
}
