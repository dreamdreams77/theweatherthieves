import * as THREE from 'three';
import { Assets } from '../gfx/Assets.js';
import { damp, angleDiff, TAU } from '../core/Utils.js';

/** Animated wild animals (CC0 Quaternius rigs): graze, wander, look up at Juno and bolt from gusts or a close approach. */
export class Wildlife {
  constructor(scene, terrain, name, x, z, { height = 1, roam = 6, speed = 1.1, shy = 4.5 } = {}) {
    const a = Assets.animal(name); this.ok = !!a; if (!a) return;
    this.terrain = terrain; this.root = a.root; this.home = new THREE.Vector3(x, 0, z); this.pos = new THREE.Vector3(x, terrain.groundAt(x, z, 200)?.y ?? 0, z); this.yaw = Math.random() * TAU; this.roam = roam; this.speed = speed; this.shy = shy;
    const box = new THREE.Box3().setFromObject(this.root); const h = box.max.y - box.min.y || 1; this.root.scale.setScalar(height / h); scene.add(this.root);
    this.mixer = new THREE.AnimationMixer(this.root); this.act = {}; for (const c of a.clips) { const k = c.name.split('|').pop(); this.act[k] = this.mixer.clipAction(c); }
    this.state = 'idle'; this.t = 1 + Math.random() * 3; this.cur = null; this.target = new THREE.Vector3(); this.pos.y; this.radius = 0.6; this.play('Idle'); this.mixer.update(Math.random() * 3);
  }
  play(k, fade = 0.3) { const a = this.act[k] || this.act.Idle; if (!a || a === this.cur) return; a.reset().fadeIn(fade).play(); this.cur?.fadeOut(fade); this.cur = a; }
  weather(dt, w) { const g = w.wind.clone().sub(w.breeze).length(); if (g > 5 && this.state !== 'flee') { this.state = 'flee'; this.t = 2.5; const d = w.wind.clone().setY(0).normalize(); this.target.copy(this.pos).addScaledVector(d, 7); } }
  update(dt, player) {
    if (!this.ok) return; this.t -= dt; const dp = Math.hypot(player.pos.x - this.pos.x, player.pos.z - this.pos.z);
    if (dp < this.shy && this.state !== 'flee') { this.state = 'flee'; this.t = 2.2; const ax = this.pos.x - player.pos.x, az = this.pos.z - player.pos.z, l = Math.hypot(ax, az) || 1; this.target.set(this.pos.x + (ax / l) * 6, 0, this.pos.z + (az / l) * 6); }
    if (this.t <= 0) { if (this.state === 'walk' || this.state === 'flee') { this.state = Math.random() < 0.5 ? 'eat' : 'idle'; this.t = 3 + Math.random() * 4; } else { this.state = 'walk'; this.t = 4 + Math.random() * 3; const a = Math.random() * TAU, r = Math.random() * this.roam; this.target.set(this.home.x + Math.cos(a) * r, 0, this.home.z + Math.sin(a) * r); } }
    let sp = 0; if (this.state === 'walk' || this.state === 'flee') { const dx = this.target.x - this.pos.x, dz = this.target.z - this.pos.z, d = Math.hypot(dx, dz); if (d < 0.4) this.t = 0; else { this.yaw += angleDiff(this.yaw, Math.atan2(dx, dz)) * Math.min(1, dt * 5); sp = this.speed * (this.state === 'flee' ? 3.2 : 1); } }
    const nx = this.pos.x + Math.sin(this.yaw) * sp * dt, nz = this.pos.z + Math.cos(this.yaw) * sp * dt, g = this.terrain.groundAt(nx, nz, this.pos.y + 0.5, 0.8);
    if (g && Math.hypot(nx - this.home.x, nz - this.home.z) < this.roam + 4) { this.pos.set(nx, damp(this.pos.y, g.y, 12, dt), nz); } else if (sp > 0) { this.yaw += Math.PI * 0.6; this.t = Math.min(this.t, 0.4); }
    this.terrain.push(this.pos, this.radius, this.pos.y);
    this.play(this.state === 'flee' ? 'Gallop' : this.state === 'walk' ? 'Walk' : this.state === 'eat' ? 'Eating' : 'Idle');
    this.root.position.copy(this.pos); this.root.rotation.y = this.yaw; this.mixer.update(dt);
  }
}
