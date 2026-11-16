// Terrain mesh + painterly ground shader: a turf floor and bare soil, height-blended through the
// tuft field so their border breaks into islands, with dabs of drifting colour, clay, wet sand
// at the waterline and a sandy stream bed.

import * as THREE from 'three';
import { PAL } from '../config.js';
import { COMMON, GRASS_COLOR, litUniforms, REGION, SHADOW_PARS_FRAGMENT, SHADOW_PARS_VERTEX } from '../core/shaderlib.js';
import { terrainHeight } from './heightfield.js';
import { ENV } from '../env.js';

export function createTerrain() {
  // One continuous grid, warped so vertices are densest around the stream and thin out
  // towards the horizon (no LOD seams, ~20 cm resolution at the ford, where the sand bars are).
  const N = 400, R = 460, CX = -0.6, CZ = -7.2;
  const a = 0.09, p = 3.3;
  const warp = (u) => Math.sign(u) * (a * Math.abs(u) + (1 - a) * Math.pow(Math.abs(u), p));

  const side = N + 1;
  const pos = new Float32Array(side * side * 3);
  for (let j = 0; j < side; j++) {
    const z = CZ + R * warp((j / N) * 2 - 1);
    for (let i = 0; i < side; i++) {
      const x = CX + R * warp((i / N) * 2 - 1);
      const k = (j * side + i) * 3;
      pos[k] = x;
      pos[k + 1] = terrainHeight(x, z);
      pos[k + 2] = z;
    }
  }

  // normals from the grid itself (central differences)
  const nrm = new Float32Array(side * side * 3);
  const at = (i, j) => (Math.min(N, Math.max(0, j)) * side + Math.min(N, Math.max(0, i))) * 3;
  for (let j = 0; j < side; j++) {
    for (let i = 0; i < side; i++) {
      const l = at(i - 1, j), r = at(i + 1, j), d = at(i, j - 1), u = at(i, j + 1);
      const tx = pos[r] - pos[l], ty = pos[r + 1] - pos[l + 1], tz = pos[r + 2] - pos[l + 2];
      const bx = pos[u] - pos[d], by = pos[u + 1] - pos[d + 1], bz = pos[u + 2] - pos[d + 2];
      // n = b x t
      let nx = by * tz - bz * ty, ny = bz * tx - bx * tz, nz = bx * ty - by * tx;
      const len = Math.hypot(nx, ny, nz) || 1;
      const k = (j * side + i) * 3;
      nrm[k] = nx / len; nrm[k + 1] = ny / len; nrm[k + 2] = nz / len;
    }
  }

  const idx = new Uint32Array(N * N * 6);
  let q = 0;
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const v0 = j * side + i, v1 = v0 + 1, v2 = v0 + side, v3 = v2 + 1;
      idx[q++] = v0; idx[q++] = v2; idx[q++] = v1;
      idx[q++] = v1; idx[q++] = v2; idx[q++] = v3;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeBoundingSphere();

  const material = new THREE.ShaderMaterial({
    lights: true,
    uniforms: litUniforms({
      uDirtLit: { value: PAL.dirtLit },
      uDirtLitB: { value: PAL.dirtLitB },
      uDirtSand: { value: PAL.dirtSand },
      uDirtShd: { value: PAL.dirtShd },
      uPaleLit: { value: PAL.paleLit },
      uPaleLitB: { value: PAL.paleLitB },
      uPaleShd: { value: PAL.paleShd },
      uBed: { value: PAL.bed },
      uStoneLit: { value: PAL.stoneLit },
      uStoneShd: { value: PAL.stoneShd },
      uStoneK: { value: ENV.id === 'base' ? 0 : 1 },
    }),
    vertexShader: /* glsl */ `
      #include <common>
      ${COMMON}
      ${SHADOW_PARS_VERTEX}
      varying vec3 vWorld;
      varying vec3 vNormalW;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
        setSunShadowCoord(wp.xyz, vNormalW);
      }
    `,
    fragmentShader: /* glsl */ `
      #include <common>
      ${COMMON}
      ${GRASS_COLOR}
      ${REGION}
      ${SHADOW_PARS_FRAGMENT}
      uniform vec3 uDirtLit;
      uniform vec3 uDirtLitB;
      uniform vec3 uDirtSand;
      uniform vec3 uDirtShd;
      uniform vec3 uPaleLit;
      uniform vec3 uPaleLitB;
      uniform vec3 uPaleShd;
      uniform vec3 uBed;
      uniform vec3 uStoneLit;
      uniform vec3 uStoneShd;
      uniform float uStoneK;
      varying vec3 vWorld;
      varying vec3 vNormalW;

      void main() {
        vec2 xz = vWorld.xz;
        vec2 ruv = regionUv(xz);
        float inside = step(0.0, min(min(ruv.x, ruv.y), min(1.0 - ruv.x, 1.0 - ruv.y)));
        vec4 splat = texture2D(uSplatTex, ruv) * inside;   // bare, pale clay, contact shadow, shore
        vec4 dA = detailA(xz), dB = detailB(xz);
        float nearK = 1.0 - smoothstep(3.5, 10.0, distance(vWorld, cameraPosition));

        // --- how bare: tufts decide inside the authored band, with part of it left as a soft
        // wash (thin grass over soil reads as olive, the commonest tone on the reference banks)
        float bare = bareGround(splat.r, tuftField(dA, dB));
        float dirt = mix(bare, smoothstep(0.05, 0.95, splat.r), 0.45);

        // --- turf floor: the colour field the blades use, darker in the gaps between tufts
        vec3 gLit, gShd;
        grassColors(xz, dA, dB, gLit, gShd);
        float tuft = smoothstep(0.15, 0.85, dA.r);
        gLit *= mix(0.94, mix(0.84, 0.98, tuft), nearK);
        gShd *= mix(0.9, mix(0.84, 0.94, tuft), nearK);

        // --- soil: two earths and a lighter sand in flat dabs, sandier towards the water
        float dabs = dB.g * 0.6 + dA.b * 0.4;
        vec3 dLit = mix(uDirtLitB, uDirtLit, smoothstep(0.25, 0.75, dabs));
        dLit = mix(dLit, uDirtSand, smoothstep(0.5, 0.9, dB.b) * (0.3 + 0.55 * splat.a));
        dLit *= mix(0.93, 1.06, dA.a);
        vec3 dShd = uDirtShd * mix(0.86, 1.12, dabs);
        // pale clay: the dabs draw its outline, and it is mottled inside
        float pale = smoothstep(0.0, 0.14, splat.g * 0.8 - (dA.g * 0.7 + dB.b * 0.3) * 0.9);
        dLit = mix(dLit, mix(uPaleLit, uPaleLitB, smoothstep(0.15, 0.85, dA.g) * 0.85) * mix(0.94, 1.05, dA.b) * mix(0.97, 1.03, dA.a), pale);
        dShd = mix(dShd, uPaleShd, pale);
        // specks: twigs and small stones
        float twig = smoothstep(0.955, 0.975, dA.a), stone = 1.0 - smoothstep(0.02, 0.035, dA.a);
        dLit = dLit * (1.0 - 0.36 * twig) + vec3(0.06) * stone;
        dShd *= 1.0 - 0.3 * twig;
        // flagstones laid along the paths (ours: the original paths are bare earth). Irregular
        // slabs from a jittered cell pattern, earth in the joints, a few slabs missing.
        float onPath = smoothstep(0.5, 0.8, splat.r) * (1.0 - smoothstep(0.2, 0.55, splat.a)) * uStoneK;
        if (onPath > 0.01) {
          vec2 sp = xz * 1.7;
          vec2 ci = floor(sp), cf = fract(sp);
          float f1 = 9.0, f2 = 9.0;
          vec2 cell = vec2(0.0);
          for (int j = -1; j <= 1; j++) {
            for (int i = -1; i <= 1; i++) {
              vec2 g = vec2(float(i), float(j));
              vec2 c = ci + g;
              vec2 o = vec2(hash11(c.x + c.y * 57.0), hash11(c.x * 113.0 + c.y * 7.0)) * 0.7 + 0.15;
              float dd = length(g + o - cf);
              if (dd < f1) { f2 = f1; f1 = dd; cell = c; } else if (dd < f2) { f2 = dd; }
            }
          }
          float rs = hash11(cell.x * 31.0 + cell.y * 17.0);
          float stone = smoothstep(0.07, 0.15, f2 - f1) * step(0.14, rs) * onPath;
          dLit = mix(dLit, mix(dLit, uStoneLit, 0.5) * mix(0.84, 1.0, rs) * mix(0.95, 1.04, dA.a), stone); // close to the soil in value: paving, not white tiles
          dShd = mix(dShd, uStoneShd * mix(0.9, 1.1, rs), stone);
        }
        // wet sand along the waterline
        float y = vWorld.y - shoreWobble(xz);   // height above the water as the water shader sees it
        float wet = 1.0 - smoothstep(0.008, 0.07, y);
        dLit = mix(dLit, dLit * vec3(0.74, 0.69, 0.62), wet);

        vec3 lit = mix(gLit, dLit, dirt);
        vec3 shd = mix(gShd, dShd, dirt);

        // --- submerged bed: pale sand in the shallows, sinking into the stream's own colour
        lit = mix(lit, uDirtSand * 0.92, smoothstep(0.0, 0.07, -y));
        float depth = smoothstep(0.03, 0.42, -y);
        lit = mix(lit, uBed, depth);
        shd = mix(shd, uBed * 0.62, depth);

        // --- relief: dabs, grain and tufts act as a height field; faces towards the sun lift
        vec4 dS = detailA(xz + uSunDir.xz * 0.035);
        float relief = ((dA.g - dS.g) * 0.4 + (dA.a - dS.a) * 0.3) * dirt + (dA.r - dS.r) * 0.5 * (1.0 - dirt) * nearK;

        float ndl = sat(dot(normalize(vNormalW), uSunDir));
        float light = sunShadow(3.5, pixelPhi()) * smoothstep(-0.05, 0.42, ndl) * cloudShade(xz);
        light *= 1.0 - splat.b * 0.55;
        shd *= 1.0 - splat.b * 0.3;   // shade deepens under trunks, bushes and rocks

        vec3 col = mix(shd, lit * (1.0 + relief * 0.45), light);
        col = applyFog(col, vWorld, light);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  // Drawn after the grass, rocks and trees that stand on it: wherever they already cover the
  // ground, the depth test rejects the terrain's (now fairly rich) shading before it runs.
  mesh.renderOrder = 800;
  mesh.name = 'terrain';
  return mesh;
}
