// Browser-only entry for the stylized-meadow scene; core/ and world/ are upstream copies.

import * as THREE from 'three';
import { isSoftwareRenderer } from './core/gpu.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LAYERS, PAL, pickQuality, setMode, SUN } from './config.js';
import { ENV, MODE0, REGRADE } from './env.js';
import { terrainHeight } from './world/heightfield.js';
import { HeroCamera } from './core/HeroCamera.js';
import { createPipeline } from './core/pipeline.js';
import { COMMON, G, litUniforms, REGION as REGION_GLSL, SHADOW_PARS_FRAGMENT, SHADOW_PARS_VERTEX } from './core/shaderlib.js';
import { cloudNoiseData, makeCloudNoise3D, makeNoiseTexture } from './core/textures.js';
import { createGroundCover } from './world/Grass.js';
import { bakeTerrainMaps, MOUNDS, REGION, terrainData } from './world/heightfield.js';
import { buildLayout } from './world/layout.js';
import { createMountains } from './world/Mountains.js';
import { createRocks } from './world/Rocks.js';
import { Sky } from './world/Sky.js';
import { createTerrain } from './world/Terrain.js';
import { createBushes, createTrees, culler } from './world/Trees.js';
import { createWater } from './world/Water.js';
import { createWindFX } from './world/WindFX.js';
import { createExtras } from './extras.js';

// Yields between build steps so the page stays responsive.
const breathe = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Runs a pure start-up bake in a worker that posts `parts` messages; returns one promise per message.
 * Inline (no workers, ?noworker, or a worker error) the first part is computed here and the rest are null.
 */
function offThread(job, inline, parts = 1) {
  const fallback = () => Array.from({ length: parts }, (_, i) => (i ? Promise.resolve(null) : breathe().then(inline)));
  if (new URLSearchParams(location.search).has('noworker')) return fallback(); // A/B on a real device
  let worker;
  try {
    worker = new Worker(new URL('./core/bake.worker.js', import.meta.url), { type: 'module', name: location.search });
  } catch {
    return fallback();
  }
  const settle = [];
  const out = Array.from({ length: parts }, () => new Promise((resolve) => settle.push(resolve)));
  let got = 0;
  worker.onmessage = (e) => {
    settle[got++](e.data);
    if (got === parts) worker.terminate();
  };
  worker.onerror = (e) => {
    e.preventDefault();
    worker.terminate();
    if (got === 0) settle[got++](inline());
    while (got < parts) settle[got++](null);
  };
  worker.postMessage(job);
  return out;
}

let running = null;

/** Idempotent; rejects when WebGL is unavailable. Hook types live in start.d.ts. */
export function startMeadow(canvas, hooks = {}) {
  running ??= build(canvas, hooks);
  return running;
}

// Lit prop material: sun shadows, contact shade, wet waterline, fog.
const PROP_VERT = /* glsl */ `
  #include <common>
  ${COMMON}
  ${SHADOW_PARS_VERTEX}
  #ifdef WOOD
    attribute vec3 aGrain;
    attribute vec3 aTint;
  #endif
  varying vec3 vN;
  varying vec3 vG;
  varying vec3 vT;
  varying vec3 vWorld;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    #ifdef WOOD
      vG = aGrain;
      vT = aTint;
    #else
      vG = position;
      vT = vec3(1.0);
    #endif
    gl_Position = projectionMatrix * viewMatrix * wp;
    setSunShadowCoord(wp.xyz, vN);
  }`;
