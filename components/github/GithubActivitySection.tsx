import { SectionHeading } from "@/components/ui/SectionHeading";
import { WindowFrame } from "@/components/ui/WindowFrame";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { site } from "@/lib/content";
import { getGithubActivity, type GithubActivityWeek } from "@/lib/github";

const LEVEL_CLASS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "bg-inset",
  1: "bg-signal/25",
  2: "bg-signal/50",
  3: "bg-signal/75 shadow-[0_0_3px_color-mix(in_srgb,var(--color-signal)_50%,transparent)]",
  4: "bg-signal shadow-[0_0_5px_color-mix(in_srgb,var(--color-signal)_60%,transparent)]",
};

const LEVELS = [0, 1, 2, 3, 4] as const;

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatTitle(date: string, count: number) {
  const [year, month, day] = date.split("-").map(Number);
  const label = `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
  if (count === 0) return `No contributions on ${label}`;
  return `${count} contribution${count === 1 ? "" : "s"} on ${label}`;
}

function monthLabels(weeks: GithubActivityWeek[]) {
  const labels: { weekIndex: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, weekIndex) => {
    const firstDay = week.days[0];
    if (!firstDay) return;
    const month = Number(firstDay.date.split("-")[1]) - 1;
    if (month !== lastMonth) {
      labels.push({ weekIndex, label: MONTH_NAMES[month] });
      lastMonth = month;
    }
  });
  return labels;
}

export async function GithubActivitySection() {
  const activity = await getGithubActivity();

  return (
    <section id="activity" className="scroll-mt-16 px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="GitHub Activity"
          title='git log --since="1 year ago"'
          trailing={activity ? `${activity.totalContributions.toLocaleString()} commits` : undefined}
        />

        <div className="mt-8">
          <WindowFrame tabs={[{ key: "activity", label: "github_activity.log" }]}>
            {activity ? (
              <>
                <div className="relative">
                  <div className="overflow-x-auto pb-1">
                    <div
                      className="grid gap-[3px]"
                      style={{
                        gridTemplateColumns: `repeat(${activity.weeks.length}, minmax(14px, 1fr))`,
                      }}
                    >
                      {monthLabels(activity.weeks).map(({ weekIndex, label }) => (
                        <span
                          key={`${label}-${weekIndex}`}
                          style={{ gridColumn: weekIndex + 1, gridRow: 1 }}
                          className="font-mono text-[11px] text-ash-dim"
                        >
                          {label}
                        </span>
                      ))}
                      {activity.weeks.map((week, weekIndex) =>
                        week.days.map((day, dayIndex) => (
                          <span
                            key={day.date}
                            title={formatTitle(day.date, day.count)}
                            style={{ gridColumn: weekIndex + 1, gridRow: dayIndex + 2 }}
                            className={`aspect-square rounded-[2px] ${LEVEL_CLASS[day.level]}`}
                          />
                        ))
                      )}
                    </div>
                  </div>
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-panel to-transparent sm:hidden"
                  />
                </div>

                <p className="mt-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-ash-dim sm:hidden">
                  swipe to scroll <span className="scroll-hint text-signal">→</span>
                </p>

                <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
                  <div className="flex flex-col gap-2">
                    <p className="console-glow font-mono text-sm text-live">
                      &gt; {activity.totalContributions.toLocaleString()} contributions in the last year
                      <span className="caret-blink text-signal">_</span>
                    </p>
                    <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-ash-dim">
                      less
                      {LEVELS.map((level) => (
                        <span key={level} className={`h-[10px] w-[10px] rounded-[2px] ${LEVEL_CLASS[level]}`} />
                      ))}
                      more
                    </div>
                  </div>
                  <TerminalButton href={site.github} size="sm">
                    open github.com/rdgonzaga
                  </TerminalButton>
                </div>
              </>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="font-mono text-sm text-ash-dim">
                  activity feed offline — check back later
                </p>
                <TerminalButton href={site.github} size="sm">
                  open github.com/rdgonzaga
                </TerminalButton>
              </div>
            )}
          </WindowFrame>
        </div>
      </div>
    </section>
  );
}
