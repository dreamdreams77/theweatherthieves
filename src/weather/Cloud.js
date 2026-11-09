import * as THREE from 'three';
import { Parts, mesh, vcMat, puff } from '../world/Build.js';
import { Face } from '../characters/Face.js';
import { std } from '../gfx/Mat.js';
import { rng, damp, clamp, lerp, TAU } from '../core/Utils.js';

const dropGeo = new THREE.BoxGeometry(0.018, 0.55, 0.018);
const dropMat = new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.7, depthWrite: false });

/** A living cloud: grab it, stretch/compress it, make it rain. */
export class Cloud {
  constructor({ id, pos, size = 1.4, seed = 1, name = 'Cloud', personality = {}, quality, scene, personal = false }) {
    this.id = id; this.name = name; this.personal = personal; this.seed = seed; this.q = quality; this.scene = scene;
    this.group = new THREE.Group(); this.pos = pos.clone(); this.vel = new THREE.Vector3(); this.baseSize = size;
    this.stretch = 1; this.stretchT = 1; this.moisture = 1; this.held = false; this.raining = 0; this.rainOn = false; this.dark = 0; this.grab = 0;
    this.drift = new THREE.Vector3((rng(seed)() - 0.5) * 0.4, 0, (rng(seed + 1)() - 0.5) * 0.4); this.anchor = null; this.homeTimer = 0; this.owner = null; this.lines = personality;
    this.target = null; this.cooldown = 0; this.thunder = 0;
    const p = new Parts(); const r = rng(seed);
    puff(p, 0xffffff, 0, 0, 0, 9, size * 0.9, size * 0.62, seed, 0.1); puff(p, 0xf3f6ff, 0, size * 0.35, 0, 4, size * 0.5, size * 0.55, seed + 5, 0.1);
    // belly shading via vertex colour darkening (bottom)
    const g = p.merge(); const pa = g.attributes.position, ca = g.attributes.color;
    for (let i = 0; i < pa.count; i++) { const k = clamp((pa.getY(i) + size * 0.9) / (size * 1.6), 0, 1), s = lerp(0.62, 1.0, Math.pow(k, 0.7)); ca.setXYZ(i, ca.getX(i) * s * 0.98, ca.getY(i) * s, ca.getZ(i) * Math.min(1, s * 1.08)); }
    this.body = new THREE.Mesh(g, std({ vertexColors: true, roughness: 1, emissive: 0x8a96b8, emissiveIntensity: 0.22 })); this.body.castShadow = true; this.group.add(this.body);
    this.bodyMat = this.body.material;
    // face
    this.face = new Face({ r: size * 0.52, skin: 0xfdfdff, eyeColor: 0x405074, eyeX: 0.36, eyeY: 0.12, eyeR: 0.27, brow: 0x6a7490, mouthY: -0.34, mouthW: 0.2, blush: 0xff9aa8, sclera: 0xffffff });
    this.faceG = new THREE.Group(); this.faceG.position.set(0, size * 0.1, size * 0.62); this.faceG.add(this.face.group); this.group.add(this.faceG);
    const fp = new THREE.Mesh(new THREE.SphereGeometry(size * 0.52, 20, 14), std({ color: 0xfafcff, roughness: 1, emissive: 0x8a96b8, emissiveIntensity: 0.15 })); this.faceG.add(fp);
    this.face.set('neutral');
    this.group.position.copy(this.pos); scene.add(this.group);
    // rain
    this.N = quality.mobile ? 140 : 280; this.rainMesh = new THREE.InstancedMesh(dropGeo, dropMat, this.N); this.rainMesh.frustumCulled = false; this.rainMesh.count = 0; scene.add(this.rainMesh);
    this.drops = Array.from({ length: this.N }, () => ({ x: 0, y: 0, z: 0, v: 0, gy: 0, a: 0, d: 0 })); this.dropsInit = false;
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(1, 1, 1);
    this.radius = 0.0; this.say = null;
  }
  get footprint() { return this.baseSize * 1.3 * this.stretch; }
  squeeze(d) { this.stretchT = clamp(this.stretchT + d, 0.45, 2.4); }
  dispose() { this.scene.remove(this.group); this.scene.remove(this.rainMesh); }
  update(dt, t, env) {
    const { terrain, wind, spawnSplash, refill } = env;
    this.cooldown -= dt;
    this.stretch = damp(this.stretch, this.stretchT, 7, dt);
    this.grab = damp(this.grab, this.held ? 1 : 0, 8, dt);
    // motion
    if (this.held && this.target) {
      const dx = this.target.x - this.pos.x, dy = this.target.y - this.pos.y, dz = this.target.z - this.pos.z;
      this.vel.x += (dx * 18 - this.vel.x * 6) * dt; this.vel.y += (dy * 18 - this.vel.y * 6) * dt; this.vel.z += (dz * 18 - this.vel.z * 6) * dt;
    } else {
      this.homeTimer += dt;
      if (this.owner && this.homeTimer > 1.5) { const a = this.owner.cloudAnchorWorld; const dx = a.x - this.pos.x, dy = a.y - this.pos.y, dz = a.z - this.pos.z; const k = 5; this.vel.x += (dx * k - this.vel.x * 2.8) * dt; this.vel.y += (dy * k - this.vel.y * 2.8) * dt; this.vel.z += (dz * k - this.vel.z * 2.8) * dt; }
      else { this.vel.x += (this.drift.x - this.vel.x) * dt * 0.8; this.vel.z += (this.drift.z - this.vel.z) * dt * 0.8; this.vel.y += (Math.sin(t * 0.4 + this.seed) * 0.15 - this.vel.y * 0.9) * dt; }
    }
    this.vel.addScaledVector(wind.force(this.pos, 4), dt * 2.6);
    this.vel.multiplyScalar(1 - Math.min(1, dt * 0.3));
    this.pos.addScaledVector(this.vel, dt);
    if (!this.held) { const lim = 150; if (Math.hypot(this.pos.x, this.pos.z) > lim) { this.vel.x -= this.pos.x * dt * 0.05; this.vel.z -= this.pos.z * dt * 0.05; } }
    this.group.position.copy(this.pos);
    // squash & stretch in x/z preserving volume
    const s = this.stretch, sy = 1 / Math.sqrt(s);
    const wob = 1 + Math.sin(t * 2 + this.seed) * 0.02;
    this.group.scale.set(s * wob, sy / wob, s);
    this.group.rotation.y = lerp(this.group.rotation.y, this.held ? Math.atan2(env.camDir.x, env.camDir.z) : 0, 0.05);
    // rain
    const want = this.rainOn && this.moisture > 0.01 ? (this.rainTarget ?? 1) : 0;
    this.raining = damp(this.raining, want, 5, dt);
    this.density = 1 / (s * s); // compress = heavier downpour
    if (this.raining > 0.02) this.moisture = Math.max(0, this.moisture - dt * 0.07 * this.density * (this.personal ? 0.25 : 1));
    else this.moisture = Math.min(1, this.moisture + dt * (0.03 + (refill ? refill(this.pos) : 0)));
    this.dark = damp(this.dark, 1 - this.moisture * 0.0 - (this.moisture > 0.3 ? 0.5 : 0), 2, dt) * 0 + (1 - this.moisture) * 0; // reserved
    // colour: heavier = greyer, stormy when held & raining
    const gray = this.raining * 0.15 + this.grab * 0.0; this.bodyMat.color.setScalar(1 - gray); this.bodyMat.emissiveIntensity = 0.22 - gray * 0.5 + this.grab * 0.12;
    this.updateRain(dt, terrain, wind, spawnSplash);
    // expression
    this.face.update(dt, t); this.faceG.rotation.z = Math.sin(t * 1.2 + this.seed) * 0.03;
    this.face.lookAt(env.lookTarget || new THREE.Vector3(0, 0, 1));
  }
  updateRain(dt, terrain, wind, spawnSplash) {
    const act = this.raining > 0.02; const rad = this.footprint * 0.95;
    if (!act && this.rainMesh.count === 0) return;
    const n = Math.floor(this.N * clamp(this.raining, 0, 1) * clamp(this.density, 0.4, 1.8) * 0.7);
    const bottom = this.pos.y - 0.5 * (1 / Math.sqrt(this.stretch));
    const D = this.drops, m = this._m, q = this._q, sc = this._s; let c = 0;
    this.rainMesh.count = Math.max(n, 0);
    const slantX = wind.force(this.pos, 6).x * 0.4;
    for (let i = 0; i < n; i++) {
      const d = D[i];
      if (d.a === 0 || d.y <= d.gy) {
        if (d.a === 1 && d.y <= d.gy && Math.random() < 0.12 && spawnSplash) spawnSplash(d.x, d.gy, d.z);
        const ang = Math.random() * TAU, rr = Math.sqrt(Math.random()) * rad;
        d.x = this.pos.x + Math.cos(ang) * rr; d.z = this.pos.z + Math.sin(ang) * rr; d.y = bottom - Math.random() * 1.5; d.v = 14 + Math.random() * 5; d.a = 1;
        const top = terrain.topAt(d.x, d.z);
        d.gy = top === -Infinity ? this.pos.y - 26 : Math.min(top, d.y - 0.5);
      }
      d.y -= d.v * dt; d.x += slantX * dt;
      sc.set(1, 1, 1); q.identity(); m.compose(new THREE.Vector3(d.x, d.y, d.z), q, sc); this.rainMesh.setMatrixAt(i, m);
    }
    this.rainMesh.instanceMatrix.needsUpdate = true;
    if (!act && this.raining < 0.03) { this.rainMesh.count = 0; for (const d of D) d.a = 0; }
  }
  /** does the rain cylinder cover (x,y,z)? returns 0..1 intensity */
  rainAt(x, y, z) {
    if (this.raining < 0.1 || y > this.pos.y - 0.3) return 0;
    const d = Math.hypot(x - this.pos.x, z - this.pos.z), r = this.footprint; if (d > r) return 0;
    return this.raining * (1 - (d / r) ** 2) * clamp(this.density, 0.5, 1.8);
  }
}
