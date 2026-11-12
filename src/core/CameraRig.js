import * as THREE from 'three';
import { clamp, damp, lerp } from './Utils.js';
/** Third-person orbit camera with soft follow, collision-free zoom and cinematic shots. */
export class CameraRig {
  constructor(camera) {
    this.camera = camera; this.yaw = 0.0; this.pitch = 0.32; this.dist = 8.5; this.targetDist = 8.5; this.focus = new THREE.Vector3(); this.cur = new THREE.Vector3();
    this.shot = null; this.shotW = 0; this.shake = 0; this.fov = 52; this.bobT = 0; this.lookAhead = new THREE.Vector3();
  }
  snap(target) { this.focus.copy(target); this.cur.copy(target); }
  /** shot: {pos: Vector3, look: Vector3} or null */
  setShot(s) { this.shot = s; }
  update(dt, target, input, vel, terrain) {
    this.yaw += input.orbit.x * 0.0052; this.pitch = clamp(this.pitch + input.orbit.y * 0.0042 * (this.invertY ? -1 : 1), -0.12, 1.2);
    this.targetDist = clamp(this.targetDist + input.zoom * 0.9, 4.5, 15);
    this.dist = damp(this.dist, this.targetDist, 6, dt);
    this.lookAhead.x = damp(this.lookAhead.x, vel.x * 0.25, 2.5, dt); this.lookAhead.z = damp(this.lookAhead.z, vel.z * 0.25, 2.5, dt);
    const tgt = target.clone().add(this.lookAhead); tgt.y += 1.25;
    this.focus.x = damp(this.focus.x, tgt.x, 7, dt); this.focus.z = damp(this.focus.z, tgt.z, 7, dt); this.focus.y = damp(this.focus.y, tgt.y, 4.5, dt);
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const pos = new THREE.Vector3(this.focus.x + Math.sin(this.yaw) * cp * this.dist, this.focus.y + sp * this.dist + 0.4, this.focus.z + Math.cos(this.yaw) * cp * this.dist);
    if (terrain) {
      // pull the camera in front of anything solid between the player and the lens (tree canopies, buildings)
      const f = this.focus, len = pos.distanceTo(f); let hit = 1;
      for (let i = 1; i <= 16 && hit === 1; i++) { const t = i / 16, x = lerp(f.x, pos.x, t), y = lerp(f.y, pos.y, t), z = lerp(f.z, pos.z, t);
        for (const c of terrain.colliders) { const k = c.cam; if (!k || y < k.y0 || y > k.y1) continue; if ((x - c.x) ** 2 + (z - c.z) ** 2 < k.r * k.r) { hit = t; break; } } }
      if (hit < 1) { const t = Math.max(0.28, hit - 1 / 16); pos.set(lerp(f.x, pos.x, t), lerp(f.y, pos.y, t), lerp(f.z, pos.z, t)); }
      const top = terrain.topAt(pos.x, pos.z); if (top > -Infinity && pos.y < top + 0.9) pos.y = top + 0.9;
    }
    const look = this.focus.clone();
    this.shotW = damp(this.shotW, this.shot ? 1 : 0, 3.2, dt);
    if (this.shotW > 0.002 && (this.shot || this.shotW > 0.01)) {
      const s = this.shot || this.lastShot; if (this.shot) this.lastShot = this.shot;
      if (s) { pos.lerp(s.pos, this.shotW); look.lerp(s.look, this.shotW); }
    }
    if (this.shake > 0.001) { pos.x += (Math.random() - 0.5) * this.shake; pos.y += (Math.random() - 0.5) * this.shake; this.shake = damp(this.shake, 0, 6, dt); }
    this.camera.position.copy(pos); this.camera.lookAt(look);
    const fovT = this.shot ? 42 : 52 + clamp(vel.length() * 0.35, 0, 3); this.fov = damp(this.fov, fovT, 3, dt);
    if (Math.abs(this.camera.fov - this.fov) > 0.01) { this.camera.fov = this.fov; this.camera.updateProjectionMatrix(); }
  }
}
