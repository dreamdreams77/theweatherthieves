import * as THREE from 'three';
import { Parts, mesh, vcMat, tube } from './Build.js';
import { std } from '../gfx/Mat.js';
import { beamMaterial } from '../gfx/Shaders.js';
import { Tex } from '../gfx/Textures.js';
import { clamp, damp, lerp, TAU, rng, smoothstep } from '../core/Utils.js';
import { lathe } from '../characters/Rig.js';
import { Assets } from '../gfx/Assets.js';

const glow = (c, i = 1.5) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.4 });

/** ---------------- Puzzle 1: Lanternbloom is created in Flora; this wraps behaviour ---------------- */
export class BloomPlant {
  constructor(parts, pos, id) {
    Object.assign(this, parts); this.id = id; this.pos = pos.clone().add(new THREE.Vector3(0, 1.0, 0)); this.radius = 0.6;
    this.water = 0; this.bloom = 0; this.group.position.copy(pos); this.wilt = 1; this.bloomed = false; this.sway = Math.random() * 6; this.drinking = 0;
  }
  weather(dt, w) {
    if (w.rain > 0.3 && !this.bloomed) { this.water = Math.min(1, this.water + dt * 0.3 * w.rain * 1.4); this.drinking = 1; } else this.drinking = Math.max(0, this.drinking - dt * 2);
    if (!this.bloomed && w.rain < 0.3) this.water = Math.max(0, this.water - dt * 0.012);
    if (this.water >= 1 && !this.bloomed) { this.bloomed = true; this.onBloom?.(this); }
    if (w.sun > 0.2 && this.bloomed) this.bloom = Math.min(1, this.bloom + dt * 0.1);
    if (w.frost > 0.4) this.water = Math.max(0, this.water - dt * 0.2);
  }
  update(dt, t) {
    const target = this.bloomed ? 1 : this.water * 0.45; this.bloom = damp(this.bloom, target, 3, dt);
    const open = this.bloom, wilt = 1 - Math.min(1, this.water * 1.2 + (this.bloomed ? 1 : 0));
    this.head.rotation.x = wilt * 0.95 + Math.sin(t * 1.3 + this.sway) * 0.03; this.head.rotation.z = Math.sin(t * 0.9 + this.sway) * 0.04 * (1 - wilt);
    for (const p of this.petals) { p.hinge.rotation.z = lerp(-0.1, -1.15, open) + Math.sin(t * 2 + this.sway) * 0.02 * open; }
    const col = new THREE.Color(0x8c8a80).lerp(new THREE.Color(0xff8cb5), open); this.petalMat.color.copy(col); this.petalMat.emissive.setHex(0xff6aa0); this.petalMat.emissiveIntensity = open * 0.6;
    this.bulb.material.emissiveIntensity = open * 2.2; this.bulb.material.color.set(open > 0.5 ? 0xffe6a8 : 0x8a8a7a);
    this.light.intensity = open * 2.2; this.bulb.scale.setScalar(lerp(0.8, 1.1, open) + Math.sin(t * 3 + this.sway) * 0.03 * open);
  }
}

