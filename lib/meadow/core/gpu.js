// CPU rasterisers WebGL falls back to when the GPU is disabled or blocklisted
const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render/i;

/** True when the unmasked renderer name belongs to a software rasteriser. */
export function isSoftwareRenderer(name) {
  return SOFTWARE.test(name ?? '');
}

/**
 * Desktop preset from the GPU name and the machine's size. Integrated graphics on office laptops
 * can't hold the high preset; unknown names stay high and the resolution step-down covers the rest.
 */
export function desktopTier(name = '', cores = 8, memoryGB = 8) {
  const weakMachine = cores <= 4 || memoryGB <= 4;
  if (/intel.*(uhd|hd graphics)|intel\(r\) graphics|mali|powervr/i.test(name)) return 'low';
  if (/iris|radeon\(tm\)( \d+m)? graphics|radeon vega|vega \d+ graphics/i.test(name)) return weakMachine ? 'low' : 'medium';
  return weakMachine ? 'medium' : 'high';
}

/** Unmasked renderer name from a throwaway context ('' when the browser hides it). */
export function probeRendererName() {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) return '';
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const name = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : '';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return name;
  } catch {
    return '';
  }
}
