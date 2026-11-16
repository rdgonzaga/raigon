// Art direction for the whole scene lives here.
// Every colour below was measured from the Unreal reference frame (public/reference.webp)
// and is authored in display sRGB; three.js converts to linear working space for us.

import { Color, MathUtils, SRGBColorSpace, Vector2, Vector3 } from 'three';
import { desktopTier, probeRendererName } from './core/gpu.js';

const rgb = (r, g, b) => new Color().setRGB(r / 255, g / 255, b / 255, SRGBColorSpace);

export const REF = { width: 1349, height: 757 };

// Render layers: the sun's shadow camera only sees layer 1 (every shadow caster is on it), and
// layer 2 holds the per-blade shadow gather points, which only their own gather camera sees.
export const LAYERS = { shadowCasters: 1, shadowGather: 2 };

// Camera that reproduces the reference framing (UE default 90 degree horizontal FOV).
export const HERO = {
  position: new Vector3(0, 1.8, 0),
  yaw: 0,
  pitch: MathUtils.degToRad(4.0),
  hFov: 90,
  aspect: REF.width / REF.height,
};

// Tall windows (phones, tablets held upright). The hero shot is a landscape frame, so on a tall
// screen it would shrink to a thin band between a huge sky and a huge lawn. Instead the lens stops
// getting wider at `vFov` and the camera turns towards the path: trees, ford and stream stay the
// subject, with open sky above them and the near bank below. Because the vertical field of view
// is then fixed, the tree line and the stream sit at the same height of the screen on every
// phone, which is what the portrait layout of the overlay is built around.
export const PORTRAIT = {
  vFov: 94, // widest vertical field of view; reached where the window gets narrower than ~0.93:1
  yaw: MathUtils.degToRad(12), // turn left, towards the path between the trees
  pitch: MathUtils.degToRad(6.5),
  aspectTall: 0.62, // at or below this width / height the portrait shot is used in full
};

// Sun sits behind-left of the hero camera, fairly high.
export const SUN = {
  dir: new Vector3(-0.5, 0.74, 0.45).normalize(),
};

// Wind blows across the frame, left to right and slightly away from the camera.
export const WIND = {
  dir: new Vector2(0.95, -0.31).normalize(),
  strength: 1.0,
  speed: 3.4, // m/s, speed of the gust fronts
};

export const FOG = {
  density: 0.027,
  max: 0.96,
};

// World size (m) of one repeat of the tiling ground detail texture, at its two scales.
export const GROUND = { tileA: 4.0, tileB: 11.2 };

