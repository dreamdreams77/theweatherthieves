import * as THREE from 'three';
import { Face } from './Face.js';
import { Parts, mesh, vcMat, puff } from '../world/Build.js';
import { std } from '../gfx/Mat.js';
import { inked, node } from './Rig.js';
import { clamp, damp, lerp, rng, TAU, angleDiff } from '../core/Utils.js';

/** PUFFKIN - tiny curious cloud-creatures that react to every kind of weather. */
export class Puffkin {
  constructor(pos, seed, terrain, tint = 0xffffff) {
    this.seed = seed; this.terrain = terrain; this.pos = pos.clone(); this.vel = new THREE.Vector3(); this.radius = 0.45; this.home = pos.clone();
    this.group = new THREE.Group(); const r = rng(seed); this.tint = new THREE.Color(tint);
    const p = new Parts(); p.add(new THREE.SphereGeometry(0.42, 18, 14), 0xffffff, { p: [0, 0.5, 0], s: [1.05, 0.95, 1] });
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; p.add(new THREE.SphereGeometry(0.2 + r() * 0.08, 10, 8), 0xf1f5ff, { p: [Math.cos(a) * 0.34, 0.5 + (r() - 0.4) * 0.4, Math.sin(a) * 0.34 - 0.04], jitter: 0.06 }); }
    for (let i = 0; i < 3; i++) p.add(new THREE.SphereGeometry(0.16, 10, 8), 0xf1f5ff, { p: [(i - 1) * 0.2, 0.92, -0.05] });
    this.bodyMat = std({ vertexColors: true, roughness: 1, emissive: 0x9aa6c8, emissiveIntensity: 0.25 }); this.body = new THREE.Mesh(p.merge(), this.bodyMat); this.body.castShadow = true;
    this.bod = new THREE.Group(); this.bod.add(this.body); this.group.add(this.bod);
    this.face = new Face({ r: 0.4, skin: 0xfdfdff, eyeColor: 0x2f3a68, eyeX: 0.34, eyeY: 0.1, eyeR: 0.3, brow: 0x7a86a8, mouthY: -0.36, mouthW: 0.2, blush: 0xffa0b0, sclera: 0xffffff });
    this.fg = new THREE.Group(); this.fg.position.set(0, 0.52, 0.12); this.fg.scale.setScalar(0.95); this.fg.add(this.face.group); this.group.add(this.fg);
    const fpuff = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 10), std({ color: 0xfafcff, roughness: 1, emissive: 0x9aa6c8, emissiveIntensity: 0.2 })); fpuff.position.copy(this.fg.position); fpuff.scale.set(1, 0.95, 0.9); this.group.add(fpuff);
    this.feet = []; for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), std({ color: 0xffc89a, roughness: 0.6 })); f.position.set(s * 0.17, 0.08, 0.08); f.scale.set(1, 0.7, 1.3); f.castShadow = true; this.group.add(f); this.feet.push(f); }
    this.tuft = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.28, 6), std({ color: 0xff9ac0 })); this.tuft.position.set(0, 1.0, 0.0); this.tuft.rotation.z = 0.2; this.group.add(this.tuft);
    this.state = 'idle'; this.stateT = r() * 3; this.yaw = r() * TAU; this.dir = new THREE.Vector2(); this.hopT = 0; this.rain = 0; this.frost = 0; this.sun = 0; this.puff = 1; this.floatV = 0; this.air = 0; this.curious = 0; this.sleep = 0; this.squeak = 0;
    this.face.set('happy'); this.reactT = 0;
  }
  weather(dt, w) {
    this.rain = damp(this.rain, w.rain, 4, dt); this.sun = damp(this.sun, w.sun, 4, dt); this.frost = clamp(this.frost + (w.frost > 0.1 ? dt * 0.6 * w.frost : -dt * 0.25 * (1 + w.sun * 3)), 0, 1);
    const f = w.wind.clone().sub(w.breeze); const s = Math.hypot(f.x, f.z);
    if (s > 3 && this.frost < 0.5) { this.vel.addScaledVector(f, dt * 0.9); this.air = clamp(this.air + dt * s * 0.06, 0, 1); this.floatV = 1; this.face.set('surprised'); this.reactT = 0.3; }
  }
  poke() { this.squeak = 1; this.hopT = 0.01; this.vel.y = 4.5; this.face.set('excited'); this.reactT = 1.2; }
  update(dt, t, player, fen) {
    const home = this.home;
    this.stateT -= dt; this.reactT -= dt;
    const dxp = player.pos.x - this.pos.x, dzp = player.pos.z - this.pos.z, dp = Math.hypot(dxp, dzp);
    if (this.frost < 0.6) {
      if (this.stateT <= 0) { this.stateT = 1.5 + Math.random() * 3; const r = Math.random(); if (r < 0.35) this.state = 'idle'; else if (r < 0.75) this.state = 'wander'; else if (dp < 8 && dp > 2) this.state = 'follow'; else this.state = 'wander'; if (this.state === 'wander') this.yaw += (Math.random() - 0.5) * 3; if (r > 0.92) this.state = 'nap'; }
      if (dp < 1.5 && this.state === 'follow') this.state = 'idle';
      let sp = 0;
      if (this.state === 'wander') { sp = 1.1; if (Math.hypot(this.pos.x - home.x, this.pos.z - home.z) > 6) this.yaw = Math.atan2(home.x - this.pos.x, home.z - this.pos.z); }
      if (this.state === 'follow') { this.yaw += angleDiff(this.yaw, Math.atan2(dxp, dzp)) * Math.min(1, dt * 4); sp = 1.4; }
      this.sleep = damp(this.sleep, this.state === 'nap' ? 1 : 0, 3, dt);
      if (this.air < 0.05) { this.vel.x = damp(this.vel.x, Math.sin(this.yaw) * sp, 4, dt); this.vel.z = damp(this.vel.z, Math.cos(this.yaw) * sp, 4, dt); }
    } else { this.vel.x = damp(this.vel.x, 0, 8, dt); this.vel.z = damp(this.vel.z, 0, 8, dt); }
    // physics
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
    const g = this.terrain.groundAt(this.pos.x, this.pos.z, this.pos.y + 0.5, 0.6);
    if (this.air > 0.05) { this.air = Math.max(0, this.air - dt * 0.35); this.vel.y = damp(this.vel.y, 0.6, 2, dt); this.pos.y += this.vel.y * dt; this.vel.x = damp(this.vel.x, 0, 0.5, dt); this.vel.z = damp(this.vel.z, 0, 0.5, dt); if (g && this.pos.y < g.y) { this.pos.y = g.y; this.air = 0; } if (this.pos.y > 40) this.air = 0; if (!g && this.pos.y < -20) { this.pos.copy(this.home); this.air = 0; } }
    else if (g) { const hop = Math.abs(Math.sin(t * 7 + this.seed)) * 0.18 * (Math.hypot(this.vel.x, this.vel.z) > 0.3 ? 1 : 0); this.vel.y += -22 * dt; if (this.pos.y + this.vel.y * dt <= g.y) { this.pos.y = g.y; this.vel.y = this.vel.y < -3 ? 0 : 0; } else this.pos.y += this.vel.y * dt; }
    else { this.vel.y -= 18 * dt; this.pos.y += this.vel.y * dt; if (this.pos.y < -15) { this.pos.copy(this.home); this.vel.set(0, 0, 0); } }
    if (g && this.pos.y - g.y < 0.01 && this.air < 0.05) { this.vel.y = 0; }
    this.terrain.push(this.pos, 0.35, this.pos.y);
    this.group.position.copy(this.pos);
    const sp = Math.hypot(this.vel.x, this.vel.z), hopp = this.air > 0.05 ? 0 : Math.abs(Math.sin(t * 8 + this.seed)) * 0.2 * clamp(sp, 0, 1);
    this.bod.position.y = hopp; this.group.rotation.y = damp(this.group.rotation.y, this.yaw, 6, dt) ; this.fg.position.y = 0.52 + hopp;
    const targetPuff = 1 + this.rain * 0.45 - this.sun * 0.12 + this.air * 0.25; this.puff = damp(this.puff, targetPuff, 3, dt);
    const sq = 1 - Math.abs(Math.sin(t * 8 + this.seed)) * 0.06 * clamp(sp, 0, 1) + this.sleep * -0.1 + Math.sin(t * 1.6 + this.seed) * 0.015; this.bod.scale.set(this.puff / Math.sqrt(sq), this.puff * sq, this.puff / Math.sqrt(sq)); this.fg.scale.setScalar(0.95 * this.puff);
    this.tuft.rotation.x = Math.sin(t * 5 + this.seed) * 0.2 * clamp(sp, 0, 1) + this.air * -0.5; this.squeak = Math.max(0, this.squeak - dt);
    // colour: frozen = icy
    const ice = new THREE.Color(0xa8dcff); this.bodyMat.color.set(0xffffff).lerp(ice, this.frost * 0.9); this.bodyMat.emissive.setHex(0x9aa6c8).lerp(ice, this.frost); this.bodyMat.emissiveIntensity = 0.25 + this.frost * 0.3 + this.sun * 0.15;
    this.bod.rotation.z = this.frost > 0.4 ? Math.sin(t * 40) * 0.05 * (1 - this.frost) : 0;
    // expression
    if (this.reactT <= 0) {
      if (this.frost > 0.4) this.face.set('cringe'); else if (this.sleep > 0.5) this.face.set('sleepy'); else if (this.rain > 0.15) this.face.set('love'); else if (this.sun > 0.15) this.face.set('smug'); else if (dp < 4) this.face.set('happy'); else this.face.set('neutral');
    }
    this.face.talk = this.squeak > 0 ? 1 : 0; this.face.lookAt(new THREE.Vector3(clamp(dxp * 0.2, -1, 1), 0.1, 1).normalize());
    this.face.update(dt, t);
    for (const [i, f] of this.feet.entries()) f.position.y = 0.08 + Math.max(0, Math.sin(t * 8 + this.seed + i * 3.14)) * 0.08 * clamp(sp, 0, 1);
  }
}

