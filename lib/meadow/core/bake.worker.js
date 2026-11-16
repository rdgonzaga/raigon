// Start-up bakes off the main thread. Pure functions: the result is byte for byte what the page
// would compute itself.

import { terrainData } from '../world/heightfield.js';
import { cloudNoiseData } from './textures.js';

self.onmessage = ({ data: job }) => {
  if (job.kind === 'noise') {
    const data = cloudNoiseData(job.size);
    self.postMessage(data, [data.buffer]);
  } else {
    const t = terrainData(job.ao);
    self.postMessage(t, [t.heights.buffer, t.splat.buffer, t.detail.buffer]);
  }
};
