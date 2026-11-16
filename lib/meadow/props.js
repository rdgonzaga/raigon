// Walk dressing: small hand-placed props along the scroll walk and at its end stop.
// Placement lives in ENV.extras.dressing (env.js); kit = { prop, caster } from start.js.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PAL } from './config.js';
import { terrainHeight, WATER_LEVEL } from './world/heightfield.js';

const ground = (x, z) => Math.max(terrainHeight(x, z), WATER_LEVEL);
const FLAT_VERT = 'varying vec3 vN; void main() { vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';

/** Unlit glass by day, a warm lamp at sunset; one material shared by every lamp. */
function lampMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uC: { value: PAL.sunWarm }, uOn: { value: 1 } },
    vertexShader: FLAT_VERT,
    fragmentShader: 'uniform vec3 uC; uniform float uOn; varying vec3 vN; void main() { vec3 off = vec3(0.44, 0.43, 0.4) * (0.8 + 0.2 * vN.y); gl_FragColor = vec4(mix(off, mix(uC, vec3(1.0), 0.2) * 1.15, uOn), 1.0); }',
  });
}

function haloMaterial(tex, color) {
  return new THREE.SpriteMaterial({ map: tex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 });
}

export function createDressing(D, kit, tex) {
  const group = new THREE.Group();
  group.name = 'dressing';
  const flat = (lit, shd, k = 1.35) => kit.prop(lit, shd, k, { side: THREE.DoubleSide });
  const wood = flat(PAL.barkLit, PAL.barkShd, 1.3);
  const plank = flat(PAL.teakLit, PAL.teakShd, 1.25);
  const stone = flat(PAL.rockLit, PAL.rockShd, 1.2);
  const rope = flat(PAL.paleLit, PAL.paleShd, 1.1);
  const lamp = lampMaterial();
  const halos = [];
  const live = []; // (t) => void
  const add = (parent, geo, material, x = 0, y = 0, z = 0) => {
    const m = kit.caster(new THREE.Mesh(geo, material));
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const halo = (parent, x, y, z, size, color = PAL.sunWarm, strength = 0.55) => {
    const s = new THREE.Sprite(haloMaterial(tex, color));
    s.position.set(x, y, z);
    s.scale.setScalar(size);
    s.userData.strength = strength;
    parent.add(s);
    halos.push(s);
    return s;
  };
  const at = (x, z, yaw = 0, lift = 0) => {
    const g = new THREE.Group();
    g.position.set(x, ground(x, z) + lift, z);
    g.rotation.y = yaw;
    group.add(g);
    return g;
  };

  // a balanced stack of flat stones by the water
  for (const { x, z, n = 5 } of D.cairns ?? []) {
    const g = at(x, z, 0, -0.04);
    let y = 0;
    for (let i = 0; i < n; i++) {
      const s = 0.34 * (1 - i * 0.14), h = s * 0.42;
      const m = add(g, new THREE.DodecahedronGeometry(1, 0), stone, (i % 2 ? 0.02 : -0.02), y + h * 0.5, i * 0.01);
      m.scale.set(s, h, s * 0.85);
      m.rotation.y = i * 1.3;
      y += h * 0.92;
    }
  }

  // a trail marker: a post with two blank arrow boards
  for (const { x, z, yaw } of D.signposts ?? []) {
    const g = at(x, z, yaw, -0.05);
    add(g, new THREE.BoxGeometry(0.1, 1.7, 0.1), wood, 0, 0.85, 0);
    add(g, new THREE.ConeGeometry(0.075, 0.08, 4).rotateY(Math.PI / 4), wood, 0, 1.74, 0);
    const arrow = (len, y, dir, tilt) => {
      const shape = new THREE.Shape();
      shape.moveTo(0, -0.08).lineTo(len - 0.12, -0.08).lineTo(len, 0).lineTo(len - 0.12, 0.08).lineTo(0, 0.08).lineTo(0, -0.08);
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: false }).translate(0.04, 0, -0.0175);
      const m = add(g, geo, plank, 0, y, 0);
      m.rotation.set(0, dir, tilt);
    };
    arrow(0.62, 1.42, 0, 0.04);
    arrow(0.52, 1.2, Math.PI - 0.5, -0.03);
  }

  // stone ring, crossed logs, embers that glow at dusk, and logs to sit on
  for (const { x, z, seats = [], lit = true } of D.campfires ?? []) {
    const g = at(x, z, 0, -0.03);
    const ring = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2, s = 0.15 + ((i * 7) % 3) * 0.025;
      const geo = new THREE.DodecahedronGeometry(1, 0).scale(s, s * 0.6, s * 0.8).rotateY(a * 2.3).translate(Math.cos(a) * 0.5, s * 0.3, Math.sin(a) * 0.5);
      ring.push(geo);
    }
    add(g, mergeGeometries(ring), stone);
    const charred = flat(PAL.barkShd, PAL.ironShd ?? PAL.barkShd, 0.8);
    for (let i = 0; i < 4; i++) {
      const m = add(g, new THREE.CylinderGeometry(0.045, 0.055, 0.62, 6), charred, 0, 0.13, 0);
      m.rotation.set(0.9, (i / 4) * Math.PI * 2 + 0.3, 0, 'YXZ');
      m.position.set(Math.cos(i * 1.57 + 0.3) * 0.1, 0.12, Math.sin(i * 1.57 + 0.3) * 0.1);
    }
    // cold ash, or embers that glow at dusk
    const ash = add(g, new THREE.DodecahedronGeometry(0.16, 0).scale(1, 0.45, 1), lit ? lamp : flat(PAL.paleShd, PAL.barkShd, 0.7), 0, 0.05, 0);
    ash.castShadow = false;
    if (lit) {
      const glow = halo(g, 0, 0.35, 0, 1.6, PAL.sunWarm, 0.9);
      live.push((t) => {
        const f = 0.82 + 0.1 * Math.sin(t * 9.1) + 0.08 * Math.sin(t * 13.7 + 1.3);
        glow.scale.setScalar(1.6 * f);
        glow.userData.flicker = f;
      });
    }
    for (const [sx, sz, len, yaw] of seats) {
      const m = add(group, new THREE.CylinderGeometry(0.17, 0.15, len, 9), wood, sx, ground(sx, sz) + 0.13, sz);
      m.rotation.set(0, yaw, Math.PI / 2);
    }
  }

  // a small birdhouse on a pole
  for (const { x, z, yaw, h = 2.2 } of D.birdhouses ?? []) {
    const pole = at(x, z, yaw, -0.1);
    add(pole, new THREE.BoxGeometry(0.08, h + 0.05, 0.08), wood, 0, (h + 0.05) / 2, 0);
    add(pole, new THREE.BoxGeometry(0.3, 0.035, 0.28), plank, 0, h + 0.05, 0);
    const g = at(x, z, yaw, h + 0.11); // sits on the platform
    add(g, new THREE.BoxGeometry(0.24, 0.28, 0.22), plank, 0, 0, 0);
    const roof = add(g, new THREE.CylinderGeometry(0.2, 0.2, 0.3, 3), wood, 0, 0.2, 0);
    roof.rotation.set(0, 0, Math.PI / 2);
    roof.scale.set(1, 1, 0.75);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.045, 10), new THREE.MeshBasicMaterial({ color: 0x1a120c }));
    hole.position.set(0, 0.03, 0.111);
    g.add(hole);
    add(g, new THREE.CylinderGeometry(0.01, 0.01, 0.1, 5).rotateX(Math.PI / 2), wood, 0, -0.06, 0.15);
  }

  // little cream and rust caps at the foot of the deadwood
  if (D.mushrooms?.length) {
    const caps = [], stems = [];
    let seed = 3;
    const r = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    for (const [x, z, n, spread] of D.mushrooms) {
      for (let i = 0; i < n; i++) {
        const mx = x + (r() - 0.5) * spread, mz = z + (r() - 0.5) * spread, y = ground(mx, mz) - 0.01, s = 0.03 + r() * 0.035;
        stems.push(new THREE.CylinderGeometry(s * 0.28, s * 0.36, s * 1.4, 6).translate(mx, y + s * 0.7, mz));
        caps.push(new THREE.SphereGeometry(s, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.62, 1).translate(mx, y + s * 1.35, mz));
      }
    }
    add(group, mergeGeometries(stems), flat(PAL.paleLit, PAL.paleShd, 1.2));
    add(group, mergeGeometries(caps), flat(PAL.flowerCore, PAL.barkShd, 0.95));
  }

  // a plank footbridge over the creek, rails on both sides
  // a plank footbridge spanning the creek: each end rests on its own bank on stone footings,
  // and the deck rises in a shallow arch between them
  for (const { x, z, yaw, len = 5.2, w = 1.2, rise = 0.32 } of D.bridges ?? []) {
    const g = new THREE.Group();
    const dx = Math.sin(yaw), dz = Math.cos(yaw);
    const gA = ground(x - dx * len * 0.5, z - dz * len * 0.5), gB = ground(x + dx * len * 0.5, z + dz * len * 0.5);
    g.position.set(x, 0, z);
    g.rotation.y = yaw;
    group.add(g);
    // deck height along the span: the line between the banks plus the arch, eased flat into each bank
    const deck = (v) => { const u = v / len + 0.5; return gA + (gB - gA) * u + rise * Math.sin(Math.PI * u) ** 1.3 + 0.03; };
    const boards = [];
    for (let i = 0, n = Math.round(len / 0.17); i < n; i++) {
      const v = -len / 2 + (i + 0.5) * (len / n), e = 0.01;
      const tilt = Math.atan((deck(v + e) - deck(v - e)) / (2 * e));
      boards.push(new THREE.BoxGeometry(w, 0.05, len / n - 0.022).rotateX(-tilt).translate(0, deck(v), v));
    }
    add(g, mergeGeometries(boards), plank);
    const curve = (sx, dy, inset = 0) => new THREE.CatmullRomCurve3(Array.from({ length: 13 }, (_, i) => {
      const v = -len / 2 + inset + (i / 12) * (len - inset * 2);
      return new THREE.Vector3(sx, deck(v) + dy, v);
    }));
    for (const side of [-1, 1]) {
      const sx = side * (w / 2 - 0.03);
      add(g, new THREE.TubeGeometry(curve(sx, -0.07), 24, 0.06, 5), wood); // stringer under the boards
      add(g, new THREE.TubeGeometry(curve(sx, 0.8, 0.45), 24, 0.035, 5), wood); // handrail, short of the ends
      for (const v of [-len / 2 + 0.45, -len / 6, len / 6, len / 2 - 0.45]) add(g, new THREE.BoxGeometry(0.065, 0.82, 0.065), wood, sx, deck(v) + 0.39, v);
    }
    // stone footings where the deck meets each bank
    for (const [v, gy] of [[-len / 2 + 0.25, gA], [len / 2 - 0.25, gB]]) {
      const m = add(g, new THREE.BoxGeometry(w + 0.25, 0.3, 0.55), stone, 0, gy - 0.1, v);
      m.rotation.y = 0.04;
    }
  }

  // ducks paddling slow loops; each bobs, leaves a faint wake and steers clear of the others
  if (D.ducks?.length) {
    const flock = [];
    const body = flat(PAL.boatLit, PAL.boatShd, 1.1);
    const head = flat(PAL.leafLow, PAL.leafDeep ?? PAL.leafLow, 1.2);
    const bill = flat(PAL.flowerCore, PAL.teakShd, 1.1);
    const wakeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
    for (const [i, { x, z, r, speed = 0.12, phase = 0 }] of D.ducks.entries()) {
      const duck = new THREE.Group();
      const b = add(duck, new THREE.SphereGeometry(0.17, 10, 7), body, 0, 0.06, 0);
      b.scale.set(0.8, 0.6, 1.25);
      add(duck, new THREE.ConeGeometry(0.06, 0.16, 6).rotateX(-Math.PI / 2 - 0.5), body, 0, 0.12, -0.2);
      add(duck, new THREE.SphereGeometry(0.075, 8, 6), i === 1 ? body : head, 0, 0.24, 0.17);
      add(duck, new THREE.CylinderGeometry(0.04, 0.05, 0.12, 6), i === 1 ? body : head, 0, 0.16, 0.15);
      const bk = add(duck, new THREE.BoxGeometry(0.05, 0.02, 0.09), bill, 0, 0.225, 0.26);
      bk.rotation.x = 0.15;
      const wake = new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.1, -0.5, 0, -1.1, -0.42, 0, -1.1, 0, 0, 0.1, 0.42, 0, -1.1, 0.5, 0, -1.1], 3)), wakeMat);
      wake.position.y = 0.012;
      duck.add(wake);
      duck.position.y = WATER_LEVEL;
      group.add(duck);
      flock.push({ duck, x, z, r, speed, phase, push: new THREE.Vector2(), pos: new THREE.Vector2() });
    }
    const SPACE = 0.6; // closest two ducks may get, centre to centre
    let last = 0;
    live.push((t) => {
      const dt = Math.min(0.1, Math.max(0, t - last));
      last = t;
      for (const d of flock) {
        const a = t * d.speed + d.phase;
        d.push.multiplyScalar(Math.exp(-dt * 0.8)); // a nudge fades, so they drift back onto their loops
        d.pos.set(d.x + Math.cos(a) * d.r + d.push.x, d.z + Math.sin(a) * d.r * 0.6 + d.push.y);
        // face along the loop
        d.yaw = Math.atan2(-Math.sin(a) * Math.sign(d.speed), Math.cos(a) * 0.6 * Math.sign(d.speed));
      }
      // push overlapping pairs apart, half each
      for (let k = 0; k < 3; k++) {
        for (let i = 0; i < flock.length; i++) {
          for (let j = i + 1; j < flock.length; j++) {
            const A = flock[i], B = flock[j];
            const dx = B.pos.x - A.pos.x, dz = B.pos.y - A.pos.y, dist = Math.hypot(dx, dz) || 1e-4;
            if (dist >= SPACE) continue;
            const h = (SPACE - dist) / 2, nx = (dx / dist) * h, nz = (dz / dist) * h;
            A.pos.x -= nx; A.pos.y -= nz; A.push.x -= nx; A.push.y -= nz;
            B.pos.x += nx; B.pos.y += nz; B.push.x += nx; B.push.y += nz;
          }
        }
      }
      for (const d of flock) {
        d.duck.position.set(d.pos.x, WATER_LEVEL + Math.sin(t * 1.3 + d.phase) * 0.012, d.pos.y);
        d.duck.rotation.set(Math.sin(t * 1.1 + d.phase) * 0.04, d.yaw, 0);
      }
    });
  }

  // the end stop: a branch reaching over the path with a rope swing, lanterns and bunting
  for (const { x, z, yaw, h = 3.4, reach = 2.7, lamps = [], flags = 9 } of D.swings ?? []) {
    const y0 = ground(x, z);
    const g = new THREE.Group();
    g.position.set(x, y0 + h, z);
    g.rotation.y = yaw; // the branch grows along local -x
    group.add(g);
    // a limb leaving the trunk low and steep, levelling out over the path
    const limb = new THREE.CatmullRomCurve3([[0.1, -0.75], [-0.45, -0.2], [-reach * 0.5, 0.12], [-reach, 0.22]].map(([lx, ly]) => new THREE.Vector3(lx, ly, 0)));
    const limbGeo = new THREE.TubeGeometry(limb, 20, 1, 7);
    // taper: shrink each ring around the curve from 0.16 at the trunk to 0.06 at the tip
    const lp = limbGeo.attributes.position, ring = 8;
    for (let i = 0; i < lp.count; i++) {
      const u = Math.floor(i / ring) / 20, c = limb.getPoint(u), r = 0.16 - 0.1 * u;
      lp.setXYZ(i, c.x + (lp.getX(i) - c.x) * r, c.y + (lp.getY(i) - c.y) * r, c.z + (lp.getZ(i) - c.z) * r);
    }
    limbGeo.computeVertexNormals();
    add(g, limbGeo, wood);
    const limbY = (lx) => { let best = limb.getPoint(0); for (let i = 1; i <= 60; i++) { const p = limb.getPoint(i / 60); if (Math.abs(p.x - lx) < Math.abs(best.x - lx)) best = p; } return best.y; };
    // the seat hangs from a pivot on the branch and sways around it
    const sx = -reach * 0.72, top = limbY(sx) - 0.06, seatDrop = h + top - 0.55;
    const pivot = new THREE.Group();
    pivot.position.set(sx, top, 0);
    g.add(pivot);
    for (const side of [-1, 1]) add(pivot, new THREE.CylinderGeometry(0.014, 0.014, seatDrop, 5), rope, side * 0.26, -seatDrop / 2, 0);
    add(pivot, new THREE.BoxGeometry(0.66, 0.05, 0.24), plank, 0, -seatDrop, 0);
    live.push((t) => {
      pivot.rotation.z = Math.sin(t * 1.25) * 0.05 + Math.sin(t * 0.43 + 1) * 0.025;
      pivot.rotation.x = Math.sin(t * 0.9 + 0.4) * 0.03;
    });
    // lanterns on short cords
    for (const along of lamps) {
      const lx = -reach * along, cord = 0.45;
      const hang = new THREE.Group();
      hang.position.set(lx, limbY(lx) - 0.05, 0);
      g.add(hang);
      add(hang, new THREE.CylinderGeometry(0.007, 0.007, cord, 4), rope, 0, -cord / 2, 0);
      add(hang, new THREE.BoxGeometry(0.14, 0.03, 0.14), wood, 0, -cord, 0);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.16, 0.11), lamp);
      glass.position.y = -cord - 0.1;
      hang.add(glass);
      add(hang, new THREE.BoxGeometry(0.13, 0.025, 0.13), wood, 0, -cord - 0.19, 0);
      halo(hang, 0, -cord - 0.1, 0, 0.55, PAL.sunWarm, 0.5);
      live.push((t) => { hang.rotation.z = Math.sin(t * 1.7 + along * 5) * 0.06; });
    }
    // bunting draped under the branch
    const colors = [PAL.flower, PAL.flowerB, PAL.coneLit];
    const bunting = new THREE.Group();
    g.add(bunting);
    const cordPts = [];
    for (let i = 0; i < flags; i++) {
      const u = (i + 0.5) / flags, fx = -0.5 - u * (reach * 0.92 - 0.5), fy = limbY(-0.5) + (limbY(-reach * 0.92) - limbY(-0.5)) * u - 0.06 - Math.sin(u * Math.PI) * 0.3;
      cordPts.push(new THREE.Vector3(fx, fy, 0));
      const tri = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([-0.07, 0, 0, 0.07, 0, 0, 0, -0.17, 0], 3));
      tri.computeVertexNormals();
      const f = add(bunting, tri, flat(colors[i % 3], PAL.barkShd, 1.15), fx, fy, 0);
      live.push((t) => { f.rotation.x = Math.sin(t * 2.1 + i * 0.9) * 0.22; });
    }
    const cord = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cordPts), 24, 0.006, 4), rope);
    bunting.add(cord);
  }

  return {
    group,
    setMode(k) {
      lamp.uniforms.uOn.value = k;
      for (const s of halos) s.userData.mode = k;
    },
    update(t) {
      for (const f of live) f(t);
      for (const s of halos) s.material.opacity = (s.userData.mode ?? 1) * s.userData.strength * (s.userData.flicker ?? 1);
    },
  };
}
