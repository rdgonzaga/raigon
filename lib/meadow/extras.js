// Props added on top of the upstream engine: lily pads, birds, fireflies / dust and the walk dressing (props.js).
// Placement lives in ENV.extras (env.js).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PAL } from './config.js';
import { WATER_LEVEL } from './world/heightfield.js';
import { createDressing } from './props.js';

const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const place = (g, x, y, z, rx = 0, ry = 0, rz = 0) => {
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1)));
  return g;
};

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/** Notched lily pads in loose rafts, a few with a flower. */
function lilies(E, kit, r) {
  const pads = [], flowers = [];
  for (const [cx, cz, n, spread, size = 1] of E.rafts) {
    for (let i = 0, t = 0; i < n && t < n * 30; t++) {
      const x = cx + (r() - 0.5) * spread, z = cz + (r() - 0.5) * spread * 0.7;
      if (E.sd(x, z) > -0.6 || !E.avoid(x, z)) continue;
      i++;
      const rad = (0.16 + r() * 0.22) * size, notch = 0.45;
      pads.push(place(new THREE.CircleGeometry(rad, 14, notch / 2, Math.PI * 2 - notch).rotateX(-Math.PI / 2), x, WATER_LEVEL + 0.03, z, 0, r() * 6.28, 0));
      if (r() < 0.16) flowers.push(place(new THREE.ConeGeometry(0.07 * size, 0.07 * size, 7).rotateX(Math.PI), x, WATER_LEVEL + 0.05 + 0.02 * size, z));
    }
  }
  const group = new THREE.Group();
  if (pads.length) group.add(new THREE.Mesh(mergeGeometries(pads), kit.prop(PAL.leafHigh, PAL.leafLow, 0.85, { side: THREE.DoubleSide })));
  if (flowers.length) group.add(new THREE.Mesh(mergeGeometries(flowers), kit.prop(PAL.coneLit, PAL.reedShd, 1.25)));
  return group;
}

const tri = (pts) => new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));

/**
 * A loose flock crossing the sky now and then. Each bird has a jointed wing (the outer half
 * trails the inner), flaps in bursts and glides between them, and drifts in the formation.
 */
function birds(E, r) {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, fog: false, transparent: true, opacity: 0.75 });
  // forward is +z, wings along +x (the left wing is mirrored)
  const body = tri([0, 0, 0.34, 0.055, 0, 0.02, 0, 0, -0.26, 0, 0, 0.34, 0, 0, -0.26, -0.055, 0, 0.02,
    0, 0, -0.2, 0.09, 0, -0.42, -0.09, 0, -0.42]); // body and tail fan
  const inner = tri([0, 0, 0.1, 0.46, 0, 0.07, 0.46, 0, -0.1, 0, 0, 0.1, 0.46, 0, -0.1, 0, 0, -0.12]);
  const outer = tri([0, 0, 0.07, 0.6, 0, -0.24, 0, 0, -0.1]);
  const wing = (side) => {
    const root = new THREE.Group(), tip = new THREE.Group();
    root.add(new THREE.Mesh(inner, mat), tip);
    tip.position.x = 0.45;
    tip.add(new THREE.Mesh(outer, mat));
    root.scale.x = side;
    return { root, tip };
  };
  const flock = Array.from({ length: E.count }, (_, i) => {
    const bird = new THREE.Group(), L = wing(1), R = wing(-1);
    bird.add(new THREE.Mesh(body, mat), L.root, R.root);
    bird.rotation.order = 'YXZ';
    bird.scale.setScalar(E.size * (0.85 + r() * 0.3));
    group.add(bird);
    const rank = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
    return { bird, L, R, back: rank * 3.2, across: side * rank * 2.6, phase: r() * 6.28, rate: 3.6 + r() * 0.8, burst: r() };
  });
  const span = E.x[1] - E.x[0], period = span / E.speed + E.pause;
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  return {
    group,
    // dark, but pulled towards the haze so they sit in the distance instead of popping out
    setMode: (k) => mat.color.setRGB(0.2 + 0.03 * k, 0.22 - 0.07 * k, 0.27 - 0.03 * k, THREE.SRGBColorSpace).lerp(PAL.fogFar ?? PAL.mist, 0.4),
    update(t) {
      const c = (t + E.offset) % period, lead = E.x[0] + c * E.speed;
      group.visible = lead < E.x[1] + 20;
      for (const b of flock) {
        // flap in bursts, glide in between
        const flapping = smooth(-0.1, 0.5, Math.sin(t * 0.35 + b.burst * 6.28));
        const ph = t * b.rate + b.phase;
        // a soft beat: quick downstroke, slower upstroke
        const beat = (Math.sin(ph) + 0.25 * Math.sin(2 * ph)) * 0.5 * flapping;
        const glide = (1 - flapping) * 0.1; // wings held slightly up
        b.L.root.rotation.z = b.R.root.rotation.z = beat + glide;
        b.L.tip.rotation.z = b.R.tip.rotation.z = Math.sin(ph - 1.1) * 0.45 * flapping - glide * 0.8; // the tip follows through
        // loose formation that breathes, a gentle rise and fall, a little banking
        const sway = Math.sin(t * 0.3 + b.phase);
        const x = lead - b.back + Math.sin(t * 0.21 + b.phase) * 0.8;
        const y = E.y + Math.sin(t * 0.45 + b.phase * 2) * 0.7 - Math.cos(ph) * 0.06 * flapping;
        const z = E.z + b.across + sway * 1.2;
        b.bird.position.set(x, y, z);
        b.bird.rotation.set(-0.06 * flapping, Math.PI / 2 + sway * 0.08, sway * 0.12);
      }
    },
  };
}

