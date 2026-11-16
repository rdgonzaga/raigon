// CPU-side noise used to build the terrain, placement masks and noise textures.

export function mulberry32(seed) {
  let a = seed | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export function smoothstep(a, b, x) {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

const P = new Uint8Array(512);
{
  const r = mulberry32(90210);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) P[i] = p[i & 255];
}

const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const wrap = (i, p) => ((i % p) + p) % p;

function g2(h, x, y) {
  switch (h & 7) {
    case 0: return x + y;
    case 1: return -x + y;
    case 2: return x - y;
    case 3: return -x - y;
    case 4: return x * 1.4142;
    case 5: return -x * 1.4142;
    case 6: return y * 1.4142;
    default: return -y * 1.4142;
  }
}

/** Gradient noise in roughly [-1, 1]. Pass a period to make it tile. */
export function perlin2(x, y, period = 0) {
  let xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  let x1 = xi + 1, y1 = yi + 1;
  if (period) { xi = wrap(xi, period); x1 = wrap(x1, period); yi = wrap(yi, period); y1 = wrap(y1, period); }
  xi &= 255; x1 &= 255; yi &= 255; y1 &= 255;
  const u = fade(xf), v = fade(yf);
  const aa = P[P[xi] + yi], ab = P[P[xi] + y1], ba = P[P[x1] + yi], bb = P[P[x1] + y1];
  return lerp(
    lerp(g2(aa, xf, yf), g2(ba, xf - 1, yf), u),
    lerp(g2(ab, xf, yf - 1), g2(bb, xf - 1, yf - 1), u),
    v,
  ) * 0.7;
}

export function fbm2(x, y, octaves = 4, period = 0, gain = 0.5) {
  let amp = 0.5, freq = 1, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * perlin2(x * freq, y * freq, period ? period * freq : 0);
    norm += amp;
    amp *= gain;
    freq *= 2;
  }
  return sum / norm;
}

function g3(h, x, y, z) {
  h &= 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

export function perlin3(x, y, z, period = 0) {
  let xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  let x1 = xi + 1, y1 = yi + 1, z1 = zi + 1;
  if (period) {
    xi = wrap(xi, period); x1 = wrap(x1, period);
    yi = wrap(yi, period); y1 = wrap(y1, period);
    zi = wrap(zi, period); z1 = wrap(z1, period);
  }
  xi &= 255; x1 &= 255; yi &= 255; y1 &= 255; zi &= 255; z1 &= 255;
  const u = fade(xf), v = fade(yf), w = fade(zf);
  const A = P[xi] + yi, B = P[x1] + yi, A1 = P[xi] + y1, B1 = P[x1] + y1;
  const n000 = g3(P[P[A] + zi], xf, yf, zf), n100 = g3(P[P[B] + zi], xf - 1, yf, zf);
  const n010 = g3(P[P[A1] + zi], xf, yf - 1, zf), n110 = g3(P[P[B1] + zi], xf - 1, yf - 1, zf);
  const n001 = g3(P[P[A] + z1], xf, yf, zf - 1), n101 = g3(P[P[B] + z1], xf - 1, yf, zf - 1);
  const n011 = g3(P[P[A1] + z1], xf, yf - 1, zf - 1), n111 = g3(P[P[B1] + z1], xf - 1, yf - 1, zf - 1);
  return lerp(
    lerp(lerp(n000, n100, u), lerp(n010, n110, u), v),
    lerp(lerp(n001, n101, u), lerp(n011, n111, u), v),
    w,
  );
}

/**
 * Tiling 2D Voronoi pattern, one feature point per cell. The returned function reports the
 * nearest point of (x, y) in cell units; it reuses one result object, so read it before calling again.
 */
export function makeVoronoi2(period, seed) {
  const pts = new Float32Array(period * period * 3);
  const r = mulberry32(seed);
  for (let i = 0; i < pts.length; i++) pts[i] = r();
  const out = { d1: 0, d2: 0, value: 0, x: 0, y: 0, id: 0 };
  return function (x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    let d1 = 99, d2 = 99;
    for (let dy = -1; dy <= 1; dy++) {
      const cy = yi + dy, wy = wrap(cy, period);
      for (let dx = -1; dx <= 1; dx++) {
        const cx = xi + dx, wx = wrap(cx, period);
        const i = (wy * period + wx) * 3;
        // points stay off the cell borders, which keeps their spacing even
        const px = cx + 0.14 + pts[i] * 0.72, py = cy + 0.14 + pts[i + 1] * 0.72;
        const d = (px - x) * (px - x) + (py - y) * (py - y);
        if (d < d1) {
          d2 = d1; d1 = d;
          out.value = pts[i + 2]; out.x = px; out.y = py; out.id = wy * period + wx;
        } else if (d < d2) d2 = d;
      }
    }
    out.d1 = Math.sqrt(d1); out.d2 = Math.sqrt(d2);
    return out;
  };
}

/** Tiling 3D Worley noise with precomputed feature points (one per cell). */
export function makeWorley3(period, seed) {
  const pts = new Float32Array(period * period * period * 3);
  const r = mulberry32(seed);
  for (let i = 0; i < pts.length; i++) pts[i] = r();
  return function (x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    let dmin = 9;
    for (let dz = -1; dz <= 1; dz++) {
      const cz = zi + dz, wz = wrap(cz, period);
      for (let dy = -1; dy <= 1; dy++) {
        const cy = yi + dy, wy = wrap(cy, period);
        for (let dx = -1; dx <= 1; dx++) {
          const cx = xi + dx, wx = wrap(cx, period);
          const i = ((wz * period + wy) * period + wx) * 3;
          const fx = cx + pts[i] - x, fy = cy + pts[i + 1] - y, fz = cz + pts[i + 2] - z;
          const d = fx * fx + fy * fy + fz * fz;
          if (d < dmin) dmin = d;
        }
      }
    }
    return Math.min(1, Math.sqrt(dmin));
  };
}
