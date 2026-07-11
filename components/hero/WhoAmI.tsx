import { site } from "@/lib/content";

export function WhoAmI() {
  const rows: { key: string; value: React.ReactNode }[] = [
    { key: "focus", value: site.focus.join(" · ") },
    { key: "study", value: site.study },
    { key: "learning", value: site.currentlyLearning },
  ];

  return (
    <dl className="mt-10 space-y-2 font-mono text-base">
      {rows.map((row) => (
        <div key={row.key} className="flex gap-6">
          <dt className="w-16 shrink-0 font-semibold text-ash-dim">{row.key}</dt>
          <dd className="text-ash">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
