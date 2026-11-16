// Scene variants; the site uses d (lake shore, dock, bench).

import { fbm2, smoothstep } from './core/noise.js';

const q = new URLSearchParams(location.search);
const id = 'd';

/** false = the engine's own midday look, untouched. */
export const REGRADE = !q.has('day');
/** 0 = golden morning, 1 = sunset. */
export const MODE0 = document.documentElement.getAttribute('data-theme') === 'light' ? 0 : 1;

const wob = (x, z) => fbm2(x * 0.05 + 3.3, z * 0.05 + 1.1, 2) * 2.2;
const R = (rng, a, b) => a + rng() * (b - a);

/** Trees scattered on dry land between `min` and `max` metres from the water. */
const shoreTrees = (n, o) => ({ rng, sd }) => {
  const out = [];
  for (let i = 0, t = 0; i < n && t < n * 40; t++) {
    const x = R(rng, o.x[0], o.x[1]), z = R(rng, o.z[0], o.z[1]);
    const s = sd(x, z);
    if (s < o.min || s > o.max) continue;
    out.push({ x, z, height: R(rng, o.h[0], o.h[1]), type: rng() < o.conifer ? 'conifer' : rng() < 0.5 ? 'tall' : 'broad', detail: 0.5, bright: -0.06 - rng() * 0.12, shade: o.shade ?? 0.3 });
    i++;
  }
  return out;
};

/** Rounded boulders at the waterline. */
const shoreRocks = (n, o) => ({ rng, sd, h }) => {
  const out = [];
  for (let i = 0, t = 0; i < n && t < n * 60; t++) {
    const x = R(rng, o.x[0], o.x[1]), z = R(rng, o.z[0], o.z[1]);
    const s = sd(x, z);
    if (s < -0.45 || s > o.reach) continue;
    if (Math.hypot(x, z) < 3.3) continue; // not on top of the camera
    const size = o.s[0] + rng() * rng() * (o.s[1] - o.s[0]);
    out.push({
      x, y: h(x, z) + size * 0.22, z, sx: size, sy: size * R(rng, 0.58, 0.8), sz: size * R(rng, 0.8, 1.05),
      yaw: rng() * 6.28, tilt: R(rng, -0.25, 0.25), seed: i, warm: rng() * 0.75, turf: 0, bright: R(rng, -0.05, 0.14),
    });
    i++;
  }
  return out;
};

// Peaks: [azimuth in degrees (0 = straight ahead, + = right), distance, summit height, radius, flatness, haze]
const ALP_RANGES = [
  { dist: 950, depth: 460, height: 300, haze: 0.46, seed: 1, notch: 0.6 },
  { dist: 1550, depth: 640, height: 560, haze: 0.62, seed: 2, notch: 0.45 },
  { dist: 2500, depth: 820, height: 800, haze: 0.76, seed: 3 },
];
const HILL_RANGES = [
  { dist: 1100, depth: 520, height: 170, haze: 0.48, seed: 4, notch: 0.5 },
  { dist: 1900, depth: 700, height: 320, haze: 0.64, seed: 5, notch: 0.3 },
  { dist: 2900, depth: 820, height: 470, haze: 0.76, seed: 6 },
];
const ALPS = [
  [-58, 760, 250, 290, 0.25, 0.18], [-40, 980, 370, 350, 0.2, 0.26], [-24, 1300, 540, 450, 0.17, 0.36], [-6, 1500, 640, 500, 0.15, 0.42],
  [9, 1180, 400, 300, 0.2, 0.3], [54, 900, 330, 270, 0.24, 0.22], [70, 760, 250, 280, 0.26, 0.18],
  [-32, 2100, 720, 640, 0.15, 0.56], [18, 2200, 600, 560, 0.16, 0.58], [31, 2600, 230, 520, 0.3, 0.66], [44, 2300, 520, 520, 0.18, 0.6],
];
const HILLS = [[-56, 1700, 190, 330, 0.2, 0.46], [-44, 1900, 270, 380, 0.16, 0.5], [-31, 2300, 230, 340, 0.2, 0.58], [-18, 2300, 380, 460, 0.14, 0.58], [-6, 2500, 260, 380, 0.18, 0.62],
  [8, 2200, 320, 420, 0.16, 0.58], [19, 2500, 220, 360, 0.2, 0.62], [52, 1800, 250, 340, 0.18, 0.5], [64, 1700, 190, 300, 0.2, 0.46]];

