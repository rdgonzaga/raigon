// Procedural stylized trees.
//
// Technique (the "fluffy tree" recipe used by most painterly Unreal / Ghibli-style scenes):
//  * the crown is a set of flattened ellipsoid "pads"; each pad is filled with camera-facing
//    cards that carry a cluster of small leaves (alpha-to-coverage for soft edges),
//  * cards do NOT use their own geometric normal - they borrow the normal of the pad ellipsoid
//    (blended with the whole crown), so each pad shades like one soft, round volume,
//  * a 4-tone ramp turns that smooth lighting into flat painted values,
//  * trunk, branches, pads and individual cards all move with the shared wind field.

import * as THREE from 'three';
import { LAYERS, PAL, SUN } from '../config.js';
import { InstanceCuller } from '../core/InstanceCuller.js';
import { clamp01, lerp, mulberry32, smoothstep } from '../core/noise.js';
import { COMMON, litUniforms, SHADOW_PARS_FRAGMENT, SHADOW_PARS_VERTEX } from '../core/shaderlib.js';
import { makeLeafClusterTexture } from '../core/textures.js';

// ---------------------------------------------------------------------------------------------
// Species
// ---------------------------------------------------------------------------------------------
export const TREE_TYPES = {
  broad: { height: 12.5, trunk: 0.24, crownStart: 0.48, crownRadius: 3.7, tiers: 5, perTier: [3, 4], padRadius: 2.0, padFlat: 0.7, leafSize: 0.98, leaves: 74 },
  tall: { height: 15, trunk: 0.26, crownStart: 0.34, crownRadius: 2.9, tiers: 7, perTier: [2, 4], padRadius: 1.7, padFlat: 0.72, leafSize: 0.94, leaves: 66 },
  slim: { height: 10, trunk: 0.15, crownStart: 0.38, crownRadius: 1.8, tiers: 5, perTier: [2, 3], padRadius: 1.3, padFlat: 0.74, leafSize: 0.84, leaves: 60 },
  umbrella: { height: 11, trunk: 0.17, crownStart: 0.52, crownRadius: 2.7, tiers: 4, perTier: [3, 4], padRadius: 1.6, padFlat: 0.68, leafSize: 0.9, leaves: 64, shape: 'umbrella' },
  lollipop: { height: 6.5, trunk: 0.1, crownStart: 0.56, crownRadius: 1.0, tiers: 3, perTier: [2, 3], padRadius: 0.95, padFlat: 0.8, leafSize: 0.7, leaves: 54 },
  conifer: { height: 15, trunk: 0.2, crownStart: 0.13, crownRadius: 2.9, tiers: 10, perTier: [3, 4], padRadius: 1.2, padFlat: 0.5, leafSize: 0.78, leaves: 46, shape: 'cone', bow: 0.2 },
  // giant forest-edge tree whose crown overhangs the camera: it is what dapples the foreground
  canopy: { height: 15, trunk: 0.5, crownStart: 0.62, crownRadius: 5.6, tiers: 3, perTier: [4, 5], padRadius: 3.0, padFlat: 0.55, leafSize: 1.35, leaves: 120 },
};

const v3 = () => new THREE.Vector3();

