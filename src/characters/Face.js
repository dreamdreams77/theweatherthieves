import * as THREE from 'three';
import { std } from '../gfx/Mat.js';
import { clamp, damp, lerp } from '../core/Utils.js';

export const EXPR = {
  neutral:   { open: 1,    squint: 0,   tilt: 0,     browY: 0,    browTilt: 0,    curve: 0.15, mouthOpen: 0,    mouthW: 1,   pupil: 1,    blush: 0.2 },
  happy:     { open: 1,    squint: 0.5, tilt: 0,     browY: 0.3,  browTilt: -0.1, curve: 1,    mouthOpen: 0.15, mouthW: 1.15, pupil: 1.1, blush: 0.7 },
  excited:   { open: 1.3,  squint: 0.1, tilt: -0.05, browY: 0.8,  browTilt: -0.2, curve: 1,    mouthOpen: 0.8,  mouthW: 1.2, pupil: 1.3,  blush: 0.8 },
  sad:       { open: 0.8,  squint: 0,   tilt: -0.35, browY: -0.1, browTilt: -0.45,curve: -0.8, mouthOpen: 0,    mouthW: 0.8, pupil: 1.2,  blush: 0.1 },
  worried:   { open: 1.1,  squint: 0,   tilt: -0.25, browY: 0.4,  browTilt: -0.5, curve: -0.4, mouthOpen: 0.15, mouthW: 0.9, pupil: 0.9,  blush: 0.1 },
  angry:     { open: 0.85, squint: 0.2, tilt: 0.45,  browY: -0.3, browTilt: 0.5,  curve: -0.7, mouthOpen: 0.1,  mouthW: 1,   pupil: 0.8,  blush: 0.35 },
  surprised: { open: 1.5,  squint: 0,   tilt: -0.1,  browY: 1,    browTilt: -0.1, curve: 0,    mouthOpen: 0.9,  mouthW: 0.7, pupil: 0.7,  blush: 0.3 },
  smug:      { open: 0.7,  squint: 0.15,tilt: 0.12,  browY: 0.1,  browTilt: 0.15, curve: 0.7,  mouthOpen: 0,    mouthW: 1.0, pupil: 1,    blush: 0.3 },
  sleepy:    { open: 0.35, squint: 0.1, tilt: -0.1,  browY: -0.2, browTilt: -0.1, curve: 0.1,  mouthOpen: 0.05, mouthW: 0.9, pupil: 1,    blush: 0.3 },
  gloom:     { open: 0.55, squint: 0,   tilt: -0.28, browY: -0.25,browTilt: -0.3, curve: -0.55,mouthOpen: 0,    mouthW: 1.1, pupil: 1.1,  blush: 0 },
  cringe:    { open: 0.3,  squint: 0.9, tilt: 0.1,   browY: 0.2,  browTilt: -0.3, curve: -0.3, mouthOpen: 0.4,  mouthW: 1.3, pupil: 1,    blush: 0.2 },
  love:      { open: 1.15, squint: 0.3, tilt: -0.15, browY: 0.5,  browTilt: -0.3, curve: 1,    mouthOpen: 0.1,  mouthW: 1,   pupil: 1.5,  blush: 1 },
};

