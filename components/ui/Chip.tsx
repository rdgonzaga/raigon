type ChipProps = {
  children: React.ReactNode;
  className?: string;
};

export function Chip({ children, className = "" }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center rounded-[3px] border border-line-strong px-2 py-0.5 font-mono text-xs uppercase tracking-wider text-paper ${className}`}
    >
      {children}
    </span>
  );
}
