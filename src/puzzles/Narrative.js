import * as THREE from 'three';
import * as S from '../ui/story.js';
import { clamp, damp, lerp, TAU } from '../core/Utils.js';
import { Progress } from '../core/Progress.js';

const pick = (a) => a[(Math.random() * a.length) | 0];
const SAVE_KEY = 'weather-thieves-save-v1';

class Rainbow {
  constructor(scene) {
    const bands = [0xff4d4d, 0xff944d, 0xffe14d, 0x6fd96f, 0x4db8ff, 0x6a6aff, 0xb36bff]; this.group = new THREE.Group(); this.mats = [];
    bands.forEach((c, i) => { const m = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }); const t = new THREE.Mesh(new THREE.TorusGeometry(7 - i * 0.28, 0.16, 6, 56, Math.PI), m); this.group.add(t); this.mats.push(m); });
    this.group.visible = false; scene.add(this.group); this.k = 0; this.target = 0;
  }
  update(dt) { this.k = damp(this.k, this.target, 1.5, dt); this.group.visible = this.k > 0.01; this.mats.forEach((m) => (m.opacity = this.k * 0.5)); }
}

/** Story state machine, objectives, barks, hints, save/load and the finale. */
export class Narrative {
  constructor(game) {
    this.game = game; this.flags = { grabbed: false, bloom: 0, p1: false, visitedB: false, mirrorLit: false, melted: false, visitedC: false, platesFirst: false, plates: false, p3: false, visitedD: false, freed: false, rainbow: false, intro: false, windUsed: false };
    this.cool = {}; this.hintT = 0; this.step = 'cloud'; this.glints = new Set(); this.finale = null; this.rainbow = new Rainbow(game.scene); this.t = 0; this.noHint = false; this.prevStep = '';
  }
  cd(k, s) { const t = this.t; if ((this.cool[k] ?? -99) > t) return false; this.cool[k] = t + s; return true; }
  // ---------- wiring
  init() {
    const w = this.game.world, g = this.game;
    w.blooms.forEach((b) => (b.onBloom = () => this.onBloom(b)));
    w.ice.onMelt = () => this.onMelt();
    this.load();
  }
  say(lines, opts) { this.game.dialogue(lines, opts); }
  // ---------- events
  onBloom(b) {
    const g = this.game, f = this.flags; f.bloom++; g.audio.sfx('bloom'); g.weather.burst(b.pos, 0xffb0d0, 24, 3, 1.4);
    if (f.bloom === 1) this.say(S.BLOOM1, { noLock: true }); else if (f.bloom === 2) this.say(S.BLOOM2, { noLock: true });
    else if (f.bloom >= 3) { f.p1 = true; g.setRestore(0.2); const w = g.world; w.growBridge1(); g.shot({ pos: new THREE.Vector3(-8, 4, 4), look: w.bridgeA1.clone().lerp(w.bridgeB1, 0.35) }, 5.5); setTimeout(() => this.say(S.BRIDGE, { shot: false }), 1200); this.save(); }
  }
  onGrab(c) {
    const f = this.flags; if (c.id === 'fen' && !f.grabbed) { f.grabbed = true; this.game.fenHappy = false; this.say(S.GRAB_FIRST, { noLock: false }); }
  }
  onMelt() {
    const g = this.game, f = this.flags; f.melted = true; g.audio.sfx('melt'); g.world.gate.setOpen(1); g.world.iceCollider.enabled = false; g.setRestore(0.5); g.audio.sfx('unlock'); g.shot({ pos: g.world.gate.pos.clone().add(new THREE.Vector3(-7, 5, 5)), look: g.world.gate.pos.clone().add(new THREE.Vector3(0, 3, 0)) }, 5);
    setTimeout(() => this.say(S.MELTED, {}), 800); this.save();
  }
  onJar() {
    const f = this.flags, g = this.game, w = g.world; if (f.freed || this.finale) return;
    const d = Math.hypot(g.player.pos.x - w.jarPos.x, g.player.pos.z - w.jarPos.z); if (d > 9) { g.ui.toast('Walk up to the jar first.'); return; }
    if (!(f.p1 && f.melted && f.p3)) { g.ui.toast('The jar\'s three seals are still dark — finish the puzzles of this island chain first.'); return; }
    this.startFinale();
  }
  startFinale() {
    const g = this.game, w = g.world, f = this.flags; f.freed = true; g.state = 'cinematic'; g.cinematic = true; g.player.locked = true; g.tools.drop?.();
    const jp = w.jarPos.clone().add(new THREE.Vector3(0, 3, 0)); this.finale = { t: 0, phase: 0, lidV: new THREE.Vector3(0, 9, 0), jp };
    g.shot({ pos: jp.clone().add(new THREE.Vector3(-9, 2, 9)), look: jp.clone().add(new THREE.Vector3(0, 1, 0)) }, 60); g.ui.setObjective('...'); g.audio.sfx('pop');
    g.player.pos.set(w.jarPos.x - 4.2, w.jarPos.y + 0.6, w.jarPos.z + 2.6); g.player.yaw = Math.atan2(4.2, -2.6);
  }
  glintCollect(gl) {
    if (gl.got) return; gl.got = true; gl.group.visible = false; this.glints.add(gl.id); this.game.ui.setGlints(this.glints.size); this.game.audio.sfx('glint'); this.game.weather.burst(gl.pos, 0x9fe8ff, 20, 3, 1.2);
    this.game.ui.toast(S.MEMORIES[gl.id] || 'A tiny memory of weather.', 6000); Progress.addMemory(gl.id); this.game.ui.refreshMemories?.(); this.game.player.setExpr('love', 1.2); this.game.player.juno.play('cheer'); this.save();
  }
  // ---------- save/load
  save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ f: this.flags, g: [...this.glints] })); } catch {}
  }
  load() {
    let d = null; try { d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch {} if (!d) return; this.loaded = d;
    const g = this.game, w = g.world, f = this.flags; if (!d.f || typeof d.f !== 'object') d.f = {}; if (!Array.isArray(d.g)) d.g = []; Object.assign(f, d.f); f.freed = !!d.f.freed;
    if (f.p1) { w.blooms.forEach((b) => { b.water = 1; b.bloomed = true; b.bloom = 1; }); w.bridge1.group.visible = true; w.bridge1.surface.enabled = true; w.bridgeGrow.on = false; w.bridgeGrow.t = 1; g.setRestore(0.2, true); }
    if (f.melted) { w.ice.melt = 1; w.ice.frozen = false; w.gate.setOpen(1); w.gate.open = 1; w.iceCollider.enabled = false; g.setRestore(0.5, true); }
    if (f.p3) { w.windmill.charge = 1; w.windmill.braked = false; w.liftCharge = 1; }
    if (f.freed) { this.finishInstant(); }
    for (const id of d.g || []) { const gl = w.glints.find((x) => x.id === id); if (gl) { gl.got = true; gl.group.visible = false; this.glints.add(id); } }
    g.ui.setGlints(this.glints.size);
    const start = f.p3 ? w.D : f.melted ? w.C : f.p1 ? w.B : null; this.resumeIsland = start;
  }
  reset() { try { localStorage.removeItem(SAVE_KEY); } catch {} }
  finishInstant() { const g = this.game, w = g.world; w.sunnyFree = true; w.lid.position.y = 9; w.lid.visible = false; w.sunny.freed = 1; w.sunny.face.set('excited'); w.sunny.group.position.set(0, 6.5, 0); g.setRestore(1, true); g.fenHappy = true; w.seals.forEach((s) => (s.material.emissiveIntensity = 2)); }
  // ---------- per frame
  hintFor() { return S.HINTS[this.step] || S.OBJECTIVES[this.step]; }
  update(dt, t) {
    this.t = t; const g = this.game, w = g.world, f = this.flags, p = g.player; this.rainbow.update(dt);
    // island visits
    const here = g.terrain.islands.find((i) => i.heightAt(p.pos.x, p.pos.z) !== -Infinity);
    if (here && g.state === 'play') {
      if (here === w.B && !f.visitedB && f.p1) { f.visitedB = true; this.say(S.MEADOW, { noLock: false }); this.save(); g.audio.sfx('glint'); }
      if (here === w.C && !f.visitedC && f.melted) { f.visitedC = true; this.say(S.RISE); this.save(); }
      if (here === w.D && !f.visitedD) { f.visitedD = true; this.say(S.SUMMIT, { shot: true }); this.save(); }
    }
    if (f.visitedB && f.p1 && !f.visitedB) f.visitedB = true;
    // mirror
    if (!f.mirrorLit && w.mirror.lit > 0.7 && Math.hypot(p.pos.x - w.mirror.pos.x, p.pos.z - w.mirror.pos.z) < 22) { f.mirrorLit = true; this.say(S.MIRROR_LIT, { noLock: true }); }
    // Gertrude's reaction
    if (!f.melted && w.mirror.shaded === w.gertrude && this.cd('gshade', 40) && Math.hypot(p.pos.x - w.mirror.pos.x, p.pos.z - w.mirror.pos.z) < 14) g.ui.bark(() => w.gertrude.pos.clone().add(new THREE.Vector3(0, 1.5, 0)), 'Shade is my gift to the world, dear.', 3500, 'cloud');
    // plates
    const nOn = w.plates.filter((x) => x.on).length;
    if (nOn >= 1 && !f.platesFirst && f.melted) { f.platesFirst = true; g.audio.sfx('plate'); this.say(S.PLATES_FIRST, { noLock: true }); }
    if (nOn >= 2 && !f.plates) { f.plates = true; g.audio.sfx('plate'); w.windmill.setBrake(false); this.say(S.PLATES_BOTH, { noLock: true }); }
    if (f.plates && nOn < 2 && !f.p3 && !w.windmill.braked && w.windmill.charge < 0.02) { /* keep released once unlocked */ }
    w.liftCharge = f.p3 ? 1 : w.windmill.charge;
    if (!f.p3 && w.windmill.charge >= 0.995) { f.p3 = true; g.audio.sfx('unlock'); g.setRestore(0.7); this.say(S.LIFT, { noLock: true }); this.save(); }
    // seals
    w.seals.forEach((s, i) => { const on = i === 0 ? f.p1 : i === 1 ? f.melted : f.p3; s.material.emissiveIntensity = damp(s.material.emissiveIntensity, on ? 2.2 : 0.1, 3, dt); s.material.color.setHex(on ? 0xffc86a : 0x555060); });
    // glints
    for (const gl of w.glints) { if (gl.got) continue; const dx = p.pos.x - gl.pos.x, dz = p.pos.z - gl.pos.z, dy = p.pos.y + 0.8 - gl.pos.y; if (Math.hypot(dx, dz) < 1.7 && Math.abs(dy) < 2.4) this.glintCollect(gl); }
    // pond hint
    if (w.pond.frost > 0.9) g.combos?.discover('skate');
    // rainbow: rain column overlapping a sun beam
    let rb = false; for (const b of g.weather.beams) { if (b.power < 0.5) continue; for (const c of g.weather.clouds) { if (c.raining < 0.5) continue; const o = new THREE.Vector3(c.pos.x, 0, c.pos.z); { const tt = clamp(new THREE.Vector3().subVectors(c.pos, b.o).dot(b.d), 0, b.len), pt = b.o.clone().addScaledVector(b.d, tt); if (pt.y < c.pos.y && pt.y > c.pos.y - 14 && Math.hypot(pt.x - c.pos.x, pt.z - c.pos.z) < c.footprint) { rb = true; this.rainbowAt = pt.clone(); } } if (rb) break; } if (rb) break; }
    if (rb && !this.finale) { this.rainbow.target = 1; const rp = this.rainbowAt; this.rainbow.group.position.lerp(new THREE.Vector3(rp.x, rp.y - 2, rp.z), 0.2); this.rainbow.group.rotation.y = Math.atan2(g.camera.position.x - rp.x, g.camera.position.z - rp.z) + Math.PI / 2 * 0 ;
      if (!f.rainbow) { f.rainbow = true; g.ui.toast('Sunlight through falling rain — a rainbow! Weather combines.', 6500); g.audio.sfx('bloom'); const gl = w.glints.find((x) => x.id === 'rainbow') || w.glint(rp.x, rp.y + 0.6, rp.z, 'rainbow', 'Rainbow Glint'); gl.pos.set(rp.x, Math.max(g.terrain.topAt(rp.x, rp.z), rp.y) + 1.1, rp.z); } }
    else if (!this.finale) this.rainbow.target = 0;
    // step & objective
    let step = 'cloud'; if (f.grabbed) step = 'bloom'; if (f.p1) step = 'cross'; if (f.visitedB) step = 'melt'; if (f.melted) step = 'rise'; if (f.visitedC) step = 'plates'; if (f.plates) step = 'wind'; if (f.p3) step = 'lift'; if (f.visitedD) step = 'jar'; if (f.freed) step = 'done';
    if (step !== this.step) { this.step = step; this.hintT = 0; this.save(); }
    const sub = step === 'bloom' ? `${f.bloom} / 3 bloomed` : step === 'plates' ? `${nOn} / 2 plates` : step === 'wind' ? `Mill charge ${(w.windmill.charge * 100) | 0}%` : step === 'melt' ? `Ice ${(w.ice.melt * 100) | 0}% melted` : step === 'jar' ? 'Stand beside the jar and press F / tap USE on it' : '';
    g.ui.setObjective(S.OBJECTIVES[step], sub);
    // hints
    if (g.state === 'play' && S.HINTS[step]) { this.hintT += dt; if (this.hintT > 50) { this.hintT = -40; g.ui.toast(S.HINTS[step], 7000); } }
    if (this.finale) this.updateFinale(dt, t);
    // idle Fen chatter
    if (g.state === 'play' && this.cd('fenIdle', 55)) { const c = g.companion; if (Math.hypot(c.pos.x - p.pos.x, c.pos.z - p.pos.z) < 8) g.say.fen(pick(S.FEN_TALK)); }
  }
  updateFinale(dt, t) {
    const F = this.finale, g = this.game, w = g.world; F.t += dt;
    if (F.phase === 0 && F.t > 1.2) { F.phase = 1; w.lid.userData.v = new THREE.Vector3(1, 11, -2); w.sunnyFree = true; w.sunny.freed = 1; w.sunny.face.set('excited'); g.weather.burst(F.jp.clone().add(new THREE.Vector3(0, 1.2, 0)), 0xffe08a, 90, 9, 2.2); g.audio.sfx('finale'); g.shake(0.4); g.setRestore(1); g.fenHappy = true;
      g.shot({ pos: F.jp.clone().add(new THREE.Vector3(-11, 5, 10)), look: F.jp.clone().add(new THREE.Vector3(0, 4, 0)) }, 60); this.rainbow.target = 1; this.rainbow.group.position.copy(F.jp).add(new THREE.Vector3(8, -2, -4)); this.rainbow.group.rotation.y = 0.6;
      g.companion.pos.set(w.jarPos.x - 6, w.jarPos.y + 0.6, w.jarPos.z + 3); }
    if (F.phase >= 1) { const s = w.sunny; s.group.position.y = damp(s.group.position.y, 7.5, 1.4, dt); s.group.position.x = damp(s.group.position.x, 0, 2, dt); s.group.scale.setScalar(1 + Math.min(F.t, 4) * 0.35); w.lid.userData.v.y -= 20 * dt; w.lid.position.addScaledVector(w.lid.userData.v, dt); w.lid.rotation.x += dt * 4; }
    if (F.phase === 1 && F.t > 4.2) { F.phase = 2; this.say(S.FINALE, { noLock: false, onEnd: () => { F.phase = 3; g.cinematic = false; g.player.locked = false; g.state = 'play'; g.shot(null); this.save(); Progress.complete(1); g.ui.showEnd(`Sky Glints found: ${this.glints.size} / 5`, 1); this.finale = null; this.rainbow.target = 0.0; setTimeout(() => (this.rainbow.target = 1), 500); } }); }
  }
}

