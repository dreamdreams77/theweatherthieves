import * as THREE from 'three';
import { Island } from '../world/Island.js';
import { ChapterBase } from '../world/ChapterBase.js';
import { DiscSurface } from '../world/Terrain.js';
import { Parts, mesh, vcMat, tube } from '../world/Build.js';
import * as Flora from '../world/Flora.js';
import * as Props from '../world/Props.js';
import { SunMirror, Lift } from '../world/PuzzleProps.js';
import { Cloud } from '../weather/Cloud.js';
import { Face } from '../characters/Face.js';
import { beamMaterial } from '../gfx/Shaders.js';
import { std } from '../gfx/Mat.js';
import { Progress } from '../core/Progress.js';
import { ChapterNarr } from '../puzzles/ChapterNarr.js';
import { farScenery } from './common.js';
import { makeNPC } from './cast.js';
import { rng, TAU, damp, lerp, clamp } from '../core/Utils.js';

/** Copper lightning rod: a squashed (charged) cloud parked over it strikes it; stored power runs machines for a while. */
export class LightningRod {
  constructor(scene, pos, id, game) {
    this.id = id; this.pos = pos.clone(); this.power = 0; this.latched = false; this.game = game; this.tip = pos.clone().add(new THREE.Vector3(0, 6.2, 0)); this.group = new THREE.Group(); this.group.position.copy(pos);
    const p = new Parts(); p.add(new THREE.CylinderGeometry(0.3, 0.5, 0.6, 8), 0x5a5a68, { p: [0, 0.3, 0] }); p.add(new THREE.CylinderGeometry(0.08, 0.12, 6, 8), 0xb87333, { p: [0, 3.3, 0] });
    for (let i = 0; i < 6; i++) p.add(new THREE.TorusGeometry(0.28, 0.05, 6, 14), 0xc8803a, { p: [0, 1.2 + i * 0.5, 0], r: [Math.PI / 2, 0, 0] }); this.group.add(mesh(p.merge(), vcMat({ metalness: 0.7, roughness: 0.4 })));
    this.glow = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), new THREE.MeshBasicMaterial({ color: 0x66aaff })); this.glow.position.y = 6.4; this.group.add(this.glow);
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.05, 6, 40), new THREE.MeshBasicMaterial({ color: 0xffe070, transparent: true, opacity: 0.35 })); this.ring.rotation.x = Math.PI / 2; this.ring.position.y = 0.1; this.group.add(this.ring);
    this.light = new THREE.PointLight(0x88aaff, 0, 14, 2); this.light.position.y = 6.4; this.group.add(this.light); scene.add(this.group);
  }
  get on() { return this.power > 0; }
  update(dt, t, clouds) {
    this.power = Math.max(0, this.power - dt);
    for (const c of clouds) { if (c.fixed || (c.charge || 0) < 0.85) continue; if (Math.hypot(c.pos.x - this.tip.x, c.pos.z - this.tip.z) < 3.4 && c.pos.y > this.tip.y - 3.2 && c.pos.y < this.tip.y + 10) this.strike(c); }
    const k = clamp(this.power / 30, 0, 1); this.glow.material.color.setHex(this.power > 0 ? 0xffee88 : 0x4a6aa8); this.glow.scale.setScalar(1 + k * 0.5 + Math.sin(t * 20) * 0.1 * k); this.light.intensity = k * 6; this.ring.material.opacity = 0.2 + k * 0.6;
  }
  strike(c) {
    const g = this.game, w = g.weather; w.bolt(c.pos.clone().add(new THREE.Vector3(0, -0.6, 0)), this.tip.clone(), 0xfff6b0); w.burst(this.tip, 0xffee88, 40, 6, 1.4); g.audio.sfx('pop'); g.audio.sfx('unlock'); g.shake(0.5); c.charge = 0; this.power = 60; if (!this.latched) { this.latched = true; this.onLatch?.(this); }
  }
}
class Conveyor {
  constructor(scene, terrain, x0, x1, z, y, w = 3.2) {
    this.x0 = x0; this.x1 = x1; this.z = z; this.y = y; this.w = w; this.on = false; const len = x1 - x0; this.group = new THREE.Group(); this.group.position.set((x0 + x1) / 2, y - 0.2, z);
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64; const c = cv.getContext('2d'); c.fillStyle = '#3a3a44'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#e8b830'; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(0, i * 16); c.lineTo(32, i * 16 + 8); c.lineTo(64, i * 16); c.lineTo(64, i * 16 + 5); c.lineTo(32, i * 16 + 13); c.lineTo(0, i * 16 + 5); c.fill(); }
    this.tex = new THREE.CanvasTexture(cv); this.tex.wrapS = this.tex.wrapT = THREE.RepeatWrapping; this.tex.repeat.set(len / 3.2, 1); this.tex.colorSpace = THREE.SRGBColorSpace;
    this.belt = new THREE.Mesh(new THREE.BoxGeometry(len, 0.3, w), std({ map: this.tex, roughness: 0.7, metalness: 0.4 })); this.belt.receiveShadow = true; this.group.add(this.belt); for (const s of [-1, 1]) { const r = mesh(new THREE.BoxGeometry(len + 0.4, 0.5, 0.2), std({ color: 0x6a6a78, metalness: 0.6 })); r.position.set(0, 0.2, s * (w / 2 + 0.1)); this.group.add(r); } scene.add(this.group);
    this.surf = { enabled: false, isConveyor: true, heightAt: (px, pz) => (px > x0 && px < x1 && Math.abs(pz - z) < w / 2 ? y : -Infinity) }; terrain.addSurface(this.surf);
  }
  update(dt, on) { this.on = on; this.surf.enabled = on; this.tex.offset.x -= dt * (on ? 0.9 : 0); this.belt.material.emissive.setHex(on ? 0x332200 : 0x000000); }
}