/** ---------------- Puzzle 2: brass sun mirror, ice-sealed Sun Gate ---------------- */
export class SunMirror {
  constructor(scene, pos, weather, terrain) {
    this.pos = pos.clone(); this.weather = weather; this.yaw = -0.3; this.pitch = 0.0; this.lit = 0; this.beamLen = 34; this.radius = 1.4; this.scene = scene;
    this.group = new THREE.Group(); this.group.position.copy(pos);
    const p = new Parts(); p.add(new THREE.CylinderGeometry(0.9, 1.2, 0.5, 10), 0x9a94a2, { p: [0, 0.25, 0], jitter: 0.2 }); p.add(new THREE.CylinderGeometry(0.55, 0.7, 1.5, 10), 0xb0a8ba, { p: [0, 1.2, 0], jitter: 0.2 });
    for (let i = 0; i < 4; i++) p.add(new THREE.BoxGeometry(0.25, 0.25, 0.25), 0xd9b25a, { p: [Math.cos(i * 1.57) * 0.62, 1.3, Math.sin(i * 1.57) * 0.62], r: [0, -i * 1.57, 0] });
    this.group.add(mesh(p.merge(), vcMat({ roughness: 0.8, flatShading: true })));
    this.yawG = new THREE.Group(); this.yawG.position.y = 2.35; this.group.add(this.yawG);
    this.pitchG = new THREE.Group(); this.yawG.add(this.pitchG);
    const brass = std({ color: 0xd9b25a, metalness: 0.85, roughness: 0.3 });
    this.pitchG.add(mesh(new THREE.TorusGeometry(1.1, 0.1, 10, 36), brass));
    const mir = new THREE.Mesh(new THREE.CircleGeometry(1.02, 36), new THREE.MeshStandardMaterial({ color: 0xfff6dc, metalness: 1, roughness: 0.06, emissive: 0xffe0a0, emissiveIntensity: 0.05, side: THREE.DoubleSide })); this.mirror = mir; this.pitchG.add(mir);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; const ray = mesh(new THREE.ConeGeometry(0.08, 0.35, 4), brass); ray.position.set(Math.cos(a) * 1.33, Math.sin(a) * 1.33, 0); ray.rotation.z = a - Math.PI / 2; this.pitchG.add(ray); }
    this.yawG.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.35, 8), brass).translateY(-1.1));
    this.pitchG.position.y = 0; this.pitchG.rotation.x = -0.2;
    // beam
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.55, 1, 16, 1, true).translate(0, 0.5, 0), beamMaterial(0xfff0b0)); this.beam.renderOrder = 5; this.beam.frustumCulled = false; scene.add(this.beam);
    this.core = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 1, 8, 1, true).translate(0, 0.5, 0), beamMaterial(0xffffff)); this.core.frustumCulled = false; scene.add(this.core);
    this.dir = new THREE.Vector3(); this.origin = new THREE.Vector3(); this.beamDef = { o: this.origin, d: this.dir, len: this.beamLen, r: 0.9, power: 0 }; weather.beams.push(this.beamDef);
    this.spot = new THREE.PointLight(0xffe0a0, 0, 10, 2); scene.add(this.spot); this.blockers = [];
  }
  rotate(dyaw) { this.yaw += dyaw; }
  /** sunlight reaches the mirror when no cloud shades the column between mirror and sun */
  checkSun(sunDir) {
    this.shaded = null; const o = this.pos.clone().add(new THREE.Vector3(0, 2.35, 0));
    for (const c of this.weather.clouds) { const v = new THREE.Vector3().subVectors(c.pos, o), along = v.dot(sunDir); if (along < 0) continue; const perp = v.sub(sunDir.clone().multiplyScalar(along)).length(); if (perp < c.footprint * 0.95 + 1.0) { this.shaded = c; break; } }
    return !this.shaded;
  }
  update(dt, t, sunDir, active = true) {
    const sunny = this.checkSun(sunDir) && active; this.lit = damp(this.lit, sunny ? 1 : 0, 4, dt);
    this.yawG.rotation.y = damp(this.yawG.rotation.y, this.yaw, 8, dt);
    // mirror faces: the normal points halfway between sun dir and beam dir; we just orient the face towards beam direction mirrored visually
    const yawN = this.yawG.rotation.y; this.dir.set(Math.sin(yawN), 0.12, Math.cos(yawN)).normalize();
    this.origin.copy(this.pos).add(new THREE.Vector3(0, 2.35, 0)).addScaledVector(this.dir, 1.0);
    // mirror plane orientation: mirror normal = normalize(sunDir + dir)
    const n = new THREE.Vector3().addVectors(sunDir, this.dir).normalize(); const look = new THREE.Vector3().copy(this.pitchG.getWorldPosition(new THREE.Vector3())).add(n);
    this.pitchG.lookAt(look); this.pitchG.rotateY(0);
    const len = this.beamLen * (0.25 + 0.75 * this.lit);
    this.beamDef.power = this.lit > 0.5 ? this.lit : 0; this.beamDef.len = len;
    for (const b of [this.beam, this.core]) { b.visible = this.lit > 0.02; b.position.copy(this.origin); b.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), this.dir); b.scale.set(1, len, 1); b.material.uniforms.uPow.value = this.lit; }
    this.mirror.material.emissiveIntensity = 0.05 + this.lit * 0.9;
    this.spot.position.copy(this.origin).addScaledVector(this.dir, 1.5); this.spot.intensity = this.lit * 3;
  }
}
export class IceBlock {
  constructor(pos, size = 1) {
    this.pos = pos.clone().add(new THREE.Vector3(0, 1.4 * size, 0)); this.radius = 1.6 * size; this.melt = 0; this.frozen = true; this.group = new THREE.Group(); this.group.position.copy(pos); this.size = size;
    const it = Assets.tex; const mat = new THREE.MeshStandardMaterial({ color: 0xcfeeff, roughness: 0.12, metalness: 0.0, transparent: true, opacity: 0.78, emissive: 0x4ab0e0, emissiveIntensity: 0.14, flatShading: true, map: it.iceColor || null, normalMap: it.iceNormal || null, roughnessMap: it.iceRough || null });
    this.mat = mat; this.ice = new THREE.Group(); this.group.add(this.ice);
    const r = rng(9); for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), mat); m.scale.set((0.9 + r() * 0.5) * size, (1.0 + r() * 1.1) * size, (0.9 + r() * 0.5) * size); m.position.set((r() - 0.5) * 2.2 * size, m.scale.y * 0.85, (r() - 0.5) * 1.4 * size); m.rotation.set(r() * 0.5, r() * 3, r() * 0.5); m.castShadow = true; this.ice.add(m); }
    const m2 = new THREE.Mesh(new THREE.OctahedronGeometry(1.3 * size, 0), mat); m2.scale.set(1.4, 1.5, 1.2); m2.position.y = 1.5 * size; m2.castShadow = true; this.ice.add(m2);
    this.puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x7fd0f0, transparent: true, opacity: 0.6, roughness: 0.1 })); this.puddle.position.y = 0.06; this.puddle.scale.setScalar(0.01); this.group.add(this.puddle);
  }
  weather(dt, w) { if (!this.frozen) return; if (w.sun > 0.3) this.melt = Math.min(1, this.melt + dt * 0.2 * w.sun); if (w.frost > 0.3) this.melt = Math.max(0, this.melt - dt * 0.12 * w.frost); if (this.melt >= 1) { this.frozen = false; this.onMelt?.(); } }
  update(dt, t, fx) {
    const k = 1 - this.melt; const s = lerp(0.001, 1, Math.pow(k, 0.7)); this.ice.scale.set(lerp(1, 0.85, 1 - k) * Math.max(s, 0.001), Math.max(s, 0.001), lerp(1, 0.85, 1 - k) * Math.max(s, 0.001)); this.ice.visible = k > 0.02;
    this.mat.opacity = 0.35 + 0.4 * k; this.puddle.scale.setScalar(Math.max(0.01, (1 - k) * 3.2 * this.size)); this.puddle.material.opacity = 0.7 * Math.min(1, k * 3 + 0.2);
    if (this.melt > 0.02 && this.melt < 1 && fx && Math.random() < dt * 14) fx.burst(new THREE.Vector3(this.group.position.x + (Math.random() - 0.5) * 2, this.group.position.y + 0.3 + Math.random() * 1.6, this.group.position.z + (Math.random() - 0.5)), 0x9fe6ff, 2, 1.2, 0.8);
  }
}
export class SunGate {
  constructor(pos, yaw, terrain) {
    this.pos = pos.clone(); this.open = 0; this.group = new THREE.Group(); this.group.position.copy(pos); this.group.rotation.y = yaw; this.yaw = yaw;
    const p = new Parts(), r = rng(21);
    for (const s of [-1, 1]) for (let i = 0; i < 5; i++) p.add(new THREE.BoxGeometry(1.2, 1.1, 1.2), 0xa59cae, { p: [s * 2.6, 0.55 + i * 1.05, 0], r: [0, r() * 0.08, 0], jitter: 0.25 });
    for (let i = 0; i < 11; i++) { const a = (i / 10) * Math.PI; p.add(new THREE.BoxGeometry(1.0, 0.9, 1.2), 0xb3aabb, { p: [Math.cos(a) * 2.6, 5.4 + Math.sin(a) * 1.5, 0], r: [0, 0, a - Math.PI / 2], jitter: 0.2 }); }
    this.group.add(mesh(p.merge(), vcMat({ roughness: 0.95, flatShading: true })));
    // sun emblem
    const em = new THREE.Group(); em.position.set(0, 6.4, 0.7); this.group.add(em); const brass = std({ color: 0xd9b25a, metalness: 0.9, roughness: 0.3 });
    em.add(mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.12, 20).rotateX(Math.PI / 2), brass)); for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; const c = mesh(new THREE.ConeGeometry(0.1, 0.4, 4), brass); c.position.set(Math.cos(a) * 0.72, Math.sin(a) * 0.72, 0); c.rotation.z = a - Math.PI / 2; em.add(c); }
    this.emblem = em;
    this.door = []; const doorMat = std({ color: 0x8a6a4a, roughness: 0.8, map: Tex.wood() });
    for (const s of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(s * 2.0, 0, 0); const d = mesh(new THREE.BoxGeometry(2.0, 5.0, 0.35), doorMat); d.position.set(-s * 1.0, 2.5, 0); piv.add(d);
      const bands = new Parts(); for (let i = 0; i < 4; i++) bands.add(new THREE.BoxGeometry(2.0, 0.14, 0.4), 0x6a5a62, { p: [0, 0.8 + i * 1.2, 0] }); const bm = mesh(bands.merge(), vcMat({ metalness: 0.5, roughness: 0.5 })); bm.position.set(-s * 1.0, 0, 0); piv.add(bm);
      this.group.add(piv); this.door.push({ piv, s }); }
    this.colliders = [terrain.addCollider({ x: pos.x, z: pos.z, r: 1.15, y0: pos.y - 1, y1: pos.y + 6 })];
    const loc = (dx) => new THREE.Vector3(dx, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(pos);
    const l1 = loc(1.2), l2 = loc(-1.2); this.colliders.push(terrain.addCollider({ x: l1.x, z: l1.z, r: 1.15, y0: pos.y - 1, y1: pos.y + 6 }), terrain.addCollider({ x: l2.x, z: l2.z, r: 1.15, y0: pos.y - 1, y1: pos.y + 6 }));
    this.colliders.push(terrain.addCollider({ x: loc(2.8).x, z: loc(2.8).z, r: 1.1, y0: pos.y - 1, y1: pos.y + 6 }), terrain.addCollider({ x: loc(-2.8).x, z: loc(-2.8).z, r: 1.1, y0: pos.y - 1, y1: pos.y + 6 }));
    this.target = 0;
  }
  setOpen(v) { this.target = v; if (v) this.colliders.forEach((c) => (c.enabled = false)); }
  update(dt, t) { this.open = damp(this.open, this.target, 2.2, dt); for (const d of this.door) d.piv.rotation.y = d.s * -this.open * 1.55; this.emblem.rotation.z += dt * (0.2 + this.open * 2); this.emblem.children[0].material.emissive?.setHex(0); }
}