/** Expressive eyes + lids + brows + mouth that sit on a spherical head of radius r (faces +Z). */
export class Face {
  constructor({ r = 0.4, skin = 0xf0b894, eyeColor = 0x3a6e8a, eyeX = 0.34, eyeY = 0.1, eyeR = 0.27, brow = 0x3a2418, mouthY = -0.4,
    mouthW = 0.22, blush = 0xff7f7f, lashes = false, sclera = 0xfffaf0, eyeSq = 1, browW = 1 } = {}) {
    this.r = r; this.group = new THREE.Group(); this.cur = { ...EXPR.neutral }; this.tgt = { ...EXPR.neutral };
    this.look = new THREE.Vector3(0, 0, 1); this.lookCur = new THREE.Vector3(0, 0, 1);
    this.blinkT = 2 + Math.random() * 3; this.blinkV = 0; this.talk = 0; this.eyes = [];
    const skinM = std({ color: skin, roughness: 0.62 });
    const scl = std({ color: sclera, roughness: 0.25 });
    const iris = std({ color: eyeColor, roughness: 0.25, emissive: eyeColor, emissiveIntensity: 0.18 });
    const dark = new THREE.MeshBasicMaterial({ color: 0x14101a });
    const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const browM = std({ color: brow, roughness: 0.9 });
    const surf = (x, y, off = 0) => { const zz = Math.sqrt(Math.max(0.05, 1 - (x / r) ** 2 - (y / r) ** 2)) * r; return zz + off; };
    const eR = eyeR * r, lidR = eR * 1.14;
    for (const s of [-1, 1]) {
      const ex = eyeX * r * s, ey = eyeY * r, ez = surf(ex, ey, -eR * 0.12);
      const eg = new THREE.Group(); eg.position.set(ex, ey, ez);
      eg.lookAt(ex * 1.2, ey * 0.7, ez + 2); // face outward along sphere normal-ish
      const sc = new THREE.Mesh(new THREE.SphereGeometry(eR, 20, 14), scl); sc.scale.set(1, 1.08 * eyeSq, 0.62); eg.add(sc);
      const ball = new THREE.Group(); eg.add(ball);
      const ir = new THREE.Mesh(new THREE.SphereGeometry(eR * 0.66, 18, 12), iris); ir.scale.set(1, 1.05, 0.22); ir.position.z = eR * 0.5; ball.add(ir);
      const pu = new THREE.Mesh(new THREE.CircleGeometry(eR * 0.34, 16), dark); pu.position.z = eR * 0.5 + eR * 0.66 * 0.22 + 0.002; ball.add(pu);
      const hl = new THREE.Mesh(new THREE.CircleGeometry(eR * 0.14, 10), white); hl.position.set(eR * 0.2, eR * 0.24, pu.position.z + 0.002); ball.add(hl);
      const hl2 = new THREE.Mesh(new THREE.CircleGeometry(eR * 0.07, 8), white); hl2.position.set(-eR * 0.18, -eR * 0.2, pu.position.z + 0.002); ball.add(hl2);
      const lidP = new THREE.Group(); eg.add(lidP);
      const lid = new THREE.Mesh(new THREE.SphereGeometry(lidR, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), skinM); lid.scale.set(1, 1, 0.78); lid.castShadow = false; lidP.add(lid);
      const lowP = new THREE.Group(); eg.add(lowP);
      const low = new THREE.Mesh(new THREE.SphereGeometry(lidR, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), skinM); low.scale.set(1, 1, 0.78); lowP.add(low);
      this.group.add(eg);
      // brow
      const br = new THREE.Mesh(new THREE.CapsuleGeometry(0.05 * r, 0.42 * r * browW, 4, 8), browM); br.rotation.z = Math.PI / 2;
      const bg = new THREE.Group(); bg.add(br); this.group.add(bg);
      const bx = ex * 0.98, by0 = (eyeY + eyeR + 0.2) * r;
      this.eyes.push({ s, eg, ball, lidP, lowP, bg, bx, by0, bz: surf(bx, by0) + 0.01 * r, pu, hl });
    }
    // mouth
    this.mouthG = new THREE.Group(); this.mouthG.position.set(0, mouthY * r, surf(0, mouthY * r, 0.01 * r)); this.mouthG.rotation.x = 0.12;
    this.mouthR = mouthW * r;
    this.arc = new THREE.Mesh(new THREE.TorusGeometry(1, 0.075, 6, 20, Math.PI), std({ color: 0x4a2430, roughness: 0.6 }));
    this.mouthG.add(this.arc);
    this.hole = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: 0x3a1018 }));
    this.hole.scale.set(1, 0.1, 0.25); this.mouthG.add(this.hole);
    this.tongue = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xe8626f }));
    this.mouthG.add(this.tongue);
    this.group.add(this.mouthG);
    // cheeks
    const cm = new THREE.MeshBasicMaterial({ color: blush, transparent: true, opacity: 0.4, depthWrite: false });
    this.cheeks = [-1, 1].map((s) => { const c = new THREE.Mesh(new THREE.CircleGeometry(0.15 * r, 14), cm.clone()); const x = s * 0.62 * r, y = -0.16 * r;
      c.position.set(x, y, surf(x, y, 0.004 * r)); c.lookAt(x * 2, y * 1.3, c.position.z + 1.2 * r); this.group.add(c); return c; });
    this.skinM = skinM; this.irisM = iris;
  }
  set(name, o) { Object.assign(this.tgt, EXPR[name] || EXPR.neutral, o || {}); this.name = name; }
  lookAt(v) { this.look.copy(v); }
  blink() { this.blinkV = 0.0001; }
  update(dt, t) {
    const c = this.cur, g = this.tgt, k = 9;
    for (const key in g) c[key] = damp(c[key], g[key], k, dt);
    this.blinkT -= dt;
    if (this.blinkT <= 0 && this.blinkV === 0) { this.blinkV = 0.0001; this.blinkT = 2 + Math.random() * 3.5; if (Math.random() < 0.2) this.blinkT = 0.25; }
    if (this.blinkV > 0) { this.blinkV += dt / 0.16; if (this.blinkV >= 2) this.blinkV = 0; }
    const blink = this.blinkV > 0 ? 1 - Math.abs(this.blinkV - 1) : 0;
    this.lookCur.lerp(this.look, 1 - Math.exp(-14 * dt));
    const lx = clamp(this.lookCur.x, -1, 1), ly = clamp(this.lookCur.y, -0.8, 0.8);
    for (const e of this.eyes) {
      const open = clamp(c.open, 0, 1.6);
      const o = clamp(open * (1 - blink), 0, 1.6);
      e.lidP.rotation.x = lerp(Math.PI * 0.5, -0.9, clamp(o / 1.3, 0, 1)) ; e.lidP.rotation.z = e.s * c.tilt;
      e.lowP.rotation.x = lerp(1.25, -0.5, clamp(c.squint + blink * 0.3, 0, 1)); e.lowP.rotation.z = -e.s * c.tilt * 0.3;
      e.ball.rotation.set(-ly * 0.45, lx * 0.5, 0);
      e.pu.scale.setScalar(c.pupil);
      e.bg.position.set(e.bx, e.by0 + c.browY * 0.1 * this.r + (1 - Math.min(o, 1)) * -0.03 * this.r, e.bz);
      e.bg.rotation.z = e.s * c.browTilt * 0.7; e.bg.rotation.x = -0.25;
    }
    const talk = this.talk > 0 ? (0.25 + 0.75 * Math.abs(Math.sin(t * 14) * Math.sin(t * 5.3 + 1))) * this.talk : 0;
    const mo = clamp(c.mouthOpen + talk * 0.55, 0, 1);
    const W = this.mouthR * c.mouthW;
    this.arc.visible = mo < 0.12; this.hole.visible = this.tongue.visible = mo >= 0.12;
    const cv = c.curve;
    this.arc.scale.set(W, W * Math.abs(cv) * 0.75 + 0.0001, W); this.arc.rotation.z = cv > 0 ? Math.PI : 0; this.arc.position.y = cv > 0 ? W * 0.5 * Math.abs(cv) : -W * 0.3 * Math.abs(cv);
    this.hole.scale.set(W * (0.75 + 0.2 * (1 - mo)), Math.max(0.01, W * mo * 0.9), W * 0.25);
    this.hole.position.y = -this.hole.scale.y * 0.5 + (cv > 0 ? W * 0.12 : 0);
    this.tongue.scale.set(W * 0.4, this.hole.scale.y * 0.4, W * 0.15); this.tongue.position.set(0, this.hole.position.y - this.hole.scale.y * 0.45, 0.002);
    for (const ch of this.cheeks) ch.material.opacity = 0.15 + c.blush * 0.5;
  }
}
