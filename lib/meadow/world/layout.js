// Scene composition. Everything visible in the reference frame is placed by pointing at its
// pixel in that frame (see core/refspace.js); the forest that wraps around the clearing and the
// off-screen trees that dapple the foreground are scattered procedurally.

import * as THREE from 'three';
import { HERO } from '../config.js';
import { mulberry32 } from '../core/noise.js';
import { pixelAtDepth, pixelsToMeters, viewDepth } from '../core/refspace.js';
import { addMound, groundMasks, pixelToGround, STREAM_TIP, streamCenterZ, streamSD, terrainHeight } from './heightfield.js';
import { ENV } from '../env.js';

/** Ground point under reference pixel column `px` at a given view depth. */
function groundAtDepth(px, depth) {
  let lo = 300, hi = 900; // py range: point is above ground at lo, below at hi
  const p = new THREE.Vector3();
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    p.copy(pixelAtDepth(px, mid, depth));
    if (p.y > terrainHeight(p.x, p.z)) lo = mid; else hi = mid;
  }
  p.y = terrainHeight(p.x, p.z);
  return p;
}

const ground = (o) => (o.basePy != null ? pixelToGround(o.px, o.basePy) : groundAtDepth(o.px, o.depth));

// ---------------------------------------------------------------------------------------------
// Trees
// ---------------------------------------------------------------------------------------------
const HERO_TREES = [
  // left foreground group
  { px: 25, basePy: 472, topPy: 85, type: 'broad', seed: 11, params: { lean: [1.15, 0.15], bow: 0.5 } },
  { px: 53, depth: 34, topPy: 165, type: 'slim', seed: 21 },
  { px: 181, depth: 27, topPy: 222, type: 'slim', seed: 22 },
  { px: 248, basePy: 452, topPy: 227, type: 'slim', seed: 23 },
  { px: 329, depth: 30, topPy: 236, type: 'slim', seed: 24 },
  { px: 357, basePy: 472, topPy: 218, type: 'slim', seed: 25 },
  { px: 120, depth: 38, topPy: 205, type: 'tall', seed: 26 },
  // tall trees standing behind the (absent) windmill house
  { px: 420, depth: 27, topPy: 117, type: 'tall', seed: 31 },
  { px: 500, depth: 30.5, topPy: 125, type: 'tall', seed: 32 },
  { px: 592, depth: 29, topPy: 152, type: 'tall', seed: 33 },
  // right of the house, behind the rock ledge
  { px: 664, depth: 32, topPy: 199, type: 'umbrella', seed: 41 },
  { px: 736, depth: 32, topPy: 222, type: 'umbrella', seed: 42 },
  { px: 831, depth: 34, topPy: 281, type: 'umbrella', seed: 43 },
  { px: 875, depth: 37, topPy: 263, type: 'umbrella', seed: 44 },
  // small trees in the distance
  { px: 927, depth: 38, topPy: 326, type: 'lollipop', seed: 51 },
  { px: 967, depth: 44, topPy: 347, type: 'lollipop', seed: 52 },
  { px: 987, depth: 74, topPy: 402, type: 'lollipop', seed: 53 },
  // far right, up on the hill
  { px: 1165, depth: 60, topPy: 324, type: 'umbrella', seed: 61 },
  { px: 1261, depth: 40, topPy: 292, type: 'umbrella', seed: 62 },
  { px: 1331, depth: 30, topPy: 255, type: 'umbrella', seed: 63 },
];

function heroTrees() {
  return HERO_TREES.map((t) => {
    const base = ground(t);
    const top = pixelAtDepth(t.px, t.topPy, viewDepth(base));
    return { x: base.x, y: base.y - 0.12, z: base.z, height: top.y - base.y, type: t.type, seed: t.seed, params: t.params, yaw: t.params?.lean ? 0 : t.seed * 1.7 };
  });
}

