// Shared uniforms + GLSL building blocks.
// Every material in the scene pulls its sky colours, fog, wind field and sun shadows from here,
// which is what keeps the whole picture coherent (same haze on a tree and on the hill behind it,
// same gust bending the grass and shaking the canopy above it).

import * as THREE from 'three';
import { FOG, GROUND, PAL, pickQuality, SUN, SUN_VIEW, WIND } from '../config.js';
import { REGRADE } from '../env.js';

/** Uniform objects are shared by reference between all materials. */
export const G = {
  uTime: { value: 0 },
  uSunDir: { value: SUN.dir.clone() },
  uSunView: { value: SUN_VIEW },
  uSunWarm: { value: PAL.sunWarm },
  uWarmK: { value: REGRADE ? 1 : 0 },
  uWindDir: { value: WIND.dir.clone() },
  uWindStrength: { value: WIND.strength },
  uWindSpeed: { value: WIND.speed },
  uNoiseTex: { value: null },
  uHeightTex: { value: null },
  uSplatTex: { value: null },
  uDetailTex: { value: null },
  uGroundDrift: { value: 1 },
  uRegion: { value: new THREE.Vector4(0, 0, 1, 1) }, // minX, minZ, 1/size, 1/size
  uResolution: { value: new THREE.Vector2(1, 1) },

  uSky0: { value: PAL.sky0 },
  uSky1: { value: PAL.sky1 },
  uSky2: { value: PAL.sky2 },
  uSky3: { value: PAL.sky3 },
  uSky4: { value: PAL.sky4 },
  uSunGlow: { value: PAL.sunGlow },

  uFogNear: { value: PAL.fogNear },
  uFogFar: { value: PAL.fogFar },
  uFogLit: { value: PAL.fogLit },
  uFogDensity: { value: FOG.density },
  uFogMax: { value: FOG.max },

  uGrassLitNear: { value: PAL.grassLitNear },
  uGrassShdNear: { value: PAL.grassShdNear },
  uGrassLitMid: { value: PAL.grassLitMid },
  uGrassLitA: { value: PAL.grassLitA },
  uGrassLitB: { value: PAL.grassLitB },
  uGrassShdFar: { value: PAL.grassShdFar },
};

/** Uniform block for a material that samples the sun shadow map (needs `lights: true`). */
export function litUniforms(extra = {}) {
  return { ...THREE.UniformsUtils.clone(THREE.UniformsLib.lights), ...G, ...extra };
}

export const COMMON = /* glsl */ `
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uSunView;
uniform vec3 uSunWarm;
uniform float uWarmK;
uniform vec2 uWindDir;
uniform float uWindStrength;
uniform float uWindSpeed;
uniform sampler2D uNoiseTex;
uniform vec3 uSky0;
uniform vec3 uSky1;
uniform vec3 uSky2;
uniform vec3 uSky3;
uniform vec3 uSky4;
uniform vec3 uSunGlow;
uniform vec3 uFogNear;
uniform vec3 uFogFar;
uniform vec3 uFogLit;
uniform float uFogDensity;
uniform float uFogMax;

float sat(float x) { return clamp(x, 0.0, 1.0); }
float hash11(float n) { return fract(sin(n * 127.1) * 43758.5453123); }
vec2 rot2(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }

// Five-stop sky gradient keyed on sin(elevation), fitted to the reference frame.
vec3 skyGradient(vec3 dir) {
  float e = clamp(dir.y, 0.0, 1.0);
  vec3 c = mix(uSky0, uSky1, smoothstep(0.02, 0.20, e));
  c = mix(c, uSky2, smoothstep(0.16, 0.31, e));
  c = mix(c, uSky3, smoothstep(0.29, 0.45, e));
  c = mix(c, uSky4, smoothstep(0.42, 0.72, e));
  // the sky deepens away from the sun (darker, richer blue towards the right of the hero frame)
  c *= mix(0.84, 1.04, smoothstep(-0.5, 0.35, dot(dir, uSunDir)));
  // sunrise / sunset: the horizon glows around the sun
  float sv = max(dot(normalize(dir), uSunView), 0.0);
  c = mix(c, uSunWarm, uWarmK * pow(sv, 3.0) * 0.8 * (1.0 - smoothstep(0.04, 0.6, e)));
  return c;
}

// Aerial perspective. Shaded air scatters cool sky light (the deep teal between the trunks),
// sunlit air scatters warm light, and everything pales out towards the horizon. "light" is the
// surface's own sun term, a cheap stand-in for shadowed volumetric fog.
vec3 applyFog(vec3 col, vec3 worldPos, float light) {
  float d = distance(worldPos, cameraPosition);
  float amount = (1.0 - exp(-pow(max(d - 16.0, 0.0) * uFogDensity, 1.25))) * uFogMax;
  // haze reads strongly against shade and barely at all against sunlit surfaces
  amount *= mix(1.0, 0.45, light);
  vec3 near = mix(uFogNear, uFogLit, light * 0.75);
  vec3 fogCol = mix(near, uFogFar, smoothstep(40.0, 300.0, d));
  fogCol = mix(fogCol, uSunWarm, uWarmK * 0.4 * pow(max(dot((worldPos - cameraPosition) / max(d, 0.001), uSunView), 0.0), 4.0));
  return mix(col, fogCol, amount);
}
vec3 applyFog(vec3 col, vec3 worldPos) { return applyFog(col, worldPos, 0.0); }

// Soft cloud shadows drifting over the far hills (the clearing itself stays in the sun).
float cloudShade(vec2 xz) {
  float n = texture2D(uNoiseTex, (xz - uWindDir * (uTime * 1.6)) * 0.0042 + vec2(0.13, 0.57)).r;
  float far = smoothstep(26.0, 60.0, length(xz - vec2(0.0, -6.0)));
  return 1.0 - smoothstep(0.4, 0.62, n) * far * 0.8;
}

// Travelling gust fronts shared by grass, foliage, water and particles (0 = calm, 1 = full gust).
float windGust(vec2 p) {
  vec2 q = p - uWindDir * (uTime * uWindSpeed);
  float a = texture2D(uNoiseTex, q * 0.0125).r;
  float b = texture2D(uNoiseTex, q * 0.041 + vec2(0.37, 0.11)).g;
  return smoothstep(0.34, 0.76, a * 0.66 + b * 0.34);
}
`;

