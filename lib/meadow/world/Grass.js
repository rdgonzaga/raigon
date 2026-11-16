// Ground cover: instanced grass blades, reeds, ferns and little blue flowers.
//
// Blades are tapered strips bent along a circular arc in the vertex shader (so they keep their
// length when the wind pushes them). They stand in tufts: every tuft sits on a peak of the ground
// detail texture, and all of its blades share one colour (the meadow colour field read at the
// tuft's centre) and one flat shadow value. That is what makes the field read as painted masses
// of clump size rather than as noisy single blades.

import * as THREE from 'three';
import { LAYERS, PAL } from '../config.js';
import { mulberry32 } from '../core/noise.js';
import { COMMON, G, GRASS_COLOR, litUniforms, REGION, SHADOW_PARS_FRAGMENT, SHADOW_PARS_VERTEX } from '../core/shaderlib.js';
import { makeFlowerTexture } from '../core/textures.js';
import { ENV } from '../env.js';
import { START } from '../core/walkway.js';
import { groundHeight, sampleSplat, streamSD } from './heightfield.js';
import { bandCell, clearing, scatterGrass } from './scatter.js';

function stripGeometry(levels, profile) {
  // two vertices per level, single vertex at the tip
  const pos = [], idx = [];
  for (let i = 0; i < levels.length; i++) {
    const last = i === levels.length - 1;
    if (last) pos.push(0, levels[i], 0);
    else pos.push(-profile[i], levels[i], 0, profile[i], levels[i], 0);
  }
  for (let i = 0; i < levels.length - 2; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const a = (levels.length - 2) * 2;
  idx.push(a, a + 1, a + 2);
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  return geo;
}

const bladeVertex = /* glsl */ `
#include <common>
${COMMON}
uniform float uFlex;
uniform sampler2D uBladeShadow;
uniform sampler2D uTuftColor;
uniform float uGatherRows;
attribute vec3 aRoot;
attribute float aSlot;   // this blade's texel in the two gather buffers (shared by its whole tuft)
attribute vec4 aBlade;   // yaw, length, half width, random
attribute vec4 aShape;   // lean, bend, dryness, darkness
attribute float aHeart;  // how deep in its tuft the blade stands (0 rim .. 1 heart)
varying vec3 vLit;
varying vec3 vShd;
varying vec3 vWorld;
varying vec4 vInfo;
varying float vDark;
varying float vCloud;
varying float vLight;
varying vec2 vTuft;

void main() {
  float h = position.y;
  float yaw = aBlade.x, L = aBlade.y, W = aBlade.z, rnd = aBlade.w;
  vec2 fwd = vec2(cos(yaw), sin(yaw));
  vec2 side = vec2(-fwd.y, fwd.x);
  // bias the blade's width axis towards the screen so it never goes edge-on and vanishes
  vec2 toCam = normalize(cameraPosition.xz - aRoot.xz + vec2(1e-4));
  vec2 perp = vec2(-toCam.y, toCam.x);
  side = normalize(mix(side, perp * (dot(side, perp) < 0.0 ? -1.0 : 1.0), 0.55));

  // rest pose: circular arc (lean + bend), length preserving
  float bend = max(aShape.y, 0.05);
  float a1 = aShape.x + bend * h;
  float horiz = L * (cos(aShape.x) - cos(a1)) / bend;
  float vert = L * (sin(a1) - sin(aShape.x)) / bend;
  vec3 p = aRoot + vec3(fwd.x * horiz, vert, fwd.y * horiz);

  // wind: steady lean in gusts + per-blade flutter, strongest at the tip
  float gust = windGust(aRoot.xz);
  float flutter = sin(uTime * (2.3 + rnd * 1.4) + rnd * 31.0 + dot(aRoot.xz, vec2(0.9, 0.7)));
  float w = (0.1 + 0.5 * gust + flutter * (0.03 + 0.07 * gust)) * uWindStrength * uFlex;
  float hh = h * h;
  p.xz += uWindDir * (w * hh * L);
  p.y -= w * w * hh * L * 0.5;

  // far blades get wider so the field keeps its coverage instead of dissolving into aliasing
  float dist = distance(aRoot, cameraPosition);
  p.xz += side * (position.x * W * (1.0 + smoothstep(8.0, 70.0, dist) * 2.4));

  vWorld = p;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);

  ivec2 cell = ivec2(int(mod(aSlot, GATHER_WIDTH)), int(aSlot / GATHER_WIDTH));
  // one colour for the whole tuft, worked out once at start-up (see createTuftColours):
  // sunlit colour + contact shadow in one block of texels, shade colour in the block below it
  vec4 tuftLit = texelFetch(uTuftColor, cell, 0);
  vLit = tuftLit.rgb;
  vShd = texelFetch(uTuftColor, cell + ivec2(0, int(uGatherRows)), 0).rgb;
  vInfo = vec4(h, rnd, gust, aShape.z);
  vDark = aShape.w;
  vCloud = cloudShade(aRoot.xz);
  // sun shadow for the whole tuft, gathered once per shadow-map update (see createShadowGather);
  // the baked contact shadow under trunks, bushes and rocks dims it like the soil beneath
  vec2 packed = texelFetch(uBladeShadow, cell, 0).rg;
  vLight = (packed.r + packed.g / 255.0) * (1.0 - tuftLit.a * 0.55);
  vTuft = vec2(aHeart, 1.0 - smoothstep(3.5, 10.0, dist));
}
`;

const bladeFragment = /* glsl */ `
#include <common>
${COMMON}
uniform vec3 uDry;
varying vec3 vLit;
varying vec3 vShd;
varying vec3 vWorld;
varying vec4 vInfo;
varying float vDark;
varying float vCloud;
varying float vLight;
varying vec2 vTuft;

void main() {
  float h = vInfo.x;
  // one flat shadow value for the whole blade
  float light = vLight * vCloud;
  // dryness runs up the blade; past 1 the whole blade is straw
  float dry = sat(vInfo.w) * smoothstep(0.2 * (1.0 - sat(vInfo.w - 1.0)), 0.9, h);
  vec3 lit = vLit * mix(0.94, 1.09, h) * mix(0.97, 1.03, vInfo.y);
  lit = mix(lit, uDry, dry);
  vec3 shd = vShd * mix(0.85, 1.12, h);
  shd = mix(shd, uDry * 0.28, dry * 0.8);
  vec3 col = mix(shd, lit, light);
  // a tuft shades itself: dark at the base and darkest in its heart, bright at the tips
  float base = mix(0.88, mix(0.82, 0.72, vTuft.x), vTuft.y);
  col *= mix(base, mix(1.0, 1.04, vTuft.y), smoothstep(0.0, mix(0.45, 0.7, vTuft.y), h));
  col *= 1.0 - vDark * 0.45;
  col += lit * (vInfo.z * h * 0.1 * light);          // gust sheen running over the tips
  col = applyFog(col, vWorld, light);
  gl_FragColor = vec4(col, 1.0);
}
`;

// ---------------------------------------------------------------------------------------------
// Per-blade shadow gather.
//
// A tuft is shadowed as a whole: one soft shadow-map lookup (8 PCF taps) taken at its centre.
// Each time the shadow map is refreshed, one point per tuft (per blade, for ferns and for the far
// field where blades stand alone) is drawn into a small texture, running that lookup exactly
// once; the blade's vertex shader then just fetches its texel.
// ---------------------------------------------------------------------------------------------
const GATHER_WIDTH = 512;
// shared by both blade materials
const bladeShadow = { value: null }, tuftColor = { value: null }, gatherRows = { value: 0 };

function claimSlot(slots, x, y, z, rand) {
  slots.root.push(x, y, z);
  slots.rand.push(rand);
  return slots.rand.length - 1;
}

function createShadowGather(slots) {
  const count = slots.rand.length;
  const height = Math.max(1, Math.ceil(count / GATHER_WIDTH));
  // plain RGBA8 (renderable on every device); the value is stored as 16-bit fixed point in R + G
  const target = new THREE.WebGLRenderTarget(GATHER_WIDTH, height, {
    depthBuffer: false,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
  });
  bladeShadow.value = target.texture;

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(slots.root, 3));
  geo.setAttribute('aRand', new THREE.Float32BufferAttribute(slots.rand, 1));
  const material = new THREE.ShaderMaterial({
    lights: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.NoBlending,
    uniforms: litUniforms({ uGatherSize: { value: new THREE.Vector2(GATHER_WIDTH, height) } }),
    vertexShader: /* glsl */ `
      ${SHADOW_PARS_VERTEX}
      uniform vec2 uGatherSize;
      attribute float aRand;
      varying float vPhi;
      void main() {
        float id = float(gl_VertexID);
        vec2 cell = vec2(mod(id, uGatherSize.x), floor(id / uGatherSize.x));
        gl_Position = vec4((cell + 0.5) / uGatherSize * 2.0 - 1.0, 0.0, 1.0);
        gl_PointSize = 1.0;
        vPhi = aRand * 6.2831853;
        setSunShadowCoord(position + vec3(0.0, 0.08, 0.0), vec3(0.0, 1.0, 0.0));
      }
    `,
    fragmentShader: /* glsl */ `
      #include <common>
      ${SHADOW_PARS_FRAGMENT}
      varying float vPhi;
      void main() {
        float s = sunShadow(5.0, vPhi) * 255.0;
        gl_FragColor = vec4(floor(s) / 255.0, fract(s), 0.0, 1.0);
      }
    `,
  });
  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;
  points.layers.set(LAYERS.shadowGather);
  points.name = 'bladeShadowGather';

  const camera = new THREE.Camera();
  camera.layers.set(LAYERS.shadowGather);

  return {
    points,
    target,
    rows: height,
    /**
     * Call when the shadow map is due for a refresh (renderer.shadowMap.needsUpdate = true).
     * Rendering the scene through the gather camera makes three.js update the shadow map first
     * and then draws only the gather points, which read that fresh map.
     */
    render(renderer, scene) {
      const previous = renderer.getRenderTarget();
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      renderer.setRenderTarget(previous);
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Tuft colours.
//
// A tuft's colour never changes, so it is worked out once: one point per gather slot is drawn
// into a float texture, running the meadow colour field (the very function the terrain shades
// with) at the tuft's centre. Every frame after that a blade just fetches two texels, where it
// used to sample five textures per vertex.
// ---------------------------------------------------------------------------------------------
function createTuftColours(slotGeometry, rows) {
  const target = new THREE.WebGLRenderTarget(GATHER_WIDTH, rows * 2, {
    type: THREE.HalfFloatType, // shade colours are too dark for 8 linear bits
    depthBuffer: false,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
  });
  tuftColor.value = target.texture;
  gatherRows.value = rows;

  const scene = new THREE.Scene();
  for (const block of [0, 1]) {
    const material = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending,
      uniforms: { ...G, uGatherSize: { value: new THREE.Vector2(GATHER_WIDTH, rows) }, uBlock: { value: block } },
      vertexShader: /* glsl */ `
        ${COMMON}
        ${GRASS_COLOR}
        ${REGION}
        uniform vec2 uGatherSize;
        uniform float uBlock;
        varying vec4 vOut;
        void main() {
          float id = float(gl_VertexID);
          vec2 cell = vec2(mod(id, uGatherSize.x), floor(id / uGatherSize.x) + uBlock * uGatherSize.y);
          gl_Position = vec4((cell + 0.5) / vec2(uGatherSize.x, uGatherSize.y * 2.0) * 2.0 - 1.0, 0.0, 1.0);
          gl_PointSize = 1.0;
          vec3 lit, shd;
          grassColors(position.xz, lit, shd);
          float contact = texture2D(uSplatTex, regionUv(position.xz)).b;
          vOut = uBlock < 0.5 ? vec4(lit, contact) : vec4(shd * (1.0 - contact * 0.3), 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec4 vOut;
        void main() { gl_FragColor = vOut; }
      `,
    });
    const points = new THREE.Points(slotGeometry, material);
    points.frustumCulled = false;
    scene.add(points);
  }
  const camera = new THREE.Camera();

  return {
    target,
    /** Run once after the ground textures exist (and again if the meadow palette is changed live). */
    render(renderer) {
      const previous = renderer.getRenderTarget();
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      renderer.setRenderTarget(previous);
    },
  };
}

function bladeMaterial(flex) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    defines: { GATHER_WIDTH: `${GATHER_WIDTH}.0` },
    uniforms: {
      ...G, uFlex: { value: flex }, uDry: { value: PAL.grassDry },
      uBladeShadow: bladeShadow, uTuftColor: tuftColor, uGatherRows: gatherRows,
    },
    vertexShader: bladeVertex,
    fragmentShader: bladeFragment,
  });
}

