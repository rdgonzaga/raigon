// Camera rig. By default it sits exactly on the reference shot and only breathes / follows the
// pointer by a degree or two (a locked-off cinematic with parallax). Press F for a free orbit.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { HERO, PORTRAIT } from '../config.js';
import { ENV } from '../env.js';
import { terrainHeight } from '../world/heightfield.js';
import { LOOK_AHEAD, MERGE, WALK, WALKWAY } from './walkway.js';

// An environment may stand somewhere else than the original shot (see env.js).
const VIEW = ENV.cam
  ? {
    position: new THREE.Vector3(ENV.cam.x, terrainHeight(ENV.cam.x, ENV.cam.z) + (ENV.cam.eye ?? 1.75), ENV.cam.z),
    yaw: THREE.MathUtils.degToRad(ENV.cam.yaw ?? 0),
    pitch: THREE.MathUtils.degToRad(ENV.cam.pitch ?? 4),
  }
  : HERO;

// Scrolling the page walks the camera down the park path (ENV.path): it steps onto the path over
// the first MERGE metres, then follows it for WALK metres, facing where the path is heading.
const heading = (from, to) => Math.atan2(-(to.x - from.x), -(to.y - from.y)); // yaw that looks from -> to

function walkPose(t) {
  if (!WALKWAY || t <= 0) return null;
  // steady pace; only the first 6% eases in, with the same speed at the seam
  const s = (WALK / 0.97) * (t < 0.06 ? (t * t) / 0.12 : t - 0.03);
  const merge = THREE.MathUtils.smoothstep(s, 0, MERGE);
  const p = WALKWAY.at(s);
  // the camera starts beside the path: that offset fades out as it steps on
  const off = new THREE.Vector2(VIEW.position.x, VIEW.position.z).sub(WALKWAY.start).multiplyScalar(1 - merge);
  const x = p.x + off.x, z = p.y + off.y;
  let yaw = heading(p, WALKWAY.at(s + LOOK_AHEAD));
  while (yaw - VIEW.yaw > Math.PI) yaw -= 2 * Math.PI;
  while (yaw - VIEW.yaw < -Math.PI) yaw += 2 * Math.PI;
  return { x, z, y: terrainHeight(x, z) + (ENV.cam?.eye ?? 1.75), yaw: VIEW.yaw + (yaw - VIEW.yaw) * merge };
}

export class HeroCamera {
  constructor(dom, { still = false } = {}) {
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.12, 9000);
    this.camera.rotation.order = 'YXZ';
    this.still = still;
    this.free = false;
    this.tall = 0; // 0 = the hero shot, 1 = the portrait shot (see setAspect)
    this.moving = false;
    this.pointer = new THREE.Vector2();
    this.smooth = new THREE.Vector2();
    this.scrollTarget = 0; // 0..1 page scroll: the camera rises and turns out over the lake
    this.scroll = 0;

    this.controls = new OrbitControls(this.camera, dom);
    this.controls.enabled = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.target.set(-2.5, 1.6, -14);
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 90;

    window.addEventListener('pointermove', (e) => {
      // a finger only steers the view when it is dragging on the picture itself, not on a link
      if (e.pointerType !== 'mouse' && e.target !== dom) return;
      this.pointer.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    });
    // a finger has no resting position: when it lifts, the view eases back to the shot
    const release = (e) => {
      if (e.pointerType !== 'mouse') this.pointer.set(0, 0);
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    this.applyHero(0);
  }

  setAspect(aspect) {
    // Keep the reference framing fully visible on any window shape: lock the horizontal FOV when
    // the window is narrower than the reference, the vertical FOV when it is wider.
    const refH = THREE.MathUtils.degToRad(HERO.hFov);
    const refV = 2 * Math.atan(Math.tan(refH / 2) / HERO.aspect);
    let v = aspect >= HERO.aspect ? refV : 2 * Math.atan(Math.tan(refH / 2) / aspect);
    // ...until the window is tall: from there the lens stays put and the frame is cropped at the
    // sides instead, while the camera turns to the portrait shot (see PORTRAIT in config.js).
    const vMax = THREE.MathUtils.degToRad(PORTRAIT.vFov);
    const aspectWide = Math.tan(refH / 2) / Math.tan(vMax / 2); // where the cap starts to bite
    this.tall = 1 - THREE.MathUtils.smoothstep(aspect, PORTRAIT.aspectTall, aspectWide);
    v = Math.min(v, vMax);
    this.camera.fov = THREE.MathUtils.radToDeg(v);
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  toggleFree() {
    this.free = !this.free;
    this.controls.enabled = this.free;
    if (this.free) {
      this.controls.target.set(-2.5, 1.6, -14);
      this.controls.update();
    }
    return this.free;
  }

  applyHero(time) {
    const cam = this.camera;
    const k = this.still ? 0 : 1;
    const mx = this.smooth.x * k, my = this.smooth.y * k;
    const breatheX = Math.sin(time * 0.31) * 0.012 * k;
    const breatheY = Math.sin(time * 0.47 + 1.3) * 0.008 * k;
    const walk = walkPose(this.scroll);
    const base = walk ?? { x: VIEW.position.x, y: VIEW.position.y, z: VIEW.position.z, yaw: VIEW.yaw };
    // a slight head bob while walking
    const bob = walk ? Math.sin(this.scroll * WALK * 2.4) * 0.025 : 0;
    const yaw = base.yaw + PORTRAIT.yaw * this.tall * (ENV.cam && !ENV.cam.portrait ? 0 : 1);
    const pitch = VIEW.pitch + (PORTRAIT.pitch - VIEW.pitch) * this.tall;
    cam.position.set(base.x + mx * 0.22 + breatheX, base.y - my * 0.07 + breatheY + bob, base.z);
    cam.rotation.set(pitch - my * 0.022, yaw - mx * 0.04, Math.sin(time * 0.23) * 0.0015 * k);
  }

  update(dt, time) {
    if (this.free) {
      this.controls.update();
    } else {
      const a = 1 - Math.exp(-dt * 2.2);
      const target = this.scrollTarget;
      this.scroll += (target - this.scroll) * (1 - Math.exp(-dt * 7));
      // still easing towards the pointer or the scroll position
      this.moving = this.smooth.distanceToSquared(this.pointer) > 4e-6 || Math.abs(target - this.scroll) > 1e-4;
      this.smooth.lerp(this.pointer, a);
      this.applyHero(time);
    }
    this.camera.updateMatrixWorld();
  }
}
