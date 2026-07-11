"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

const SCRAMBLE_CHARS = "#$%&01_/\\<>[]";

type GlitchTextProps = {
  text: string;
  as?: "span" | "h1" | "h2" | "h3" | "div" | "p";
  className?: string;
  trigger?: "mount" | "hover" | "inView";
  /** ms between each character's lock-in — controls the left-to-right sweep speed */
  charDelayMs?: number;
  /** how long a character scrambles before it locks to its final value */
  cycleMs?: number;
  /** delay before the effect starts, for sequencing after other animations */
  startDelayMs?: number;
};

function randomChar() {
  return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
}

export function GlitchText({
  text,
  as: Tag = "span",
  className,
  trigger = "mount",
  charDelayMs = 28,
  cycleMs = 260,
  startDelayMs = 0,
}: GlitchTextProps) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(text);
  const spanRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(spanRef, { once: false, margin: "-80px" });
  const frameRef = useRef<number | null>(null);
  const playingRef = useRef(false);

  const play = () => {
    if (reduceMotion || playingRef.current) return;
    playingRef.current = true;
    const totalDuration = (text.length - 1) * charDelayMs + cycleMs;
    const start = performance.now() + startDelayMs;

    const tick = (now: number) => {
      const elapsed = now - start;
      if (elapsed < 0) {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }
      let next = "";
      for (let i = 0; i < text.length; i++) {
        if (text[i] === " ") {
          next += " ";
          continue;
        }
        const lockTime = i * charDelayMs + cycleMs;
        next += elapsed >= lockTime ? text[i] : randomChar();
      }
      setDisplay(next);
      if (elapsed < totalDuration) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(text);
        playingRef.current = false;
      }
    };
    frameRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (reduceMotion) return; // nothing to animate — render path shows `text` directly
    if (trigger === "mount") play();
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion, text]);

  useEffect(() => {
    if (trigger === "inView" && inView) play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, trigger]);

  const shownText = reduceMotion ? text : display;

  return (
    <Tag
      className={className}
      aria-label={text}
      onMouseEnter={trigger === "hover" ? play : undefined}
    >
      <span ref={spanRef} aria-hidden="true">
        {shownText}
      </span>
    </Tag>
  );
}