// Giant trees just outside the frame. The sun is behind-left of the camera, so their crowns are
// what throw the dappled shade over the foreground, the left meadow and the right bank. Each
// crown pad is placed (world space) where its shadow needs to fall in the reference frame.
function shadeTrees() {
  const T = (x, z, height, seed, lean, pads, extra = {}) => {
    const y = terrainHeight(x, z) - 0.15;
    return {
      x, y, z, height, type: 'canopy', seed, yaw: 0,
      params: { height, lean, bow: 0.35, pads: pads.map(([px, py, pz, r]) => ({ x: px - x, y: py - y, z: pz - z, r })), ...extra },
    };
  };
  return [
    // left of the camera: shades the right bank beyond the stream. Its leaning trunk would lay a
    // dark bar across the sunlit ford, so only its crown casts a shadow.
    T(-8.6, -2.0, 13, 71, [3.4, -0.4], [[-5.3, 12.2, -1.6, 2.4], [-4.1, 12.0, -0.9, 2.2], [-2.3, 12.6, -2.9, 2.4]], { trunkShadow: false }),
    // right of the camera, leaning in over the water
    T(7.4, -3.4, 13, 76, [-4.2, -0.8], [[0.4, 12.0, -1.3, 2.2], [0.8, 12.6, -4.2, 2.9], [3.6, 12.2, -5.4, 2.6], [6.8, 12.6, -3.0, 2.5]]),
    // further left: the two dark bands across the left meadow
    T(-17.0, -2.4, 12.8, 72, [0.6, -0.3], [[-18.1, 12.0, -1.6, 2.0], [-15.4, 12.2, -2.9, 1.7], [-21.5, 12.5, -3.2, 2.4]]),
    T(-24, -9.5, 14, 73, [0.6, 0.5], [[-24.5, 12.5, -9.0, 3.2], [-21.0, 12.0, -11.0, 2.6], [-27.0, 12.8, -12.0, 2.8], [-23.0, 13.2, -6.0, 2.4]]),
    // behind the camera: the dark foreground corners, leaving the sunlit patch on the path
    T(-11.4, 3.2, 11.6, 74, [0.4, -0.2], [[-12.3, 10.8, 3.6, 2.2], [-9.95, 10.6, 2.4, 1.45], [-13.3, 11.5, 1.5, 2.0], [-15.6, 11.5, 1.6, 2.0]]),
    T(-3.6, 3.0, 12, 75, [0.4, -0.5], [[-4.4, 11.2, 2.2, 2.2], [-2.0, 11.5, 0.8, 2.4], [-5.2, 12.0, 4.8, 2.2]]),
  ];
}

