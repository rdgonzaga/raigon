// HDR render pipeline: MSAA half-float scene buffer -> bloom -> filmic shoulder + grade -> sRGB.
// MSAA matters twice here: it anti-aliases geometry and it lets the alpha-to-coverage foliage
// cards resolve into soft leaf edges instead of crunchy alpha-test pixels.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { G } from './shaderlib.js';

/**
 * Same bright-pass + blur pyramid as UnrealBloomPass, but the result is left in a texture for
 * the grade pass to add. The stock pass blends its result back into the multisampled scene
 * buffer, which makes the GPU load, store and resolve the whole 4x MSAA half-float target a
 * second time every frame - the single most expensive thing in the frame, for the same pixels.
 */
class BloomChainPass extends UnrealBloomPass {
  render(renderer, writeBuffer, readBuffer) {
    renderer.getClearColor(this._oldClearColor);
    this._oldClearAlpha = renderer.getClearAlpha();
    const oldAutoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.setClearColor(this.clearColor, 0);

    // 1. bright areas
    this.highPassUniforms['tDiffuse'].value = readBuffer.texture;
    this.highPassUniforms['luminosityThreshold'].value = this.threshold;
    this._fsQuad.material = this.materialHighPassFilter;
    renderer.setRenderTarget(this.renderTargetBright);
    renderer.clear();
    this._fsQuad.render(renderer);

    // 2. progressive separable blurs
    let input = this.renderTargetBright;
    for (let i = 0; i < this.nMips; i++) {
      const blur = this.separableBlurMaterials[i];
      this._fsQuad.material = blur;
      blur.uniforms['colorTexture'].value = input.texture;
      blur.uniforms['direction'].value = UnrealBloomPass.BlurDirectionX;
      renderer.setRenderTarget(this.renderTargetsHorizontal[i]);
      renderer.clear();
      this._fsQuad.render(renderer);
      blur.uniforms['colorTexture'].value = this.renderTargetsHorizontal[i].texture;
      blur.uniforms['direction'].value = UnrealBloomPass.BlurDirectionY;
      renderer.setRenderTarget(this.renderTargetsVertical[i]);
      renderer.clear();
      this._fsQuad.render(renderer);
      input = this.renderTargetsVertical[i];
    }

    // 3. composite the mips (left in renderTargetsHorizontal[0])
    this._fsQuad.material = this.compositeMaterial;
    this.compositeMaterial.uniforms['bloomStrength'].value = this.strength;
    this.compositeMaterial.uniforms['bloomRadius'].value = this.radius;
    this.compositeMaterial.uniforms['bloomTintColors'].value = this.bloomTintColors;
    renderer.setRenderTarget(this.renderTargetsHorizontal[0]);
    renderer.clear();
    this._fsQuad.render(renderer);

    renderer.setClearColor(this._oldClearColor, this._oldClearAlpha);
    renderer.autoClear = oldAutoClear;
  }

  get texture() {
    return this.renderTargetsHorizontal[0].texture;
  }
}

const GradeShader = {
  name: 'GradeShader',
  uniforms: {
    tDiffuse: { value: null },
    tBloom: { value: null },
    uBloom: { value: 1.0 },
    uExposure: { value: 1.0 },
    uSaturation: { value: 1.0 },
    uContrast: { value: 1.0 },
    uVignette: { value: 0.1 },
    uLift: { value: new THREE.Vector3(0, 0, 0) },
    uGain: { value: new THREE.Vector3(1, 1, 1) },
    uTime: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform sampler2D tBloom;
    uniform float uBloom;
    uniform float uExposure;
    uniform float uSaturation;
    uniform float uContrast;
    uniform float uVignette;
    uniform vec3 uLift;
    uniform vec3 uGain;
    uniform float uTime;
    varying vec2 vUv;

    // Hue-preserving shoulder: identity below ~0.78 so authored colours land exactly where they
    // were measured, with a soft filmic roll-off (and slight desaturation) for the highlights.
    vec3 shoulder(vec3 c) {
      float peak = max(c.r, max(c.g, c.b));
      const float start = 0.78;
      if (peak <= start) return c;
      float d = 1.0 - start;
      float newPeak = 1.0 - d * d / (peak + d - start);
      vec3 r = c * (newPeak / peak);
      float g = 1.0 - 1.0 / (0.15 * (peak - newPeak) + 1.0);
      return mix(r, vec3(newPeak), g);
    }

    vec3 toSRGB(vec3 c) {
      return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
    }

    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    void main() {
      vec3 c = max(texture2D(tDiffuse, vUv).rgb + texture2D(tBloom, vUv).rgb * uBloom, vec3(0.0)) * uExposure;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, uSaturation);
      c = c * uGain + uLift;
      c = shoulder(max(c, vec3(0.0)));
      c = toSRGB(c);
      c = (c - 0.5) * uContrast + 0.5;
      vec2 q = (vUv - 0.5) * vec2(1.0, 0.86);
      c *= 1.0 - uVignette * smoothstep(0.32, 0.78, length(q));
      c += (hash12(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) / 255.0;
      gl_FragColor = vec4(c, 1.0);
    }
  `,
};

export function createPipeline(renderer, scene, camera, quality) {
  const target = new THREE.WebGLRenderTarget(4, 4, {
    type: THREE.HalfFloatType,
    samples: quality.msaa,
    depthBuffer: true,
    // nothing reads scene depth after the pass, so don't pay to resolve the multisampled depth
    resolveDepthBuffer: false,
  });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new BloomChainPass(new THREE.Vector2(4, 4), 0.1, 0.55, 0.72);
  composer.addPass(bloom);

  const grade = new ShaderPass(GradeShader);
  grade.uniforms.tBloom.value = bloom.texture;
  composer.addPass(grade);

  function setSize(width, height, pixelRatio) {
    composer.setPixelRatio(pixelRatio);
    composer.setSize(width, height);
    G.uResolution.value.set(composer.renderTarget1.width, composer.renderTarget1.height);
  }

  const pipeline = { composer, bloom, grade, setSize, render, bloomAuto: true };

  /**
   * @param {boolean} brightInView whether anything can reach the bloom threshold this frame.
   * On the locked-off hero shot nothing does (the sun is behind the camera), so the whole bloom
   * chain is skipped there - it would add exactly zero. `bloomAuto = false` forces it on.
   */
  function render(brightInView = true) {
    bloom.enabled = bloom.strength > 0 && (brightInView || !pipeline.bloomAuto);
    grade.uniforms.uBloom.value = bloom.enabled ? 1 : 0;
    composer.render();
  }

  return pipeline;
}