const PROP_FRAG = /* glsl */ `
  #include <common>
  ${COMMON}
  ${REGION_GLSL}
  ${SHADOW_PARS_FRAGMENT}
  uniform vec3 uLit;
  uniform vec3 uShd;
  uniform float uK;
  varying vec3 vN;
  varying vec3 vG;
  varying vec3 vT;
  varying vec3 vWorld;
  void main() {
    vec3 n = normalize(vN);
    if (!gl_FrontFacing) n = -n;
    float grain = 1.0;
    #ifdef WOOD
      float streak = texture2D(uNoiseTex, vec2(vG.x * 0.16, (vG.y + vG.z) * 2.2)).r;
      float rings = 0.5 + 0.5 * sin((vG.y + vG.z * 0.7) * 70.0 + streak * 16.0 + vG.x * 0.8);
      float knot = smoothstep(0.7, 0.86, texture2D(uNoiseTex, vec2(vG.x * 0.9 + 0.3, (vG.y - vG.z) * 5.0 + 0.7)).g);
      grain = (0.86 + 0.22 * streak) * (0.93 + 0.07 * rings) * (1.0 - 0.28 * knot);
    #endif
    float light = smoothstep(-0.1, 0.5, dot(n, uSunDir)) * sunShadow(2.0, pixelPhi());
    float sky = 0.88 + 0.14 * n.y;
    float ground = max(terrainHeightAt(vWorld.xz), 0.0);
    float ao = mix(0.58, 1.0, smoothstep(0.0, 0.28, vWorld.y - ground));
    float wet = mix(0.55, 1.0, smoothstep(-0.02, 0.1, vWorld.y));
    vec3 col = mix(uShd, uLit, light) * uK * vT * grain * sky * ao * wet;
    gl_FragColor = vec4(applyFog(col, vWorld, light), 1.0);
  }`;

/** A lit prop material; `wood` reads the per-board grain and tint attributes. */
const propMaterial = (lit, shd, k, { wood = false, side = THREE.FrontSide } = {}) => new THREE.ShaderMaterial({
  lights: true,
  defines: wood ? { WOOD: 1 } : {},
  uniforms: litUniforms({ uLit: { value: lit }, uShd: { value: shd }, uK: { value: k } }),
  vertexShader: PROP_VERT, fragmentShader: PROP_FRAG, side,
});

/** Bevelled boards merged into one mesh, each with its own tint and grain along its long side. */
function woodKit(seed) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const parts = [];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p0 = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  /** A board w×h×d centred at (px, py, pz), turned by (rx, ry, rz); tone darkens or lightens it. */
  const board = (w, h, d, px, py, pz, rx = 0, ry = 0, rz = 0, tone = 1) => {
    const g = new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.24);
    const pos = g.attributes.position, count = pos.count;
    const grain = new Float32Array(count * 3), tint = new Float32Array(count * 3);
    const long = w >= h && w >= d ? 0 : h >= d ? 1 : 2;
    const off = rnd() * 60, cross = rnd() * 4;
    const light = tone * (0.84 + rnd() * 0.3), grey = rnd() < 0.35 ? 0.1 + rnd() * 0.2 : rnd() * 0.06;
    const t = [light * (1 - grey * 0.12), light * (1 + grey * 0.06), light * (1 + grey * 0.42)];
    for (let i = 0; i < count; i++) {
      const v = [pos.getX(i), pos.getY(i), pos.getZ(i)];
      grain[i * 3] = v[long] + off;
      grain[i * 3 + 1] = v[(long + 1) % 3] + cross;
      grain[i * 3 + 2] = v[(long + 2) % 3];
      tint.set(t, i * 3);
    }
    g.setAttribute('aGrain', new THREE.BufferAttribute(grain, 3));
    g.setAttribute('aTint', new THREE.BufferAttribute(tint, 3));
    g.applyMatrix4(m.compose(p0.set(px, py, pz), q.setFromEuler(e.set(rx, ry, rz)), one));
    parts.push(g);
  };
  const mesh = (k = 1.45, lit = PAL.barkLit, shd = PAL.barkShd) => {
    const merged = mergeGeometries(parts);
    parts.splice(0).forEach((g) => g.dispose());
    return caster(new THREE.Mesh(merged, propMaterial(lit, shd, k, { wood: true })));
  };
  return { board, mesh, rnd };
}