// Forest wrapping the clearing. Dense wall on the left and behind the house, open to the right.
function forestTrees() {
  const rng = mulberry32(2024);
  const out = [];
  const types = ['tall', 'slim', 'umbrella', 'tall', 'broad'];
  const push = (x, z, hMin, hMax, detail) => {
    out.push({
      x, y: terrainHeight(x, z) - 0.15, z,
      height: hMin + rng() * (hMax - hMin),
      type: types[Math.floor(rng() * types.length)],
      seed: Math.floor(rng() * 1000),
      yaw: rng() * 6.28,
      detail,
      bright: (rng() - 0.5) * 0.16,
      warm: rng() * 0.5,
    });
  };
  // visible wall: stratified in reference-pixel columns x depth
  for (let i = 0; i < 96; i++) {
    const px = -520 + rng() * 1150;
    const depth = 36 + Math.pow(rng(), 1.5) * 52;
    const p = groundAtDepth(px, depth);
    push(p.x, p.z, 10, 16.5, 0.6);
    out[out.length - 1].shade = Math.min(0.7, Math.max(0, (depth - 40) / 30));
  }
  // sparse far trees on the open right side
  for (let i = 0; i < 9; i++) {
    const p = groundAtDepth(900 + rng() * 520, 80 + rng() * 80);
    push(p.x, p.z, 7, 10, 0.5);
  }
  // around and behind the camera (free-camera coverage + ambient shade)
  for (let i = 0; i < 52; i++) {
    const a = rng() * Math.PI * 2;
    const r = 16 + rng() * 44;
    const x = Math.cos(a) * r, z = 6 + Math.abs(Math.sin(a)) * r * 0.9 + rng() * 6;
    if (streamSD(x, z) < 2.5) continue;
    // the crowns right behind the camera are authored by hand (shadeTrees) - keep randoms away
    if (z < 15 && x > -24 && x < 8) continue;
    push(x, z, 10, 16, 0.6);
  }
  for (let i = 0; i < 26; i++) {
    const x = -30 - rng() * 45, z = -22 + rng() * 34;
    if (streamSD(x, z) < 3) continue;
    push(x, z, 10, 16, 0.6);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Rocks: [px, basePy | depth, width px, height px, options]
// ---------------------------------------------------------------------------------------------
function rock(o) {
  const base = ground(o);
  const d = viewDepth(base);
  const w = pixelsToMeters(o.w, d), h = pixelsToMeters(o.h, d);
  return {
    x: base.x, y: base.y + h * (o.sink ?? 0.28), z: base.z,
    sx: w / 2, sy: h * (o.blocky ? 1.5 : o.flatTop ? 1.25 : 0.78), sz: (w / 2) * (o.deep ?? 0.8),
    yaw: o.yaw ?? o.seed * 2.1, tilt: o.tilt ?? 0, seed: o.seed,
    warm: o.warm ?? 0, turf: o.turf ?? 0, bright: o.bright ?? 0, shade: o.shade ?? 0, flatTop: o.flatTop, blocky: o.blocky,
  };
}

function rocks() {
  const list = [
    // low slab left of the path, turf mound on top
    rock({ px: 188, basePy: 519, w: 138, h: 22, seed: 101, flatTop: 0.42, sink: 0.35, deep: 0.62, yaw: 0.1, bright: 0.04 }),
    // warm boulders tucked into the big bush on the right
    rock({ px: 1140, basePy: 499, w: 62, h: 44, seed: 3, warm: 0.9, sink: 0.3, bright: 0.06, yaw: 0.6 }),
    rock({ px: 1062, basePy: 498, w: 38, h: 18, seed: 6, warm: 0.6, sink: 0.25, bright: 0.05 }),
    // ledge at the foot of the slope behind the house
    rock({ px: 706, depth: 27.8, w: 92, h: 66, seed: 8, turf: 1, sink: 0.18, bright: -0.2, shade: 0.8, blocky: true, yaw: 0.25, tilt: 0.07 }),
    rock({ px: 752, depth: 27.0, w: 70, h: 48, seed: 5, turf: 1, sink: 0.2, bright: -0.2, shade: 0.7, blocky: true, yaw: -0.5, tilt: -0.08 }),
    rock({ px: 812, depth: 27.4, w: 104, h: 32, seed: 1, turf: 1, sink: 0.2, deep: 0.7, bright: -0.1, shade: 0.35, blocky: true, yaw: -0.2, tilt: 0.05 }),
    rock({ px: 884, depth: 27.9, w: 110, h: 25, seed: 2, turf: 1, sink: 0.22, deep: 0.7, bright: 0.0, blocky: true, yaw: 0.35, tilt: -0.04 }),
    rock({ px: 950, depth: 28.8, w: 76, h: 18, seed: 7, turf: 1, sink: 0.25, blocky: true, yaw: 0.6 }),
    rock({ px: 668, depth: 28.6, w: 50, h: 40, seed: 3, turf: 0.8, sink: 0.2, bright: -0.2, shade: 0.8, yaw: 1.1 }),
    // pale outcrop deep in the left forest
    rock({ px: 62, depth: 41, w: 150, h: 54, seed: 9, turf: 0.8, bright: 0.2, sink: 0.2, blocky: true }),
    rock({ px: 170, depth: 44, w: 90, h: 34, seed: 4, turf: 0.8, bright: 0.16, sink: 0.2, blocky: true }),
    rock({ px: 6, basePy: 503, w: 34, h: 24, seed: 5, sink: 0.3 }),
    // right hill
    rock({ px: 1282, depth: 33, w: 150, h: 44, seed: 10, turf: 1, sink: 0.3, deep: 0.6, bright: -0.1, yaw: 0.3 }),
    rock({ px: 1142, depth: 70, w: 86, h: 32, seed: 12, turf: 1, sink: 0.2, blocky: true, bright: -0.06, yaw: 0.1 }),
    rock({ px: 1040, depth: 95, w: 60, h: 18, seed: 13, turf: 1, sink: 0.2, blocky: true }),
    rock({ px: 890, depth: 60, w: 80, h: 20, seed: 14, turf: 1, sink: 0.25, bright: 0.05, blocky: true }),
  ];
  // small stones strewn over the bare banks, thickest at the waterline
  const rng = mulberry32(77);
  let stones = 0;
  for (let i = 0; i < 900 && stones < 130; i++) {
    const x = -10 + rng() * (STREAM_TIP.x + 10.5), z = streamCenterZ(x) - 4 + rng() * 7.5;
    const sd = streamSD(x, z);
    if (sd < 0.02 || sd > 1.4 || rng() > 1 - 0.65 * (sd / 1.4)) continue;
    if (groundMasks(x, z).dirt < 0.8) continue;
    const s = 0.02 + rng() * rng() * 0.055;
    list.push({
      x, y: terrainHeight(x, z) + s * 0.12, z, sx: s, sy: s * (0.4 + rng() * 0.3), sz: s * (0.7 + rng() * 0.4),
      yaw: rng() * 6, seed: stones, warm: rng() * 0.6, turf: 0, bright: (rng() - 0.4) * 0.16, pebble: true,
    });
    stones++;
  }
  return list;
}

// ---------------------------------------------------------------------------------------------
// Bushes: [px, basePy | depth, radius px]
// ---------------------------------------------------------------------------------------------
function bush(o) {
  const base = ground(o);
  const r = pixelsToMeters(o.r, viewDepth(base));
  return { x: base.x, y: base.y - r * 0.12, z: base.z, r, tall: o.tall ?? 0.75, seed: o.seed, bright: o.bright ?? 0, warm: o.warm ?? 0, shade: o.shade ?? 0 };
}

function bushes() {
  const list = [
    // the bright bush mound on the right
    bush({ px: 985, basePy: 498, r: 58, seed: 1, tall: 0.82, bright: 0.12, warm: 0.4 }),
    bush({ px: 1052, basePy: 494, r: 54, seed: 2, tall: 0.92, bright: 0.14, warm: 0.45 }),
    bush({ px: 1100, basePy: 490, r: 34, seed: 3, tall: 0.8, bright: 0.04, warm: 0.3 }),
    // dark bush in the shade on the right bank
    bush({ px: 1238, basePy: 548, r: 52, seed: 4, tall: 0.95, bright: -0.12 }),
    // small shrubs in the meadow
    bush({ px: 812, basePy: 476, r: 36, seed: 5, tall: 0.6 }),
    bush({ px: 250, basePy: 532, r: 22, seed: 6, tall: 0.8, bright: -0.08 }),
    bush({ px: 700, basePy: 472, r: 20, seed: 7, tall: 0.7 }),
    bush({ px: 150, basePy: 470, r: 26, seed: 8, tall: 0.7 }),
    bush({ px: 468, basePy: 474, r: 16, seed: 9, tall: 0.8 }),
    bush({ px: 640, basePy: 470, r: 14, seed: 10, tall: 0.8 }),
    bush({ px: 1175, basePy: 468, r: 30, seed: 11, tall: 0.7, bright: -0.05 }),
    bush({ px: 1320, basePy: 480, r: 40, seed: 12, tall: 0.8, bright: -0.1 }),
  ];
  // undergrowth along the forest edge (the dark band under the left trees)
  const rng = mulberry32(555);
  for (let i = 0; i < 20; i++) {
    const px = -160 + i * 42 + rng() * 26;
    const b = bush({ px, depth: 25.5 + rng() * 7, r: 22 + rng() * 24, seed: 20 + i, tall: 0.7 + rng() * 0.3, bright: -0.32 });
    if (b.x > -7.5 && b.x < 1.5) continue; // keep the house plot and the path clear
    list.push(b);
  }
  // Forest backdrop: big dark masses of undergrowth between and behind the trunks. With the
  // teal haze on top they close the forest into a solid wall (a matte-painting trick).
  for (let row = 0; row < 3; row++) {
    for (let px = -620; px < 665; px += 62) {
      const b = bush({ px: px + rng() * 40, depth: 40 + row * 11 + rng() * 6, r: 0, seed: 100 + list.length, tall: 1.25 + rng() * 0.4, bright: -0.1, shade: 0.8 });
      b.r = 3.4 + rng() * 2.4;
      b.y = terrainHeight(b.x, b.z) - 0.4;
      list.push(b);
    }
  }
  return list;
}

// ---------------------------------------------------------------------------------------------
export function buildLayout() {
  const dry = (o) => !ENV.lakeSD || streamSD(o.x, o.z) > 0.9;
  let rockList = ENV.noStream ? [] : rocks(); // noStream: nothing hand-placed from the original shot survives
  // turf cap on the slab so grass can grow on top of it
  const slab = rockList[0];
  if (slab && dry(slab)) {
    const mound = { x: slab.x, z: slab.z, rx: slab.sx * 0.95, rz: slab.sz * 0.95, y: slab.y + slab.sy * 0.3, h: 0.34 };
    addMound(mound);
    rockList.push({ x: mound.x, y: mound.y, z: mound.z, sx: mound.rx, sy: mound.h, sz: mound.rz, yaw: 0, seed: 0, turf: 1.6, smooth: true });
  }
  rockList = rockList.filter((r) => r.pebble || dry(r));

  // environment extras (see env.js): conifers, far-shore woods, boulders at the waterline
  const rng = mulberry32(90210);
  const help = { rng, sd: streamSD, h: terrainHeight };
  let trees = [...(ENV.noStream ? [] : heroTrees()), ...shadeTrees(), ...forestTrees()].filter(dry);
  // keep the shore path clear: distance from a point to the path's centre line
  const offPath = (o, pad) => !ENV.path || ![ENV.path, ...(ENV.spurs ?? [])].some((pts) => pts.some(([x0, z0, w], i, a) => {
    const [x1, z1] = a[i + 1] ?? a[i];
    const dx = x1 - x0, dz = z1 - z0, t = Math.min(1, Math.max(0, ((o.x - x0) * dx + (o.z - z0) * dz) / (dx * dx + dz * dz || 1)));
    return Math.hypot(o.x - x0 - dx * t, o.z - z0 - dz * t) < w + pad;
  }));
  if (ENV.noStream) trees = trees.filter((t) => t.type !== 'canopy'); // no crowns hanging into the frame: an open, sunlit shore
  rockList = rockList.filter((r) => r.pebble || offPath(r, Math.max(r.sx, r.sz) + 0.4));
  if (ENV.conifer) {
    for (const t of trees) {
      if (t.type === 'canopy' || t.params || rng() > ENV.conifer) continue;
      t.type = 'conifer';
      t.bright = (t.bright ?? 0) - 0.16;
    }
  }
  for (const t of ENV.trees?.(help) ?? []) trees.push({ ...t, y: terrainHeight(t.x, t.z) - 0.15, seed: Math.floor(rng() * 1000), yaw: rng() * 6.28 });
  trees = trees.filter((t) => offPath(t, 1.8));
  for (const r of ENV.rocks?.(help) ?? []) rockList.push(r);
  const bushList = [...(ENV.noStream ? [] : bushes()), ...(ENV.bushes?.(help) ?? [])].filter((b) => dry(b) && offPath(b, b.r + 0.3));

  // soft contact shadows baked into the terrain splat map
  const ao = [];
  for (const t of trees) ao.push({ x: t.x, z: t.z, r: 1.1 + t.height * 0.06, s: 0.5 });
  for (const b of bushList) ao.push({ x: b.x, z: b.z, r: b.r * 1.35, s: 0.55 });
  for (const r of rockList) if (!r.pebble) ao.push({ x: r.x, z: r.z, r: Math.max(r.sx, r.sz) * 1.35, s: 0.5 });

  return { trees, rocks: rockList, bushes: bushList, ao, heroCameraXZ: [HERO.position.x, HERO.position.z] };
}
