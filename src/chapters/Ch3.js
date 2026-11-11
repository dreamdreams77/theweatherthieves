import * as THREE from 'three';
import { Island } from '../world/Island.js';
import { ChapterBase } from '../world/ChapterBase.js';
import { DiscSurface } from '../world/Terrain.js';
import { Parts, mesh, vcMat, tube, puff } from '../world/Build.js';
import * as Flora from '../world/Flora.js';
import * as Props from '../world/Props.js';
import { SunMirror, IceBlock, PressurePlate } from '../world/PuzzleProps.js';
import { Sunny } from '../characters/Creatures.js';
import { Cloud } from '../weather/Cloud.js';
import { waterMaterial } from '../gfx/Shaders.js';
import { std } from '../gfx/Mat.js';
import { Progress } from '../core/Progress.js';
import { ChapterNarr } from '../puzzles/ChapterNarr.js';
import { farScenery } from './common.js';
import { makeNPC } from './cast.js';
import { rng, TAU, damp, lerp, clamp } from '../core/Utils.js';

/** Snow pile: grows while snowed on, shrinks in sun and warm springs; tall enough, it becomes a walkable ramp. */
export class SnowZone {
  constructor(scene, terrain, x, z, base, r = 2.4, maxH = 1.7, walk = true) {
    this.pos = new THREE.Vector3(x, base + 0.8, z); this.x = x; this.z = z; this.base = base; this.r = r; this.radius = r; this.maxH = maxH; this.count = 0; this.walk = walk; this.enabled = true;
    this.m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12, 0, TAU, 0, Math.PI * 0.5), std({ color: 0xf4f8ff, roughness: 0.9, emissive: 0x8aa0c8, emissiveIntensity: 0.12 })); this.m.castShadow = true; this.m.receiveShadow = true; this.m.position.set(x, base, z); this.m.scale.setScalar(0.001); scene.add(this.m);
    this.surf = { enabled: false, heightAt: (px, pz) => (Math.hypot(px - x, pz - z) < this.r * 0.85 ? this.base + this.h() : -Infinity) }; if (walk) terrain.addSurface(this.surf);
    this.warm = false;
  }
  h() { return (this.count / 3) * this.maxH; }
  weather(dt, w) { if (w.snow > 0.2) this.count = Math.min(3, this.count + dt * 0.3 * w.snow); if (w.sun > 0.3) this.count = Math.max(0, this.count - dt * 0.25 * w.sun); if (this.warm) this.count = Math.max(0, this.count - dt * 0.35); }
  update() { const k = this.count / 3; this.m.scale.set(this.r * (0.3 + 0.7 * Math.min(1, k * 1.5)), Math.max(0.001, k * this.maxH), this.r * (0.3 + 0.7 * Math.min(1, k * 1.5))); this.m.visible = this.count > 0.05; this.surf.enabled = this.walk && this.count > 0.5; }
}
/** A stretch of water that freezes into a walkable sheet under frost. */
class IceSeg {
  constructor(scene, terrain, x, z, w, l, y) {
    this.pos = new THREE.Vector3(x, y, z); this.x = x; this.z = z; this.w = w; this.l = l; this.y = y; this.frozen = 0; this.radius = Math.max(w, l) * 0.5; this.enabled = true;
    this.sheet = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, l), new THREE.MeshStandardMaterial({ color: 0xd8f0ff, roughness: 0.15, transparent: true, opacity: 0, emissive: 0x5ab0e0, emissiveIntensity: 0.2 })); this.sheet.position.set(x, y - 0.1, z); scene.add(this.sheet);
    this.surf = { enabled: false, isIce: true, heightAt: (px, pz) => (Math.abs(px - x) < w / 2 && Math.abs(pz - z) < l / 2 ? this.y : -Infinity) }; terrain.addSurface(this.surf);
  }
  weather(dt, w) { if (w.frost > 0.2) this.frozen = Math.min(1, this.frozen + dt * 0.5 * w.frost); else if (w.sun > 0.3) this.frozen = Math.max(0, this.frozen - dt * 0.3 * w.sun); }
  update() { this.sheet.material.opacity = this.frozen * 0.9; this.sheet.visible = this.frozen > 0.02; this.surf.enabled = this.frozen > 0.9; }
}
/** Heavy sled: only a blizzard (gust + snow together) can push it. */
class Sled {
  constructor(scene, terrain, pos) {
    this.terrain = terrain; this.pos = pos.clone(); this.vel = new THREE.Vector3(); this.radius = 0.9; this.locked = true; this.group = new THREE.Group(); this.blizzard = 0;
    const p = new Parts(); p.add(new THREE.BoxGeometry(2, 0.5, 1.4), 0x9a6a42, { p: [0, 0.55, 0], jitter: 0.12 }); for (const s of [-1, 1]) p.add(new THREE.BoxGeometry(2.4, 0.1, 0.12), 0x5a5a68, { p: [0, 0.18, s * 0.6] }); for (let i = 0; i < 4; i++) p.add(new THREE.BoxGeometry(0.55, 0.45, 0.5), [0xd8604a, 0x4aa8a0, 0xe8b23a, 0xb070d0][i], { p: [-0.7 + i * 0.5, 1.0, 0] });
    this.group.add(mesh(p.merge(), vcMat({ roughness: 0.85 }))); scene.add(this.group);
  }
  weather(dt, w) { const f = w.wind.clone().sub(w.breeze); f.y = 0; const sp = f.length(); this.blizzard = damp(this.blizzard, w.snow > 0.2 && sp > 6 ? 1 : 0, 6, dt); if (!this.locked && this.blizzard > 0.5) this.vel.addScaledVector(f.normalize(), dt * 5.5 * this.blizzard); }
  update(dt, plates) {
    this.vel.multiplyScalar(Math.exp(-1.8 * dt)); const nx = this.pos.x + this.vel.x * dt, nz = this.pos.z + this.vel.z * dt, g = this.terrain.groundAt(nx, nz, this.pos.y + 0.3, 0.4); if (g) { this.pos.x = nx; this.pos.z = nz; this.pos.y = g.y; } else this.vel.set(0, 0, 0); this.terrain.push(this.pos, this.radius, this.pos.y); this.group.position.copy(this.pos);
    this.group.rotation.y = damp(this.group.rotation.y, Math.atan2(this.vel.x, this.vel.z) || this.group.rotation.y, 4, dt) * (this.vel.length() > 0.2 ? 1 : 1);
  }
}