/** A park bench: teak planks on two slim cast-iron ends with arms; it faces local +z. */
function createBench({ x, z, yaw }) {
  const { board, mesh, rnd } = woodKit(5);
  for (let i = 0; i < 4; i++) board(1.95, 0.045, 0.105, (rnd() - 0.5) * 0.012, 0.455, 0.2 - i * 0.125); // seat, small gaps
  // back planks on the front of the leaning posts: z = -0.3 - 0.06 (y - 0.45)
  for (let i = 0; i < 3; i++) {
    const y = 0.6 + i * 0.13;
    board(1.95, 0.1, 0.04, (rnd() - 0.5) * 0.012, y, -0.27 - (y - 0.45) * 0.06, -0.06);
  }
  const group = new THREE.Group();
  group.add(mesh(1.0, PAL.teakLit, PAL.teakShd));
  // No cast shadow: solid proxy slabs read as a black patch next to the dappled tree shadows.
  // The bench is grounded by the soft contact shade under it instead (see build()).
  // cast-iron ends: front leg, back leg running up into the post, seat rail, arm and its support
  const iron = [];
  const bar = (w, h, d, py, pz, rx = 0) => iron.push(new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.4).rotateX(rx).translate(0, py, pz));
  bar(0.05, 0.46, 0.06, 0.215, 0.24, -0.14);
  bar(0.05, 1.0, 0.06, 0.49, -0.35, -0.06);
  bar(0.05, 0.05, 0.6, 0.42, -0.04);
  bar(0.06, 0.04, 0.62, 0.66, -0.06);
  bar(0.04, 0.24, 0.04, 0.545, 0.21);
  bar(0.08, 0.03, 0.12, 0.015, 0.26);
  bar(0.08, 0.03, 0.12, 0.015, -0.32);
  const scroll = new THREE.SphereGeometry(0.035, 10, 8).translate(0, 0.66, 0.25);
  const endGeo = mergeGeometries([...iron, scroll.deleteAttribute('uv')].map((g) => (g.index ? g.toNonIndexed() : g)).map((g) => { g.deleteAttribute('uv'); return g; }));
  const metal = propMaterial(PAL.ironLit, PAL.ironShd, 1.0);
  for (const sx of [-0.88, 0.88]) {
    const end = caster(new THREE.Mesh(endGeo, metal));
    end.position.x = sx;
    group.add(end);
  }
  group.scale.setScalar(1.15);
  // rest on the lowest foot so none floats on a slope
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const feet = [[-0.85, 0.3], [0.85, 0.3], [-0.85, -0.34], [0.85, -0.34]].map(([fx, fz]) => {
    const lx = fx * 1.15, lz = fz * 1.15;
    return terrainHeight(x + lx * c + lz * s, z - lx * s + lz * c);
  });
  group.position.set(x, Math.min(...feet) - 0.03, z);
  group.rotation.y = yaw;
  group.name = 'bench';
  return group;
}

/** A slatted garden chair with a raked back and broad arms; it faces local +z. */
function createChair({ x, z, yaw }) {
  const material = new THREE.ShaderMaterial({
    uniforms: { uSunDir: G.uSunDir, uLit: { value: PAL.barkLit }, uShd: { value: PAL.barkShd } },
    vertexShader: 'varying vec3 vN; void main() { vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 uSunDir; uniform vec3 uLit; uniform vec3 uShd; varying vec3 vN; void main() { gl_FragColor = vec4(mix(uShd * 1.7, uLit * 1.7, smoothstep(-0.1, 0.5, dot(normalize(vN), uSunDir))), 1.0); }',
  });
  const group = new THREE.Group();
  const box = (w, h, d, px, py, pz, tilt = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(px, py, pz);
    m.rotation.x = tilt;
    m.castShadow = true;
    m.layers.enable(LAYERS.shadowCasters);
    group.add(m);
  };
  for (let i = 0; i < 4; i++) box(0.6, 0.03, 0.115, 0, 0.4 - i * 0.022, 0.22 - i * 0.135, 0.16); // seat slats, sloping back
  for (let i = 0; i < 5; i++) box(0.105, 0.86 - Math.abs(i - 2) * 0.07, 0.026, -0.25 + i * 0.125, 0.74, -0.36, -0.36); // back slats, fanned top
  for (const s of [-0.37, 0.37]) {
    box(0.12, 0.03, 0.66, s, 0.6, 0.0); // arm
    box(0.07, 0.6, 0.07, s, 0.3, 0.27); // front leg
    box(0.07, 0.5, 0.07, s, 0.25, -0.27, -0.2); // back leg
  }
  group.scale.setScalar(1.3);
  group.position.set(x, terrainHeight(x, z) - 0.02, z);
  group.rotation.y = yaw;
  group.name = 'chair';
  return group;
}