// Shore of the left-hand lake used by c and d: land is to the right of this line.
const parkShoreX = (z, w) => -4.5 + Math.max(0, -z - 7) * 0.2 + w * 0.6;
const parkLake = (x, z, cz) => {
  const w = wob(x, z);
  return Math.max(z - cz, x - parkShoreX(z, w), -190 + w * 3 - z);
};
const PARK_PATH = [[0.6, -12.5, 0.95], [2.2, -19, 0.95], [3.6, -28, 0.9], [6.5, -40, 0.9], [11.5, -54, 0.9], [18, -66, 0.9]];
const parkRocks = shoreRocks(46, { x: [-9, 6], z: [-46, -7.5], reach: 1.5, s: [0.28, 1.05] });

const dShoreX = (z, w) => -1.6 - 5 * smoothstep(-6, 6, z) + Math.max(0, -z - 10) * 0.2 + 1.3 * Math.sin(z * 0.13 + 0.5) * smoothstep(-6, -14, z) + w * 0.6;
const D_ISLET = { x: -4, z: -72, r: 5.5 };
// Move the dock here; boat, lantern, path spur and rock clearance follow it.
// x, z = the shore end; yaw turns it (0 = straight away from the camera).
const D_DOCK = { x: -1.3, z: -8.8, len: 10, yaw: 1.1 };
/** A point `side` metres right of the dock and `out` metres along it (negative = inland). */
const atDock = (side, out) => {
  const c = Math.cos(D_DOCK.yaw), s = Math.sin(D_DOCK.yaw);
  return { x: D_DOCK.x + side * c - out * s, z: D_DOCK.z - side * s - out * c };
};
const clearOfDock = (r) => {
  const dx = -Math.sin(D_DOCK.yaw), dz = -Math.cos(D_DOCK.yaw);
  const rx = r.x - D_DOCK.x, rz = r.z - D_DOCK.z;
  const along = rx * dx + rz * dz, across = Math.abs(rx * dz - rz * dx);
  return along < -0.6 || along > D_DOCK.len + 0.8 || across > 1.7 + (r.sx ?? 0.5);
};
// A creek running in from the lake under the footbridge, narrowing as it goes: [x, z, half width].
const D_CREEK = [[3.6, -39.3, 1.1], [8.6, -40.2, 0.75], [11.8, -41.6, 0.3]];
// Trees, rocks and bushes are scattered as if there were no creek, so cutting it moves nothing else.
let creekOn = true;
const creekless = (f) => (help) => f({
  ...help,
  sd: (x, z) => { creekOn = false; try { return help.sd(x, z); } finally { creekOn = true; } },
});
const creekSD = (x, z) => {
  let best = Infinity;
  for (let i = 0; i < D_CREEK.length - 1; i++) {
    const [ax, az, aw] = D_CREEK[i], [bx, bz, bw] = D_CREEK[i + 1];
    const dx = bx - ax, dz = bz - az;
    const u = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - ax - u * dx, z - az - u * dz) - (aw + (bw - aw) * u));
  }
  return best;
};
/** False for a rock that would sit on the walking path. */
const D_PATH = [[4.3, 6], [3.1, 0.5], [2.1, -4.4], [1.4, -8.6], [1.1, -12.4], [1.5, -17], [2.9, -23], [5.4, -30], [8.0, -38], [10.6, -47], [13.2, -57], [16, -66], [19.5, -76]];
const offPath = (r) => {
  for (let i = 0; i < D_PATH.length - 1; i++) {
    const [ax, az] = D_PATH[i], [bx, bz] = D_PATH[i + 1], dx = bx - ax, dz = bz - az;
    const u = Math.min(1, Math.max(0, ((r.x - ax) * dx + (r.z - az) * dz) / (dx * dx + dz * dz)));
    if (Math.hypot(r.x - ax - u * dx, r.z - az - u * dz) < 0.75 + (r.sx ?? 0.5) * 0.6) return false;
  }
  return true;
};
const dLake = (x, z) => {
  const w = wob(x, z);
  const open = Math.max(x - dShoreX(z, w), -150 + w * 3 - z, z - 16, -118 + w * 3 - x - Math.max(0, -z - 60) * 0.25);
  const lake = Math.max(open, D_ISLET.r + w * 0.4 - Math.hypot(x - D_ISLET.x, z - D_ISLET.z));
  return creekOn ? Math.min(lake, creekSD(x, z) + w * 0.08) : lake;
};

