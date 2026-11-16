// Wind VFX: the thin white "wind lines" that curl and loop just above the ground, and leaves
// tumbling downwind with the gusts. Both are fully GPU-animated; the CPU only respawns streaks.

import * as THREE from 'three';
import { HERO, PAL } from '../config.js';
import { mulberry32 } from '../core/noise.js';
import { COMMON, G, REGION } from '../core/shaderlib.js';
import { makeLeafParticleTexture } from '../core/textures.js';
import { groundHeight, streamSD } from './heightfield.js';

// ---------------------------------------------------------------------------------------------
// Wind streaks
// ---------------------------------------------------------------------------------------------
const SEGMENTS = 48;

class WindStreaks {
  constructor(count = 9) {
    this.count = count;
    this.rng = mulberry32(606);
    const pos = [], idx = [];
    for (let i = 0; i <= SEGMENTS; i++) {
      const t = i / SEGMENTS;
      pos.push(t, -1, 0, t, 1, 0);
    }
    for (let i = 0; i < SEGMENTS; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    this.origin = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
    this.seed = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
    this.timing = new THREE.InstancedBufferAttribute(new Float32Array(count * 2), 2);
    for (const a of [this.origin, this.seed, this.timing]) a.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aOrigin', this.origin);
    geo.setAttribute('aSeed', this.seed);
    geo.setAttribute('aTiming', this.timing);
    geo.instanceCount = count;

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        ...G,
        uColor: { value: PAL.windStreak },
        uLength: { value: 3.2 },
        uTravel: { value: 13.0 },
        uWidth: { value: 0.012 },
        uOpacity: { value: 0.5 },
      },
      vertexShader: /* glsl */ `
        ${COMMON}
        uniform float uLength;
        uniform float uTravel;
        uniform float uWidth;
        uniform vec2 uResolution;
        attribute vec3 aOrigin;
        attribute vec4 aSeed;
        attribute vec2 aTiming;   // start time, duration
        varying float vAlpha;
        varying float vAcross;

        // The streak's path: drifts downwind, meanders, and ties one loop-the-loop.
        vec3 pathAt(float s) {
          vec3 w = vec3(uWindDir.x, 0.0, uWindDir.y);
          vec3 side = vec3(-w.z, 0.0, w.x);
          vec3 p = aOrigin + w * s;
          p += side * (sin(s * 0.33 + aSeed.x * 6.2831) * 0.7 + sin(s * 0.13 + aSeed.y * 6.2831) * 1.1);
          p.y += sin(s * 0.45 + aSeed.y * 6.2831) * 0.2 + s * 0.035 * (aSeed.z - 0.3);
          float R = 0.22 + aSeed.w * 0.3;
          float u = clamp((s - (3.0 + aSeed.z * 5.0)) / (R * 3.4), 0.0, 1.0);
          float ang = u * 6.2831853;
          vec3 n = normalize(vec3(0.0, 1.0, 0.0) + side * ((aSeed.x - 0.5) * 1.4));
          return p + R * (sin(ang) * w + (1.0 - cos(ang)) * n);
        }

        void main() {
          float t = position.x;
          float life = clamp((uTime - aTiming.x) / aTiming.y, 0.0, 1.0);
          float head = life * (uTravel + uLength);
          float s = head - (1.0 - t) * uLength;
          vec3 p = pathAt(s);
          vec3 tangent = normalize(pathAt(s + 0.08) - p);
          vec3 across = normalize(cross(tangent, normalize(cameraPosition - p)));
          float taper = pow(max(sin(t * 3.14159265), 0.0), 0.6);
          float pixel = distance(cameraPosition, p) * 2.0 / (projectionMatrix[1][1] * uResolution.y);
          float halfWidth = max(uWidth * (0.7 + aSeed.w * 0.6), pixel * 0.8) * taper;
          p += across * (position.y * halfWidth);
          // draw on from the origin, wipe off at the end of the run
          vAlpha = taper * smoothstep(0.0, 0.1, life) * (1.0 - smoothstep(0.82, 1.0, life)) * step(0.0, s) * step(s, uTravel);
          vAcross = position.y;
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vAlpha;
        varying float vAcross;
        void main() {
          float a = vAlpha * (1.0 - vAcross * vAcross) * uOpacity;
          if (a < 0.004) discard;
          gl_FragColor = vec4(uColor, a);
        }
      `,
    });

    this.mesh = new THREE.Mesh(geo, material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 20;
    this.mesh.name = 'windStreaks';
    this.ends = new Float32Array(count);
    this.started = false;
  }

  spawn(i, now, delay = this.rng() * 2.6) {
    const R = () => this.rng();
    // start upwind of a random spot in front of the hero camera so the streak crosses the frame
    let x = 0, z = 0;
    for (let k = 0; k < 8; k++) {
      const depth = 7.5 + R() * R() * 24;
      x = HERO.position.x + (R() * 2 - 1) * depth * 0.95 - G.uWindDir.value.x * 6;
      z = HERO.position.z - depth - G.uWindDir.value.y * 6;
      if (streamSD(x, z) > -0.3 || R() < 0.5) break;
    }
    const y = Math.max(groundHeight(x, z), 0) + 0.3 + R() * 0.9;
    this.origin.setXYZ(i, x, y, z);
    this.seed.setXYZW(i, R(), R(), R(), R());
    const duration = 3.0 + R() * 1.6;
    const start = now + delay;
    this.timing.setXY(i, start, duration);
    this.ends[i] = start + duration;
    this.origin.needsUpdate = this.seed.needsUpdate = this.timing.needsUpdate = true;
  }

  update(time) {
    if (!this.started) {
      // stagger the first generation so some streaks are already mid-flight
      for (let i = 0; i < this.count; i++) this.spawn(i, time - this.rng() * 3.6, 0);
      this.started = true;
    }
    for (let i = 0; i < this.count; i++) if (time > this.ends[i]) this.spawn(i, time);
  }
}