/** A plank dock running from the shore out over the lake (local -z is out). */
function createDock({ x, z, len, yaw }) {
  const { board, mesh, rnd } = woodKit(11);
  const pitch = 0.265, n = Math.round(len / pitch), deck = 0.32, L = (n - 1) * pitch;
  const land = (n - 9) * pitch; // the last planks widen into a landing
  for (let i = 0; i < n; i++) {
    const w = (i > n - 9 ? 2.5 : 1.5) + (rnd() - 0.5) * 0.09;
    board(w, 0.055, 0.215 + (rnd() - 0.5) * 0.02, (rnd() - 0.5) * 0.05, deck + (rnd() - 0.5) * 0.014, -i * pitch, (rnd() - 0.5) * 0.025, (rnd() - 0.5) * 0.03, (rnd() - 0.5) * 0.02);
  }
  for (const sx of [-0.62, 0, 0.62]) board(0.08, 0.15, L + 0.24, sx, deck - 0.105, -L / 2, 0, 0, 0, 0.62);
  for (const sx of [-1.12, 1.12]) board(0.08, 0.15, L - land + 0.24, sx, deck - 0.105, -(land + L) / 2, 0, 0, 0, 0.62);
  for (let i = 0; i * 2.4 <= L + 0.1; i++) {
    const pz = -i * 2.4, sx = -pz > land - 0.05 ? 1.32 : 0.82;
    for (const s of [-sx, sx]) board(0.15, 1.7, 0.15, s, deck + 0.22 - 0.85, pz, (rnd() - 0.5) * 0.04, rnd() * 0.6, (rnd() - 0.5) * 0.04, 0.68);
    board(sx * 2 + 0.1, 0.12, 0.08, 0, deck - 0.24, pz, 0, 0, 0, 0.58);
  }
  const group = mesh(1.45);
  group.position.set(x, 0, z);
  group.rotation.y = yaw;
  group.name = 'dock';
  return group;
}

const FLAT_VERT = 'varying vec3 vN; void main() { vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const flat = (lit, shd, k = 1.5) => propMaterial(lit, shd, k, { side: THREE.DoubleSide });
const caster = (m) => { m.castShadow = true; m.receiveShadow = true; m.layers.enable(LAYERS.shadowCasters); return m; };

/** A small white rowing boat afloat, bow along local -z. */
function createBoat({ x, z, yaw }) {
  const group = new THREE.Group();
  const hull = caster(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), flat(PAL.boatLit, PAL.boatShd, 0.96)));
  hull.scale.set(0.66, 0.5, 1.75);
  group.add(hull);
  const wood = flat(PAL.barkLit, PAL.barkShd, 1.5);
  for (const pz of [-0.75, 0.1, 0.9]) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.24 * Math.sqrt(1 - (pz / 1.75) ** 2), 0.04, 0.24), wood);
    seat.position.set(0, -0.09, pz);
    group.add(seat);
  }
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 5, 28), wood); // gunwale
  rim.rotation.x = Math.PI / 2;
  rim.scale.set(0.66, 1.75, 1);
  group.add(rim);
  group.position.set(x, 0.24, z);
  group.rotation.set(0.02, yaw, 0.05);
  group.name = 'boat';
  return group;
}

