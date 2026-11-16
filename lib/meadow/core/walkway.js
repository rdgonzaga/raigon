// The scroll walk along ENV.path, shared by the camera (HeroCamera.js) and the ground cover that
// has to stay dense along it (Grass.js).

import * as THREE from 'three';
import { HERO } from '../config.js';
import { ENV } from '../env.js';

export const WALK = 30, MERGE = 4, LOOK_AHEAD = 5;
/** Where the camera stands before any scroll. */
export const START = ENV.cam ? new THREE.Vector2(ENV.cam.x, ENV.cam.z) : new THREE.Vector2(HERO.position.x, HERO.position.z);

export const WALKWAY = (() => {
  const pts = (ENV.path ?? []).map(([x, z]) => new THREE.Vector2(x, z));
  if (pts.length < 2) return null;
  // start at the path point nearest the camera, then keep only what lies ahead of it
  let i0 = 0;
  pts.forEach((p, i) => { if (p.distanceTo(START) < pts[i0].distanceTo(START)) i0 = i; });
  const ahead = pts.slice(i0);
  const lengths = [0];
  for (let i = 1; i < ahead.length; i++) lengths.push(lengths[i - 1] + ahead[i].distanceTo(ahead[i - 1]));
  const at = (s) => {
    let i = 1;
    while (i < ahead.length - 1 && lengths[i] < s) i++;
    const u = THREE.MathUtils.clamp((s - lengths[i - 1]) / (lengths[i] - lengths[i - 1]), 0, 1);
    return ahead[i - 1].clone().lerp(ahead[i], u);
  };
  return { at, start: at(0) };
})();

/** The ground the camera crosses, start spot to `beyond` metres past the end stop, as [x, z] pairs. */
export function walkLine(beyond = 0) {
  if (!WALKWAY) return [[START.x, START.y]];
  const out = [[START.x, START.y]];
  for (let s = 0; s <= WALK + beyond; s += 1) { const p = WALKWAY.at(s); out.push([p.x, p.y]); }
  return out;
}

/** Distance from (x, z) to a polyline of [x, z] pairs. */
export function distToLine(line, x, z) {
  let best = Infinity;
  for (let i = 0; i < line.length; i++) {
    const [ax, az] = line[i];
    if (i === line.length - 1) { best = Math.min(best, Math.hypot(x - ax, z - az)); break; }
    const [bx, bz] = line[i + 1];
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
    const u = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / l2));
    best = Math.min(best, Math.hypot(x - ax - u * dx, z - az - u * dz));
  }
  return best;
}