// ---------------------------------------------------------------------------------------------
// Flying leaves
// ---------------------------------------------------------------------------------------------
function createLeaves(count = 440) {
  const rng = mulberry32(909);
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < seeds.length; i++) seeds[i] = rng();
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));
  geo.instanceCount = count;

  const material = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    alphaToCoverage: true,
    uniforms: {
      ...G,
      uLeafTex: { value: makeLeafParticleTexture(64) },
      uLeafA: { value: PAL.leafFx },
      uLeafB: { value: PAL.leafFxB },
      uVolMin: { value: new THREE.Vector3(-24, 0, -32) },
      uVolSize: { value: new THREE.Vector3(46, 1, 34) },
    },
    vertexShader: /* glsl */ `
      ${COMMON}
      ${REGION}
      uniform vec3 uVolMin;
      uniform vec3 uVolSize;
      attribute vec4 aSeed;
      varying vec2 vUv;
      varying vec3 vWorld;
      varying vec3 vShade;   // random, light, fade

      void main() {
        float rnd = aSeed.w;
        float ph = rnd * 40.0;
        vec2 w = uWindDir;
        // advect downwind, wrapping inside the volume
        vec2 xz = uVolMin.xz + aSeed.xz * uVolSize.xz + w * (uTime * (2.4 + rnd * 2.6));
        vec2 f = fract((xz - uVolMin.xz) / uVolSize.xz);
        xz = uVolMin.xz + f * uVolSize.xz;
        xz += vec2(sin(uTime * 1.3 + ph), cos(uTime * 1.1 + ph * 1.3)) * 0.4;

        float gust = windGust(xz);
        // most leaves skim the grass, a few get lifted higher by the gusts
        float hover = 0.12 + aSeed.y * aSeed.y * 2.0;
        float y = max(terrainHeightAt(xz), 0.0) + hover + sin(uTime * 2.1 + ph) * 0.16 + gust * aSeed.y * 0.6;
        vec3 c = vec3(xz.x, y, xz.y);

        // tumble about the leaf's long axis
        vec3 axis = normalize(vec3(sin(ph), 0.35, cos(ph)));
        vec3 u0 = normalize(cross(axis, vec3(0.0, 1.0, 0.0)));
        vec3 v0 = cross(axis, u0);
        float ang = uTime * (2.5 + rnd * 4.5) + ph;
        vec3 b = u0 * cos(ang) + v0 * sin(ang);
        float size = 0.028 + rnd * 0.03;
        vec3 p = c + (position.x * axis * 1.5 + position.y * b * 0.75) * size;

        vec3 n = normalize(cross(axis, b));
        float light = 0.45 + 0.55 * abs(dot(n, uSunDir));
        // fade at the wrap seam, and thin the swarm out when the air is calm
        float seam = smoothstep(0.0, 0.06, f.x) * smoothstep(1.0, 0.94, f.x) * smoothstep(0.0, 0.06, f.y) * smoothstep(1.0, 0.94, f.y);
        float fade = seam * smoothstep(0.0, 0.3, gust + rnd * 0.7);

        vUv = position.xy * 0.5 + 0.5;
        vWorld = p;
        vShade = vec3(rnd, light, fade);
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform sampler2D uLeafTex;
      uniform vec3 uLeafA;
      uniform vec3 uLeafB;
      varying vec2 vUv;
      varying vec3 vWorld;
      varying vec3 vShade;
      void main() {
        vec4 tex = texture2D(uLeafTex, vUv);
        float alpha = sat((tex.a - 0.5) / max(fwidth(tex.a), 0.0001) + 0.5) * vShade.z;
        if (alpha < 0.03) discard;
        vec3 col = mix(uLeafA, uLeafB, step(0.72, vShade.x)) * (tex.r / max(tex.a, 0.05)) * vShade.y;
        col = applyFog(col, vWorld, vShade.y);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  mesh.name = 'windLeaves';
  return mesh;
}

export function createWindFX() {
  const group = new THREE.Group();
  group.name = 'windFX';
  const streaks = new WindStreaks(9);
  group.add(streaks.mesh, createLeaves(440));
  return { group, update: (time) => streaks.update(time) };
}
