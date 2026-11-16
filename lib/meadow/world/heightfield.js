// Terrain definition: analytic height function, the stream channel, footpaths and the baked
// lookup textures (height, splat, tiling detail) that the terrain, water and grass share.

import * as THREE from 'three';
import { GROUND, HERO } from '../config.js';
import { clamp01, fbm2, lerp, smoothstep } from '../core/noise.js';
import { pixelRay, pixelsToMeters, pixelToPlane, viewDepth } from '../core/refspace.js';
import { groundDetailData, makeGroundDetail, TUFT_CELLS } from '../core/textures.js';
import { ENV } from '../env.js';

export const WATER_LEVEL = 0;

/** Square world region covered by the baked lookup textures. */
export const REGION = { minX: -72, minZ: -100, size: 144, heightRes: 512, splatRes: 1024 };

// ---------------------------------------------------------------------------------------------
// Stream. Authored as the far/near water edges read off the reference frame at a set of pixel
// columns; each pair becomes a centre point + half width on the water plane.
// ---------------------------------------------------------------------------------------------
const STREAM_EDGES = [
  // px, far edge py, near edge py
  [0, 590, 668], [60, 594, 668], [110, 600, 668], [150, 602, 668], [300, 603, 662], [450, 605, 656], [600, 603, 652],
  [700, 600, 646], [800, 601, 636], [900, 606, 628], [1000, 610, 622], [1060, 601, 614], [1100, 594, 608], [1160, 589, 600],
];

/** Pixel row of the water's far edge at a pixel column. */
function farEdgePy(px) {
  const e = STREAM_EDGES;
  if (px <= e[0][0]) return e[0][1];
  for (let i = 0; i < e.length - 1; i++) {
    if (px <= e[i + 1][0]) return lerp(e[i][1], e[i + 1][1], (px - e[i][0]) / (e[i + 1][0] - e[i][0]));
  }
  return e[e.length - 1][1];
}

const STREAM = [
  // off-screen continuation to the left (x, z, half width)
  [-110, -19, 4.2], [-70, -13, 3.6], [-42, -9.4, 3.0], [-24, -7.7, 2.3], [-13, -7.0, 1.75],
];
for (const [px, pyFar, pyNear] of STREAM_EDGES) {
  const a = pixelToPlane(px, pyFar, WATER_LEVEL), b = pixelToPlane(px, pyNear, WATER_LEVEL);
  STREAM.push([(a.x + b.x) / 2, (a.z + b.z) / 2, Math.hypot(a.x - b.x, a.z - b.z) / 2]);
}
{
  const tip = pixelToPlane(1207, 590, WATER_LEVEL);
  STREAM.push([tip.x, tip.z, 0]);
}

const STREAM_BOUNDS = { minZ: -32, maxZ: 6, maxX: STREAM[STREAM.length - 1][0] + 6 };

// Sand bars, all just under the surface: [px, py, radius px across, radius px in depth, crest above water (m)]
const BARS = [
  [422, 625, 26, 7, -0.02],
  [512, 627, 14, 5, -0.07],
  [632, 617, 24, 7, -0.04],
  [562, 609, 16, 8, -0.01], // spit off the far bank
].map(([px, py, rx, ry, top]) => {
  const c = pixelToPlane(px, py, WATER_LEVEL), ex = pixelToPlane(px + rx, py, WATER_LEVEL), ez = pixelToPlane(px, py - ry, WATER_LEVEL);
  return { x: c.x, z: c.z, rx: Math.max(0.3, Math.hypot(ex.x - c.x, ex.z - c.z)), rz: Math.max(0.3, Math.hypot(ez.x - c.x, ez.z - c.z)), top };
});

/** Signed distance to the water's edge (negative inside the stream). */
export function streamSD(x, z) {
  const s = streamOnlySD(x, z);
  return ENV.lakeSD ? Math.min(s, ENV.lakeSD(x, z, streamCenterZ(x))) : s;
}