export class ForestWorld extends ChapterBase {
  constructor(game) {
    super(); this.game = game; const { scene, terrain, weather, quality: q } = game; this.scene = scene; this.terrain = terrain; this.weather = weather; this.q = q; this.sunDir = game.sunDir;
    this.updaters = []; this.glints = []; this.puffkins = []; this.risingFalls = []; this.npcs = []; this.mirrors = []; this.cloudRefill = []; this.zones = []; this.segs = []; this.springs = []; this.chimes = [];
    this.spawn = [0, 17]; const snow = [0xe8f0f8, 0xc8dcee];
    this.A = new Island({ id: 'hollow', name: 'Pine Hollow', x: 0, y: 0, z: 0, r: 21, seed: 31, hill: 1.4, flat: [[0, 17, 5], [-12, 6, 4], [0, -16, 5]], grass: snow, tint: new THREE.Color(0xa8c8e8) }, q); scene.add(this.A.build()); terrain.addIsland(this.A);
    this.B = new Island({ id: 'ridge', name: 'Frost Ridge', x: 4, y: 0, z: -49, r: 19, seed: 32, hill: 1.0, flat: [[-4, -50, 9], [20, -46, 7], [4, -33, 5]], grass: snow, tint: new THREE.Color(0xb8d0f0) }, q); scene.add(this.B.build()); terrain.addIsland(this.B);
    this.river(); this.forest(); this.springs_(); this.ridge(); this.cast(); this.clouds();
    farScenery(this, { seed: 91, colors: [0xe8f4ff, 0x4f8a78, 0xc0dcf0], grass: snow, tint: [0xa8c8e8, 0xd8e8f8], snowy: true });
  }
  river() {
    const { scene, terrain } = this; const y = 0; this.water = new THREE.Mesh(new THREE.PlaneGeometry(40, 9).rotateX(-Math.PI / 2), waterMaterial()); this.water.position.set(0, -0.3, -24.5); this.water.material.uniforms.uRain.value = 0.2; scene.add(this.water);
    const zs = [-20.4, -24.5, -28.6]; zs.forEach((z, i) => { const s = new IceSeg(scene, terrain, 0, z, 6, 4.3, 0.0); this.weather.register({ pos: new THREE.Vector3(0, y, z), radius: 2.2, weather: (dt, w) => s.weather(dt, w) }); this.segs.push(s); });
  }
  forest() {
    const { A, scene, terrain, q } = this, r = rng(14); const av = [[0, 17, 4], [-12, 6, 5], [0, -16, 4], [-6, -8, 4], [14, -6, 3.5], [10, 6, 5], [0, -21, 6]];
    const pine = (seed) => { const rr = rng(seed), p = new Parts(), h = 4 + rr() * 3; p.add(new THREE.CylinderGeometry(0.2, 0.3, h * 0.4, 6), 0x6a4a3a, { p: [0, h * 0.2, 0] }); for (let i = 0; i < 4; i++) { const k = 1 - i * 0.22; p.add(new THREE.ConeGeometry(2.0 * k, 1.8, 8), 0x3f7a68, { p: [0, h * 0.35 + i * 1.05, 0], jitter: 0.15 }); p.add(new THREE.ConeGeometry(1.9 * k, 0.8, 8), 0xf4f8ff, { p: [0, h * 0.35 + i * 1.05 + 0.5, 0] }); }
      for (let i = 0; i < 4; i++) { const a = rr() * TAU; p.add(new THREE.ConeGeometry(0.1, 0.5, 5), 0x9fe0ff, { p: [Math.cos(a) * 1.3, h * 0.4 + rr() * 2, Math.sin(a) * 1.3], r: [Math.PI, 0, 0] }); } const m = mesh(p.merge(), vcMat({ roughness: 0.85 }, { sway: 6, amp: 0.2 })); m.userData.trunkR = 0.5; return m; };
    this.scatterTrees(A, 22, 81, av, [pine, pine, pine, Flora.rock]); this.scatterTrees(this.B, 16, 82, [[-4, -50, 11], [20, -46, 8], [4, -33, 6], [12, -50, 6]], [pine, pine, Flora.rock]);
    for (let i = 0; i < 12; i++) { const th = r() * TAU, rho = 4 + r() * 16, x = Math.cos(th) * rho, z = Math.sin(th) * rho, y = A.heightAt(x, z); if (y === -Infinity || A.nearEdge(x, z) > 0.9 || av.some((a) => (x - a[0]) ** 2 + (z - a[1]) ** 2 < (a[2] + 0.5) ** 2)) continue; const o = i % 2 ? Flora.rock(60 + i, 1 + r()) : Flora.crookFern(40 + i); o.position.set(x, y - 0.03, z); o.rotation.y = r() * 6; scene.add(o); terrain.addCollider({ x, z, r: 0.5 }); }
    // Flicker's cabin
    const cp = new Parts(); cp.add(new THREE.BoxGeometry(4, 2.6, 3.2), 0xb08a5c, { p: [0, 1.3, 0], jitter: 0.1 }); cp.add(new THREE.ConeGeometry(3.4, 2, 4), 0xf4f8ff, { p: [0, 3.5, 0], r: [0, Math.PI / 4, 0], s: [1, 1, 0.8] }); cp.add(new THREE.BoxGeometry(0.7, 1.6, 0.15), 0x6a4a8a, { p: [0, 0.8, 1.65] }); cp.add(new THREE.CylinderGeometry(0.3, 0.35, 1.4, 8), 0x8a6a62, { p: [1.2, 3.6, -0.5] });
    const cabin = mesh(cp.merge(), vcMat({ roughness: 0.85 })); this.place(cabin, A, -12, 6, 0.4, 1, 0, 2.4); const wm = new THREE.MeshStandardMaterial({ color: 0xffd58a, emissive: 0xffb04a, emissiveIntensity: 1.2 }); for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), wm); w.position.set(-12 + s * 1.2 + Math.sin(0.4) * 0.2, A.heightAt(-12, 6) + 1.4, 6 + 1.62); w.rotation.y = 0.4; this.scene.add(w); }
    for (const [x, z] of [[-9, 10], [-4, 12], [6, 11]]) { const l = Props.lanternPost(2.4, 0xffc46a); this.place(l, A, x, z, 1, 1); terrain.addCollider({ x, z, r: 0.2 }); }
    this.place(Props.signpost(), A, 2, 15, 0.4, 1, 0, 0.2);
    scene.add(Flora.scatterGrass(A, q, av.map((a) => [a[0], a[1], a[2] + 0.5]), { density: 2.2, a: 0xc8dcee, b: 0xf0f6ff, flowers: [0xffffff, 0x9fe8ff, 0xb59cff] }));
    this.risingFalls.push(new Props.RisingFall(scene, 18, A.heightAt(14, 10) + 0.3, 12, { height: 24, radius: 1.2, quality: q, seed: 8 })); terrain.addCollider({ x: 18, z: 12, r: 4 });
  }
  springs_() {
    const { A, scene, terrain } = this; [[-6, -8, 3.4], [14, -6, 3]].forEach(([x, z, r], i) => { const y = A.heightAt(x, z); const g = new THREE.Group(); g.position.set(x, y, z); const pool = new THREE.Mesh(new THREE.CircleGeometry(r, 28).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x7fe8d8, emissive: 0x30a898, emissiveIntensity: 0.5, roughness: 0.15, transparent: true, opacity: 0.85 })); pool.position.y = 0.08; g.add(pool);
      const rp = new Parts(); const rr = rng(40 + i); for (let k = 0; k < 14; k++) { const a = (k / 14) * TAU; rp.add(new THREE.DodecahedronGeometry(0.4 + rr() * 0.3, 0), 0x8d8a96, { p: [Math.cos(a) * (r + 0.2), 0.1, Math.sin(a) * (r + 0.2)], s: [1, 0.6, 1], r: [rr(), rr(), rr()], jitter: 0.3 }); } g.add(mesh(rp.merge(), vcMat({ roughness: 0.95, flatShading: true }))); scene.add(g);
      const sp = { x, z, r, pos: new THREE.Vector3(x, y + 0.5, z), radius: r, time: 0, warm: 0, weather: (dt, w) => { sp.snow = w.snow; sp.wind = w.wind.clone().sub(w.breeze).length(); } }; this.weather.register(sp); this.springs.push(sp); });
  }
  ridge() {
    const { B, scene, terrain } = this; const gy = (x, z) => B.heightAt(x, z);
    // plateau ledge (reachable via the snow ramp), mirror, ice-caged sled, plate
    const ly = gy(-4, -50) + 1.7; this.ledgeY = ly; this.ledge = [new DiscSurface(-4, -50, 7, ly), new DiscSurface(4, -50, 6, ly)]; this.ledge.forEach((s) => terrain.addSurface(s));
    const lp = new Parts(); const rr = rng(6); for (let i = 0; i < 40; i++) { const a = (i / 40) * TAU; for (const [cx, rad] of [[-4, 7.1], [4, 6.1]]) { if (cx === -4 && Math.cos(a) > 0.75) continue; const x = cx + Math.cos(a) * rad, z = -50 + Math.sin(a) * rad; if (cx === -4 && Math.hypot(x - 4, z + 50) < 6) continue; if (cx === 4 && Math.hypot(x + 4, z + 50) < 7) continue; const y0 = gy(x, z); if (y0 === -Infinity) continue; lp.add(new THREE.DodecahedronGeometry(0.8 + rr() * 0.3, 0), [0x9a96a8, 0xb8b4c4][i % 2], { p: [x, y0 + 0.7, z], s: [1, 1.1, 1], r: [rr(), rr(), rr()], jitter: 0.25 }); terrain.addCollider({ x, z, r: 0.85, y0: y0 - 1, y1: y0 + 1.6 }); } }
    scene.add(mesh(lp.merge(), vcMat({ roughness: 0.95, flatShading: true })));
    // snow ramp zone next to the ledge
    this.ramp = new SnowZone(scene, terrain, -4, -42.6, gy(-4, -42.6), 2.6, 1.7); this.weather.register(this.ramp); this.zones.push(this.ramp);
    this.mirror = new SunMirror(scene, new THREE.Vector3(-9, ly, -52), this.weather, terrain); scene.add(this.mirror.group); this.mirror.yaw = 1.4; this.mirrors.push(this.mirror); terrain.addCollider({ x: -9, z: -52, r: 1.1, y0: ly - 1, y1: ly + 4 });
    this.sled = new Sled(scene, terrain, new THREE.Vector3(-1, ly, -50));
    const sledReact = { pos: this.sled.pos.clone().add(new THREE.Vector3(0, 0.6, 0)), radius: 1.5, weather: (dt, w) => this.sled.weather(dt, w) }; this.weather.register(sledReact); this.sledReact = sledReact;
    this.ice = new IceBlock(new THREE.Vector3(-1, ly, -50), 0.95); scene.add(this.ice.group); this.weather.register(this.ice); this.ice.onMelt = () => { this.sled.locked = false; }; this.updaters.push((dt, t) => this.ice.update(dt, t, this.weather));
    this.plate = new PressurePlate(new THREE.Vector3(7, ly, -50)); scene.add(this.plate.group);
    // gate and jar plaza
    const gx = 12, gz = -50, gyy = gy(gx, gz) + 1.0; const gp = new Parts(); for (const s of [-1, 1]) for (let i = 0; i < 4; i++) gp.add(new THREE.BoxGeometry(1.1, 1.2, 1.1), 0xb8c0d0, { p: [0, 0.6 + i * 1.15, s * 2.6], jitter: 0.2 }); for (let i = 0; i < 9; i++) { const a = (i / 8) * Math.PI; gp.add(new THREE.BoxGeometry(0.9, 0.9, 1.1), 0xc8d0dc, { p: [0, 4.6 + Math.sin(a) * 1.4, Math.cos(a) * 2.6], r: [a - Math.PI / 2, 0, 0] }); }
    this.gate = mesh(gp.merge(), vcMat({ roughness: 0.9, flatShading: true })); this.gate.position.set(gx, ly - 1.7 + (gy(gx, gz) - gy(-4, -50)), gz); this.gate.position.y = gy(gx, gz); scene.add(this.gate);
    const door = mesh(new THREE.BoxGeometry(0.4, 4.2, 4.8), std({ color: 0xcfe8ff, transparent: true, opacity: 0.85, roughness: 0.1, emissive: 0x5ab0e0, emissiveIntensity: 0.3 })); door.position.set(gx, gy(gx, gz) + 2.1, gz); scene.add(door); this.door = door; this.doorCol = terrain.addCollider({ x: gx, z: gz, r: 2.6, y0: gy(gx, gz) - 1, y1: gy(gx, gz) + 6 });
    // The Quiet: snowflake spirit in a jar, with three snow zones around it
    const jx = 20, jz = -47, jy = gy(jx, jz); this.jarPos = new THREE.Vector3(jx, jy, jz); const jg = new THREE.Group(); jg.position.set(jx, jy + 0.2, jz); scene.add(jg); this.jar = jg;
    const glass = new THREE.MeshStandardMaterial({ color: 0xd8f0ff, transparent: true, opacity: 0.22, roughness: 0.04, side: THREE.DoubleSide, depthWrite: false, emissive: 0x6aa8c8, emissiveIntensity: 0.15 }); const gm = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [1.5, 0.05], [1.75, 0.6], [1.8, 2.2], [1.55, 3.4], [1.0, 3.9], [0.85, 4.2]].map((q) => new THREE.Vector2(q[0], q[1])), 26), glass); gm.renderOrder = 4; jg.add(gm);
    const brass = std({ color: 0xc6a05a, metalness: 0.9, roughness: 0.3 }); jg.add(mesh(new THREE.CylinderGeometry(1.8, 2.0, 0.4, 22), brass)); this.lid = new THREE.Group(); this.lid.position.y = 4.2; jg.add(this.lid); this.lid.add(mesh(new THREE.CylinderGeometry(1.0, 0.9, 0.5, 18), brass));
    this.spirit = new Sunny(); this.spirit.group.position.set(0, 2.2, 0); jg.add(this.spirit.group); this.spirit.core.material.color.setHex(0xcfeaff); this.spirit.core.material.emissive.setHex(0x80b8ff); this.spirit.rays.children.forEach((c) => { c.material = c.material.clone(); c.material.color.setHex(0xeaf6ff); c.material.emissive.setHex(0x9ac8ff); }); this.spirit.light.color.setHex(0x9ac8ff); this.spirit.face.set('sad'); this.sunny = this.spirit;
    this.jzones = [0, 1, 2].map((i) => { const a = (i / 3) * TAU + 0.5, x = jx + Math.cos(a) * 6.5, z = jz + Math.sin(a) * 6.5; const zn = new SnowZone(this.scene, terrain, x, z, gy(x, z), 2.2, 1.2, false); this.weather.register(zn); this.zones.push(zn); return zn; });
    terrain.addCollider({ x: jx, z: jz, r: 2.1, y0: jy - 1, y1: jy + 6, cam: { r: 1.9, y0: jy, y1: jy + 6 } });
    this.glints.push(this.glint(4, gy(4, -35) + 1, -35, 'c3b', 'Snowman bet')); this.glints.push(this.glint(21, gy(21, -42) + 1, -42, 'c3e', 'Small snowman'));
    // ice-locked drift zones near the twins' slope
    this.race = new SnowZone(scene, terrain, 10, 4, A_h(this.A, 10, 4), 2.4, 1.2, false); this.weather.register(this.race); this.zones.push(this.race);
  }
  cast() {
    const add = (id, x, z, route, extra) => { const n = makeNPC(id, this.terrain, x, z, route, extra); n.addTo(this.scene); n.onSay = (nn, text) => this.game.ui.bark(() => nn.headWorld(1.7), text, 2800, 'pk'); this.weather.register(n); this.npcs.push(n); return n; };
    this.bramble = add('bramble', 8, 2, [{ x: 8, z: 2, wait: 2, say: 'Snow! Snow! SNOW!' }, { x: 12, z: 8, wait: 2, anim: 'cheer' }]); this.burr = add('burr', 9.6, 3, [{ x: 9.6, z: 3, wait: 3, say: 'It is in my socks.' }, { x: 13, z: 9, wait: 3 }]);
    this.flicker = add('flicker', -10, 8.5, [{ x: -10, z: 8.5, wait: 5, say: 'Eek... luminous concern.' }, { x: -8, z: 12, wait: 5, anim: 'shrug' }]); this.granny = add('granny', -4, -6, [{ x: -4, z: -6, wait: 8, anim: 'shrug' }, { x: -6, z: -4, wait: 9, say: 'Warm springs, dears. Follow the steam.' }]); this.granny.speed = 0.5;
    this.wren = add('wren', 28, -50, [], { noFlee: true }); this.wren.root.visible = false;
  }
  clouds() {
    const { scene, weather, q } = this; const mk = (o) => weather.addCloud(new Cloud({ ...o, scene, quality: q }));
    this.fenCloud = mk({ id: 'fen', name: 'Drizzle', pos: new THREE.Vector3(0, 4, 17), size: 1.0, seed: 3, personal: true }); this.fenCloud.face.set('sad'); this.fenCloud.drift.set(0, 0, 0);
    const a = mk({ id: 'flurry', name: 'Flurry', pos: new THREE.Vector3(-6, 12, 0), size: 1.3, seed: 29 }); a.face.set('happy'); a.drift.set(0.1, 0, 0.04); mk({ id: 'nimbus', name: 'Mr. Nimbus', pos: new THREE.Vector3(8, 15, -34), size: 1.2, seed: 33 }).drift.set(0.06, 0, -0.04); const c = mk({ id: 'cirra', name: 'Cirra', pos: new THREE.Vector3(10, 14, -48), size: 1.1, seed: 41 }); c.face.set('happy'); c.drift.set(-0.08, 0, 0.1);
  }
  refillAt(pos) { let r = 0; for (const t of this.cloudRefill) { const d = Math.hypot(pos.x - t.x, pos.z - t.z); if (d < 10) r = Math.max(r, 0.4); } for (const f of this.risingFalls) { const d = Math.hypot(pos.x - f.top.x, pos.z - f.top.z, (pos.y - f.top.y) * 0.5); if (d < 10) r = Math.max(r, (1 - d / 10) * 0.55); } return r; }
  update(dt, t) {
    for (const u of this.updaters) u(dt, t); for (const f of this.risingFalls) f.update(dt);
    for (const s of this.segs) s.update(); for (const z of this.zones) { z.warm = this.springs.some((sp) => Math.hypot(z.x - sp.x, z.z - sp.z) < sp.r + z.r); z.update(); }
    for (const sp of this.springs) { if (Math.random() < dt * 14) this.weather.smoke.spawn(new THREE.Vector3(sp.x + (Math.random() - 0.5) * sp.r, sp.pos.y, sp.z + (Math.random() - 0.5) * sp.r), new THREE.Vector3(0, 1.2, 0), { life: 2.4, size: 0.8, grow: 2.2 }); }
    this.sled.update(dt); this.sledReact.pos.copy(this.sled.pos).add(new THREE.Vector3(0, 0.6, 0)); this.plate.update(dt, [{ pos: this.sled.pos }]);
    for (const g of this.glints) if (!g.got) { g.group.rotation.y += dt * 1.2; g.group.position.y = g.pos.y + Math.sin(t * 2 + g.pos.x) * 0.1; }
    this.mirror.update(dt, t, this.sunDir, true); this.spirit.update(dt, t); if (this.jarOpen) { this.lid.position.y += (this.lid.userData.v || 0) * dt; this.lid.userData.v = (this.lid.userData.v || 0) - 12 * dt; this.lid.rotation.x += dt * 3; this.spirit.group.position.y = damp(this.spirit.group.position.y, 7, 1, dt); } else this.spirit.group.position.y = 2.2 + Math.sin(t * 1.4) * 0.12;
    for (const n of this.npcs) n.update(dt, t, this.game.player, this.game.camera.position);
    if (this.doorOpen) { this.door.position.y = damp(this.door.position.y, this.terrain.topAt(12, -50) + 7, 1.5, dt); this.door.material.opacity = damp(this.door.material.opacity, 0.2, 2, dt); }
    if (this.globe) { this.globe.rotation.y += dt * 0.5; }
  }
}
const A_h = (isl, x, z) => isl.heightAt(x, z);