function instancedStrip(geo, material, data, slots) {
  const n = data.root.length / 3;
  const slot = new Float32Array(n);
  for (let i = 0; i < n; i++) slot[i] = claimSlot(slots, data.root[i * 3], data.root[i * 3 + 1], data.root[i * 3 + 2], data.blade[i * 4 + 3]);
  geo.setAttribute('aRoot', new THREE.InstancedBufferAttribute(new Float32Array(data.root), 3));
  geo.setAttribute('aBlade', new THREE.InstancedBufferAttribute(new Float32Array(data.blade), 4));
  geo.setAttribute('aShape', new THREE.InstancedBufferAttribute(new Float32Array(data.shape), 4));
  geo.setAttribute('aSlot', new THREE.InstancedBufferAttribute(slot, 1));
  geo.setAttribute('aHeart', new THREE.InstancedBufferAttribute(new Float32Array(n).fill(0.5), 1));
  geo.instanceCount = n;
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.receiveShadow = false; // shadows are sampled manually; keep the blades out of the shadow pass
  return mesh;
}

/**
 * Same blades as instancedStrip(), but split into square chunks so the renderer can frustum-cull
 * them wherever the camera walks: every blade that is not submitted is nine vertices (and five
 * texture fetches each) the GPU never runs. Each chunk's blades are shuffled, so a chunk far from
 * the camera can draw just a prefix of them (distance LOD) without leaving holes.
 */