/** ---------------- Puzzle 3: feather crates, pressure plates, windmill + lift ---------------- */
export class FeatherCrate {
  constructor(pos, terrain, id, home) {
    this.id = id; this.terrain = terrain; this.pos = pos.clone(); this.vel = new THREE.Vector3(); this.radius = 0.62; this.frozen = 0; this.home = home.clone();
    this.group = new THREE.Group();
    const p = new Parts(); p.add(new THREE.BoxGeometry(1.0, 1.0, 1.0), 0xb98a58, { p: [0, 0.5, 0], jitter: 0.12 });
    for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) p.add(new THREE.BoxGeometry(0.12, 1.02, 0.12), 0x7a4e3a, { p: [x, 0.5, z] });
    for (const y of [0.2, 0.8]) p.add(new THREE.BoxGeometry(1.04, 0.1, 1.04), 0x8a5e44, { p: [0, y, 0] });
    for (let i = 0; i < 5; i++) { p.add(new THREE.SphereGeometry(0.28, 8, 6), 0xfaf5ee, { p: [(i - 2) * 0.17, 1.15 + (i % 2) * 0.05, 0.1], s: [0.35, 1.0, 0.12], r: [0, 0, (i - 2) * 0.28] }); }
    p.add(new THREE.CircleGeometry(0.25, 12), 0xe86a5a, { p: [0, 0.5, 0.52] });
    this.body = mesh(p.merge(), vcMat({ roughness: 0.85 })); this.group.add(this.body);
    this.shell = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.25, 1.25), new THREE.MeshStandardMaterial({ color: 0xbfeaff, transparent: true, opacity: 0, roughness: 0.05, emissive: 0x3aa0d0, emissiveIntensity: 0.25, flatShading: true })); this.shell.position.y = 0.55; this.shell.visible = false; this.group.add(this.shell);
    this.spin = 0;
  }
  weather(dt, w) {
    if (w.frost > 0.1) this.frozen = Math.min(1, this.frozen + dt * 0.7 * w.frost); else if (w.sun > 0.2) this.frozen = Math.max(0, this.frozen - dt * 0.4 * w.sun);
    if (this.frozen < 0.5) { const f = w.wind.clone().setY(0); f.sub(w.breeze); this.vel.addScaledVector(f, dt * (1.0 - this.frozen)); } else this.vel.multiplyScalar(0.8);
  }
  update(dt, t, player, others) {
    const v = this.vel; v.multiplyScalar(Math.exp(-2.4 * dt)); if (this.frozen > 0.5) v.set(0, v.y, 0);
    const nx = this.pos.x + v.x * dt, nz = this.pos.z + v.z * dt; const g = this.terrain.groundAt(nx, nz, this.pos.y + 0.3, 0.4);
    if (g) { this.pos.x = nx; this.pos.z = nz; this.pos.y = damp(this.pos.y, g.y, 20, dt); v.y = 0; } else { v.y -= 20 * dt; this.pos.x = nx; this.pos.z = nz; this.pos.y += v.y * dt; if (this.pos.y < -25) { this.pos.copy(this.home); v.set(0, 0, 0); } }
    this.terrain.push(this.pos, this.radius, this.pos.y);
    for (const o of others) { if (o === this) continue; const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.z, d = Math.hypot(dx, dz), min = this.radius * 2; if (d < min && d > 1e-4) { const push = (min - d) * 0.5; this.pos.x += (dx / d) * push; this.pos.z += (dz / d) * push; } }
    if (player) { const dx = this.pos.x - player.pos.x, dz = this.pos.z - player.pos.z, d = Math.hypot(dx, dz), min = this.radius + 0.4; if (d < min && d > 1e-4 && this.frozen < 0.5 && Math.abs(player.pos.y - this.pos.y) < 1.2) { const push = (min - d); this.pos.x += (dx / d) * push * 0.8; this.pos.z += (dz / d) * push * 0.8; v.x += (dx / d) * 1.2; v.z += (dz / d) * 1.2; } else if (d < min && this.frozen >= 0.5) { player.pos.x -= (dx / d) * (min - d); player.pos.z -= (dz / d) * (min - d); } }
    const speed = Math.hypot(v.x, v.z); this.group.position.copy(this.pos); this.group.position.y += Math.sin(t * 3 + this.id) * 0.01 * Math.min(1, speed);
    if (speed > 0.3) { this.group.rotation.y += (v.x * 0.02 - v.z * 0.0) * 0.4; this.group.rotation.z = damp(this.group.rotation.z, -v.x * 0.05, 8, dt); this.group.rotation.x = damp(this.group.rotation.x, v.z * 0.05, 8, dt); } else { this.group.rotation.z = damp(this.group.rotation.z, 0, 6, dt); this.group.rotation.x = damp(this.group.rotation.x, 0, 6, dt); }
    this.shell.visible = this.frozen > 0.05; this.shell.material.opacity = this.frozen * 0.55;
  }
}
export class PressurePlate {
  constructor(pos) {
    this.pos = pos.clone(); this.group = new THREE.Group(); this.group.position.copy(pos); this.active = 0; this.on = false; this.r = 0.95;
    const p = new Parts(); p.add(new THREE.CylinderGeometry(1.15, 1.3, 0.2, 18), 0x8d8696, { p: [0, 0.1, 0], jitter: 0.1 }); p.add(new THREE.CylinderGeometry(0.95, 0.95, 0.06, 18), 0x6d6678, { p: [0, 0.22, 0] });
    this.group.add(mesh(p.merge(), vcMat({ roughness: 0.8 })));
    this.rune = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.05, 8, 40), glow(0xff8a4a, 0.4)); this.rune.rotation.x = Math.PI / 2; this.rune.position.y = 0.27; this.group.add(this.rune);
    const star = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.34, 6), glow(0xff8a4a, 0.4)); star.rotation.x = -Math.PI / 2; star.position.y = 0.26; this.group.add(star); this.star = star;
  }
  update(dt, crates) {
    this.on = crates.some((c) => Math.hypot(c.pos.x - this.pos.x, c.pos.z - this.pos.z) < this.r);
    this.active = damp(this.active, this.on ? 1 : 0, 6, dt);
    const c = new THREE.Color(0xff8a4a).lerp(new THREE.Color(0x7dffb0), this.active);
    for (const m of [this.rune, this.star]) { m.material.emissive.copy(c); m.material.color.copy(c); m.material.emissiveIntensity = 0.4 + this.active * 1.8; }
    this.group.children[0].position.y = -this.active * 0.05;
  }
}
export class Windmill {
  constructor(pos, yaw, terrain) {
    this.pos = pos.clone(); this.group = new THREE.Group(); this.group.position.copy(pos); this.group.rotation.y = yaw; this.yaw = yaw; this.spin = 0; this.spinV = 0; this.charge = 0; this.braked = true; this.radius = 4.5; this.hubWorld = pos.clone().add(new THREE.Vector3(0, 8.2, 0));
    const p = new Parts(), r = rng(12);
    for (let i = 0; i < 9; i++) { p.add(new THREE.CylinderGeometry(2.0 - i * 0.12, 2.15 - i * 0.12, 1.0, 14), i % 2 ? 0xd8cdbb : 0xcfc2ae, { p: [0, 0.5 + i * 0.95, 0], r: [0, r(), 0], jitter: 0.12 }); }
    p.add(new THREE.SphereGeometry(1.75, 18, 10, 0, TAU, 0, Math.PI * 0.5), 0xd8604a, { p: [0, 9.0, 0], s: [1, 0.85, 1] });
    p.add(new THREE.TorusGeometry(1.8, 0.1, 6, 24), 0x6a4a3a, { p: [0, 9.0, 0], r: [Math.PI / 2, 0, 0] });
    for (let i = 0; i < 3; i++) p.add(new THREE.BoxGeometry(0.9, 1.0, 0.1), 0x6a4a8a, { p: [0, 1.0 + i * 2.6, 1.95 - i * 0.12], r: [-0.18 + 0.0 * i, 0, 0] }); // door slabs / windows
    this.group.add(mesh(p.merge(), vcMat({ roughness: 0.85, flatShading: true })));
    for (let i = 0; i < 4; i++) { const w = new THREE.Mesh(new THREE.CircleGeometry(0.28, 12), new THREE.MeshStandardMaterial({ color: 0xffd58a, emissive: 0xffb04a, emissiveIntensity: 1 })); const a = i * 1.57 + 0.4; w.position.set(Math.sin(a) * 1.78, 3.5 + (i % 2) * 2.2, Math.cos(a) * 1.78 - 0.0); w.rotation.y = a; this.group.add(w); }
    this.hub = new THREE.Group(); this.hub.position.set(0, 8.2, 2.1); this.group.add(this.hub);
    const sp = new Parts(); sp.add(new THREE.CylinderGeometry(0.35, 0.45, 0.8, 10).rotateX(Math.PI / 2), 0x6a4a3a, { jitter: 0.1 });
    for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU;
      sp.add(new THREE.BoxGeometry(0.22, 6.4, 0.18), 0x7a5a42, { p: [Math.cos(a) * 3.2, Math.sin(a) * 3.2, 0], r: [0, 0, a - Math.PI / 2], s: [1, 1, 1] });
      for (let j = 0; j < 4; j++) { const rr = 1.3 + j * 1.35; sp.add(new THREE.BoxGeometry(1.4, 0.07, 0.07), 0x8a6a52, { p: [Math.cos(a) * rr + Math.cos(a + Math.PI / 2) * 0.72, Math.sin(a) * rr + Math.sin(a + Math.PI / 2) * 0.72, 0], r: [0, 0, a] }); }
      sp.add(new THREE.BoxGeometry(5.0, 1.55, 0.04), [0xf4ead2, 0xe86a5a, 0x4aa8a0, 0xe8b23a][k], { p: [Math.cos(a) * 3.8 + Math.cos(a + Math.PI / 2) * 0.78, Math.sin(a) * 3.8 + Math.sin(a + Math.PI / 2) * 0.78, 0.02], r: [0, 0, a], jitter: 0.1 }); }
    this.hub.add(mesh(sp.merge(), vcMat({ roughness: 0.9, side: THREE.DoubleSide })));
    this.colliders = [terrain.addCollider({ x: pos.x, z: pos.z, r: 2.2, y0: pos.y - 1, y1: pos.y + 10, cam: { r: 2.3, y0: pos.y - 1, y1: pos.y + 10 } })];
    // brake lever
    this.lever = new THREE.Group(); this.lever.position.set(2.9, 0, 3.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0); this.group.add(this.lever);
    this.lever.add(mesh(new THREE.BoxGeometry(0.7, 0.4, 0.7), std({ color: 0x7a7480 }))); const arm = mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.3, 8), std({ color: 0xd9b25a, metalness: 0.7, roughness: 0.3 })); arm.position.y = 0.7; this.armPivot = new THREE.Group(); this.armPivot.position.y = 0.3; this.armPivot.add(arm); this.lever.add(this.armPivot);
    const knob = mesh(new THREE.SphereGeometry(0.16, 10, 8), std({ color: 0xe86a5a })); knob.position.y = 1.4; this.armPivot.add(knob); this.armPivot.rotation.z = 0.7; this.brake = 1;
  }
  weather(dt, w) { const f = w.wind.clone().sub(w.breeze); const s = Math.hypot(f.x, f.z); this.windIn = s; }
  setBrake(b) { this.braked = b; }
  update(dt, t, ratchet) {
    const s = this.windIn || 0; this.windIn = 0;
    const drive = this.braked ? 0 : clamp(s / 14, 0, 1.4);
    this.spinV = damp(this.spinV, drive * 4.5 + (this.braked ? 0 : 0.3 + Math.sin(t * 0.7) * 0.1), 1.8, dt);
    this.spin += this.spinV * dt; this.hub.rotation.z = this.spin;
    if (!this.braked) this.charge = clamp(this.charge + dt * drive * 0.12, 0, 1);
    this.brake = damp(this.brake, this.braked ? 1 : 0, 6, dt); this.armPivot.rotation.z = lerp(-0.7, 0.7, this.brake);
  }
}
export class Lift {
  constructor(pos, y1, terrain) {
    this.y0 = pos.y; this.y1 = y1; this.pos = pos.clone(); this.group = new THREE.Group(); this.group.position.copy(pos); this.level = 0;
    const p = new Parts(); p.add(new THREE.CylinderGeometry(2.4, 2.5, 0.35, 20), 0xa07850, { p: [0, -0.15, 0], jitter: 0.12 });
    p.add(new THREE.TorusGeometry(2.3, 0.1, 6, 28), 0x6a5a62, { p: [0, 0.05, 0], r: [Math.PI / 2, 0, 0] });
    for (let i = 0; i < 12; i++) p.add(new THREE.BoxGeometry(0.3, 0.06, 4.6), 0xb98a58, { p: [0, 0.03, 0], r: [0, (i / 12) * Math.PI, 0], jitter: 0.2 });
    for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.78; p.add(new THREE.CylinderGeometry(0.07, 0.07, 1.1, 6), 0x6a5a62, { p: [Math.cos(a) * 2.3, 0.55, Math.sin(a) * 2.3] }); }
    this.group.add(mesh(p.merge(), vcMat({ roughness: 0.8 })));
    this.surface = { enabled: true, heightAt: (x, z) => (Math.hypot(x - this.group.position.x, z - this.group.position.z) < 2.3 ? this.group.position.y : -Infinity) };
    // shaft with ropes + frame
    const tp = new Parts(); const H = y1 - pos.y + 3; for (const [x, z] of [[-2.6, -2.2], [2.6, -2.2], [-2.6, 2.2], [2.6, 2.2]]) tp.add(new THREE.BoxGeometry(0.28, H + 1, 0.28), 0x7a5a42, { p: [x, H / 2 - 1, z], jitter: 0.1 });
    for (let k = 0; k < 4; k++) { const y = k * (H / 3.2) - 0.5; for (const z of [-2.2, 2.2]) tp.add(new THREE.BoxGeometry(5.4, 0.18, 0.18), 0x8a6a52, { p: [0, y, z] }); tp.add(new THREE.BoxGeometry(0.18, 0.18, 4.6), 0x8a6a52, { p: [-2.6, y, 0] }); tp.add(new THREE.BoxGeometry(0.18, 0.18, 4.6), 0x8a6a52, { p: [2.6, y, 0] }); }
    this.frame = mesh(tp.merge(), vcMat({ roughness: 0.9 })); this.frame.position.copy(pos); this.frame.position.y = pos.y;
    this.ropes = [];
  }
  /** ready: windmill fully charged; riding: someone is standing on the platform. Rises only with a passenger. */
  update(dt, ready, riding, charge = 0) {
    const g = this.group.position; let y = g.y;
    if (ready && riding) y = Math.min(this.y1, y + 3.2 * dt);
    else if (!riding) y = Math.max(this.y0 + (ready ? 0 : charge * 0.35), y - 4 * dt);
    g.y = y; this.level = (y - this.y0) / (this.y1 - this.y0);
  }
}