function streamOnlySD(x, z) {
  if (ENV.noStream) return 99;
  if (z > STREAM_BOUNDS.maxZ || z < STREAM_BOUNDS.minZ || x > STREAM_BOUNDS.maxX) return 99;
  let best = 99;
  for (let i = 0; i < STREAM.length - 1; i++) {
    const a = STREAM[i], b = STREAM[i + 1];
    const abx = b[0] - a[0], abz = b[1] - a[1];
    const t = clamp01(((x - a[0]) * abx + (z - a[1]) * abz) / (abx * abx + abz * abz));
    const d = Math.hypot(x - (a[0] + abx * t), z - (a[1] + abz * t)) - lerp(a[2], b[2], t);
    if (d < best) best = d;
  }
  return best;
}

/** z of the stream centre line at a given x (the stream is roughly a function of x). */
export function streamCenterZ(x) {
  if (x <= STREAM[0][0]) return STREAM[0][1];
  for (let i = 0; i < STREAM.length - 1; i++) {
    const a = STREAM[i], b = STREAM[i + 1];
    if (x <= b[0]) return lerp(a[1], b[1], (x - a[0]) / (b[0] - a[0]));
  }
  return STREAM[STREAM.length - 1][1];
}

export const STREAM_TIP = { x: STREAM[STREAM.length - 1][0], z: STREAM[STREAM.length - 1][1] };

// ---------------------------------------------------------------------------------------------
// Height
// ---------------------------------------------------------------------------------------------
const gauss = (x, z, cx, cz, r) => Math.exp(-((x - cx) * (x - cx) + (z - cz) * (z - cz)) / (r * r));

export function terrainHeight(x, z) {
  // meadow floor with slow undulation
  let h = 0.27 + fbm2(x * 0.045 + 3.1, z * 0.045 - 1.7, 3) * 0.3;
  // ground climbs gently away from the stream towards the house and the forest
  h += smoothstep(-9, -34, z) * 0.5;
  // little rise where the camera stands
  h += smoothstep(-5.2, 1.5, z) * 0.1;
  // hill on the right carrying the far-right trees up to eye level
  if (!ENV.noStream) h += smoothstep(11, 40, x - (z + 20) * 0.15) * 0.9;
  // grassy slope behind the rock ledge
  if (!ENV.noStream) h += 2.5 * gauss(x, z, 10, -52, 17) + smoothstep(-24, -40, z) * smoothstep(-6, 9, x) * 0.9;
  // distant rolling hills
  const dist = Math.hypot(x, z + 12);
  if (dist > 50) {
    const far = smoothstep(50, 240, dist);
    h += far * (0.3 + fbm2(x * 0.0048 + 7.7, z * 0.0048 + 2.2, 3) * 3.6 + fbm2(x * 0.017, z * 0.017, 2) * 0.9);
    h += 4 * gauss(x, z, -40, -150, 80);
  }
  if (ENV.rise) h += ENV.rise(x, z, streamCenterZ(x));
  // stream channel + beach, with a waterline that wanders at two scales
  const sd = streamSD(x, z);
  if (sd < 3.4) {
    const s = sd + fbm2(x * 0.55 + 9.1, z * 0.55 + 4.2, 2) * 0.28 + fbm2(x * 1.7 + 2.3, z * 1.7 + 6.1, 2) * 0.12;
    const beach = s >= 0 ? s * 0.075 : -0.52 * smoothstep(0, 0.8, -s);
    h = lerp(beach, h, smoothstep(0.25, 2.8, s));
    if (sd < 0.9 && !ENV.noStream) {
      for (const b of BARS) {
        const e = Math.hypot((x - b.x) / b.rx, (z - b.z) / b.rz);
        if (e < 1.7) h = Math.max(h, b.top - 0.5 * smoothstep(0.25, 1.7, e));
      }
    }
  }
  return h;
}

/** Ray-march the hero camera ray of a reference pixel against the terrain. */
export function pixelToGround(px, py) {
  const d = pixelRay(px, py);
  const o = HERO.position;
  let t0 = 0.5, t = 0.5, step = 0.2;
  const p = new THREE.Vector3();
  for (let i = 0; i < 400; i++) {
    p.copy(o).addScaledVector(d, t);
    if (p.y <= terrainHeight(p.x, p.z)) {
      let lo = t0, hi = t;
      for (let k = 0; k < 14; k++) {
        const mid = (lo + hi) / 2;
        p.copy(o).addScaledVector(d, mid);
        if (p.y <= terrainHeight(p.x, p.z)) hi = mid; else lo = mid;
      }
      p.copy(o).addScaledVector(d, hi);
      p.y = terrainHeight(p.x, p.z);
      return p;
    }
    t0 = t;
    t += step;
    step *= 1.035;
    if (t > 900) break;
  }
  // ray never met the ground (above the horizon): fall back to a far point
  p.copy(o).addScaledVector(d, 300);
  p.y = terrainHeight(p.x, p.z);
  return p;
}