/** SUNNY - a tiny trapped sun with relentless optimism. */
export class Sunny {
  constructor() {
    this.group = new THREE.Group(); this.pos = new THREE.Vector3();
    this.core = new THREE.Mesh(new THREE.SphereGeometry(0.55, 28, 20), new THREE.MeshStandardMaterial({ color: 0xffd35a, emissive: 0xffa820, emissiveIntensity: 0.9, roughness: 0.5 })); this.group.add(this.core);
    this.rays = new THREE.Group(); this.group.add(this.rays); const rm = new THREE.MeshStandardMaterial({ color: 0xffe9a0, emissive: 0xffb830, emissiveIntensity: 1.2, roughness: 0.4 });
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; const c = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.5, 5), rm); c.position.set(Math.cos(a) * 0.8, Math.sin(a) * 0.8, 0); c.rotation.z = a - Math.PI / 2; this.rays.add(c); }
    this.face = new Face({ r: 0.55, skin: 0xffd35a, eyeColor: 0x7a3a10, eyeX: 0.34, eyeY: 0.1, eyeR: 0.3, brow: 0x9a5a14, mouthY: -0.35, mouthW: 0.22, blush: 0xff7a4a, sclera: 0xfffbe8 });
    this.fg = new THREE.Group(); this.fg.add(this.face.group); this.group.add(this.fg); this.face.set('worried');
    this.light = new THREE.PointLight(0xffc860, 2, 14, 2); this.group.add(this.light); this.freed = 0; this.t = 0;
  }
  update(dt, t) { this.t = t; this.rays.rotation.z += dt * (0.4 + this.freed * 1.5); this.face.update(dt, t); this.core.material.emissiveIntensity = 0.8 + Math.sin(t * 3) * 0.15 + this.freed * 0.8; this.light.intensity = 2 + this.freed * 6; const s = 1 + Math.sin(t * 2.3) * 0.03; this.group.scale.setScalar(s); }
}