/** A timber post with a lit lantern hanging from its arm (the arm points along local +x). */
function createLantern({ x, z, yaw }) {
  const group = new THREE.Group();
  const wood = flat(PAL.barkLit, PAL.barkShd, 1.35);
  const box = (w, h, d, px, py, pz, material = wood) => {
    const m = caster(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material));
    m.position.set(px, py, pz);
    group.add(m);
  };
  box(0.11, 2.5, 0.11, 0, 1.25, 0); // post
  box(0.62, 0.07, 0.07, 0.26, 2.38, 0); // arm
  box(0.02, 0.2, 0.02, 0.5, 2.26, 0); // hanger
  box(0.26, 0.05, 0.26, 0.5, 2.15, 0); // cap
  box(0.22, 0.04, 0.22, 0.5, 1.84, 0); // base
  // unlit pale glass in the morning, a warm lamp at sunset (uOn follows the mode)
  const glow = new THREE.ShaderMaterial({
    uniforms: { uC: { value: PAL.sunWarm }, uOn: { value: MODE0 } },
    vertexShader: FLAT_VERT,
    fragmentShader: 'uniform vec3 uC; uniform float uOn; varying vec3 vN; void main() { vec3 off = vec3(0.44, 0.43, 0.4) * (0.8 + 0.2 * vN.y); gl_FragColor = vec4(mix(off, mix(uC, vec3(1.0), 0.2) * 1.15, uOn), 1.0); }',
  });
  box(0.17, 0.27, 0.17, 0.5, 2.0, 0, glow);
  group.position.set(x, terrainHeight(x, z) - 0.05, z);
  group.rotation.y = yaw;
  group.name = 'lantern';
  group.userData.glow = glow;
  return group;
}

/** Fallen logs ([x, z, length, radius, yaw]) and stumps ([x, z, radius, height]); a log whose middle is over water floats. */
function createDeadwood(logs = [], stumps = []) {
  const group = new THREE.Group();
  const wood = flat(PAL.barkLit, PAL.barkShd, 1.25);
  for (const [x, z, len, r, yaw] of logs) {
    const m = caster(new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.82, len, 9), wood));
    m.rotation.set(0, yaw, Math.PI / 2 + 0.03);
    m.position.set(x, Math.max(terrainHeight(x, z), -0.02) + r * 0.72, z);
    group.add(m);
  }
  for (const [x, z, r, h] of stumps) {
    const m = caster(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.86, r * 1.12, h, 9), wood));
    m.position.set(x, terrainHeight(x, z) + h * 0.5 - 0.04, z);
    group.add(m);
  }
  group.name = 'deadwood';
  return group;
}

