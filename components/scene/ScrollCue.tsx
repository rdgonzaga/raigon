"use client";

import { useEffect, useState } from "react";

export function ScrollCue({ href }: { href: string }) {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const onScroll = () => setGone(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <a className={`rg-cue${gone ? " is-gone" : ""}`} href={href} aria-label="Scroll to the CV">
      <span className="rg-cue-track"><span /></span>
      <span className="rg-cue-label">scroll</span>
    </a>
  );
}
