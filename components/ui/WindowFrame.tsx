import { SpotlightBorder } from "@/components/ui/SpotlightBorder";

type WindowFrameTab = {
  key: string;
  label: string;
};

type WindowFrameProps = {
  tabs: WindowFrameTab[];
  activeTab?: string;
  onTabChange?: (key: string) => void;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

export function WindowFrame({
  tabs,
  activeTab,
  onTabChange,
  children,
  className = "",
  contentClassName = "p-6",
}: WindowFrameProps) {
  const isSwitcher = tabs.length > 1;

  return (
    <SpotlightBorder
      className={`overflow-hidden rounded-md border border-line bg-panel ${className}`}
    >
      <div className="flex items-center justify-between border-b border-line pr-4">
        <div className="flex">
          {tabs.map((tab) =>
            isSwitcher ? (
              <button
                key={tab.key}
                type="button"
                onClick={() => onTabChange?.(tab.key)}
                aria-pressed={tab.key === activeTab}
                className={`border-b-2 px-3 py-2.5 font-mono text-xs transition-colors ${
                  tab.key === activeTab
                    ? "border-signal text-signal"
                    : "border-transparent text-ash-dim hover:text-ash"
                }`}
              >
                {tab.label}
              </button>
            ) : (
              <span
                key={tab.key}
                className="border-b-2 border-transparent px-4 py-2.5 font-mono text-xs text-ash"
              >
                {tab.label}
              </span>
            )
          )}
        </div>
        <span aria-hidden="true" className="text-ash-dim">
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path
              d="M1 1L13 13M13 1L1 13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </div>
      <div className={contentClassName}>{children}</div>
    </SpotlightBorder>
  );
}
