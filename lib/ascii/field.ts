export const GLYPHS = "0123456789abcdef.:";
export const HEX_COUNT = 16;
export const DOT = 16;
export const COLON = 17;
export const LEVELS = 8;

const THRESHOLD = 0.5;
const SWEEP_PERIOD = 7;
const SWEEP_HALF = 1.5;
const SWEEP_BOOST = 3;
const HEAT_RADIUS = 12;
const HEAT_BOOST = 5;
const HEAT_DECAY_PER_30FPS_FRAME = 0.9;
const HEAT_FLOOR = 0.02;
const ROW_ASPECT = 1.6;
const REROLL_RATE = 0.02;

export type Tear = { row: number; rows: number; offset: number; until: number };
export type FieldParams = {
  seed: number;
  rows: number;
  sweep: boolean;
  tears: Tear[];
};
export type TearState = { tears: Tear[]; nextAt: number };

function hash(x: number, y: number, seed: number): number {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function valueNoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, seed);
  const b = hash(xi + 1, yi, seed);
  const c = hash(xi, yi + 1, seed);
  const d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fieldNoise(col: number, row: number, t: number, seed: number): number {
  return (
    0.65 * valueNoise(col * 0.07 + t * 0.04, row * 0.11 + t * 0.025, seed) +
    0.35 * valueNoise(col * 0.19 - t * 0.07, row * 0.29 + t * 0.05, seed + 101)
  );
}

export function baseLevel(n: number): number {
  if (n < THRESHOLD) return 0;
  return Math.min(5, 1 + Math.floor(((n - THRESHOLD) / (1 - THRESHOLD)) * 6));
}

export function inSweep(row: number, t: number, rows: number): boolean {
  const center = ((t % SWEEP_PERIOD) / SWEEP_PERIOD) * (rows + 6) - 3;
  return Math.abs(row - center) < SWEEP_HALF;
}

/** Stamp a soft disc of heat at the pointer. Keeps the max per cell, so heat stays in [0, 1]. */
export function depositHeat(heat: Float32Array, cols: number, rows: number, pc: number, pr: number): void {
  const reachRows = HEAT_RADIUS / ROW_ASPECT;
  const r0 = Math.max(0, Math.floor(pr - reachRows));
  const r1 = Math.min(rows - 1, Math.ceil(pr + reachRows));
  const c0 = Math.max(0, Math.floor(pc - HEAT_RADIUS));
  const c1 = Math.min(cols - 1, Math.ceil(pc + HEAT_RADIUS));
  for (let r = r0; r <= r1; r++) {
    const dy = (r - pr) * ROW_ASPECT;
    for (let c = c0; c <= c1; c++) {
      const dx = c - pc;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d >= HEAT_RADIUS) continue;
      const k = 1 - d / HEAT_RADIUS;
      const v = k * k;
      const i = r * cols + c;
      if (heat[i] < v) heat[i] = v;
    }
  }
}

/** Frame-rate independent fade, so the trail lasts the same at 30 and 15fps. */
export function decayHeat(heat: Float32Array, dt: number): void {
  const f = Math.pow(HEAT_DECAY_PER_30FPS_FRAME, dt * 30);
  for (let i = 0; i < heat.length; i++) {
    const v = heat[i] * f;
    heat[i] = v < HEAT_FLOOR ? 0 : v;
  }
}

export function flickerAt(t: number): -1 | 0 | 1 {
  const w = Math.sin(t * 1.7) * Math.sin(t * 0.37 + 1);
  return w > 0.75 ? 1 : w < -0.75 ? -1 : 0;
}

function tearOffset(row: number, tears: Tear[]): number {
  for (let i = 0; i < tears.length; i++) {
    const tear = tears[i];
    if (row >= tear.row && row < tear.row + tear.rows) return tear.offset;
  }
  return 0;
}

export function levelAt(
  col: number,
  row: number,
  t: number,
  p: FieldParams,
  flicker: number,
  heat: number,
): number {
  let level = baseLevel(fieldNoise(col - tearOffset(row, p.tears), row, t, p.seed));
  if (level > 0) level += flicker;
  if (p.sweep && inSweep(row, t, p.rows)) level += level > 0 ? SWEEP_BOOST : 1;
  if (heat > 0) level += Math.round(heat * HEAT_BOOST);
  return level < 0 ? 0 : level > LEVELS - 1 ? LEVELS - 1 : level;
}

export function glyphFor(level: number, cellGlyph: number): number {
  return level === 1 ? DOT : level === 2 ? COLON : cellGlyph;
}

export function stepTears(s: TearState, t: number, rows: number, rand: () => number): void {
  for (let i = s.tears.length - 1; i >= 0; i--) {
    if (t >= s.tears[i].until) s.tears.splice(i, 1);
  }
  if (t < s.nextAt || rows <= 0) return;
  s.tears.push({
    row: Math.floor(rand() * rows),
    rows: 1 + Math.floor(rand() * 3),
    offset: (rand() < 0.5 ? -1 : 1) * (2 + Math.floor(rand() * 5)),
    until: t + 0.12 + rand() * 0.13,
  });
  s.nextAt = t + 2 + rand() * 3;
}

export function rerollGlyphs(glyphs: Uint8Array, dt: number, rand: () => number): void {
  const n = glyphs.length * REROLL_RATE * dt;
  let k = Math.floor(n) + (rand() < n % 1 ? 1 : 0);
  while (k-- > 0) glyphs[Math.floor(rand() * glyphs.length)] = Math.floor(rand() * HEX_COUNT);
}
