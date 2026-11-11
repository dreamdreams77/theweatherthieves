import * as THREE from 'three';
import { G } from './Mat.js';
import { rng } from '../core/Utils.js';

const NOISE = `
float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float a=.5,s=0.; for(int i=0;i<5;i++){ s+=a*vn(p); p=p*2.03+7.1; a*=.5; } return s; }
`;
/** Sky dome, glowing sun, cloud sea and parallax cloud banks. */
export class Sky {
  constructor(scene, sunDir, quality) {
    this.group = new THREE.Group(); scene.add(this.group);
    this.restore = { value: 0 };
    this.sunDir = sunDir.clone().normalize();
    this.tint = { value: new THREE.Vector4(0.5, 0.5, 0.5, 0) }; const u = { uRestore: this.restore, uSun: { value: this.sunDir }, uTime: G.uTime, uTint: this.tint };
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 20), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, uniforms: u,
      vertexShader: 'varying vec3 vD; void main(){ vD=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position.z=gl_Position.w; }',
      fragmentShader: `uniform float uRestore,uTime; uniform vec3 uSun; uniform vec4 uTint; varying vec3 vD; ${NOISE}
      void main(){
        vec3 d=normalize(vD); float h=d.y; float r=uRestore;
        vec3 zen=mix(vec3(.23,.27,.45),vec3(.16,.42,.86),r);
        vec3 mid=mix(vec3(.47,.50,.68),vec3(.46,.68,.95),r);
        vec3 hor=mix(vec3(.80,.72,.80),vec3(1.,.80,.60),r);
        vec3 col=mix(hor,mid,smoothstep(0.,.18,h)); col=mix(col,zen,smoothstep(.12,.9,h));
        col=mix(col,hor*.9,smoothstep(0.,-.35,h));
        float sd=max(dot(d,uSun),0.);
        vec3 sc=mix(vec3(.85,.85,1.),vec3(1.,.86,.55),r);
        col+=sc*(pow(sd,900.)*(.5+3.5*r)+pow(sd,24.)*(.1+.3*r)+pow(sd,4.)*(.05+.14*r));
        // high wispy streaks
        vec2 uv=d.xz/(abs(h)+.35)*2.2+uTime*.004;
        float w=smoothstep(.45,.9,fbm(uv*vec2(1.,3.)))*smoothstep(.0,.25,h)*.35;
        col=mix(col,mix(vec3(.9,.88,.95),vec3(1.,.93,.86),r),w);
        float lum=dot(col,vec3(.299,.587,.114)); col=mix(col,uTint.rgb*(.35+lum*.9),uTint.a);
        gl_FragColor=vec4(col,1.); }`,
    }));
    this.dome.renderOrder = -10; this.group.add(this.dome);

    // cloud sea
    this.sea = new THREE.Mesh(new THREE.CircleGeometry(1500, 64).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, fog: false, uniforms: { ...u, uCenter: { value: new THREE.Vector3() } },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
      fragmentShader: `uniform float uRestore,uTime; uniform vec3 uSun; uniform vec4 uTint; varying vec3 vW; ${NOISE}
      void main(){
        vec2 p=vW.xz*.006+vec2(uTime*.004,uTime*.002);
        float n=fbm(p*1.3)*1.0+fbm(p*4.)*.35;
        float dens=smoothstep(.33,.78,n);
        vec3 sunC=mix(vec3(.90,.88,.97),vec3(1.,.93,.80),uRestore);
        vec3 shC=mix(vec3(.45,.46,.62),vec3(.55,.55,.78),uRestore);
        float lit=clamp(.5+(fbm(p*1.3+uSun.xz*.06)-fbm(p*1.3))*7.,0.,1.);
        vec3 c=mix(shC,sunC,lit*dens+(1.-dens)*.3);
        vec3 hor=mix(vec3(.80,.72,.80),vec3(1.,.80,.60),uRestore);
        float dist=length(vW.xz-cameraPosition.xz);
        c=mix(c,hor,smoothstep(120.,1100.,dist));
        float a=mix(.55,1.,dens)*(1.-smoothstep(900.,1400.,dist));
        float lm=dot(c,vec3(.299,.587,.114)); c=mix(c,uTint.rgb*(.35+lm*.9),uTint.a);
        gl_FragColor=vec4(c,a); }`,
    }));
    this.sea.position.y = -52; this.group.add(this.sea);
    this.sea2 = this.sea.clone(); this.sea2.position.y = -78; this.group.add(this.sea2);

    // parallax cloud banks (instanced puffs)
    const n = quality.mobile ? 70 : 150, geo = new THREE.IcosahedronGeometry(1, 2);
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, fog: true });
    this.banks = new THREE.InstancedMesh(geo, mat, n); const r = rng(77), m = new THREE.Matrix4(), c = new THREE.Color();
    this.bankData = [];
    for (let i = 0; i < n; i++) {
      const a = r() * 6.283, rad = 90 + r() * 330, s = 14 + r() * 34, y = -48 + r() * 40 - (rad > 250 ? 0 : 10);
      const x = Math.cos(a) * rad, z = Math.sin(a) * rad;
      this.bankData.push({ x, y, z, s, sy: 0.55 + r() * 0.3, sp: 0.2 + r() * 0.4 });
      c.setHSL(0.62, 0.15, 0.78 + r() * 0.2); this.banks.setColorAt(i, c);
    }
    this.banks.frustumCulled = false; this.group.add(this.banks);
    this._m = m; this.updateBanks(0);
  }
  updateBanks(t) {
    const m = this._m; this.bankData.forEach((b, i) => { m.makeScale(b.s * 1.5, b.s * b.sy, b.s * 1.2); m.setPosition(b.x + Math.sin(t * 0.02 * b.sp + i) * 20, b.y, b.z); this.banks.setMatrixAt(i, m); });
    this.banks.instanceMatrix.needsUpdate = true;
  }
  update(t, camPos) { this.dome.position.copy(camPos); this._acc = (this._acc || 0) + 1; if (this._acc % 6 === 0) this.updateBanks(t); }
}
