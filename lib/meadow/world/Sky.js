// Sky: analytic gradient dome + ray-marched volumetric clouds.
//
// The clouds are a real volume (Perlin-Worley density, Beer-Lambert light march towards the sun)
// rendered into a small off-screen target every frame and composited by the dome shader - the
// same split Unreal's volumetric cloud component uses. Where the clouds sit is art-directed:
// each "blob" below is a weather-map stamp placed by pointing at a pixel of the reference frame.

import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { HERO, PAL, REF, WIND } from '../config.js';
import { FOCAL_PX, pixelRay } from '../core/refspace.js';
import { COMMON, G } from '../core/shaderlib.js';
import { REGRADE } from '../env.js';

const BASE = 1500;
const TOP = 3200;
const MAX_BLOBS = 28;
// The weather map is baked once into a texture that is radially warped (r -> r / (r + WARP)):
// fine detail near the camera for the thin streaks, the whole sky out to the horizon in one map.
const WARP = 6000;
const WEATHER_SIZE = 1024;
// How far (m) a march sample can land from where it started: the turbulence displaces it by up
// to ~670 m, plus two weather-map texels of filtering slack at the range where this is used.
const REACH = 850;

// ---------------------------------------------------------------------------------------------
// Weather authoring (reference pixels -> stamps on the cloud layer)
// ---------------------------------------------------------------------------------------------
const blobs = [];

function planePoint(px, py, hFrac) {
  const d = pixelRay(px, py);
  const H = BASE + (TOP - BASE) * hFrac;
  const t = (H - HERO.position.y) / Math.max(d.y, 0.02);
  return { x: HERO.position.x + d.x * t, z: HERO.position.z + d.z * t, t, d };
}

/**
 * Cumulus stamp: centre pixel, half width in px, depth along the view in metres, strength and
 * (optionally) the pixel row its top should reach, which becomes a ceiling on its height.
 */
function cloudAt(px, py, halfWidthPx, depth, strength, topPy = null) {
  if (REGRADE) px = REF.width - px; // our sky is the original mirrored: the tall cumulus stands over the sunrise
  if (REGRADE && px > 900 && px < 1280 && py > 225) return; // keep the horizon clear where the sun rises and sets
  let hFrac = 0.22, top = 1, p;
  for (let pass = 0; pass < 2; pass++) {
    p = planePoint(px, py, hFrac);
    if (topPy === null) break;
    const dt = pixelRay(px, topPy);
    const tanEl = dt.y / Math.hypot(dt.x, dt.z);
    const dist = Math.max(300, Math.hypot(p.x - HERO.position.x, p.z - HERO.position.z) - depth * 0.35);
    top = Math.min(1, Math.max(0.06, (HERO.position.y + dist * tanEl - BASE) / (TOP - BASE)));
    hFrac = top * 0.45;
  }
  const az = Math.atan2(p.d.x, -p.d.z);
  blobs.push({ x: p.x, z: p.z, rx: (p.t * halfWidthPx) / FOCAL_PX, rz: depth, ax: Math.cos(az), ay: Math.sin(az), s: strength, top });
}

/** Wind-combed streak between two pixels. */
function streakAt(px1, py1, px2, py2, halfWidthPx, strength, hFrac = 0.12) {
  if (REGRADE) { px1 = REF.width - px1; px2 = REF.width - px2; }
  const a = planePoint(px1, py1, hFrac), b = planePoint(px2, py2, hFrac);
  const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz);
  const t = (a.t + b.t) / 2;
  const w = (t * halfWidthPx) / FOCAL_PX;
  blobs.push({
    x: (a.x + b.x) / 2, z: (a.z + b.z) / 2,
    rx: len * 0.95, rz: w,
    ax: dx / len, ay: dz / len, s: strength,
    // a streak is a shallow sheet, a few times as tall as it is wide
    top: Math.min(1, (w * 3.4) / (TOP - BASE)),
  });
}

