import { describe, expect, it } from "vitest";
import { alphaFor, atlasX, atlasY } from "./atlas";

describe("atlas coords", () => {
  it("lays glyphs out by column and levels 1..7 by row", () => {
    expect(atlasX(0)).toBe(0);
    expect(atlasX(17)).toBe(170);
    expect(atlasY(1)).toBe(0);
    expect(atlasY(7)).toBe(96);
  });
});

describe("alphaFor", () => {
  it("rises monotonically from 0.22 to 1", () => {
    expect(alphaFor(1)).toBeCloseTo(0.22);
    expect(alphaFor(7)).toBeCloseTo(1);
    for (let l = 2; l <= 7; l++) expect(alphaFor(l)).toBeGreaterThan(alphaFor(l - 1));
  });
});
