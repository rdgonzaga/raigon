// Stylized rocks: a sphere chiselled by random planes (big clean facets), shaded with a blend of
// faceted and smooth normals, with turf creeping over the up-facing surfaces.

import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { LAYERS, PAL } from '../config.js';
import { mulberry32, perlin3 } from '../core/noise.js';
import { COMMON, GRASS_COLOR, litUniforms, REGION, SHADOW_PARS_FRAGMENT, SHADOW_PARS_VERTEX } from '../core/shaderlib.js';

function buildRock(seed, { cuts = 11, detail = 4, flatTop = 0, smooth = false, blocky = false } = {}) {
  const rng = mulberry32(seed * 2749 + 3);
  let geo = new THREE.IcosahedronGeometry(1, detail);
  geo.deleteAttribute('uv');
  geo.deleteAttribute('normal');
  geo = mergeVertices(geo, 1e-4);
  if (smooth) {
    // plain dome (used for turf caps): keep the sphere so it matches the analytic mound exactly
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    return geo;
  }
  const pos = geo.attributes.position;
  const v = new THREE.Vector3(), n = new THREE.Vector3();
  const planes = [];
  if (blocky) {
    // quarry-block silhouette: five big roughly axis-aligned faces, then a few chips
    for (const [ax, ay, az] of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]]) {
      n.set(ax + (rng() - 0.5) * 0.55, ay + (rng() - 0.5) * 0.22, az + (rng() - 0.5) * 0.55).normalize();
      planes.push([n.clone(), ay ? 0.5 + rng() * 0.08 : 0.56 + rng() * 0.14]);
    }
  }
  for (let i = 0; i < (blocky ? 10 : cuts); i++) {
    n.set(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1).normalize();
    planes.push([n.clone(), (blocky ? 0.6 : 0.5) + rng() * 0.3]);
  }
  if (flatTop) planes.push([new THREE.Vector3(0, 1, 0), flatTop]);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    for (const [pn, d] of planes) {
      const s = v.dot(pn) - d;
      if (s > 0) v.addScaledVector(pn, -s);
    }
    v.multiplyScalar(1 + perlin3(v.x * 1.9 + seed, v.y * 1.9, v.z * 1.9) * 0.07);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

const vertexShader = /* glsl */ `
#include <common>
${COMMON}
${SHADOW_PARS_VERTEX}
attribute vec4 aRock;   // warmth, turf amount, brightness offset, forced shade
varying vec3 vWorld;
varying vec3 vNormalW;
varying vec4 vRock;
void main() {
  #ifdef USE_INSTANCING
    mat4 m = modelMatrix * instanceMatrix;
  #else
    mat4 m = modelMatrix;
  #endif
  vec4 wp = m * vec4(position, 1.0);
  vWorld = wp.xyz;
  vNormalW = normalize(transpose(inverse(mat3(m))) * normal);
  vRock = aRock;
  gl_Position = projectionMatrix * viewMatrix * wp;
  setSunShadowCoord(wp.xyz, vNormalW);
}
`;

const fragmentShader = /* glsl */ `
#include <common>
${COMMON}
${GRASS_COLOR}
${REGION}
${SHADOW_PARS_FRAGMENT}
uniform vec3 uRockLit;
uniform vec3 uRockLitB;
uniform vec3 uRockShd;
uniform vec3 uRockWarm;
varying vec3 vWorld;
varying vec3 vNormalW;
varying vec4 vRock;

void main() {
  vec3 Ns = normalize(vNormalW);
  vec3 Nf = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  vec3 N = normalize(mix(Ns, Nf, 0.85));

  float n = texture2D(uNoiseTex, vWorld.xz * 0.17 + vWorld.y * 0.11).g;
  float n2 = texture2D(uNoiseTex, vWorld.xy * 0.55 + vWorld.z * 0.3).a;
  vec3 lit = mix(uRockLitB, uRockLit, smoothstep(0.3, 0.7, n));
  lit = mix(lit, uRockWarm, vRock.x) * mix(0.93, 1.06, n2) * (1.0 + vRock.z);
  vec3 shd = mix(uRockShd, uRockShd * vec3(1.25, 0.95, 0.82), vRock.x) * (1.0 + vRock.z * 0.5);

  // turf over the top
  float turf = smoothstep(0.74, 0.93, Nf.y + (n - 0.5) * 0.3) * min(vRock.y, 1.0) + sat(vRock.y - 1.0);
  vec3 gLit, gShd;
  grassColors(vWorld.xz, gLit, gShd);
  lit = mix(lit, gLit, turf);
  shd = mix(shd, gShd, turf);

  float light = smoothstep(-0.12, 0.42, dot(N, uSunDir)) * sunShadow(3.0, pixelPhi()) * cloudShade(vWorld.xz) * (1.0 - vRock.w);
  // sky fill in shade
  shd *= 0.86 + 0.24 * sat(N.y * 0.5 + 0.5);
  vec3 col = mix(shd, lit, light);
  // contact shade + wet waterline
  float ground = max(terrainHeightAt(vWorld.xz), 0.0);
  col *= mix(0.62, 1.0, smoothstep(0.0, 0.22, vWorld.y - ground));
  col *= mix(0.7, 1.0, smoothstep(-0.02, 0.07, vWorld.y));
  col = applyFog(col, vWorld, light);
  gl_FragColor = vec4(col, 1.0);
}
`;

const dummy = new THREE.Object3D();

/**
 * @param specs [{x, y, z, sx, sy, sz, yaw, tilt?, seed, warm?, turf?, bright?, flatTop?}]
 */
export function createRocks(specs) {
  const group = new THREE.Group();
  group.name = 'rocks';
  const material = new THREE.ShaderMaterial({
    lights: true,
    uniforms: litUniforms({
      uRockLit: { value: PAL.rockLit },
      uRockLitB: { value: PAL.rockLitB },
      uRockShd: { value: PAL.rockShd },
      uRockWarm: { value: PAL.rockWarm },
    }),
    vertexShader,
    fragmentShader,
  });

  const VARIANTS = 4;
  const buckets = new Map();
  for (const s of specs) {
    const key = s.pebble ? `p${s.seed % 3}` : s.smooth ? 'smooth' : s.flatTop ? `flat${s.seed}` : s.blocky ? `b${s.seed % VARIANTS}` : `r${s.seed % VARIANTS}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(s);
  }
  for (const list of buckets.values()) {
    const first = list[0];
    // pebbles are a few pixels wide: a coarse stone with a handful of facets, and no shadow of their own
    const geo = first.pebble
      ? buildRock(40 + (first.seed % 3), { cuts: 6, detail: 1 })
      : buildRock(first.flatTop ? first.seed : first.seed % VARIANTS, { flatTop: first.flatTop ?? 0, smooth: !!first.smooth, blocky: !!first.blocky });
    const mesh = new THREE.InstancedMesh(geo, material, list.length);
    const attr = new Float32Array(list.length * 4);
    list.forEach((s, i) => {
      dummy.position.set(s.x, s.y, s.z);
      dummy.rotation.set(s.tilt ?? 0, s.yaw ?? 0, (s.tilt ?? 0) * 0.6);
      dummy.scale.set(s.sx, s.sy, s.sz);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      attr.set([s.warm ?? 0, s.turf ?? 0, s.bright ?? 0, s.shade ?? 0], i * 4);
    });
    geo.setAttribute('aRock', new THREE.InstancedBufferAttribute(attr, 4));
    if (!first.pebble) {
      mesh.castShadow = true;
      mesh.layers.enable(LAYERS.shadowCasters);
    }
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    group.add(mesh);
  }
  return group;
}
