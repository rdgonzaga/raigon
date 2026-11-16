// Stylized stream: milky sky reflection, depth-tinted body, wind-driven ripples, shoreline foam.
// Depth comes from the baked terrain height map, so no extra depth pre-pass is needed.

import * as THREE from 'three';
import { PAL } from '../config.js';
import { COMMON, litUniforms, REGION, SHADOW_PARS_FRAGMENT, SHADOW_PARS_VERTEX } from '../core/shaderlib.js';
import { STREAM_TIP, WATER_LEVEL } from './heightfield.js';
import { ENV } from '../env.js';

export function createWater() {
  const lake = !!ENV.lakeSD;
  const x0 = lake ? -1600 : -125, x1 = lake ? 1600 : STREAM_TIP.x + 4, z0 = lake ? -1600 : -30, z1 = -1;
  const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0, 1, 1);
  geo.rotateX(-Math.PI / 2);
  geo.translate((x0 + x1) / 2, WATER_LEVEL, (z0 + z1) / 2);

  const material = new THREE.ShaderMaterial({
    lights: true,
    transparent: true,
    depthWrite: false,
    uniforms: litUniforms({
      uShallow: { value: PAL.waterShallow },
      uDeep: { value: PAL.waterDeep },
      uSkyTint: { value: PAL.waterSky },
      uFoam: { value: PAL.waterFoam },
      uWaterLevel: { value: WATER_LEVEL },
      uRefl: { value: PAL.waterRefl },
      uReflK: { value: ENV.reflect ?? 0 },
      uBodyK: { value: ENV.body ?? 0 },
    }),
    vertexShader: /* glsl */ `
      #include <common>
      ${COMMON}
      ${SHADOW_PARS_VERTEX}
      varying vec3 vWorld;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
        setSunShadowCoord(wp.xyz, vec3(0.0, 1.0, 0.0));
      }
    `,
    fragmentShader: /* glsl */ `
      #include <common>
      ${COMMON}
      ${REGION}
      ${SHADOW_PARS_FRAGMENT}
      uniform vec3 uShallow;
      uniform vec3 uDeep;
      uniform vec3 uSkyTint;
      uniform vec3 uFoam;
      uniform float uWaterLevel;
      uniform vec3 uRefl;
      uniform float uReflK;
      uniform float uBodyK;
      varying vec3 vWorld;

      void main() {
        vec2 xz = vWorld.xz;
        float depth = uWaterLevel - terrainHeightAt(xz) + shoreWobble(xz);
        if (depth < -0.02) discard;

        vec3 V = normalize(cameraPosition - vWorld);
        vec2 flow = uWindDir * uTime;
        float gust = windGust(xz);

        // two scrolling noise layers -> ripple slope
        vec2 n1 = texture2D(uNoiseTex, xz * 0.19 + flow * 0.021).rg - 0.5;
        vec2 n2 = texture2D(uNoiseTex, xz * 0.47 - flow * 0.034 + 0.31).ga - 0.5;
        vec2 slope = (n1 * 0.6 + n2 * 0.4) * (0.09 + 0.12 * gust);
        vec3 N = normalize(vec3(slope.x, 1.0, slope.y));

        float fres = pow(1.0 - sat(dot(N, V)), 4.0);
        vec3 R = reflect(-V, N);
        R.y = abs(R.y);
        vec3 refl = mix(skyGradient(R), uSkyTint, 0.6 - 0.35 * uWarmK);
        // the far shore and the mountains mirrored in a lake, and the path of the sun on the water
        float sunward = pow(max(dot(normalize(vec3(R.x, 0.0, R.z)), normalize(vec3(uSunView.x, 0.0, uSunView.z))), 0.0), 6.0);
        refl = mix(refl, uRefl, uReflK * smoothstep(0.24, 0.05, R.y) * (1.0 - 0.75 * sunward * uWarmK));
        refl += uSunGlow * uWarmK * (pow(max(dot(R, uSunView), 0.0), 260.0) * 2.2 + sunward * smoothstep(0.3, 0.02, R.y) * 0.22);

        // broad soft highlights sliding downwind (the pale streaks on the reference water)
        float streak = texture2D(uNoiseTex, vec2(xz.x * 0.045, xz.y * 0.21) + flow * vec2(0.012, 0.004)).r;
        refl += vec3(0.085) * smoothstep(0.52, 0.8, streak) * (0.6 + 0.4 * gust);

        // sun glints: sparse sparkles that shimmer along the sun's path on the water
        float sparkle = texture2D(uNoiseTex, xz * 2.3 + flow * 0.09).b * texture2D(uNoiseTex, xz * 3.7 - flow * 0.07 + 0.53).r;
        float sunPath = pow(max(dot(R, uSunView), 0.0), 70.0);
        refl += uSunGlow * smoothstep(0.42, 0.56, sparkle) * sunPath * (1.0 + 0.8 * uWarmK);

        vec3 body = mix(uShallow, uDeep, smoothstep(0.0, 0.45, depth));
        vec3 col = mix(body, refl, (0.3 + 0.65 * fres) * (1.0 - uBodyK * (1.0 - fres * fres)));

        // lapping foam line at the shore
        float foamN = texture2D(uNoiseTex, xz * 1.1 + flow * 0.05).a;
        float lap = sin(uTime * 0.9 + foamN * 6.0) * 0.012;
        float foam = 1.0 - smoothstep(0.0, 0.06 + foamN * 0.05 + lap, depth);
        col = mix(col, uFoam, foam * 0.5);

        float sh = sunShadow(3.0, pixelPhi());
        col *= mix(vec3(0.5, 0.6, 0.68), vec3(1.0), sh);

        col = applyFog(col, vWorld, sh);
        // the bed shows through the shallows (sand bars, the sloping beach), less so at a glancing angle
        float clear = (1.0 - smoothstep(0.02, 0.3, depth)) * (1.0 - fres * 0.6);
        float alpha = smoothstep(-0.012, 0.012, depth) * max(mix(0.96, 0.5, clear), foam * 0.7);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });

  const mesh = new THREE.Mesh(geo, material);
  mesh.renderOrder = 10;
  mesh.frustumCulled = false;
  mesh.name = 'water';
  return mesh;
}