export const PAL = {
  // sky, horizon -> zenith (keyed on sin(elevation), see skyGradient in shaderlib)
  sky0: rgb(160, 197, 203),
  sky1: rgb(126, 187, 201),
  sky2: rgb(79, 177, 205),
  sky3: rgb(30, 143, 197),
  sky4: rgb(46, 104, 182),
  sunGlow: rgb(255, 246, 222),

  // clouds
  cloudLit: rgb(205, 211, 202),
  cloudShadeHigh: rgb(172, 200, 204),
  cloudShadeLow: rgb(142, 184, 198),
  cloudHaze: rgb(168, 202, 206),

  // aerial perspective: teal air in the mid distance, pale haze far away
  fogNear: rgb(46, 104, 130),
  fogFar: rgb(150, 192, 202),
  fogLit: rgb(118, 164, 146),

  // grass
  grassLitNear: rgb(86, 138, 30),
  grassShdNear: rgb(14, 36, 17),
  grassLitMid: rgb(110, 160, 54),
  grassLitA: rgb(104, 156, 78),
  grassLitB: rgb(122, 170, 72),
  grassShdFar: rgb(37, 78, 44),
  grassDry: rgb(178, 150, 80),

  // ground
  dirtLit: rgb(193, 163, 90),
  dirtLitB: rgb(176, 150, 78),
  dirtSand: rgb(196, 176, 122),
  dirtShd: rgb(70, 78, 48),
  paleLit: rgb(199, 187, 150),
  paleLitB: rgb(186, 168, 124),
  paleShd: rgb(104, 108, 92),
  bed: rgb(92, 118, 104),

  // water
  waterShallow: rgb(170, 204, 194),
  waterDeep: rgb(124, 176, 182),
  waterSky: rgb(166, 204, 196),
  waterFoam: rgb(196, 214, 208),

  // foliage ramp (deep -> low -> mid -> high)
  leafDeep: rgb(17, 42, 32),
  leafLow: rgb(32, 64, 45),
  leafMid: rgb(60, 106, 56),
  leafHigh: rgb(106, 154, 70),
  leafSun: rgb(136, 178, 90),

  // bark
  barkLit: rgb(130, 108, 78),
  barkLitB: rgb(104, 92, 70),
  barkShd: rgb(58, 60, 48),

  // rock
  rockLit: rgb(158, 164, 132),
  rockLitB: rgb(132, 144, 112),
  rockShd: rgb(70, 92, 84),
  rockWarm: rgb(166, 128, 108),

  // far mountains
  mountainLit: rgb(98, 148, 166),
  mountainShd: rgb(60, 108, 134),
  mist: rgb(176, 205, 208),

  // vfx
  flower: rgb(64, 150, 214),
  flowerCore: rgb(214, 232, 240),
  windStreak: rgb(226, 236, 224),
  leafFx: rgb(72, 118, 52),
  leafFxB: rgb(126, 160, 60),

  // added props (lib/meadow/extras.js)
  boatLit: rgb(198, 188, 166), // weathered off-white paint
  boatShd: rgb(92, 96, 96),
  teakLit: rgb(138, 106, 76),
  teakShd: rgb(64, 58, 50),
  ironLit: rgb(66, 68, 66),
  ironShd: rgb(26, 28, 32),
  reedShd: rgb(62, 74, 56),
  coneLit: rgb(214, 112, 150),
};

// Quality presets. A desktop gets "high", a phone "phone", a tablet "tablet" (see pickQuality);
// ?q=low|medium|high|ultra|phone|tablet picks one by hand.
//
//   dpr         cap on the device pixel ratio
//   pixels      cap on the pixels rendered per frame, whatever the screen size (none if absent)
//   grass       blade density, 1 = the reference look
//   shadow      size of the sun shadow map
//   shadowTaps  PCF taps per shadow lookup (8 if absent)
//   shadowBlur  multiplier on the PCF radius, which is measured in shadow-map texels (1 if absent)
//   cloudScale  size of the cloud buffer relative to the canvas; cloudSteps = march steps
//   msaa        samples
//   refresh     the shadow map and the cloud buffer are each redrawn once every `refresh` frames
//               (2 if absent: they take turns)
//   minScale    how far the resolution may fall when the frame rate does (0.55 if absent)
//   startScale  resolution the page starts at, as a fraction of the cap (1 if absent)
//   eager       true: when frames are slow, drop the resolution in proportion to how slow,
//               instead of one small step at a time
export const QUALITY = {
  low: { dpr: 1.0, grass: 0.45, shadow: 2048, cloudScale: 0.35, cloudSteps: 28, msaa: 2 },
  medium: { dpr: 1.25, grass: 0.75, shadow: 4096, cloudScale: 0.45, cloudSteps: 36, msaa: 4 },
  high: { dpr: 1.5, grass: 1.0, shadow: 4096, cloudScale: 0.6, cloudSteps: 64, msaa: 4 },
  ultra: { dpr: 2.0, grass: 1.35, shadow: 4096, cloudScale: 0.7, cloudSteps: 80, msaa: 4 },
  // Handheld GPUs are several times slower than the desktop this was tuned on and pay for every
  // pixel. These two spend where it shows (enough resolution for the foliage to stay crisp, full
  // cloud shapes) and save where it does not: fewer march steps, softer shadows, thinner grass,
  // and the two slow passes refreshed less often, which the slow wind hides.
  phone: { dpr: 2.0, pixels: 1.1e6, grass: 0.5, shadow: 2048, shadowTaps: 5, shadowBlur: 0.7, cloudScale: 0.5, cloudSteps: 32, msaa: 2, refresh: 4, minScale: 0.5, startScale: 0.85, eager: true },
  tablet: { dpr: 2.0, pixels: 1.8e6, grass: 0.7, shadow: 2048, shadowTaps: 6, shadowBlur: 0.75, cloudScale: 0.5, cloudSteps: 40, msaa: 2, refresh: 3, minScale: 0.5, startScale: 0.85, eager: true },
};

