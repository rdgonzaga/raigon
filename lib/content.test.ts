import { describe, expect, it } from "vitest";
import { certifications, education, projects, site, skillGroups, workExperience } from "./content";

const unique = (keys: string[]) => new Set(keys).size === keys.length;

describe("content", () => {
  // the page keys its lists on these, so a duplicate silently drops or mixes up an entry
  it("has unique list keys", () => {
    expect(unique(projects.map((p) => p.slug))).toBe(true);
    expect(unique(workExperience.map((j) => `${j.org}-${j.role}`))).toBe(true);
    expect(unique(skillGroups.map((g) => g.label))).toBe(true);
    expect(unique(certifications.map((c) => c.name))).toBe(true);
    expect(unique(education.map((e) => e.org))).toBe(true);
  });

  // renderBullet only bolds paired ** markers; an odd count shows raw asterisks on the page
  it("closes every bold marker in bullets", () => {
    const bullets = [...workExperience, ...education].flatMap((e) => e.bullets);
    for (const b of bullets) expect((b.match(/\*\*/g) ?? []).length % 2, b).toBe(0);
  });

  it("links out over https only", () => {
    const urls = [
      site.github, site.linkedin,
      ...workExperience.map((j) => j.url),
      ...projects.flatMap((p) => [p.github, p.live]),
    ].filter((u): u is string => Boolean(u));
    for (const u of urls) expect(u, u).toMatch(/^https:\/\//);
  });

  it("gives every skill group at least one item", () => {
    for (const g of skillGroups) expect(g.items.length, g.label).toBeGreaterThan(0);
  });
});