function chunkedStrips(base, material, data, reach, slots, scale) {
  const group = new THREE.Group();
  const count = data.root.length / 3;
  const buckets = new Map();
  for (let i = 0; i < count; i++) {
    const x = data.root[i * 3], z = data.root[i * 3 + 2], cell = data.cell[i];
    const size = cell < 0.2 * scale ? 8 : 24; // dense grass gets small chunks
    const key = `${size}:${Math.floor(x / size)}:${Math.floor(z / size)}`;
    let b = buckets.get(key);
    if (!b) buckets.set(key, (b = { ids: [], cell, d: Infinity }));
    b.ids.push(i);
    b.cell = Math.min(b.cell, cell);
    b.d = Math.min(b.d, Math.hypot(x - START.x, z - START.y));
  }
  // nearest first, so the draw order is front-to-back from the opening view
  const ordered = [...buckets.values()].sort((a, b) => a.d - b.d);
  const box = new THREE.Box3(), p = new THREE.Vector3();
  const tuftSlots = new Map();
  const rng = mulberry32(4242);
  for (const { ids, cell } of ordered) {
    for (let k = ids.length - 1; k > 0; k--) {
      const j = Math.floor(rng() * (k + 1));
      [ids[k], ids[j]] = [ids[j], ids[k]];
    }
    const n = ids.length;
    const root = new Float32Array(n * 3), blade = new Float32Array(n * 4), shape = new Float32Array(n * 4), slot = new Float32Array(n);
    const heart = new Float32Array(n);
    box.makeEmpty();
    for (let k = 0; k < n; k++) {
      const i = ids[k];
      for (let c = 0; c < 3; c++) root[k * 3 + c] = data.root[i * 3 + c];
      for (let c = 0; c < 4; c++) {
        blade[k * 4 + c] = data.blade[i * 4 + c];
        shape[k * 4 + c] = data.shape[i * 4 + c];
      }
      heart[k] = data.clump[i * 4 + 3];
      box.expandByPoint(p.set(root[k * 3], root[k * 3 + 1], root[k * 3 + 2]));
      const tuft = data.tuft[i];
      if (tuft < 0) {
        slot[k] = claimSlot(slots, root[k * 3], root[k * 3 + 1], root[k * 3 + 2], blade[k * 4 + 3]);
      } else {
        // every blade of a tuft reads the same texel, gathered at the tuft's centre
        let shared = tuftSlots.get(tuft);
        if (shared === undefined) {
          shared = claimSlot(slots, data.clump[i * 4], data.tuftY[i], data.clump[i * 4 + 1], data.clump[i * 4 + 2]);
          tuftSlots.set(tuft, shared);
        }
        slot[k] = shared;
      }
    }
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', base.attributes.position);
    geo.setIndex(base.index);
    geo.setAttribute('aRoot', new THREE.InstancedBufferAttribute(root, 3));
    geo.setAttribute('aBlade', new THREE.InstancedBufferAttribute(blade, 4));
    geo.setAttribute('aShape', new THREE.InstancedBufferAttribute(shape, 4));
    geo.setAttribute('aSlot', new THREE.InstancedBufferAttribute(slot, 1));
    geo.setAttribute('aHeart', new THREE.InstancedBufferAttribute(heart, 1));
    geo.instanceCount = n;
    // bounds cover the roots plus the longest blade bent by the strongest gust
    geo.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
    geo.boundingSphere.radius += reach;
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = false;
    mesh.receiveShadow = false; // shadows are sampled manually; keep the blades out of the shadow pass
    const { min, max } = box.clone();
    mesh.onBeforeRender = (_r, _s, camera) => {
      // as dense as the scatter bands would be at this distance from the camera, never denser
      const cx = camera.position.x, cz = camera.position.z;
      const d = Math.hypot(Math.max(min.x - cx, 0, cx - max.x), Math.max(min.z - cz, 0, cz - max.z));
      const k = Math.min(1, (cell / (bandCell(d) * scale)) ** 2);
      geo.instanceCount = Math.max(1, Math.ceil(n * k));
    };
    group.add(mesh);
  }
  group.userData.bladeCount = count;
  return group;
}