export class ForestNarr extends ChapterNarr {
  constructor(game) { super(game, 3); Object.assign(this.flags, { frozenSegs: 0, ramp: false, melted: false, plate: false, gate: false, jarZones: 0, freedSpirit: false, race: false, spring: false, globe: false }); this.hints = { river: 'Frost (5) freezes the river segments — breathe on the nearest one, step onto it, then freeze the next.', ramp: 'Hold a cloud (1), then HOLD the Frost tool: the cloud snows. Snow piles up into a ramp.', melt: 'The sled is frozen solid. Bounce sunlight at it with the mirror (Sun 4).', blizzard: 'A blizzard is snow AND wind together: snow over the sled (Frost on a cloud), then blow (Wind 3).', jar: 'Snow on all three drifts around the jar, until they are tall.' }; this.fenIdle = ['Snow. Finally, weather that has the decency to be cold.', 'My moustache has frozen into a single dignified icicle.', 'If I were any gloomier I would be a snowman.']; }
  init() { super.init(); this.game.ui.setGlints(0); }
  begin() { if (this.flags.intro) return; this.flags.intro = true; this.say([
    { who: 'narrator', text: 'Beyond the village, the forest stopped in the middle of a snowfall — and has been holding its breath ever since.' },
    { who: 'juno', ex: 'surprised', text: 'It is... so quiet. Look at the trees — every branch is wearing a tiny ice bell.' },
    { who: 'fen', ex: 'neutral', anim: 'sigh', text: 'Cold, silent and nothing is expected of me. Juno, I could live here.' },
    { who: 'juno', ex: 'happy', text: 'The river is frozen halfway — and it keeps un-freezing. If we can freeze it, and pile up snow ramps... Frost (5) is the answer, I think.' },
    { who: 'fen', ex: 'worried', text: 'You think. That is how most of my previous disasters began.' }]); }
  update(dt, t) {
    this.updateCommon(dt, t); const g = this.game, w = g.world, f = this.flags, p = g.player; f.frozenSegs = w.segs.filter((s) => s.frozen > 0.9).length; f.ramp = w.ramp.count >= 2.9;
    // warm-spring discovery + snow globe combo
    for (const sp of w.springs) { const inside = Math.hypot(p.pos.x - sp.x, p.pos.z - sp.z) < sp.r + 0.4; if (inside && !f.spring) { f.spring = true; g.ui.toast('A warm spring! Snow melts here — and the forest feels gentler.'); g.audio.sfx('bloom'); const gl = w.glint(sp.x + 2, sp.pos.y + 1, sp.z + 2, 'c3c', 'Granny lullaby'); w.glints.push(gl); }
      if (inside) { sp.time += dt * ((sp.snow > 0.2 && sp.wind > 6) ? 1 : -2); sp.time = Math.max(0, sp.time); if (sp.time > 1.5 && !f.globe) { f.globe = true; const gm = new THREE.Mesh(new THREE.SphereGeometry(4.5, 24, 16), new THREE.MeshStandardMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.16, roughness: 0.05, emissive: 0x90c8ff, emissiveIntensity: 0.3, side: THREE.DoubleSide, depthWrite: false })); gm.position.set(sp.x, sp.pos.y + 2, sp.z); w.scene.add(gm); w.globe = gm; g.weather.burst(gm.position, 0xffffff, 60, 6, 1.5); g.ui.toast('A SNOW GLOBE! The forest swirls around you — Burr secretly loves it.', 6000); g.audio.sfx('finale'); this.memory('c3a'); const burr = w.burr; g.ui.bark(() => burr.headWorld(1.6), 'I... may have enjoyed that.', 3500, 'pk'); } } }
    if (!f.race && w.race.count >= 2.2) { f.race = true; g.audio.sfx('bloom'); g.ui.toast('Bramble and Burr stage a snow-ramp race!'); w.bramble.react = 0; const gl = w.glint(10, w.A.heightAt(10, 7) + 1, 7, 'c3d', 'Half scarf'); w.glints.push(gl); g.ui.bark(() => w.bramble.headWorld(1.6), 'WEEEEE!', 3000, 'pk'); }
    if (!f.melted && w.ice.melt >= 1) { f.melted = true; g.setRestore(0.4); g.ui.toast('The ice melted — the sled is free. A blizzard could push it.'); }
    if (w.plate.on && !f.plate) { f.plate = true; g.audio.sfx('plate'); w.doorOpen = true; w.doorCol.enabled = false; f.gate = true; g.setRestore(0.55); g.shot({ pos: new THREE.Vector3(2, w.B.heightAt(12, -50) + 7, -40), look: new THREE.Vector3(12, w.B.heightAt(12, -50) + 3, -50) }, 5); setTimeout(() => this.say([{ who: 'juno', ex: 'excited', text: 'The Pine Gate is open!' }, { who: 'fen', ex: 'neutral', text: 'A sled. A plate. A blizzard. I will never complain about physics again. (I will.)' }], { noLock: true }), 800); this.save(); }
    f.jarZones = w.jzones.filter((z) => z.count >= 2.9).length;
    if (f.jarZones >= 3 && !f.freedSpirit) this.freeSpirit();
    const st = f.frozenSegs < 3 && !f.crossed ? 'river' : !f.ramp && !f.rampDone ? 'ramp' : !f.melted ? 'melt' : !f.gate ? 'blizzard' : !f.freedSpirit ? 'jar' : 'done'; if (f.frozenSegs >= 3) f.crossed = true; if (f.ramp) f.rampDone = true;
    if (st !== this.step) { this.step = st; this.hintT = 0; }
    const OBJ = { river: 'Freeze the river segments and cross (Frost tool 5)', ramp: 'Snow a drift into a ramp: hold a cloud, then hold Frost', melt: 'Melt the ice around the sled with the sun mirror (Sun 4)', blizzard: 'Make a blizzard (snow + wind) to push the sled onto the plate', jar: 'Snow on all three drifts around the jar', done: 'Chapter complete!' };
    const sub = st === 'river' ? `${f.frozenSegs} / 3 segments` : st === 'ramp' ? `Ramp ${(w.ramp.count / 3 * 100) | 0}%` : st === 'melt' ? `Ice ${(w.ice.melt * 100) | 0}%` : st === 'jar' ? `${f.jarZones} / 3 drifts` : '';
    g.ui.setObjective(OBJ[st], sub);
    if (!f.crossed && f.frozenSegs >= 3 && !f.crossSaid) { f.crossSaid = true; this.say([{ who: 'juno', ex: 'excited', text: 'The whole river is ice! Come on, Fen!' }, { who: 'fen', ex: 'worried', text: 'Walking on ice. Water that has decided to be a floor. Alarming.' }], { noLock: true }); }
  }
  freeSpirit() {
    const g = this.game, w = g.world; this.flags.freedSpirit = true; w.jarOpen = true; w.lid.userData.v = 8; w.spirit.face.set('happy'); g.weather.burst(w.spirit.group.getWorldPosition(new THREE.Vector3()), 0xe0f0ff, 70, 7, 2); g.audio.sfx('finale'); g.shake(0.2); g.setRestore(0.85); g.weather.ambient = 'snow';
    g.shot({ pos: w.jarPos.clone().add(new THREE.Vector3(-9, 6, 9)), look: w.jarPos.clone().add(new THREE.Vector3(0, 4, 0)) }, 12); w.wren.root.visible = true; w.wren.place(26, -41);
    setTimeout(() => this.say([{ who: 'narrator', text: 'The Quiet drifted out of its jar — and the forest remembered how to snow, gently, all at once.' },
      { who: 'bramble', ex: 'excited', text: 'It is not snow, it is cloud confetti! ...Burr, say it!' }, { who: 'burr', ex: 'happy', text: 'It is cloud confetti. Fine. It is lovely cloud confetti.' },
      { who: 'granny', ex: 'happy', text: 'Weather is borrowed, dears. Even grief. Especially grief.' }, { who: 'flicker', ex: 'worried', text: 'Take my Factory notes — lightning rods charge best when a cloud is squashed. Gently! And... the thief is small.' },
      { who: 'juno', ex: 'surprised', text: 'Wait — someone in a patched kite-cape ran past the trees. They left a tag on a jar: "THUNDER — STORM FACTORY".' }, { who: 'fen', ex: 'gloom', text: 'Thunder. It always ends with thunder.' }],
      { onEnd: () => { this.flags.freed = true; g.shot(null); Progress.complete(3); this.save(); g.ui.showEnd(`Weather memories: ${Progress.data.memories.filter((x) => x.startsWith('c3')).length} / 5`, 3); } }), 2600); }
  npcLines(npc) { const f = this.flags; if (npc.id === 'granny' && f.spring && !f.grannyTold) { f.grannyTold = true; return [{ who: 'granny', ex: 'happy', text: 'You found the warm spring. Slow and steady, dear. Come, I will hum you something.' }]; } return super.npcLines(npc); }
}
export const ch3 = { title: 'The Frosted Forest', World: ForestWorld, Narr: ForestNarr, restore: 0.3, ambient: 'snow', palette: { fogA: 0xc4d4e8, fogB: 0xe8f0fa, tint: 0xa8c4e8, tintAmt: 0.45, density: [0.011, 0.009] } };