const gs = (x, z, cx, cz, r) => Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
const azOf = (x, z) => (Math.atan2(x, -z) * 180) / Math.PI;
// [sunrise az, sunset az]: the camera looks north
const D_SUN = [36, -15];
/** Low ground and no trees where the sun comes up, so it is seen rising over the land. */
const dSunGap = (x, z) => Math.exp(-(((azOf(x, z) - D_SUN[0]) / 7) ** 2)) * smoothstep(22, 45, Math.hypot(x, z));
/** Lower ground across the lake where the sun sets. */
const dSetGap = (x, z) => Math.exp(-(((azOf(x, z) - D_SUN[1]) / 5) ** 2)) * smoothstep(60, 110, Math.hypot(x, z));
// sunset gap keeps its trees, just lower
const noGap = (t) => dSunGap(t.x, t.z) < 0.3;
const lowInGap = (t) => ({ ...t, height: t.height * (1 - 0.6 * dSetGap(t.x, t.z)) });
const D_FEATURE = [[18.5, -30, 11, 'broad'], [10.6, -23.4, 11.5, 'slim'], [16.5, -11.5, 6.5, 'lollipop'], [20, -17, 8.5, 'umbrella'],
  [14, -37, 6, 'lollipop'], [23, -31, 14, 'conifer'], [26, -27, 11, 'conifer'], [31, -19, 12.5, 'umbrella'], [36, -40, 16, 'conifer']];
const D_GROVE = [[22, -42, 10, 'broad'], [25.5, -45, 12, 'tall'], [28.5, -42.5, 9, 'umbrella'], [24, -50, 13, 'conifer'], [30.5, -49, 11, 'broad'],
  [20.5, -47.5, 8, 'lollipop'], [33.5, -45, 14, 'conifer'], [27.5, -53.5, 12, 'slim'], [35, -52, 13, 'broad'],
  // the far flank, clear of the sunrise gap (trees inside it are dropped)
  [36, -32, 10, 'broad'], [38.5, -36, 12, 'conifer'], [40, -30, 9, 'umbrella'], [42, -40, 13, 'tall'], [45, -44, 11, 'broad'], [44, -34, 14, 'conifer']];
