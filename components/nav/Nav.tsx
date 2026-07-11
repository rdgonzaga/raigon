"use client";

import { forwardRef, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { navLinks, site } from "@/lib/content";
import { StatusDot } from "@/components/ui/StatusDot";
import { GlitchText } from "@/components/ui/GlitchText";

type MagneticLinkProps = {
  href: string;
  children: string;
  onMouseEnter?: () => void;
};

const MagneticLink = forwardRef<HTMLAnchorElement, MagneticLinkProps>(
  function MagneticLink({ href, children, onMouseEnter }, ref) {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const springX = useSpring(x, { stiffness: 300, damping: 20, mass: 0.5 });
    const springY = useSpring(y, { stiffness: 300, damping: 20, mass: 0.5 });

    const handleMouseMove = (event: React.MouseEvent<HTMLAnchorElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      x.set((event.clientX - rect.left - rect.width / 2) * 0.3);
      y.set((event.clientY - rect.top - rect.height / 2) * 0.4);
    };

    const handleMouseLeave = () => {
      x.set(0);
      y.set(0);
    };

    return (
      <motion.a
        ref={ref}
        href={href}
        onMouseEnter={onMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ x: springX, y: springY }}
        className="inline-block py-2 text-xs text-ash transition-colors hover:text-paper sm:text-sm"
      >
        <GlitchText text={children} trigger="hover" charDelayMs={18} cycleMs={180} />
      </motion.a>
    );
  }
);

export function Nav() {
  const containerRef = useRef<HTMLUListElement>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [underline, setUnderline] = useState({ x: 0, width: 0, opacity: 0 });

  const moveUnderline = (index: number) => {
    const el = linkRefs.current[index];
    const container = containerRef.current;
    if (!el || !container) return;
    const elRect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    setUnderline({ x: elRect.left - containerRect.left, width: elRect.width, opacity: 1 });
  };

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-line bg-void/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="#top" className="font-mono text-sm tracking-tight text-paper">
          <span className="text-signal">~/</span>
          {site.handle}
        </a>

        <ul
          ref={containerRef}
          className="relative flex items-center gap-3 sm:gap-8"
          onMouseLeave={() => setUnderline((u) => ({ ...u, opacity: 0 }))}
        >
          {navLinks.map((link, i) => (
            <li key={link.href}>
              <MagneticLink
                ref={(el) => {
                  linkRefs.current[i] = el;
                }}
                href={link.href}
                onMouseEnter={() => moveUnderline(i)}
              >
                {link.label}
              </MagneticLink>
            </li>
          ))}
          <motion.span
            className="pointer-events-none absolute bottom-0 h-px bg-signal"
            animate={underline}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          />
        </ul>

        <div className="hidden items-center gap-2 font-mono text-xs text-ash sm:flex">
          <StatusDot />
          {site.status}
        </div>
      </div>
    </header>
  );
}
