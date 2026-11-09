import * as THREE from 'three';
import { Biped, Ribbon, inked, cmat, capsule, lathe, node } from './Rig.js';
import { Face } from './Face.js';
import { std } from '../gfx/Mat.js';

/** JUNO PIKE - a small, fearless, relentlessly curious sky-gardener in an oversized mustard raincoat. */
export class Juno extends Biped {
  constructor() {
    super({ legU: 0.17, legL: 0.17, footH: 0.1, hipX: 0.085, torsoH: 0.4, shX: 0.19, shY: 0.33, armU: 0.2, armL: 0.2, headY: 0.31, neckH: 0.03, stride: 1.9, bob: 0.03, lean: 0.14, slouch: 0, twist: 1, legSwing: 0.6, armSwing: 0.7, armOut: 0.12 });
    const n = this.n, skin = 0xc98a5e, coat = 0xe9b232, coatD = 0xc88a1c, boot = 0xd24c3a, scarf = 0x1fa7a0, hair = 0x4a2a1e;
    const mCoat = cmat(coat, { roughness: 0.75, map: null }), mCoatD = cmat(coatD, { roughness: 0.8 }), mSkin = cmat(skin, { roughness: 0.6 }), mBoot = cmat(boot, { roughness: 0.28, metalness: 0.0 });
    const mHair = cmat(hair, { roughness: 0.55 }), mScarf = cmat(scarf, { roughness: 0.9 }), mBrass = cmat(0xd2a24c, { roughness: 0.3, metalness: 0.85 }), mTight = cmat(0x3b3550), mPale = cmat(0xf4ead2);
    // torso: A-line coat
    inked(n.spine, lathe([[0.001, 0.0], [0.33, 0.0], [0.345, 0.03], [0.32, 0.12], [0.26, 0.24], [0.22, 0.34], [0.2, 0.4], [0.12, 0.44], [0.001, 0.45]], 28), mCoat, { p: [0, -0.04, 0], s: [1, 1, 0.9] });
    inked(n.spine, new THREE.TorusGeometry(0.335, 0.02, 8, 32), mPale, { p: [0, -0.02, 0], r: [Math.PI / 2, 0, 0], s: [1, 0.9, 1], outline: false });
    for (let i = 0; i < 3; i++) inked(n.spine, new THREE.SphereGeometry(0.026, 10, 8), mBrass, { p: [0, 0.06 + i * 0.1, 0.275 - i * 0.012], outline: false });
    for (const s of [-1, 1]) { inked(n.spine, new THREE.BoxGeometry(0.1, 0.09, 0.03), mCoatD, { p: [s * 0.15, 0.08, 0.27], r: [0.15, s * -0.35, 0] }); }
    inked(n.spine, new THREE.TorusGeometry(0.2, 0.05, 10, 24), mScarf, { p: [0, 0.4, 0.0], r: [Math.PI / 2, 0, 0], s: [1, 1, 1.15] });
    // hood hanging behind neck
    const hood = inked(n.spine, new THREE.SphereGeometry(0.2, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.65), mCoat, { p: [0, 0.36, -0.1], r: [Math.PI * 0.85, 0, 0], s: [1.1, 0.7, 0.9] });
    // satchel + weather vane
    const sat = node(n.spine, 'sat', 0, 0.16, -0.27);
    inked(sat, new THREE.BoxGeometry(0.26, 0.24, 0.12), cmat(0x7a4a32, { roughness: 0.8 }), { s: [1, 1, 1] });
    inked(sat, new THREE.BoxGeometry(0.27, 0.1, 0.13), cmat(0x93593b), { p: [0, 0.09, 0.0] });
    inked(sat, new THREE.SphereGeometry(0.025, 8, 8), mBrass, { p: [0, 0.07, 0.07], outline: false });
    this.lantern = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), new THREE.MeshBasicMaterial({ color: 0x9be9ff })); this.lantern.position.set(0.17, 0.1, 0.22); n.spine.add(this.lantern);
    this.vane = node(sat, 'vane', 0, 0.12, 0); inked(this.vane, new THREE.CylinderGeometry(0.008, 0.008, 0.28, 6), mBrass, { p: [0, 0.14, 0], outline: false });
    const arrow = inked(this.vane, new THREE.ConeGeometry(0.035, 0.12, 6), mBrass, { p: [0, 0.3, 0.07], r: [Math.PI / 2, 0, 0], outline: false }); inked(this.vane, new THREE.BoxGeometry(0.01, 0.08, 0.06), mBrass, { p: [0, 0.3, -0.06], outline: false });
    // legs
    for (const k of ['L', 'R']) {
      inked(n['hip' + k], capsule(0.045, 0.14), mTight, { p: [0, -0.1, 0] });
      inked(n['knee' + k], capsule(0.045, 0.12), mTight, { p: [0, -0.1, 0] });
      const f = n['foot' + k];
      inked(f, lathe([[0.001, 0], [0.085, 0.0], [0.095, 0.03], [0.085, 0.12], [0.09, 0.2], [0.11, 0.24], [0.001, 0.24]], 14), mBoot, { p: [0, 0, 0.012], s: [1, 1, 1.2] });
      inked(f, lathe([[0.001, -0.005], [0.1, -0.005], [0.105, 0.02], [0.001, 0.025]], 14), mPale, { p: [0, 0, 0.012], s: [1, 1, 1.25], outline: false });
      inked(f, new THREE.SphereGeometry(0.095, 12, 10), mBoot, { p: [0, 0.07, 0.1], s: [1, 0.85, 1.2] });
    }
    // arms
    for (const [k, s] of [['L', -1], ['R', 1]]) {
      const g = n['arm' + k + 'G'];
      inked(g, capsule(0.065, 0.16), mCoat, { p: [0, -0.11, 0] });
      inked(n['el' + k], capsule(0.06, 0.13), mCoat, { p: [0, -0.1, 0] });
      inked(n['el' + k], new THREE.TorusGeometry(0.062, 0.018, 8, 16), mPale, { p: [0, -0.2, 0], r: [Math.PI / 2, 0, 0], outline: false });
      const hand = inked(n['el' + k], new THREE.SphereGeometry(0.06, 12, 10), mSkin, { p: [0, -0.26, 0] });
      inked(hand, new THREE.SphereGeometry(0.028, 8, 8), mSkin, { p: [s * 0.04, 0.0, 0.035], outline: false });
      this['hand' + k] = hand;
    }
    // head
    const h = n.headC; this.hr = 0.3;
    const head = inked(h, new THREE.SphereGeometry(0.3, 32, 24), mSkin, { s: [1, 0.97, 1.02] });
    this.face = new Face({ r: 0.3, skin, eyeColor: 0x2f7d8f, eyeX: 0.33, eyeY: 0.04, eyeR: 0.3, brow: 0x3a2014, mouthY: -0.42, mouthW: 0.2, blush: 0xff7a6a });
    this.face.group.scale.set(1, 0.97, 1.02); h.add(this.face.group);
    inked(h, new THREE.SphereGeometry(0.045, 10, 8), cmat(0xd9976a), { p: [0, -0.15, 0.3], s: [1, 0.9, 0.9], outline: false });
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI - 0.1; for (const s of [-1, 1]) { if (i > 3) continue; const f = new THREE.Mesh(new THREE.CircleGeometry(0.009, 6), new THREE.MeshBasicMaterial({ color: 0x8a4a2c })); const x = s * (0.14 + (i % 3) * 0.03), y = -0.1 + ((i * 7) % 3) * 0.02; f.position.set(x, y, Math.sqrt(1 - (x / 0.3) ** 2 - (y / 0.3) ** 2) * 0.3 + 0.004); f.lookAt(x * 2, y * 2, 1); h.add(f); } }
    // hair: bob + fringe + two buns
    const hairGroup = node(h, 'hair');
    for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2, rr = 0.285; if (Math.cos(a - Math.PI / 2) > 0.5 && false) continue;
      const y = 0.1 + Math.sin(a * 3) * 0.04, ang = a; const px = Math.sin(ang) * rr * 0.98, pz = -Math.cos(ang) * rr * 0.86 - 0.02;
      if (pz > 0.12) continue; inked(hairGroup, new THREE.SphereGeometry(0.1 + (i % 3) * 0.012, 10, 8), mHair, { p: [px, y - (pz < -0.1 ? 0.12 : 0) , pz], outline: i % 2 === 0 }); }
    inked(hairGroup, new THREE.SphereGeometry(0.31, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.46), mHair, { p: [0, 0.03, -0.03], s: [1.0, 1, 1.03] });
    for (let i = 0; i < 6; i++) { const x = (i - 2.5) * 0.095; inked(hairGroup, new THREE.SphereGeometry(0.075, 8, 8), mHair, { p: [x, 0.2 - Math.abs(i - 2.5) * 0.02, 0.22 - Math.abs(i - 2.5) * 0.025], s: [1, 0.8, 0.8], outline: false }); }
    for (const s of [-1, 1]) { inked(hairGroup, new THREE.SphereGeometry(0.115, 14, 10), mHair, { p: [s * 0.2, 0.34, -0.02] }); inked(hairGroup, new THREE.TorusGeometry(0.085, 0.015, 6, 14), cmat(0xd24c3a), { p: [s * 0.2, 0.28, -0.02], r: [Math.PI / 2, 0.3 * s, 0], outline: false }); }
    // goggles on forehead
    const gog = node(h, 'goggles', 0, 0.2, 0.2); gog.rotation.x = -0.35;
    inked(gog, new THREE.TorusGeometry(0.31, 0.014, 6, 36, Math.PI * 1.2), cmat(0x5b3a28), { p: [0, -0.13, -0.17], r: [Math.PI / 2, 0, -Math.PI * 0.1], outline: false });
    for (const s of [-1, 1]) { inked(gog, new THREE.TorusGeometry(0.075, 0.022, 8, 20), mBrass, { p: [s * 0.1, 0, 0.0] });
      const gl = new THREE.Mesh(new THREE.CircleGeometry(0.065, 16), new THREE.MeshStandardMaterial({ color: 0x9fe6ff, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.6, emissive: 0x2a7a9a, emissiveIntensity: 0.4 })); gl.position.set(s * 0.1, 0, 0.003); gog.add(gl); }
    // scarf tail ribbons (world space)
    this.tails = [new Ribbon(null, { segs: 10, len: 1.0, w0: 0.065, w1: 0.05, color: scarf, stripe: 0xf4ead2 }), new Ribbon(null, { segs: 8, len: 0.7, w0: 0.06, w1: 0.045, color: scarf, stripe: 0xf4ead2 })];
    this.neckAnchor = new THREE.Object3D(); n.spine.add(this.neckAnchor); this.neckAnchor.position.set(0.1, 0.38, -0.18);
    this.face.set('neutral'); this.shadowR = 0.35;
  }
  addTo(scene) { scene.add(this.root); this.tails.forEach((t) => scene.add(t.mesh)); }
  tick(dt, time, c, wind) {
    this.animate(dt, c);
    this.face.update(dt, time);
    this.vane.rotation.y += ((Math.atan2(wind.x, wind.z) + Math.PI) - this.vane.rotation.y) * Math.min(1, dt * 3) + 0.4 * dt + c.speed * dt * 0.3;
    this.root.updateMatrixWorld(true);
    const a = new THREE.Vector3(); this.neckAnchor.getWorldPosition(a);
    const side = new THREE.Vector3(Math.cos(this.root.rotation.y), 0, -Math.sin(this.root.rotation.y));
    const vel = new THREE.Vector3(c.vx || 0, c.vy || 0, c.vz || 0);
    this.tails[0].update(dt, a, side, wind, vel);
    const a2 = a.clone().addScaledVector(side, -0.08).add(new THREE.Vector3(0, -0.02, 0));
    this.tails[1].update(dt, a2, side, wind, vel);
  }
}