// Meadow colour field and ground "paint": shared by the terrain and by every grass blade so the
// blades melt into the ground they grow from (the classic "painted carpet" grass look).
export const GRASS_COLOR = /* glsl */ `
uniform vec3 uGrassLitNear;
uniform vec3 uGrassShdNear;
uniform vec3 uGrassLitMid;
uniform vec3 uGrassLitA;
uniform vec3 uGrassLitB;
uniform vec3 uGrassShdFar;
uniform sampler2D uDetailTex;   // R: tufts  G: large dabs  B: small dabs  A: grain (all equalised)
uniform float uGroundDrift;

// The detail texture is read at two scales that never line up.
vec4 detailA(vec2 xz) { return texture2D(uDetailTex, xz * ${(1 / GROUND.tileA).toFixed(6)}); }
vec4 detailB(vec2 xz) {
  return texture2D(uDetailTex, vec2(xz.x * 0.8 - xz.y * 0.6, xz.x * 0.6 + xz.y * 0.8) * ${(1 / GROUND.tileB).toFixed(6)} + vec2(0.37, 0.61));
}

// One soft peak per grass tuft (mirrored by tuftField() in world/heightfield.js).
float tuftField(vec4 dA, vec4 dB) { return dA.r * 0.75 + dB.r * 0.25; }

// Height blend between turf and soil: inside the authored transition band the tufts decide what
// stays green (mirrored by bareGround() in world/heightfield.js).
float bareGround(float weight, float tuft) { return smoothstep(-0.08, 0.16, weight * 1.08 - tuft); }

void grassColors(vec2 p, vec4 dA, vec4 dB, out vec3 lit, out vec3 shd) {
  float n1 = texture2D(uNoiseTex, p * 0.0061).r;
  float n2 = texture2D(uNoiseTex, p * 0.027 + vec2(0.31, 0.77)).g;
  float n3 = texture2D(uNoiseTex, vec2(p.x * 0.09, p.y * 0.031) + 0.5).a;
  float t = smoothstep(0.3, 0.7, sat(n1 * 0.5 + n2 * 0.38 + n3 * 0.25 - 0.07));
  // Three measured stops going away from the camera: the camera-side bank is lush and saturated,
  // the lawn around the ford is a yellower green, the far meadow is paler and softer.
  float far = smoothstep(-4.6, -8.8, p.y);
  lit = mix(uGrassLitNear, uGrassLitMid, smoothstep(-3.2, -7.4, p.y)) * mix(0.86, 1.1, t);
  lit = mix(lit, mix(uGrassLitA, uGrassLitB, t), smoothstep(-7.6, -14.0, p.y));
  shd = mix(uGrassShdNear * mix(0.85, 1.2, t), uGrassShdFar * mix(0.86, 1.14, t), far);
  // Hue drift in flat dabs, towards the three families the reference meadow wanders between:
  // sun-bleached and yellower, lush and darker, fresh and pale.
  float warm = smoothstep(0.62, 0.92, dB.g * 0.65 + dA.g * 0.35) * uGroundDrift;
  float deep = smoothstep(0.60, 0.90, dB.b * 0.6 + (1.0 - dB.g) * 0.4) * uGroundDrift;
  float pale = smoothstep(0.80, 0.98, dA.g * 0.5 + dB.b * 0.5) * uGroundDrift;
  // ...and in value, in smaller dabs: brush marks, which the grazing view stretches into streaks
  float mark = dB.b * 0.6 + dA.b * 0.4;
  lit *= mix(0.91, 1.10, mark);
  shd *= mix(0.93, 1.08, mark);
  lit *= mix(vec3(1.0), vec3(1.15, 0.93, 0.98), warm);
  lit *= mix(vec3(1.0), vec3(0.76, 0.84, 1.05), deep);
  lit *= mix(vec3(1.0), vec3(1.10, 1.10, 1.34), pale);
  shd *= mix(vec3(1.0), vec3(1.20, 1.02, 0.88), warm * 0.8);
  shd *= mix(vec3(1.0), vec3(0.78, 0.88, 1.02), deep * 0.8);
}
void grassColors(vec2 p, out vec3 lit, out vec3 shd) { grassColors(p, detailA(p), detailB(p), lit, shd); }
`;