/** [x, z, height, type]: the tree at the end stop that carries the swing (dressing.swings). */
const D_SWING_TREE = [10.4, -33, 11, 'broad'];
const D_SPECIES = [['broad', 9, 14], ['slim', 10, 14], ['tall', 12, 17], ['umbrella', 8, 12], ['lollipop', 5, 8], ['conifer', 10, 18]];
const dLand = ({ rng, sd }) => {
  const mk = (x, z, height, type) => ({ x, z, height, type, detail: 0.6, bright: (rng() - 0.5) * 0.2, warm: rng() * 0.5, shade: 0.15 });
  const out = D_FEATURE.map((f) => mk(...f));
  for (let i = 0, t = 0; i < 90 && t < 3000; t++) {
    const x = R(rng, 9, 110), z = R(rng, -140, -16);
    if (sd(x, z) < 6 || Math.hypot(x, z) < 34 || dSunGap(x, z) > 0.3) continue;
    const [type, h0, h1] = D_SPECIES[Math.floor(rng() * D_SPECIES.length)];
    out.push(mk(x, z, R(rng, h0, h1), type));
    i++;
  }
  // the swing tree is pinned, so terraforming can never leave the swing hanging in the air;
  // added after the scatter (and with fixed tints) so the random trees keep their places
  const [sx, sz, sh, st] = D_SWING_TREE;
  return [...out.filter((t) => Math.hypot(t.x - sx, t.z - sz) > 2.5), { x: sx, z: sz, height: sh, type: st, detail: 0.6, bright: 0.02, warm: 0.2, shade: 0.15 }];
};
const dBushes = ({ rng, sd, h }) => {
  const out = [];
  const mk = (x, z, r) => out.push({ x, y: h(x, z) - r * 0.12, z, r, tall: R(rng, 0.6, 0.95), seed: out.length + 1, bright: R(rng, -0.12, 0.12), warm: rng() * 0.45, shade: 0 });
  for (const b of [[D_ISLET.x - 2.6, D_ISLET.z + 1.8, 0.9], [D_ISLET.x + 2.4, D_ISLET.z + 0.9, 0.6], [5.6, -1.8, 0.7], [6.8, -0.7, 0.5], [-1.1, -6.5, 0.6], [-0.3, -11.6, 0.5], [-0.6, -14.5, 0.8], [7.0, -9.4, 0.6], [8.3, -10.3, 0.7], [4.5, -16.8, 0.6], [12, -15, 1.3], [14.6, -22, 0.9], [7, -27.5, 1.1], [21, -24, 1.6], [10.6, -44, 1.4], [27, -38, 2.0], [19, -38.5, 1.4], [23.2, -39.5, 1.1], [26, -40.5, 1.6], [29.5, -40, 1.2], [21.5, -44, 1.3], [31.5, -46, 1.5], [24, -47, 1.0], [30, -43.5, 1.6], [33, -48, 1.3], [28, -48.5, 1.2], [35, -41, 1.4], [37.5, -46.5, 1.7], [34.5, -37.5, 1.2]]) mk(...b);
  for (let i = 0, t = 0; i < 16 && t < 600; t++) {
    const x = R(rng, 8, 60), z = R(rng, -80, -14);
    if (sd(x, z) < 4) continue;
    mk(x, z, R(rng, 0.7, 2.2));
    i++;
  }
  return out;
};

