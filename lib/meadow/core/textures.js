// Every texture in the scene is generated procedurally at start-up - there are no image assets.

import * as THREE from 'three';
import { fbm2, makeVoronoi2, makeWorley3, mulberry32, perlin3, smoothstep } from './noise.js';

function normalizeTo8(src, dst, offset, stride) {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < src.length; i++) { if (src[i] < lo) lo = src[i]; if (src[i] > hi) hi = src[i]; }
  const k = 255 / (hi - lo || 1);
  for (let i = 0; i < src.length; i++) dst[i * stride + offset] = Math.round((src[i] - lo) * k);
}

/**
 * Tiling RGBA noise used all over the shaders (wind gusts, colour variation, ripples...).
 * R: soft low-frequency fbm   G: medium fbm   B: ridged fbm   A: fine fbm
 */
export function makeNoiseTexture(size = 256) {
  const n = size * size;
  const ch = [new Float32Array(n), new Float32Array(n), new Float32Array(n), new Float32Array(n)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size, i = y * size + x;
      ch[0][i] = fbm2(u * 4, v * 4, 5, 4);
      ch[1][i] = fbm2(u * 8 + 11.3, v * 8 + 4.7, 4, 8);
      ch[2][i] = 1 - Math.abs(fbm2(u * 8 + 3.3, v * 8 + 9.1, 4, 8, 0.55));
      ch[3][i] = fbm2(u * 32 + 1.9, v * 32 + 7.7, 3, 32);
    }
  }
  const data = new Uint8Array(n * 4);
  for (let c = 0; c < 4; c++) normalizeTo8(ch[c], data, c, 4);
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Tiling 3D noise for the volumetric clouds.
 * R: Perlin-Worley base shape   G: Worley fbm (edge erosion)   B: smooth Perlin fbm (weather)
 */
export function makeCloudNoise3D(size = 64) {
  const n = size * size * size;
  const shape = new Float32Array(n), detail = new Float32Array(n), soft = new Float32Array(n);
  const w4 = makeWorley3(4, 11), w8 = makeWorley3(8, 12), w16 = makeWorley3(16, 13);
  let i = 0;
  for (let z = 0; z < size; z++) {
    const w = (z + 0.5) / size;
    for (let y = 0; y < size; y++) {
      const v = (y + 0.5) / size;
      for (let x = 0; x < size; x++, i++) {
        const u = (x + 0.5) / size;
        const p =
          (perlin3(u * 4, v * 4, w * 4, 4) * 0.55 +
            perlin3(u * 8 + 5.2, v * 8 + 1.3, w * 8 + 7.1, 8) * 0.3 +
            perlin3(u * 16 + 2.7, v * 16 + 8.4, w * 16 + 3.9, 16) * 0.15);
        const p01 = Math.min(1, Math.max(0, p * 0.62 + 0.5));
        const a = 1 - w4(u * 4, v * 4, w * 4);
        const b = 1 - w8(u * 8, v * 8, w * 8);
        const c = 1 - w16(u * 16, v * 16, w * 16);
        const wfbm = a * 0.62 + b * 0.26 + c * 0.12;
        shape[i] = wfbm + p01 * (1 - wfbm); // "dilated" perlin = billowy Perlin-Worley
        detail[i] = b * 0.6 + c * 0.4;
        soft[i] = p01;
      }
    }
  }
  const data = new Uint8Array(n * 4);
  normalizeTo8(shape, data, 0, 4);
  normalizeTo8(detail, data, 1, 4);
  normalizeTo8(soft, data, 2, 4);
  for (let k = 0; k < n; k++) data[k * 4 + 3] = 255;
  const tex = new THREE.Data3DTexture(data, size, size, size);
  tex.format = THREE.RGBAFormat;
  tex.type = THREE.UnsignedByteType;
  tex.wrapS = tex.wrapT = tex.wrapR = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.unpackAlignment = 1;
  tex.needsUpdate = true;
  return tex;
}

