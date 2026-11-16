// Grass blade scatter. Kept free of shaders and DOM so the bake worker can run it.

import { fbm2, lerp, mulberry32, smoothstep } from '../core/noise.js';
import { ENV } from '../env.js';
import { distToLine, START, walkLine } from '../core/walkway.js';
import { bareGround, groundHeight, sampleSplatLinear, streamCenterZ, streamSD, tuftAt } from './heightfield.js';

// concentric bands: [inner radius, outer radius, cell size, do blades gather into tufts?]
// Far away a blade is as wide as a tuft, so there each one stands alone.
const BANDS = [[0.9, 9, 0.066, true], [9, 18, 0.1, true], [18, 34, 0.15, true], [34, 62, 0.26, false], [62, 112, 0.5, false]];
const BAND_CELL = [[0, 0.066], [9, 0.066], [18, 0.1], [34, 0.15], [62, 0.26], [112, 0.5]];
/** The scatter cell size at `d` metres from the camera, eased between bands. */
export function bandCell(d) {
  for (let i = 1; i < BAND_CELL.length; i++) {
    const [d1, c1] = BAND_CELL[i];
    if (d <= d1) { const [d0, c0] = BAND_CELL[i - 1]; return c0 + (c1 - c0) * ((d - d0) / (d1 - d0)); }
  }
  return 0.5;
}

// ---------------------------------------------------------------------------------------------
// Scattering
// ---------------------------------------------------------------------------------------------
const bump = (x, a, b, f = 1) => smoothstep(a - f, a, x) * (1 - smoothstep(b, b + f, x));

/** How long the grass grows here (1 = regular meadow turf). */
function lengthField(x, z) {
  let k = 0.85 + fbm2(x * 0.11 + 5.3, z * 0.11 + 8.1, 2) * 0.55;
  if (ENV.noStream) return Math.max(0.42, k * (1 - 0.12 * smoothstep(-8, -14, z)) + 0.75 * smoothstep(-4.5, -1.5, z)); // tall, shaggy grass at the viewer's feet
  const nearBank = smoothstep(-5.4, -4.6, z);
  // shaggy growth on the shaded bank left of the camera and in the right corner with the ferns
  k += 0.5 * nearBank * (1 - smoothstep(-2.6, -0.9, x)) + 0.35 * nearBank * smoothstep(1.9, 3.2, x);
  // the sunlit patch around the foreground path is closely cropped
  k -= 0.22 * nearBank * bump(x, -1.0, 1.9, 0.6);
  // beyond the stream the meadow is a short, neat lawn
  k *= 1 - 0.3 * smoothstep(-6.2, -7.6, z) - 0.1 * smoothstep(-8, -14, z);
  return Math.max(0.42, k);
}

const hash01 = (n) => {
  let t = (n ^ 0x9e3779b9) | 0;
  t = Math.imul(t ^ (t >>> 15), 0x85ebca6b);
  t = Math.imul(t ^ (t >>> 13), 0xc2b2ae35);
  return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
};

// bare patches under the props that sit on the ground: [x, z, radius]
const DRESS = ENV.extras?.dressing ?? {};
const CLEARINGS = (DRESS.campfires ?? []).map((c) => [c.x, c.z, 0.8]);
/** 0 inside a clearing, rising through its mown edge, 1 elsewhere. */
export function clearing(x, z) {
  let k = 1;
  for (const [cx, cz, cr] of CLEARINGS) k = Math.min(k, smoothstep(cr, cr + 0.9, Math.hypot(x - cx, z - cz)));
  return k;
}

