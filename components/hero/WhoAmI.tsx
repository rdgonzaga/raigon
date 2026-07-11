import { site } from "@/lib/content";
import { StatusDot } from "@/components/ui/StatusDot";

export function WhoAmI() {
  const rows: { key: string; value: React.ReactNode }[] = [
    { key: "user", value: site.name.toLowerCase().replace(/\s+/g, ".") },
    { key: "focus", value: site.focus.join(" · ") },
    {
      key: "status",
      value: (
        <span className="inline-flex items-center gap-2">
          <StatusDot />
          {site.status} — {site.location}
        </span>
      ),
    },
    { key: "learning", value: site.currentlyLearning },
  ];

  return (
    <dl className="mt-10 space-y-2 font-mono text-sm">
      {rows.map((row) => (
        <div key={row.key} className="flex gap-4">
          <dt className="w-16 shrink-0 text-ash-dim">{row.key}</dt>
          <dd className="text-ash">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