/** In-place box blur of a square tiling field. */
function boxBlurWrap(field, size, radius) {
  const tmp = new Float32Array(field.length), k = 1 / (radius * 2 + 1);
  for (let pass = 0; pass < 2; pass++) {
    const src = pass === 0 ? field : tmp, dst = pass === 0 ? tmp : field;
    const stepIn = pass === 0 ? 1 : size, stepOut = pass === 0 ? size : 1;
    for (let line = 0; line < size; line++) {
      const base = line * stepOut;
      let sum = 0;
      for (let d = -radius; d <= radius; d++) sum += src[base + ((d + size) % size) * stepIn];
      for (let i = 0; i < size; i++) {
        dst[base + i * stepIn] = sum * k;
        sum += src[base + ((i + radius + 1) % size) * stepIn] - src[base + ((i - radius + size) % size) * stepIn];
      }
    }
  }
}

/** Histogram-equalise a field into one 8-bit channel: afterwards a threshold of x keeps a fraction x. */
function equalizeTo8(src, dst, offset) {
  const BINS = 4096;
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < src.length; i++) { if (src[i] < lo) lo = src[i]; if (src[i] > hi) hi = src[i]; }
  const scale = (BINS - 1) / (hi - lo || 1);
  const hist = new Uint32Array(BINS);
  for (let i = 0; i < src.length; i++) hist[Math.floor((src[i] - lo) * scale)]++;
  const rank = new Float32Array(BINS);
  let below = 0;
  for (let b = 0; b < BINS; b++) { rank[b] = (below + hist[b] * 0.5) / src.length; below += hist[b]; }
  for (let i = 0; i < src.length; i++) dst[i * 4 + offset] = Math.round(rank[Math.floor((src[i] - lo) * scale)] * 255);
}

/** Tufts per tile of the ground detail texture (see makeGroundDetail). */
export const TUFT_CELLS = 14;

/**
 * Tiling ground detail: the "paint" of the terrain. It is kept on the CPU as well, because the
 * grass scatter has to agree with the ground shader about where the tufts are.
 *   R: tuft field, one soft peak per grass tuft   G: large flat dabs   B: small flat dabs   A: grain
 * Every channel is histogram-equalised.
 */
export function makeGroundDetail(size = 256) {
  const n = size * size;
  const tuft = new Float32Array(n), dabL = new Float32Array(n), dabS = new Float32Array(n), grain = new Float32Array(n);
  const vT = makeVoronoi2(TUFT_CELLS, 401), vL = makeVoronoi2(9, 403), vS = makeVoronoi2(23, 404);
  const hash = mulberry32(405);
  for (let j = 0; j < size; j++) {
    const v = (j + 0.5) / size;
    for (let i = 0; i < size; i++) {
      const u = (i + 0.5) / size, k = j * size + i;
      // tufts: a soft cone on every feature point, some stronger than others
      const c = vT(u * TUFT_CELLS, v * TUFT_CELLS);
      const wx = fbm2(u * 6 + 1.7, v * 6 + 9.2, 2, 6), wy = fbm2(u * 6 + 5.3, v * 6 + 2.8, 2, 6);
      // the slow terms break ties in the gaps between tufts, so bare ground opens up gradually
      tuft[k] = (1 - smoothstep(0, 0.68, c.d1)) * (0.55 + 0.45 * c.value) + wx * 0.1 + wy * 0.06;
      // dabs: flat Voronoi cells looked up through a warp, so their outlines wander like brush marks
      dabL[k] = vL((u + wx * 0.07) * 9, (v + wy * 0.07) * 9).value;
      dabS[k] = vS((u + wy * 0.035) * 23, (v + wx * 0.035) * 23).value;
      grain[k] = hash();
    }
  }
  boxBlurWrap(dabL, size, 2);
  boxBlurWrap(dabS, size, 1);
  boxBlurWrap(grain, size, 1); // grain two or three texels wide rather than single-texel sparkle
  const data = new Uint8Array(n * 4);
  equalizeTo8(tuft, data, 0);
  equalizeTo8(dabL, data, 1);
  equalizeTo8(dabS, data, 2);
  equalizeTo8(grain, data, 3);

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 8;
  texture.needsUpdate = true;

  /** Bilinear, repeating read of one channel, 0..1 (what the shader's texture2D returns at mip 0). */
  const sample = (u, v, channel) => {
    const x = (u - Math.floor(u)) * size - 0.5, y = (v - Math.floor(v)) * size - 0.5;
    const x0 = Math.floor(x), y0 = Math.floor(y), tx = x - x0, ty = y - y0;
    const xa = (x0 + size) % size, xb = (x0 + 1) % size, ya = (y0 + size) % size, yb = (y0 + 1) % size;
    const a = data[(ya * size + xa) * 4 + channel], b = data[(ya * size + xb) * 4 + channel];
    const c = data[(yb * size + xa) * 4 + channel], d = data[(yb * size + xb) * 4 + channel];
    return (a + (b - a) * tx + (c + (d - c) * tx - a - (b - a) * tx) * ty) / 255;
  };
  return { texture, data, size, sample, tuftAt: vT };
}

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')];
}