async function build(canvas, hooks) {
  const params = new URLSearchParams(location.search);
  const quality = pickQuality();
  const still = params.has('still'); // locked-off camera, fixed resolution (used for A/B captures)
  const progress = (f) => hooks.onProgress?.(f); // how far start-up has got, 0..1 (the first frame is 1)

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
  renderer.toneMapping = THREE.NoToneMapping; // tone mapping + sRGB encode happen in the grade pass
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false; // refreshed every other frame, see the loop
  renderer.setClearColor(0x000000, 1);

  // a CPU rasteriser (GPU disabled or blocklisted) would crawl: keep the still instead. ?gpu skips the check
  const gl = renderer.getContext();
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const gpuName = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : '';
  if (!params.has('gpu') && isSoftwareRenderer(gpuName)) {
    renderer.dispose();
    renderer.forceContextLoss();
    throw new Error(`meadow: software renderer (${gpuName}), showing the still`);
  }

  // a context lost before the first frame can't be rebuilt half-way: give up and keep the still
  let onEarlyLoss;
  const lostEarly = new Promise((_, reject) => {
    onEarlyLoss = () => reject(new Error('meadow: WebGL context lost during start-up, showing the still'));
    canvas.addEventListener('webglcontextlost', onEarlyLoss, { once: true });
  });
  lostEarly.catch(() => {});
  const step = (p) => Promise.race([p, lostEarly]);

  const scene = new THREE.Scene();
  const rig = new HeroCamera(canvas, { still });
  if (params.has('scroll')) rig.scroll = rig.scrollTarget = parseFloat(params.get('scroll')); // for stills at a scroll position
  const camera = rig.camera;

  // the two big pure bakes run in workers while this thread builds the meshes
  const [noiseJob] = offThread({ kind: 'noise', size: 64 }, () => cloudNoiseData(64));
  G.uNoiseTex.value = makeNoiseTexture(256);
  progress(0.2);
  await step(breathe());

  const sun = new THREE.DirectionalLight(0xffffff, 1);
  const shadowCenter = new THREE.Vector3(-2, 0, -26);
  sun.position.copy(shadowCenter).addScaledVector(SUN.dir, 170);
  sun.target.position.copy(shadowCenter);
  sun.castShadow = true;
  sun.shadow.mapSize.set(quality.shadow, quality.shadow);
  Object.assign(sun.shadow.camera, { left: -62, right: 62, top: 62, bottom: -62, near: 20, far: 340 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.05;
  sun.shadow.camera.layers.set(LAYERS.shadowCasters); // the shadow map sees shadow casters only
  sun.layers.enable(LAYERS.shadowGather); // ...and lights the grass shadow gather pass too
  scene.add(sun, sun.target);

  const layout = buildLayout();
  if (ENV.bench) {
    // soft contact shade right under the bench; four blobs overlap, so each is light enough to sum to one rock's
    const { x, z, yaw } = ENV.bench;
    for (const t of [-0.8, -0.27, 0.27, 0.8]) layout.ao.push({ x: x + Math.cos(yaw) * t, z: z - Math.sin(yaw) * t, r: 0.85, s: 0.2 });
  }
  // the same worker then scatters the grass over its own copy of the maps
  const [terrainJob, grassJob] = offThread({ kind: 'terrain', ao: layout.ao, mounds: MOUNDS, grass: quality.grass }, () => terrainData(layout.ao), 2);
  G.uRegion.value.set(REGION.minX, REGION.minZ, 1 / REGION.size, 1 / REGION.size);
  progress(0.34);
  await step(breathe());

  // materials share the G uniforms, so the baked maps can land after the meshes exist
  scene.add(createMountains());
  scene.add(createTerrain());
  scene.add(createWater());
  progress(0.46);
  await step(breathe());
  scene.add(createRocks(layout.rocks));
  scene.add(createTrees(layout.trees));
  progress(0.56);
  await step(breathe());
  scene.add(createBushes(layout.bushes));
  const wind = createWindFX();
  scene.add(wind.group);
  if (ENV.bench) scene.add(createBench(ENV.bench));
  if (ENV.dock) scene.add(createDock(ENV.dock));
  if (ENV.chair) scene.add(createChair(ENV.chair));
  if (ENV.boat) scene.add(createBoat(ENV.boat));
  const lantern = ENV.lantern ? scene.add(createLantern(ENV.lantern)).children.at(-1) : null;
  if (ENV.logs || ENV.stumps) scene.add(createDeadwood(ENV.logs, ENV.stumps));
  const extras = createExtras(ENV.extras ?? {}, { prop: propMaterial, caster });
  extras.setMode(MODE0);
  scene.add(extras.group);
  progress(0.64);
  await step(breathe());
  const pipeline = createPipeline(renderer, scene, camera, quality);
  // compiled against the HDR scene target, so the programs match the ones the first frame asks for
  const precompile = () => {
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(pipeline.composer.renderTarget1);
    const done = renderer.compileAsync(scene, camera);
    renderer.setRenderTarget(prev);
    return done;
  };
  // the driver compiles what is built so far while the workers run
  const compiling = precompile();

  const [noiseData, terrain] = await step(Promise.all([noiseJob, terrainJob]));
  // phones can't filter float32 textures
  const maps = bakeTerrainMaps(layout.ao, params.has('halfheights') || !renderer.extensions.has('OES_texture_float_linear'), terrain);
  G.uHeightTex.value = maps.heightTex;
  G.uSplatTex.value = maps.splatTex;
  G.uDetailTex.value = maps.detailTex;
  const sky = new Sky({ noise3D: makeCloudNoise3D(64, noiseData), steps: quality.cloudSteps, scale: quality.cloudScale });
  scene.add(sky.mesh);
  progress(0.76);
  await step(breathe());
  const groundCover = createGroundCover(quality, (await step(grassJob)) ?? undefined);
  groundCover.userData.tuftColours.render(renderer); // static: one colour per tuft, worked out once
  scene.add(groundCover);
  performance.mark('meadow:built'); // everything above is start-up work: textures, layout, geometry
  progress(0.94); // what is left is compiling shaders for the first frame
  await step(Promise.all([compiling, precompile()]));

  const forcedDpr = params.has('dpr') ? parseFloat(params.get('dpr')) : null;
  const minScale = quality.minScale ?? 0.55;
  let resolutionScale = quality.startScale ?? 1; // lowered automatically when the GPU can't hold the frame rate

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    // a preset may also cap the pixel count, so a big tablet does not cost four phones
    const budget = Math.sqrt((quality.pixels ?? Infinity) / Math.max(1, w * h));
    const dpr = forcedDpr ?? Math.min(window.devicePixelRatio || 1, quality.dpr, budget) * resolutionScale;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    pipeline.setSize(w, h, dpr);
    sky.setSize(w, h);
    rig.setAspect(w / h);
  }
  window.addEventListener('resize', resize);
  resize();

  // the low preset holds 30 fps instead of chasing 60 (?gpu lifts the cap); the adaptive thresholds follow the target
  const minFrameMs = quality.name === 'low' && !params.has('gpu') ? 1000 / 30 - 2 : 0;
  const frameScale = minFrameMs ? 2 : 1;
  const perf = { time: 0, frames: 0, calm: 0, slow: 0, ceiling: 1, warmup: quality.eager ? 2 : 4 };
  function adaptResolution(dt) {
    if (still || forcedDpr !== null || document.hidden) return;
    if (perf.warmup > 0) { perf.warmup -= dt; return; } // ignore start-up shader compilation hitches
    perf.time += dt;
    perf.frames++;
    if (perf.time < 1.5) return;
    const ms = (perf.time / perf.frames) * 1000;
    perf.time = 0;
    perf.frames = 0;
    // already at the floor and still under ~22 fps twice running: give up and show the still
    if (ms > 45 && resolutionScale <= minScale && !params.has('gpu')) {
      if (++perf.slow >= 2) { stopped = true; hooks.onSlow?.(); }
      return;
    }
    perf.slow = 0;
    if (ms > 19.5 * frameScale && resolutionScale > minScale) {
      // below ~50 fps: step down by sqrt of the slowdown, and cap the climb back
      const step = quality.eager ? Math.min(0.88, Math.max(0.6, Math.sqrt((17 * frameScale) / ms))) : 0.88;
      resolutionScale = Math.max(minScale, resolutionScale * step);
      perf.ceiling = resolutionScale * 1.07;
      perf.calm = 0;
      resize();
    } else if (ms < 17.4 * frameScale) {
      perf.calm++;
      if (perf.calm % 20 === 0) perf.ceiling = Math.min(1, perf.ceiling * 1.07); // slowly forget the ceiling
      const limit = Math.min(1, perf.ceiling);
      if (resolutionScale < limit - 0.005 && perf.calm % 4 === 0) {
        resolutionScale = Math.min(limit, resolutionScale * 1.06);
        resize();
      }
    }
  }

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return; // leave browser shortcuts alone
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName ?? '')) return;
    if (e.key.toLowerCase() === 'f') hooks.onFreeCamera?.(rig.toggleFree()); // the overlay steps aside
  });

  const fixedTime = params.has('t') ? parseFloat(params.get('t')) : null;
  let last = performance.now();
  let time = 0;
  let frameIndex = 0;
  let lost = false;
  let stopped = false;

  // shadow map and cloud volume alternate frames
  const REFRESH = Math.max(2, Math.round(quality.refresh ?? 2));

  function renderFrame(forceBoth = false) {
    G.uTime.value = time;
    pipeline.grade.uniforms.uTime.value = time;
    const all = forceBoth || frameIndex === 0;
    const phase = frameIndex++ % REFRESH;
    wind.update(time);
    extras.update(time, renderer.getPixelRatio() * window.innerHeight / 760);
    culler.update(camera);
    if (all || phase === 0) {
      // refresh the sun shadow map and, in the same call, the per-blade grass shadows that read it
      renderer.shadowMap.needsUpdate = true;
      groundCover.userData.shadowGather.render(renderer, scene);
    }
    if (all || phase === REFRESH >> 1 || rig.free || (REFRESH > 2 && rig.moving)) sky.render(renderer, camera, time);
    pipeline.render(rig.free || REGRADE);
  }

  // ?fps: a small readout for checking a real device (frame rate, rendered size, preset).
  const stats = params.has('fps') ? document.body.appendChild(document.createElement('div')) : null;
  if (stats) {
    stats.style.cssText = 'position:fixed;left:50%;top:env(safe-area-inset-top,0px);transform:translateX(-50%);z-index:9;' +
      'padding:3px 9px;border-radius:0 0 7px 7px;background:rgba(0,0,0,.62);color:#fff;white-space:nowrap;pointer-events:none;' +
      'font:600 11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace';
  }
  const meter = { time: 0, frames: 0, worst: 0 };
  function updateStats(seconds) {
    meter.time += seconds;
    meter.frames++;
    meter.worst = Math.max(meter.worst, seconds);
    if (meter.time < 1) return;
    stats.textContent = `${Math.round(meter.frames / meter.time)} fps · worst ${Math.round(meter.worst * 1000)} ms · ` +
      `${canvas.width}×${canvas.height} · ${quality.name} ${Math.round(resolutionScale * 100)}%`;
    meter.time = meter.frames = meter.worst = 0;
  }

  function frame(now) {
    if (stopped) return;
    requestAnimationFrame(frame);
    if (now - last < minFrameMs) return;
    if (stats) updateStats((now - last) / 1000);
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (lost) return;
    time = fixedTime ?? time + dt;
    rig.update(dt, time);
    renderFrame();
    adaptResolution(dt);
  }

  // built: from here a lost context is waited out and restored
  canvas.removeEventListener('webglcontextlost', onEarlyLoss);
  // on context restore, rebake the cloud map and tuft colours
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    lost = true;
    hooks.onContextLost?.();
  });
  canvas.addEventListener('webglcontextrestored', () => {
    sky.weatherBaked = false;
    groundCover.userData.tuftColours.render(renderer);
    frameIndex = 0; // the next frame redraws every pass
    lost = false;
    requestAnimationFrame(() => hooks.onFirstFrame?.());
  });

  const api = {
    renderer, scene, camera, rig, sky, sun, pipeline, G, culler, quality, env: ENV, mode: MODE0,
    /** 0..1 page scroll position; the camera eases along SCROLL_PATH (HeroCamera.js). */
    setScroll(k) { rig.scrollTarget = Math.min(1, Math.max(0, k)); },
    /** 0 = golden morning, 1 = sunset. Repaints the palette; the grass tuft colours are baked, so they are redrawn. */
    setMode(k) {
      api.mode = k;
      setMode(k);
      extras.setMode(k);
      if (lantern) lantern.userData.glow.uniforms.uOn.value = k;
      if (ENV.fogByMode) {
        const [[d0, m0], [d1, m1]] = ENV.fogByMode;
        G.uFogDensity.value = d0 + (d1 - d0) * k;
        G.uFogMax.value = m0 + (m1 - m0) * k;
      }
      // the shading light may move with the sun (ENV.light): shaders and the shadow map follow
      G.uSunDir.value.copy(SUN.dir);
      sun.position.copy(shadowCenter).addScaledVector(SUN.dir, 170);
      groundCover.userData.tuftColours.render(renderer);
    },
    /** Render one frame and return it as a PNG data URL. */
    capture(atTime) {
      if (atTime !== undefined) {
        time = atTime;
        rig.update(0, time);
      }
      renderFrame(true);
      return canvas.toDataURL('image/png');
    },
    /** Advance the animation by dt seconds and render one frame through the normal frame path. */
    step(dt = 1 / 60) {
      time += dt;
      rig.update(dt, time);
      renderFrame();
    },
  };
  window.__meadow = api;

  // resolves once the first picture is on screen (not before the tab is actually visible)
  await new Promise((resolve) => {
    requestAnimationFrame((now) => {
      last = now;
      frame(now);
      performance.mark('meadow:first-frame'); // shaders compiled, first picture drawn
      hooks.onFirstFrame?.();
      resolve();
    });
  });
  return api;
}
