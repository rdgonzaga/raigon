import { skillGroups } from "@/lib/content";

/** Every skill group at once: a label column and a plain list, so nothing hides behind a tab. */
export function SkillList() {
  return (
    <dl className="rg-skills">
      {skillGroups.map((group) => (
        <div key={group.label}>
          <dt>{group.label}</dt>
          <dd>{group.items.join(", ")}</dd>
        </div>
      ))}
    </dl>
  );
}
