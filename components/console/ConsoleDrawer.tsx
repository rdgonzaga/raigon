"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { StatusDot } from "@/components/ui/StatusDot";
import { site, skillGroups, projects } from "@/lib/content";
import { usePrefersReducedMotion } from "@/lib/effects";

type OutputContent = string | { label: string; value: string } | { heading: string };
type HistoryEntry =
  | { type: "input"; content: string }
  | { type: "output"; content: OutputContent }
  | { type: "error"; content: string };

type Command = { description: string; run: () => OutputContent[] };

const COMMANDS: Record<string, Command> = {
  help: {
    description: "list available commands",
    run: () => Object.entries(COMMANDS).map(([name, cmd]) => ({ label: name, value: cmd.description })),
  },
  whoami: {
    description: "who's behind this terminal",
    run: () => [
      { label: "user", value: site.name.toLowerCase().replace(/\s+/g, ".") },
      { label: "about", value: site.tagline },
      { label: "focus", value: site.focus.join(", ") },
      { label: "based", value: site.location },
      { label: "learning", value: site.currentlyLearning },
    ],
  },
  skills: {
    description: "technical competencies",
    run: () =>
      skillGroups.flatMap((group, i) => [
        ...(i > 0 ? [""] : []),
        { heading: group.label.toLowerCase() } as OutputContent,
        ...group.items.map((item) => `  ${item}`),
      ]),
  },
  projects: {
    description: "things I've shipped",
    run: () =>
      projects.flatMap((project, i) => [
        ...(i > 0 ? [""] : []),
        { label: project.name, value: project.type } as OutputContent,
        `  ${project.description.split(". ")[0]}.`,
      ]),
  },
  contact: {
    description: "ways to reach me",
    run: () => [
      { label: "email", value: site.email },
      { label: "github", value: site.github },
      { label: "linkedin", value: site.linkedin },
    ],
  },
  sudo: {
    description: "try it",
    run: () => [`${site.handle} is not in the sudoers file. This incident will be reported.`],
  },
  clear: {
    description: "clear the screen",
    run: () => [],
  },
};

const BANNER_TITLE = "raigon";
const BANNER_SUBTITLE = "backend / security / ml";
const BANNER_WIDTH = BANNER_SUBTITLE.length + 2;
const BANNER_TITLE_PREFIX = `- ${BANNER_TITLE} `;

const BANNER: HistoryEntry[] = [
  {
    type: "output",
    content: `+${BANNER_TITLE_PREFIX}${"-".repeat(
      Math.max(BANNER_WIDTH - BANNER_TITLE_PREFIX.length, 0)
    )}+`,
  },
  { type: "output", content: `| ${BANNER_SUBTITLE} |` },
  { type: "output", content: `+${"-".repeat(BANNER_WIDTH)}+` },
  { type: "output", content: "type 'help' to see what's available." },
  { type: "output", content: "press ` to close this console." },
];

function HistoryLine({ entry }: { entry: HistoryEntry }) {
  if (entry.type === "input") {
    return (
      <div className="console-glow text-live">
        <span className="text-live">└─$</span> {entry.content}
      </div>
    );
  }
  if (entry.type === "error") {
    return <div className="text-alert">{entry.content}</div>;
  }
  const content = entry.content;
  if (typeof content === "string") {
    return <div className="console-glow whitespace-pre-wrap text-live">{content}</div>;
  }
  if ("heading" in content) {
    return (
      <div className="console-glow font-semibold uppercase tracking-wider text-live">
        {content.heading}:
      </div>
    );
  }
  return (
    <div className="console-glow flex gap-2">
      <span className="w-24 shrink-0 text-live/70">{content.label}</span>
      <span className="whitespace-pre-wrap text-live/90">{content.value}</span>
    </div>
  );
}