/** A pixel-space ellipse laid on the ground: centre, and world radii along x and along the view depth. */
function pixelEllipse(px, py, rx, ry) {
  const c = pixelToGround(px, py), ex = pixelToGround(px + rx, py), ez = pixelToGround(px, py - ry);
  return { x: c.x, z: c.z, rx: Math.hypot(ex.x - c.x, ex.z - c.z), rz: Math.hypot(ez.x - c.x, ez.z - c.z) };
}

// ---------------------------------------------------------------------------------------------
// Bare ground, authored in reference pixels.
// Footpaths are polylines: [px, py, half-width in px]
// ---------------------------------------------------------------------------------------------
function pathFromPixels(pts, extra = []) {
  const out = pts.map(([px, py, hw]) => {
    const p = pixelToGround(px, py);
    return [p.x, p.z, Math.max(0.16, pixelsToMeters(hw, viewDepth(p)))];
  });
  return [...extra.before ?? [], ...out, ...extra.after ?? []];
}

const PATHS = [
  {
    // main path: passes the camera, fords the stream by a narrow neck, widens around the pale
    // clay patch and climbs to the (absent) windmill house
    strength: 1,
    pts: pathFromPixels(
      [[1010, 757, 46], [850, 705, 38], [720, 668, 32], [640, 652, 30], [598, 614, 32], [592, 594, 40], [578, 578, 40],
        [545, 563, 40], [508, 549, 56], [500, 535, 62], [511, 521, 54], [527, 509, 40], [540, 498, 30], [548, 487, 21], [551, 476, 15]],
      { before: [[4.4, 0.6, 0.34], [3.3, -0.9, 0.34]], after: [[-4.6, -22.4, 1.1]] },
    ),
  },
  {
    // worn trail running left from the clay patch, then up towards the rock slab: thin grass, not bare soil
    strength: 0.62,
    pts: pathFromPixels([[478, 560, 26], [440, 558, 20], [400, 556, 15], [360, 555, 14], [340, 545, 15], [333, 530, 14],
      [318, 514, 12], [295, 499, 9], [265, 487, 7], [228, 478, 6]]),
  },
  {
    // short trail on the right bank
    strength: 0.85,
    pts: pathFromPixels([[722, 548, 14], [748, 527, 14], [790, 512, 12], [838, 498, 10], [880, 488, 7]]),
  },
];
if (ENV.noStream) {
  // our own ground: only the environment's path
  PATHS.length = 0;
  PATHS.push({ strength: 1, pts: ENV.path });
  for (const pts of ENV.spurs ?? []) PATHS.push({ strength: 1, pts });
} else if (ENV.path) {
  // the main path no longer climbs to the house: it turns and follows the lake shore
  PATHS[0].pts = PATHS[0].pts.filter(([, z]) => z > -9.5).concat(ENV.path);
}
for (const path of PATHS) {
  let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
  for (const [x, z, w] of path.pts) {
    minX = Math.min(minX, x - w * 2); maxX = Math.max(maxX, x + w * 2);
    minZ = Math.min(minZ, z - w * 2); maxZ = Math.max(maxZ, z + w * 2);
  }
  path.bounds = { minX, maxX, minZ, maxZ };
}

// The beach along the far bank, as its height in reference pixels above the water's far edge.
const BEACH_FAR = [[0, 8], [100, 11], [200, 14], [300, 16], [350, 24], [400, 27], [450, 28], [468, 22], [480, 13], [530, 13],
  [556, 26], [600, 34], [650, 31], [700, 28], [760, 28], [820, 32], [900, 42], [1000, 46], [1100, 32], [1200, 12]].map(([px, t]) => {
  const py = farEdgePy(px);
  const a = pixelToPlane(px, py, WATER_LEVEL), b = pixelToGround(px, py - t);
  return [a.x, Math.hypot(a.x - b.x, a.z - b.z)];
});
function beachFar(x) {
  const b = BEACH_FAR;
  if (x <= b[0][0]) return b[0][1];
  for (let i = 0; i < b.length - 1; i++) {
    if (x <= b[i + 1][0]) return lerp(b[i][1], b[i + 1][1], (x - b[i][0]) / (b[i + 1][0] - b[i][0]));
  }
  return b[b.length - 1][1];
}