/** Which preset this device gets when the URL does not name one. */
export function detectTier() {
  // "handheld" = the main way of pointing is a finger. A laptop with a touch screen still
  // reports a fine pointer, so it stays on the desktop preset.
  const handheld = window.matchMedia?.('(pointer: coarse)').matches && window.matchMedia('(hover: none)').matches;
  if (!handheld) return desktopTier(probeRendererName(), navigator.hardwareConcurrency || 8, navigator.deviceMemory || 8);
  return Math.min(window.screen.width, window.screen.height) < 600 ? 'phone' : 'tablet';
}

// Any of these can also be set on its own in the URL, on top of the preset, to tune on a real
// device: ?q=phone&grass=0.8&shadowTaps=6&fps. (?dpr is separate: it pins the pixel ratio.)
const TUNABLE = ['pixels', 'grass', 'shadow', 'shadowTaps', 'shadowBlur', 'cloudScale', 'cloudSteps', 'msaa', 'refresh', 'minScale', 'startScale'];

let chosen = null;
export function pickQuality() {
  if (chosen) return chosen;
  const params = new URLSearchParams(location.search);
  const q = params.get('q');
  const name = QUALITY[q] ? q : detectTier();
  chosen = { name, ...QUALITY[name] };
  for (const key of TUNABLE) {
    const value = parseFloat(params.get(key));
    if (Number.isFinite(value) && value >= 0) chosen[key] = value;
  }
  return chosen;
}

// =============================================================================================
// raigon redesign mocks (added; everything above is the original engine config)
// Environment palette overrides, plus two grades of the whole palette: golden morning and sunset.
// Every material holds the PAL colours by reference, so setMode() repaints the scene live.
// =============================================================================================
import { ENV, MODE0, REGRADE } from './env.js';

PAL.flowerB = PAL.flower.clone();
PAL.sunWarm = rgb(255, 196, 120);
PAL.snowLit = rgb(250, 244, 236);
PAL.snowShd = rgb(150, 176, 206);
PAL.waterRefl = rgb(58, 96, 112);
PAL.stoneLit = rgb(198, 190, 172);
PAL.stoneShd = rgb(92, 102, 104);
for (const [key, v] of Object.entries(ENV.pal ?? {})) PAL[key].copy(rgb(...v));
if (ENV.fog) FOG.density = ENV.fog;
if (ENV.fogMax) FOG.max = ENV.fogMax;

const aim = (az, el) => {
  const a = MathUtils.degToRad(az), e = MathUtils.degToRad(el);
  return new Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e));
};
/** Where the sun is seen in the sky. The light that shades the scene stays higher (SUN.dir), or the whole meadow would sit in the shadow of the forest. */
export const SUN_VIEW = SUN.dir.clone();
const VIEW = [aim(ENV.sunAz ?? 31, ENV.sunEl?.[0] ?? 8), aim(ENV.sunsetAz ?? (ENV.sunAz ?? 31) - 2, ENV.sunEl?.[1] ?? 4)];
// ENV.light = [[az, el] morning, [az, el] sunset]: the shading light follows the sun across the frame.
const LIGHT = ENV.light?.map(([az, el]) => aim(az, el));
if (REGRADE) SUN.dir.copy(LIGHT ? LIGHT[0] : aim(58, 27));

