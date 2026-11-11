import * as THREE from 'three';
import { ParticlePool } from './Particles.js';
import { G } from '../gfx/Mat.js';
import { clamp, smoothstep, TAU } from '../core/Utils.js';

const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _f = new THREE.Vector3();
/** Central weather simulation: clouds, rain columns, gusts, frost breath, sun beams, and everything that reacts. */
export class WeatherSystem {
  constructor(scene, terrain, quality) {
    this.scene = scene; this.terrain = terrain; this.q = quality;
    this.clouds = []; this.reactives = []; this.beams = [];
    this.gust = { active: false, origin: new THREE.Vector3(), dir: new THREE.Vector3(0, 0, -1), range: 15, tan: 0.55, strength: 16, power: 0 };
    this.frost = { active: false, origin: new THREE.Vector3(), dir: new THREE.Vector3(0, 0, -1), range: 10, tan: 0.4, power: 0 };
    this.breeze = new THREE.Vector3(0.35, 0, 0.12); this.time = 0; this.rainRect = [];
    const rings = new THREE.RingGeometry(0.82, 1, 24).rotateX(-Math.PI / 2);
    this.splash = new ParticlePool(scene, rings, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), 120, { fade: 'color' });
    this.streaks = new ParticlePool(scene, new THREE.SphereGeometry(0.1, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }), q(quality, 70, 130), { align: true, fade: 'color' });
    this.frostFx = new ParticlePool(scene, new THREE.IcosahedronGeometry(0.12, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }), q(quality, 80, 160), { fade: 'color' });
    this.sparks = new ParticlePool(scene, new THREE.IcosahedronGeometry(0.07, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), 220, { fade: 'color' });
    const leaf = new THREE.PlaneGeometry(0.22, 0.14).rotateX(0);
    this.leaves = new ParticlePool(scene, leaf, new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.8 }), q(quality, 45, 90), { fade: 'scale', spin: true });
    this.motes = new ParticlePool(scene, new THREE.IcosahedronGeometry(0.035, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }), q(quality, 70, 150), { fade: 'color' });
    this.smoke = new ParticlePool(scene, new THREE.IcosahedronGeometry(0.25, 1), new THREE.MeshBasicMaterial({ color: 0x9a9aa8, transparent: true, opacity: 0.35, depthWrite: false }), 40, { fade: 'scale' });
    this.flakes = new ParticlePool(scene, new THREE.IcosahedronGeometry(0.06, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }), q(quality, 140, 320), { fade: 'scale' }); this.ambient = null; this.flakeT = 0;
    this.leafT = 0; this.moteT = 0; this.focus = new THREE.Vector3(); this.rainLevel = 0; this.leafCols = [0xe29a3a, 0xd8643c, 0xa8c850, 0xf0c65a];
  }
  addCloud(c) { this.clouds.push(c); return c; }
  register(o) { this.reactives.push(o); return o; }
  unregister(o) { const i = this.reactives.indexOf(o); if (i >= 0) this.reactives.splice(i, 1); }
  setGust(on, origin, dir) { this.gust.active = on; if (on) { this.gust.origin.copy(origin); this.gust.dir.copy(dir).setY(clamp(dir.y, -0.2, 0.25)).normalize(); } }
  setFrost(on, origin, dir) { this.frost.active = on; if (on) { this.frost.origin.copy(origin); this.frost.dir.copy(dir).normalize(); } }
  /** wind force vector at a point (m/s^2-ish), includes breeze */
  force(pos, pad = 0) {
    _f.copy(this.breeze);
    const g = this.gust; if (g.power > 0.02) {
      _v.subVectors(pos, g.origin); const along = _v.dot(g.dir);
      if (along > 0 && along < g.range) { _w.copy(g.dir).multiplyScalar(along); const perp = _v.sub(_w).length(); if (perp < along * g.tan + 1.2 + pad) _f.addScaledVector(g.dir, g.strength * g.power * (1 - along / g.range)); }
    }
    return _f;
  }
  frostAt(pos, pad = 0) {
    const f = this.frost; if (f.power < 0.05) return 0;
    _v.subVectors(pos, f.origin); const along = _v.dot(f.dir); if (along < 0 || along > f.range) return 0;
    const perp = _v.sub(_w.copy(f.dir).multiplyScalar(along)).length(); if (perp > along * f.tan + 1.0 + pad) return 0;
    return f.power * (1 - along / f.range * 0.6);
  }
  sunAt(pos, pad = 0) {
    let s = 0; for (const b of this.beams) {
      _v.subVectors(pos, b.o); const along = clamp(_v.dot(b.d), 0, b.len); _w.copy(b.o).addScaledVector(b.d, along); const d = _w.distanceTo(pos);
      if (d < b.r + pad) s = Math.max(s, b.power * (1 - d / (b.r + pad) * 0.5));
    } return s;
  }
  snowAt(pos) { let r = 0; for (const c of this.clouds) r = Math.max(r, c.snowAt(pos.x, pos.y, pos.z)); return r; }
  rainAt(pos) { let r = 0; for (const c of this.clouds) r = Math.max(r, c.rainAt(pos.x, pos.y, pos.z)); return r; }
  update(dt, t, camPos) {
    this.time = t;
    const g = this.gust, f = this.frost;
    g.power += ((g.active ? 1 : 0) - g.power) * Math.min(1, dt * 8); f.power += ((f.active ? 1 : 0) - f.power) * Math.min(1, dt * 8);
    if (g.power > 0.02) { G.uGust.value.set(g.origin.x + g.dir.x * g.range * 0.5, g.origin.y, g.origin.z + g.dir.z * g.range * 0.5, g.range * 0.65); G.uGustV.value.set(g.dir.x * g.power, 0, g.dir.z * g.power); } else G.uGust.value.w = 0.001;
    // reactives
    const w = this._w ??= { rain: 0, wind: new THREE.Vector3(), sun: 0, frost: 0, breeze: this.breeze };
    for (const o of this.reactives) {
      if (o.enabled === false) continue;
      w.rain = this.rainAt(o.pos); w.snow = this.snowAt(o.pos); w.wind.copy(this.force(o.pos, o.radius || 0)); w.sun = this.sunAt(o.pos, o.radius || 0); w.frost = this.frostAt(o.pos, o.radius || 0);
      o.weather(dt, w);
    }
    // fx
    if (g.power > 0.3) { for (let i = 0; i < 3; i++) { const a = Math.random() * 0.9, rr = Math.random() * 1.2; _v.copy(g.origin).addScaledVector(g.dir, 0.8 + Math.random() * 2); _v.x += (Math.random() - 0.5) * 1.2; _v.y += (Math.random() - 0.3) * 1.2; _v.z += (Math.random() - 0.5) * 1.2; this.streaks.spawn(_v, _w.copy(g.dir).multiplyScalar(14 + Math.random() * 6), { life: 0.55 + Math.random() * 0.3, size: 0.55, color: 0xdff2ff, drag: 0.4 }); } }
    if (f.power > 0.3) { for (let i = 0; i < 4; i++) { _v.copy(f.origin); _w.copy(f.dir).multiplyScalar(6 + Math.random() * 3); _w.x += (Math.random() - 0.5) * 3; _w.y += (Math.random() - 0.5) * 2; _w.z += (Math.random() - 0.5) * 3; this.frostFx.spawn(_v, _w, { life: 0.9, size: 0.7 + Math.random() * 0.8, color: 0x9fdcff, drag: 1.2, g: -0.5 }); } }
    // ambient leaves & motes around focus
    this.focus.copy(camPos);
    this.leafT -= dt; if (this.leafT <= 0) { this.leafT = 0.35; _v.set(this.focus.x + (Math.random() - 0.5) * 30, this.focus.y + 6 + Math.random() * 8, this.focus.z + (Math.random() - 0.5) * 30); this.leaves.spawn(_v, _w.set((Math.random() - 0.5), -0.5, (Math.random() - 0.5)), { life: 12, size: 1, color: this.leafCols[(Math.random() * 4) | 0], g: 0.15, drag: 0.6, rv: (Math.random() - 0.5) * 5 }); }
    for (const p of this.leaves.P) if (p.life > 0) { const fr = this.force(p.pos, 0); p.vel.x += fr.x * dt * 0.9 + Math.sin(t * 2 + p.rot) * dt * 0.4; p.vel.z += fr.z * dt * 0.9 + Math.cos(t * 1.7 + p.rot) * dt * 0.4; p.vel.y += (fr.y * 0.3 + (g.power > 0.1 ? 0.8 : 0.0)) * dt - 0.0; if (p.vel.y < -0.9) p.vel.y = -0.9; const tp = this.terrain.topAt(p.pos.x, p.pos.z); if (p.pos.y < tp + 0.05 && tp > -Infinity) { p.pos.y = tp + 0.05; p.vel.y = 0; p.vel.multiplyScalar(0.9); p.life = Math.min(p.life, 1.5); } }
    if (this.ambient === 'snow') { this.flakeT -= dt; while (this.flakeT <= 0) { this.flakeT += 0.025; _v.set(this.focus.x + (Math.random() - 0.5) * 40, this.focus.y + 8 + Math.random() * 6, this.focus.z + (Math.random() - 0.5) * 40); this.flakes.spawn(_v, _w.set((Math.random() - 0.3) * 0.6, -1.4 - Math.random(), (Math.random() - 0.5) * 0.5), { life: 9, size: 1, color: 0xffffff, drag: 0.2 }); } for (const p of this.flakes.P) if (p.life > 0) { const fr = this.force(p.pos, 0); p.vel.x += (fr.x - this.breeze.x * 0.3) * dt * 0.6; p.vel.z += (fr.z - this.breeze.z * 0.3) * dt * 0.6; const tp = this.terrain.topAt(p.pos.x, p.pos.z); if (tp > -Infinity && p.pos.y < tp + 0.05) p.life = 0; } }
    this.moteT -= dt; if (this.moteT <= 0) { this.moteT = 0.08; _v.set(this.focus.x + (Math.random() - 0.5) * 36, this.focus.y + (Math.random() - 0.4) * 12, this.focus.z + (Math.random() - 0.5) * 36); this.motes.spawn(_v, _w.set((Math.random() - 0.5) * 0.3, 0.2 + Math.random() * 0.3, (Math.random() - 0.5) * 0.3), { life: 6, size: 1, color: 0xfff4d0 }); }
    for (const p of this.motes.P) if (p.life > 0) { const fr = this.force(p.pos, 0); p.vel.x += fr.x * dt * 0.3; p.vel.z += fr.z * dt * 0.3; }
    if (this.bolts) for (let i = this.bolts.length - 1; i >= 0; i--) { const b = this.bolts[i]; b.t -= dt; b.m.material.opacity = Math.max(0, b.t / 0.35); if (b.t <= 0) { this.scene.remove(b.m); b.m.geometry.dispose(); b.m.material.dispose(); this.bolts.splice(i, 1); } }
    this.flash = Math.max(0, (this.flash || 0) - dt * 4);
    this.splash.update(dt); this.streaks.update(dt); this.frostFx.update(dt); this.sparks.update(dt); this.smoke.update(dt); this.flakes.update(dt); this.leaves.update(dt); this.motes.update(dt);
  }
  /** jagged lightning bolt from a to b that fades quickly */
  bolt(a, b, color = 0xfff6b0) {
    const pts = [], n = 9; for (let i = 0; i <= n; i++) { const t = i / n, j = i === 0 || i === n ? 0 : 1.1; pts.push(new THREE.Vector3(a.x + (b.x - a.x) * t + (Math.random() - 0.5) * j, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t + (Math.random() - 0.5) * j)); }
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.09, 5), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); m.frustumCulled = false; this.scene.add(m); (this.bolts ??= []).push({ m, t: 0.35 }); this.flash = 1;
  }
  spawnSplash = (x, y, z) => { _v.set(x, y + 0.04, z); this.splash.spawn(_v, _w.set(0, 0, 0), { life: 0.42, size: 0.05, grow: 0.3, color: 0x6a8ca0 }); };
  burst(pos, color = 0xfff0b0, n = 16, speed = 3, size = 1) { for (let i = 0; i < n; i++) { _w.set(Math.random() - 0.5, Math.random() * 0.8 + 0.1, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.4 + Math.random())); this.sparks.spawn(pos, _w, { life: 0.8 + Math.random() * 0.6, size: size * (0.6 + Math.random()), color, g: 2.2, drag: 0.8 }); } }
}
function q(quality, a, b) { return quality.mobile ? a : b; }
