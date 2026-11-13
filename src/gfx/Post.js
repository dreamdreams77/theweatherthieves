import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { G } from './Mat.js';

/** Optional film look: soft bloom on bright things (lanterns, beams, glints, Sunny) + gentle vignette and warm lift (+ clay grade/grain). */
export class Post {
  constructor(renderer, scene, camera) {
    this.renderer = renderer; this.composer = new EffectComposer(renderer); this.composer.addPass(new RenderPass(scene, camera));
    const s = renderer.getSize(new THREE.Vector2()); this.bloom = new UnrealBloomPass(new THREE.Vector2(s.x / 2, s.y / 2), 0.45, 0.6, 0.82); this.composer.addPass(this.bloom);
    // grade: vignette + warm lift, and (claymation look) violet-tinted shadows / warm highlights, 12 fps film grain and a faint
    // per-exposure brightness flicker, like a stop-motion camera whose lamps never quite match between frames
    this.grade = new ShaderPass({ uniforms: { tDiffuse: { value: null }, uVig: { value: 0.32 }, uWarm: { value: 0.03 }, uClay: G.uClay, uBoil: G.uBoil, uTime: G.uTime, uRes: { value: new THREE.Vector2(s.x, s.y) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `uniform sampler2D tDiffuse; uniform float uVig,uWarm,uClay,uBoil,uTime; uniform vec2 uRes; varying vec2 vUv;
        float hh(vec2 p){ vec3 q=fract(vec3(p.xyx)*.1031); q+=dot(q,q.yzx+33.33); return fract((q.x+q.y)*q.z); }
        void main(){ vec4 c=texture2D(tDiffuse,vUv); vec2 d=vUv-.5; float v=smoothstep(.85,.25,length(d*vec2(1.1,1.))); c.rgb*=mix(1.-uVig,1.,v); c.rgb+=vec3(uWarm,uWarm*.6,0.)*v;
          if (uClay > 0.) {
            float fr=floor(uTime*12.)*step(.0001,uBoil), l=dot(c.rgb,vec3(.299,.587,.114)), sh=1.-smoothstep(0.,.45,l), hi=smoothstep(.45,1.2,l);
            c.rgb=mix(c.rgb, c.rgb*vec3(.9,.88,1.08)+vec3(.012,.004,.03), sh*.4*uClay);
            c.rgb*=mix(vec3(1.), vec3(1.04,1.,.93), hi*uClay);
            float g=hh(floor(vUv*uRes*.75)+fr*vec2(37.,17.))-.5; c.rgb*=1.+g*.028*uClay;
            c.rgb*=1.+(hh(vec2(fr,3.7))-.5)*.01*step(.0001,uBoil)*uClay;
          }
          gl_FragColor=c; }` });
    this.composer.addPass(this.grade); this.composer.addPass(new OutputPass());
  }
  setSize(w, h, dpr) { this.composer.setPixelRatio(dpr); this.composer.setSize(w, h); this.grade.uniforms.uRes.value.set(w * dpr, h * dpr); }
  dispose() { for (const p of this.composer.passes) p.dispose?.(); this.composer.dispose(); }
  render() { const u = this.grade.uniforms; u.uTime.value = G.uTime.value; u.uClay.value = G.uClay.value; u.uBoil.value = G.uBoil.value; this.composer.render(); } // ShaderPass clones uniforms, so sync the shared ones
}
