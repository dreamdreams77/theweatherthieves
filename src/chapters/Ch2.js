import * as THREE from 'three';
import { Island } from '../world/Island.js';
import { ChapterBase } from '../world/ChapterBase.js';
import { DiscSurface } from '../world/Terrain.js';
import { Parts, mesh, vcMat, tube } from '../world/Build.js';
import * as Flora from '../world/Flora.js';
import { SETS } from '../world/AssetSets.js';
import { Wildlife } from '../characters/Wildlife.js';
import * as Props from '../world/Props.js';
import { BloomPlant } from '../world/PuzzleProps.js';
import { Puffkin } from '../characters/Creatures.js';
import { Cloud } from '../weather/Cloud.js';
import { Face } from '../characters/Face.js';
import { waterMaterial } from '../gfx/Shaders.js';
import { std } from '../gfx/Mat.js';
import { Progress } from '../core/Progress.js';
import { ChapterNarr } from '../puzzles/ChapterNarr.js';
import { farScenery, umbrellaHouse, umbrellaCanopy, marketStall } from './common.js';
import { makeNPC } from './cast.js';
import { rng, TAU, damp, lerp, clamp } from '../core/Utils.js';

/** A giant umbrella that opens in rain and bounces you up to a target. Frost freezes it into an ice slide. */
export class UmbrellaPad {
  constructor(scene, pos, target, c1, c2, id) {
    this.id = id; this.pos = pos.clone(); this.target = target.clone(); this.open = 0; this.wet = 0; this.iced = 0; this.r = 1.7; this.radius = 1.7; this.cool = 0; this.group = new THREE.Group(); this.group.position.copy(pos);
    const p = new Parts(); p.add(new THREE.CylinderGeometry(0.1, 0.12, 1.5, 8), 0x5a4a3a, { p: [0, 0.75, 0] }); p.add(new THREE.CylinderGeometry(1.6, 1.6, 0.12, 20), 0xb0a8b8, { p: [0, 0.06, 0] });
    this.group.add(mesh(p.merge(), vcMat({ roughness: 0.8 }))); this.canopy = new THREE.Group(); this.canopy.position.y = 1.5; this.group.add(this.canopy);
    const cp = new Parts(); umbrellaCanopy(cp, 0, 0, 0, 1.9, 1.2, c1, c2); this.cm = mesh(cp.merge(), vcMat({ roughness: 0.6, flatShading: true, side: THREE.DoubleSide })); this.canopy.add(this.cm);
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.06, 6, 32), new THREE.MeshBasicMaterial({ color: 0x7fe0ff, transparent: true, opacity: 0.0 })); this.ring.rotation.x = Math.PI / 2; this.ring.position.y = 0.2; this.group.add(this.ring); scene.add(this.group);
    this.reactPos = pos.clone().add(new THREE.Vector3(0, 1.8, 0));
  }
  get weatherPos() { return this.reactPos; }
  weather(dt, w) { if (w.rain > 0.25 && this.iced < 0.5) this.wet = Math.min(1, this.wet + dt * 0.45 * w.rain); if (w.frost > 0.3) this.iced = Math.min(1, this.iced + dt * 0.35 * w.frost); else if (w.sun > 0.3) this.iced = Math.max(0, this.iced - dt * 0.3); this.rainNow = w.rain; }
  update(dt, t) {
    this.open = damp(this.open, this.wet >= 1 && this.iced < 0.5 ? 1 : this.wet * 0.25, 3, dt); const o = this.open;
    this.canopy.scale.set(0.15 + 0.85 * o, 0.3 + 0.7 * o, 0.15 + 0.85 * o); this.canopy.rotation.z = (1 - o) * 0.5 + Math.sin(t * 2 + this.id) * 0.01 * o; this.canopy.position.y = 1.5 + (1 - o) * -0.2;
    this.ring.material.opacity = o > 0.9 ? 0.4 + Math.sin(t * 4) * 0.2 : 0; this.cm.material.emissive?.setHex(this.iced > 0.5 ? 0x4aa0d8 : 0x000000); this.cm.material.emissiveIntensity = this.iced;
    this.cool -= dt;
  }
}

/** Something that only exists while a thin, low cloud (fog) hangs over it. */
class HiddenThing {
  constructor(group, pos, kind, id) { this.group = group; this.pos = pos.clone(); this.kind = kind; this.id = id; this.rev = 0; group.visible = false; }
}