export class FactoryWorld extends ChapterBase {
  constructor(game) {
    super(); this.game = game; const { scene, terrain, weather, quality: q } = game; this.scene = scene; this.terrain = terrain; this.weather = weather; this.q = q; this.sunDir = game.sunDir;
    this.updaters = []; this.glints = []; this.puffkins = []; this.risingFalls = []; this.npcs = []; this.mirrors = []; this.cloudRefill = []; this.gears = []; this.rods = []; this.spawn = [0, 21]; this.babies = [];
    this.F = new Island({ id: 'factory', name: 'The Storm Factory', x: 0, y: 0, z: 0, r: 27, seed: 41, hill: 0.5, flat: [[0, 0, 24]], grass: [0x6a6a70, 0x8a7a68], tint: new THREE.Color(0x8a6a58) }, q); scene.add(this.F.build()); terrain.addIsland(this.F);
    this.plant(); this.rods_(); this.machines(); this.plaza(); this.cast(); this.clouds();
    farScenery(this, { seed: 111, colors: [0x6a5a58, 0x8a6a58, 0x5a6a78], grass: [0x6a6a70, 0x8a7a68], tint: [0x8a6a58, 0x6a7a88], falls: false });
  }
  plant() {
    const { F, scene, terrain } = this, r = rng(7);
    // floor plates + big warehouse walls with gaps
    const fp = new Parts(); for (let i = 0; i < 90; i++) { const a = r() * TAU, d = Math.sqrt(r()) * 22, x = Math.cos(a) * d, z = Math.sin(a) * d, y = F.heightAt(x, z); if (y === -Infinity) continue; fp.add(new THREE.BoxGeometry(2.4 + r(), 0.12, 2.4 + r()), [0x5a5a64, 0x6a6a74, 0x7a6a60][i % 3], { p: [x, y + 0.04, z], r: [0, r() * 3, 0], jitter: 0.15 }); } scene.add(mesh(fp.merge(), vcMat({ roughness: 0.8, metalness: 0.3 })));
    const wp = new Parts(); const wall = (x, z, w, d, h, c) => { const y = F.heightAt(x, z); wp.add(new THREE.BoxGeometry(w, h, d), c, { p: [x, y + h / 2, z], jitter: 0.1 }); terrain.addCollider({ x, z, r: Math.max(w, d) * 0.5, y0: y - 1, y1: y + h, cam: { r: Math.max(w, d) * 0.5 + 0.3, y0: y, y1: y + h } }); };
    for (const [x, z, w, d, h, c] of [[-19, 6, 5, 9, 9, 0x7a5a50], [19, 4, 5, 10, 8, 0x6a5a58], [-8, -14, 8, 5, 10, 0x6a6a78], [8, -14, 8, 5, 9, 0x7a6a60], [-20, -10, 4, 6, 6, 0x6a5a58], [20, -12, 4, 6, 7, 0x5a6a78]]) wall(x, z, w, d, h, c);
    this.walls = mesh(wp.merge(), vcMat({ roughness: 0.85, flatShading: true })); scene.add(this.walls);
    // smokestacks, pipes, gears
    for (const [x, z] of [[-22, 0], [22, -2], [-14, -20], [14, -21]]) { const y = F.heightAt(x, z); const s = mesh(new THREE.CylinderGeometry(1.1, 1.6, 15, 12), std({ color: 0x7a5a50, roughness: 0.9 })); s.position.set(x, y + 7.5, z); scene.add(s); terrain.addCollider({ x, z, r: 1.6, y0: y - 1, y1: y + 15 }); (this.stacks ??= []).push(new THREE.Vector3(x, y + 15.5, z)); }
    for (const [x, z, s] of [[-17, 14, 1.4], [16, 13, 1.1], [0, -26, 2.0]]) { const g = this.gear(x, F.heightAt(x, z) + 2.4 * s + 0.5, z, s); this.gears.push(g); }
    const lp = Props.lanternPost(2.8, 0xffa060); this.place(lp, F, 5, 16, 1, 1); const lp2 = Props.lanternPost(2.8, 0xffa060); this.place(lp2, F, -6, 14, 2, 1);
    // jars on shelves: bottled weather from earlier chapters
    const jp = new Parts(); const jc = [0xffd35a, 0x7fc8ff, 0xe8f4ff, 0xc8a0ff, 0xa0e8c0, 0xff9a6a]; for (let i = 0; i < 6; i++) { const x = -22 + i * 1.5, z = 14, y = F.heightAt(x, z); jp.add(new THREE.CylinderGeometry(0.5, 0.5, 1.2, 10), jc[i], { p: [x, y + 0.6, z] }); jp.add(new THREE.CylinderGeometry(0.4, 0.45, 0.2, 10), 0xc6a05a, { p: [x, y + 1.3, z] }); }
    const jm = mesh(jp.merge(), vcMat({ roughness: 0.2, metalness: 0.1 })); jm.castShadow = false; scene.add(jm);
    scene.add(Flora.scatterGrass(F, this.q, [], { density: 0.6, a: 0x6a6a70, b: 0x8a8a70, flowers: [0xe8b830] }));
  }
  gear(x, y, z, s) { const p = new Parts(); p.add(new THREE.CylinderGeometry(1.2 * s, 1.2 * s, 0.4 * s, 16), 0x8a6a50, {}); for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; p.add(new THREE.BoxGeometry(0.5 * s, 0.4 * s, 0.5 * s), 0x8a6a50, { p: [Math.cos(a) * 1.35 * s, 0, Math.sin(a) * 1.35 * s], r: [0, -a, 0] }); } const m = mesh(p.merge(), vcMat({ metalness: 0.6, roughness: 0.5, flatShading: true })); m.position.set(x, y, z); m.rotation.x = Math.PI / 2; this.scene.add(m); return { m, s, spin: (Math.random() > 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.3) }; }
  rods_() {
    const { F, game } = this; const mk = (x, y, z, id) => { const rod = new LightningRod(this.scene, new THREE.Vector3(x, y, z), id, game); rod.onLatch = (rr) => this.onLatch?.(rr); this.rods.push(rod); return rod; };
    this.rodA = mk(-7, F.heightAt(-7, 9), 9, 'A'); this.rodB = mk(-12, 7.1, -10.5, 'B'); this.rodC = mk(13, 7.1, -9, 'C');
    this.terrain.addCollider({ x: -7, z: 9, r: 0.5 });
  }
  machines() {
    const { F, scene, terrain } = this; this.liftBase = new THREE.Vector3(-14, F.heightAt(-14, -2), -2); this.lift = new Lift(this.liftBase, 7.2, terrain); scene.add(this.lift.group, this.lift.frame); terrain.addSurface(this.lift.surface);
    this.cat1 = new DiscSurface(-12.5, -5.5, 3.2, 7.2); this.cat2 = new DiscSurface(-8, -9, 4.2, 7.2); this.cat3 = new DiscSurface(15, -9, 3.6, 7.2); [this.cat1, this.cat2, this.cat3].forEach((s) => terrain.addSurface(s));
    const cp = new Parts(); for (const [x, z, r] of [[-12.5, -5.5, 3.3], [-8, -9, 4.3], [15, -9, 3.7]]) { cp.add(new THREE.CylinderGeometry(r, r, 0.3, 20), 0x6a6a74, { p: [x, 7.05, z] }); for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; cp.add(new THREE.CylinderGeometry(0.06, 0.06, 1, 5), 0xb87333, { p: [x + Math.cos(a) * r, 7.7, z + Math.sin(a) * r] }); } cp.add(new THREE.CylinderGeometry(0.3, 0.3, 7, 8), 0x5a5a68, { p: [x, 3.5, z] }); }
    scene.add(mesh(cp.merge(), vcMat({ metalness: 0.5, roughness: 0.6 }))); this.belt = new Conveyor(scene, terrain, -3.5, 12.5, -9, 7.2);
    this.updaters.push((dt, t) => { const L = this.lift, p = this.game.player; const riding = Math.hypot(p.pos.x - L.pos.x, p.pos.z - L.pos.z) < 2.3 && p.pos.y > L.group.position.y - 0.6 && p.pos.y < L.group.position.y + 1.5; L.update(dt, this.rodA.on, riding, 0); this.belt.update(dt, this.rodB.on); });
    this.glints.push(this.glint(-8, 8.3, -10.5, 'c4c', 'Notebook page')); this.glints.push(this.glint(15, 8.3, -10.5, 'c4d', 'Mayor memory'));
  }
  plaza() {
    const { F, scene, terrain } = this; const gy = F.heightAt(0, -12);
    // the Great Engine door
    const dp = new THREE.Group(); dp.position.set(0, gy, -12); const dm = mesh(new THREE.BoxGeometry(7.5, 6, 0.8), std({ color: 0x8a7a6a, metalness: 0.7, roughness: 0.45 })); dm.position.y = 3; dp.add(dm); for (let i = 0; i < 3; i++) { const g = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.18, 8, 16), new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.8, roughness: 0.4, emissive: 0x000000 })); g.position.set(-2.4 + i * 2.4, 3.2, 0.5); dp.add(g); (this.doorLamps ??= []).push(g); } scene.add(dp); this.door = dp; this.doorCol = [terrain.addCollider({ x: -2.5, z: -12, r: 1.7 }), terrain.addCollider({ x: 0, z: -12, r: 1.7 }), terrain.addCollider({ x: 2.5, z: -12, r: 1.7 })];
    // the Great Jar
    const jx = 0, jz = -21, jy = F.heightAt(jx, jz); this.jarPos = new THREE.Vector3(jx, jy, jz); const jg = new THREE.Group(); jg.position.set(jx, jy + 0.2, jz); scene.add(jg); this.jar = jg;
    const glass = new THREE.MeshStandardMaterial({ color: 0xe0f0ff, transparent: true, opacity: 0.2, roughness: 0.04, side: THREE.DoubleSide, depthWrite: false, emissive: 0x88aadd, emissiveIntensity: 0.18 }); const gm = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [2.4, 0.05], [3.0, 1], [3.1, 3.4], [2.5, 5.2], [1.4, 6], [1.1, 6.4]].map((q) => new THREE.Vector2(q[0], q[1])), 30), glass); gm.renderOrder = 4; jg.add(gm);
    const brass = std({ color: 0xc6a05a, metalness: 0.9, roughness: 0.3 }); jg.add(mesh(new THREE.CylinderGeometry(2.8, 3.1, 0.5, 26), brass)); this.lid = new THREE.Group(); this.lid.position.y = 6.4; jg.add(this.lid); this.lid.add(mesh(new THREE.CylinderGeometry(1.5, 1.3, 0.7, 20), brass));
    this.orbs = []; const oc = [0xffd35a, 0x7fc8ff, 0xf0f8ff, 0xd0a8ff, 0x9fe8b8, 0xff9a6a]; for (let i = 0; i < 6; i++) { const o = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 10), new THREE.MeshBasicMaterial({ color: oc[i] })); o.userData.a = (i / 6) * TAU; jg.add(o); this.orbs.push(o); } this.jarLight = new THREE.PointLight(0xffe0a0, 2, 18, 2); this.jarLight.position.y = 3; jg.add(this.jarLight);
    terrain.addCollider({ x: jx, z: jz, r: 3.0, y0: jy - 1, y1: jy + 8, cam: { r: 2.6, y0: jy, y1: jy + 8 } });
    this.mirror = new SunMirror(scene, new THREE.Vector3(-8, F.heightAt(-8, -19), -19), this.weather, terrain); scene.add(this.mirror.group); this.mirror.yaw = 1.57; this.mirrors.push(this.mirror); terrain.addCollider({ x: -8, z: -19, r: 1.1 });
    this.glints.push(this.glint(7, F.heightAt(7, -18) + 1, -18, 'c4a', 'Hugged thunder')); this.glints.push(this.glint(-3, F.heightAt(-3, 4) + 1, 4, 'c4b', 'Lightning lullaby'));
  }
  cast() {
    const add = (id, x, z, route, extra) => { const n = makeNPC(id, this.terrain, x, z, route, extra); n.addTo(this.scene); n.onSay = (nn, text) => this.game.ui.bark(() => nn.headWorld(1.7), text, 2800, 'pk'); this.weather.register(n); this.npcs.push(n); return n; };
    this.gus = add('gus', -4, 12, [{ x: -4, z: 12, wait: 5, anim: 'point', say: 'CLEARING MY THROAT!' }, { x: 3, z: 14, wait: 4, anim: 'nod' }]); this.flicker = add('flicker', 8, 12, [{ x: 8, z: 12, wait: 4, say: 'Is that thunder? ...I am not afraid.' }, { x: 12, z: 10, wait: 5, anim: 'shrug' }]); this.tock = add('tock', 3, 18, [], { spin: true });
    this.wren = add('wren', 0, -17, [], { noFlee: true }); this.wren.root.visible = false;
  }
  clouds() {
    const { scene, weather, q } = this; const mk = (o) => weather.addCloud(new Cloud({ ...o, scene, quality: q }));
    this.fenCloud = mk({ id: 'fen', name: 'Drizzle', pos: new THREE.Vector3(0, 4, 21), size: 1.0, seed: 3, personal: true }); this.fenCloud.face.set('sad'); this.fenCloud.drift.set(0, 0, 0);
    const a = mk({ id: 'grumble', name: 'Grumblet', pos: new THREE.Vector3(-4, 12, 14), size: 1.3, seed: 71 }); a.face.set('angry'); a.drift.set(0.06, 0, 0.02); const b = mk({ id: 'rumble', name: 'Rumble', pos: new THREE.Vector3(10, 13, 6), size: 1.2, seed: 73 }); b.face.set('neutral'); b.drift.set(-0.06, 0, 0.03); const c = mk({ id: 'nimbus', name: 'Mr. Nimbus', pos: new THREE.Vector3(-18, 16, -4), size: 1.2, seed: 75 }); c.drift.set(0.05, 0, 0);
    // three caged baby clouds near the rods
    [[-5, 11, this.rodA], [-9, 8.4, this.rodB], [11, 8.4, this.rodC]].forEach(([x, y, rod], i) => { const bc = mk({ id: 'baby' + i, name: 'Baby cloud', pos: new THREE.Vector3(x, y + (i ? 0 : 0), i === 0 ? 11 : i === 1 ? -8 : -7), size: 0.55, seed: 80 + i }); bc.fixed = true; bc.face.set('sad'); bc.rod = rod; this.babies.push(bc); });
  }
  refillAt(pos) { return 0.08; }
  update(dt, t) {
    for (const u of this.updaters) u(dt, t); for (const g of this.gears) g.m.rotation.z += dt * g.spin;
    for (const rod of this.rods) rod.update(dt, t, this.weather.clouds);
    for (const g of this.glints) if (!g.got) { g.group.rotation.y += dt * 1.2; g.group.position.y = g.pos.y + Math.sin(t * 2 + g.pos.x) * 0.1; }
    for (const s of this.stacks || []) if (Math.random() < dt * 5) this.weather.smoke.spawn(s, new THREE.Vector3(0.4, 1.4, 0.1), { life: 4, size: 1.2, grow: 3 });
    for (const b of this.babies) { b.pos.y += Math.sin(t * 2 + b.seed) * 0.002; if (b.fixed && b.rod.latched) { b.fixed = false; b.face.set('happy'); b.drift.set(0.15, 0.02, 0.1); this.game.ui.toast('A caged baby cloud is free!'); this.onBaby?.(); } }
    this.mirror.update(dt, t, this.sunDir, true);
    for (const o of this.orbs) { o.userData.a += dt * (this.jarOpen ? 3 : 0.8); const rr = this.jarOpen ? 3 + (o.userData.up = (o.userData.up || 0) + dt * 4) : 1.6; o.position.set(Math.cos(o.userData.a) * rr, 2.6 + Math.sin(o.userData.a * 1.5) * 1.2 + (o.userData.up || 0), Math.sin(o.userData.a) * rr); }
    if (this.doorOpen) { this.door.position.y = damp(this.door.position.y, this.F.heightAt(0, -12) - 7, 1.2, dt); } if (this.jarOpen) { this.lid.position.y += (this.lid.userData.v || 0) * dt; this.lid.userData.v = (this.lid.userData.v || 0) - 12 * dt; this.lid.rotation.x += dt * 3; }
    this.doorLamps?.forEach((g, i) => { const rod = this.rods[i]; g.material.emissive.setHex(rod.latched ? 0xffcc44 : 0x000000); g.material.emissiveIntensity = rod.latched ? 1.6 : 0; });
    for (const n of this.npcs) { n.update(dt, t, this.game.player, this.game.camera.position); if (n.spec.spin) { n.yaw += dt * 0.6; n.root.rotation.y = n.yaw; } }
  }
  /** carry the player along a powered belt */
  padUpdate(pl, dt) { const b = this.belt; if (b.on && pl.grounded && pl.surf === b.surf) { pl.pos.x += 2.9 * dt; } }
}