// Grass that survives inside the bare ground: [px, py, radius px across, radius px in depth]
const GRASS_ISLANDS = [
  [508, 579, 46, 12], // the strip between the clay patch and the beach
  [152, 589, 40, 7], // tuft bank at the water's edge on the left
].map((e) => pixelEllipse(...e));

// Pale, trodden clay. A strip down the middle of the main path, plus loose patches.
const PALE_STRIP = pathFromPixels([[545, 494, 10], [530, 506, 20], [512, 520, 32], [501, 536, 44], [498, 551, 44], [505, 561, 20]]);
const PALE_SPOTS = [[760, 682, 27], [900, 722, 30], [586, 582, 22], [622, 587, 17], [562, 591, 12]].map(([px, py, r]) => {
  const p = pixelToGround(px, py);
  return [p.x, p.z, pixelsToMeters(r, viewDepth(p)) * 1.25];
});

const bump = (x, a, b, fa = 1, fb = 1) => smoothstep(a - fa, a, x) * (1 - smoothstep(b, b + fb, x));

/** Distance to a polyline in units of its local half width. */
function polylineDistance(pts, x, z) {
  let best = 99;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i], p1 = pts[i + 1];
    const abx = p1[0] - p0[0], abz = p1[1] - p0[1];
    const t = clamp01(((x - p0[0]) * abx + (z - p0[1]) * abz) / (abx * abx + abz * abz));
    const e = Math.hypot(x - (p0[0] + abx * t), z - (p0[1] + abz * t)) / lerp(p0[2], p1[2], t);
    if (e < best) best = e;
  }
  return best;
}

/**
 * Authored ground weights at a world position, all 0..1:
 * dirt (how bare, as a broad ramp the tufts later break up), pale clay, and closeness to the water.
 */
export function groundMasks(x, z) {
  let dirt = 0, pale = 0;
  // lobes at two scales, so no edge runs straight for long
  const wob = fbm2(x * 0.8 + 3.7, z * 0.8 + 1.2, 3) * 0.62 + fbm2(x * 2.9 + 1.1, z * 2.9 + 8.4, 2) * 0.22;
  for (const path of PATHS) {
    const b = path.bounds;
    if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) continue;
    const e = polylineDistance(path.pts, x, z) + wob * 0.6;
    dirt = Math.max(dirt, path.strength * (1 - smoothstep(0.45, 1.6, e)));
  }
  // bare earth along the banks: a beach on the far side, a thin band on the near one
  const sd = streamSD(x, z);
  if (sd < 3 && sd >= 0) {
    let w;
    if (ENV.noStream) {
      w = 0.3; // grass down to the waterline, no sandy beach
    } else if (z < streamCenterZ(x)) {
      w = beachFar(x) + 0.5 * Math.exp(-((x - STREAM_TIP.x - 0.6) ** 2 + (z - STREAM_TIP.z) ** 2) / 1.4);
    } else {
      w = 0.16 + 0.6 * bump(x, -1.7, 0.3, 0.8, 0.9);
    }
    dirt = Math.max(dirt, 1 - smoothstep(w * 0.45, w * 1.5, sd + wob * 0.4));
  }
  for (const g of ENV.noStream ? [] : GRASS_ISLANDS) {
    const e = Math.hypot((x - g.x) / g.rx, (z - g.z) / g.rz) + wob * 0.35;
    if (e < 1.3) dirt *= smoothstep(0.55, 1.2, e);
  }
  if (sd < 0) dirt = 1;

  if (dirt > 0.02 && !ENV.noStream) {
    const e0 = polylineDistance(PALE_STRIP, x, z) + wob * 0.5;
    pale = 1 - smoothstep(0.35, 1.15, e0);
    for (const [sx, sz, r] of PALE_SPOTS) {
      const e = Math.hypot(x - sx, z - sz) / r + wob * 0.5;
      if (e < 1.4) pale = Math.max(pale, 1 - smoothstep(0.4, 1.1, e));
    }
  }
  const shore = sd < 0 ? 1 : 1 - clamp01(sd / 2.5);
  return { dirt, pale: Math.min(pale, dirt), shore };
}

