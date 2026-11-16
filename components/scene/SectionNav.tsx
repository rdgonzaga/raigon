"use client";

import { useEffect, useState } from "react";

const SECTIONS = [
  { id: "experience", label: "Experience" },
  { id: "work", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "education", label: "Education" },
  { id: "certifications", label: "Certs" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
];

/** A slim section menu that only appears once the hero has scrolled away. */
export function SectionNav() {
  const [shown, setShown] = useState(false);
  const [active, setActive] = useState("");

  useEffect(() => {
    const hero = document.querySelector(".rg-hero");
    const els = SECTIONS.map(({ id }) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    let raf = 0;
    let lastY = window.scrollY;
    // measured on scroll, not observed: a jump past a section never fires its intersection
    const update = () => {
      raf = 0;
      // phones: the corner buttons step aside while reading down, and return on any scroll up
      const y = window.scrollY;
      if (Math.abs(y - lastY) > 8) {
        document.documentElement.classList.toggle("rg-reading", y > lastY && y > window.innerHeight * 0.6);
        lastY = y;
      }
      const line = window.innerHeight * 0.4;
      const last = els[els.length - 1];
      const pastHero = !!hero && hero.getBoundingClientRect().bottom < window.innerHeight * 0.15;
      // at the end stop the page has gone and the rail would sit over the swing
      const pastEnd = !!last && last.getBoundingClientRect().top < window.innerHeight * 0.35;
      setShown(pastHero && !pastEnd);
      let id = "";
      for (const el of els) if (el.getBoundingClientRect().top <= line) id = el.id;
      setActive(id);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, []);

  return (
    <nav className={`rg-glass rg-secnav${shown ? " is-shown" : ""}`} aria-label="Sections" aria-hidden={!shown}>
      {SECTIONS.map(({ id, label }) => (
        <a key={id} href={`#${id}`} tabIndex={shown ? 0 : -1} aria-current={active === id ? "true" : undefined}>
          {label}
        </a>
      ))}
    </nav>
  );
}
