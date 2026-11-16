// "Reference space": helpers that turn pixel coordinates of the Unreal reference frame
// (1349 x 757) into world-space rays through the hero camera. The whole layout - stream,
// paths, trees, rocks, even the clouds - is authored in reference pixels, so the composition
// matches the original by construction.

import { MathUtils, Vector3 } from 'three';
import { HERO, REF } from '../config.js';

export const FOCAL_PX = REF.width / 2 / Math.tan(MathUtils.degToRad(HERO.hFov / 2));

const cp = Math.cos(HERO.pitch), sp = Math.sin(HERO.pitch);
const cy = Math.cos(HERO.yaw), sy = Math.sin(HERO.yaw);

/** Normalised world-space direction through a reference pixel. */
export function pixelRay(px, py, out = new Vector3()) {
  const x = px - REF.width / 2;
  const y = -(py - REF.height / 2);
  const z = -FOCAL_PX;
  const y2 = y * cp - z * sp;
  const z2 = y * sp + z * cp;
  return out.set(x * cy + z2 * sy, y2, -x * sy + z2 * cy).normalize();
}

/** Intersection of the pixel ray with a horizontal plane. */
export function pixelToPlane(px, py, height = 0) {
  const d = pixelRay(px, py);
  const t = (height - HERO.position.y) / d.y;
  return new Vector3().copy(HERO.position).addScaledVector(d, t);
}

/** Point on the pixel ray at a given view depth (distance along the camera's forward axis). */
export function pixelAtDepth(px, py, depth) {
  const d = pixelRay(px, py);
  const forward = d.x * -sy * cp + d.y * sp + d.z * -cy * cp;
  return new Vector3().copy(HERO.position).addScaledVector(d, depth / forward);
}

/** World size of something that spans `px` reference pixels at a given view depth. */
export function pixelsToMeters(px, depth) {
  return (px * depth) / FOCAL_PX;
}

export function viewDepth(p) {
  const dx = p.x - HERO.position.x, dy = p.y - HERO.position.y, dz = p.z - HERO.position.z;
  return dx * -sy * cp + dy * sp + dz * -cy * cp;
}