// ---------------------------------------------------------------------------------------------
// Grassy caps (the turf sitting on top of flat rocks) - grass grows on these too.
// ---------------------------------------------------------------------------------------------
export const MOUNDS = [];
export function addMound(m) { MOUNDS.push(m); }

export function groundHeight(x, z) {
  let h = terrainHeight(x, z);
  for (const m of MOUNDS) {
    const dx = (x - m.x) / m.rx, dz = (z - m.z) / m.rz;
    const r2 = dx * dx + dz * dz;
    if (r2 < 1) h = Math.max(h, m.y + m.h * Math.sqrt(1 - r2));
  }
  return h;
}

// ---------------------------------------------------------------------------------------------
// Baked lookups
// ---------------------------------------------------------------------------------------------
export const baked = { heights: null, splat: null, heightTex: null, splatTex: null, detail: null, detailTex: null };

/**
 * @param {Array<{x:number,z:number,r:number,s:number}>} aoDiscs soft contact shadows to paint
 *        under trunks, rocks and bushes.
 * @param {boolean} halfFloatHeights store the height map as 16-bit floats. Phones cannot filter
 *        32-bit float textures (no OES_texture_float_linear): there the full-precision map reads
 *        as all zeros, which flattens the stream bed and with it the water's depth and shoreline.
 *        Half floats filter everywhere and are still exact to well under a millimetre at the waterline.
 */
export function bakeTerrainMaps(aoDiscs = [], halfFloatHeights = false, data = terrainData(aoDiscs)) {
  const { heightRes: HR, splatRes: SR } = REGION;
  const { heights, splat } = data;
  let heightTex;
  if (halfFloatHeights) {
    const half = new Uint16Array(HR * HR);
    for (let i = 0; i < half.length; i++) half[i] = THREE.DataUtils.toHalfFloat(heights[i]);
    heightTex = new THREE.DataTexture(half, HR, HR, THREE.RedFormat, THREE.HalfFloatType);
  } else {
    heightTex = new THREE.DataTexture(heights, HR, HR, THREE.RedFormat, THREE.FloatType);
  }
  heightTex.minFilter = heightTex.magFilter = THREE.LinearFilter;
  heightTex.needsUpdate = true;

  const splatTex = new THREE.DataTexture(splat, SR, SR, THREE.RGBAFormat);
  splatTex.minFilter = THREE.LinearMipmapLinearFilter;
  splatTex.magFilter = THREE.LinearFilter;
  splatTex.generateMipmaps = true;
  splatTex.anisotropy = 8;
  splatTex.needsUpdate = true;

  const detail = makeGroundDetail(256, data.detail);
  Object.assign(baked, { heights, splat, heightTex, splatTex, detail, detailTex: detail.texture });
  return baked;
}