function tube(B, pointAt, radiusAt, segs, radial, pad, weightAt, phase) {
  const base = B.pos.length / 3;
  const pts = [];
  for (let i = 0; i <= segs; i++) pts.push(pointAt(i / segs));
  let nPrev = null, along = 0;
  for (let i = 0; i <= segs; i++) {
    const p = pts[i];
    const tan = v3().subVectors(pts[Math.min(segs, i + 1)], pts[Math.max(0, i - 1)]).normalize();
    let n;
    if (!nPrev) {
      n = Math.abs(tan.x) > 0.9 ? v3().set(0, 0, 1) : v3().set(1, 0, 0);
    } else {
      n = nPrev.clone();
    }
    n.addScaledVector(tan, -n.dot(tan)).normalize(); // parallel transport keeps the tube untwisted
    nPrev = n;
    const b = v3().crossVectors(tan, n);
    const r = radiusAt(i / segs);
    if (i > 0) along += p.distanceTo(pts[i - 1]);
    const w = weightAt(i / segs);
    for (let k = 0; k < radial; k++) {
      const a = (k / radial) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      const nx = n.x * ca + b.x * sa, ny = n.y * ca + b.y * sa, nz = n.z * ca + b.z * sa;
      B.pos.push(p.x + nx * r, p.y + ny * r, p.z + nz * r);
      B.nrm.push(nx, ny, nz);
      B.branch.push(pad.x, pad.y, pad.z, w);
      B.bark.push(k / radial, along, phase);
    }
  }
  for (let i = 0; i < segs; i++) {
    for (let k = 0; k < radial; k++) {
      const a = base + i * radial + k, b2 = base + i * radial + ((k + 1) % radial);
      const c = a + radial, d = b2 + radial;
      B.idx.push(a, b2, c, b2, d, c);
    }
  }
}

