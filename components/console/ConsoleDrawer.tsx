"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { StatusDot } from "@/components/ui/StatusDot";
import { site, skillGroups, projects } from "@/lib/content";

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
      skillGroups.flatMap((group) => [
        { heading: group.label.toLowerCase() } as OutputContent,
        ...group.items.map((item) => `  ${item}`),
      ]),
  },
  projects: {
    description: "things I've shipped",
    run: () =>
      projects.flatMap((project) => [
        { label: project.name, value: project.type } as OutputContent,
        `  ${project.description}`,
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
    run: () => [], // handled as a special case in handleSubmit
  },
};

const BANNER: HistoryEntry[] = [
  { type: "output", content: "┌─ raigon ──────────────────┐" },
  { type: "output", content: "│ network · ml · backend    │" },
  { type: "output", content: "└────────────────────────────┘" },
  { type: "output", content: "type 'help' to see what's available." },
];

function HistoryLine({ entry }: { entry: HistoryEntry }) {
  if (entry.type === "input") {
    return (
      <div className="text-paper">
        <span className="text-live">└─$</span> {entry.content}
      </div>
    );
  }
  if (entry.type === "error") {
    return <div className="text-alert">{entry.content}</div>;
  }
  const content = entry.content;
  if (typeof content === "string") {
    return <div className="whitespace-pre-wrap text-paper">{content}</div>;
  }
  if ("heading" in content) {
    return <div className="mt-1 text-trace">{content.heading}:</div>;
  }
  return (
    <div className="flex gap-2">
      <span className="w-24 shrink-0 text-trace">{content.label}</span>
      <span className="whitespace-pre-wrap text-paper">{content.value}</span>
    </div>
  );
}

export function ConsoleDrawer() {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(BANNER);
  const [input, setInput] = useState("");
  const [commandLog, setCommandLog] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [pulse, setPulse] = useState(false);
  const [showNudge, setShowNudge] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

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

  // Idle nudge: pulse the dock after 5s of no interaction; show a
  // dismissible callout too, but only if this visitor hasn't seen it before.
  // Cancelled entirely once the visitor opens the console at all (hasInteracted),
  // so it can't resurrect after they close a console they've already used —
  // and localStorage is read fresh inside the timeout, not captured at mount,
  // so a markSeen() that happens while the timer is pending is respected.
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

  // Focus the input whenever the drawer opens — preventScroll so a drawer
  // opened deep in the page doesn't yank the viewport back to the top.
  useEffect(() => {
    if (open) inputRef.current?.focus({ preventScroll: true });
  }, [open]);

  // Keep the log scrolled to the latest line.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [history]);

  // Click outside closes the drawer without blocking interaction with the page.
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
      ? command.run().map((line) => ({ type: "output", content: line }))
      : [
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
    <>
      <AnimatePresence>
        {showNudge && !open && (
          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 8 }}
            className="fixed bottom-20 right-6 z-50 flex items-center gap-2 rounded-md border border-line-strong bg-panel px-3 py-2 font-mono text-xs text-ash shadow-lg shadow-black/40"
          >
            try <span className="text-signal">~/console</span>
            <button
              onClick={markSeen}
              aria-label="Dismiss"
              className="text-ash-dim transition-colors hover:text-paper"
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
            initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 12 }}
            transition={{ delay: reduceMotion ? 0 : 1.8, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
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
            initial={reduceMotion ? undefined : { opacity: 0, y: 16, scale: 0.98 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 16, scale: 0.98 }}
            transition={reduceMotion ? undefined : { type: "spring", stiffness: 380, damping: 32 }}
            className="fixed bottom-6 right-6 z-50 flex h-[28rem] w-[calc(100vw-3rem)] max-w-md flex-col overflow-hidden rounded-md border border-line-strong bg-panel/95 shadow-2xl shadow-black/50 backdrop-blur-md max-h-[70vh]"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-center gap-2 font-mono text-xs text-ash">
                <StatusDot />
                {site.handle}@console
              </div>
              <button
                onClick={close}
                aria-label="Close console"
                className="text-ash-dim transition-colors hover:text-paper"
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
                <HistoryLine key={i} entry={entry} />
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-line px-4 pt-3">
              <p className="font-mono text-[0.6875rem] text-live">
                ┌──({site.name.split(" ")[0].toLowerCase()}㉿{site.handle})-[~]
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
                  className="flex-1 bg-transparent font-mono text-sm text-paper outline-none placeholder:text-ash-dim"
                />
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