/** The arrays behind bakeTerrainMaps (pure, so a worker can compute them). */
export function terrainData(aoDiscs = []) {
  const { minX, minZ, size, heightRes: HR, splatRes: SR } = REGION;

  const heights = new Float32Array(HR * HR);
  for (let j = 0; j < HR; j++) {
    const z = minZ + ((j + 0.5) / HR) * size;
    for (let i = 0; i < HR; i++) heights[j * HR + i] = terrainHeight(minX + ((i + 0.5) / HR) * size, z);
  }

  // R: bare ground  G: pale clay  B: baked contact shadow  A: closeness to the water
  const splat = new Uint8Array(SR * SR * 4);
  for (let j = 0; j < SR; j++) {
    const z = minZ + ((j + 0.5) / SR) * size;
    for (let i = 0; i < SR; i++) {
      const x = minX + ((i + 0.5) / SR) * size;
      const k = (j * SR + i) * 4;
      // paths and banks only exist near the stream and the house: skip the rest quickly
      if (x > -30 && x < (ENV.path ? 36 : 22) && z > (ENV.path ? -76 : -30) && z < 6) {
        const m = groundMasks(x, z);
        splat[k] = Math.round(m.dirt * 255);
        splat[k + 1] = Math.round(m.pale * 255);
        splat[k + 3] = Math.round(m.shore * 255);
      } else {
        const sd = streamSD(x, z);
        if (sd < 0) splat[k] = 255;
        if (sd < 2.5) splat[k + 3] = sd < 0 ? 255 : Math.round((1 - sd / 2.5) * 255);
      }
    }
  }
  const texel = size / SR;
  for (const d of aoDiscs) {
    const i0 = Math.max(0, Math.floor((d.x - d.r - minX) / texel)), i1 = Math.min(SR - 1, Math.ceil((d.x + d.r - minX) / texel));
    const j0 = Math.max(0, Math.floor((d.z - d.r - minZ) / texel)), j1 = Math.min(SR - 1, Math.ceil((d.z + d.r - minZ) / texel));
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const x = minX + (i + 0.5) * texel, z = minZ + (j + 0.5) * texel;
        const v = d.s * (1 - smoothstep(d.r * 0.25, d.r, Math.hypot(x - d.x, z - d.z)));
        const k = (j * SR + i) * 4 + 2;
        splat[k] = Math.max(splat[k], Math.round(v * 255));
      }
    }
  }
  return { heights, splat, detail: groundDetailData(256) };
}

/** Nearest-texel read of the baked splat (used on the CPU when scattering). */
export function sampleSplat(x, z, channel) {
  const { minX, minZ, size, splatRes: SR } = REGION;
  const i = Math.floor(((x - minX) / size) * SR), j = Math.floor(((z - minZ) / size) * SR);
  if (i < 0 || j < 0 || i >= SR || j >= SR) return 0;
  return baked.splat[(j * SR + i) * 4 + channel] / 255;
}

/** Bilinear read of the baked splat, matching what the shaders see. */
export function sampleSplatLinear(x, z, channel) {
  const { minX, minZ, size, splatRes: SR } = REGION;
  const fx = ((x - minX) / size) * SR - 0.5, fz = ((z - minZ) / size) * SR - 0.5;
  if (fx < 0 || fz < 0 || fx >= SR - 1 || fz >= SR - 1) return 0;
  const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
  const s = baked.splat, k = (j * SR + i) * 4 + channel;
  const a = s[k], b = s[k + 4], c = s[k + SR * 4], d = s[k + SR * 4 + 4];
  return (a + (b - a) * tx + (c + (d - c) * tx - a - (b - a) * tx) * tz) / 255;
}

// ---------------------------------------------------------------------------------------------
// Tufts. The detail texture has one soft peak per grass tuft; in the transition band between
// grass and soil those peaks decide what stays green. The ground shader and the grass scatter
// both ask the same question, so the blades stand exactly on the green islands.
// ---------------------------------------------------------------------------------------------
const TILE_A = 1 / GROUND.tileA, TILE_B = 1 / GROUND.tileB;

/** Tuft field at a world position, 0..1 (mirrors tuftField() in the shader library). */
export function tuftField(x, z) {
  const d = baked.detail;
  return d.sample(x * TILE_A, z * TILE_A, 0) * 0.75 + d.sample((x * 0.8 - z * 0.6) * TILE_B + 0.37, (x * 0.6 + z * 0.8) * TILE_B + 0.61, 0) * 0.25;
}

/** How bare the ground is at a world position, 0..1 (mirrors bareGround() in the shader library). */
export function bareGround(x, z) {
  const w = sampleSplatLinear(x, z, 0);
  if (w <= 0.004) return 0;
  return smoothstep(0, 0.08, w * 1.08 - tuftField(x, z));
}

/** The tuft a world position belongs to: its centre, the distance to it (m), a 0..1 strength and an id. */
export function tuftAt(x, z) {
  const k = TILE_A * TUFT_CELLS; // tuft cells per metre
  const c = baked.detail.tuftAt(x * k, z * k);
  return { x: c.x / k, z: c.y / k, d: c.d1 / k, strength: c.value, id: (Math.floor(c.x) + 32768) * 65536 + Math.floor(c.y) + 32768 };
}
