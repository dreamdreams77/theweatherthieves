import * as THREE from 'three';
import { Fen } from './Fen.js';
import { clamp, damp, angleDiff } from '../core/Utils.js';
export class Companion {
  constructor(game) {
    this.game = game; this.fen = new Fen(); this.fen.addTo(game.scene); this.pos = new THREE.Vector3(6, 0, 10); this.vel = new THREE.Vector3(); this.yaw = Math.PI; this.grounded = true; this.radius = 0.4;
    this.pos.y = game.terrain.groundAt(this.pos.x, this.pos.z, 60)?.y ?? 0; this.cloudAnchorWorld = new THREE.Vector3(); this.chest = new THREE.Vector3(); this.maxSpeed = 4.6; this.mood = { rain: 0, sun: 0, wind: 0, frost: 0 }; this.reactT = 0; this.sighT = 12 + Math.random() * 8; this.idleT = 0; this.talk = 0; this.stuckT = 0;
    this.standBy = null; this.sit = 0; this.w = { rain: 0, sun: 0, frost: 0, wind: new THREE.Vector3() };
    game.weather.register({ get pos() { return game.fen.chest; }, radius: 0.7, weather: (dt, w) => this.onWeather(dt, w) });
  }
  onWeather(dt, w) {
    this.w = w; const m = this.mood; const R = this.game.weather; const wind = w.wind.clone().sub(w.breeze).length();
    m.rain = damp(m.rain, w.rain, 4, dt); m.sun = damp(m.sun, w.sun, 5, dt); m.frost = damp(m.frost, w.frost, 5, dt); m.wind = damp(m.wind, wind > 2 ? 1 : 0, 5, dt);
  }
  update(dt, t, juno) {
    const g = this.game, terrain = g.terrain, f = this.fen; this.reactT -= dt; this.sighT -= dt; const m = this.mood;
    const dx = juno.pos.x - this.pos.x, dz = juno.pos.z - this.pos.z, d = Math.hypot(dx, dz);
    let want = 0; const stopAt = 3.2;
    if (d > stopAt) want = clamp((d - stopAt) * 1.2, 0, 1.25) * this.maxSpeed; if (d > 14) want = this.maxSpeed * 1.5;
    if (this.holdPos) { want = 0; }
    const dirx = d > 0.01 ? dx / d : 0, dirz = d > 0.01 ? dz / d : 0;
    let tvx = dirx * want, tvz = dirz * want; if (m.frost > 0.3) { tvx *= 0.2; tvz *= 0.2; }
    this.vel.x = damp(this.vel.x, tvx, 6, dt); this.vel.z = damp(this.vel.z, tvz, 6, dt);
    const nx = this.pos.x + this.vel.x * dt, nz = this.pos.z + this.vel.z * dt; const gr = terrain.groundAt(nx, nz, this.pos.y, 0.7);
    if (gr) { this.pos.set(nx, damp(this.pos.y, gr.y, 18, dt), nz); this.grounded = true; this.stuckT = 0; } else { this.vel.x *= 0.5; this.vel.z *= 0.5; this.stuckT += dt;
      const here = terrain.groundAt(this.pos.x, this.pos.z, this.pos.y + 1, 1.5); if (!here) { this.pos.y -= 12 * dt; } }
    terrain.push(this.pos, this.radius, this.pos.y);
    // teleport if far or on a different level for long
    if ((d > 34 || (this.stuckT > 5 && d > 6) || this.pos.y < juno.pos.y - 16) && !g.cinematic) { const a = juno.yaw + Math.PI + 0.6; const tx = juno.pos.x + Math.sin(a) * 2.6, tz = juno.pos.z + Math.cos(a) * 2.6; const gg = terrain.groundAt(tx, tz, juno.pos.y + 1, 2); this.pos.set(gg ? tx : juno.pos.x, gg ? gg.y : juno.pos.y, gg ? tz : juno.pos.z); this.stuckT = 0; }
    const sp = Math.hypot(this.vel.x, this.vel.z);
    if (sp > 0.3) this.yaw += angleDiff(this.yaw, Math.atan2(this.vel.x, this.vel.z)) * Math.min(1, dt * 7); else this.yaw += angleDiff(this.yaw, Math.atan2(dx, dz)) * Math.min(1, dt * 2.5);
    f.root.position.copy(this.pos); f.root.rotation.y = this.yaw;
    // reactions
    const face = f.face; let ex = 'gloom';
    f.slump = damp(f.slump, 0.6 + m.rain * 0.4, 2, dt);
    if (m.frost > 0.3) { ex = 'cringe'; f.slump = 1; } else if (m.sun > 0.2) { ex = 'cringe'; } else if (m.wind > 0.3) { ex = 'worried'; } else if (this.reactT > 0) ex = this.reactEx || ex; else if (this.game.cloudHeld) ex = 'worried'; else if (m.rain > 0.2) ex = 'sad'; else if (d < 4 && this.game.fenHappy) ex = 'neutral';
    if (this.game.fenHappy && ex === 'gloom') ex = 'neutral';
    face.set(ex); face.talk = this.talk;
    face.lookAt(new THREE.Vector3(clamp(dx * 0.1, -1, 1), 0, 1).normalize()); f.headLook.set(clamp(angleDiff(this.yaw, Math.atan2(dx, dz)) * 0.7, -0.8, 0.8), 0.0);
    if (this.sighT <= 0 && sp < 0.3 && this.game.state === 'play') { f.play('sigh'); this.sighT = 18 + Math.random() * 14; }
    this.cloudAnchorWorld.set(this.pos.x, this.pos.y + 3.15 * 0.78 + 0.3, this.pos.z);
    f.tick(dt, t, { speed: sp, maxSpeed: this.maxSpeed, grounded: this.grounded, vy: 0, vx: this.vel.x, vz: this.vel.z, windHold: m.wind > 0.3 }, g.weather.force(this.pos, 0));
    this.chest.set(this.pos.x, this.pos.y + 1.2, this.pos.z);
  }
  react(ex, anim) { this.reactEx = ex; this.reactT = 1.6; if (anim) this.fen.play(anim); }
}