// --- left: the big bright cumulus towering behind the trees
cloudAt(285, 125, 185, 1250, 0.94, 0);
cloudAt(235, 50, 125, 900, 0.9, -50);
cloudAt(395, 95, 85, 600, 0.84, 30);
cloudAt(335, 25, 95, 600, 0.82, -60);
cloudAt(175, 185, 90, 800, 0.86, 105);
cloudAt(478, 112, 18, 150, 0.64, 100);
cloudAt(664, 132, 20, 220, 0.6, 120);
cloudAt(40, 245, 90, 900, 0.8, 195);
// --- top right: wind-combed streaks
streakAt(655, 146, 945, -14, 17, 0.9);
streakAt(858, 82, 1080, -14, 15, 0.9);
streakAt(845, 130, 922, 90, 9, 0.84);
streakAt(686, 126, 764, 86, 9, 0.82);
streakAt(1190, 222, 1365, 124, 22, 0.9);
streakAt(1174, 257, 1266, 226, 9, 0.82);
cloudAt(1340, 40, 60, 500, 0.7, -10);
// --- right: the big bank resting on the horizon
cloudAt(880, 246, 70, 700, 0.84, 205);
cloudAt(962, 240, 80, 800, 0.86, 198);
cloudAt(1050, 236, 86, 950, 0.88, 194);
cloudAt(1180, 250, 96, 1150, 0.88, 212);
cloudAt(1010, 290, 165, 2000, 0.92, 198);
cloudAt(1150, 295, 175, 2500, 0.93, 212);
cloudAt(1300, 300, 140, 2300, 0.92, 222);
cloudAt(1100, 355, 250, 3000, 0.8, 300);
cloudAt(820, 252, 40, 320, 0.7, 236);
// --- low clouds peeking through the left tree line
cloudAt(160, 270, 110, 1600, 0.78, 225);