function scatterFerns() {
  const rng = mulberry32(8086);
  const out = { root: [], blade: [], shape: [] };
  const plants = [];
  const tryAdd = (x, z, s) => {
    if (streamSD(x, z) < 0.25 || sampleSplat(x, z, 0) > 0.3) return;
    plants.push([x, z, s]);
  };
  // the fern bank in the right foreground corner
  if (!ENV.noStream) for (let i = 0; i < 26; i++) tryAdd(2.1 + rng() * 4.6, -2.5 - rng() * 3.6, 0.8 + rng() * 0.5);
  // a few on the dark bank to the left
  if (!ENV.noStream) for (let i = 0; i < 9; i++) tryAdd(-6.2 + rng() * 3.6, -2.2 - rng() * 2.6, 0.7 + rng() * 0.4);
  // undergrowth along the forest edge and behind the camera
  for (let i = 0; i < 60; i++) {
    const a = rng() * Math.PI * 2, r = 9 + rng() * 22;
    const x = Math.cos(a) * r, z = Math.abs(Math.sin(a)) * r * 0.8 + 1.5;
    tryAdd(x, z, 0.8 + rng() * 0.6);
  }
  for (const [x0, x1, z0, z1, n] of ENV.fernPatches ?? []) for (let i = 0; i < n; i++) tryAdd(x0 + rng() * (x1 - x0), z0 + rng() * (z1 - z0), 0.7 + rng() * 0.5);
  for (const [x, z, s] of plants) {
    const y = groundHeight(x, z);
    const n = 9 + Math.floor(rng() * 6);
    const a0 = rng() * Math.PI * 2;
    for (let k = 0; k < n; k++) {
      const yaw = a0 + (k / n) * Math.PI * 2 + (rng() - 0.5) * 0.5;
      out.root.push(x + Math.cos(yaw) * 0.04, y - 0.03, z + Math.sin(yaw) * 0.04);
      out.blade.push(yaw, (0.55 + rng() * 0.45) * s, 0.05 + rng() * 0.025, rng());
      out.shape.push(0.3 + rng() * 0.55, 1.0 + rng() * 0.9, 0, 0.25 + rng() * 0.2);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Flowers
// ---------------------------------------------------------------------------------------------
function createFlowers() {
  const rng = mulberry32(1987);
  const root = [], data = [];
  const cluster = (x0, x1, z0, z1, n, sMin, sMax) => {
    for (let i = 0; i < n; i++) {
      const x = x0 + rng() * (x1 - x0), z = z0 + rng() * (z1 - z0);
      if (streamSD(x, z) < 0.2 || sampleSplat(x, z, 0) > 0.4 || clearing(x, z) < 0.6) continue;
      root.push(x, groundHeight(x, z), z);
      data.push(0.2 + rng() * 0.16, sMin + rng() * (sMax - sMin), rng(), rng());
    }
  };
  if (!ENV.noStream) {
  cluster(-1.7, 0.5, -5.0, -3.2, 22, 0.016, 0.028); // sunlit patch by the path
  cluster(-5.2, -1.4, -4.7, -2.4, 16, 0.018, 0.04); // dark bank on the left
  cluster(3.6, 5.8, -6.1, -4.6, 12, 0.018, 0.032); // among the ferns
  cluster(-6.6, -3.4, -9.6, -8.3, 18, 0.02, 0.032); // far bank
  cluster(-12, 10, -20, -9.5, 50, 0.022, 0.036); // sprinkled through the meadow
  }
  for (const c of ENV.flowers ?? []) cluster(...c);

  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  geo.setAttribute('aRoot', new THREE.InstancedBufferAttribute(new Float32Array(root), 3));
  geo.setAttribute('aFlower', new THREE.InstancedBufferAttribute(new Float32Array(data), 4));
  geo.instanceCount = root.length / 3;

  const material = new THREE.ShaderMaterial({
    lights: true,
    alphaToCoverage: true,
    defines: { SHADE: 'vec3(0.24, 0.27, 0.34)' }, // petals in shade go dim and cool, not just grey
    uniforms: litUniforms({
      uFlowerTex: { value: makeFlowerTexture(128) },
      uPetal: { value: PAL.flower },
      uPetalB: { value: PAL.flowerB },
      uCore: { value: PAL.flowerCore },
    }),
    vertexShader: /* glsl */ `
      #include <common>
      ${COMMON}
      ${SHADOW_PARS_VERTEX}
      attribute vec3 aRoot;
      attribute vec4 aFlower;   // stem height, size, random, tint
      varying vec2 vUv;
      varying vec3 vWorld;
      varying vec2 vRnd;
      varying float vCloud;
      void main() {
        float H = aFlower.x, rnd = aFlower.z;
        float gust = windGust(aRoot.xz);
        float flutter = sin(uTime * (2.3 + rnd * 1.4) + rnd * 31.0 + dot(aRoot.xz, vec2(0.9, 0.7)));
        float w = (0.1 + 0.5 * gust + flutter * (0.03 + 0.07 * gust)) * uWindStrength;
        vec3 c = aRoot + vec3(0.0, H, 0.0);
        c.xz += uWindDir * (w * H);
        vec4 mv = viewMatrix * vec4(c, 1.0);
        mv.xy += rot2(position.xy, rnd * 6.28 + flutter * 0.2) * (aFlower.y * 0.78 * (1.0 + smoothstep(7.0, 60.0, -mv.z) * 1.7));
        gl_Position = projectionMatrix * mv;
        vUv = position.xy * 0.5 + 0.5;
        vWorld = c;
        vRnd = aFlower.zw;
        // shadowed where the head is, and under passing clouds like the grass around it
        vCloud = cloudShade(aRoot.xz);
        setSunShadowCoord(c, vec3(0.0, 1.0, 0.0));
      }
    `,
    fragmentShader: /* glsl */ `
      #include <common>
      ${COMMON}
      ${SHADOW_PARS_FRAGMENT}
      uniform sampler2D uFlowerTex;
      uniform vec3 uPetal;
      uniform vec3 uPetalB;
      uniform vec3 uCore;
      varying vec2 vUv;
      varying vec3 vWorld;
      varying vec2 vRnd;
      varying float vCloud;
      void main() {
        vec4 tex = texture2D(uFlowerTex, vUv);
        float alpha = sat((tex.a - 0.5) / max(fwidth(tex.a), 0.0001) + 0.5);
        if (alpha < 0.03) discard;
        float a = max(tex.a, 0.05);
        vec3 petal = mix(uPetal, uPetalB, step(0.62, fract(vRnd.y * 7.31))) * mix(0.7, 1.15, tex.r / a) * mix(0.85, 1.15, vRnd.y);
        vec3 col = mix(petal, uCore, sat(tex.g / a));
        float light = sunShadow(3.0, vRnd.x * 6.2831853) * vCloud;
        col *= mix(SHADE, vec3(1.0), light);
        col = applyFog(col, vWorld, light);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  mesh.name = 'flowers';

  // a thin stem under every head, bent by the same wind so the head stays on top of it
  const stemGeo = new THREE.InstancedBufferGeometry();
  stemGeo.setAttribute('position', new THREE.Float32BufferAttribute([-1, 0, 0, 1, 0, 0, 1, 1, 0, -1, 1, 0], 3));
  stemGeo.setIndex([0, 1, 2, 0, 2, 3]);
  stemGeo.setAttribute('aRoot', geo.attributes.aRoot);
  stemGeo.setAttribute('aFlower', geo.attributes.aFlower);
  stemGeo.instanceCount = geo.instanceCount;
  const stemMat = new THREE.ShaderMaterial({
    lights: true,
    uniforms: litUniforms({ uStem: { value: PAL.leafHigh }, uStemShd: { value: PAL.leafLow } }),
    vertexShader: /* glsl */ `
      #include <common>
      ${COMMON}
      ${SHADOW_PARS_VERTEX}
      attribute vec3 aRoot;
      attribute vec4 aFlower;
      varying vec3 vWorld;
      varying float vRnd, vY, vCloud;
      void main() {
        float H = aFlower.x, rnd = aFlower.z, y = position.y;
        float gust = windGust(aRoot.xz);
        float flutter = sin(uTime * (2.3 + rnd * 1.4) + rnd * 31.0 + dot(aRoot.xz, vec2(0.9, 0.7)));
        float w = (0.1 + 0.5 * gust + flutter * (0.03 + 0.07 * gust)) * uWindStrength;
        vec3 c = aRoot + vec3(0.0, H * y, 0.0);
        c.xz += uWindDir * (w * H) * y * y;
        vec4 mv = viewMatrix * vec4(c, 1.0);
        // a few millimetres wide, but never thinner than about a pixel
        mv.x += position.x * max(0.0045, -mv.z * 0.0009);
        gl_Position = projectionMatrix * mv;
        vWorld = c;
        vRnd = rnd;
        vY = y;
        vCloud = cloudShade(aRoot.xz);
        setSunShadowCoord(c, vec3(0.0, 1.0, 0.0));
      }
    `,
    fragmentShader: /* glsl */ `
      #include <common>
      ${COMMON}
      ${SHADOW_PARS_FRAGMENT}
      uniform vec3 uStem, uStemShd;
      varying vec3 vWorld;
      varying float vRnd, vY, vCloud;
      void main() {
        float light = sunShadow(3.0, vRnd * 6.2831853) * vCloud;
        vec3 col = mix(uStemShd, uStem, mix(0.25, 1.0, light) * mix(0.55, 1.0, vY));
        col = applyFog(col, vWorld, light);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const stems = new THREE.Mesh(stemGeo, stemMat);
  stems.frustumCulled = false;
  stems.name = 'flowerStems';
  const group = new THREE.Group();
  group.add(stems, mesh);
  return group;
}

/** `grass` is a scatterGrass() result made off-thread; without one the scatter runs here. */
export function createGroundCover(quality, grass = scatterGrass(quality.grass)) {
  const group = new THREE.Group();
  group.name = 'groundCover';
  const slots = { root: [], rand: [] };

  const blades = chunkedStrips(
    stripGeometry([0, 0.28, 0.55, 0.8, 1], [1, 0.9, 0.7, 0.42, 0]),
    bladeMaterial(1),
    grass,
    4.0, // longest blade bent by the strongest wind the tuning panel allows
    slots,
    1 / Math.sqrt(quality.grass),
  );
  blades.name = 'grass';

  const ferns = instancedStrip(
    stripGeometry([0, 0.16, 0.34, 0.52, 0.7, 0.86, 1], [0.22, 0.72, 1, 0.95, 0.74, 0.44, 0]),
    bladeMaterial(0.45),
    scatterFerns(),
    slots,
  );
  ferns.name = 'ferns';

  const gather = createShadowGather(slots);
  group.add(blades, ferns, createFlowers(), gather.points);
  group.userData.bladeCount = blades.userData.bladeCount;
  group.userData.shadowGather = gather;
  group.userData.tuftColours = createTuftColours(gather.points.geometry, gather.rows);
  return group;
}
