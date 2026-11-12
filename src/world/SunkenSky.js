import * as THREE from 'three';
import { Island } from './Island.js';
import { ChapterBase } from './ChapterBase.js';
import { BridgeSurface } from './Terrain.js';
import { Parts, mesh, vcMat, tube, puff } from './Build.js';
import * as Flora from './Flora.js';
import { SETS } from './AssetSets.js';
import { Assets } from '../gfx/Assets.js';
import { Wildlife } from '../characters/Wildlife.js';
import * as Props from './Props.js';
import { BloomPlant, SunMirror, IceBlock, SunGate, FeatherCrate, PressurePlate, Windmill, Lift } from './PuzzleProps.js';
import { Puffkin, Sunny } from '../characters/Creatures.js';
import { Face } from '../characters/Face.js';
import { Cloud } from '../weather/Cloud.js';
import { waterMaterial, beamMaterial } from '../gfx/Shaders.js';
import { std } from '../gfx/Mat.js';
import { rng, TAU, lerp, smoothstep } from '../core/Utils.js';

/** Builds THE SUNKEN SKY - four hand-placed islands, a village of props, a lot of tiny details and the three puzzles. */
const ROCK1 = (seed, sz) => SETS.rock()(seed, sz);
export class SunkenSky extends ChapterBase {
  constructor(game) {
    super(); this.game = game; const { scene, terrain, weather, quality: q } = game; this.q = q; this.scene = scene; this.terrain = terrain; this.weather = weather;
    this.updaters = []; this.reactions = []; this.glints = []; this.puffkins = []; this.risingFalls = []; this.cloudRefill = []; this.pickables = []; this.chimes = []; this.cloths = [];
    this.sunDir = game.sunDir;
    const mk = (d) => { const i = new Island(d, q); scene.add(i.build()); terrain.addIsland(i); return i; };
    this.H = mk({ id: 'home', name: 'Drizzle Landing', x: 0, y: 0, z: 0, r: 15, seed: 1, hill: 1.1, flat: [[-6, 4, 5], [7.5, -3, 4.5], [-3, -8, 4.5], [0, 8, 3]], grass: [0x5aa05a, 0x93c35c] });
    this.B = mk({ id: 'meadow', name: 'Mirror Meadow', x: -34, y: 4, z: -20, r: 12, seed: 2, hill: 1.4, flat: [[-31, -18, 3], [-29.8, -26, 4], [-37, -21, 3]], grass: [0x3f9f84, 0x8fcf8a], tint: new THREE.Color(0x4ab0a0) });
    this.C = mk({ id: 'rise', name: 'Windmill Rise', x: -14, y: 9, z: -58, r: 13, seed: 3, hill: 1.0, flat: [[-16, -62, 4], [-6, -56, 3], [-10, -55, 5], [-4.5, -60, 3.5], [-8, -53, 5]], grass: [0x9aa84a, 0xd6c25c], tint: new THREE.Color(0xd9b25a) });
    this.D = mk({ id: 'summit', name: 'Jar Summit', x: 26, y: 18, z: -62, r: 10.5, seed: 4, hill: 0.8, flat: [[26, -62, 6]], grass: [0x56a58c, 0xa4d4a0], tint: new THREE.Color(0x8ad0c0) });
    this.islands = [this.H, this.B, this.C, this.D];
    this.buildFar(); this.buildHome(); this.buildMeadow(); this.buildRise(); this.buildSummit(); this.buildBridges(); this.buildClouds(); this.buildNature();
  }
  // ---------------------------------------------------------------- far scenery
  buildFar() {
    const q = this.q, r = rng(404), n = q.mobile ? 9 : 16, mat = std({ vertexColors: true, roughness: 0.95 });
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU + r() * 0.3, d = 85 + r() * 140, rad = 6 + r() * 20, x = Math.cos(a) * d - 15, z = Math.sin(a) * d - 35, y = -35 + r() * 80;
      if (Math.hypot(x + 14, z + 40) < 60) continue;
      const isl = new Island({ x, y, z, r: rad, seed: 50 + k, hill: 1.5, depth: rad * 1.3, grass: [0x56a07c, 0x9acb8a], tint: new THREE.Color(r() > 0.5 ? 0xd9b25a : 0x6ac0a0) }, { mobile: true });
      const g = isl.build(); this.scene.add(g); g.traverse((o) => { if (o.isMesh) { o.castShadow = false; } });
      const p = new Parts(); for (let t = 0; t < 6 + (rad / 4 | 0); t++) { const th = r() * TAU, rho = Math.sqrt(r()) * rad * 0.8, tx = Math.cos(th) * rho, tz = Math.sin(th) * rho, ty = isl.heightAt(x + tx, z + tz) - y; if (ty === -Infinity) continue; const tall = 2 + r() * 4;
        p.add(new THREE.CylinderGeometry(0.15, 0.3, tall, 5), 0x6b4a3a, { p: [tx, ty + tall / 2, tz] }); p.add(new THREE.IcosahedronGeometry(1.2 + r() * 1.2, 1), [0x58b98c, 0xe58ab4, 0x3f9a78][(r() * 3) | 0], { p: [tx, ty + tall + 0.6, tz], jitter: 0.2 }); }
      if (p.list.length) { const tm = mesh(p.merge(), mat); tm.position.set(x, y, z); this.scene.add(tm); }
      if (r() > 0.45) { const rf = new Props.RisingFall(this.scene, x + rad * 0.3, y + 0.2, z, { height: 15 + r() * 25, radius: 0.9, quality: q, seed: k }); this.risingFalls.push(rf); this.cloudRefill.push(rf.top); }
    }
    // colossal ring ruin
    const rp = new Parts(); for (let i = 0; i < 40; i++) { const a = (i / 40) * TAU; if (i > 29 && i < 34) continue; rp.add(new THREE.BoxGeometry(5, 6, 8), 0xa59cae, { p: [Math.cos(a) * 40, Math.sin(a) * 40, 0], r: [0, 0, a], jitter: 0.25 }); }
    const ring = mesh(rp.merge(), vcMat({ roughness: 1, flatShading: true }), { castShadow: false }); ring.position.set(-70, 22, -135); ring.rotation.y = 0.5; this.scene.add(ring);
    // sleeping cloud whale
    const wp = new Parts(); for (let i = 0; i < 16; i++) { const t = i / 15; wp.add(new THREE.IcosahedronGeometry(9 - Math.abs(t - 0.4) * 7 * 0.7 + (i % 3), 2), 0xf4f6ff, { p: [t * 80 - 40, Math.sin(t * 3) * 3, ((i % 2) - 0.5) * 4], s: [1.5, 0.9, 1], jitter: 0.1 }); }
    const whale = mesh(wp.merge(), std({ vertexColors: true, roughness: 1, emissive: 0x8a96b8, emissiveIntensity: 0.25 }), { castShadow: false }); const wg = new THREE.Group(); wg.add(whale);
    const wf = new Face({ r: 7, skin: 0xfdfdff, eyeColor: 0x405074, eyeX: 0.4, eyeY: 0.05, eyeR: 0.3, brow: 0x6a7490, mouthY: -0.35, mouthW: 0.3 }); wf.group.position.set(-38, 1, 8); wf.group.rotation.y = -0.5; wf.set('sleepy', { open: 0 }); wg.add(wf.group);
    wg.position.set(95, -8, -170); wg.rotation.y = -0.4; this.scene.add(wg); this.whale = { group: wg, face: wf }; this.updaters.push((dt, t) => { wg.position.y = -8 + Math.sin(t * 0.25) * 1.5; wf.update(dt, t); });
  }
  // ---------------------------------------------------------------- HOME
  buildHome() {
    const { H, scene, terrain, weather, q } = this; const avoid = [[-6, 4, 3.2], [7.5, -3, 4], [-3, -8, 4.2], [0, 8, 2.5], [-11, -6, 2], [11, 5, 2.8], [2, 6, 6], [-6, -2, 3]];
    const cot = Props.cottage(); this.place(cot, H, -6.5, 4, 0.7, 1, 0); terrain.addCollider({ x: -6.5, z: 4, r: 2.6, y0: -2, y1: 10, cam: { r: 2.7, y0: this.on(H, -6.5, 4) - 1, y1: this.on(H, -6.5, 4) + 8 } }); this.cottage = cot;
    this.smokePos = new THREE.Vector3(-6.5, 0, 4).add(cot.userData.smoke.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.7)); this.smokePos.y += H.heightAt(-6.5, 4);
    this.updaters.push((dt, t) => { cot.userData.anemometer.rotation.y += dt * (1 + weather.force(this.smokePos).length() * 1.6); });
    // glowing lantern posts along the path
    const lp = [[-1.5, 7], [3, 4.5], [-9, -3], [5.5, -7.5], [10, 1]]; this.lamps = [];
    for (const [x, z] of lp) { const l = Props.lanternPost(2.6); this.place(l, H, x, z, Math.atan2(-x, -z) + 1.2, 1); this.lamps.push(l.userData.lamp); terrain.addCollider({ x, z, r: 0.2 }); }
    // stepping stones from cottage to bridge
    const sp = new Parts(); for (let i = 0; i < 12; i++) { const t = i / 11, x = lerp(-3.2, -11.3, t) + Math.sin(i * 2) * 0.3, z = lerp(5.8, -6.2, t) + Math.cos(i * 1.7) * 0.3, y = H.heightAt(x, z); if (y === -Infinity) continue;
      sp.add(new THREE.CylinderGeometry(0.55, 0.62, 0.14, 9), 0xa59cae, { p: [x, y, z], jitter: 0.3, s: [1 + Math.sin(i) * 0.2, 1, 1 + Math.cos(i) * 0.2] }); }
    scene.add(mesh(sp.merge(), vcMat({ roughness: 0.9 })));
    // bloom garden: standing stones + three Lanternblooms
    this.blooms = []; const bp = [[6.2, -1.2], [9.4, -3.2], [6.8, -6.2]];
    bp.forEach(([x, z], i) => { const parts = Flora.lanternbloom(); const b = new BloomPlant(parts, new THREE.Vector3(x, H.heightAt(x, z), z), i); b.group.rotation.y = i * 2; scene.add(b.group); b.pos.set(x, H.heightAt(x, z) + 1.2, z); b.radius = 1.4; weather.register(b); this.blooms.push(b); this.updaters.push((dt, t) => b.update(dt, t)); });
    const st = new Parts(); const r = rng(8); for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU, x = 7.8 + Math.cos(a) * 3.6, z = -3.5 + Math.sin(a) * 3.6, y = H.heightAt(x, z); if (y === -Infinity) continue; const hh = 1.1 + r() * 1.2; st.add(new THREE.BoxGeometry(0.7, hh, 0.45), 0xa59cae, { p: [x, y + hh / 2 - 0.1, z], r: [0.04, -a + r() * 0.2, 0.05], jitter: 0.25 }); terrain.addCollider({ x, z, r: 0.35 }); }
    scene.add(mesh(st.merge(), vcMat({ roughness: 0.95, flatShading: true })));
    // pond (freezable) with tiny rock island + glint
    this.pond = { x: -3, z: -8, r: 3.6, y: H.heightAt(-3, -8) - 0.05, frost: 0, mesh: new THREE.Mesh(new THREE.CircleGeometry(3.6, 36).rotateX(-Math.PI / 2), waterMaterial()), pos: new THREE.Vector3(-3, H.heightAt(-3, -8) + 0.1, -8), radius: 3.6 };
    this.pond.mesh.position.set(-3, this.pond.y + 0.12, -8); scene.add(this.pond.mesh);
    const pr = new Parts(); for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU, rr = 3.65 + r() * 0.3; pr.add(new THREE.DodecahedronGeometry(0.35 + r() * 0.3, 0), 0x8d8a96, { p: [-3 + Math.cos(a) * rr, this.pond.y + 0.1, -8 + Math.sin(a) * rr], s: [1, 0.7, 1], r: [r(), r(), r()], jitter: 0.3 }); }
    pr.add(new THREE.DodecahedronGeometry(0.9, 0), 0x8d8a96, { p: [-3, this.pond.y + 0.2, -8], s: [1, 0.55, 1], jitter: 0.2 }); scene.add(mesh(pr.merge(), vcMat({ roughness: 0.95, flatShading: true })));
    // pond depression: lower terrain disc? (we keep ground; water overlays a shallow dish)
    this.pondSurface = { enabled: false, heightAt: (x, z) => (Math.hypot(x - -3, z - -8) < 3.5 ? this.pond.y + 0.2 : -Infinity), isIce: true }; terrain.addSurface(this.pondSurface);
    terrain.addCollider({ x: -3, z: -8, r: 3.3, y0: -9, y1: 0.3, pond: true }); this.pondCollider = terrain.colliders[terrain.colliders.length - 1];
    this.glintPond = this.glint(-3, H.heightAt(-3, -8) + 1.2, -8, 'pond', 'Pond Glint');
    weather.register({ pos: new THREE.Vector3(-3, H.heightAt(-3, -8) + 0.3, -8), radius: 3.4, weather: (dt, w) => { this.pond.rain = w.rain; this.pond.frost = Math.max(0, Math.min(1, this.pond.frost + (w.frost > 0.2 ? dt * 0.45 * w.frost : 0) - (w.sun > 0.1 ? dt * 0.3 : -0) * 1 - dt * 0.01)); } });
    this.updaters.push((dt, t) => { const m = this.pond.mesh.material.uniforms; m.uFrost.value = this.pond.frost; m.uRain.value = THREE.MathUtils.damp(m.uRain.value, 0.15 + (this.pond.rain || 0) * 1.1, 3, dt); const ice = this.pond.frost > 0.92; this.pondSurface.enabled = ice; this.pondCollider.enabled = !ice; });
    // waterfall(s)
    const rf = new Props.RisingFall(scene, 11.2, H.heightAt(11.2, 5.5) + 0.3, 5.5, { height: 24, radius: 1.2, quality: q, seed: 3 }); this.risingFalls.push(rf); this.cloudRefill.push(rf.top); terrain.addCollider({ x: 11.2, z: 5.5, r: 3.9 }); this.rf1 = rf;
    // plants
    const pines = this.scatterTrees(H, 9, 21, avoid, [SETS.common(), SETS.birch(), Flora.cloudcapTree]);
    for (let i = 0; i < 12; i++) { const th = r() * TAU, rho = 4 + r() * 10, x = Math.cos(th) * rho, z = Math.sin(th) * rho, y = H.heightAt(x, z); if (y === -Infinity || H.nearEdge(x, z) > 0.9 || avoid.some((a) => (x - a[0]) ** 2 + (z - a[1]) ** 2 < (a[2] + 0.6) ** 2)) continue;
      const k = i % 4; const o = k === 0 ? Flora.spotMushroom(30 + i, 0.8 + r() * 0.7, [0xd8505a, 0xe89a3c, 0xb06ad8][i % 3]) : k === 1 ? Flora.crookFern(40 + i, 1) : k === 2 ? Flora.pillowMoss(50 + i, 1 + r()) : ROCK1(60 + i, 1 + r()); o.position.set(x, y - 0.03, z); o.rotation.y = r() * 6; this.scene.add(o); if (k !== 1) terrain.addCollider({ x, z, r: 0.5, y0: y - 1, y1: y + 3 }); }
    scene.add(Flora.scatterGrass(H, q, avoid.concat(terrain.colliders.map((c) => [c.x, c.z, c.r + 0.2])), { density: 7 }));
    // village-y details
    const bench = Props.bench(); this.place(bench, H, -1.2, 8.8, 3.3, 1); const bar = Props.wellBarrel(); this.place(bar, H, -9.4, 2, 0, 1.1, 0, 0.5); const bar2 = Props.wellBarrel(); this.place(bar2, H, -9.8, 3.2, 1, 0.9, 0, 0.4);
    const fence = Props.fenceRun(7); this.place(fence, H, 2.2, 10.5, -0.4, 1); const sign = Props.signpost(); this.place(sign, H, -11, -4.2, 0.9, 1, 0, 0.2);
    const wc = Props.windChimes(); wc.position.copy(this.cottage.position).add(new THREE.Vector3(0.6, 2.9, 0.0)).add(new THREE.Vector3(Math.sin(0.7), 0, Math.cos(0.7)).multiplyScalar(2.5)); scene.add(wc); this.chimes.push(wc);
    const ll = Props.laundryLine(new THREE.Vector3(-9.2, this.on(H, -9.2, 7, 2.6), 7), new THREE.Vector3(-3.4, this.on(H, -3.4, 10.5, 2.8), 10.5), 6); scene.add(ll);
    for (const [x, z] of [[-9.2, 7], [-3.4, 10.5]]) { const pole = mesh(new THREE.CylinderGeometry(0.06, 0.08, 3, 6), std({ color: 0x7a5a42 })); pole.position.set(x, this.on(H, x, z, 1.4), z); scene.add(pole); }
    this.laundry = ll;
    // sky mailbox, rain gauge
    const gp = new Parts(); gp.add(new THREE.CylinderGeometry(0.16, 0.16, 1.1, 10, 1, true), 0xcfe8f0, { p: [0, 0.55, 0] }); gp.add(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), 0x7a5a42, { p: [0, 0.2, 0] });
    const gauge = mesh(gp.merge(), vcMat({ roughness: 0.2, metalness: 0.2, side: THREE.DoubleSide })); this.place(gauge, H, -4.3, 2.0, 0, 1.2);
    this.glintCottage = this.glint(-9.6, H.heightAt(-9.6, 7.8) + 0.9, 7.8, 'cottage', 'Cottage Glint');
  }
  // ---------------------------------------------------------------- MEADOW
  buildMeadow() {
    const { B, scene, terrain, weather, q } = this; const r = rng(66); const avoid = [[-31, -18, 3], [-29.8, -26.5, 4.5], [-37, -21, 3.5], [-24.5, -14.4, 3]];
    this.mirror = new SunMirror(scene, new THREE.Vector3(-31, this.on(B, -31, -18), -18), weather, terrain); scene.add(this.mirror.group); this.mirror.yaw = 1.25; terrain.addCollider({ x: -31, z: -18, r: 1.1 });
    this.mirror.yawG.rotation.y = this.mirror.yaw; this.mirrors = [this.mirror]; this.ownRainbow = true; this.updaters.push((dt, t) => this.mirror.update(dt, t, this.sunDir, this.mirrorActive !== false));
    this.gate = new SunGate(new THREE.Vector3(-29.8, this.on(B, -29.8, -27.5), -27.5), 2.65, terrain); scene.add(this.gate.group); this.updaters.push((dt, t) => this.gate.update(dt, t));
    const gx = -29.8 + Math.sin(2.65) * -2.4, gz = -27.5 + Math.cos(2.65) * -2.4;
    this.ice = new IceBlock(new THREE.Vector3(gx + 0.2, this.on(B, gx, gz), gz), 1.15); scene.add(this.ice.group); this.ice.pos.set(gx, this.on(B, gx, gz) + 1.4, gz); weather.register(this.ice); terrain.addCollider({ x: gx, z: gz, r: 1.6 }); this.iceCollider = terrain.colliders[terrain.colliders.length - 1];
    this.updaters.push((dt, t) => this.ice.update(dt, t, weather)); this.sunTargets = [this.ice];
    // ruined statue of the first Weather Keeper
    const sp = new Parts(); sp.add(new THREE.CylinderGeometry(1.1, 1.3, 0.8, 8), 0xa59cae, { p: [0, 0.4, 0], jitter: 0.2 }); sp.add(new THREE.CylinderGeometry(0.5, 0.8, 2.2, 8), 0xb3aabb, { p: [0, 1.9, 0], jitter: 0.2 }); sp.add(new THREE.SphereGeometry(0.45, 12, 10), 0xb3aabb, { p: [0, 3.3, 0] });
    sp.add(new THREE.CylinderGeometry(0.13, 0.13, 1.5, 6), 0xb3aabb, { p: [0.6, 3.0, 0.4], r: [0.3, 0, -0.9] }); sp.add(new THREE.CylinderGeometry(0.4, 0.4, 0.7, 10, 1, true), 0x9fe8ff, { p: [1.3, 3.5, 0.9] }); sp.add(new THREE.SphereGeometry(0.5, 8, 6, 0, TAU, 0, 1.2), 0x7bc487, { p: [-0.3, 3.7, 0], s: [1.2, 0.6, 1.2] });
    const stat = mesh(sp.merge(), vcMat({ roughness: 0.95, flatShading: true })); this.place(stat, B, -38.5, -14, 0.8, 1, 0, 1.1);
    // fairy mushroom ring with hidden glint
    for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU, x = -39 + Math.cos(a) * 2.6, z = -25.5 + Math.sin(a) * 2.6; if (B.heightAt(x, z) === -Infinity) continue; const m = Flora.spotMushroom(80 + i, 0.55 + r() * 0.3, [0xb06ad8, 0xe86aa0][i % 2]); this.place(m, B, x, z, r() * 6); avoid.push([x, z, 0.7]); }
    this.glintRing = this.glint(-39, this.on(B, -39, -25.5, 0.9), -25.5, 'ring', 'Fairy Ring Glint');
    const lp = Props.lanternPost(2.4, 0x9fe8ff); this.place(lp, B, -24, -17.5, 2, 1); const lp2 = Props.lanternPost(2.4, 0x9fe8ff); this.place(lp2, B, -27, -12, 3, 1); this.lamps.push(lp.userData.lamp, lp2.userData.lamp);
    const sign = Props.signpost(); this.place(sign, B, -26.5, -23.8, -0.6, 1, 0, 0.2);
    const arch = Props.ruinArch(1); this.place(arch, B, -41, -19, 0.4, 1, 0, 0);
    const wc = Props.windChimes(); wc.position.set(-30.2, this.on(B, -30.2, -22.5, 3.4), -22.5); scene.add(wc); this.chimes.push(wc);
    this.scatterTrees(B, 8, 91, avoid, [Flora.cloudcapTree, SETS.willow(), SETS.birch('meadow')]);
    for (let i = 0; i < 10; i++) { const th = r() * TAU, rho = 3 + r() * 8, x = B.x + Math.cos(th) * rho, z = B.z + Math.sin(th) * rho, y = B.heightAt(x, z); if (y === -Infinity || B.nearEdge(x, z) > 0.88 || avoid.some((a) => (x - a[0]) ** 2 + (z - a[1]) ** 2 < (a[2] + 0.6) ** 2)) continue; const k = i % 3; const o = k === 0 ? Flora.crookFern(100 + i) : k === 1 ? Flora.pillowMoss(110 + i, 1.2) : ROCK1(120 + i, 1.3); o.position.set(x, y - 0.03, z); o.rotation.y = r() * 6; scene.add(o); if (k) terrain.addCollider({ x, z, r: 0.6 }); }
    scene.add(Flora.scatterGrass(B, q, avoid.concat(terrain.colliders.filter((c) => Math.hypot(c.x - B.x, c.z - B.z) < 14).map((c) => [c.x, c.z, c.r + 0.2])), { density: 8, a: 0x3c9a7c, b: 0x9ad28a, flowers: [0xffffff, 0x9fe8ff, 0xb59cff, 0xff9fd0] }));
    const rf = new Props.RisingFall(scene, -43, this.on(B, -43, -10) + 0.3, -10, { height: 18, radius: 0.9, quality: q, seed: 5 }); if (B.heightAt(-43, -10) === -Infinity) { rf.group.position.set(-41.5, B.heightAt(-41.5, -10) + 0.3, -10); } this.risingFalls.push(rf); this.cloudRefill.push(rf.top);
  }
  // ---------------------------------------------------------------- RISE (windmill)
  buildRise() {
    const { C, scene, terrain, weather, q } = this; const r = rng(77); const avoid = [[-16, -62, 4.5], [-6, -56, 3.2], [-10, -55, 5.5], [-4.5, -60, 3.5], [-20.2, -46.5, 3]];
    this.windmill = new Windmill(new THREE.Vector3(-16, this.on(C, -16, -62), -62), 0, terrain); scene.add(this.windmill.group); this.windmill.group.updateMatrixWorld(true);
    const hubW = this.windmill.hub.getWorldPosition(new THREE.Vector3()); this.hubReactive = { pos: hubW, radius: 4.8, weather: (dt, w) => this.windmill.weather(dt, w) }; weather.register(this.hubReactive);
    this.updaters.push((dt, t) => this.windmill.update(dt, t));
    this.plates = [new PressurePlate(new THREE.Vector3(-10, this.on(C, -10, -57.5), -57.5)), new PressurePlate(new THREE.Vector3(-6.2, this.on(C, -6.2, -53.8), -53.8))]; this.plates.forEach((p) => scene.add(p.group));
    this.crates = [[-17, -54], [-19.5, -55.5], [-18, -51.5]].map(([x, z], i) => { const c = new FeatherCrate(new THREE.Vector3(x, this.on(C, x, z), z), terrain, i, new THREE.Vector3(x, this.on(C, x, z), z)); scene.add(c.group); weather.register(c); return c; });
    this.updaters.push((dt, t) => { this.crates.forEach((c) => c.update(dt, t, this.game.player, this.crates)); this.plates.forEach((p) => p.update(dt, this.crates));
      // gentle magnetic assist: a slow crate that comes to rest near a rune plate settles onto it
      for (const c of this.crates) { if (c.frozen > 0.5) continue; for (const p of this.plates) { const dx = p.pos.x - c.pos.x, dz = p.pos.z - c.pos.z, d = Math.hypot(dx, dz); if (d < 1.7 && d > 0.05 && Math.hypot(c.vel.x, c.vel.z) < 2.2) { c.vel.x += (dx / d) * dt * 6; c.vel.z += (dz / d) * dt * 6; } } } });
    this.lift = new Lift(new THREE.Vector3(-4.5, this.on(C, -4.5, -60), -60), this.D.y + 0.35, terrain); scene.add(this.lift.group, this.lift.frame); terrain.addSurface(this.lift.surface);
    // lift colliders (frame posts) kept away from the platform footprint
    this.updaters.push((dt) => { const p = this.game.player, L = this.lift; const riding = Math.hypot(p.pos.x - L.pos.x, p.pos.z - L.pos.z) < 2.3 && p.pos.y > L.group.position.y - 0.6 && p.pos.y < L.group.position.y + 1.5; L.update(dt, (this.liftCharge ?? 0) >= 0.995, riding, this.liftCharge ?? 0); });
    const fl = Props.laundryLine(new THREE.Vector3(-22, this.on(C, -22, -52, 3.2), -52), new THREE.Vector3(-22, this.on(C, -22, -58, 3.6), -58), 5); scene.add(fl);
    for (const [x, z] of [[-22, -52], [-22, -58]]) { const pole = mesh(new THREE.CylinderGeometry(0.06, 0.08, 4, 6), std({ color: 0x7a5a42 })); pole.position.set(x, this.on(C, x, z, 1.9), z); scene.add(pole); }
    // kites / flags on poles
    for (const [x, z, col] of [[-8, -49, 0xe86a5a], [-12, -66, 0x4aa8a0], [-1.5, -54, 0xe8b23a]]) { const pole = mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.5, 6), std({ color: 0x7a5a42 })); this.place(pole, C, x, z, 0, 1, 1.75, 0.2);
      const fg = new THREE.PlaneGeometry(1.4, 0.8, 8, 4); fg.translate(0.7, 0, 0); const fm = std({ color: col, side: THREE.DoubleSide, map: Tex_cloth() }, { sway: 1.4, amp: 1.5 }); const f = new THREE.Mesh(fg, fm); f.position.set(x, this.on(C, x, z, 3.0), z); f.castShadow = true; scene.add(f); }
    for (let i = 0; i < 3; i++) { const wc = Props.windChimes(); const x = -12 + i * 4.5, z = -49.5; wc.position.set(x, this.on(C, x, z, 3.8), z); scene.add(wc); this.chimes.push(wc); const po = mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.9, 6), std({ color: 0x7a5a42 })); this.place(po, C, x, z, 0, 1, 1.9, 0.2); }
    const sign = Props.signpost(); this.place(sign, C, -19, -48.8, 0.5, 1, 0, 0.2); const l1 = Props.lanternPost(2.6, 0xffc46a); this.place(l1, C, -22.5, -47, 1.5, 1); this.lamps.push(l1.userData.lamp);
    this.glintRise = this.glint(-26, this.on(C, -26, -60, 1.0), -60, 'rise', 'Cliff Glint');
    this.scatterTrees(C, 7, 111, avoid, [SETS.pine(), SETS.common()]);
    for (let i = 0; i < 12; i++) { const th = r() * TAU, rho = 3 + r() * 10, x = C.x + Math.cos(th) * rho, z = C.z + Math.sin(th) * rho, y = C.heightAt(x, z); if (y === -Infinity || C.nearEdge(x, z) > 0.88 || avoid.some((a) => (x - a[0]) ** 2 + (z - a[1]) ** 2 < (a[2] + 0.6) ** 2)) continue; const k = i % 3; const o = k === 0 ? Flora.crookFern(140 + i) : k === 1 ? Flora.spotMushroom(150 + i, 0.8, 0xe89a3c) : ROCK1(160 + i, 1.4); o.position.set(x, y - 0.03, z); o.rotation.y = r() * 6; scene.add(o); if (k) terrain.addCollider({ x, z, r: 0.55 }); }
    scene.add(Flora.scatterGrass(C, q, avoid.concat(terrain.colliders.filter((c) => Math.hypot(c.x - C.x, c.z - C.z) < 15).map((c) => [c.x, c.z, c.r + 0.2])), { density: 7, a: 0x9aa84a, b: 0xe4cf6a, flowers: [0xff8a5a, 0xffd05a, 0xffffff] }));
  }
  // ---------------------------------------------------------------- SUMMIT
  buildSummit() {
    const { D, scene, terrain, weather, q } = this; const r = rng(88);
    const jp = new THREE.Vector3(26, this.on(D, 26, -62), -62); this.jarPos = jp.clone();
    const dp = new Parts(); dp.add(new THREE.CylinderGeometry(4.2, 4.6, 0.6, 24), 0xa59cae, { p: [0, 0.3, 0], jitter: 0.15 }); dp.add(new THREE.CylinderGeometry(3.4, 3.7, 0.5, 24), 0xb3aabb, { p: [0, 0.8, 0], jitter: 0.15 });
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; dp.add(new THREE.BoxGeometry(0.5, 2.0, 0.5), 0xb3aabb, { p: [Math.cos(a) * 3.9, 1.5, Math.sin(a) * 3.9], jitter: 0.2 }); dp.add(new THREE.SphereGeometry(0.26, 8, 6), 0xff9a4a, { p: [Math.cos(a) * 3.9, 2.7, Math.sin(a) * 3.9] }); }
    const dais = mesh(dp.merge(), vcMat({ roughness: 0.9, flatShading: true })); dais.position.copy(jp); scene.add(dais);
    this.daisSurface = { enabled: true, heightAt: (x, z) => (Math.hypot(x - jp.x, z - jp.z) < 3.3 ? jp.y + 1.05 : Math.hypot(x - jp.x, z - jp.z) < 4.5 ? jp.y + 0.6 : -Infinity) }; terrain.addSurface(this.daisSurface);
    // glass jar
    const jg = new THREE.Group(); jg.position.set(jp.x, jp.y + 1.05, jp.z); scene.add(jg); this.jar = jg;
    const glass = new THREE.MeshStandardMaterial({ color: 0xcfeeff, transparent: true, opacity: 0.22, roughness: 0.04, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false, emissive: 0x6aa8c8, emissiveIntensity: 0.12 });
    const jm = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [1.5, 0.05], [1.75, 0.6], [1.8, 2.2], [1.55, 3.4], [1.0, 3.9], [0.85, 4.2]].map((p) => new THREE.Vector2(p[0], p[1])), 28), glass); jm.renderOrder = 4; jg.add(jm);
    const brass = std({ color: 0xc6a05a, metalness: 0.9, roughness: 0.3 }); const base = mesh(new THREE.CylinderGeometry(1.8, 2.0, 0.4, 24), brass); base.position.y = 0.0; jg.add(base);
    this.lid = new THREE.Group(); this.lid.position.y = 4.2; jg.add(this.lid); this.lid.add(mesh(new THREE.CylinderGeometry(1.0, 0.9, 0.5, 20), brass)); const kn = mesh(new THREE.SphereGeometry(0.28, 10, 8), brass); kn.position.y = 0.45; this.lid.add(kn);
    for (let i = 0; i < 3; i++) { const a = i * 2.09; const cl = mesh(new THREE.TorusGeometry(1.6, 0.06, 6, 24, Math.PI * 0.5), brass); cl.rotation.set(Math.PI / 2, 0, a); cl.position.y = 2.0 + i * 0.5; jg.add(cl); }
    this.seals = []; for (let i = 0; i < 3; i++) { const a = i * 2.09 + 0.6; const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), new THREE.MeshStandardMaterial({ color: 0x555060, emissive: 0xff5a3a, emissiveIntensity: 0.1 })); s.position.set(Math.cos(a) * 1.95, 1.4, Math.sin(a) * 1.95); jg.add(s); this.seals.push(s); }
    this.sunny = new Sunny(); this.sunny.group.position.set(0, 2.2, 0); jg.add(this.sunny.group); this.updaters.push((dt, t) => { this.sunny.update(dt, t); if (!this.sunnyFree) this.sunny.group.position.y = 2.1 + Math.sin(t * 1.6) * 0.15; });
    terrain.addCollider({ x: jp.x, z: jp.z, r: 2.2, y0: jp.y - 1, y1: jp.y + 6, cam: { r: 1.9, y0: jp.y, y1: jp.y + 6 } });
    // pipes draining stolen weather off the island
    const pp = new Parts(); for (const a of [0.6, 2.5, 4.4]) pp.add(tube([[Math.cos(a) * 1.9, 0.3, Math.sin(a) * 1.9], [Math.cos(a) * 4, 0.2, Math.sin(a) * 4], [Math.cos(a) * 8, -0.6, Math.sin(a) * 8], [Math.cos(a) * 11.5, -1.5, Math.sin(a) * 11.5]], 0.22, 16, 8), 0x7a7480, { jitter: 0.2 });
    const pipes = mesh(pp.merge(), vcMat({ metalness: 0.6, roughness: 0.4 })); pipes.position.copy(jp); scene.add(pipes);
    // seats, banners, lamps
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.5, x = jp.x + Math.cos(a) * 7.5, z = jp.z + Math.sin(a) * 7.5; if (D.heightAt(x, z) === -Infinity || D.nearEdge(x, z) > 0.85) continue; const b = Props.bench(); this.place(b, D, x, z, -a + Math.PI / 2, 1.1, 0, 0.7); }
    const lp = Props.lanternPost(2.6, 0xffd58a); this.place(lp, D, 17.8, -59.5, 1.2, 1); this.lamps.push(lp.userData.lamp);
    const rf = new Props.RisingFall(scene, 33, this.on(D, 33, -66) + 0.3, -66, { height: 36, radius: 2.0, quality: q, seed: 9 }); this.risingFalls.push(rf); this.cloudRefill.push(rf.top); terrain.addCollider({ x: 33, z: -66, r: 5.6 }); this.rfSummit = rf;
    this.scatterTrees(D, 5, 131, [[jp.x, jp.z, 6.5], [33, -66, 6.5], [17, -62, 3]], [Flora.cloudcapTree, SETS.common()]);
    scene.add(Flora.scatterGrass(D, q, [[jp.x, jp.z, 5], [33, -66, 6]].concat(terrain.colliders.filter((c) => Math.hypot(c.x - D.x, c.z - D.z) < 12).map((c) => [c.x, c.z, c.r + 0.2])), { density: 7, a: 0x56a58c, b: 0xb4e0a0 }));
  }
  // ---------------------------------------------------------------- BRIDGES
  buildBridges() {
    const { H, B, C, D, terrain } = this;
    const a1 = this.edge(H, B.x, B.z), b1 = this.edge(B, H.x, H.z); this.bridge1 = this.makeBridge(a1, b1, { grow: true }); terrain.addSurface(this.bridge1.surface);
    const a2 = this.edge(B, C.x, C.z), b2 = this.edge(C, B.x, B.z); this.bridge2 = this.makeBridge(a2, b2, { width: 2.4, sag: 1.0 }); terrain.addSurface(this.bridge2.surface);
    const a3 = new THREE.Vector3(-2.2, this.D.y + 0.3, -60.4), b3 = this.edge(D, -20, -61); b3.y = D.y + 0.3; this.bridge3 = this.makeBridge(a3, b3, { width: 2.4, sag: 0.9 }); terrain.addSurface(this.bridge3.surface);
    this.bridgeA1 = a1; this.bridgeB1 = b1;
    // growing animation for bridge 1 (planks appear one by one)
    this.bridgeGrow = { t: 0, on: false };
    // decorative far bridge between background islands
    const fa = new THREE.Vector3(-70, 5, -90), fb = new THREE.Vector3(-40, 12, -112); const fbg = this.makeBridge(fa, fb, { width: 2, sag: 3 }); fbg.surface.enabled = false;
    this.updaters.push((dt, t) => {
      const bg = this.bridgeGrow; if (bg.on && bg.t < 1) { bg.t = Math.min(1, bg.t + dt / 3.2); const b = this.bridge1, nn = Math.floor(bg.t * b.n); const m4 = new THREE.Matrix4(), s = new THREE.Vector3(); for (let k = 0; k < b.n; k++) { b.planks.getMatrixAt(k, m4); const pos = new THREE.Vector3(), qq = new THREE.Quaternion(); m4.decompose(pos, qq, s); const sc = k < nn ? Math.min(1, (bg.t * b.n - k) * 1) : 0; s.setScalar(Math.max(0.0001, k < nn ? 1 : sc)); m4.compose(pos, qq, s); b.planks.setMatrixAt(k, m4); } b.planks.instanceMatrix.needsUpdate = true; if (bg.t >= 1) b.surface.enabled = true; }
    });
  }
  growBridge1() { const b = this.bridge1; b.group.visible = true; const m4 = new THREE.Matrix4(), s = new THREE.Vector3(), pos = new THREE.Vector3(), qq = new THREE.Quaternion(); for (let k = 0; k < b.n; k++) { b.planks.getMatrixAt(k, m4); m4.decompose(pos, qq, s); m4.compose(pos, qq, s.setScalar(0.0001)); b.planks.setMatrixAt(k, m4); } b.planks.instanceMatrix.needsUpdate = true; this.bridgeGrow.on = true; }
  // ---------------------------------------------------------------- CLOUDS & CREATURES
  buildClouds() {
    const { scene, weather, q } = this; const mk = (o) => weather.addCloud(new Cloud({ ...o, scene, quality: q }));
    this.fenCloud = mk({ id: 'fen', name: 'Drizzle', pos: new THREE.Vector3(0, 4, 8), size: 1.0, seed: 3, personal: true });
    this.fenCloud.face.set('sad'); this.fenCloud.drift.set(0, 0, 0);
    this.gertrude = mk({ id: 'gertrude', name: 'Gertrude', pos: new THREE.Vector3(-31, 11.2, -23), size: 1.5, seed: 17 }); this.gertrude.face.set('smug'); this.gertrude.drift.set(0, 0, 0); this.gertrude.stubborn = true; this.gertrude.home = this.gertrude.pos.clone();
    this.nimbus = mk({ id: 'nimbus', name: 'Mr. Nimbus', pos: new THREE.Vector3(8, 10, -4), size: 1.2, seed: 29 }); this.nimbus.face.set('neutral'); this.nimbus.drift.set(0.12, 0, -0.06);
    this.cirra = mk({ id: 'cirra', name: 'Cirra', pos: new THREE.Vector3(-17, 21, -52), size: 1.1, seed: 41 }); this.cirra.face.set('happy'); this.cirra.drift.set(-0.1, 0, 0.1);
    this.cumulo = mk({ id: 'cumulo', name: 'Cumulo', pos: new THREE.Vector3(24, 30, -60), size: 1.6, seed: 53 }); this.cumulo.face.set('sleepy'); this.cumulo.drift.set(0.05, 0, 0.02);
    // Puffkins
    const pk = [[3, 6], [-1, -2], [6, 1], [-31, -12], [-27, -21], [-9, -52]];
    pk.forEach(([x, z], i) => { const isl = this.islands.find((s) => s.heightAt(x, z) !== -Infinity); if (!isl) return; const p = new Puffkin(new THREE.Vector3(x, isl.heightAt(x, z), z), 200 + i, this.terrain); this.scene.add(p.group); this.weather.register(p); this.puffkins.push(p); this.updaters.push((dt, t) => p.update(dt, t, this.game.player, this.game.fen)); });
  }
  /** CC0 nature clutter, lilypads and wildlife */
  buildNature() {
    const { scene, terrain, weather } = this; const av = (i, extra) => terrain.colliders.filter((c) => Math.hypot(c.x - i.x, c.z - i.z) < i.r + 2).map((c) => [c.x, c.z, c.r + 0.4]).concat(extra);
    Flora.scatterClutter(scene, terrain, this.H, 16, 501, av(this.H, [[-6, 4, 4], [7.5, -3, 4.2], [-3, -8, 4.5], [0, 8, 3], [3, 8, 2], [-11, -6, 2.5]]), [SETS.bush(), SETS.flowers(), SETS.stump(), SETS.flowers()], { collide: false });
    Flora.scatterClutter(scene, terrain, this.B, 12, 502, av(this.B, [[-31, -18, 3], [-29.8, -26.5, 5], [-24.5, -14.4, 3]]), [SETS.bush('meadow'), SETS.flowers('meadow'), SETS.stump()], { collide: false });
    Flora.scatterClutter(scene, terrain, this.C, 10, 503, av(this.C, [[-16, -62, 4.5], [-6, -56, 3.2], [-10, -55, 5.5], [-4.5, -60, 3.5], [-8, -53, 5], [-18, -53, 4]]), [SETS.bush(), SETS.stump(), SETS.flowers()], { collide: false });
    Flora.scatterClutter(scene, terrain, this.D, 6, 504, av(this.D, [[26, -62, 6.5], [33, -66, 6.5], [17, -62, 3]]), [SETS.bush(), SETS.flowers()], { collide: false });
    if (Assets.has('Lilypad')) for (let i = 0; i < 5; i++) { const a = i * 1.3 + 0.4, rr = 1.5 + (i % 2) * 1.2; const l = Assets.mesh('Lilypad', 'soft', 0.25); l.position.set(-3 + Math.cos(a) * rr, this.pond.y + 0.14, -8 + Math.sin(a) * rr); l.rotation.y = a * 2; l.scale.multiplyScalar(2.2); scene.add(l); }
    this.wild = [];
    for (const [name, x, z, h, roam] of [['Fox', 6, 9, 0.75, 4], ['Deer', -37, -24, 1.7, 5], ['Fox', -12, -66, 0.75, 4]]) { const w = new Wildlife(scene, terrain, name, x, z, { height: h, roam }); if (!w.ok) continue; this.wild.push(w); weather.register({ get pos() { return w.pos; }, radius: 0.8, weather: (dt, ww) => w.weather(dt, ww) }); this.updaters.push((dt) => w.update(dt, this.game.player)); }
  }
  refillAt(pos) { let r = 0; for (const t of this.cloudRefill) { const d = Math.hypot(pos.x - t.x, pos.z - t.z, (pos.y - t.y) * 0.5); if (d < 9) r = Math.max(r, (1 - d / 9) * 0.5); } return r; }
  update(dt, t) {
    for (const u of this.updaters) u(dt, t);
    for (const f of this.risingFalls) f.update(dt);
    for (const g of this.glints) if (!g.got) { g.group.rotation.y += dt * 1.2; g.group.position.y = g.pos.y + Math.sin(t * 2 + g.pos.x) * 0.1; g.group.scale.setScalar(1 + Math.sin(t * 4) * 0.08); }
    for (const c of this.chimes) { const f = this.weather.force(c.position, 1); c.userData.tubes.forEach((p, i) => { p.rotation.z = Math.sin(t * (1.6 + i * 0.2) + i) * 0.1 + f.x * 0.06 * Math.sin(t * 6 + i); p.rotation.x = Math.cos(t * (1.3 + i * 0.3)) * 0.1 + f.z * 0.06; }); }
    if (this.smokePos && Math.random() < dt * 6) { this.weather.smoke.spawn(this.smokePos, new THREE.Vector3(0.3 + Math.random() * 0.2, 0.9, 0.05), { life: 3.2, size: 0.7, grow: 2.2, drag: 0.4 }); }
  }
}
import { Tex } from '../gfx/Textures.js';
const Tex_cloth = () => Tex.cloth(); const Tex_wood = () => Tex.wood();
