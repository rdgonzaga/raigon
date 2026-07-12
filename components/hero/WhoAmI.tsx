import { site } from "@/lib/content";

export function WhoAmI() {
  const rows: { key: string; value: React.ReactNode }[] = [
    { key: "focus", value: site.focus.join(" · ") },
    { key: "study", value: site.study },
    { key: "status", value: site.status },
  ];

  return (
    <dl className="space-y-2 font-mono text-sm sm:text-base">
      {rows.map((row) => (
        <div key={row.key} className="flex gap-8">
          <dt className="w-20 shrink-0 font-semibold text-ash-dim">{row.key}</dt>
          <dd className="text-ash">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
