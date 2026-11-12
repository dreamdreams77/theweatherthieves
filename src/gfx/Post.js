import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/** Optional film look: soft bloom on bright things (lanterns, beams, glints, Sunny) + gentle vignette and warm lift. */
export class Post {
  constructor(renderer, scene, camera) {
    this.renderer = renderer; this.composer = new EffectComposer(renderer); this.composer.addPass(new RenderPass(scene, camera));
    const s = renderer.getSize(new THREE.Vector2()); this.bloom = new UnrealBloomPass(new THREE.Vector2(s.x / 2, s.y / 2), 0.45, 0.6, 0.82); this.composer.addPass(this.bloom);
    this.grade = new ShaderPass({ uniforms: { tDiffuse: { value: null }, uVig: { value: 0.32 }, uWarm: { value: 0.03 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `uniform sampler2D tDiffuse; uniform float uVig,uWarm; varying vec2 vUv;
        void main(){ vec4 c=texture2D(tDiffuse,vUv); vec2 d=vUv-.5; float v=smoothstep(.85,.25,length(d*vec2(1.1,1.))); c.rgb*=mix(1.-uVig,1.,v); c.rgb+=vec3(uWarm,uWarm*.6,0.)*v; gl_FragColor=c; }` });
    this.composer.addPass(this.grade); this.composer.addPass(new OutputPass());
  }
  setSize(w, h, dpr) { this.composer.setPixelRatio(dpr); this.composer.setSize(w, h); }
  render() { this.composer.render(); }
}
