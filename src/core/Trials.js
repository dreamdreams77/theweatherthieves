import * as THREE from 'three';
import { Progress } from './Progress.js';
import { std } from '../gfx/Mat.js';
import { rng, TAU, damp } from './Utils.js';

/** Weather Trials: a replayable, timed challenge in every chapter. Each target answers to one kind of weather. */
export const TRIALS = {
  1: { name: 'Bloom Rush', intro: 'Wake four sleepy seed-pods with rain and spin two pinwheels with wind — fast!', targets: { rain: 4, wind: 2 }, medals: [70, 110, 170] },
  2: { name: 'Pinwheel Parade', intro: 'The village pinwheels have stopped. Gust four of them back to life and water two planters.', targets: { wind: 4, rain: 2 }, medals: [65, 100, 160] },
  3: { name: 'Freeze Frame', intro: 'Freeze four puddle-bubbles with Frost and cap two snow-cairns with snowfall.', targets: { frost: 4, snow: 2 }, medals: [80, 125, 190] },
  4: { name: 'Spark Chase', intro: 'Cool three overheating valves with Frost and spin three fans with Wind before the factory sulks.', targets: { wind: 3, frost: 3 }, medals: [70, 110, 170] },
};
const LOOK = { rain: [0x7fc8ff, 'Rain (2) on the seed-pod'], wind: [0xc9f0e0, 'Wind (3) at the pinwheel'], frost: [0xaee4ff, 'Frost (5) on the bubble'], snow: [0xffffff, 'Carry a cloud, hold Frost: snow on the cairn'] };
const MEDAL = ['gold', 'silver', 'bronze'];
const MEDAL_COL = { gold: 0xffd24a, silver: 0xdfe6f0, bronze: 0xd08a4a };

class Target {
  constructor(scene, type, pos) {
    this.type = type; this.pos = pos.clone().add(new THREE.Vector3(0, 0.9, 0)); this.radius = 1.0; this.p = 0; this.done = false; const col = LOOK[type][0];
    this.g = new THREE.Group(); this.g.position.copy(pos); scene.add(this.g);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.35, 12), std({ color: 0x9a94a6, roughness: 0.9 })); base.position.y = 0.17; base.castShadow = true; this.g.add(base);
    this.icon = new THREE.Group(); this.icon.position.y = 1.0; this.g.add(this.icon); const m = std({ color: col, emissive: col, emissiveIntensity: 0.35, roughness: 0.4 });
    if (type === 'wind') { for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.7, 3), m); b.position.set(Math.cos(i * 1.57) * 0.32, Math.sin(i * 1.57) * 0.32, 0); b.rotation.z = i * 1.57 - Math.PI / 2; this.icon.add(b); } const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 6), std({ color: 0x7a5a42 })); pole.position.y = 0.5; this.g.add(pole); }
    else if (type === 'rain') { const pod = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12), m); pod.scale.set(1, 1.25, 1); this.icon.add(pod); this.pod = pod; }
    else if (type === 'frost') { const b = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 14), new THREE.MeshStandardMaterial({ color: 0x7fd0f0, transparent: true, opacity: 0.6, roughness: 0.05, emissive: 0x3a90c0, emissiveIntensity: 0.3 })); this.icon.add(b); this.bub = b; }
    else { for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38 - i * 0.08, 0), std({ color: 0x9a94a6, roughness: 0.9, flatShading: true })); s.position.y = -0.3 + i * 0.4; this.icon.add(s); } this.cap = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 8, 0, TAU, 0, Math.PI / 2), std({ color: 0xffffff, roughness: 0.9 })); this.cap.position.y = 0.55; this.cap.scale.setScalar(0.01); this.icon.add(this.cap); }
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.06, 6, 40), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.8 })); this.ring.rotation.x = Math.PI / 2; this.ring.position.y = 0.38; this.g.add(this.ring);
    this.beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 14, 6, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false })); this.beacon.position.y = 7; this.g.add(this.beacon);
  }
  weather(dt, w) {
    if (this.done) return; const gust = w.wind.clone().sub(w.breeze).length();
    const hit = this.type === 'rain' ? w.rain > 0.3 : this.type === 'wind' ? gust > 3 : this.type === 'frost' ? w.frost > 0.2 : (w.snow || 0) > 0.2;
    this.p = Math.max(0, Math.min(1, this.p + (hit ? dt / 1.4 : -dt * 0.15)));
  }
  update(dt, t) {
    const p = this.p; this.ring.scale.setScalar(0.4 + 0.6 * p); this.ring.material.opacity = this.done ? 0 : 0.5 + 0.4 * Math.sin(t * 5); this.beacon.visible = !this.done;
    if (this.type === 'wind') this.icon.rotation.z += dt * (0.3 + p * 14 + (this.done ? 6 : 0));
    if (this.type === 'rain' && this.pod) { this.pod.scale.set(1 + p * 0.5, 1.25 + p * 0.4, 1 + p * 0.5); this.pod.material.emissiveIntensity = 0.35 + p * 1.5; }
    if (this.type === 'frost' && this.bub) { this.bub.material.color.setHex(p > 0.5 ? 0xe8f8ff : 0x7fd0f0); this.bub.material.roughness = 0.05 + p * 0.3; this.bub.scale.setScalar(1 + p * 0.15); }
    if (this.type === 'snow' && this.cap) this.cap.scale.setScalar(Math.max(0.01, p));
    this.icon.position.y = 1.0 + Math.sin(t * 2 + this.pos.x) * 0.06;
  }
  dispose(scene) { scene.remove(this.g); this.g.traverse((o) => { o.geometry?.dispose(); }); }
}