function maskTexture(c) {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  return tex;
}

function leafPath(g, len, wid) {
  g.beginPath();
  g.moveTo(-len / 2, 0);
  g.quadraticCurveTo(-len * 0.08, -wid, len / 2, 0);
  g.quadraticCurveTo(-len * 0.08, wid, -len / 2, 0);
  g.closePath();
}

/**
 * A card full of small leaves: alpha is the silhouette, red carries per-leaf brightness so
 * every billboard reads as a handful of individually painted leaves.
 */
export function makeLeafClusterTexture(size = 512, seed = 5) {
  const [c, g] = canvas(size);
  const rng = mulberry32(seed);
  const leaves = [];
  for (let i = 0; i < 56; i++) {
    const a = rng() * Math.PI * 2;
    const r = Math.pow(rng(), 0.6) * size * 0.36;
    leaves.push({
      x: size / 2 + Math.cos(a) * r,
      y: size / 2 + Math.sin(a) * r,
      rot: a + (rng() - 0.5) * 2.0,
      len: size * (0.09 + rng() * 0.06),
      shade: rng(),
    });
  }
  leaves.sort((p, q) => p.shade - q.shade);
  for (const l of leaves) {
    g.save();
    g.translate(l.x, l.y);
    g.rotate(l.rot);
    const v = Math.round(118 + l.shade * 137);
    const grad = g.createLinearGradient(-l.len / 2, 0, l.len / 2, 0);
    const d = Math.round(v * 0.72);
    grad.addColorStop(0, `rgb(${d},${d},${d})`);
    grad.addColorStop(1, `rgb(${v},${v},${v})`);
    g.fillStyle = grad;
    leafPath(g, l.len, l.len * 0.4);
    g.fill();
    g.restore();
  }
  return maskTexture(c);
}

/** Five-petal blossom. R: petal shading, G: core mask, A: silhouette. */
export function makeFlowerTexture(size = 128) {
  const [c, g] = canvas(size);
  g.translate(size / 2, size / 2);
  for (let i = 0; i < 5; i++) {
    g.save();
    g.rotate((i * Math.PI * 2) / 5);
    const grad = g.createLinearGradient(0, 0, 0, -size * 0.47);
    grad.addColorStop(0, 'rgb(150,0,0)');
    grad.addColorStop(1, 'rgb(255,0,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(0, -size * 0.25, size * 0.145, size * 0.22, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  g.fillStyle = 'rgb(255,255,0)';
  g.beginPath();
  g.arc(0, 0, size * 0.085, 0, Math.PI * 2);
  g.fill();
  return maskTexture(c);
}

/** A single leaf for the wind particles. R: shading, A: silhouette. */
export function makeLeafParticleTexture(size = 64) {
  const [c, g] = canvas(size);
  g.translate(size / 2, size / 2);
  g.rotate(-0.5);
  const grad = g.createLinearGradient(0, -size * 0.2, 0, size * 0.2);
  grad.addColorStop(0, 'rgb(255,255,255)');
  grad.addColorStop(1, 'rgb(170,170,170)');
  g.fillStyle = grad;
  leafPath(g, size * 0.86, size * 0.3);
  g.fill();
  g.strokeStyle = 'rgb(120,120,120)';
  g.lineWidth = size * 0.03;
  g.beginPath();
  g.moveTo(-size * 0.4, 0);
  g.lineTo(size * 0.4, 0);
  g.stroke();
  return maskTexture(c);
}
