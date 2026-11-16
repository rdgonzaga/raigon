// Far mountains: faceted crags sitting beyond the fog, two flat tones + mist pooling at the base.

import * as THREE from 'three';
import { HERO, PAL } from '../config.js';
import { mulberry32, perlin2 } from '../core/noise.js';
import { FOCAL_PX, pixelRay } from '../core/refspace.js';
import { COMMON, G } from '../core/shaderlib.js';
import { ENV } from '../env.js';

/** Unit normal of a triangle, turned to face up. */
function faceNormal(a, b, c) {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const l = Math.hypot(...n) || 1, s = n[1] < 0 ? -1 : 1;
  return n.map((x) => (x * s) / l);
}

function addPeak(out, cx, cz, baseY, apexY, radius, flat, haze, rng) {
  const sides = 6;
  const a0 = rng() * Math.PI * 2;
  const skewX = (rng() - 0.5) * radius * 0.5, skewZ = (rng() - 0.5) * radius * 0.5;
  const ring = [], top = [];
  for (let k = 0; k < sides; k++) {
    const a = a0 + (k / sides) * Math.PI * 2 + (rng() - 0.5) * 0.45;
    const r = radius * (0.8 + rng() * 0.45), rt = radius * flat * (0.6 + rng() * 0.8);
    ring.push([cx + Math.cos(a) * r, baseY, cz + Math.sin(a) * r]);
    top.push([cx + skewX + Math.cos(a) * rt, apexY * (0.86 + rng() * 0.14), cz + skewZ + Math.sin(a) * rt]);
  }
  const apex = [cx + skewX, apexY, cz + skewZ];
  const tri = (a, b, c) => {
    out.pos.push(...a, ...b, ...c);
    out.haze.push(haze, haze, haze);
    const n = faceNormal(a, b, c);
    out.nrm.push(...n, ...n, ...n);
  };
  for (let k = 0; k < sides; k++) {
    const k1 = (k + 1) % sides;
    tri(ring[k], top[k], ring[k1]);
    tri(ring[k1], top[k], top[k1]);
    tri(top[k], apex, top[k1]);
  }
}

/**
 * A mountain range as a strip of ridged relief on an arc around the scene: a wandering summit
 * line, sharp ridges, spurs running down the face. The shader facets it, so it reads as crags.
 */
