// Start-up bakes off the main thread. Pure functions: the result is byte for byte what the page
// would compute itself.

import { baked, MOUNDS, terrainData } from '../world/heightfield.js';
import { scatterGrass } from '../world/scatter.js';
import { cloudNoiseData, makeGroundDetail } from './textures.js';

self.onmessage = ({ data: job }) => {
  if (job.kind === 'noise') {
    const data = cloudNoiseData(job.size);
    self.postMessage(data, [data.buffer]);
    return;
  }
  const t = terrainData(job.ao);
  // the scatter reads the same maps, so keep copies before the originals are handed over
  const keep = job.grass && { splat: t.splat.slice(), detail: t.detail.slice() };
  self.postMessage(t, [t.heights.buffer, t.splat.buffer, t.detail.buffer]);
  if (!keep) return;
  baked.splat = keep.splat;
  baked.detail = makeGroundDetail(256, keep.detail);
  MOUNDS.push(...job.mounds);
  const g = scatterGrass(job.grass);
  self.postMessage(g, Object.values(g).map((a) => a.buffer));
};
