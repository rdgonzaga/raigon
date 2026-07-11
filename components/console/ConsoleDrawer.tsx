"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { StatusDot } from "@/components/ui/StatusDot";
import { site, skillGroups, projects } from "@/lib/content";

type HistoryEntry = { type: "input" | "output" | "error"; content: string };

type Command = { description: string; run: () => string[] };

const COMMANDS: Record<string, Command> = {
  help: {
    description: "list available commands",
    run: () =>
      Object.entries(COMMANDS).map(
        ([name, cmd]) => `  ${name.padEnd(10)} ${cmd.description}`
      ),
  },
  whoami: {
    description: "who's behind this terminal",
    run: () => [
      site.name.toLowerCase().replace(/\s+/g, "."),
      site.tagline,
      `focus: ${site.focus.join(", ")}`,
      `based in ${site.location}`,
    ],
  },
  skills: {
    description: "technical competencies",
    run: () =>
      skillGroups.flatMap((group) => [
        `${group.label.toLowerCase()}:`,
        ...group.items.map((item) => `  - ${item}`),
      ]),
  },
  projects: {
    description: "things I've shipped",
    run: () =>
      projects.flatMap((project) => [
        `${project.name} — ${project.type}`,
        `  ${project.description}`,
      ]),
  },
  contact: {
    description: "ways to reach me",
    run: () => [
      `email    ${site.email}`,
      `github   ${site.github}`,
      `linkedin ${site.linkedin}`,
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

const WELCOME: HistoryEntry[] = [
  { type: "output", content: `${site.handle} console — type 'help' to see what's available.` },
];

function HistoryLine({ entry }: { entry: HistoryEntry }) {
  if (entry.type === "input") {
    return (
      <div className="text-paper">
        <span className="text-signal">{"> "}</span>
        {entry.content}
      </div>
    );
  }
  if (entry.type === "error") {
    return <div className="text-alert">{entry.content}</div>;
  }
  return <div className="whitespace-pre-wrap text-ash">{entry.content}</div>;
}

export function ConsoleDrawer() {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(WELCOME);
  const [input, setInput] = useState("");
  const [commandLog, setCommandLog] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const dockButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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
        {!open && (
          <motion.button
            ref={dockButtonRef}
            onClick={() => setOpen(true)}
            initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 12 }}
            transition={{ delay: reduceMotion ? 0 : 1.8, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border border-line-strong bg-panel px-4 py-2.5 font-mono text-xs text-ash shadow-lg shadow-black/40 transition-colors hover:border-signal/50 hover:text-paper"
          >
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
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
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

            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 border-t border-line px-4 py-3"
            >
              <span className="text-signal">{">"}</span>
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
