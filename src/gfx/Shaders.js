import * as THREE from 'three';
import { G } from './Mat.js';
const FOGV = '\n#include <fog_pars_vertex>\n', FOGF = '\n#include <fog_pars_fragment>\n';
const NOISE = `float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }`;
const fogU = () => THREE.UniformsUtils.merge([THREE.UniformsLib.fog]);

/** Upward-flowing water column. */
export function waterfallMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true,
    uniforms: { ...fogU(), uTime: G.uTime, uSat: G.uSat },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; ${FOGV}
      void main(){ vUv=uv; vec4 mvPosition=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mvPosition.xyz); gl_Position=projectionMatrix*mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `uniform float uTime,uSat; varying vec2 vUv; varying vec3 vN; varying vec3 vV; ${FOGF} ${NOISE}
      void main(){
        float y=vUv.y; float x=vUv.x*14.;
        float s=vn(vec2(x,y*5.-uTime*2.4))*.6+vn(vec2(x*2.3,y*11.-uTime*3.6))*.4;
        float streak=smoothstep(.35,.85,s);
        float fres=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);
        vec3 deep=vec3(.20,.62,.82), light=vec3(.80,.97,1.);
        vec3 c=mix(deep,light,streak*.8+fres*.5);
        float a=(.38+.5*streak+.3*fres)*smoothstep(0.,.07,y)*(1.-smoothstep(.84,1.,y));
        float l=dot(c,vec3(.299,.587,.114)); c=mix(vec3(l),c,max(uSat,.75));
        gl_FragColor=vec4(c,a);
        #include <fog_fragment>
      }`,
  });
}
/** Stylised water surface (pond / pools) with rain ripples and a frost blend. */
export function waterMaterial() {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: true,
    uniforms: { ...fogU(), uTime: G.uTime, uRain: { value: 0 }, uFrost: { value: 0 }, uSat: G.uSat, uDeep: { value: new THREE.Color(0x2f9fc4) }, uShallow: { value: new THREE.Color(0x8fe3e6) } },
    vertexShader: `varying vec2 vUv; varying vec3 vW; ${FOGV}
      void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vec4 mvPosition=viewMatrix*w; gl_Position=projectionMatrix*mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `uniform float uTime,uRain,uFrost,uSat; uniform vec3 uDeep,uShallow; varying vec2 vUv; varying vec3 vW; ${FOGF} ${NOISE}
      void main(){
        vec2 c=vUv-.5; float d=length(c)*2.;
        float n=vn(vW.xz*1.6+uTime*.25)*.5+vn(vW.xz*4.-uTime*.4)*.25;
        float rip=0.; vec2 q=floor(vW.xz*2.5); float ph=h21(q);
        for(int i=0;i<2;i++){ vec2 cell=floor(vW.xz*(1.6+float(i)*.9)); vec2 f=fract(vW.xz*(1.6+float(i)*.9))-.5; float t=fract(uTime*.8+h21(cell+float(i)*7.));
          rip+=smoothstep(.06,.0,abs(length(f)-t*.5))*(1.-t)*uRain*step(h21(cell),.55+uRain*.4); }
        vec3 col=mix(uShallow,uDeep,smoothstep(.1,1.,d)+n*.2);
        col+=vec3(rip*.7);
        float edge=smoothstep(.78,1.,d); col=mix(col,vec3(.95,1.,1.),edge*.55*(.6+n));
        vec3 ice=vec3(.82,.93,1.)*(.88+n*.2); col=mix(col,ice,uFrost*smoothstep(0.,.4,uFrost));
        float l=dot(col,vec3(.299,.587,.114)); col=mix(vec3(l),col,max(uSat,.8));
        float a=(.82-edge*.4)*(1.-smoothstep(.97,1.,d));
        gl_FragColor=vec4(col,a);
        #include <fog_fragment>
      }`,
  });
  return m;
}
/** Additive light shaft (sun beam). axis along local +Y, uv.y 0..1 */
export function beamMaterial(color = 0xfff0b0) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    uniforms: { uTime: G.uTime, uColor: { value: new THREE.Color(color) }, uPow: { value: 1 } },
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalMatrix*normal; vV=-mv.xyz; gl_Position=projectionMatrix*mv; }',
    fragmentShader: `uniform float uTime,uPow; uniform vec3 uColor; varying vec2 vUv; varying vec3 vN; varying vec3 vV; ${NOISE}
      void main(){ float f=abs(dot(normalize(vN),normalize(vV))); float n=vn(vec2(vUv.x*8.,vUv.y*6.-uTime*1.5))*.5+.5;
        float a=pow(f,1.6)*(.25+.35*n)*smoothstep(0.,.04,vUv.y)*(1.-smoothstep(.85,1.,vUv.y))*uPow;
        gl_FragColor=vec4(uColor*a*1.6,a); }`,
  });
}