export class VillageWorld extends ChapterBase {
  constructor(game) {
    super(); this.game = game; const { scene, terrain, weather, quality: q } = game; this.scene = scene; this.terrain = terrain; this.weather = weather; this.q = q; this.sunDir = game.sunDir;
    this.updaters = []; this.glints = []; this.puffkins = []; this.risingFalls = []; this.npcs = []; this.pads = []; this.hidden = []; this.chimes = []; this.mirrors = []; this.cloudRefill = [];
    this.spawn = [2, 21]; this.flags = { valve: false };
    const V = this.V = new Island({ id: 'village', name: 'Umbrella Village', x: 0, y: 0, z: 0, r: 27, seed: 21, hill: 0.9, flat: [[0, 0, 15], [-12, -14, 10]], grass: [0x4f9a8c, 0x93c88c], tint: new THREE.Color(0x4ab0a0) }, q); scene.add(V.build()); terrain.addIsland(V);
    this.cobbles(); this.village(); this.tower(); this.fountain(); this.decor(); this.cast(); this.puzzleBits(); this.clouds();
    farScenery(this, { seed: 77, colors: [0x58b98c, 0xe58ab4, 0xf0b05a], tint: [0x4ab0a0, 0xd9b25a] });
  }
  edgePoint() { return V0; }
  cobbles() {
    const { V, scene } = this, p = new Parts(), r = rng(5);
    for (let i = 0; i < 160; i++) { const a = r() * TAU, d = Math.sqrt(r()) * 13, x = 4 + Math.cos(a) * d, z = 4 + Math.sin(a) * d, y = V.heightAt(x, z); if (y === -Infinity) continue; p.add(new THREE.CylinderGeometry(0.5 + r() * 0.25, 0.55 + r() * 0.25, 0.1, 8), [0xa59cae, 0xb8aebc, 0x948ca0][i % 3], { p: [x, y + 0.02, z], jitter: 0.12 }); }
    scene.add(mesh(p.merge(), vcMat({ roughness: 0.95 })));
  }
  village() {
    const { V, scene, terrain } = this, r = rng(9); this.houses = [];
    const spots = [[15, -9, 0xd8604a, 0xf4d8a0, -0.8], [-13, 8, 0x4aa8a0, 0xf4ead2, 0.8], [-3, 16, 0xe8b23a, 0xfff0c8, 3.2], [17, 8, 0xb070d0, 0xf4ead2, -2.3], [-19, -1, 0xe86a8a, 0xf4ead2, 1.5], [10, -17, 0x4a90d8, 0xf4ead2, 0.2], [-8, 21, 0xd8604a, 0xf4ead2, 3.0], [22, 0, 0x70c060, 0xf4ead2, -1.5]];
    for (const [x, z, a, b, yaw] of spots) { const h = umbrellaHouse(a, b); this.place(h, V, x, z, yaw, 1, 0, 2.1); this.houses.push(h); }
    // Orla's shop (roof A) and the bakery (roof B) as stepped buildings
    const shopP = new Parts(); shopP.add(new THREE.BoxGeometry(6, 4.4, 5), 0xf0dcc0, { p: [0, 2.2, 0], jitter: 0.08 }); shopP.add(new THREE.BoxGeometry(6.4, 0.3, 5.4), 0x9a94a2, { p: [0, 4.5, 0] }); for (let i = 0; i < 6; i++) shopP.add(new THREE.BoxGeometry(0.9, 0.12, 5.6), i % 2 ? 0x4aa8a0 : 0xf4ead2, { p: [-2.5 + i, 4.45, 0.05], r: [0, 0, 0] });
    shopP.add(new THREE.BoxGeometry(1.2, 2.2, 0.2), 0x6a4a8a, { p: [0, 1.1, 2.55] });
    const shop = mesh(shopP.merge(), vcMat({ roughness: 0.85, flatShading: true })); this.place(shop, V, -8, -12, 0, 1, 0, 0); terrain.addCollider({ x: -8, z: -12, r: 3.5, y0: V.heightAt(-8, -12) - 1, y1: V.heightAt(-8, -12) + 4.3, cam: { r: 3.7, y0: V.heightAt(-8, -12), y1: V.heightAt(-8, -12) + 4.5 } }); this.roofA = new DiscSurface(-8, -12, 3.0, V.heightAt(-8, -12) + 4.62); terrain.addSurface(this.roofA);
    const bk = new Parts(); bk.add(new THREE.CylinderGeometry(3, 3.2, 8.4, 14), 0xf4c898, { p: [0, 4.2, 0], jitter: 0.08 }); bk.add(new THREE.CylinderGeometry(3.3, 3.3, 0.3, 14), 0x9a94a2, { p: [0, 8.5, 0] }); bk.add(new THREE.CylinderGeometry(0.4, 0.5, 3, 8), 0x8a6a62, { p: [2.2, 10, 0] });
    const bakery = mesh(bk.merge(), vcMat({ roughness: 0.85, flatShading: true })); this.place(bakery, V, -17, -9, 0, 1, 0, 0); terrain.addCollider({ x: -17, z: -9, r: 3.3, y0: V.heightAt(-17, -9) - 1, y1: V.heightAt(-17, -9) + 8.3, cam: { r: 3.5, y0: V.heightAt(-17, -9), y1: V.heightAt(-17, -9) + 8.5 } }); this.roofB = new DiscSurface(-17, -9, 3.0, V.heightAt(-17, -9) + 8.62); terrain.addSurface(this.roofB);
    for (const [x, z, y] of [[-3, 6, 0.6], [11, 14, 3.0], [-14, 15, 2.2]]) { const st = marketStall(r() > 0.5 ? 0x4aa8a0 : 0xd8604a); this.place(st, V, x, z, y, 1, 0, 1.6); }
    const lp = [[-2, 12], [10, 0], [-12, 0], [3, -10], [18, 16], [-5, -2]]; this.lamps = []; for (const [x, z] of lp) { const l = Props.lanternPost(2.6); this.place(l, V, x, z, r() * 6, 1); this.lamps.push(l.userData.lamp); terrain.addCollider({ x, z, r: 0.2 }); }
    const ll = Props.laundryLine(new THREE.Vector3(-6, this.on(V, -6, 18, 3), 18), new THREE.Vector3(2, this.on(V, 2, 14, 3), 14), 6); scene.add(ll);
    this.place(Props.signpost(), V, 3, 19, 0.3, 1, 0, 0.3); this.place(Props.bench(), V, 12, 11, 2.6, 1, 0, 0.7); this.place(Props.wellBarrel(), V, -6, 3, 0, 1.2, 0, 0.5);
    for (let i = 0; i < 3; i++) { const wc = Props.windChimes(); const x = [-3, 12, -12][i], z = [14, -4, 6][i]; wc.position.set(x, this.on(V, x, z, 3.2), z); scene.add(wc); this.chimes.push(wc); const po = mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.3, 6), std({ color: 0x7a5a42 })); this.place(po, V, x, z, 0, 1, 1.65); }
  }
  tower() {
    const { V, scene, terrain } = this, tx = -16, tz = -20, y0 = V.heightAt(tx, tz); const p = new Parts();
    p.add(new THREE.CylinderGeometry(2.2, 2.6, 11, 12), 0xd8cdbb, { p: [0, 5.5, 0], jitter: 0.12 }); p.add(new THREE.CylinderGeometry(4.0, 3.6, 0.5, 18), 0x9a94a2, { p: [0, 11.1, 0] }); for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; p.add(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 5), 0x7a5a42, { p: [Math.cos(a) * 3.85, 11.8, Math.sin(a) * 3.85] }); }
    p.add(new THREE.CylinderGeometry(2.0, 2.2, 5, 12), 0xd8cdbb, { p: [0, 14, 0] }); umbrellaCanopy(p, 0, 16.5, 0, 3.4, 2.4, 0xe8b23a, 0xd8604a);
    const t = mesh(p.merge(), vcMat({ roughness: 0.85, flatShading: true })); t.position.set(tx, y0, tz); scene.add(t);
    // clock face
    const cf = new THREE.Mesh(new THREE.CircleGeometry(1.3, 24), new THREE.MeshStandardMaterial({ color: 0xfaf4e0, emissive: 0xffe0a0, emissiveIntensity: 0.3 })); cf.position.set(tx + 0, y0 + 14, tz + 2.05); scene.add(cf);
    this.hand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 0.05), new THREE.MeshBasicMaterial({ color: 0x3a2a40 })); this.hand.geometry.translate(0, 0.5, 0); this.hand.position.set(tx, y0 + 14, tz + 2.1); scene.add(this.hand);
    terrain.addCollider({ x: tx, z: tz, r: 2.7, y0: y0 - 1, y1: y0 + 10.2, cam: { r: 2.9, y0: y0, y1: y0 + 20 } }); terrain.addCollider({ x: tx, z: tz, r: 2.1, y0: y0 + 10.5, y1: y0 + 30 });
    this.balcony = new DiscSurface(tx, tz, 3.7, y0 + 11.35); terrain.addSurface(this.balcony); this.balconyPos = new THREE.Vector3(tx, y0 + 11.35, tz); this.towerBase = new THREE.Vector3(tx, y0, tz);
  }
  fountain() {
    const { V, scene, terrain } = this; const fx = 4, fz = 4, y = V.heightAt(fx, fz); this.fountainPos = new THREE.Vector3(fx, y, fz); const p = new Parts();
    for (const [rad, h, yy] of [[4.6, 0.5, 0.25], [3.2, 0.5, 0.75], [1.6, 0.6, 1.3]]) p.add(new THREE.CylinderGeometry(rad, rad * 1.1, h, 20), 0xb3aabb, { p: [0, yy, 0], jitter: 0.12 });
    p.add(new THREE.CylinderGeometry(0.35, 0.5, 2.0, 10), 0xa59cae, { p: [0, 2.2, 0] });
    this.fountainMesh = mesh(p.merge(), vcMat({ roughness: 0.9, flatShading: true })); this.fountainMesh.position.copy(this.fountainPos); scene.add(this.fountainMesh); terrain.addCollider({ x: fx, z: fz, r: 4.2, y0: y - 1, y1: y + 6, cam: { r: 3, y0: y + 1, y1: y + 8 } });
    // water ring that stays dry until the valve opens
    this.water = new THREE.Mesh(new THREE.CircleGeometry(4.4, 30).rotateX(-Math.PI / 2), waterMaterial()); this.water.position.set(fx, y + 0.52, fz); this.water.scale.setScalar(0.001); scene.add(this.water);
    // jar with the Dry Cloud
    const jg = new THREE.Group(); jg.position.set(fx, y + 3.2, fz); scene.add(jg); this.jar = jg; this.jarPos = jg.position.clone().add(new THREE.Vector3(0, -3, 0));
    const glass = new THREE.MeshStandardMaterial({ color: 0xcfeeff, transparent: true, opacity: 0.2, roughness: 0.04, side: THREE.DoubleSide, depthWrite: false, emissive: 0x6aa8c8, emissiveIntensity: 0.12 });
    const gm = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [1.6, 0.05], [1.9, 0.7], [1.95, 2.3], [1.6, 3.3], [1.0, 3.8], [0.85, 4.1]].map((q) => new THREE.Vector2(q[0], q[1])), 26), glass); gm.renderOrder = 4; jg.add(gm); const brass = std({ color: 0xc6a05a, metalness: 0.9, roughness: 0.3 });
    this.lid = new THREE.Group(); this.lid.position.y = 4.1; jg.add(this.lid); this.lid.add(mesh(new THREE.CylinderGeometry(1.0, 0.9, 0.5, 18), brass)); jg.add(mesh(new THREE.CylinderGeometry(1.9, 2.0, 0.35, 22), brass));
    this.dry = this.weather.addCloud(new Cloud({ id: 'dry', name: 'The Dry Cloud', pos: new THREE.Vector3(fx, y + 5.4, fz), size: 0.95, seed: 61, quality: this.q, scene })); this.dry.fixed = true; this.dry.face.set('sad'); this.dry.dryJar = true; this.dry.moisture = 0.2; this.laughs = 0; this.laughCool = 0;
    this.weather.register({ pos: new THREE.Vector3(fx, y + 5.2, fz), radius: 2.8, weather: (dt, w) => this.tickle(dt, w) });
    // basins
    this.basins = []; const defs = [[0.5, 9.2, 0.9, 0.7, 'short'], [6, 10.8, 0.8, 1.7, 'tall'], [11.8, 8.2, 1.7, 0.9, 'wide']];
    defs.forEach(([bx, bz, rad, hgt, name], i) => { const by = V.heightAt(bx, bz); const g = new THREE.Group(); g.position.set(bx, by, bz); const bp = new Parts(); bp.add(new THREE.CylinderGeometry(rad, rad * 0.8, hgt, 16, 1, true), 0xb3aabb, { p: [0, hgt / 2, 0] }); bp.add(new THREE.CylinderGeometry(rad * 0.8, rad * 0.8, 0.12, 16), 0x948ca0, { p: [0, 0.06, 0] }); bp.add(new THREE.TorusGeometry(rad, 0.1, 6, 24), 0xa59cae, { p: [0, hgt, 0], r: [Math.PI / 2, 0, 0] });
      g.add(mesh(bp.merge(), vcMat({ roughness: 0.85, side: THREE.DoubleSide, flatShading: true }))); const wv = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.78, rad * 0.78, 0.1, 18), new THREE.MeshStandardMaterial({ color: 0x5ac0f0, emissive: 0x2a80c0, emissiveIntensity: 0.3, transparent: true, opacity: 0.85 })); wv.position.y = 0.15; g.add(wv); scene.add(g);
      const b = { g, wv, pos: new THREE.Vector3(bx, by + hgt, bz), radius: rad + 0.4, h: hgt, level: 0, locked: false, name, i, weather: null }; b.weather = (dt, w) => { if (!this.flags.valve || b.locked) return; if (w.rain > 0.3) b.level = Math.min(1, b.level + dt * 0.22 * w.rain); };
      this.weather.register(b); this.basins.push(b); terrain.addCollider({ x: bx, z: bz, r: rad * 0.9, y0: by - 1, y1: by + hgt }); });
    this.nextBasin = 0; this.basinLamp = this.basins.map(() => 0);
  }
  tickle(dt, w) {
    this.laughCool -= dt; if (this.dryOpen) return; const g = w.wind.clone().sub(w.breeze).length(); if (this.laughCool <= 0 && (g > 4 || w.sun > 0.4)) { this.laughs++; this.laughCool = 2.2; this.dry.face.set('happy'); this.dry.face.talk = 1; setTimeout(() => { this.dry.face.talk = 0; if (!this.dryOpen) this.dry.face.set('sad'); }, 900); this.game.audio.sfx('squeak'); this.game.weather.burst(this.dry.pos, 0xffffff, 12, 2, 1); this.onLaugh?.(this.laughs); }
  }
  decor() {
    const { V, scene, terrain, q } = this, r = rng(33); const av = [[4, 4, 6], [-12, -14, 5], [15, -9, 3], [-13, 8, 3], [-3, 16, 3], [17, 8, 3], [-19, -1, 3], [10, -17, 3], [-8, 21, 3], [22, 0, 3], [-8, -12, 4.5], [-17, -9, 4], [-16, -20, 4.5], [0.5, 9.2, 2], [6, 10.8, 2], [11.8, 8.2, 2.5]];
    this.scatterTrees(V, 11, 71, av, [Flora.cloudcapTree, SETS.autumn(), SETS.autumn()]);
    for (let i = 0; i < 26; i++) { const th = r() * TAU, rho = 6 + r() * 20, x = Math.cos(th) * rho, z = Math.sin(th) * rho, y = V.heightAt(x, z); if (y === -Infinity || V.nearEdge(x, z) > 0.9 || av.some((a) => (x - a[0]) ** 2 + (z - a[1]) ** 2 < (a[2] + 0.5) ** 2)) continue; const k = i % 4; const o = k === 0 ? Flora.spotMushroom(30 + i, 0.9 + r() * 0.9, [0xd8505a, 0xe89a3c, 0xb06ad8, 0x4aa8a0][i % 4]) : k === 1 ? Flora.crookFern(40 + i) : k === 2 ? Flora.pillowMoss(50 + i, 1 + r()) : SETS.rock('autumn')(60 + i, 1 + r() * 0.5); o.position.set(x, y - 0.03, z); o.rotation.y = r() * 6; scene.add(o); if (k !== 1) terrain.addCollider({ x, z, r: 0.5 }); }
    const rf = new Props.RisingFall(scene, -22, V.heightAt(-22, 14) + 0.3, 14, { height: 26, radius: 1.3, quality: q, seed: 4 }); this.risingFalls.push(rf); this.cloudRefill.push(rf.top); terrain.addCollider({ x: -22, z: 14, r: 4.2 });
    Flora.scatterClutter(scene, terrain, V, 14, 601, av.map((a) => [a[0], a[1], a[2] + 1]).concat(terrain.colliders.map((c) => [c.x, c.z, c.r + 0.5])), [SETS.bush('autumn'), SETS.flowers('autumn'), SETS.stump()], { collide: false });
    scene.add(Flora.scatterGrass(V, q, av.map((a) => [a[0], a[1], a[2] + 0.5]).concat(terrain.colliders.filter((c) => Math.hypot(c.x, c.z) < 28).map((c) => [c.x, c.z, c.r + 0.2])), { density: 5, a: 0x4f9a8c, b: 0xa4d4a0, flowers: [0xffffff, 0x9fe8ff, 0xffd05a, 0xff9fd0] }));
  }
  cast() {
    const { V, terrain } = this; const add = (id, x, z, route, extra) => { const n = makeNPC(id, terrain, x, z, route, extra); n.addTo(this.scene); n.onSay = (nn, text) => this.game.ui.bark(() => nn.headWorld(1.7), text, 2800, 'pk'); this.weather.register(n); this.npcs.push(n); return n; };
    this.pib = add('pib', 8, 14, [{ x: 8, z: 14, wait: 4, anim: 'point', say: 'B-plus puddle.' }, { x: -2, z: 10, wait: 3, anim: 'nod' }, { x: 12, z: 2, wait: 4, say: 'Hmm. Wet enough?' }, { x: 6, z: -6, wait: 3 }]);
    this.orla = add('orla', -6, -9, [{ x: -6, z: -9, wait: 6, anim: 'nod' }, { x: -10, z: -8, wait: 5, say: 'Umbrellas! Get your umbrellas!' }]);
    this.tock = add('tock', 7.5, 0.5, [], { spin: true }); this.tock.root.scale.setScalar(1);
    this.granny = add('granny', 14, 11, [{ x: 14, z: 11, wait: 8, anim: 'shrug' }, { x: 12, z: 14, wait: 8, say: 'Gently, dears.' }]); this.granny.speed = 0.5;
    this.wren = add('wren', 22, 8, []); this.wren.root.visible = false;
    this.glints = [];
    this.glints.push(this.glint(-16 + 2.4, this.balconyPos.y + 0.9, -20 + 1, 'c2b', 'Balcony memory'));
    // garden: 3 blooms near Granny's shell patch
    this.blooms = []; [[16, 14], [18.2, 11.4], [14.6, 15.8]].forEach(([x, z], i) => { const parts = Flora.lanternbloom(); const b = new BloomPlant(parts, new THREE.Vector3(x, V.heightAt(x, z), z), i); this.scene.add(b.group); b.pos.set(x, V.heightAt(x, z) + 1.2, z); b.radius = 1.4; this.weather.register(b); this.blooms.push(b); this.updaters.push((dt, t) => b.update(dt, t)); terrain.addCollider({ x, z, r: 0.3 }); });
    this.wild = []; { const w = new Wildlife(this.scene, terrain, 'Fox', 18, 18, { height: 0.75, roam: 5 }); if (w.ok) { this.wild.push(w); this.weather.register({ get pos() { return w.pos; }, radius: 0.8, weather: (dt, ww) => w.weather(dt, ww) }); this.updaters.push((dt) => w.update(dt, this.game.player)); } }
    for (let i = 0; i < 3; i++) { const [x, z] = [[-1, 3], [11, 6], [-4, -6]][i]; const p = new Puffkin(new THREE.Vector3(x, V.heightAt(x, z), z), 300 + i, terrain); this.scene.add(p.group); this.weather.register(p); this.puffkins.push(p); this.updaters.push((dt, t) => p.update(dt, t, this.game.player, this.game.companion)); }
  }
  puzzleBits() {
    const { V, scene, terrain } = this; const yy = (x, z, d = 0) => V.heightAt(x, z) + d;
    const P = (x, z, y, tx, ty, tz, a, b, i) => { const pad = new UmbrellaPad(scene, new THREE.Vector3(x, y, z), new THREE.Vector3(tx, ty, tz), a, b, i); this.weather.register({ get pos() { return pad.reactPos; }, radius: 1.8, weather: (dt, w) => pad.weather(dt, w) }); this.pads.push(pad); return pad; };
    P(-5, -5, yy(-5, -5), -8, this.roofA.y + 0.3, -12, 0xd8604a, 0xf4d8a0, 0); P(-7, -11, this.roofA.y, -17, this.roofB.y + 0.3, -9, 0x4aa8a0, 0xf4ead2, 1); P(-16, -9.5, this.roofB.y, -16, this.balcony.y + 0.3, -21, 0xe8b23a, 0xfff0c8, 2);
    // hidden things (revealed by fog): valve wheel, lost umbrellas x3, shoe-print glint
    const vg = new THREE.Group(); const vm = std({ color: 0xd9b25a, metalness: 0.8, roughness: 0.3 }); vg.add(mesh(new THREE.TorusGeometry(0.7, 0.1, 8, 24), vm)); for (let i = 0; i < 4; i++) { const sp = mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 6), vm); sp.rotation.z = i * Math.PI / 4; vg.add(sp); } const pipe = mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.6, 10), std({ color: 0x7a7480, metalness: 0.5 })); pipe.position.y = -0.8; vg.add(pipe);
    vg.position.set(this.balconyPos.x - 2.6, this.balconyPos.y + 1.2, this.balconyPos.z + 0.2); vg.rotation.y = Math.PI / 2; scene.add(vg); this.valve = new HiddenThing(vg, vg.position, 'valve', 'valve'); this.hidden.push(this.valve);
    [[-4, 18, 0xd8604a], [16, -3, 0x4a90d8], [-14, 3, 0xb070d0]].forEach(([x, z, c], i) => { const g = new THREE.Group(); const p = new Parts(); p.add(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6), 0x5a4a3a, { p: [0, 0.7, 0], r: [0, 0, 0.3] }); p.add(new THREE.ConeGeometry(0.5, 1.2, 8), c, { p: [-0.3, 1.3, 0], r: [0, 0, 0.3] }); g.add(mesh(p.merge(), vcMat({ roughness: 0.7 }))); g.position.set(x, yy(x, z, 0.0), z); scene.add(g); this.hidden.push(new HiddenThing(g, g.position, 'umbrella', 'u' + i)); });
    const sg = this.glint(7.5, yy(7.5, 9.4, 1.0), 9.4, 'c2e', 'Shoe prints'); const sh = new HiddenThing(sg.group, sg.pos, 'glint', 'c2e'); sh.glint = sg; this.hidden.push(sh); sg.group.visible = false;
  }
  clouds() {
    const { scene, weather, q } = this; const mk = (o) => weather.addCloud(new Cloud({ ...o, scene, quality: q }));
    this.fenCloud = mk({ id: 'fen', name: 'Drizzle', pos: new THREE.Vector3(2, 4, 22), size: 1.0, seed: 3, personal: true }); this.fenCloud.face.set('sad'); this.fenCloud.drift.set(0, 0, 0);
    const a = mk({ id: 'nimbus', name: 'Mr. Nimbus', pos: new THREE.Vector3(-4, 14, 6), size: 1.2, seed: 29 }); a.drift.set(0.1, 0, 0.05); a.face.set('neutral');
    const b = mk({ id: 'cirra', name: 'Cirra', pos: new THREE.Vector3(18, 17, -4), size: 1.1, seed: 41 }); b.drift.set(-0.1, 0, 0.1); b.face.set('happy');
    const c = mk({ id: 'cumulo', name: 'Cumulo', pos: new THREE.Vector3(-20, 13, -10), size: 1.4, seed: 53 }); c.face.set('sleepy'); c.drift.set(0.06, 0, 0.02);
  }
  refillAt(pos) { let r = 0; for (const t of this.cloudRefill) { const d = Math.hypot(pos.x - t.x, pos.z - t.z, (pos.y - t.y) * 0.5); if (d < 10) r = Math.max(r, (1 - d / 10) * 0.55); } return r; }
  /** Called from Player.update: bounce on an open umbrella */
  padUpdate(pl) {
    for (const pad of this.pads) { if (pad.open < 0.85 || pad.cool > 0) continue; const dx = pl.pos.x - pad.pos.x, dz = pl.pos.z - pad.pos.z; if (Math.hypot(dx, dz) < pad.r && Math.abs(pl.pos.y - pad.pos.y) < 1.1 && pl.vel.y <= 0.5) {
      const dh = pad.target.y - pl.pos.y, vy = Math.sqrt(2 * 24 * Math.max(2.2, dh + 2.4)), t = (vy + Math.sqrt(Math.max(0, vy * vy - 48 * dh))) / 24; pl.vel.y = vy; pl.vel.x = (pad.target.x - pl.pos.x) / t; pl.vel.z = (pad.target.z - pl.pos.z) / t; pl.grounded = false; pl.bounce = { vx: pl.vel.x, vz: pl.vel.z, t: 0 }; pad.cool = 0.8; pad.squash = 1; this.game.audio.sfx('squeak'); this.game.weather.burst(pad.pos.clone().add(new THREE.Vector3(0, 1.4, 0)), 0xffffff, 10, 2.5, 1); } }
  }
  fogCloudNear(pos) {
    for (const c of this.weather.clouds) { if (c.fixed || c.stretch < 1.4) continue; const gtop = this.terrain.topAt(c.pos.x, c.pos.z); if (c.pos.y - Math.max(gtop, pos.y) > 7.5) continue; if (Math.hypot(c.pos.x - pos.x, c.pos.z - pos.z) < 6.5 + c.stretch) return c; } return null;
  }
  update(dt, t) {
    for (const u of this.updaters) u(dt, t); for (const f of this.risingFalls) f.update(dt);
    for (const g of this.glints) if (!g.got && g.group.visible !== false) { g.group.rotation.y += dt * 1.2; g.group.position.y = g.pos.y + Math.sin(t * 2 + g.pos.x) * 0.1; }
    for (const p of this.pads) p.update(dt, t);
    for (const h of this.hidden) { const c = this.fogCloudNear(h.pos); h.rev = damp(h.rev, c ? 1 : 0, 3, dt); h.group.visible = h.rev > 0.04; if (h.kind === 'glint' && h.glint.got) h.group.visible = false; h.group.scale.setScalar(Math.max(0.01, h.rev)); h.up = h.rev > 0.8; if (c && Math.random() < dt * 8) this.weather.smoke.spawn(new THREE.Vector3(h.pos.x + (Math.random() - 0.5) * 3, h.pos.y + 0.3, h.pos.z + (Math.random() - 0.5) * 3), new THREE.Vector3(0.1, 0.1, 0.1), { life: 2.5, size: 1.6, grow: 2 }); }
    for (const n of this.npcs) { n.update(dt, t, this.game.player, this.game.camera.position); if (n.spec.spin) { n.yaw += dt * (this.game.weather.force(n.pos).length() > 1 ? 4 : 0.5); n.root.rotation.y = n.yaw; } }
    this.npcs.forEach((n) => (n.root.visible = n === this.wren ? n.root.visible : true));
    // basins
    for (const b of this.basins) { b.wv.scale.y = Math.max(0.1, b.level * b.h * 8); b.wv.position.y = 0.1 + (b.level * (b.h - 0.2)) / 2; b.wv.scale.y = Math.max(0.01, b.level * (b.h - 0.2) / 0.1); b.wv.material.emissiveIntensity = b.locked ? 1.2 : 0.3; b.wv.material.color.setHex(b.locked ? 0x9fffd0 : 0x5ac0f0); if (!b.locked && b.level >= 0.999) { if (b.i === this.nextBasin) { b.locked = true; this.nextBasin++; this.game.audio.sfx('plate'); this.game.weather.burst(b.pos, 0x9fffd0, 18, 3, 1.2); this.onBasin?.(this.nextBasin); } else { this.basins.forEach((x) => { x.level = 0; x.locked = false; }); this.nextBasin = 0; this.game.audio.sfx('fall'); this.onWrongOrder?.(); break; } } }
    this.water.scale.setScalar(damp(this.water.scale.x, this.flags.valve ? 1 : 0.001, 1.5, dt)); this.hand.rotation.z -= dt * 0.3;
    const dry = this.dry; if (dry) { if (this.dryOpen) { dry.moisture = 1; dry.forceRain = true; dry.pos.y = damp(dry.pos.y, this.fountainPos.y + 11, 0.8, dt); this.lid.position.y += this.lid.userData.v ? this.lid.userData.v * dt : 0; if (this.lid.userData.v) { this.lid.userData.v -= 14 * dt; this.lid.rotation.x += dt * 3; } } else { dry.pos.y = this.fountainPos.y + 5.4 + Math.sin(t * 1.3) * 0.12; dry.face.lookAt(new THREE.Vector3(0, 0, 1)); } }
    for (const c of this.chimes) { const f = this.weather.force(c.position, 1); c.userData.tubes.forEach((p, i) => { p.rotation.z = Math.sin(t * (1.6 + i * 0.2) + i) * 0.1 + f.x * 0.06; p.rotation.x = Math.cos(t * (1.3 + i * 0.3)) * 0.1 + f.z * 0.06; }); }
  }
}
const V0 = null;