export function ConsoleDrawer() {
  const reduceMotion = usePrefersReducedMotion();
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(BANNER);
  const [input, setInput] = useState("");
  const [commandLog, setCommandLog] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [pulse, setPulse] = useState(false);
  const [showNudge, setShowNudge] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [hasShownDock, setHasShownDock] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dockButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const markSeen = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("raigon-console-seen", "1");
    }
    setShowNudge(false);
  };

  useEffect(() => {
    if (typeof window === "undefined" || hasInteracted) return;
    const timer = setTimeout(() => {
      setPulse(true);
      const seen = window.localStorage.getItem("raigon-console-seen");
      if (!seen) setShowNudge(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [hasInteracted]);

  const close = () => {
    setOpen(false);
    dockButtonRef.current?.focus({ preventScroll: true });
  };

  useEffect(() => {
    if (open) inputRef.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [history]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        setOpen(false);
        dockButtonRef.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "`") return;
      const target = event.target as HTMLElement | null;
      const isTyping =
        target !== inputRef.current &&
        (target?.tagName === "INPUT" ||
          target?.tagName === "TEXTAREA" ||
          target?.isContentEditable);
      if (isTyping) return;

      event.preventDefault();
      setHasInteracted(true);
      markSeen();
      setOpen((o) => !o);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const raw = input.trim();
    if (!raw) return;

    const commandName = raw.toLowerCase().split(/\s+/)[0];
    setCommandLog((log) => [...log, raw]);
    setHistoryIndex(null);
    setInput("");

    if (commandName === "clear") {
      setHistory([]);
      return;
    }

    const inputLine: HistoryEntry = { type: "input", content: raw };
    const command = COMMANDS[commandName];
    const outputLines: HistoryEntry[] = command
      ? [
          { type: "output", content: "" },
          ...command.run().map((line) => ({ type: "output", content: line }) as HistoryEntry),
        ]
      : [
          { type: "output", content: "" },
          {
            type: "error",
            content: `command not found: ${commandName}. type 'help' for a list.`,
          },
        ];

    setHistory((h) => [...h, inputLine, ...outputLines]);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (commandLog.length === 0) return;
      const nextIndex =
        historyIndex === null ? commandLog.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setInput(commandLog[nextIndex]);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (historyIndex === null) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= commandLog.length) {
        setHistoryIndex(null);
        setInput("");
      } else {
        setHistoryIndex(nextIndex);
        setInput(commandLog[nextIndex]);
      }
    }
  };

  return (
    <div className="hidden sm:contents">
      <AnimatePresence>
        {showNudge && !open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            className="fixed bottom-20 right-6 z-50 flex items-center gap-2 rounded-md border border-line-strong bg-panel px-3 py-2 font-mono text-xs text-ash shadow-lg shadow-black/40"
          >
            try <span className="text-signal">~/console</span>
            <span className="text-ash-dim">
              · press <span className="text-base leading-none text-ash">`</span>
            </span>
            <button
              onClick={markSeen}
              aria-label="Dismiss"
              className="-m-2 p-2 text-ash-dim transition-colors hover:text-paper"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!open && (
          <motion.button
            ref={dockButtonRef}
            onClick={() => {
              setOpen(true);
              setPulse(false);
              setHasInteracted(true);
              markSeen();
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{
              delay: hasShownDock || reduceMotion ? 0 : 1.8,
              duration: reduceMotion ? 0 : 0.5,
              ease: [0.16, 1, 0.3, 1],
            }}
            onAnimationComplete={() => setHasShownDock(true)}
            aria-label="Open console (press ` to toggle)"
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border border-line-strong bg-panel px-4 py-2.5 font-mono text-xs text-ash shadow-lg shadow-black/40 transition-colors hover:border-signal/50 hover:text-paper"
          >
            {pulse && (
              <span className="absolute inset-0 animate-ping rounded-full border border-signal" />
            )}
            <StatusDot />
            ~/console
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Interactive console"
            onKeyDown={(event) => {
              if (event.key === "Escape") close();
            }}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={
              reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32 }
            }
            className="fixed inset-x-0 bottom-0 z-50 flex h-[75dvh] w-full flex-col overflow-hidden rounded-t-md border-t border-line-strong bg-panel/95 shadow-2xl shadow-black/50 backdrop-blur-md sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[28rem] sm:max-h-[70dvh] sm:w-[calc(100vw-3rem)] sm:max-w-md sm:rounded-md sm:border"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-center gap-2 font-mono text-xs text-ash">
                <StatusDot />
                {site.handle}@console
              </div>
              <button
                onClick={close}
                aria-label="Close console"
                className="-m-2 p-2 text-ash-dim transition-colors hover:text-paper"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path
                    d="M1 1L13 13M13 1L1 13"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div
              aria-live="polite"
              className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 py-3 font-mono text-[0.8125rem] leading-relaxed"
            >
              {history.map((entry, i) => (
                <motion.div
                  key={i}
                  initial={reduceMotion ? undefined : { opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.12 }}
                >
                  <HistoryLine entry={entry} />
                </motion.div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-line px-4 pt-3 font-mono text-[0.8125rem]">
              <p className="text-live">
                ┌──(guest㉿{site.handle})-[~]
              </p>
              <form onSubmit={handleSubmit} className="flex items-center gap-2 pb-3">
                <span className="text-live">└─$</span>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleInputKeyDown}
                  aria-label="Console command input"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="type 'help'"
                  className="console-input no-focus-ring console-glow flex-1 bg-transparent text-base text-live placeholder:text-ash-dim sm:text-[0.8125rem]"
                />
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