/** Barks - short floating one-liners from characters. */
export class Say {
  constructor(game) { this.game = game; this.t = 0; }
  fen(text, ms = 3200) { const g = this.game; g.ui.bark(() => g.companion.pos.clone().add(new THREE.Vector3(0, 3.3, 0)), text, ms, 'fen'); g.companion.talk = 1; setTimeout(() => (g.companion.talk = 0), Math.min(ms, 1800)); }
  juno(text, ms = 2600) { const g = this.game; g.ui.bark(() => g.player.pos.clone().add(new THREE.Vector3(0, 2.0, 0)), text, ms, 'juno'); }
  cloud(c, kind) { const g = this.game, L = S.CLOUD_LINES[c.id]; if (!L || !L[kind]) return; if (!g.narr.cd('cl' + c.id + kind, kind === 'drop' ? 12 : 8)) return; g.ui.bark(() => c.pos.clone().add(new THREE.Vector3(0, 1.8 * c.stretch, 0)), pick(L[kind]), 3000, 'cloud'); if (kind === 'grab') c.face.set('surprised'); if (kind === 'squash') c.face.set('angry'); if (kind === 'stretch') c.face.set('happy'); if (kind === 'drop') c.face.set('smug'); }
  onGrab(c) { this.cloud(c, 'grab'); }
  onDrop(c) { this.cloud(c, 'drop'); c.face.set(c.id === 'gertrude' ? 'smug' : 'neutral'); }
  onFall() { const g = this.game; g.audio.sfx('fall'); this.juno(pick(S.JUNO_FALL), 2200); }
  onPuffkin(p) { const g = this.game; g.ui.bark(() => p.pos.clone().add(new THREE.Vector3(0, 1.3, 0)), pick(S.PUFFKIN_LINES), 1500, 'pk'); }
  onFen() { const g = this.game; if (g.state !== 'play') return; const c = g.companion; if (Math.hypot(c.pos.x - g.player.pos.x, c.pos.z - g.player.pos.z) > 7) { this.juno('Fen! Keep up!'); return; } this.fen(pick(S.FEN_TALK), 4000); c.fen.play('nod'); }
}
