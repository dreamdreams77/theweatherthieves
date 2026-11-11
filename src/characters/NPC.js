import * as THREE from 'three';
import { Biped, inked, cmat, capsule, lathe, node } from './Rig.js';
import { Face } from './Face.js';
import { clamp, damp, angleDiff, TAU } from '../core/Utils.js';

/** Data-driven supporting character: same rig as Juno/Fen, different proportions, clothes, accessories, routines and dialogue. */
export class NPC extends Biped {
  constructor(spec, terrain) {
    const k = spec.scale ?? 1, tall = spec.tall ?? 1;
    super({ legU: 0.2 * k * tall, legL: 0.2 * k * tall, footH: 0.1 * k, hipX: 0.09 * k, torsoH: 0.4 * k * (spec.torso ?? 1), shX: 0.2 * k * (spec.wide ?? 1), shY: 0.34 * k * (spec.torso ?? 1), armU: 0.2 * k * tall, armL: 0.2 * k * tall, headY: 0.3 * k * (spec.headR ?? 1), neckH: 0.03, stride: 1.8 / k, bob: 0.03, lean: 0.1, slouch: spec.slouch ?? 0.02, twist: 1, legSwing: 0.55, armSwing: 0.6, armOut: 0.1 });
    this.spec = spec; this.id = spec.id; this.name = spec.name; this.terrain = terrain; this.pos = new THREE.Vector3(); this.yaw = 0; this.vel = new THREE.Vector3(); this.speed = 1.6 * k; this.state = 'idle'; this.wp = 0; this.wait = Math.random() * 2; this.radius = 0.4 * k; this.chest = new THREE.Vector3();
    this.rain = 0; this.sun = 0; this.frost = 0; this.windN = 0; this.talk = 0; this.umbrellaOpen = 0; this.react = 0; this.route = spec.route || []; this.home = new THREE.Vector3(); this.k = k;
    const n = this.n, c = spec.coat ?? 0x6a8caa, skin = spec.skin ?? 0xd9a07a, trim = spec.trim ?? 0xf4ead2, hair = spec.hair ?? 0x4a3020;
    const mCoat = cmat(c, { roughness: 0.8 }), mSkin = cmat(skin), mTrim = cmat(trim), mHair = cmat(hair, { roughness: 0.6 }), mPants = cmat(spec.pants ?? 0x4a4458), mShoe = cmat(spec.shoe ?? 0x3a2a30, { roughness: 0.4 });
    const W = (spec.wide ?? 1), T = spec.torso ?? 1, hemR = 0.3 * k * (spec.skirt ?? 1) * W;
    inked(n.spine, lathe([[0.001, -0.04 * k], [hemR, -0.04 * k], [hemR * 0.95, 0.1 * k], [0.24 * k * W, 0.25 * k * T], [0.2 * k * W, 0.38 * k * T], [0.12 * k, 0.44 * k * T], [0.001, 0.45 * k * T]], 24), mCoat, { s: [1, 1, 0.88] });
    inked(n.spine, new THREE.TorusGeometry(hemR * 1.02, 0.018 * k, 8, 28), mTrim, { p: [0, -0.02 * k, 0], r: [Math.PI / 2, 0, 0], outline: false });
    for (let i = 0; i < 3; i++) inked(n.spine, new THREE.SphereGeometry(0.022 * k, 8, 6), mTrim, { p: [0, (0.08 + i * 0.1) * k * T, 0.26 * k * W], outline: false });
    if (spec.apron) inked(n.spine, new THREE.BoxGeometry(0.34 * k, 0.4 * k, 0.03), cmat(spec.apron), { p: [0, 0.18 * k, 0.27 * k * W], outline: false });
    if (spec.scarf) inked(n.spine, new THREE.TorusGeometry(0.19 * k, 0.05 * k, 10, 22), cmat(spec.scarf), { p: [0, 0.4 * k * T, 0], r: [Math.PI / 2, 0, 0] });
    if (spec.belt) inked(n.spine, new THREE.TorusGeometry(0.22 * k * W, 0.025 * k, 8, 24), cmat(spec.belt), { p: [0, 0.22 * k * T, 0], r: [Math.PI / 2, 0, 0], outline: false });
    if (spec.pack) { const p = inked(n.spine, new THREE.BoxGeometry(0.26 * k, 0.28 * k, 0.12 * k), cmat(spec.pack), { p: [0, 0.2 * k, -0.25 * k * W] }); }
    for (const kk of ['L', 'R']) {
      inked(n['hip' + kk], capsule(0.05 * k, 0.15 * k * tall0(spec)), mPants, { p: [0, -0.11 * k, 0] }); inked(n['knee' + kk], capsule(0.05 * k, 0.15 * k * tall0(spec)), mPants, { p: [0, -0.11 * k, 0] });
      inked(n['foot' + kk], new THREE.SphereGeometry(0.09 * k, 10, 8), mShoe, { p: [0, 0.05 * k, 0.07 * k], s: [1, 0.7, 1.45] });
      inked(n['arm' + kk + 'G'], capsule(0.06 * k, 0.15 * k * tall0(spec)), mCoat, { p: [0, -0.11 * k, 0] }); inked(n['el' + kk], capsule(0.055 * k, 0.14 * k * tall0(spec)), mCoat, { p: [0, -0.1 * k, 0] });
      this['hand' + kk] = inked(n['el' + kk], new THREE.SphereGeometry(0.06 * k, 10, 8), spec.gloves ? cmat(spec.gloves) : mSkin, { p: [0, -0.24 * k * tall0(spec), 0] });
    }
    const h = n.headC, hr = 0.3 * k * (spec.headR ?? 1); this.hr = hr;
    inked(h, new THREE.SphereGeometry(hr, 24, 18), mSkin, { s: spec.headS ?? [1, 0.98, 1] });
    this.face = new Face({ r: hr, skin, eyeColor: spec.eye ?? 0x3a5a7a, eyeX: 0.33, eyeY: 0.06, eyeR: spec.eyeR ?? 0.28, brow: spec.browC ?? hair, mouthY: -0.4, mouthW: 0.2, blush: 0xff8f8f, browW: spec.browW ?? 1 }); h.add(this.face.group);
    inked(h, new THREE.SphereGeometry(hr * (spec.nose ?? 0.15), 10, 8), cmat(shade(skin, 0.93)), { p: [0, -0.14 * hr / 0.3 * 0.3, hr * 1.0], s: spec.noseS ?? [1, 0.9, 1], outline: false });
    // hair / hats / extras
    const hs = spec.hairStyle || 'short';
    if (hs !== 'bald') { inked(h, new THREE.SphereGeometry(hr * 1.04, 18, 12, 0, TAU, 0, Math.PI * (hs === 'big' ? 0.62 : 0.46)), mHair, { p: [0, hr * 0.08, -hr * 0.1], s: [1, 1, 1.03] }); }
    if (hs === 'bun') inked(h, new THREE.SphereGeometry(hr * 0.4, 12, 10), mHair, { p: [0, hr * 1.1, -hr * 0.15] });
    if (hs === 'braids') for (const s of [-1, 1]) inked(h, capsule(hr * 0.12, hr * 1.1), mHair, { p: [s * hr * 0.9, -hr * 0.5, -hr * 0.1], r: [0, 0, s * 0.15] });
    if (hs === 'big') for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; inked(h, new THREE.SphereGeometry(hr * 0.38, 10, 8), mHair, { p: [Math.cos(a) * hr * 0.85, hr * 0.5 + Math.sin(a * 2) * hr * 0.1, Math.sin(a) * hr * 0.7 - hr * 0.1], outline: false }); }
    if (spec.beard) for (let i = 0; i < 7; i++) { const a = (i / 6 - 0.5) * 2.2; inked(h, new THREE.SphereGeometry(hr * 0.2, 8, 6), cmat(spec.beard), { p: [Math.sin(a) * hr * 0.75, -hr * (0.55 + Math.cos(a) * 0.25), hr * 0.55 * Math.cos(a)], outline: false }); }
    if (spec.brows) for (const s of [-1, 1]) inked(h, new THREE.CapsuleGeometry(hr * 0.06, hr * 0.5, 4, 8), cmat(spec.brows), { p: [s * hr * 0.33, hr * 0.5, hr * 0.8], r: [0, 0, Math.PI / 2 + s * 0.2], outline: false });
    if (spec.glasses) for (const s of [-1, 1]) inked(h, new THREE.TorusGeometry(hr * 0.3, hr * 0.03, 6, 20), cmat(0x6a5a50, { metalness: 0.6 }), { p: [s * hr * 0.34, hr * 0.06, hr * 0.92], outline: false });
    const hat = spec.hat; if (hat) { const hc = cmat(spec.hatColor ?? 0xd8604a, { roughness: 0.7 });
      if (hat === 'beret') inked(h, new THREE.SphereGeometry(hr * 1.1, 16, 8, 0, TAU, 0, Math.PI * 0.35), hc, { p: [hr * 0.15, hr * 0.62, 0], s: [1.1, 0.5, 1.1], r: [0, 0, -0.2] });
      if (hat === 'tophat') { inked(h, new THREE.CylinderGeometry(hr * 0.62, hr * 0.7, hr * 0.9, 16), hc, { p: [0, hr * 1.15, 0] }); inked(h, new THREE.CylinderGeometry(hr * 1.0, hr * 1.0, 0.03, 18), hc, { p: [0, hr * 0.78, 0] }); }
      if (hat === 'cap') { inked(h, new THREE.SphereGeometry(hr * 1.06, 16, 10, 0, TAU, 0, Math.PI * 0.45), hc, { p: [0, hr * 0.1, 0] }); inked(h, new THREE.BoxGeometry(hr * 1.0, 0.03, hr * 0.7), hc, { p: [0, hr * 0.4, hr * 0.95] }); }
      if (hat === 'hood') inked(h, new THREE.SphereGeometry(hr * 1.14, 16, 12, 0, TAU, 0, Math.PI * 0.62), hc, { p: [0, 0, -hr * 0.12], s: [1.02, 1.02, 1.05] });
      if (hat === 'pointy') inked(h, new THREE.ConeGeometry(hr * 0.9, hr * 1.7, 14), hc, { p: [0, hr * 1.25, 0], r: [-0.15, 0, 0.1] });
      if (hat === 'chef') { inked(h, new THREE.CylinderGeometry(hr * 0.7, hr * 0.62, hr * 0.7, 14), cmat(0xffffff), { p: [0, hr * 0.95, 0] }); inked(h, new THREE.SphereGeometry(hr * 0.75, 12, 8), cmat(0xffffff), { p: [0, hr * 1.45, 0] }); }
      if (hat === 'goggles') { for (const s of [-1, 1]) inked(h, new THREE.TorusGeometry(hr * 0.22, hr * 0.06, 8, 16), cmat(0xd2a24c, { metalness: 0.8 }), { p: [s * hr * 0.3, hr * 0.62, hr * 0.65], r: [0.5, 0, 0] }); }
      if (hat === 'antlers') for (const s of [-1, 1]) { inked(h, capsule(hr * 0.06, hr * 0.8), cmat(0xb08a5c), { p: [s * hr * 0.55, hr * 1.15, 0], r: [0, 0, -s * 0.4] }); inked(h, capsule(hr * 0.04, hr * 0.4), cmat(0xb08a5c), { p: [s * hr * 0.85, hr * 1.4, 0], r: [0, 0, -s * 0.9] }); }
      if (hat === 'helmet') inked(h, new THREE.SphereGeometry(hr * 1.08, 16, 12, 0, TAU, 0, Math.PI * 0.5), cmat(0xd9b23a, { metalness: 0.4, roughness: 0.4 }), { p: [0, hr * 0.1, 0] });
    }
    // species features (silhouette): beak, spines, shell, ears, antennae, wings, tusks, comb
    for (const ex of spec.extras || []) {
      if (ex === 'beak') inked(h, new THREE.ConeGeometry(hr * 0.22, hr * 0.95, 10), cmat(spec.beakC ?? 0xf0b030), { p: [0, -hr * 0.12, hr * 1.2], r: [Math.PI / 2, 0, 0] });
      if (ex === 'spines') for (let i = 0; i < 14; i++) { const a = (i / 13) * 2.6 - 1.3; inked(n.spine, new THREE.ConeGeometry(0.05 * k, 0.28 * k, 5), cmat(spec.spineC ?? 0x7a5a3a), { p: [Math.sin(a) * 0.2 * k, 0.28 * k + Math.cos(a) * 0.12 * k, -0.2 * k], r: [-1.1 - Math.cos(a) * 0.3, 0, -a * 0.8], outline: false }); }
      if (ex === 'shell') { inked(n.spine, new THREE.SphereGeometry(0.34 * k, 16, 10, 0, TAU, 0, Math.PI * 0.55), cmat(spec.shellC ?? 0x6a8a4a, { roughness: 0.8 }), { p: [0, 0.22 * k, -0.2 * k], s: [1, 0.9, 1.05], r: [-0.8, 0, 0] }); for (let i = 0; i < 4; i++) inked(n.spine, new THREE.SphereGeometry(0.08 * k, 8, 6), cmat([0xff8fb8, 0xffd05a, 0xb59cff, 0x7fe0ff][i]), { p: [Math.sin(i * 1.7) * 0.18 * k, (0.4 + (i % 2) * 0.1) * k, -0.38 * k], outline: false }); }
      if (ex === 'ears') for (const sd of [-1, 1]) inked(h, capsule(hr * 0.16, hr * 1.2), cmat(spec.earC ?? 0xf4f4f4), { p: [sd * hr * 0.4, hr * 1.35, -hr * 0.1], r: [0, 0, -sd * 0.2] });
      if (ex === 'antennae') for (const sd of [-1, 1]) { inked(h, new THREE.CylinderGeometry(hr * 0.02, hr * 0.02, hr * 1.0, 5), cmat(0x6a5a3a), { p: [sd * hr * 0.3, hr * 1.2, 0], r: [0, 0, -sd * 0.4], outline: false }); inked(h, new THREE.SphereGeometry(hr * 0.1, 8, 6), cmat(0xffe08a, { emissive: 0xffd060 }), { p: [sd * hr * 0.55, hr * 1.65, 0], outline: false }); }
      if (ex === 'wings') for (const sd of [-1, 1]) inked(n.spine, new THREE.SphereGeometry(0.3 * k, 12, 8), cmat(spec.wingC ?? 0xfff2c0, { transparent: true, opacity: 0.8, side: THREE.DoubleSide }), { p: [sd * 0.2 * k, 0.35 * k, -0.2 * k], s: [0.15, 1.2, 0.8], r: [0, 0, sd * 0.4], outline: false });
      if (ex === 'tusks') for (const sd of [-1, 1]) inked(h, new THREE.ConeGeometry(hr * 0.1, hr * 0.7, 6), cmat(0xfff6e0), { p: [sd * hr * 0.2, -hr * 0.65, hr * 0.85], r: [Math.PI, 0, 0] });
      if (ex === 'comb') for (let i = 0; i < 3; i++) inked(h, new THREE.SphereGeometry(hr * 0.17, 8, 6), cmat(0xd8302a), { p: [0, hr * (1.0 + i * 0.12), hr * (0.15 - i * 0.2)], outline: false });
      if (ex === 'cape') inked(n.spine, new THREE.CylinderGeometry(0.1 * k, 0.32 * k, 0.5 * k, 12, 1, true, 0, Math.PI * 1.4), cmat(spec.capeC ?? 0xc86a5a, { side: THREE.DoubleSide }), { p: [0, 0.2 * k, -0.18 * k], r: [0, Math.PI * 0.8, 0], outline: false });
    }
    // umbrella held over head (rotates open/closed)
    this.umb = node(this.root, 'umb', 0, 0, 0); this.umbHandle = node(this.umb, 'umbH'); const uc = cmat(spec.umbrella ?? 0xd8604a, { roughness: 0.6, side: THREE.DoubleSide });
    if (spec.umbrella !== undefined) { inked(this.umbHandle, new THREE.CylinderGeometry(0.012, 0.012, 1.1, 6), cmat(0x5a4a3a), { p: [0, 0.55, 0], outline: false }); this.canopy = inked(this.umbHandle, new THREE.SphereGeometry(0.62 * k, 20, 8, 0, TAU, 0, Math.PI * 0.5), uc, { p: [0, 1.1, 0], s: [1, 0.55, 1], outline: false }); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; inked(this.umbHandle, new THREE.CylinderGeometry(0.006, 0.006, 0.7 * k, 4), cmat(0x5a4a3a), { p: [Math.cos(a) * 0.3 * k, 1.12, Math.sin(a) * 0.3 * k], r: [0, 0, Math.cos(a) * 1.2], outline: false }); } this.umbHandle.position.set(0.3 * k, 0.1, 0.15 * k); }
    this.setRoot();
  }
  setRoot() { this.root.userData.npc = this; }
  addTo(scene) { scene.add(this.root); return this; }
  place(x, z, y) { this.pos.set(x, y ?? this.terrain.groundAt(x, z, 100)?.y ?? 0, z); this.home.copy(this.pos); this.root.position.copy(this.pos); }
  weather(dt, w) { this.rain = damp(this.rain, w.rain, 4, dt); this.sun = damp(this.sun, w.sun, 4, dt); this.frost = damp(this.frost, w.frost, 4, dt); this.windN = damp(this.windN, w.wind.clone().sub(w.breeze).length() > 2 ? 1 : 0, 4, dt); }
  update(dt, t, player, camPos) {
    // routine: walk waypoints, wait, play an idle gesture
    let moving = false; const sp = this.speed * (this.frost > 0.4 ? 0.2 : 1);
    if (this.route.length && this.talk <= 0 && this.react <= 0) {
      const w = this.route[this.wp % this.route.length];
      if (this.wait > 0) this.wait -= dt;
      else { const dx = w.x - this.pos.x, dz = w.z - this.pos.z, d = Math.hypot(dx, dz); if (d < 0.35) { this.wait = (w.wait ?? 3) * (0.7 + Math.random() * 0.6); this.wp++; if (w.anim && Math.random() < 0.7) this.play(w.anim); if (w.say && this.onSay) this.onSay(this, w.say); }
        else { this.vel.x = damp(this.vel.x, (dx / d) * sp, 6, dt); this.vel.z = damp(this.vel.z, (dz / d) * sp, 6, dt); moving = true; } }
    }
    if (!moving) { this.vel.x = damp(this.vel.x, 0, 8, dt); this.vel.z = damp(this.vel.z, 0, 8, dt); }
    const nx = this.pos.x + this.vel.x * dt, nz = this.pos.z + this.vel.z * dt, g = this.terrain.groundAt(nx, nz, this.pos.y, 0.7);
    if (g) { this.pos.set(nx, damp(this.pos.y, g.y, 15, dt), nz); } else { this.vel.x = this.vel.z = 0; }
    this.terrain.push(this.pos, this.radius, this.pos.y);
    const hs = Math.hypot(this.vel.x, this.vel.z); const dxp = player.pos.x - this.pos.x, dzp = player.pos.z - this.pos.z, dp = Math.hypot(dxp, dzp);
    const faceTo = (hs > 0.3 && this.talk <= 0) ? Math.atan2(this.vel.x, this.vel.z) : (dp < 7 ? Math.atan2(dxp, dzp) : this.yaw);
    this.yaw += angleDiff(this.yaw, faceTo) * Math.min(1, dt * 6); this.root.position.copy(this.pos); this.root.rotation.y = this.yaw; this.react -= dt;
    // expression by weather
    let ex = this.spec.mood || 'happy'; if (this.frost > 0.3) ex = 'cringe'; else if (this.sun > 0.25) ex = this.spec.likesSun ? 'love' : 'cringe'; else if (this.rain > 0.2) ex = this.spec.likesRain ? 'excited' : 'worried'; else if (this.windN > 0.3) ex = 'surprised'; else if (this.react > 0 && this.reactEx) ex = this.reactEx; else if (dp < 4) ex = this.spec.near || 'happy';
    this.face.set(ex); this.face.talk = this.talk > 0 ? 1 : 0; this.face.lookAt(new THREE.Vector3(clamp(dxp * 0.15, -1, 1), 0.05, 1).normalize()); this.headLook.set(clamp(angleDiff(this.yaw, Math.atan2(dxp, dzp)) * 0.6, -0.7, 0.7), 0);
    // umbrella opens in rain
    const wantOpen = (this.rain > 0.15 && this.spec.umbrella !== undefined) ? 1 : 0; this.umbrellaOpen = damp(this.umbrellaOpen, wantOpen, 5, dt);
    if (this.canopy) { this.canopy.scale.set(0.25 + 0.75 * this.umbrellaOpen, (0.25 + 0.3 * this.umbrellaOpen) * 0.55 / 0.55, 0.25 + 0.75 * this.umbrellaOpen); this.umbHandle.position.y = 0.1 + (this.k - 1) * 0.5 + (wantOpen ? 0.55 : 0); this.umbHandle.position.x = wantOpen ? 0 : 0.3 * this.k; this.umbHandle.rotation.z = wantOpen ? 0 : -0.5; }
    this.talk = Math.max(0, this.talk - dt);
    this.shiver = this.frost > 0.3; this.slump = damp(this.slump, this.frost > 0.3 ? 0.8 : 0, 3, dt);
    this.tick(dt, hs, t);
    this.chest.set(this.pos.x, this.pos.y + 1.0 * this.k, this.pos.z);
  }
  tick(dt, hs, t) { this.animate(dt, { speed: hs, maxSpeed: this.speed, grounded: true, vy: 0, windHold: this.windN > 0.3 }); this.face.update(dt, t); if (this.shiver) this.n.body.position.x = Math.sin(t * 40) * 0.01; else this.n.body.position.x = 0; }
  headWorld(h = 1.4) { return this.pos.clone().add(new THREE.Vector3(0, h * this.k * (this.spec.tall ?? 1), 0)); }
}
function tall0(spec) { return spec.tall ?? 1; }
function shade(hex, f) { const c = new THREE.Color(hex); c.multiplyScalar(f); return c.getHex(); }