/** Fireflies at dusk, dust caught in the light in the morning: one cloud of points, recoloured by mode. */
function motes(E, tex, r) {
  const n = E.count, pos = new Float32Array(n * 3), seed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos.set([E.x[0] + r() * (E.x[1] - E.x[0]), E.y[0] + r() * (E.y[1] - E.y[0]), E.z[0] + r() * (E.z[1] - E.z[0])], i * 3);
    seed[i] = r();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uMode: { value: 1 }, uMap: { value: tex }, uScale: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime, uMode, uScale;
      varying float vA;
      void main() {
        float s = aSeed * 40.0, t = uTime * mix(0.12, 0.35, uMode);
        vec3 p = position + vec3(sin(t + s), sin(t * 0.7 + s * 1.7) * 0.6, cos(t * 0.8 + s)) * mix(0.6, 0.9, uMode);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float blink = pow(max(0.0, sin(uTime * (0.6 + aSeed) + s)), 3.0);
        vA = mix(0.35 * (0.5 + 0.5 * sin(uTime * 0.5 + s)), blink, uMode);
        gl_PointSize = mix(2.2, 7.0, uMode) * uScale * 10.0 / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform float uMode;
      varying float vA;
      void main() {
        float a = texture2D(uMap, gl_PointCoord).a * vA;
        vec3 c = mix(vec3(1.0, 0.95, 0.82), vec3(1.0, 0.86, 0.42), uMode);
        gl_FragColor = vec4(c * a, a);
      }`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  });
  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;
  return {
    group: points,
    setMode: (k) => { material.uniforms.uMode.value = k; },
    update: (t, scale) => { material.uniforms.uTime.value = t; material.uniforms.uScale.value = scale; },
  };
}

export function createExtras(E, kit) {
  const r = rng(E.seed ?? 7);
  const tex = glowTexture();
  const group = new THREE.Group();
  group.name = 'extras';
  if (E.lilies) group.add(lilies(E.lilies, kit, r));
  const live = [...[].concat(E.birds ?? []).map((b) => birds(b, r)), E.motes && motes(E.motes, tex, r), E.dressing && createDressing(E.dressing, kit, tex)].filter(Boolean);
  for (const l of live) group.add(l.group);
  return {
    group,
    setMode: (k) => live.forEach((l) => l.setMode?.(k)),
    update: (t, pixelRatio) => live.forEach((l) => l.update?.(t, pixelRatio)),
  };
}
