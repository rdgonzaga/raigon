type ChipProps = {
  children: React.ReactNode;
  tone?: "default" | "trace";
  className?: string;
};

export function Chip({ children, tone = "default", className = "" }: ChipProps) {
  const toneClass =
    tone === "trace"
      ? "border-trace/30 text-trace"
      : "border-line-strong text-paper";

  return (
    <span
      className={`inline-flex items-center rounded-[3px] border px-2 py-0.5 font-mono text-xs uppercase tracking-wider ${toneClass} ${className}`}
    >
      {children}
    </span>
  );
}
