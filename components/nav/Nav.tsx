"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import { Menu, X } from "lucide-react";
import { navLinks, site } from "@/lib/content";
import DecryptedText from "@/components/ui/DecryptedText";
import { SystemControls } from "@/components/nav/SystemControls";
import { PerformanceNudge } from "@/components/nav/PerformanceNudge";
import { usePrefersReducedMotion } from "@/lib/effects";

type MagneticLinkProps = {
  href: string;
  children: string;
  active?: boolean;
  onMouseEnter?: () => void;
};

const MagneticLink = forwardRef<HTMLAnchorElement, MagneticLinkProps>(
  function MagneticLink({ href, children, active, onMouseEnter }, ref) {
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
        aria-current={active ? "true" : undefined}
        onMouseEnter={onMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ x: springX, y: springY }}
        className={`inline-block py-2 font-mono text-sm transition-colors hover:text-paper ${
          active ? "text-signal" : "text-ash"
        }`}
      >
        <DecryptedText text={children} speed={30} sequential animateOn="hover" />
      </motion.a>
    );
  }
);

function useActiveSection(): number | null {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    const targets = navLinks
      .map((link, index) => {
        const el = document.getElementById(link.href.slice(1));
        return el ? { el, index } : null;
      })
      .filter((t): t is { el: HTMLElement; index: number } => t !== null);

    if (targets.length === 0) return;

    const visible = new Set<number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const target = targets.find((t) => t.el === entry.target);
          if (!target) continue;
          if (entry.isIntersecting) {
            visible.add(target.index);
          } else {
            visible.delete(target.index);
          }
        }
        if (visible.size > 0) {
          setActiveIndex(Math.min(...visible));
        }
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );

    targets.forEach((t) => observer.observe(t.el));
    return () => observer.disconnect();
  }, []);

  return activeIndex;
}

export function Nav() {
  const containerRef = useRef<HTMLUListElement>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [underline, setUnderline] = useState({ x: 0, width: 0, opacity: 0 });
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const reduceMotion = usePrefersReducedMotion();

  const activeIndex = useActiveSection();
  const displayIndex = hoverIndex ?? activeIndex;

  useEffect(() => {
    const container = containerRef.current;
    if (displayIndex === null || !container) {
      setUnderline((u) => ({ ...u, opacity: 0 }));
      return;
    }
    const el = linkRefs.current[displayIndex];
    if (!el) return;
    const elRect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    setUnderline({ x: elRect.left - containerRect.left, width: elRect.width, opacity: 1 });
  }, [displayIndex]);

  const closeMobile = () => {
    setMobileOpen(false);
    menuButtonRef.current?.focus({ preventScroll: true });
  };

  useEffect(() => {
    if (!mobileOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(target)
      ) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileOpen]);

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-line bg-void/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="#top" className="font-mono text-sm tracking-tight text-paper">
          <span className="text-signal">rai@</span>
          {site.handle}
        </a>

        <ul
          ref={containerRef}
          className="relative hidden items-center gap-6 lg:flex"
          onMouseLeave={() => setHoverIndex(null)}
        >
          {navLinks.map((link, i) => (
            <li key={link.href}>
              <MagneticLink
                ref={(el) => {
                  linkRefs.current[i] = el;
                }}
                href={link.href}
                active={displayIndex === i}
                onMouseEnter={() => setHoverIndex(i)}
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

        <div className="flex items-center gap-2 sm:gap-3">
          <SystemControls />
          <PerformanceNudge />
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className="text-ash-dim transition-colors hover:text-paper lg:hidden"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            ref={panelRef}
            onKeyDown={(event) => {
              if (event.key === "Escape") closeMobile();
            }}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-b border-line bg-panel lg:hidden"
          >
            <ul className="flex flex-col px-4 sm:px-6">
              {navLinks.map((link, i) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    aria-current={activeIndex === i ? "true" : undefined}
                    onClick={closeMobile}
                    className={`block border-b border-line py-3 font-mono text-sm last:border-b-0 ${
                      activeIndex === i ? "text-signal" : "text-ash"
                    }`}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