const DEFS = {
  base: { name: 'Stream clearing' },

  a: {
    name: 'Flower meadow',
    conifer: 0.55,
    rise: (x, z) => smoothstep(-70, -150, z) * (11 + 9 * fbm2(x * 0.012 + 1, z * 0.012, 2)) + smoothstep(-170, -330, z) * (30 + 24 * fbm2(x * 0.006 + 7, z * 0.006, 2)),
    ranges: HILL_RANGES,
    pal: { flower: [226, 72, 150], flowerB: [246, 156, 196], flowerCore: [255, 226, 150] },
    flowers: [[-9, 9, -5.2, -0.8, 1500, 0.03, 0.055], [-22, 26, -25, -9, 5200, 0.034, 0.062], [-40, 50, -72, -25, 6000, 0.04, 0.07]],
    trees: shoreTrees(150, { x: [-260, 260], z: [-340, -75], min: 3, max: 400, h: [11, 18], conifer: 0.7, shade: 0.4 }),
  },

  b: {
    name: 'Alpine lake',
    conifer: 0.85,
    fog: 0.0072, fogMax: 0.82, body: 0.5,
    lakeSD(x, z, cz) {
      const w = wob(x, z);
      return Math.max(z - cz, -17 - Math.max(0, -z - 8) * 0.55 + w - x, x - (17 + Math.max(0, -z - 10) * 0.9 + w), -175 + w * 3 - z);
    },
    rise(x, z, cz) {
      return smoothstep(4, 150, this.lakeSD(x, z, cz)) * 85 * (0.75 + 0.35 * fbm2(x * 0.01, z * 0.01, 2)) * smoothstep(-25, -75, z);
    },
    ranges: ALP_RANGES, snow: 300, reflect: 0.8,
    dock: { x: -0.7, z: -5.3, len: 10.5, yaw: 0.1 },
    pal: { waterShallow: [150, 224, 212], waterDeep: [36, 150, 162], waterSky: [118, 204, 204], flower: [248, 244, 232], flowerB: [250, 214, 110], flowerCore: [244, 190, 70] },
    flowers: [[-9, 9, -5.2, -0.8, 260, 0.022, 0.04]],
    trees: shoreTrees(290, { x: [-280, 280], z: [-340, -30], min: 3, max: 130, h: [12, 19], conifer: 0.92, shade: 0.45 }),
    rocks: shoreRocks(70, { x: [-12, 14], z: [-8.5, -2.4], reach: 1.7, s: [0.2, 0.68] }),
  },

  c: {
    name: 'Lakeside park',
    fog: 0.008, fogMax: 0.84, body: 0.25,
    lakeSD: parkLake,
    rise: (x, z, cz) => smoothstep(5, 200, parkLake(x, z, cz)) * 24 * (0.7 + 0.4 * fbm2(x * 0.009, z * 0.009, 2)) * smoothstep(-45, -120, z),
    ranges: HILL_RANGES, reflect: 0.45,
    path: PARK_PATH, bench: { x: 2.7, z: -12.2, yaw: -Math.PI / 2 + 0.75 },
    trees: shoreTrees(210, { x: [-320, 90], z: [-350, -60], min: 3, max: 110, h: [10, 16], conifer: 0.12 }),
    rocks: parkRocks,
  },

  d: {
    name: 'Lake shore (ours)',
    conifer: 0.5,
    fog: 0.0092, fogMax: 0.86, body: 0.45,
    fogByMode: [[0.0058, 0.7], [0.0092, 0.86]], // [density, max]: clearer golden morning, hazier sunset
    // Our own ground: no stream, ford, sand bars, fern corner or overhanging canopy from the original shot.
    noStream: true,
    lakeSD: dLake,
    islet: D_ISLET,
    cam: { x: 0.7, z: 2.2, yaw: 5, pitch: 4.6, eye: 1.95, portrait: true },
    rise: (x, z) => (smoothstep(5, 170, dLake(x, z)) * 70 * (0.75 + 0.35 * fbm2(x * 0.01, z * 0.01, 2)) * smoothstep(-40, -110, z)) * (1 - 0.92 * Math.max(dSunGap(x, z), dSetGap(x, z)))
      + smoothstep(1, 6, dLake(x, z)) * (1.5 * gs(x, z, 17, -23, 10) + 2.8 * gs(x, z, 27, -46, 15) + 1.1 * gs(x, z, 9, -60, 9)),
    ranges: ALP_RANGES.map((r, i) => ({ ...r, height: r.height * [0.85, 1.3, 1.25][i], haze: [0.72, 0.8, 0.88][i], notch: [0.9, 0.82, 0.6][i], notchW: 7, hazeLeft: [[0.16, -20, -65], [0.1, -18, -50], null][i] ?? undefined,
      leftScale: [[0.7, -25, -60], [0.62, -20, -55], null][i] ?? undefined })), snow: 340, reflect: 0.8,
    sunAz: D_SUN[0], sunsetAz: D_SUN[1], sunEl: [8, 6], light: [[D_SUN[0], 23], [D_SUN[1], 15]],
    path: D_PATH.map(([x, z], i) => [x, z, [0.8, 0.8, 0.85, 0.9, 0.95][i] ?? 0.9]),
    // branch to the dock; pull-out for the bench
    spurs: [[[1.4, -8.6, 0.7], ...[-1.6, 0.2].map((out) => { const p = atDock(0, out); return [p.x, p.z, 0.75]; })], [[1.9, -5.5, 0.8], [3.0, -5.2, 0.8], [4.0, -5.4, 0.8], [4.9, -5.6, 0.8]]],
    bench: { x: 4.6, z: -6.0, yaw: -2.75 }, // faces the sunset, set back off the path
    dock: D_DOCK,
    boat: { ...atDock(-1.2, 3), yaw: D_DOCK.yaw },
    lantern: { ...atDock(1.3, 0), yaw: Math.PI + D_DOCK.yaw },
    // [x, z, length, radius, yaw] lying logs; stumps are [x, z, radius, height]
    logs: [[6.4, -15.2, 2.8, 0.23, 0.5], [9.5, -30.5, 2.2, 0.2, -0.4]],
    stumps: [[5.4, -19.6, 0.32, 0.42], [12.6, -25.2, 0.26, 0.3]],
    pal: { waterShallow: [150, 220, 210], waterDeep: [44, 150, 164], waterSky: [122, 202, 204], flower: [222, 52, 56], flowerB: [250, 246, 238], flowerCore: [250, 206, 90] },
    // [x0, x1, z0, z1, plants]
    fernPatches: [[3, 5, -14, -8, 6], [3.5, 6, -26, -18, 7], [6.5, 9, -34, -27, 6], [9, 12, -36, -30, 5], [9, 12, -25, -21, 5]],
    flowers: [[3, 9, -8, -1.5, 70, 0.026, 0.045], [-1.5, 0.4, -15, -4, 140, 0.026, 0.045], [3.5, 30, -34, -10, 520, 0.034, 0.06], [9, 60, -78, -34, 600, 0.04, 0.07], [2.5, 13, -42, -18, 240, 0.028, 0.048]],
    trees: creekless((help) => [
      ...shoreTrees(150, { x: [-150, 130], z: [-350, -150], min: 3, max: 150, h: [13, 22], conifer: 0.75 })(help).filter(noGap).map(lowInGap),
      // the wooded shore behind the lake on the left
      ...shoreTrees(230, { x: [-330, -110], z: [-330, 10], min: 2, max: 170, h: [14, 25], conifer: 0.65, shade: 0.4 })(help).filter(noGap).map(lowInGap),
      // smaller trees right down at that shore's waterline
      ...shoreTrees(120, { x: [-180, -20], z: [-215, 10], min: 0.8, max: 16, h: [7, 14], conifer: 0.5, shade: 0.3 })(help).filter(noGap).map(lowInGap),
      ...dLand(help),
      // a grove along the hill right of the end stop
      ...D_GROVE.map(([x, z, height, type], i) => ({ x, z, height, type, detail: 0.6, bright: ((i * 37) % 10) / 50 - 0.1, warm: ((i * 53) % 10) / 20, shade: 0.15 })).filter(noGap),
      // the islet
      ...[[0.4, 0.6, 9.5, 'conifer'], [-1.9, -0.8, 7, 'conifer'], [1.7, -1.1, 5.5, 'broad']].map(([dx, dz, height, type]) => (
        { x: D_ISLET.x + dx, z: D_ISLET.z + dz, height, type, detail: 0.5, bright: -0.1, shade: 0.3 })),
      // wood the hill right of the end stop, which was bare but for one tree on its crown (last, so nothing above moves)
      ...shoreTrees(150, { x: [55, 190], z: [-175, -45], min: 6, max: 300, h: [12, 20], conifer: 0.6, shade: 0.35 })(help).filter(noGap).map(lowInGap),
    ]),
    bushes: creekless(dBushes),
    extras: (() => {
      const avoid = (x, z) => z < -3.5 && clearOfDock({ x, z, sx: 0.3 }) && !(x > -6.2 && x < -2 && z > -6.2 && z < -3.4);
      return {
        seed: 11,
        // [x, z, pads, spread, pad size]; the far ones are scaled up so they still read at distance
        lilies: { sd: dLake, avoid, rafts: [[-16, -30, 14, 6, 1.6], [D_ISLET.x + 6, D_ISLET.z + 3, 14, 5, 2.0], [-1.8, -22, 9, 3.5, 1.0], [-0.5, -31, 10, 3.5, 1.1], [-4.5, -38, 12, 5, 1.3],
          // the water in the end-stop view
          [1.4, -36.5, 12, 3.5, 1.0], [3.4, -44, 10, 3, 1.15], [-1.8, -33.5, 9, 3, 0.95]] },
        // two flocks on their own timing, so the sky is rarely empty for long
        birds: [{ count: 7, size: 1.7, x: [-150, 150], y: 30, z: -120, speed: 8, pause: 8, offset: 8 },
          { count: 4, size: 1.4, x: [-150, 150], y: 21, z: -85, speed: 6.5, pause: 6, offset: 26 }],
        motes: { x: [-4, 14], y: [0.3, 2.6], z: [-40, -3], count: 240 },
        // props along the walk and at its end stop (props.js)
        dressing: {
          cairns: [{ x: 1.6, z: -24.6 }],
          signposts: [{ x: 2.75, z: -16.2, yaw: Math.PI / 2 }],
          campfires: [{ x: 7.4, z: -20.6, lit: false, seats: [[8.6, -21.9, 1.4, 0.7], [8.3, -19.3, 1.3, -0.6]] }],
          birdhouses: [{ x: 4.3, z: -22.2, yaw: -Math.PI / 2 - 0.3 }],
          mushrooms: [[6.9, -15.0, 6, 0.9], [5.6, -19.3, 5, 0.6], [9.2, -30.2, 6, 1.0], [12.4, -25.0, 4, 0.6]],
          bridges: [{ x: 8.58, z: -40, yaw: Math.atan2(2.6, -9), len: 5.2, rise: 0.32 }],
          ducks: [{ x: -3, z: -27, r: 2.2, speed: 0.1 }, { x: -2.6, z: -27.6, r: 2.6, speed: 0.1, phase: 0.5 }, { x: -6, z: -35, r: 3, speed: -0.08, phase: 2 }],
          // the tree the camera stops at: the branch reaches out on its far side, clear of the page
          swings: [{ x: D_SWING_TREE[0], z: D_SWING_TREE[1], yaw: 0.98, h: 3.4, reach: 2.7, lamps: [0.38, 0.92] }],
        },
      };
    })(),
    rocks: creekless((help) => [
      // boulders standing in the shallows
      ...[[-6.6, -24.5, 1.15], [-7.7, -25.6, 0.6], [-3.4, -31, 0.85], [-9.5, -40, 1.3]].map(([x, z, s], i) => (
        { x, y: s * 0.12, z, sx: s, sy: s * 0.72, sz: s * 0.9, yaw: i * 1.9, tilt: 0.12, seed: 80 + i, warm: 0.3, turf: 0, bright: 0.06 })),
      // the end-stop view: along the shore, in the shallows, and in the grass right of the path
      ...[[3.1, -33.2, 0.55], [3.9, -36.2, 0.7], [4.6, -38.6, 0.45], [1.3, -34.6, 0.6], [2.3, -38.1, 0.5], [0.4, -32, 0.4],
        [8.2, -29.8, 0.4], [11.8, -36.4, 0.55], [12.6, -35.6, 0.3]].map(([x, z, s], i) => (
        { x, y: help.h(x, z) + s * 0.2, z, sx: s, sy: s * 0.7, sz: s * 0.9, yaw: i * 1.7 + 0.3, tilt: 0.1, seed: 120 + i, warm: 0.4, turf: 0, bright: 0.05 })),
      ...[[D_ISLET.x + 1.2, D_ISLET.z - 2.8, 0.9], [3.6, -19.5, 0.35], [4.4, -26.2, 0.45], [7.9, -31.4, 0.4], [6.2, -37.4, 0.55], [0.4, -20.5, 0.5], [10.4, -41.6, 0.55], [7.5, -12.4, 0.7], [8.4, -11.9, 0.42], [-2.3, -4.4, 0.4], [-1.9, -3.9, 0.25], [6.2, -10.4, 0.5], [15.2, -27, 1.1], [16.4, -26.1, 0.6], [5.3, -20.6, 0.5], [23.5, -15, 0.9], [11, -34, 0.8]].map(([x, z, s], i) => (
        { x, y: help.h(x, z) + s * 0.2, z, sx: s, sy: s * 0.7, sz: s * 0.9, yaw: i * 2.3, tilt: 0.1, seed: 60 + i, warm: 0.4, turf: 0, bright: 0.05 })),
      ...shoreRocks(44, { x: [-8, 12], z: [-56, -9.5], reach: 1.5, s: [0.25, 0.95] })(help),
      ...shoreRocks(9, { x: [-8, 3], z: [-9.5, -4.5], reach: 1.1, s: [0.14, 0.34] })(help),
      // stepping stones out from the bank
      // [x, z, size, height, tilt]: staggered, uneven sizes, some sitting higher than others
      ...[[-2.35, -5.85, 0.46, 0.15, 0.05], [-3.05, -4.85, 0.34, 0.11, -0.06], [-3.95, -5.45, 0.41, 0.16, 0.08], [-4.6, -4.2, 0.3, 0.1, -0.04],
        [-5.5, -4.75, 0.43, 0.13, 0.06]].map(([x, z, s, h, tilt], i) => (
        { x, y: h * 0.25 - 0.02, z, sx: s, sy: h, sz: s * (0.7 + (i % 3) * 0.1), yaw: i * 2.3 + 0.4, tilt, seed: 40 + i, warm: 0.3, turf: 0, bright: 0.04 + (i % 2) * 0.06 })),
    ].filter(clearOfDock).filter(offPath)),
  },
};