export class VillageNarr extends ChapterNarr {
  constructor(game) { super(game, 2); Object.assign(this.flags, { pads: 0, valve: false, basins: 0, laughs: 0, rained: false, garden: false, umbrellasFound: 0, umbrellasReturned: 0, slide: false, basinsHint: false, wrong: 0 }); this.hints = { pads: 'Rain on the three giant umbrellas (Rain tool 2, hold over each) — open ones bounce you upward when you step on them.', fog: 'Squash/stretch a cloud wide (wheel) and hold it low over the balcony: fog reveals hidden things.', basins: 'Tock the weathervane knows the order — click him. Rain fills the basins one at a time.', laugh: 'The Dry Cloud giggles at gusts (Wind 3) and at sunlight.' }; this.fenIdle = ['Umbrellas. Everywhere. It is like being judged by flowers.', 'Why would a village celebrate rain? It makes everything damp.', 'I rather like the clock tower. It is the right kind of gloomy.']; }
  init() { super.init(); const w = this.game.world; w.onBasin = (n) => { this.flags.basins = n; this.game.ui.toast(n >= 3 ? 'All three basins are full — the fountain is waking up!' : `Basin ${n} / 3 filled — correct order!`); }; w.onWrongOrder = () => { this.flags.wrong++; this.game.ui.toast('Wrong order! The basins drained. (Ask Tock which comes first.)'); this.game.say.fen('That was the wrong basin. I would say I told you so, but I didn\'t.'); }; w.onLaugh = (n) => { this.flags.laughs = n; if (n === 1) this.game.say.juno('It giggled! Again!'); if (n >= 3) this.freeDryCloud(); }; this.game.ui.setGlints(0); }
  begin() { if (this.flags.intro) return; this.flags.intro = true; this.say([
    { who: 'narrator', text: 'The Village of Umbrellas had one holiday: the Day of Dancing in the Rain. This year, the rain did not come.' },
    { who: 'juno', ex: 'excited', text: 'Fen, look — a whole village built under umbrellas! Every roof is a giant parasol!' },
    { who: 'fen', ex: 'gloom', anim: 'sigh', text: 'It is a village of people who are all about to be wrong about the weather. I feel at home.' },
    { who: 'juno', ex: 'happy', text: 'The glass jar in the fountain has a sulky storm cloud in it. If we can find the way to the clock tower valve...' },
    { who: 'fen', ex: 'worried', text: 'Valve? Tower? Up again? Of course. Talk to the villagers first — nobody here ever says anything useful on purpose, but they do it by accident.' }]); }
  onGrab(c) { super.onGrab(c); }
  freeDryCloud() { const g = this.game, w = g.world; w.dryOpen = true; w.lid.userData.v = 9; w.dry.face.set('happy'); w.dry.face.talk = 1; this.flags.rained = true; g.setRestore(0.8); g.weather.burst(w.dry.pos, 0xffffff, 60, 8, 2); g.audio.sfx('finale'); g.shake(0.25);
    g.shot({ pos: w.fountainPos.clone().add(new THREE.Vector3(-9, 6, 11)), look: w.fountainPos.clone().add(new THREE.Vector3(0, 6, 0)) }, 12); this.finale = { t: 0 };
    setTimeout(() => this.say([{ who: 'narrator', text: 'The Dry Cloud laughed so hard it forgot to be sad — and then it began to rain.' },
      { who: 'pib', ex: 'excited', text: 'RAIN! Real rain! Everyone — umbrellas DOWN! It is the Day of Dancing! (I may cry. Do not look.)' },
      { who: 'orla', ex: 'love', text: 'Umbrellas are just hugs with ribs. Now they have something to hug.' },
      { who: 'fen', ex: 'surprised', text: 'It is raining on someone who is not me. This is an extraordinary day.' },
      { who: 'juno', ex: 'happy', text: 'Look — a tiny cape by the fountain... somebody was here. Somebody small, carrying jars.' },
      { who: 'tock', ex: 'surprised', text: 'THE THIEF WEARS A KITE-CAPE! ...I think. I point where the wind WAS. Anyway: the next jar is at the Frosted Forest!' }], { onEnd: () => { const g2 = this.game; this.flags.freed = true; Progress.complete(2); this.save(); g2.shot(null); g2.ui.showEnd(`Weather memories: ${Progress.data.memories.filter((x) => x.startsWith('c2')).length} / 5 · Lost umbrellas returned: ${this.flags.umbrellasReturned} / 3`, 2); } }), 2600); }
  onInteract() {
    const g = this.game, w = g.world, p = g.player; const v = w.valve;
    if (v.up && !this.flags.valve && Math.hypot(p.pos.x - v.pos.x, p.pos.z - v.pos.z) < 3.4 && Math.abs(p.pos.y - (v.pos.y - 1.2)) < 2.4) { this.flags.valve = w.flags.valve = true; g.audio.sfx('unlock'); g.weather.burst(v.pos, 0x7fe0ff, 30, 4, 1.4); v.group.rotation.z += 1.5; g.setRestore(0.5); this.say([{ who: 'juno', ex: 'excited', text: 'It turned! Water is rushing down into the fountain pipes!' }, { who: 'fen', ex: 'neutral', text: 'The basins will fill in some order. There is always an order. I hate orders.' }], { noLock: true }); this.save(); return true; }
    for (const h of w.hidden) if (h.kind === 'umbrella' && h.up && !h.taken && Math.hypot(p.pos.x - h.pos.x, p.pos.z - h.pos.z) < 2.6) { h.taken = true; h.group.visible = false; h.group.scale.setScalar(0.001); this.flags.umbrellasFound++; g.audio.sfx('glint'); g.ui.toast(`Lost umbrella found (${this.flags.umbrellasFound} / 3). Take them to Madam Orla.`); return true; }
    return false;
  }
  npcLines(npc) {
    const f = this.flags, g = this.game;
    if (npc.id === 'orla' && f.umbrellasFound > f.umbrellasReturned) { f.umbrellasReturned = f.umbrellasFound; if (f.umbrellasReturned >= 3 && !f.orlaGift) { f.orlaGift = true; this.memory('c2d'); g.audio.sfx('bloom'); } this.save(); return [{ who: 'orla', ex: 'love', text: f.umbrellasReturned >= 3 ? 'All three! You found them in the FOG? Clever one. Here — this memory was sewn into the first one.' : `${f.umbrellasReturned} umbrella${f.umbrellasReturned > 1 ? 's' : ''} back on the hooks! Bring me the others.` }]; }
    if (npc.id === 'tock') { f.basinsHint = true; return [{ who: 'tock', ex: 'excited', text: 'Basins! Fill them SHORT first, then TALL, then WIDE! ...or I might be pointing where the wind was.' }, { who: 'fen', ex: 'gloom', text: 'Tock. You are the only weathervane who has never once been right.' }, { who: 'tock', ex: 'happy', text: 'Today I am! Probably.' }]; }
    if (npc.id === 'granny' && !f.garden) { return [{ who: 'granny', ex: 'happy', text: 'Weather isn’t owned, dear. It’s borrowed. My shell garden would love a gentle rain.' }, { who: 'granny', ex: 'sleepy', text: 'Three little lanterns by the stalls. Slow and gentle, mind — drizzle, not a downpour.' }]; }
    return super.npcLines(npc);
  }
  update(dt, t) {
    this.updateCommon(dt, t); const g = this.game, w = g.world, f = this.flags, p = g.player;
    f.pads = w.pads.filter((x) => x.open > 0.9).length;
    if (!f.garden && w.blooms.every((b) => b.bloomed)) { f.garden = true; g.audio.sfx('bloom'); const gl = w.glint(w.blooms[0].group.position.x, w.blooms[0].group.position.y + 1, w.blooms[0].group.position.z + 1.5, 'c2a', 'Garden memory'); w.glints.push(gl); g.ui.toast('Granny Mossback’s garden is blooming!'); this.save(); }
    if (!f.slide && w.pads.every((x) => x.iced > 0.8 && x.wet >= 1)) { f.slide = true; g.audio.sfx('melt'); g.ui.toast('Frozen giant umbrellas! A village-wide ice slide — the Mayor calls it "official transport".'); g.say.fen('I did not authorise this. ...Again.'); const gl = w.glint(-5, w.V.heightAt(-5, -3) + 1, -3, 'c2c', 'Dancing memory'); w.glints.push(gl); }
    const st = !f.valve ? (f.pads >= 3 ? 'fog' : 'pads') : f.basins < 3 ? 'basins' : !f.rained ? 'laugh' : 'done'; if (st !== this.step) { this.step = st; this.hintT = 0; }
    const OBJ = { pads: 'Open the three giant umbrellas with rain, then bounce up to the clock tower', fog: 'Fog the balcony (stretch a cloud, hold it low) and turn the hidden valve — F', basins: 'Fill the basins in the right order: ask Tock (click him)', laugh: 'Make the Dry Cloud laugh 3 times — blow gusts at it!', done: 'Chapter complete!' };
    const sub = st === 'pads' ? `${f.pads} / 3 umbrellas open` : st === 'basins' ? `${f.basins} / 3 basins · wrong orders: ${f.wrong}` : st === 'laugh' ? `${f.laughs} / 3 laughs` : '';
    g.ui.setObjective(OBJ[st], sub);
  }
}
export const ch2 = { title: 'The Village of Umbrellas', World: VillageWorld, Narr: VillageNarr, restore: 0.35, ambient: null, palette: { fogA: 0xb8c8d8, fogB: 0xf6dcc4, tint: 0x9ab8d0, tintAmt: 0.0, density: [0.0075, 0.006] } };