export const REGION = /* glsl */ `
uniform sampler2D uHeightTex;
uniform sampler2D uSplatTex;
uniform vec4 uRegion;
vec2 regionUv(vec2 xz) { return (xz - uRegion.xy) * uRegion.zw; }
float terrainHeightAt(vec2 xz) { return texture2D(uHeightTex, regionUv(xz)).r; }
// The waterline wanders by a hand's width. The terrain and the water both apply it, so they agree.
float shoreWobble(vec2 xz) {
  return (texture2D(uNoiseTex, xz * 0.21).g - 0.5) * 0.034 + (texture2D(uNoiseTex, xz * 0.67 + 0.4).a - 0.5) * 0.012;
}
`;

export const SHADOW_PARS_VERTEX = /* glsl */ `
#include <shadowmap_pars_vertex>
void setSunShadowCoord(vec3 worldPos, vec3 worldNormal) {
  #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
    vDirectionalShadowCoord[ 0 ] = directionalShadowMatrix[ 0 ] * vec4(worldPos + worldNormal * directionalLightShadows[ 0 ].shadowNormalBias, 1.0);
  #endif
}
`;

// Soft sun shadow: 8 hardware-PCF taps on a Vogel disc (fewer on the handheld presets). "phi"
// rotates the disc; pass per-pixel noise for smooth penumbrae or a per-object constant for a
// clean, flat (painted) shadow value.
const TAPS = pickQuality().shadowTaps ?? 8;
// The blur radius is given in shadow-map texels, so on a smaller map the same number is a wider
// blur on the ground. A preset can scale it back to keep the dappled light from going mushy.
const BLUR = (pickQuality().shadowBlur ?? 1).toFixed(3);
export const SHADOW_PARS_FRAGMENT = /* glsl */ `
#include <packing>
#include <shadowmap_pars_fragment>
float sunShadow(float radius, float phi) {
  #if defined( USE_SHADOWMAP ) && defined( SHADOWMAP_TYPE_PCF ) && NUM_DIR_LIGHT_SHADOWS > 0
    vec4 coord = vDirectionalShadowCoord[ 0 ];
    vec3 sc = coord.xyz / coord.w;
    sc.z += directionalLightShadows[ 0 ].shadowBias;
    if (sc.x <= 0.0 || sc.x >= 1.0 || sc.y <= 0.0 || sc.y >= 1.0 || sc.z >= 1.0) return 1.0;
    vec2 r = radius * ${BLUR} / directionalLightShadows[ 0 ].shadowMapSize;
    float s = 0.0;
    for (int i = 0; i < ${TAPS}; i++) {
      s += texture(directionalShadowMap[ 0 ], vec3(sc.xy + vogelDiskSample(i, ${TAPS}, phi) * r, sc.z));
    }
    return s * ${(1 / TAPS).toFixed(6)};
  #else
    return 1.0;
  #endif
}
float pixelPhi() { return fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) * 6.2831853; }
`;
