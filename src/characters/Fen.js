import * as THREE from 'three';
import { Biped, Ribbon, inked, cmat, capsule, lathe, node } from './Rig.js';
import { Face } from './Face.js';

/** FENNIMORE GLOOM - tall, damp, wonderfully pessimistic ex-forecaster with a personal raincloud. */
export class Fen extends Biped {
  constructor() {
    super({ legU: 0.45, legL: 0.45, footH: 0.1, hipX: 0.11, torsoH: 0.78, shX: 0.22, shY: 0.7, armU: 0.42, armL: 0.42, headY: 0.34, neckH: 0.12, stride: 1.1, bob: 0.025, lean: 0.1, slouch: 0.16, twist: 0.8, legSwing: 0.45, armSwing: 0.4, armOut: 0.06 });
    const n = this.n, skin = 0xe3c8b0, coat = 0x38566b, coatD = 0x2a4152, pants = 0x3a3a46, grey = 0xb8b4b2;
    const mCoat = cmat(coat, { roughness: 0.85 }), mCoatD = cmat(coatD, { roughness: 0.85 }), mSkin = cmat(skin, { roughness: 0.6 }), mPants = cmat(pants, { roughness: 0.9 }), mShoe = cmat(0x2a2024, { roughness: 0.35 });
    const mGrey = cmat(grey, { roughness: 0.95 }), mBrass = cmat(0xc6a05a, { roughness: 0.35, metalness: 0.8 }), mGlove = cmat(0x8a8794, { roughness: 0.8 }), mHat = cmat(0x2c2a34, { roughness: 0.6 });
    inked(n.spine, lathe([[0.001, -0.02], [0.2, -0.02], [0.26, 0.12], [0.28, 0.32], [0.24, 0.52], [0.25, 0.7], [0.2, 0.8], [0.1, 0.84], [0.001, 0.84]], 24), mCoat, { p: [0, 0, 0], s: [1, 1, 0.78] });
    // long coat skirt
    inked(n.spine, lathe([[0.001, -0.5], [0.27, -0.5], [0.3, -0.35], [0.26, -0.1], [0.21, 0.0], [0.001, 0.0]], 24), mCoat, { p: [0, 0, 0], s: [1, 1, 0.8] });
    inked(n.spine, new THREE.TorusGeometry(0.265, 0.025, 8, 28), mCoatD, { p: [0, -0.49, 0], r: [Math.PI / 2, 0, 0], s: [1, 0.8, 1], outline: false });
    for (let i = 0; i < 4; i++) inked(n.spine, new THREE.SphereGeometry(0.028, 10, 8), mBrass, { p: [0, 0.18 + i * 0.16, 0.21], outline: false });
    inked(n.spine, new THREE.CylinderGeometry(0.2, 0.17, 0.2, 14, 1, true), mCoatD, { p: [0, 0.86, 0], s: [1, 1, 1], outline: false }); // high collar
    inked(n.spine, new THREE.BoxGeometry(0.1, 0.12, 0.02), cmat(0x6e7d4e), { p: [0.14, 0.45, 0.205], r: [0, 0, 0.1], outline: false }); // patch
    // droopy bowtie
    inked(n.spine, new THREE.SphereGeometry(0.04, 8, 8), cmat(0xa84a3a), { p: [0, 0.8, 0.2], outline: false });
    for (const s of [-1, 1]) inked(n.spine, new THREE.ConeGeometry(0.06, 0.12, 6), cmat(0xa84a3a), { p: [s * 0.08, 0.77, 0.2], r: [0, 0, s * (Math.PI / 2 + 0.5)], outline: false });
    // broken umbrella on back
    const umb = node(n.spine, 'umb', 0.12, 0.55, -0.24); umb.rotation.z = -0.5; umb.rotation.x = 0.1;
    inked(umb, new THREE.CylinderGeometry(0.014, 0.014, 0.9, 6), mBrass, { p: [0, 0.1, 0], outline: false });
    inked(umb, new THREE.ConeGeometry(0.07, 0.6, 8), cmat(0x6c3b4a, { roughness: 0.9 }), { p: [0, 0.35, 0], s: [1, 1, 1] });
    inked(umb, new THREE.TorusGeometry(0.05, 0.012, 6, 14, Math.PI * 1.2), mBrass, { p: [0, -0.35, 0], outline: false });
    // legs
    for (const k of ['L', 'R']) {
      inked(n['hip' + k], capsule(0.06, 0.38), mPants, { p: [0, -0.22, 0] });
      inked(n['knee' + k], capsule(0.055, 0.38), mPants, { p: [0, -0.22, 0] });
      inked(n['knee' + k], new THREE.SphereGeometry(0.065, 10, 8), mPants, { outline: false });
      inked(n['foot' + k], lathe([[0.001, 0], [0.08, 0], [0.1, 0.04], [0.085, 0.1], [0.07, 0.14], [0.001, 0.14]], 12), mShoe, { p: [0, 0, 0.1], s: [1, 1, 2.0] });
    }
    // arms (long sleeves + gloves)
    for (const k of ['L', 'R']) {
      inked(n['arm' + k + 'G'], capsule(0.06, 0.34), mCoat, { p: [0, -0.22, 0] });
      inked(n['el' + k], capsule(0.054, 0.34), mCoat, { p: [0, -0.2, 0] });
      inked(n['el' + k], new THREE.TorusGeometry(0.056, 0.016, 8, 14), mCoatD, { p: [0, -0.4, 0], r: [Math.PI / 2, 0, 0], outline: false });
      const hand = inked(n['el' + k], new THREE.SphereGeometry(0.075, 12, 10), mGlove, { p: [0, -0.48, 0], s: [0.85, 1.2, 0.85] }); this['hand' + k] = hand;
    }
    // head: long, sorrowful face
    const h = n.headC; this.hr = 0.26;
    inked(h, new THREE.SphereGeometry(0.26, 28, 22), mSkin, { s: [0.9, 1.22, 0.95] });
    this.face = new Face({ r: 0.26, skin, eyeColor: 0x4f5f78, eyeX: 0.3, eyeY: 0.08, eyeR: 0.26, brow: 0x9a9690, mouthY: -0.44, mouthW: 0.22, blush: 0xd88a80, browW: 1.3 });
    this.face.group.scale.set(0.9, 1.1, 0.95); h.add(this.face.group); this.face.set('gloom');
    inked(h, new THREE.SphereGeometry(0.065, 12, 10), cmat(0xd9a692), { p: [0, -0.16, 0.265], s: [0.9, 1.7, 1.2] });
    // spectacles
    const gl = node(h, 'glasses', 0, 0.1 * 0.26 + 0.02, 0.25);
    for (const s of [-1, 1]) { inked(gl, new THREE.TorusGeometry(0.095, 0.011, 8, 24), mBrass, { p: [s * 0.1, 0.0, 0.0], outline: false });
      const g = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), new THREE.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.18, roughness: 0.05, depthWrite: false })); g.position.set(s * 0.1, 0, 0.004); gl.add(g); }
    inked(gl, new THREE.TorusGeometry(0.03, 0.008, 6, 10, Math.PI), mBrass, { p: [0, 0.02, 0], outline: false });
    // moustache
    for (const s of [-1, 1]) inked(h, new THREE.CapsuleGeometry(0.03, 0.11, 4, 8), mGrey, { p: [s * 0.075, -0.255, 0.255], r: [0.2, 0, s * (Math.PI / 2 + 0.55)] , outline: false });
    // wispy hair at sides + bowler hat tipped
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) inked(h, new THREE.SphereGeometry(0.05 - i * 0.004, 8, 8), mGrey, { p: [s * (0.215 - i * 0.004), 0.05 + i * 0.05 - 0.1, -0.02 - i * 0.015], outline: false });
    const hat = node(h, 'hat', 0.02, 0.3, 0); hat.rotation.set(-0.08, 0, -0.22);
    inked(hat, lathe([[0.001, 0], [0.2, 0], [0.31, 0.015], [0.31, 0.03], [0.2, 0.05], [0.17, 0.12], [0.15, 0.2], [0.1, 0.24], [0.001, 0.25]], 24), mHat, { s: [1, 1, 0.95] });
    inked(hat, new THREE.TorusGeometry(0.17, 0.02, 8, 24), cmat(0x9a5a3c), { p: [0, 0.07, 0], r: [Math.PI / 2, 0, 0], outline: false });
    inked(hat, new THREE.ConeGeometry(0.02, 0.18, 6), cmat(0xd9c08a), { p: [0.14, 0.12, 0.05], r: [0.2, 0, -0.9], outline: false });
    this.cloudAnchor = new THREE.Object3D(); this.cloudAnchor.position.set(0, 0.95, 0); n.headC.add(this.cloudAnchor);
    this.coatTail = new Ribbon(null, { segs: 5, len: 0.45, w0: 0.12, w1: 0.09, color: coat }); this.tailAnchor = new THREE.Object3D(); this.tailAnchor.position.set(0, -0.48, -0.22); n.spine.add(this.tailAnchor);
    this.shadowR = 0.4;
  }
  addTo(scene) { scene.add(this.root); scene.add(this.coatTail.mesh); }
  tick(dt, time, c, wind) {
    this.animate(dt, c); this.face.update(dt, time); this.root.updateMatrixWorld(true);
    const a = new THREE.Vector3(); this.tailAnchor.getWorldPosition(a);
    const side = new THREE.Vector3(Math.cos(this.root.rotation.y), 0, -Math.sin(this.root.rotation.y));
    this.coatTail.update(dt, a, side, wind, new THREE.Vector3(c.vx || 0, 0, c.vz || 0));
  }
}
