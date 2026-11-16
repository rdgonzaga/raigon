"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/** Fades the page out so the lake can be looked at on its own; scrolling still walks the camera. */
export function ViewToggle() {
  const [bare, setBare] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("rg-bare", bare);
    if (!bare) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setBare(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bare]);

  const label = bare ? "Show the page" : "Hide the page to view the lake";
  return (
    <button type="button" className="rg-glass rg-toggle" onClick={() => setBare(!bare)} aria-label={label} aria-pressed={bare} title={label}>
      {bare ? <Eye size={15} aria-hidden /> : <EyeOff size={15} aria-hidden />}
    </button>
  );
}