function pushLeaf(F, p, n, size, rot, rand, ao, pad) {
  const base = F.pos.length / 3;
  for (let k = 0; k < 4; k++) {
    F.pos.push(p.x, p.y, p.z);
    F.nrm.push(n.x, n.y, n.z);
    F.corner.push(k === 0 || k === 3 ? -1 : 1, k < 2 ? -1 : 1);
    F.leaf.push(size, rot, rand, ao);
    F.pad.push(pad.c.x, pad.c.y, pad.c.z, pad.phase);
  }
  F.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

function fillPads(F, pads, P, rng, detail) {
  const R = (a, b) => a + (b - a) * rng();
  const center = v3();
  for (const pad of pads) center.add(pad.c);
  center.multiplyScalar(1 / pads.length);
  let crownR = 0.001;
  for (const pad of pads) crownR = Math.max(crownR, pad.c.distanceTo(center) + pad.rx);

  const p = v3(), n = v3(), q = v3();
  for (const pad of pads) {
    const count = Math.max(10, Math.round(((P.leaves * (pad.rx * pad.rz)) / (P.padRadius * P.padRadius)) * detail));
    for (let j = 0; j < count; j++) {
      // uniform direction on the sphere, thinned out on the underside
      let dx, dy, dz;
      for (;;) {
        dy = R(-1, 1);
        const a = R(0, Math.PI * 2), s = Math.sqrt(1 - dy * dy);
        dx = s * Math.cos(a); dz = s * Math.sin(a);
        if (dy > -0.4 || rng() < 0.35) break;
      }
      const inner = rng() < 0.2;
      const rad = inner ? R(0.35, 0.7) : R(0.8, 1.08);
      p.set(pad.c.x + dx * pad.rx * rad, pad.c.y + dy * pad.ry * rad, pad.c.z + dz * pad.rz * rad);
      // borrowed shading normal: pad ellipsoid + whole crown + a touch of "up"
      n.set(dx / pad.rx, dy / pad.ry, dz / pad.rz).normalize().multiplyScalar(0.85);
      q.subVectors(p, center).normalize();
      n.addScaledVector(q, 0.42);
      n.y += 0.18;
      n.normalize();
      const under = smoothstep(-0.55, 0.3, dy);
      const ao = (inner ? 0.3 : 1) * lerp(0.42, 1, under) * lerp(0.72, 1, clamp01(p.distanceTo(center) / crownR));
      const size = (P.leafSize * R(0.8, 1.25) * (inner ? 1.1 : 1)) / Math.sqrt(detail);
      pushLeaf(F, p, n, size, R(0, Math.PI * 2), rng(), ao, pad);
    }
  }
}

function toGeometry(arrays, layout) {
  const geo = new THREE.BufferGeometry();
  for (const [name, key, size] of layout) geo.setAttribute(name, new THREE.Float32BufferAttribute(arrays[key], size));
  geo.setIndex(arrays.idx);
  geo.computeBoundingSphere();
  return geo;
}

const FOLIAGE_LAYOUT = [['position', 'pos', 3], ['normal', 'nrm', 3], ['aCorner', 'corner', 2], ['aLeaf', 'leaf', 4], ['aPad', 'pad', 4]];
const BARK_LAYOUT = [['position', 'pos', 3], ['normal', 'nrm', 3], ['aBranch', 'branch', 4], ['aBark', 'bark', 3]];

/** Build one tree (bark + foliage geometry) in tree-local space, base at the origin. */
export function buildTree(seed, P, detail = 1) {
  const rng = mulberry32(seed * 7919 + 13);
  const R = (a, b) => a + (b - a) * rng();
  const H = P.height;
  const lean = P.lean ?? (P.shape === 'cone' ? [R(-0.15, 0.15), R(-0.15, 0.15)] : [R(-0.7, 0.7), R(-0.7, 0.7)]);
  const bowA = R(0, Math.PI * 2), bowM = R(0.12, 0.45) * (P.bow ?? 1);
  const axis = (t) => {
    const s = Math.sin(t * Math.PI);
    return v3().set(lean[0] * t * t + Math.cos(bowA) * bowM * s, H * t, lean[1] * t * t + Math.sin(bowA) * bowM * s);
  };
  const radiusAt = (t) => P.trunk * (1 - 0.74 * t) * (1 + 0.65 * Math.exp(-t * 20)) + 0.022;

  const B = { pos: [], nrm: [], branch: [], bark: [], idx: [] };
  const F = { pos: [], nrm: [], corner: [], leaf: [], pad: [], idx: [] };
  const zero = v3();
  tube(B, axis, radiusAt, 14, detail < 1 ? 5 : 7, zero, () => 0, 0);

  const pads = [];
  const addBranch = (pad, t) => {
    // branch: leaves the trunk a little below the pad and arcs up into its underside
    const tb = Math.max(0.12, t - R(0.05, 0.13));
    const a = axis(tb), e = pad.c.clone();
    e.y -= pad.ry * 0.35;
    const len = a.distanceTo(e);
    const m = a.clone().lerp(e, 0.5);
    m.y += len * 0.12;
    const r0 = radiusAt(tb) * 0.55;
    tube(
      B,
      (s) => v3().set(0, 0, 0).addScaledVector(a, (1 - s) * (1 - s)).addScaledVector(m, 2 * (1 - s) * s).addScaledVector(e, s * s),
      (s) => lerp(r0, 0.025, s),
      6,
      detail < 1 ? 4 : 5,
      pad.c,
      (s) => s * s,
      pad.phase,
    );
  };
  if (P.pads) {
    // hand-placed crown (tree-local pad centres): used for the giants that shade the foreground
    for (const q of P.pads) {
      const pad = { c: v3().set(q.x, q.y, q.z), rx: q.r, ry: q.r * (q.flat ?? P.padFlat), rz: q.r, phase: R(0, Math.PI * 2) };
      pads.push(pad);
      addBranch(pad, clamp01((q.y - 1.5) / H));
    }
  } else {
    for (let i = 0; i < P.tiers; i++) {
      const u = P.tiers === 1 ? 1 : i / (P.tiers - 1);
      const isTop = i === P.tiers - 1;
      const t = lerp(P.crownStart, 0.985, Math.pow(u, 0.9));
      const count = isTop ? 1 : Math.round(R(P.perTier[0], P.perTier[1]));
      const spread = P.shape === 'umbrella'
        ? P.crownRadius * lerp(1.0, 0.5, u)
        : P.shape === 'cone' ? P.crownRadius * lerp(1.0, 0.1, u)
        : P.crownRadius * lerp(0.78, 1, Math.sin(u * Math.PI * 0.9)) * lerp(1, 0.42, u * u);
      const a0 = R(0, Math.PI * 2);
      for (let k = 0; k < count; k++) {
        const ang = a0 + (k / count) * Math.PI * 2 + R(-0.5, 0.5);
        const dist = isTop ? R(0, 0.25) : spread * R(0.55, 1.0);
        const c = axis(t).add(v3().set(Math.cos(ang) * dist, R(-0.35, 0.45), Math.sin(ang) * dist));
        const r = P.padRadius * R(0.78, 1.22) * (isTop ? 1.12 : 1) * (P.shape === 'cone' ? lerp(1.25, 0.42, u) : 1);
        const pad = { c, rx: r, ry: r * P.padFlat * R(0.85, 1.15), rz: r * R(0.85, 1.15), phase: R(0, Math.PI * 2) };
        pads.push(pad);
        if (!isTop) addBranch(pad, t);
      }
    }
  }
  fillPads(F, pads, P, rng, detail);
  return { foliage: toGeometry(F, FOLIAGE_LAYOUT), bark: toGeometry(B, BARK_LAYOUT), height: H };
}

/** Bush: a few pads sitting on the ground, no trunk. `r` is the overall radius in metres. */
export function buildBush(seed, r = 1, tall = 0.75) {
  const rng = mulberry32(seed * 104729 + 7);
  const R = (a, b) => a + (b - a) * rng();
  // big bushes get bigger cards rather than thousands more of them
  const P = { leaves: 72 * Math.min(2.2, Math.max(1, r / 1.6)), padRadius: r * 0.72, leafSize: Math.min(1.8, Math.max(0.42, r * 0.5)) };
  const pads = [];
  const n = r > 1.1 ? 4 : r > 0.6 ? 3 : 2;
  for (let i = 0; i < n; i++) {
    const a = R(0, Math.PI * 2), d = i === 0 ? 0 : r * R(0.3, 0.55);
    const pr = r * R(0.55, 0.78);
    pads.push({ c: v3().set(Math.cos(a) * d, pr * tall * R(0.7, 1.0), Math.sin(a) * d), rx: pr, ry: pr * tall, rz: pr * R(0.85, 1.1), phase: R(0, 6.28) });
  }
  const F = { pos: [], nrm: [], corner: [], leaf: [], pad: [], idx: [] };
  fillPads(F, pads, P, rng, 1);
  return toGeometry(F, FOLIAGE_LAYOUT);
}

// ---------------------------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------------------------
const TREE_SWAY = /* glsl */ `
// whole tree: leans downwind and rocks, amplitude grows with the square of the height
vec3 trunkSway(vec3 origin, float height) {
  float phase = origin.x * 0.31 + origin.z * 0.23;
  float gust = windGust(origin.xz);
  float k = max(height, 0.0) * 0.085;
  float amp = (0.04 + 0.2 * gust) * uWindStrength * k * k;
  float rock = sin(uTime * 1.25 + phase) * 0.6 + sin(uTime * 2.3 + phase * 1.7) * 0.25;
  vec2 w = uWindDir * (amp * (0.55 + 0.45 * rock));
  vec2 c = vec2(-uWindDir.y, uWindDir.x) * (amp * 0.3 * sin(uTime * 0.9 + phase * 2.3));
  return vec3(w.x + c.x, 0.0, w.y + c.y);
}
// each foliage pad bobs on its branch; lever arm = distance from the trunk
vec3 padBob(vec3 origin, vec3 padW, float phase) {
  float arm = min(length(padW.xz - origin.xz), 4.5);
  float gust = windGust(padW.xz);
  float a = (0.022 + 0.085 * gust) * uWindStrength * (0.6 + arm * 0.5);
  return vec3(sin(uTime * 1.7 + phase) * 0.55, sin(uTime * 2.2 + phase * 1.3), cos(uTime * 1.45 + phase * 0.7) * 0.55) * a;
}
`;

const INSTANCE_MATRIX = /* glsl */ `
  #ifdef USE_INSTANCING
    mat4 m = modelMatrix * instanceMatrix;
  #else
    mat4 m = modelMatrix;
  #endif
`;

const foliageVertex = /* glsl */ `
#include <common>
${COMMON}
${SHADOW_PARS_VERTEX}
${TREE_SWAY}
attribute vec2 aCorner;
attribute vec4 aLeaf;   // size, rotation, random, ao
attribute vec4 aPad;    // pad centre (tree local), phase
attribute vec4 aTint;   // per tree: brightness offset, warmth, forced shade, -
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vWorld;
varying vec4 vInfo;
varying vec3 vTint;

void main() {
  ${INSTANCE_MATRIX}
  vec3 origin = m[3].xyz;
  float scl = length(m[1].xyz);
  vec3 wc = (m * vec4(position, 1.0)).xyz;
  vec3 padW = (m * vec4(aPad.xyz, 1.0)).xyz;
  float gust = windGust(wc.xz);
  float fl = (0.3 + gust) * uWindStrength;

  wc += trunkSway(origin, wc.y - origin.y) + padBob(origin, padW, aPad.w);
  // individual cards shiver
  wc += vec3(sin(uTime * 4.7 + aLeaf.z * 41.0), sin(uTime * 5.9 + aLeaf.z * 23.0) * 0.6, cos(uTime * 4.1 + aLeaf.z * 57.0)) * (0.028 * fl * scl);

  vec4 mv = viewMatrix * vec4(wc, 1.0);
  float rot = aLeaf.y + sin(uTime * 2.6 + aLeaf.z * 19.0) * 0.16 * fl;
  mv.xy += rot2(aCorner, rot) * (aLeaf.x * scl * 0.5);
  gl_Position = projectionMatrix * mv;

  vUv = aCorner * 0.5 + 0.5;
  vNormalW = normalize(mat3(m) * normal);
  vWorld = wc;
  vInfo = vec4(aLeaf.w, aLeaf.z, gust, 0.0);
  vTint = aTint.xyz;
  #ifndef DEPTH_PASS
    // look the shadow up a little outside the pad so cards are not shadowed by their neighbours
    setSunShadowCoord(wc + vNormalW * (0.55 * scl), vNormalW);
  #endif
}
`;

const foliageFragment = /* glsl */ `
#include <common>
${COMMON}
${SHADOW_PARS_FRAGMENT}
uniform sampler2D uLeafTex;
uniform vec3 uLeafDeep;
uniform vec3 uLeafLow;
uniform vec3 uLeafMid;
uniform vec3 uLeafHigh;
uniform vec3 uLeafSun;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vWorld;
varying vec4 vInfo;
varying vec3 vTint;

void main() {
  vec4 tex = texture2D(uLeafTex, vUv);
  #ifdef DEPTH_PASS
    if (tex.a < 0.38) discard;
    gl_FragColor = vec4(1.0);
  #else
    float dist = distance(vWorld, cameraPosition);
    // mips blur alpha towards its mean: lower the cut with distance to keep crowns full
    float cut = mix(0.5, 0.2, smoothstep(12.0, 75.0, dist));
    float alpha = sat((tex.a - cut) / max(fwidth(tex.a), 0.0001) + 0.5);
    if (alpha < 0.03) discard;
    float shade = tex.r / max(tex.a, 0.05);

    vec3 N = normalize(vNormalW);
    float ndl = dot(N, uSunDir);
    float sh = sunShadow(2.6, pixelPhi());
    float ao = vInfo.x;

    float light = smoothstep(-0.25, 0.72, ndl) * mix(0.12, 1.0, sh) * mix(0.58, 1.0, ao) * cloudShade(vWorld.xz) * (1.0 - vTint.z);
    // per-leaf and per-card offsets push neighbours onto different ramp steps: painted speckle
    light = sat(light + (shade - 0.75) * 0.12 + (vInfo.y - 0.5) * 0.06);

    vec3 col = mix(uLeafLow, uLeafMid, smoothstep(0.08, 0.45, light));
    col = mix(col, uLeafHigh, smoothstep(0.44, 0.8, light));
    col = mix(col, uLeafSun, smoothstep(0.88, 1.0, light));
    col = mix(uLeafDeep, col, smoothstep(0.0, 0.5, ao + light * 0.6));

    col *= 1.0 + vTint.x;
    col = mix(col, col * vec3(1.1, 1.02, 0.84), vTint.y);
    col = applyFog(col, vWorld, light);
    gl_FragColor = vec4(col, alpha);
  #endif
}
`;

const barkVertex = /* glsl */ `
#include <common>
${COMMON}
${SHADOW_PARS_VERTEX}
${TREE_SWAY}
attribute vec4 aBranch;   // pad centre this branch feeds, weight (0 on the trunk, 1 at the tip)
attribute vec3 aBark;     // u, v (metres along), pad phase
varying vec3 vNormalW;
varying vec3 vWorld;
varying vec2 vBark;

void main() {
  ${INSTANCE_MATRIX}
  vec3 origin = m[3].xyz;
  vec3 wp = (m * vec4(position, 1.0)).xyz;
  vec3 padW = (m * vec4(aBranch.xyz, 1.0)).xyz;
  wp += trunkSway(origin, wp.y - origin.y) + padBob(origin, padW, aBark.z) * aBranch.w;
  vNormalW = normalize(mat3(m) * normal);
  vWorld = wp;
  vBark = aBark.xy;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  #ifndef DEPTH_PASS
    setSunShadowCoord(wp, vNormalW);
  #endif
}
`;

const barkFragment = /* glsl */ `
#include <common>
${COMMON}
${SHADOW_PARS_FRAGMENT}
uniform vec3 uBarkLit;
uniform vec3 uBarkLitB;
uniform vec3 uBarkShd;
varying vec3 vNormalW;
varying vec3 vWorld;
varying vec2 vBark;

void main() {
  #ifdef DEPTH_PASS
    gl_FragColor = vec4(1.0);
  #else
    vec3 N = normalize(vNormalW);
    float n = texture2D(uNoiseTex, vec2(vBark.x * 0.9, vBark.y * 0.11)).g;
    float light = smoothstep(-0.15, 0.6, dot(N, uSunDir)) * sunShadow(2.5, pixelPhi()) * cloudShade(vWorld.xz);
    vec3 lit = mix(uBarkLitB, uBarkLit, smoothstep(0.35, 0.7, n));
    vec3 col = mix(uBarkShd * mix(0.85, 1.12, n), lit, light);
    col = applyFog(col, vWorld, light);
    gl_FragColor = vec4(col, 1.0);
  #endif
}
`;

let materials = null;
export function treeMaterials() {
  if (materials) return materials;
  const leafTex = makeLeafClusterTexture(512, 5);
  const foliageUniforms = () => litUniforms({
    uLeafTex: { value: leafTex },
    uLeafDeep: { value: PAL.leafDeep },
    uLeafLow: { value: PAL.leafLow },
    uLeafMid: { value: PAL.leafMid },
    uLeafHigh: { value: PAL.leafHigh },
    uLeafSun: { value: PAL.leafSun },
  });
  const foliage = new THREE.ShaderMaterial({
    lights: true,
    uniforms: foliageUniforms(),
    vertexShader: foliageVertex,
    fragmentShader: foliageFragment,
    side: THREE.DoubleSide,
    alphaToCoverage: true,
  });
  const foliageDepth = new THREE.ShaderMaterial({
    defines: { DEPTH_PASS: 1 },
    uniforms: foliageUniforms(),
    vertexShader: foliageVertex,
    fragmentShader: foliageFragment,
    side: THREE.DoubleSide,
  });
  const barkUniforms = () => litUniforms({
    uBarkLit: { value: PAL.barkLit },
    uBarkLitB: { value: PAL.barkLitB },
    uBarkShd: { value: PAL.barkShd },
  });
  const bark = new THREE.ShaderMaterial({ lights: true, uniforms: barkUniforms(), vertexShader: barkVertex, fragmentShader: barkFragment });
  const barkDepth = new THREE.ShaderMaterial({ defines: { DEPTH_PASS: 1 }, uniforms: barkUniforms(), vertexShader: barkVertex, fragmentShader: barkFragment });
  materials = { foliage, foliageDepth, bark, barkDepth, leafTex };
  return materials;
}

const dummy = new THREE.Object3D();

/** Per-instance culling for every tree and bush (call culler.update(camera) once per frame). */
export const culler = new InstanceCuller(SUN.dir);

const _box = new THREE.Box3();
const _local = new THREE.Sphere();

/**
 * World-space bounding spheres [x, y, z, r] for instances of the given geometries.
 * `margin` covers what the vertex shader adds on top of the stored positions: the billboard
 * cards' extent, trunk sway and pad bobbing (at the strongest wind the tuning panel allows).
 */
function instanceBounds(geometries, items, margin) {
  _box.makeEmpty();
  for (const g of geometries) {
    g.computeBoundingBox();
    _box.union(g.boundingBox);
  }
  _box.getBoundingSphere(_local);
  const out = new Float32Array(items.length * 4);
  items.forEach((it, i) => {
    const s = it.scale ?? 1, yaw = it.yaw ?? 0;
    const c = Math.cos(yaw), sn = Math.sin(yaw);
    const lx = _local.center.x * s, ly = _local.center.y * s, lz = _local.center.z * s;
    out[i * 4] = it.x + lx * c + lz * sn;
    out[i * 4 + 1] = it.y + ly;
    out[i * 4 + 2] = it.z - lx * sn + lz * c;
    out[i * 4 + 3] = _local.radius * s + margin;
  });
  return out;
}

function instanced(geo, material, depthMaterial, items, tintOf) {
  const mesh = new THREE.InstancedMesh(geo, material, items.length);
  const tint = tintOf ? new Float32Array(items.length * 4) : null;
  items.forEach((it, i) => {
    dummy.position.set(it.x, it.y, it.z);
    dummy.rotation.set(0, it.yaw ?? 0, 0);
    dummy.scale.setScalar(it.scale ?? 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    if (tint) tint.set(tintOf(it), i * 4);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (tint) geo.setAttribute('aTint', new THREE.InstancedBufferAttribute(tint, 4));
  mesh.customDepthMaterial = depthMaterial;
  mesh.castShadow = true;
  mesh.layers.enable(LAYERS.shadowCasters);
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

/**
 * @param specs [{x, y, z, height, type, seed, yaw, params?, detail?, bright?, warm?}]
 * Trees sharing (type, seed % variants, detail) share one geometry and are instanced.
 */
export function createTrees(specs, variants = 3) {
  const group = new THREE.Group();
  group.name = 'trees';
  const mats = treeMaterials();
  const buckets = new Map();
  for (const s of specs) {
    const key = s.params ? `u${s.seed}` : `${s.type}:${s.seed % variants}:${s.detail ?? 1}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(s);
  }
  for (const list of buckets.values()) {
    const first = list[0];
    const P = { ...TREE_TYPES[first.type], ...(first.params ?? {}) };
    const typeHash = [...first.type].reduce((a, c) => a + c.charCodeAt(0), 0);
    const tree = buildTree(first.params ? first.seed : (first.seed % variants) + typeHash, P, first.detail ?? 1);
    const items = list.map((s) => ({ ...s, scale: s.height / P.height }));
    const bark = instanced(tree.bark, mats.bark, mats.barkDepth, items);
    if (P.trunkShadow === false) {
      bark.castShadow = false;
      bark.layers.disable(LAYERS.shadowCasters);
    }
    const foliage = instanced(tree.foliage, mats.foliage, mats.foliageDepth, items, (s) => [s.bright ?? 0, s.warm ?? 0, s.shade ?? 0, 0]);
    group.add(bark, foliage);
    culler.add([bark, foliage], instanceBounds([tree.bark, tree.foliage], items, 4.0));
  }
  return group;
}

/** @param specs [{x, y, z, r, tall?, seed, bright?, warm?}] */
export function createBushes(specs) {
  const group = new THREE.Group();
  group.name = 'bushes';
  const mats = treeMaterials();
  for (const s of specs) {
    const geo = buildBush(s.seed, s.r, s.tall ?? 0.75);
    const items = [{ ...s, yaw: 0, scale: 1 }];
    const mesh = instanced(geo, mats.foliage, mats.foliageDepth, items, (b) => [b.bright ?? 0, b.warm ?? 0, b.shade ?? 0, 0]);
    group.add(mesh);
    culler.add([mesh], instanceBounds([geo], items, 3.0));
  }
  return group;
}