// ---------------------------------------------------------------------------------------------
// Cloud volume shader
// ---------------------------------------------------------------------------------------------
const cloudFragment = /* glsl */ `
precision highp float;
precision highp sampler3D;

uniform sampler3D uNoise3D;
uniform mat4 uProjInv;
uniform mat4 uCamWorld;
uniform vec3 uCamPos;
uniform float uTime;
uniform vec3 uSunDir;
uniform sampler2D uWeather;
uniform vec2 uDrift;
uniform vec3 uLit;
uniform vec3 uShadeHigh;
uniform vec3 uShadeLow;
uniform vec3 uHaze;
uniform float uFarCoverage;
uniform float uFrame;
varying vec2 vUv;

const float BASE = ${BASE.toFixed(1)};
const float TOP = ${TOP.toFixed(1)};
const float SIGMA = 0.0065;
const float WARP = ${WARP.toFixed(1)};
const float FAR_START = 7000.0;

float sat(float x) { return clamp(x, 0.0, 1.0); }

// art-directed weather map: 0 = clear sky, 1 = towering cumulus
float coverage(vec2 xz, float dist, out float top) {
  vec2 q = xz - uDrift;
  vec2 wm = texture(uWeather, 0.5 + 0.5 * q / (length(q) + WARP)).rg;
  float c = wm.r;
  top = wm.g;
  // the horizon bank only exists beyond FAR_START: closer in, its noise fetch is a guaranteed no-op
  if (dist > FAR_START) {
    float n = texture(uNoise3D, vec3(q * 0.00003, 0.37)).b;
    float farC = smoothstep(0.45, 0.8, n) * uFarCoverage * smoothstep(FAR_START, 15000.0, dist);
    c = max(c, farC);
    top = max(top, mix(0.2, 1.0, farC * farC) * step(0.02, farC));
  }
  return c;
}

// Signed "inside-ness" of the cloud: billowy Perlin-Worley noise, squeezed by a height gradient
// (flat-ish base, long tapering top) and thresholded by the weather map. Because the threshold
// is crossed at a different height for every noise bump, tops come out as cauliflower towers
// instead of smooth domes.
float shape(vec3 p, float cov, float top) {
  float h = (p.y - BASE) / (TOP - BASE);
  float prof = smoothstep(0.0, min(0.1, top * 0.3), h) * (1.0 - smoothstep(top * 0.22, top, h));
  vec3 q = vec3(p.x - uDrift.x, p.y + uTime * 2.0, p.z - uDrift.y);
  float n = texture(uNoise3D, q * (1.0 / 1900.0)).r;
  float m = texture(uNoise3D, q * (1.0 / 7300.0) + 0.21).b;
  n = smoothstep(0.12, 0.92, n * 0.8 + m * 0.2);
  return n * prof - (1.0 - cov);
}

float density(vec3 p, float cov, float top) {
  float d = shape(p, cov, top);
  if (d <= 0.0) return 0.0;
  vec3 q = vec3(p.x - uDrift.x, p.y - uTime * 7.0, p.z - uDrift.y) * (1.0 / 780.0);
  float det = texture(uNoise3D, q).g;
  d = sat(d * 2.6);
  return sat((d - det * 0.6 * (1.0 - d)) * 1.5);
}

void main() {
  vec4 ndc = vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
  vec4 view = uProjInv * ndc;
  vec3 rd = normalize((uCamWorld * vec4(normalize(view.xyz / view.w), 0.0)).xyz);
  vec3 ro = uCamPos;

  vec3 L = vec3(0.0);
  float T = 1.0;

  if (rd.y > 0.018) {
    float t0 = (BASE - ro.y) / rd.y;
    float t1 = min((TOP - ro.y) / rd.y, 60000.0);
    if (t1 > t0) {
      float dt = (t1 - t0) / float(STEPS);
      vec3 p3 = fract(vec3(gl_FragCoord.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      // a new golden-ratio offset every frame; the history pass averages the frames
      float jitter = fract((p3.x + p3.y) * p3.z + uFrame * 0.618034);
      float t = t0 + dt * jitter;
      for (int i = 0; i < STEPS; i++) {
        vec3 p = ro + rd * t;
        // Empty-space skip. The weather map's blue channel is an upper bound on the coverage
        // anywhere the turbulence below could move this sample to; if that is under the density
        // threshold (and we are nearer than the horizon bank) the sample cannot contribute, so
        // the 3D fetches are skipped. Exact: the result is the same, most of the sky is empty.
        vec2 q0 = p.xz - uDrift;
        float reach = texture(uWeather, 0.5 + 0.5 * q0 / (length(q0) + WARP)).b;
        if (reach < 0.02 && t <= FAR_START) { t += dt; continue; }
        // slow horizontal turbulence bends the authored stamps into irregular, wind-torn shapes
        vec2 warp = texture(uNoise3D, vec3(p.x - uDrift.x, p.y * 0.6, p.z - uDrift.y) * (1.0 / 5200.0)).rb - vec2(0.55, 0.5);
        float top;
        float cov = coverage(p.xz + warp * 900.0, t, top);
        if (cov > 0.02 && top > 0.01) {
          float d = density(p, cov, top);
          if (d > 0.002) {
            // march towards the sun for self-shadowing
            float tau = 0.0;
            float ls = 70.0;
            vec3 lp = p;
            for (int j = 0; j < 4; j++) {
              lp += uSunDir * ls;
              tau += sat(shape(lp, cov, top) * 4.0) * ls;
              ls *= 1.7;
            }
            tau *= SIGMA * 0.55;
            // Beer-Lambert plus a broad second lobe standing in for multiple scattering
            float energy = 0.65 * exp(-tau) + 0.35 * exp(-tau * 0.16);
            // We look at the sunlit face of the clouds (sun behind the camera), so the modelling
            // comes mostly from height: bright crowns, cool blue-grey bellies.
            float h = sat((p.y - BASE) / (TOP - BASE));
            float hRel = sat(h / max(top, 0.05));
            float w = smoothstep(0.0, 0.5, energy) * mix(0.8, 1.0, smoothstep(0.0, 0.3, hRel));
            vec3 S = mix(mix(uShadeLow, uShadeHigh, smoothstep(0.0, 0.6, hRel)), uLit, w);
            S = mix(S, uHaze, 1.0 - exp(-t / 24000.0));
            float a = 1.0 - exp(-d * SIGMA * dt);
            L += T * a * S;
            T *= 1.0 - a;
            if (T < 0.02) { T = 0.0; break; }
          }
        }
        t += dt;
      }
    }
  }
  gl_FragColor = vec4(L, T);
}
`;

