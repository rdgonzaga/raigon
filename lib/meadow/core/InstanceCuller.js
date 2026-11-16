// Per-instance visibility for InstancedMesh sets (trees, bushes).
//
// three.js can only frustum-cull an InstancedMesh as a whole, so a forest that surrounds the
// camera is always fully submitted - twice, once for the view and once for the shadow map. This
// keeps each set's instances partitioned as
//
//     [ visible ][ off-screen, but their shadow reaches the screen ][ neither ]
//
// and draws only the prefix each pass needs: the first group for the main pass, the first two for
// the shadow pass. Nothing that can contribute a pixel (directly or through its shadow) is ever
// skipped, so the image is unchanged; the GPU just stops shading what nobody can see.

import * as THREE from 'three';

const _pv = new THREE.Matrix4();
const _frustum = new THREE.Frustum();
const _sphere = new THREE.Sphere();
const GROUND = -1.5; // lowest height a shadow can land on (below the stream bed)

export class InstanceCuller {
  /** @param {THREE.Vector3} sunDir unit vector pointing towards the sun */
  constructor(sunDir) {
    this.light = sunDir.clone().negate(); // direction the light travels
    this.sets = [];
  }

  /**
   * @param {THREE.InstancedMesh[]} meshes meshes sharing one instance order (a tree's bark + foliage)
   * @param {Float32Array} bounds [x, y, z, radius] per instance, world space, generous enough to
   *        cover sway and billboard extents
   */
  add(meshes, bounds) {
    const n = bounds.length / 4;
    const set = { meshes, bounds, n, nView: n, nShadow: n, cls: new Uint8Array(n), order: new Uint16Array(n), buffers: [] };
    for (let i = 0; i < n; i++) set.order[i] = i;
    for (const mesh of meshes) {
      // snapshot every per-instance buffer so it can be rewritten in any order
      const attrs = [mesh.instanceMatrix];
      for (const name in mesh.geometry.attributes) {
        const a = mesh.geometry.attributes[name];
        if (a.isInstancedBufferAttribute) attrs.push(a);
      }
      for (const attr of attrs) set.buffers.push({ attr, source: attr.array.slice(), size: attr.itemSize });
      mesh.onBeforeRender = () => { mesh.count = set.nView; };
      mesh.onBeforeShadow = () => { mesh.count = set.nShadow; };
    }
    this.sets.push(set);
  }

  /** 0 = on screen, 1 = only its shadow is, 2 = neither. */
  classify(bounds, i) {
    const x = bounds[i * 4], y = bounds[i * 4 + 1], z = bounds[i * 4 + 2], r = bounds[i * 4 + 3];
    _sphere.center.set(x, y, z);
    _sphere.radius = r;
    if (_frustum.intersectsSphere(_sphere)) return 0;
    // sweep the bound along the light down to the ground: the volume its shadow can occupy
    const L = this.light;
    const reach = (y + r - GROUND) / -L.y;
    const steps = Math.max(1, Math.ceil(reach / r));
    _sphere.radius = r * 1.3; // spheres one radius apart with 1.3x radius cover the whole capsule
    for (let j = 1; j <= steps; j++) {
      const t = (reach * j) / steps;
      _sphere.center.set(x + L.x * t, y + L.y * t, z + L.z * t);
      if (_frustum.intersectsSphere(_sphere)) return 1;
    }
    return 2;
  }

  update(camera) {
    _pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_pv, camera.coordinateSystem, camera.reversedDepth);
    for (const set of this.sets) {
      let changed = false;
      for (let i = 0; i < set.n; i++) {
        const c = this.classify(set.bounds, i);
        if (c !== set.cls[i]) { set.cls[i] = c; changed = true; }
      }
      if (!changed) continue;
      let k = 0;
      set.nView = 0;
      set.nShadow = 0;
      for (let pass = 0; pass < 3; pass++) {
        for (let i = 0; i < set.n; i++) {
          if (set.cls[i] !== pass) continue;
          set.order[k++] = i;
          if (pass === 0) set.nView++;
          if (pass <= 1) set.nShadow++;
        }
      }
      for (const { attr, source, size } of set.buffers) {
        const dst = attr.array;
        for (let j = 0; j < set.n; j++) {
          const from = set.order[j] * size, to = j * size;
          for (let c = 0; c < size; c++) dst[to + c] = source[from + c];
        }
        attr.needsUpdate = true;
      }
    }
  }
}
