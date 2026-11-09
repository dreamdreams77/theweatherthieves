import * as THREE from 'three';
import { Juno } from './Juno.js';
import { clamp, damp, angleDiff, lerp } from '../core/Utils.js';
const _f = new THREE.Vector3(), _r = new THREE.Vector3();
export class Player {
  constructor(game) {
    this.game = game; this.juno = new Juno(); this.juno.addTo(game.scene); this.pos = new THREE.Vector3(1.5, 0, 6.5); this.vel = new THREE.Vector3(); this.yaw = Math.PI; this.grounded = false; this.coyote = 0; this.jumpBuf = 0;
    this.safe = this.pos.clone(); this.radius = 0.38; this.frozen = false; this.faceYaw = this.yaw; this.speed = 0; this.surf = null; this.locked = false; this.ice = false; this.fallT = 0; this.maxSpeed = 5.4; this.expr = 'neutral'; this.exprT = 0; this.weatherW = { rain: 0, sun: 0, frost: 0, wind: new THREE.Vector3() };
    this.radiusW = 0.5; this.reactiveRadius = 0.6; this.chest = new THREE.Vector3(); this.facing = null; this.talk = 0;
    this.pos.y = game.terrain.groundAt(this.pos.x, this.pos.z, 50)?.y ?? 0; this.pos.set(1.5, this.pos.y, 6.5); this.safe.copy(this.pos);
    game.weather.register({ get pos() { return game.player.chest; }, radius: 0.6, weather: (dt, w) => { this.weatherW = w; } });
  }
  setExpr(name, t = 1.2) { this.expr = name; this.exprT = t; }
  update(dt, t, input, camYaw) {
    const g = this.game, terrain = g.terrain;
    let mx = 0, mz = 0;
    if (!this.locked) { mx = input.move.x; mz = input.move.y; }
    const mag = Math.min(1, Math.hypot(mx, mz));
    // camera relative
    const sy = Math.sin(camYaw), cy = Math.cos(camYaw); // camera sits at +yaw looking at target: forward = (-sin, -cos)
    _f.set(-sy, 0, -cy); _r.set(cy, 0, -sy);
    const dir = new THREE.Vector3().addScaledVector(_f, mz).addScaledVector(_r, mx);
    const spMax = this.maxSpeed * (this.game.tools?.usingWind ? 0.6 : 1) * (this.game.tools?.holdingCloud ? 0.9 : 1);
    const acc = this.grounded ? (this.ice ? 6 : 42) : 14;
    const wishX = dir.x * spMax, wishZ = dir.z * spMax;
    this.vel.x = damp(this.vel.x, wishX, acc / spMax, dt); this.vel.z = damp(this.vel.z, wishZ, acc / spMax, dt);
    if (this.ice && mag < 0.1) { this.vel.x = damp(this.vel.x, this.vel.x, 1, dt); }
    // jump
    this.jumpBuf = input.jump && !this.locked ? 0.12 : this.jumpBuf - dt; this.coyote = this.grounded ? 0.12 : this.coyote - dt;
    if (this.jumpBuf > 0 && this.coyote > 0) { this.vel.y = 8.6; this.grounded = false; this.coyote = 0; this.jumpBuf = 0; g.audio?.sfx('jump'); }
    this.vel.y -= 24 * dt; if (this.vel.y < -30) this.vel.y = -30;
    // wind pushes (in the gust yourself)
    const nx = this.pos.x + this.vel.x * dt, nz = this.pos.z + this.vel.z * dt, ny = this.pos.y + this.vel.y * dt;
    const gr = terrain.groundAt(nx, nz, this.pos.y, 0.62);
    if (gr && ny <= gr.y + 0.001 && this.vel.y <= 0) { this.pos.set(nx, damp(this.pos.y, gr.y, 30, dt) > gr.y ? gr.y : gr.y, nz); if (!this.grounded) { g.audio?.sfx('land'); } this.grounded = true; this.vel.y = 0; this.surf = gr.surf; this.ice = !!gr.surf.isIce; }
    else if (gr && this.grounded && ny > gr.y && this.vel.y <= 0 && ny - gr.y < 0.2) { this.pos.set(nx, gr.y, nz); }
    else { // airborne or blocked by wall/step
      if (gr && gr.y > this.pos.y + 0.62) { /* wall: slide */ } else { this.pos.x = nx; this.pos.z = nz; }
      this.pos.y = ny; if (this.grounded && !gr) { this.grounded = false; } else if (!gr) this.grounded = false; this.ice = false;
    }
    terrain.push(this.pos, this.radius, this.pos.y);
    if (this.grounded && this.surf && this.surf.islandSafe !== false) { const i = terrain.islands.find((s) => s.heightAt(this.pos.x, this.pos.z) !== -Infinity); if (i && i.nearEdge(this.pos.x, this.pos.z) < 0.72 || (this.surf && !terrain.islands.includes(this.surf))) this.safe.copy(this.pos); }
    // fell
    if (this.pos.y < -40 || this.pos.y < this.safe.y - 28) { this.respawn(); }
    // facing
    const hs = Math.hypot(this.vel.x, this.vel.z); this.speed = hs;
    let faceTo = this.yaw; if (this.facing) faceTo = this.facing; else if (hs > 0.4) faceTo = Math.atan2(this.vel.x, this.vel.z);
    if (this.facing || hs > 0.4) this.yaw += angleDiff(this.yaw, faceTo) * Math.min(1, dt * (this.facing ? 14 : 11));
    this.facing = null;
    // juno visuals
    const j = this.juno; j.root.position.copy(this.pos); j.root.rotation.y = this.yaw;
    const wind = g.weather.force(this.pos, 0);
    this.exprT -= dt; const w = this.weatherW;
    if (this.exprT <= 0) { let e = 'neutral'; if (w.rain > 0.3) e = 'happy'; else if (!this.grounded && this.vel.y < -9) e = 'surprised'; else if (w.sun > 0.2) e = 'happy'; else if (w.frost > 0.2) e = 'cringe'; else if (this.speed > 3) e = 'happy'; j.face.set(e); } else j.face.set(this.expr);
    j.face.talk = this.talk;
    const camV = g.camera.position; const lookAt = new THREE.Vector3().subVectors(g.lookTarget || camV, this.pos).applyAxisAngle(new THREE.Vector3(0, 1, 0), -this.yaw); lookAt.y = THREE.MathUtils.clamp(lookAt.y * 0.2 - 1, -1, 1); lookAt.normalize(); j.face.lookAt(lookAt); j.headLook.set(THREE.MathUtils.clamp(lookAt.x, -0.6, 0.6) * 0.8, THREE.MathUtils.clamp(lookAt.y, -0.5, 0.5) * 0.5);
    j.tick(dt, t, { speed: this.speed, maxSpeed: this.maxSpeed, grounded: this.grounded, vy: this.vel.y, vx: this.vel.x, vz: this.vel.z, windHold: this.game.tools?.usingWind }, wind);
    this.chest.set(this.pos.x, this.pos.y + 0.8, this.pos.z);
  }
  respawn() {
    const g = this.game; this.pos.copy(this.safe); this.pos.y += 0.5; this.vel.set(0, 0, 0); g.ui.flash(); g.say?.onFall();
  }
}