const LIT = ['grassLitNear', 'grassLitMid', 'grassLitA', 'grassLitB', 'grassDry', 'dirtLit', 'dirtLitB', 'dirtSand', 'paleLit', 'paleLitB', 'leafMid', 'leafHigh', 'leafSun',
  'barkLit', 'barkLitB', 'rockLit', 'rockLitB', 'rockWarm', 'mountainLit', 'windStreak', 'leafFxB', 'flower', 'flowerB', 'flowerCore', 'snowLit', 'stoneLit', 'teakLit', 'ironLit', 'coneLit', 'boatLit'];
const SHD = ['grassShdNear', 'grassShdFar', 'dirtShd', 'paleShd', 'leafDeep', 'leafLow', 'barkShd', 'rockShd', 'mountainShd', 'leafFx', 'bed', 'snowShd', 'waterRefl', 'stoneShd', 'teakShd', 'ironShd', 'reedShd', 'boatShd'];
const WATER = ['waterShallow', 'waterDeep', 'waterSky', 'waterFoam'];

const MORNING = {
  lit: [1.22, 1.02, 0.72], shd: [0.88, 0.92, 1.02], water: [1.06, 1.0, 0.9], // golden hour
  set: {
    sky0: [255, 206, 138], sky1: [242, 206, 166], sky2: [164, 196, 212], sky3: [92, 152, 206], sky4: [58, 108, 184], sunGlow: [255, 228, 170], sunWarm: [255, 182, 92],
    cloudLit: [255, 238, 214], cloudShadeHigh: [214, 200, 196], cloudShadeLow: [160, 172, 198], cloudHaze: [236, 214, 186],
    fogNear: [70, 100, 110], fogFar: [236, 204, 152], fogLit: [200, 176, 104], mist: [242, 212, 168],
    // warm paving, not bleached grey (the path is mostly in shade in the morning);
    // shaded stones stay close to the soil between them, so the paving reads as softly as at sunset
    stoneLit: [196, 168, 118], stoneShd: [86, 84, 62],
  },
};
const SUNSET = {
  lit: [1.16, 0.86, 0.66], shd: [0.62, 0.6, 0.92], water: [0.95, 0.78, 0.88],
  set: {
    sky0: [255, 168, 104], sky1: [244, 136, 116], sky2: [176, 116, 150], sky3: [98, 88, 150], sky4: [48, 58, 118], sunGlow: [255, 206, 150], sunWarm: [255, 140, 70],
    cloudLit: [255, 176, 132], cloudShadeHigh: [186, 120, 142], cloudShadeLow: [98, 82, 132], cloudHaze: [226, 150, 134],
    fogNear: [66, 58, 108], fogFar: [214, 144, 128], fogLit: [196, 124, 96], mist: [222, 160, 150],
  },
};
const BASE = Object.fromEntries(Object.entries(PAL).map(([key, c]) => [key, c.clone()]));
function grade(g) {
  const out = {};
  for (const key in BASE) {
    const c = BASE[key].clone();
    const m = LIT.includes(key) ? g.lit : SHD.includes(key) ? g.shd : WATER.includes(key) ? g.water : null;
    if (m) c.setRGB(c.r * m[0], c.g * m[1], c.b * m[2]);
    out[key] = c;
  }
  for (const [key, v] of Object.entries(g.set)) out[key] = rgb(...v);
  return out;
}
const GRADES = [grade(MORNING), grade(SUNSET)];

/** 0 = golden morning, 1 = sunset, anything between blends the two. */
export function setMode(k) {
  if (!REGRADE) return;
  for (const key in PAL) PAL[key].lerpColors(GRADES[0][key], GRADES[1][key], k);
  SUN_VIEW.lerpVectors(VIEW[0], VIEW[1], k).normalize();
  if (LIGHT) SUN.dir.lerpVectors(LIGHT[0], LIGHT[1], k).normalize();
}
setMode(MODE0);
