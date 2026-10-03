import { describe, expect, it } from "vitest";
import {
  COLON, DOT, baseLevel, decayHeat, depositHeat, fieldNoise, flickerAt, glyphFor, inSweep,
  levelAt, rerollGlyphs, stepTears, type FieldParams, type TearState,
} from "./field";

const params = (over: Partial<FieldParams> = {}): FieldParams => ({
  seed: 1337, rows: 67, sweep: false, tears: [], ...over,
});

describe("fieldNoise", () => {
  it("is deterministic and in [0, 1)", () => {
    for (let i = 0; i < 200; i++) {
      const n = fieldNoise(i * 1.3, i * 0.7, i * 0.11, 1337);
      expect(n).toBe(fieldNoise(i * 1.3, i * 0.7, i * 0.11, 1337));
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });
});

describe("levelAt", () => {
  it("returns integers in [0, 7], including at large t", () => {
    const p = params({ sweep: true });
    for (const t of [0, 3.3, 1e6]) {
      for (let r = 0; r < 67; r += 3) for (let c = 0; c < 192; c += 3) {
        for (const [f, h] of [[-1, 0], [0, 0.5], [1, 1]]) {
          const l = levelAt(c, r, t, p, f, h);
          expect(Number.isInteger(l)).toBe(true);
          expect(l).toBeGreaterThanOrEqual(0);
          expect(l).toBeLessThanOrEqual(7);
        }
      }
    }
  });

  it("leaves roughly half or more of the field off", () => {
    for (const t of [0, 50]) {
      let off = 0;
      for (let r = 0; r < 67; r++) for (let c = 0; c < 192; c++) {
        if (levelAt(c, r, t, params(), 0, 0) === 0) off++;
      }
      const frac = off / (67 * 192);
      expect(frac).toBeGreaterThan(0.45);
      expect(frac).toBeLessThan(0.8);
    }
  });

  it("sweep raises levels inside its band only", () => {
    const t = 2.1;
    for (let r = 0; r < 67; r++) for (let c = 0; c < 192; c += 7) {
      const plain = levelAt(c, r, t, params(), 0, 0);
      const swept = levelAt(c, r, t, params({ sweep: true }), 0, 0);
      if (inSweep(r, t, 67)) {
        expect(swept).toBe(plain === 0 ? 1 : Math.min(7, plain + 3));
      } else {
        expect(swept).toBe(plain);
      }
    }
  });

  it("a tear shifts only its rows", () => {
    const tears = [{ row: 5, rows: 2, offset: 3, until: 99 }];
    for (let c = 0; c < 192; c++) {
      expect(levelAt(c, 5, 1, params({ tears }), 0, 0)).toBe(levelAt(c - 3, 5, 1, params(), 0, 0));
      expect(levelAt(c, 6, 1, params({ tears }), 0, 0)).toBe(levelAt(c - 3, 6, 1, params(), 0, 0));
      expect(levelAt(c, 4, 1, params({ tears }), 0, 0)).toBe(levelAt(c, 4, 1, params(), 0, 0));
      expect(levelAt(c, 7, 1, params({ tears }), 0, 0)).toBe(levelAt(c, 7, 1, params(), 0, 0));
    }
  });

  it("baseLevel is 0 below threshold and caps at 5", () => {
    expect(baseLevel(0)).toBe(0);
    expect(baseLevel(0.999)).toBe(5);
  });
});

describe("heat", () => {
  it("levelAt adds heat on top of the field, clamped to 7", () => {
    for (let c = 0; c < 192; c += 5) {
      const plain = levelAt(c, 10, 1, params(), 0, 0);
      expect(levelAt(c, 10, 1, params(), 0, 1)).toBe(Math.min(7, plain + 5));
    }
  });

  it("deposits 1 at the pointer, falls off, and is 0 at the radius", () => {
    const cols = 40, rows = 30;
    const heat = new Float32Array(cols * rows);
    depositHeat(heat, cols, rows, 20, 15);
    expect(heat[15 * cols + 20]).toBeCloseTo(1);
    let prev = 1;
    for (let c = 20; c < 40; c++) {
      expect(heat[15 * cols + c]).toBeLessThanOrEqual(prev);
      prev = heat[15 * cols + c];
    }
    expect(heat[15 * cols + 34]).toBe(0);
  });

  it("keeps the max instead of stacking, so heat stays in [0, 1]", () => {
    const heat = new Float32Array(100);
    for (let i = 0; i < 20; i++) depositHeat(heat, 10, 10, 5, 5);
    expect(Math.max(...heat)).toBeLessThanOrEqual(1);
  });

  it("ignores pointers outside the grid and empty grids", () => {
    const heat = new Float32Array(100);
    depositHeat(heat, 10, 10, -500, -500);
    depositHeat(heat, 10, 10, 1e6, 1e6);
    expect(heat.every((v) => v === 0)).toBe(true);
    expect(() => depositHeat(new Float32Array(0), 0, 0, 3, 3)).not.toThrow();
  });

  it("decays toward zero and snaps tiny values to 0", () => {
    const heat = new Float32Array([1, 0.5, 0.011]);
    decayHeat(heat, 1 / 30);
    expect(heat[0]).toBeLessThan(1);
    expect(heat[0]).toBeGreaterThan(0.5);
    expect(heat[2]).toBe(0);
    decayHeat(heat, 0);
    expect(heat[0]).toBeGreaterThan(0.5);
  });
});

describe("flickerAt", () => {
  it("only returns -1, 0 or 1", () => {
    for (let t = 0; t < 100; t += 0.13) expect([-1, 0, 1]).toContain(flickerAt(t));
  });
});

describe("glyphFor", () => {
  it("maps low levels to filler and higher levels to the cell glyph", () => {
    expect(glyphFor(1, 9)).toBe(DOT);
    expect(glyphFor(2, 9)).toBe(COLON);
    expect(glyphFor(3, 9)).toBe(9);
    expect(glyphFor(7, 15)).toBe(15);
  });
});

describe("stepTears", () => {
  it("schedules a tear when due and expires it later", () => {
    const s: TearState = { tears: [], nextAt: 2 };
    stepTears(s, 1, 67, () => 0.5);
    expect(s.tears).toHaveLength(0);
    stepTears(s, 2, 67, () => 0.5);
    expect(s.tears).toHaveLength(1);
    expect(s.tears[0]).toMatchObject({ row: 33, rows: 2, offset: 4 });
    expect(s.tears[0].until).toBeCloseTo(2.185);
    expect(s.nextAt).toBeCloseTo(5.5);
    stepTears(s, 2.2, 67, () => 0.5);
    expect(s.tears).toHaveLength(0);
  });

  it("adds nothing on an empty grid and keeps the same array instance", () => {
    const s: TearState = { tears: [], nextAt: 0 };
    const ref = s.tears;
    stepTears(s, 5, 0, () => 0.5);
    expect(s.tears).toHaveLength(0);
    expect(s.tears).toBe(ref);
  });

  it("a tear row past the grid after a shrink does not throw", () => {
    const tears = [{ row: 500, rows: 3, offset: 4, until: 99 }];
    expect(() => levelAt(3, 2, 1, params({ rows: 10, tears }), 0, 0)).not.toThrow();
  });
});

describe("rerollGlyphs", () => {
  it("changes nothing at dt 0 and keeps glyphs below 16", () => {
    const g = new Uint8Array(1000).fill(3);
    rerollGlyphs(g, 0, Math.random);
    expect(g.every((v) => v === 3)).toBe(true);
    rerollGlyphs(g, 1, Math.random);
    expect(g.every((v) => v < 16)).toBe(true);
    expect(g.some((v) => v !== 3)).toBe(true);
  });
});