function addRange(out, R, sunAz) {
  // nearer ranges get a finer mesh
  const near = R.dist < 1800;
  const NX = near ? 560 : 300, NZ = near ? 32 : 20, az0 = R.az0 ?? -105, az1 = R.az1 ?? 125, k = R.seed * 17.3;
  const pts = [], hz = [];
  for (let j = 0; j <= NZ; j++) {
    for (let i = 0; i <= NX; i++) {
      const azd = az0 + ((az1 - az0) * i) / NX, az = (azd * Math.PI) / 180, v = j / NZ;
      const s = az * R.dist;
      const env = 0.42 + 0.58 * Math.min(1, Math.max(0, 0.5 + perlin2(s * 0.0009 + k, k * 0.37) * 1.1));
      let ridge = Math.max(0, 1 - Math.abs(perlin2(s * 0.003 + k * 1.9, 0.5 + k)) * 2.2);
      ridge *= ridge;
      const spur = perlin2(s * 0.0075 + k, v * 3.1 + k * 0.7);
      const fine = perlin2(s * 0.021 + k * 2.3, v * 7 + k);
      const ribs = 1 - Math.abs(perlin2(s * 0.011 + k * 3.1, v * 4.2 + k * 0.3)) * 2;
      const cross = Math.pow(Math.sin(Math.PI * Math.min(1, v * 1.15)), 1.35);
      let h = R.height * cross * (env * (0.5 + 0.5 * Math.pow(ridge, 0.7)) * (1 + 0.42 * spur) + 0.07 * fine + 0.09 * ribs);
      // soft cap: no lone needles
      const cap = R.height * 0.82;
      h = cap * Math.tanh(Math.max(0, h) / cap);
      // leftScale / hazeLeft: [amount, from az, to az]
      if (R.leftScale) {
        const [f, a0, a1] = R.leftScale, t = Math.min(1, Math.max(0, (azd - a0) / (a1 - a0)));
        h *= 1 - (1 - f) * t * t * (3 - 2 * t);
      }
      if (R.notch) for (const a of sunAz) h *= 1 - R.notch * Math.exp(-(((azd - a) / (R.notchW ?? 12)) ** 2)); // a saddle where the sun comes up, and one where it sets
      const r = R.dist + (v - 0.45) * R.depth + spur * R.depth * 0.06;
      pts.push([Math.sin(az) * r, -50 + Math.max(0, h), -Math.cos(az) * r]);
      const [amt, f0, f1] = R.hazeLeft ?? [0, 0, 1];
      const t = Math.min(1, Math.max(0, (azd - f0) / (f1 - f0)));
      hz.push(R.haze + amt * t * t * (3 - 2 * t));
    }
  }
  // smooth normals, blended with faceted ones in the shader
  const W = NX + 1, nrm = pts.map(() => [0, 0, 0]);
  const acc = (ia, ib, ic) => {
    const n = faceNormal(pts[ia], pts[ib], pts[ic]);
    for (const i of [ia, ib, ic]) for (let q = 0; q < 3; q++) nrm[i][q] += n[q];
  };
  for (let j = 0; j < NZ; j++) {
    for (let i = 0; i < NX; i++) {
      acc(j * W + i, (j + 1) * W + i, j * W + i + 1);
      acc(j * W + i + 1, (j + 1) * W + i, (j + 1) * W + i + 1);
    }
  }
  for (const n of nrm) { const l = Math.hypot(...n) || 1; n[0] /= l; n[1] /= l; n[2] /= l; }
  const put = (i) => { out.pos.push(...pts[i]); out.nrm.push(...nrm[i]); out.haze.push(hz[i]); };
  for (let j = 0; j < NZ; j++) {
    for (let i = 0; i < NX; i++) {
      const a = j * W + i, b = a + 1, c = a + W, d = c + 1;
      put(a); put(c); put(b);
      put(b); put(c); put(d);
    }
  }
}