export class Trials {
  constructor(game) { this.game = game; this.active = null; this.stone = null; this.hud = document.getElementById('trialHud'); }
  best(n) { return (Progress.data.trials || {})[n]; }
  medalFor(n, time) { const m = TRIALS[n].medals; return time <= m[0] ? 'gold' : time <= m[1] ? 'silver' : time <= m[2] ? 'bronze' : null; }
  /** place this chapter's trial stone near the spawn */
  setup() {
    const g = this.game; this.cancel(true); if (this.stone) { g.scene.remove(this.stone); this.stone = null; }
    const sp = g.world.spawn || [3, 8], n = g.chapterNo; if (!TRIALS[n]) return; let x = sp[0] + 4, z = sp[1] - 3; for (let i = 0; i < 16; i++) { const y = g.terrain.groundAt(x, z, 200); if (y && !g.terrain.colliders.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + 1.2)) break; x = sp[0] + Math.cos(i) * (3 + i * 0.4); z = sp[1] + Math.sin(i) * (3 + i * 0.4); }
    const y = g.terrain.groundAt(x, z, 200)?.y ?? 0; const s = new THREE.Group(); s.position.set(x, y, z);
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8, 0), std({ color: 0xa59cae, roughness: 0.9, flatShading: true })); rock.scale.set(0.8, 1.6, 0.6); rock.position.y = 1.1; rock.castShadow = true; s.add(rock);
    this.gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x9fe8ff, emissiveIntensity: 1.2 })); this.gem.position.y = 2.75; s.add(this.gem);
    g.scene.add(s); this.stone = s; this.stonePos = new THREE.Vector3(x, y, z); g.terrain.addCollider({ x, z, r: 0.7 }); this.paintGem();
  }
  paintGem() { const b = this.best(this.game.chapterNo); const c = b?.medal ? MEDAL_COL[b.medal] : 0x9fe8ff; this.gem.material.color.setHex(c); this.gem.material.emissive.setHex(c); }
  near() { const p = this.game.player.pos; return this.stonePos && Math.hypot(p.x - this.stonePos.x, p.z - this.stonePos.z) < 3; }
  interact() {
    if (!this.near()) return false; const g = this.game, n = g.chapterNo, T = TRIALS[n];
    if (this.active) { this.cancel(); g.ui.toast('Trial cancelled.'); return true; }
    const b = this.best(n); g.dialogue([{ who: 'fen', ex: 'gloom', text: `The ${T.name}. ${T.intro}${b ? ` Your best: ${b.time.toFixed(1)} s (${b.medal || 'no medal'}).` : ''} Gold under ${T.medals[0]} seconds. ...I will time you. Grudgingly.` }], { shot: false, onEnd: () => this.start() }); return true;
  }
  start() {
    const g = this.game, n = g.chapterNo, T = TRIALS[n], r = rng((Date.now() & 0xffff) + n), targets = []; const c = this.stonePos;
    for (const [type, cnt] of Object.entries(T.targets)) for (let k = 0; k < cnt; k++) { let pos = null; for (let tries = 0; tries < 80 && !pos; tries++) { const a = r() * TAU, d = 7 + r() * 14, x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d, gr = g.terrain.groundAt(x, z, c.y + 8, 30); if (!gr || Math.abs(gr.y - c.y) > 6) continue; if (g.terrain.colliders.some((cc) => cc.enabled !== false && Math.hypot(cc.x - x, cc.z - z) < cc.r + 1.2)) continue; if (targets.some((t) => t.pos.distanceTo(new THREE.Vector3(x, gr.y + 0.9, z)) < 4)) continue; pos = new THREE.Vector3(x, gr.y, z); } if (pos) targets.push(new Target(g.scene, type, pos)); }
    for (const t of targets) { t.reg = { pos: t.pos, radius: 1.0, weather: (dt, w) => t.weather(dt, w) }; g.weather.register(t.reg); }
    this.active = { n, targets, t: 0, count: 3 }; g.audio.sfx('tool'); this.showHud(true);
  }
  cancel(silent) { const a = this.active; if (!a) return; for (const t of a.targets) { this.game.weather.unregister(t.reg); t.dispose(this.game.scene); } this.active = null; this.showHud(false); }
  showHud(on) { this.hud ??= document.getElementById('trialHud'); this.hud?.classList.toggle('show', on); }
  update(dt, t) {
    if (this.gem) { this.gem.rotation.y += dt * 1.4; this.gem.position.y = 2.75 + Math.sin(t * 2) * 0.08; }
    const a = this.active; if (!a) return; const g = this.game;
    if (a.count > 0) { const before = Math.ceil(a.count); a.count -= dt; if (Math.ceil(a.count) !== before && a.count > 0) g.audio.tone(660, 0.12, 0.06); if (a.count <= 0) g.audio.tone(990, 0.3, 0.08); }
    else a.t += dt;
    let left = 0; for (const tg of a.targets) { tg.update(dt, t); if (!tg.done && tg.p >= 1 && a.count <= 0) { tg.done = true; g.weather.burst(tg.pos.clone().add(new THREE.Vector3(0, 0.6, 0)), LOOK[tg.type][0], 20, 3, 1.2); g.audio.sfx('glint'); } if (!tg.done) left++; }
    if (this.hud) this.hud.innerHTML = a.count > 0 ? `<b>${TRIALS[a.n].name}</b><span class="big">${Math.ceil(a.count)}</span>` : `<b>${TRIALS[a.n].name}</b><span class="big">${a.t.toFixed(1)}s</span><span>${a.targets.length - left} / ${a.targets.length}</span><small>${[...new Set(a.targets.filter((x) => !x.done).map((x) => LOOK[x.type][1]))].join(' · ')}</small>`;
    if (left === 0 && a.count <= 0) this.finish();
    if (Math.hypot(g.player.pos.x - this.stonePos.x, g.player.pos.z - this.stonePos.z) > 60) { this.cancel(); g.ui.toast('You wandered too far — trial cancelled.'); }
  }
  finish() {
    const g = this.game, a = this.active, time = a.t, medal = this.medalFor(a.n, time), prev = this.best(a.n); this.cancel(true);
    const better = !prev || time < prev.time; if (better) { (Progress.data.trials ??= {})[a.n] = { time: +time.toFixed(2), medal: medal || prev?.medal || null }; if (prev?.medal && medal && MEDAL.indexOf(prev.medal) < MEDAL.indexOf(medal)) Progress.data.trials[a.n].medal = prev.medal; Progress.save(); }
    g.audio.sfx(medal ? 'finale' : 'bloom'); this.paintGem(); this.lastResult = { time, medal };
    const line = medal === 'gold' ? 'Gold. Hm. I suppose that was... impressive. Do not let it go to your head.' : medal === 'silver' ? 'Silver. Very respectable. Gold is just silver that tried harder.' : medal === 'bronze' ? 'Bronze! The colour of autumn and modest achievement.' : 'Finished! Next time, less sightseeing.';
    g.ui.toast(`${TRIALS[a.n].name}: ${time.toFixed(1)} s — ${medal ? medal.toUpperCase() + ' medal' : 'no medal yet'}${better && prev ? ' (new best!)' : ''}`, 7000); g.say.fen(line, 4500);
  }
}