/** Blade instances for the meadow, as typed arrays (so a worker can hand them over). */
export function scatterGrass(density) {
  const rng = mulberry32(31337);
  const out = { root: [], blade: [], shape: [], clump: [], tuft: [], tuftY: [], cell: [] };
  const cx = START.x, cz = START.y;
  const scale = 1 / Math.sqrt(density);
  // The bands are measured from the whole walk (start spot to a little past the end stop), so the
  // grass is as thick under the camera at every scroll position as it is in the opening view.
  const line = walkLine(10);
  const lx = line.map((p) => p[0]), lz = line.map((p) => p[1]);
  const pad = BANDS.at(-1)[1];
  const X0 = Math.min(...lx) - pad, X1 = Math.max(...lx) + pad, Z0 = Math.min(...lz) - pad, Z1 = Math.max(...lz) + pad;
  // distance to the walk, looked up from a 0.5 m grid (exact enough for band edges)
  const DG = 0.5, gw = Math.ceil((X1 - X0) / DG) + 1, gh = Math.ceil((Z1 - Z0) / DG) + 1;
  // exact only near the walk; farther out the band edges are soft, so a coarse 4 m grid interpolated is enough
  const CG = 4, cw = Math.ceil((X1 - X0) / CG) + 2, ch = Math.ceil((Z1 - Z0) / CG) + 2;
  const coarse = new Float32Array(cw * ch);
  for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) coarse[j * cw + i] = distToLine(line, X0 + i * CG, Z0 + j * CG);
  const dist = new Float32Array(gw * gh);
  for (let j = 0; j < gh; j++) {
    const fz = (j * DG) / CG, cj = Math.floor(fz), tz = fz - cj;
    for (let i = 0; i < gw; i++) {
      const fx = (i * DG) / CG, ci = Math.floor(fx), tx = fx - ci;
      const a = coarse[cj * cw + ci], b = coarse[cj * cw + ci + 1], c = coarse[(cj + 1) * cw + ci], d = coarse[(cj + 1) * cw + ci + 1];
      const est = (a + (b - a) * tx) * (1 - tz) + (c + (d - c) * tx) * tz;
      dist[j * gw + i] = est < 16 ? distToLine(line, X0 + i * DG, Z0 + j * DG) : est;
    }
  }
  const walkDist = (x, z) => dist[Math.round((z - Z0) / DG) * gw + Math.round((x - X0) / DG)];
  const islet = ENV.islet;
  const onIslet = (x, z, grow = 0) => islet && Math.hypot(x - islet.x, z - islet.z) < islet.r + grow;

  // What a whole tuft shares. Decided once per tuft, so all of its blades agree.
  const tufts = new Map();
  const tuftOf = (x, z) => {
    const t = tuftAt(x, z);
    let p = tufts.get(t.id);
    if (!p) {
      const bare = bareGround(t.x, t.z);
      const band = sampleSplatLinear(t.x, t.z, 0); // above 0 inside the transition between turf and soil
      // reeds and straw gather along the far bank; the camera-side bank stays mostly green
      const waterside = smoothstep(0.62, 0.9, sampleSplatLinear(t.x, t.z, 3)) * (t.z > streamCenterZ(t.x) ? 0.3 : 1);
      const r1 = hash01(t.id), r2 = hash01(t.id * 7 + 3), r3 = hash01(t.id * 13 + 5);
      const skirt = smoothstep(0.04, 0.5, band); // the worn fringe of a path or a bank
      const straw = r2 < 0.03 + 0.45 * waterside + 0.08 * skirt;
      // Most tufts merge into an even lawn. One in eight stands out (taller, darker, a clear
      // clump). In a skirt the grass is thin, short and clumpy, so the soil colours it olive.
      const hero = r1 > 0.875 ? 1 : 0;
      const reed = straw && waterside > 0.3;
      p = {
        id: t.id, x: t.x, z: t.z, y: groundHeight(t.x, t.z), d: 0,
        alive: bare < 0.5,
        vigor: (1 - smoothstep(0.08, 0.5, bare)) * (1 - 0.6 * skirt),
        accent: Math.max(hero, skirt * 0.7),
        // skirt grass is yellowed at the tips, which keeps it close to the soil in value
        dry: straw ? 0.55 + r3 * 1.1 : 0.32 * skirt,
        tall: reed ? 1.35 + r3 * 0.5 : 1 + (r1 - 0.5) * 0.2 + hero * (0.18 + 0.25 * r3) - 0.38 * skirt,
        dark: hero * (1 - skirt) * (0.1 + 0.2 * r3),
        rand: r1,
      };
      tufts.set(t.id, p);
    }
    p.d = t.d;
    return p;
  };

  const bands = [...BANDS.map(([rMin, rMax, cell0, tufted]) => ({ rMin, rMax, cell0, tufted, x: [X0, X1], z: [Z0, Z1] })),
    // the islet gets its own close-cropped tufts instead of lone far-field blades
    ...(islet ? [{ islet: true, cell0: 0.14, tufted: true, x: [islet.x - islet.r - 1, islet.x + islet.r + 1], z: [islet.z - islet.r - 1, islet.z + islet.r + 1] }] : [])];
  for (const { rMin, rMax, cell0, tufted, x: [bx0, bx1], z: [bz0, bz1], islet: isIslet } of bands) {
    // tufts thin out towards their rim, so start from more candidates to keep the same cover
    const cell = cell0 * scale * (tufted ? 0.965 : 1);
    for (let gz = bz0; gz < bz1; gz += cell) {
      for (let gx = bx0; gx < bx1; gx += cell) {
        const x = gx + rng() * cell, z = gz + rng() * cell;
        const dx = x - cx, dz = z - cz;
        const r = isIslet ? 40 : walkDist(x, z);
        if (isIslet ? !onIslet(x, z, 0.6) : r < rMin || r >= rMax || onIslet(x, z, 0.6)) continue;
        // full density inside the opening view and along the walk, thinned elsewhere
        const inView = -dz > Math.abs(dx) * 0.86 - 2.5 || r < 9;
        if (!inView && r > 7 && rng() > 0.3) continue;
        if (streamSD(x, z) < 0.04) continue;
        const mown = clearing(x, z);
        if (mown < 0.05) continue;
        const tp = tuftOf(x, z);
        if (!tp.alive) continue;
        const e = Math.min(1, tp.d / 0.19); // 0 at the heart of the tuft, 1 at its rim
        if (rng() > (tufted ? lerp(1, lerp(0.85, 0.4, tp.accent), e * e) : 1) * lerp(0.4, 1, tp.vigor)) continue;
        const y = groundHeight(x, z);
        if (y < 0.012) continue; // the wet line stays bare
        // the shaggy growth at the viewer's feet carries on beside the path for the whole walk
        const k = lengthField(x, z) + (ENV.noStream && !isIslet ? 0.55 * (1 - smoothstep(2, 7, r)) * smoothstep(-4, -8, z) : 0);
        const heart = tufted ? lerp(0.5, 1 - e, tp.accent) : 0.5;
        const len = (0.16 + rng() * 0.14) * k * (1 + r * 0.014) * tp.tall * (tufted ? lerp(0.82, 1.22, heart) : 1) * lerp(0.62, 1, tp.vigor) * (isIslet ? 0.75 : 1) * lerp(0.3, 1, mown);
        // rim blades splay outwards, heart blades stand any way they like
        const yaw = tufted && e > 0.3 && rng() < tp.accent ? Math.atan2(z - tp.z, x - tp.x) + (rng() - 0.5) * 1.9 : rng() * Math.PI * 2;
        out.root.push(x, y - 0.02, z);
        out.blade.push(yaw, len, 0.011 + rng() * 0.006 + (k > 1.5 ? 0.003 : 0), rng());
        out.shape.push(0.08 + rng() * 0.42 + (tufted ? e * 0.2 * tp.accent : 0), 0.35 + rng() * 0.8, tp.dry, tp.dark);
        out.clump.push(tp.x, tp.z, tp.rand, heart);
        out.tuft.push(tufted ? tp.id : -1);
        out.tuftY.push(tp.y);
        out.cell.push(cell);
      }
    }
  }
  const f32 = (a) => new Float32Array(a);
  // tuft ids run past 2^32, so they keep full precision
  return { root: f32(out.root), blade: f32(out.blade), shape: f32(out.shape), clump: f32(out.clump), tuft: new Float64Array(out.tuft), tuftY: f32(out.tuftY), cell: f32(out.cell) };
}