export function createMountains() {
  const rng = mulberry32(4242);
  const out = { pos: [], haze: [], nrm: [] };

  // hero range, placed by pointing at reference pixels: [px, summit py, half width px, flatness, distance]
  const HERO_PEAKS = [
    [1104, 362, 30, 0.26, 2300], [1043, 381, 30, 0.2, 2450], [1077, 387, 20, 0.14, 2150],
    [1012, 393, 26, 0.22, 2600], [1141, 391, 24, 0.2, 2500], [1126, 377, 15, 0.14, 2350],
    [1190, 396, 30, 0.24, 2800], [960, 398, 28, 0.24, 2900],
  ];
  for (const [px, py, hw, flat, dist] of ENV.noStream ? [] : HERO_PEAKS) {
    const d = pixelRay(px, py);
    const t = dist / Math.hypot(d.x, d.z);
    const x = HERO.position.x + d.x * t, y = HERO.position.y + d.y * t, z = HERO.position.z + d.z * t;
    addPeak(out, x, z, -60, y, (t * hw) / FOCAL_PX * 1.25, flat, (dist - 2100) / 2600, rng);
  }
  for (const [az, dist, apex, radius, flat, haze] of ENV.peaks ?? []) {
    const a = (az * Math.PI) / 180;
    addPeak(out, Math.sin(a) * dist, -Math.cos(a) * dist, -60, apex, radius, flat, haze, rng);
  }
  for (const R of ENV.ranges ?? []) addRange(out, R, [ENV.sunAz ?? 31, ...(ENV.sunsetAz != null ? [ENV.sunsetAz] : [])]);
  // the rest of the horizon (only seen with the free camera)
  for (let i = 0; i < 46; i++) {
    const az = rng() * Math.PI * 2;
    const dir = [Math.sin(az), -Math.cos(az)];
    const facing = dir[1] * -1; // +1 straight ahead of the hero camera
    if (facing > 0.62 || ENV.ranges) continue; // keep the hero frame clean
    const dist = 2300 + rng() * 1400;
    addPeak(out, dir[0] * dist, dir[1] * dist, -60, 90 + rng() * 240, 130 + rng() * 260, 0.15 + rng() * 0.3, 0.1 + rng() * 0.45, rng);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(out.pos, 3));
  geo.setAttribute('aHaze', new THREE.Float32BufferAttribute(out.haze, 1));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(out.nrm, 3));
  geo.computeBoundingSphere();

  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...G,
      uLit: { value: PAL.mountainLit },
      uShd: { value: PAL.mountainShd },
      uMist: { value: PAL.mist },
      uSnowLit: { value: PAL.snowLit },
      uSnowShd: { value: PAL.snowShd },
      uSnowLine: { value: ENV.snow ?? 1e6 },
      uForestLit: { value: PAL.leafMid ?? PAL.leafHigh },
      uForestShd: { value: PAL.leafLow },
    },
    vertexShader: /* glsl */ `
      attribute float aHaze;
      varying vec3 vWorld;
      varying vec3 vN;
      varying float vHaze;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        vN = normal;
        vHaze = aHaze;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform vec3 uLit;
      uniform vec3 uShd;
      uniform vec3 uMist;
      uniform vec3 uSnowLit;
      uniform vec3 uSnowShd;
      uniform float uSnowLine;
      uniform vec3 uForestLit;
      uniform vec3 uForestShd;
      varying vec3 vWorld;
      varying vec3 vN;
      varying float vHaze;
      void main() {
        vec3 S = normalize(vN);
        vec3 F = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
        if (dot(F, S) < 0.0) F = -F;
        vec3 N = normalize(mix(S, F, 0.45));
        // u: metres along the arc; stretched lookups run down the slopes
        float u = atan(vWorld.x, -vWorld.z) * length(vWorld.xz);
        float slope = 1.0 - abs(N.y);
        float big = texture2D(uNoiseTex, vec2(u * 0.0011, vWorld.y * 0.0021) + 0.31).r;
        float gully = texture2D(uNoiseTex, vec2(u * 0.0065, vWorld.y * 0.0012) + 0.17).b;
        float fine = texture2D(uNoiseTex, vec2(u * 0.03, vWorld.y * 0.011)).a;
        float strata = texture2D(uNoiseTex, vec2(u * 0.0009, vWorld.y * 0.03 + big * 0.6)).g;
        float crev = smoothstep(0.62, 0.86, gully) * (0.35 + 0.65 * smoothstep(0.15, 0.6, slope));
        float light = smoothstep(0.02, 0.4, dot(N, uSunDir)) * (1.0 - 0.75 * crev);
        vec3 lit = uLit * mix(vec3(0.9, 0.95, 1.0), vec3(1.08, 1.02, 0.94), big) * mix(0.9, 1.1, strata);
        vec3 shd = uShd * mix(0.72, 0.95, big) * (1.0 - 0.35 * crev);
        vec3 col = mix(shd, lit, light) * mix(0.9, 1.08, fine);
        // forest on the lower slopes
        float tree = 70.0 + big * 120.0 + (fine - 0.5) * 30.0;
        float forest = (1.0 - smoothstep(tree - 25.0, tree + 15.0, vWorld.y)) * (1.0 - smoothstep(0.45, 0.75, slope));
        col = mix(col, mix(uForestShd, uForestLit, light) * mix(0.85, 1.12, fine), forest * 0.9);
        float n = texture2D(uNoiseTex, vWorld.xz * 0.0006 + uTime * 0.002).r;
        float sn = texture2D(uNoiseTex, vWorld.xz * 0.004 + vWorld.y * 0.003).g;
        float snow = smoothstep(uSnowLine, uSnowLine + 90.0, vWorld.y + (sn - 0.5) * 150.0 - slope * 110.0 + crev * 70.0);
        col = mix(col, mix(uSnowShd, uSnowLit, light) * mix(0.94, 1.03, fine), snow);
        // thicker haze low down
        float low = 1.0 - smoothstep(-50.0, 260.0, vWorld.y);
        col = mix(col, uFogFar, clamp(vHaze + low * 0.42, 0.0, 0.95));
        col = mix(uMist, col, smoothstep(18.0, 130.0 + n * 90.0, vWorld.y));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  material.side = THREE.DoubleSide;
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 900; // after everything nearer, just before the sky
  mesh.name = 'mountains';
  return mesh;
}