export class FactoryNarr extends ChapterNarr {
  constructor(game) { super(game, 4); Object.assign(this.flags, { latched: 0, door: false, rainbow: 0, babies: 0, disco: false, revealed: false, freed: false }); this.hints = { rods: 'Squash a cloud with the mouse wheel (or Q) while you carry it — it charges up, crackles and turns dark. Park it over a copper rod.', lift: 'Rod A powers the lift. Stand on the lift while it has power. Rod B powers the belt on the catwalk.', door: 'The Engine Door opens when all three rods have been struck.', jar: 'Sun (4) from the mirror through Fen’s rain makes a rainbow. Keep it overlapping for a couple of seconds.' }; this.fenIdle = ['Thunder. Loud, dramatic, and sensitive underneath. I relate.', 'This place smells like a very sad toolbox.', 'Fun fact: lightning is just the sky being too embarrassed to say it is upset.']; this.dctimer = 0; this.rbT = 0; }
  init() { super.init(); const w = this.game.world; w.onLatch = (rod) => { this.flags.latched = w.rods.filter((r) => r.latched).length; this.game.ui.toast(`Rod ${rod.id} struck — ${this.flags.latched} / 3`); if (this.flags.latched >= 3) this.openDoor(); }; w.onBaby = () => { this.flags.babies++; if (this.flags.babies >= 3) { this.memory('c4a'); } }; this.game.ui.setGlints(0); }
  begin() { if (this.flags.intro) return; this.flags.intro = true; this.say([
    { who: 'narrator', text: 'On a thundercloud the size of a town, a factory had been built to make weather — and then to keep it.' },
    { who: 'juno', ex: 'surprised', text: 'Look at all the jars... sunshine, rain, snow, fog. They are all here. Fen — it is a weather library.' },
    { who: 'gus', ex: 'angry', text: 'SPEAK UP, KID, THE SKY’S MUMBLING! ...You are here about the jars? The engine room is locked up tight. It wants lightning.' },
    { who: 'fen', ex: 'worried', text: 'Lightning. From a cloud. That we have to carry. With a mouse.' },
    { who: 'juno', ex: 'excited', text: 'Squash a cloud until it crackles, then park it over a copper rod! Three rods, three charges!' }]); }
  openDoor() { const g = this.game, w = g.world; if (this.flags.door) return; this.flags.door = true; w.doorOpen = true; w.doorCol.forEach((c) => (c.enabled = false)); g.audio.sfx('finale'); g.shake(0.6); g.setRestore(0.5); g.weather.bolt(new THREE.Vector3(0, 30, -12), new THREE.Vector3(0, 6, -12)); this.save();
    setTimeout(() => { w.wren.root.visible = true; this.say([{ who: 'narrator', text: 'The Great Engine door ground open. Inside, a small figure in a patched kite-cape stood very still beside an enormous jar.' },
      { who: 'wren', ex: 'worried', text: 'I only borrowed it. It was so lonely out there.' }, { who: 'juno', ex: 'surprised', text: 'You are Wren. You took the weather — all of it?' },
      { who: 'wren', ex: 'sad', text: 'After the old keeper left, nobody looked up anymore. The sky forgot us, so I kept it safe. I built the Factory to remember every weather. ...Do you ever feel the sky forgot you?' },
      { who: 'fen', ex: 'sad', anim: 'sigh', text: 'I do. I was her student too. I quit when she died, and I let the forecasts go quiet. That is my fault as much as yours.' },
      { who: 'juno', ex: 'happy', text: 'We are not here to punish anyone. The weather wants to come home — but it needs someone to look after it. Together.' },
      { who: 'wren', ex: 'worried', text: 'The jar will only open for sunshine and rain at once. I never learned how... because I never had anyone to hold the other half.' }], { onEnd: () => { this.flags.revealed = true; this.save(); } }); }, 1800); }
  update(dt, t) {
    this.updateCommon(dt, t); const g = this.game, w = g.world, f = this.flags, p = g.player;
    // hidden combo: charged cloud + rain + gust together = Disco Storm
    const cc = w.weather.clouds.find((c) => (c.charge || 0) > 0.5 && c.raining > 0.5); if (cc && g.weather.gust.power > 0.5 && !f.disco) { this.dctimer += dt; if (this.dctimer > 1.6) { f.disco = true; g.ui.toast('DISCO STORM! Charge + rain + wind — the factory is dancing.', 6000); g.audio.sfx('finale'); this.memory('c4b'); w.gus.play('cheer'); w.flicker.play('cheer'); this.discoT = 8; } } else this.dctimer = Math.max(0, this.dctimer - dt);
    if (this.discoT > 0) { this.discoT -= dt; if (Math.random() < dt * 5) g.weather.bolt(new THREE.Vector3(p.pos.x + (Math.random() - 0.5) * 24, 22, p.pos.z + (Math.random() - 0.5) * 24), new THREE.Vector3(p.pos.x + (Math.random() - 0.5) * 24, 0, p.pos.z + (Math.random() - 0.5) * 24), [0xff90ff, 0x90ffff, 0xffe070][(Math.random() * 3) | 0]); }
    // rainbow = mirror beam passing through a rain column near the jar
    let rb = false; if (f.revealed && !f.freed) for (const b of g.weather.beams) { if (b.power < 0.5) continue; for (const c of g.weather.clouds) { if (c.raining < 0.5 || c.precip === 'snow') continue; { const tt = clamp(new THREE.Vector3().subVectors(c.pos, b.o).dot(b.d), 0, b.len), pt = b.o.clone().addScaledVector(b.d, tt); if (pt.y < c.pos.y && pt.y > c.pos.y - 14 && Math.hypot(pt.x - c.pos.x, pt.z - c.pos.z) < c.footprint) { rb = true; } } if (rb) break; } if (rb) break; }
    if (rb) { this.rbT += dt; if (this.rbT > 2.2) this.finale(); } else this.rbT = Math.max(0, this.rbT - dt * 0.5); f.rainbow = Math.min(1, this.rbT / 2.2);
    if (f.revealed && !f.freed && !this.coaxed) { this.coaxed = true; g.ui.toast('Wren holds the jar still. Make sunshine and rain meet: mirror (Sun 4) + a raining cloud (Rain 2).', 8000); }
    const st = f.latched < 3 ? 'rods' : !f.revealed ? 'door' : !f.freed ? 'jar' : 'done'; if (st !== this.step) { this.step = st; this.hintT = 0; }
    const OBJ = { rods: 'Charge the three copper rods with a squashed storm cloud', door: 'The Engine Door is open — go inside', jar: 'Sunshine and rain at once: make a rainbow over the Great Jar', done: 'The weather is home!' };
    g.ui.setObjective(OBJ[st], st === 'rods' ? `${f.latched} / 3 rods · baby clouds freed: ${f.babies} / 3` : st === 'jar' ? `Rainbow ${(f.rainbow * 100) | 0}%` : '');
  }
  finale() {
    const g = this.game, w = g.world, f = this.flags; if (f.freed) return; f.freed = true; w.jarOpen = true; w.lid.userData.v = 10; g.setRestore(1); g.palette = { fogA: 0xb8c8e8, fogB: 0xffe0c0, tint: 0x888888, tintAmt: 0, density: [0.006, 0.005] }; g.applyMood(); g.audio.sfx('finale'); g.shake(0.5); g.weather.burst(w.jarPos.clone().add(new THREE.Vector3(0, 4, 0)), 0xffffff, 120, 10, 2.4); g.weather.ambient = 'snow';
    for (let i = 0; i < 5; i++) setTimeout(() => g.weather.bolt(new THREE.Vector3(w.jarPos.x + (Math.random() - 0.5) * 10, 24, w.jarPos.z - 4), new THREE.Vector3(w.jarPos.x + (Math.random() - 0.5) * 10, 3, w.jarPos.z - 4), 0xfff0a0), i * 400); this.memory('c4e');
    g.shot({ pos: w.jarPos.clone().add(new THREE.Vector3(-11, 7, 12)), look: w.jarPos.clone().add(new THREE.Vector3(0, 5, 0)) }, 30);
    setTimeout(() => this.say([{ who: 'narrator', text: 'Sunshine and rain met above the Great Jar — and the whole sky exhaled.' },
      { who: 'wren', ex: 'excited', text: 'They are going home! Sun to the Sunken Sky, rain to the village, snow to the forest — all of them, all at once!' },
      { who: 'gus', ex: 'happy', text: 'THAT WAS THE BEST THUNDER I HAVE EVER HEARD! ...(Wipes eye.) Dust. Machines make dust.' },
      { who: 'fen', ex: 'happy', text: 'Drizzle is raining on me, the sun is on my back and there is snow in my moustache. ...I find I do not mind.' },
      { who: 'juno', ex: 'love', anim: 'cheer', text: 'Wren — will you look after the weather with us? Every day, together?' },
      { who: 'wren', ex: 'love', text: 'Together. Yes. I would like that more than anything.' },
      { who: 'narrator', text: 'And on the very last page of Fen’s notebook, in careful handwriting: “Forecast: partly everything — and we are all in it.”' }],
      { onEnd: () => { g.shot(null); Progress.complete(4); this.save(); g.ui.showEnd(`Weather memories: ${Progress.data.memories.length} / 20 — thank you for playing`, 4); } }), 2600);
  }
  npcLines(npc) { return super.npcLines(npc); }
}
export const ch4 = { title: 'The Storm Factory', World: FactoryWorld, Narr: FactoryNarr, restore: 0.25, ambient: null, palette: { fogA: 0x8a7a80, fogB: 0xd8b8a0, tint: 0xa07060, tintAmt: 0.35, density: [0.0095, 0.0075] } };