const ownLake = (x, z) => {
  const w = wob(x, z);
  const shore = Math.max(-14, 4 - Math.max(0, -z - 16) * 0.35) + w * 0.6;
  return Math.max(shore - x, z + 12.5 - w * 0.4, x - 150, -185 + w * 3 - z);
};
DEFS.e = {
  name: 'Lakeside clearing',
  conifer: 0.4,
  fog: 0.0085, fogMax: 0.84, body: 0.42, sunAz: 41,
  cam: { x: -3.6, z: -13.2, yaw: -22, pitch: 5, eye: 1.7 },
  lakeSD: ownLake,
  rise: (x, z) => smoothstep(5, 170, ownLake(x, z)) * 48 * (0.75 + 0.35 * fbm2(x * 0.01, z * 0.01, 2)) * smoothstep(-42, -115, z),
  ranges: [
    { dist: 1000, depth: 480, height: 250, haze: 0.46, seed: 7, notch: 0.65 },
    { dist: 1650, depth: 660, height: 470, haze: 0.62, seed: 8, notch: 0.45 },
    { dist: 2600, depth: 820, height: 720, haze: 0.76, seed: 9 },
  ],
  snow: 330, reflect: 0.75,
  path: [[-1.3, -10.8, 0.9], [-1.9, -14.2, 0.9], [-0.4, -17.6, 0.85], [2.9, -19.4, 0.8]],
  dock: { x: 3.0, z: -19.5, len: 9, yaw: -1.15 },
  chair: { x: -1.3, z: -19.7, yaw: 2.0 },
  pal: { waterShallow: [150, 220, 210], waterDeep: [44, 150, 164], waterSky: [122, 202, 204], flower: [232, 84, 150], flowerB: [252, 240, 226], flowerCore: [255, 226, 150] },
  flowers: [[-14, 3, -27, -10.5, 2600, 0.03, 0.055], [-34, 0, -62, -27, 3200, 0.036, 0.065]],
  trees: shoreTrees(290, { x: [-260, 280], z: [-350, -22], min: 3, max: 130, h: [11, 18], conifer: 0.6, shade: 0.35 }),
  rocks: shoreRocks(36, { x: [-5, 9], z: [-32, -12], reach: 1.4, s: [0.2, 0.66] }),
};

export const ENV = { id: DEFS[id] ? id : 'base', ...(DEFS[id] ?? DEFS.base) };
export const ENV_NAMES = Object.fromEntries(Object.entries(DEFS).map(([k, v]) => [k, v.name]));
