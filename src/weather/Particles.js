import * as THREE from 'three';
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color(), _up = new THREE.Vector3(0, 1, 0), _v = new THREE.Vector3(), _e = new THREE.Euler();
/** Generic instanced particle pool: no per-frame allocation, additive or opaque. */
export class ParticlePool {
  constructor(scene, geo, mat, max, { align = false, fade = 'scale', spin = false } = {}) {
    this.max = max; this.align = align; this.fade = fade; this.spin = spin;
    this.mesh = new THREE.InstancedMesh(geo, mat, max); this.mesh.frustumCulled = false; this.mesh.count = max;
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    this.P = Array.from({ length: max }, () => ({ life: 0, max: 1, pos: new THREE.Vector3(), vel: new THREE.Vector3(), size: 1, grow: 0, g: 0, drag: 0, col: new THREE.Color(1, 1, 1), rot: 0, rv: 0 }));
    this.cursor = 0; _m.makeScale(0, 0, 0); for (let i = 0; i < max; i++) this.mesh.setMatrixAt(i, _m);
    scene.add(this.mesh);
  }
  spawn(pos, vel, { life = 1, size = 0.1, grow = 0, g = 0, drag = 0, color = 0xffffff, rv = 0 } = {}) {
    const p = this.P[this.cursor]; this.cursor = (this.cursor + 1) % this.max;
    p.life = p.max = life; p.pos.copy(pos); p.vel.copy(vel); p.size = size; p.grow = grow; p.g = g; p.drag = drag; p.col.set(color); p.rv = rv; p.rot = Math.random() * 6.28;
  }
  update(dt) {
    const mesh = this.mesh; let any = false;
    for (let i = 0; i < this.max; i++) {
      const p = this.P[i];
      if (p.life <= 0) { if (p.life !== -1) { _m.makeScale(0, 0, 0); mesh.setMatrixAt(i, _m); p.life = -1; any = true; } continue; }
      any = true; p.life -= dt; const k = Math.max(p.life / p.max, 0);
      p.vel.y -= p.g * dt; if (p.drag) p.vel.multiplyScalar(1 - Math.min(1, p.drag * dt)); p.pos.addScaledVector(p.vel, dt); p.rot += p.rv * dt;
      const sz = (p.size + p.grow * (1 - k)) * (this.fade === 'scale' ? Math.min(1, k * 3) * 1 : 1);
      if (this.align) { _v.copy(p.vel); const l = _v.length(); if (l > 1e-4) { _q.setFromUnitVectors(_up, _v.multiplyScalar(1 / l)); } _s.set(sz * 0.25, sz * (1 + l * 0.12), sz * 0.25); } else { if (this.spin) { _e.set(p.rot * 0.7, p.rot, 0); _q.setFromEuler(_e); } else _q.identity(); _s.setScalar(sz); }
      _m.compose(p.pos, _q, _s); mesh.setMatrixAt(i, _m);
      const f = this.fade === 'color' ? k : 1; _c.copy(p.col).multiplyScalar(f); mesh.setColorAt(i, _c);
    }
    if (any) { mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true; }
  }
}
