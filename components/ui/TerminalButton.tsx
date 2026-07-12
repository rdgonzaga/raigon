type TerminalButtonProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md";
};

const SIZE_CLASS: Record<"sm" | "md", string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
};

// Shared "run a command" style CTA — same shape as ContactForm's submit
// button, reused wherever a link should read as a terminal command rather
// than a generic pill button.
export function TerminalButton({
  href,
  children,
  className = "",
  size = "md",
}: TerminalButtonProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`group inline-flex items-center gap-2 rounded-[3px] border border-signal/50 bg-panel font-mono text-signal transition-colors hover:bg-signal/10 ${SIZE_CLASS[size]} ${className}`}
    >
      <span className="text-ash-dim">$</span>
      {children}
      <span className="transition-transform group-hover:translate-x-0.5">→</span>
    </a>
  );
}
