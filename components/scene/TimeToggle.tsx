"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
};
const isLight = () => document.documentElement.getAttribute("data-theme") === "light";

/** Theme switch: light is the golden morning, dark is the sunset. */
export function TimeToggle() {
  const light = useSyncExternalStore(subscribe, isLight, () => false);

  const toggle = () => {
    if (light) document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", "light");
    try {
      localStorage.setItem("theme", light ? "dark" : "light");
    } catch {}
  };

  const label = `Switch to ${light ? "sunset" : "morning"}`;
  return (
    <button type="button" className="rg-glass rg-toggle" onClick={toggle} aria-label={label} title={label} suppressHydrationWarning>
      {light ? <Moon size={15} aria-hidden /> : <Sun size={15} aria-hidden />}
    </button>
  );
}