// One-off bake of the authored stamps into the warped weather map (R: coverage, G: cloud top).
const weatherFragment = /* glsl */ `
precision highp float;
uniform vec4 uBlobA[ BLOBS ];
uniform vec4 uBlobB[ BLOBS ];
uniform int uBlobCount;
varying vec2 vUv;
const float WARP = ${WARP.toFixed(1)};
const float REACH = ${REACH.toFixed(1)};
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float rp = length(p);
  float c = 0.0;
  float top = 0.0;
  float reach = 0.0;
  if (rp < 0.999) {
    vec2 q = p / max(rp, 1e-5) * (WARP * rp / (1.0 - rp));
    for (int i = 0; i < BLOBS; i++) {
      if (i >= uBlobCount) break;
      vec4 a = uBlobA[ i ];
      vec4 b = uBlobB[ i ];
      vec2 d = q - a.xy;
      vec2 l = vec2(dot(d, b.xy), dot(d, vec2(-b.y, b.x))) / a.zw;
      float f = b.z * (1.0 - smoothstep(0.18, 1.0, length(l)));
      c = max(c, f);
      // each stamp may only grow as tall as its own ceiling; overlapping stamps take the tallest
      top = max(top, min(mix(0.2, 1.0, f * f), b.w) * step(0.02, f));
      // upper bound on this stamp's coverage anywhere within REACH of this texel
      vec2 lmin = max(abs(l) - REACH / a.zw, vec2(0.0));
      reach = max(reach, b.z * (1.0 - smoothstep(0.18, 1.0, length(lmin))));
    }
  }
  gl_FragColor = vec4(c, top, reach, 1.0);
}
`;

// Temporal accumulation: the march is jittered differently every frame and blended with the last
// result, reprojected by view direction only (the clouds are kilometres away, so camera moves are
// rotations to them). The 3x3 clamp keeps drift and fast pans from ghosting.
const historyFragment = /* glsl */ `
precision highp float;
uniform sampler2D uCurr;
uniform sampler2D uHist;
uniform mat4 uProjInv;
uniform mat4 uCamWorld;
uniform mat4 uPrevVP;
uniform float uBlend;
varying vec2 vUv;
void main() {
  vec2 tx = 1.0 / vec2(textureSize(uCurr, 0));
  vec4 c = texture2D(uCurr, vUv);
  vec4 lo = c, hi = c;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec4 s = texture2D(uCurr, vUv + vec2(x, y) * tx);
    lo = min(lo, s);
    hi = max(hi, s);
  }
  vec4 view = uProjInv * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
  vec3 rd = (uCamWorld * vec4(normalize(view.xyz / view.w), 0.0)).xyz;
  vec4 pc = uPrevVP * vec4(rd, 0.0);
  vec2 puv = pc.xy / pc.w * 0.5 + 0.5;
  float ok = step(0.0, pc.w) * step(0.0, puv.x) * step(puv.x, 1.0) * step(0.0, puv.y) * step(puv.y, 1.0);
  vec4 h = clamp(texture2D(uHist, puv), lo, hi);
  gl_FragColor = mix(c, h, uBlend * ok);
}
`;

const fullscreenVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export class Sky {
  constructor({ noise3D, steps = 44, scale = 0.5 }) {
    this.scale = scale;
    const buffer = () => new THREE.WebGLRenderTarget(4, 4, {
      type: THREE.HalfFloatType,
      depthBuffer: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
    this.target = buffer();
    this.history = [buffer(), buffer()];
    this.frame = 0;
    this.prevVP = new THREE.Matrix4();
    this.historyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uCurr: { value: this.target.texture },
        uHist: { value: null },
        uProjInv: { value: new THREE.Matrix4() },
        uCamWorld: { value: new THREE.Matrix4() },
        uPrevVP: { value: this.prevVP },
        uBlend: { value: 0 },
      },
      vertexShader: fullscreenVertex,
      fragmentShader: historyFragment,
      depthTest: false,
      depthWrite: false,
    });

    const blobA = [], blobB = [];
    for (let i = 0; i < MAX_BLOBS; i++) {
      const b = blobs[i];
      blobA.push(b ? new THREE.Vector4(b.x, b.z, b.rx, b.rz) : new THREE.Vector4(0, 0, 1, 1));
      blobB.push(b ? new THREE.Vector4(b.ax, b.ay, b.s, b.top) : new THREE.Vector4(1, 0, 0, 1));
    }
    this.weather = new THREE.WebGLRenderTarget(WEATHER_SIZE, WEATHER_SIZE, {
      type: THREE.HalfFloatType,
      depthBuffer: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
    this.weatherMaterial = new THREE.ShaderMaterial({
      defines: { BLOBS: MAX_BLOBS },
      uniforms: {
        uBlobA: { value: blobA },
        uBlobB: { value: blobB },
        uBlobCount: { value: Math.min(blobs.length, MAX_BLOBS) },
      },
      vertexShader: fullscreenVertex,
      fragmentShader: weatherFragment,
      depthTest: false,
      depthWrite: false,
    });
    this.weatherBaked = false;

    this.cloudMaterial = new THREE.ShaderMaterial({
      defines: { STEPS: steps },
      uniforms: {
        uNoise3D: { value: noise3D },
        uWeather: { value: this.weather.texture },
        uProjInv: { value: new THREE.Matrix4() },
        uCamWorld: { value: new THREE.Matrix4() },
        uCamPos: { value: new THREE.Vector3() },
        uTime: G.uTime,
        uSunDir: G.uSunDir,
        uDrift: { value: new THREE.Vector2() },
        uLit: { value: PAL.cloudLit },
        uShadeHigh: { value: PAL.cloudShadeHigh },
        uShadeLow: { value: PAL.cloudShadeLow },
        uHaze: { value: PAL.cloudHaze },
        uFarCoverage: { value: 0.8 },
        uFrame: { value: 0 },
      },
      vertexShader: fullscreenVertex,
      fragmentShader: cloudFragment,
      depthTest: false,
      depthWrite: false,
    });
    this.quad = new FullScreenQuad(this.cloudMaterial);

    this.domeMaterial = new THREE.ShaderMaterial({
      uniforms: { ...G, uCloudTex: { value: this.history[0].texture }, uVeil: { value: PAL.cloudHaze } },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = position;
          vec4 p = projectionMatrix * viewMatrix * vec4(cameraPosition + position * 2500.0, 1.0);
          gl_Position = p.xyww;
        }
      `,
      fragmentShader: /* glsl */ `
        ${COMMON}
        uniform sampler2D uCloudTex;
        uniform vec2 uResolution;
        uniform vec3 uVeil;
        varying vec3 vDir;
        void main() {
          vec3 dir = normalize(vDir);
          vec3 col = skyGradient(dir);
          // thin high veils (2D): the soft milky patches drifting between the real clouds
          vec2 cp = dir.xz / max(dir.y, 0.06);
          float v1 = texture2D(uNoiseTex, cp * 0.11 + uWindDir * (uTime * 0.0016) + vec2(0.4, 0.1)).r;
          float v2 = texture2D(uNoiseTex, cp * vec2(0.31, 0.17) + uWindDir * (uTime * 0.0027)).g;
          float veil = smoothstep(0.44, 0.8, v1 * 0.65 + v2 * 0.35) * smoothstep(0.06, 0.3, dir.y) * 0.46;
          col = mix(col, uVeil, veil);
          float sd = max(dot(dir, mix(uSunDir, uSunView, uWarmK)), 0.0);
          col += uSunGlow * (pow(sd, 1400.0) * 8.0 + pow(sd, 40.0) * 0.12 + uWarmK * (pow(sd, 220.0) * 1.1 + pow(sd, 14.0) * 0.26));
          // the cloud buffer is low-res and jittered: a 5-tap tent filter turns the march
          // grain into the soft, airbrushed edge of a painted cloud
          vec2 suv = gl_FragCoord.xy / uResolution;
          vec2 px = 1.2 / vec2(textureSize(uCloudTex, 0));
          vec4 cl = texture2D(uCloudTex, suv) * 0.36
            + (texture2D(uCloudTex, suv + vec2(px.x, px.y)) + texture2D(uCloudTex, suv + vec2(-px.x, px.y))
            + texture2D(uCloudTex, suv + vec2(px.x, -px.y)) + texture2D(uCloudTex, suv + vec2(-px.x, -px.y))) * 0.16;
          col = col * cl.a + cl.rgb;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      side: THREE.BackSide,
      // Drawn last among the opaque objects, pinned to the far plane: only the pixels (and MSAA
      // samples) nothing else covered get shaded, instead of the whole screen.
      depthTest: true,
      depthFunc: THREE.LessEqualDepth,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), this.domeMaterial);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1000;
    this.mesh.matrixAutoUpdate = false;
  }

  setSize(width, height) {
    const w = Math.max(4, Math.round(width * this.scale)), h = Math.max(4, Math.round(height * this.scale));
    for (const t of [this.target, ...this.history]) t.setSize(w, h);
    this.frame = 0; // the history no longer lines up
  }

  /** Render the cloud volume for this frame's camera. Call before the main scene pass. */
  render(renderer, camera, time) {
    const u = this.cloudMaterial.uniforms;
    u.uProjInv.value.copy(camera.projectionMatrixInverse);
    u.uCamWorld.value.copy(camera.matrixWorld);
    u.uCamPos.value.setFromMatrixPosition(camera.matrixWorld);
    // the whole weather system drifts slowly downwind
    u.uDrift.value.set(WIND.dir.x, WIND.dir.y).multiplyScalar(time * 2.5);
    const prev = renderer.getRenderTarget();
    if (!this.weatherBaked) {
      this.quad.material = this.weatherMaterial;
      renderer.setRenderTarget(this.weather);
      this.quad.render(renderer);
      this.quad.material = this.cloudMaterial;
      this.weatherBaked = true;
      this.frame = 0;
    }
    u.uFrame.value = this.frame % 64;
    renderer.setRenderTarget(this.target);
    this.quad.render(renderer);

    const h = this.historyMaterial.uniforms;
    const write = this.history[this.frame & 1], read = this.history[(this.frame + 1) & 1];
    h.uHist.value = read.texture;
    h.uProjInv.value.copy(camera.projectionMatrixInverse);
    h.uCamWorld.value.copy(camera.matrixWorld);
    h.uBlend.value = this.frame === 0 ? 0 : 0.85;
    this.quad.material = this.historyMaterial;
    renderer.setRenderTarget(write);
    this.quad.render(renderer);
    this.quad.material = this.cloudMaterial;
    renderer.setRenderTarget(prev);
    this.domeMaterial.uniforms.uCloudTex.value = write.texture;

    // direction-only view-projection of this frame, for the next frame's reprojection
    this.prevVP.copy(camera.matrixWorld).setPosition(0, 0, 0).invert().premultiply(camera.projectionMatrix);
    this.frame++;
  }
}
