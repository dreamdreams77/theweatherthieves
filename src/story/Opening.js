import * as THREE from 'three';
import { std } from '../gfx/Mat.js';
import { Settings } from '../core/Settings.js';
import { clamp, lerp, smoothstep } from '../core/Utils.js';

/**
 * Opening cinematic (~21 s, in-engine): a bright sky full of weather -> shadowy thieves swoop in and bottle the rain, the sun,
 * the wind and the snow in glass jars -> the colour drains out of the world -> Juno and Fen are left looking up -> title card.
 * Plays once for a fresh game before the chapter 1 intro dialogue (Game.begin), can be replayed from the pause menu, and is
 * always skippable (Skip pill, tap anywhere, Enter / Space / Esc). The thieves stay silhouettes: who they are is chapter 4's reveal.
 */
const DUR = 21;
const CAPS = [
  [0.7, 4.6, 'Once, the sky above the floating islands was full of weather.'],
  [5.3, 8.3, 'Then, one quiet Tuesday, the thieves came.'],
  [8.9, 14.2, 'Rain, sunshine, wind and snow — bottled, one by one, in glass jars.'],
  [14.7, 17.3, '…and carried away to nobody knows where.'],
];
const ARRIVE = 5.0, STEAL = 8.0, STEAL_GAP = 1.5, STEAL_LEN = 1.8, LEAVE = 14.4, TITLE = 17.6;
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _q = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0);
const bez = (a, b, c, u, out) => out.copy(a).multiplyScalar((1 - u) * (1 - u)).addScaledVector(b, 2 * u * (1 - u)).addScaledVector(c, u * u);
const easeOut = (u) => 1 - (1 - u) ** 3, easeIn = (u) => u * u * u;

export class Opening {
  /** should a fresh game show the opening? (headless QA runs with ?norender=1 skip it unless &opening=1 asks for it) */
  static wanted(game) { const qs = new URLSearchParams(location.search); if (qs.get('opening') === '0') return false; return !game.noRender || qs.get('opening') === '1'; }
  static play(game, onDone) { if (game.opening) return game.opening; try { return (game.opening = new Opening(game, onDone)); } catch (e) { console.error(e); game.opening = null; onDone?.(); return null; } }
  /** "Replay opening" button in the pause menu (added here so UI.js stays untouched) */
  static install(game) {
    const row = document.querySelector('#pause .prow'); if (!row || document.getElementById('pOpening')) return;
    const b = document.createElement('button'); b.id = 'pOpening'; b.className = 'btn alt'; b.textContent = 'Replay opening';
    const ref = document.getElementById('pHelp'); ref ? row.insertBefore(b, ref.nextSibling) : row.appendChild(b);
    b.addEventListener('click', () => {
      if (game.state !== 'play' || game.ui.dlg.active || game.cinematic || game.opening || game.trials?.active) { game.ui.toast('Finish what you are doing first, then replay the opening.'); return; }
      game.pause(false); Opening.play(game, () => { game.state = 'play'; game.player.locked = false; });
    });
  }

  constructor(game, onDone) {
    this.game = game; this.onDone = onDone; this.t = 0; this.stolen = 0; this.cap = -1; this.ending = false; this.lookAt = null;
    this.rm = !!Settings.data.reduceMotion; this.mobile = !!game.quality?.mobile; this.rate = this.mobile ? 0.5 : 1; this.acc = {};
    const g = game; this.objs = []; this.disp = [];
    this.prev = { state: g.state, cinematic: g.cinematic, restore: g.restore, restoreT: g.restoreT, locked: g.player.locked, fov: g.rig.fov };
    g.tools?.drop?.(); g.state = 'opening'; g.cinematic = true; g.player.locked = true; g.player.vel.set(0, 0, 0); g.rig.fov = 42;
    const p = g.player.pos, gy = g.terrain.groundAt(p.x, p.z, p.y + 3)?.y ?? p.y; this.c = new THREE.Vector3(p.x, gy, p.z);
    this.ground = (x, z) => { const t = g.terrain.topAt(x, z); return t > -Infinity ? t : this.c.y - 2; };
    this.build(); this.buildDom();
    g.restore = g.restoreT = 1; g.applyMood();
    // music cue: a bright little arpeggio for the peaceful sky
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => this.tone(f, 1.4, 0.05, 'sine', 1, 0.2 + i * 0.22));
    this.watchdog = setTimeout(() => this.finish(true), 90000);
  }
  // ------------------------------------------------------------------ helpers
  tone(...a) { try { this.game.audio.tone(...a); } catch {} }
  noise(...a) { try { this.game.audio.noise(...a); } catch {} }
  add(o) { this.game.scene.add(o); this.objs.push(o); return o; }
  geo(g) { this.disp.push(g); return g; }
  mat(m) { this.disp.push(m); return m; }
  at(x, y, z) { return new THREE.Vector3(this.c.x + x, this.c.y + y, this.c.z + z); }
  /** fire `fn` once when the timeline passes `time` */
  once(key, time, fn) { if (this.t >= time && !this.acc['o_' + key]) { this.acc['o_' + key] = 1; try { fn(); } catch (e) { console.error(e); } } }
  /** emit `rate` particles per second (fractional accumulator) */
  emit(key, rate, dt, fn) { this.acc[key] = (this.acc[key] || 0) + rate * this.rate * dt; while (this.acc[key] >= 1) { this.acc[key] -= 1; fn(); } }
  /** camera distance that fits a half-extent W x H around the look point (shots use a 42 degree lens; portrait crops a little) */
  fit(W, H) { const th = Math.tan(THREE.MathUtils.degToRad(21)), a = this.game.camera.aspect || 1; return Math.max(H / th, (W * (a < 1 ? 0.78 : 1)) / (th * a)); }

  // ------------------------------------------------------------------ scene
  build() {
    const puff = this.geo(new THREE.SphereGeometry(1, 14, 10));
    const mkCloud = (col, k) => { const gr = new THREE.Group(), m = this.mat(std({ color: col, roughness: 0.95 })); for (const [x, y, z, s] of [[0, 0, 0, 1.45], [1.3, -0.25, 0.2, 1.05], [-1.3, -0.3, 0.1, 1.1], [0.55, 0.6, -0.2, 0.95], [-0.55, 0.5, 0.3, 0.9], [2.1, -0.45, 0, 0.7], [-2.1, -0.5, -0.1, 0.72]]) { const s1 = new THREE.Mesh(puff, m); s1.position.set(x * k, y * k, z * k); s1.scale.setScalar(s * k); s1.castShadow = true; gr.add(s1); } return gr; };
    const E = this.els = [];
    // 0 rain cloud (far left)
    { const p = this.at(-7, 7.6, -8), gr = this.add(mkCloud(0xf2f4ff, 1)); gr.position.copy(p); E.push({ id: 'rain', p, home: p.clone(), gr, col: 0x8fd0ff, r: 1.6, s: 1 }); }
    // 1 the sun: an orb pouring a beam of light onto the island
    { const p = this.at(3.2, 12.5, -12), gr = this.add(new THREE.Group()); gr.position.copy(p);
      const orb = new THREE.Mesh(this.geo(new THREE.SphereGeometry(1.25, 20, 14)), this.mat(new THREE.MeshBasicMaterial({ color: 0xffe07a, fog: false }))); gr.add(orb);
      const halo = new THREE.Mesh(puff, this.mat(new THREE.MeshBasicMaterial({ color: 0xffc94a, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }))); halo.scale.setScalar(2.2); gr.add(halo);
      const beam = this.add(new THREE.Mesh(this.geo(new THREE.CylinderGeometry(0.32, 1, 1, 24, 1, true)), this.mat(new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }))));
      const gp = this.at(2.2, 0, -5.5); gp.y = this.ground(gp.x, gp.z) + 0.06;
      const glow = this.add(new THREE.Mesh(this.geo(new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2)), this.mat(new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })))); glow.position.copy(gp);
      E.push({ id: 'sun', p, home: p.clone(), gr, col: 0xffd75a, r: 1.4, s: 1, beam, glow, gp }); }
    // 2 a wind swirl (a little whirl of ribbons, mid-left)
    { const p = this.at(-2.4, 4.8, -4.8), gr = this.add(new THREE.Group()); gr.position.copy(p); const arcs = [];
      const am = this.mat(new THREE.MeshBasicMaterial({ color: 0xf2fbff, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      [[1.0, -0.8], [1.45, 0], [1.9, 0.8]].forEach(([r, y], i) => { const a = new THREE.Mesh(this.geo(new THREE.TorusGeometry(r, 0.075, 5, 44, Math.PI * 1.3)), am); a.rotation.x = Math.PI / 2 + (i - 1) * 0.12; a.position.y = y; const piv = new THREE.Group(); piv.add(a); gr.add(piv); arcs.push(piv); });
      E.push({ id: 'wind', p, home: p.clone(), gr, col: 0xd8f3ff, r: 1.6, s: 1, arcs }); }
    // 3 a snow cloud (far right)
    { const p = this.at(7.4, 7.8, -7.5), gr = this.add(mkCloud(0xe2ecfa, 0.9)); gr.position.copy(p); E.push({ id: 'snow', p, home: p.clone(), gr, col: 0xffffff, r: 1.5, s: 1 }); }
    // ---- thieves: shadow-gliders with a hooded rider and a glass jar each (pure silhouettes, glowing eyes)
    const ink = this.mat(new THREE.MeshBasicMaterial({ color: 0x16111e, side: THREE.DoubleSide, fog: false })), eyeM = this.mat(new THREE.MeshBasicMaterial({ color: 0xfff0a0, fog: false }));
    const half = new THREE.Shape(); half.moveTo(0, 0.3); half.quadraticCurveTo(1.1, 0.62, 2.4, 0.15); half.lineTo(1.8, -0.06); half.lineTo(1.35, -0.32); half.lineTo(0.85, -0.16); half.lineTo(0.4, -0.48); half.lineTo(0, -0.36); half.lineTo(0, 0.3);
    const wingG = this.geo(new THREE.ShapeGeometry(half).rotateX(Math.PI / 2)), bodyG = this.geo(new THREE.ConeGeometry(0.4, 1.0, 10)), hoodG = this.geo(new THREE.SphereGeometry(0.36, 12, 10)), peakG = this.geo(new THREE.ConeGeometry(0.2, 0.55, 8)), eyeG = this.geo(new THREE.SphereGeometry(0.065, 8, 6));
    const glassM = this.mat(new THREE.MeshStandardMaterial({ color: 0xd8f0ff, transparent: true, opacity: 0.3, roughness: 0.06, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide })), rimM = this.mat(new THREE.MeshStandardMaterial({ color: 0xc4e4ff, roughness: 0.2 })), corkM = this.mat(new THREE.MeshStandardMaterial({ color: 0x9a6a3a, roughness: 0.9 }));
    const jarG = this.geo(new THREE.CylinderGeometry(0.4, 0.36, 0.9, 18, 1, true)), rimG = this.geo(new THREE.TorusGeometry(0.4, 0.055, 6, 18).rotateX(Math.PI / 2)), botG = this.geo(new THREE.CircleGeometry(0.36, 18).rotateX(Math.PI / 2)), corkG = this.geo(new THREE.CylinderGeometry(0.31, 0.26, 0.2, 12));
    const ropeM = this.mat(new THREE.LineBasicMaterial({ color: 0x16111e, fog: false }));
    this.thieves = E.map((el, i) => {
      const side = i % 2 ? 1 : -1, g = this.add(new THREE.Group()); g.scale.setScalar(1.15); g.rotation.order = 'YXZ';
      const wings = [-1, 1].map((sx) => { const piv = new THREE.Group(); const m = new THREE.Mesh(wingG, ink); m.scale.x = sx; piv.add(m); piv.position.x = sx * 0.12; g.add(piv); return piv; });
      const rider = new THREE.Group(); g.add(rider); const body = new THREE.Mesh(bodyG, ink); body.position.y = 0.5; const hood = new THREE.Mesh(hoodG, ink); hood.position.y = 1.12; hood.scale.set(1, 1.08, 1); const peak = new THREE.Mesh(peakG, ink); peak.position.set(0, 1.42, -0.16); peak.rotation.x = -0.75;
      const eyes = [-1, 1].map((sx) => { const e = new THREE.Mesh(eyeG, eyeM); e.position.set(sx * 0.11, 1.12, 0.31); return e; }); rider.add(body, hood, peak, ...eyes);
      const jar = this.add(new THREE.Group()); const glass = new THREE.Mesh(jarG, glassM); const rim = new THREE.Mesh(rimG, rimM); rim.position.y = 0.45; const bot = new THREE.Mesh(botG, glassM); bot.position.y = -0.45; const cork = new THREE.Mesh(corkG, corkM); cork.position.y = 0.52;
      const fillM = this.mat(new THREE.MeshBasicMaterial({ color: el.col, transparent: true, opacity: 0.9, fog: false })), fill = new THREE.Mesh(puff, fillM); fill.scale.setScalar(0.001); fill.position.y = -0.05; jar.add(glass, rim, bot, cork, fill); jar.renderOrder = 2;
      const ropeGeo = this.geo(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, -1, 0)])), rope = this.add(new THREE.Line(ropeGeo, ropeM)); rope.frustumCulled = false;
      const hover = el.p.clone().add(new THREE.Vector3(side * 0.6, 3.3, 2.1));
      const T = { g, wings, jar, cork, fill, rope, side, hover, el, i, start: this.at(side * 46, 24 + i * 3, -58), exit: this.at(-side * 26 + i * 4, 38 + i * 2, -95), arrive: ARRIVE + i * 0.45, steal: STEAL + i * STEAL_GAP, leave: LEAVE + i * 0.22, pos: new THREE.Vector3(), prevPos: new THREE.Vector3(), dir: new THREE.Vector3(0, 1, 0), tilt: 0, smoke: 0 };
      T.ctrlIn = hover.clone().add(new THREE.Vector3(side * 13, -7, 9)); T.ctrlOut = hover.clone().add(new THREE.Vector3(side * 6, 10, -8));
      g.position.copy(T.start); T.pos.copy(T.start); T.prevPos.copy(T.start); g.visible = jar.visible = rope.visible = false; return T;
    });
  }
  buildDom() {
    const el = this.el = document.createElement('div'); el.id = 'opening'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Opening scene');
    el.innerHTML = `<div class="op-bar top"></div><div class="op-bar bot"></div><div class="op-cap" aria-live="polite"></div>
      <div class="op-title"><span>A weather-saving adventure</span>THE WEATHER<br>THIEVES</div>
      <button class="op-skip pill" type="button" aria-label="Skip the opening scene">Skip <b aria-hidden="true">▸▸</b></button><div class="op-curtain on"></div>`;
    document.body.appendChild(el); document.body.classList.add('opening'); this.capEl = el.querySelector('.op-cap'); this.curtainEl = el.querySelector('.op-curtain'); this.titleEl = el.querySelector('.op-title');
    requestAnimationFrame(() => requestAnimationFrame(() => this.curtainEl.classList.remove('on')));
    const grace = () => this.t > 0.35;
    el.querySelector('.op-skip').addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); this.finish(true); });
    el.querySelector('.op-skip').addEventListener('click', (e) => { e.stopPropagation(); this.finish(true); });
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); if (grace()) this.finish(true); });
    this.onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return; e.stopImmediatePropagation();
      if (['Enter', 'Space', 'Escape', 'NumpadEnter'].includes(e.code)) { e.preventDefault(); if (grace() && !e.repeat) this.finish(true); }
    };
    addEventListener('keydown', this.onKey, true);
  }

  // ------------------------------------------------------------------ per frame
  update(dt) {
    if (this.ending && this.cleaned) return;
    try { this.step(dt); } catch (e) { console.error('[opening]', e); this.finish(true); }
  }
  step(dt) {
    const g = this.game, w = g.weather; this.t += dt; const t = this.t, rm = this.rm;
    if (t >= DUR && !this.ending) { this.finish(false); }
    if (t > DUR - 0.6) this.curtainEl.classList.add('on');
    // captions + title
    let ci = -1; for (let i = 0; i < CAPS.length; i++) if (t >= CAPS[i][0] && t < CAPS[i][1]) ci = i;
    if (ci !== this.cap) { this.cap = ci; this.el.dataset.cap = ci; if (ci >= 0) { this.capEl.textContent = CAPS[ci][2]; this.capEl.classList.add('show'); } else this.capEl.classList.remove('show'); }
    if (t >= TITLE + 0.2) this.titleEl.classList.add('show');
    // ---- weather props
    const [rain, sun, wind, snow] = this.els;
    for (const T of this.thieves) { const el = T.el, p = clamp((t - T.steal) / STEAL_LEN, 0, 1); el.prog = p; el.s = 1 - smoothstep(0.15, 1, p); }
    // rain cloud + falling streaks
    if (rain.s > 0.01) { const cp = rain.gr.position; this.emit('rain', 46 * rain.s, dt, () => { _v.set(cp.x + (Math.random() - 0.5) * 3 * rain.s, cp.y - 0.7 * rain.s, cp.z + (Math.random() - 0.5) * 1.5); const gy = this.ground(_v.x, _v.z); w.streaks.spawn(_v, _w.set(0.4, -13, 0), { life: Math.max(0.1, (_v.y - gy) / 13), size: 0.5, color: 0x9fd6ff }); }); }
    // snow cloud + flakes
    if (snow.s > 0.01) { const cp = snow.gr.position; this.emit('snow', 32 * snow.s, dt, () => { _v.set(cp.x + (Math.random() - 0.5) * 3.2 * snow.s, cp.y - 0.6 * snow.s, cp.z + (Math.random() - 0.5) * 1.6); const gy = this.ground(_v.x, _v.z); w.flakes.spawn(_v, _w.set((Math.random() - 0.5) * 0.5, -1.6, (Math.random() - 0.5) * 0.4), { life: clamp((_v.y - gy) / 1.6, 0.2, 6), size: 1.4, color: 0xffffff }); }); }
    for (const c of [rain, snow]) { c.gr.rotation.z = Math.sin(t * 0.8 + c.p.x) * 0.04; }
    // wind swirl
    wind.arcs.forEach((a, i) => (a.rotation.y += dt * (2.2 + i * 0.7) * (1 + wind.prog * 4)));
    if (wind.s > 0.01) this.emit('wind', 18 * wind.s, dt, () => { const a = Math.random() * 6.283, R = (1 + Math.random()) * wind.s, cp = wind.gr.position; _v.set(cp.x + Math.cos(a) * R, cp.y + (Math.random() - 0.5) * 1.8 * wind.s, cp.z + Math.sin(a) * R); w.streaks.spawn(_v, _w.set(-Math.sin(a) * 7, 0.6, Math.cos(a) * 7), { life: 0.4, size: 0.45, color: 0xeaf8ff }); });
    // sun beam follows the orb and narrows as it is bottled
    { const op = sun.gr.position, gp = sun.gp; _v.subVectors(op, gp); const len = _v.length(); sun.beam.position.copy(gp).addScaledVector(_v, 0.5); sun.beam.quaternion.setFromUnitVectors(UP, _v.normalize()); const R = 2.4 * sun.s; sun.beam.scale.set(Math.max(0.001, R), len, Math.max(0.001, R)); sun.beam.visible = sun.s > 0.01; sun.glow.scale.setScalar(Math.max(0.001, R * 1.3)); sun.glow.material.opacity = 0.32 * sun.s * (0.85 + Math.sin(t * 3) * 0.15); sun.gr.children[1].scale.setScalar(2.2 + Math.sin(t * 2.4) * 0.15);
      if (sun.s > 0.3 && !this.mobile) this.emit('sunmote', 6, dt, () => { _w.copy(gp).lerp(op, Math.random()); _w.x += (Math.random() - 0.5) * 1.6; _w.z += (Math.random() - 0.5) * 1.6; w.sparks.spawn(_w, _v.set(0, 0.3, 0), { life: 1.2, size: 0.8, color: 0xffe9a0 }); }); }
    // ---- light dims when the thieves' shadow falls; each bottled weather drains a quarter of the colour
    let R = lerp(1, 0.86, smoothstep(4.6, 5.8, t)); for (const el of this.els) R -= 0.215 * smoothstep(0, 1, el.prog); R = clamp(R, 0, 1); if (t > LEAVE) R = Math.min(R, lerp(0.02, 0, smoothstep(LEAVE, LEAVE + 2, t)));
    if (Math.abs(R - g.restore) > 0.0005) { g.restore = g.restoreT = R; g.applyMood(); }
    // ---- thieves
    for (const T of this.thieves) this.thief(T, dt, t);
    // ---- cues
    this.once('omen', 4.7, () => { this.tone(98, 2.4, 0.11, 'sawtooth', 0.7); this.tone(103.8, 2.4, 0.07, 'sawtooth', 0.7); this.noise(1.8, 0.12, 280, 'lowpass'); });
    this.once('junoStartle', 5.9, () => { g.player.setExpr('surprised', 4); g.player.juno.play('startle'); g.companion.react?.('worried', 'startle'); g.shake(0.18); });
    this.once('junoPoint', 9.2, () => { g.player.juno.play('point'); g.player.setExpr('angry', 3); });
    this.once('junoWorry', 13.0, () => { g.player.setExpr('worried', 6); g.companion.react?.('sad', 'shake'); });
    this.once('title', TITLE + 0.2, () => { [220, 261.63, 329.63, 440, 523.25].forEach((f, i) => this.tone(f, 3.2, 0.055, 'triangle', 1, i * 0.16)); });
    this.once('sad', TITLE, () => { g.player.setExpr('sad', 8); g.companion.react?.('gloom', 'sigh'); });
    this.camera(t, dt);
  }
  thief(T, dt, t) {
    const g = this.game, w = this.game.weather, el = T.el; T.prevPos.copy(T.pos); const vis = t >= T.arrive && t < T.leave + 3.2; T.g.visible = T.jar.visible = T.rope.visible = vis; if (!vis) return;
    if (t < T.arrive + 2.4) { const u = easeOut(clamp((t - T.arrive) / 2.4, 0, 1)); bez(T.start, T.ctrlIn, T.hover, u, T.pos); this.once('whoosh' + T.i, T.arrive + 0.9, () => { this.noise(0.8, 0.13, 900, 'bandpass'); this.noise(0.55, 0.07, 1900, 'bandpass'); }); }
    else if (t < T.leave) { T.pos.copy(T.hover); T.pos.y += Math.sin(t * 2.2 + T.i) * 0.18; T.pos.x += Math.sin(t * 1.3 + T.i * 2) * 0.12; }
    else { const u = easeIn(clamp((t - T.leave) / 3, 0, 1)); bez(T.hover, T.ctrlOut, T.exit, u, T.pos); this.once('away' + T.i, T.leave + 0.2, () => this.noise(0.9, 0.08, 700, 'bandpass')); }
    T.g.position.copy(T.pos);
    // orientation: face the flight direction while flying, face the island (camera side) while hovering
    _v.subVectors(T.pos, T.prevPos); const sp = _v.length() / Math.max(dt, 1e-4);
    const yawT = sp > 2 ? Math.atan2(_v.x, _v.z) : 0; T.yaw = T.yaw === undefined ? yawT : T.yaw + Math.atan2(Math.sin(yawT - T.yaw), Math.cos(yawT - T.yaw)) * Math.min(1, dt * 5);
    T.g.rotation.set(sp > 2 ? clamp(-_v.y / Math.max(_v.length(), 1e-4), -0.5, 0.5) : 0, T.yaw, sp > 2 ? -T.side * 0.25 : Math.sin(t * 2 + T.i) * 0.06);
    const flap = Math.sin(t * (sp > 2 ? 9 : 5) + T.i) * (sp > 2 ? 0.4 : 0.22); T.wings[0].rotation.z = -flap; T.wings[1].rotation.z = flap;
    // smoky trail while flying
    if (sp > 3) this.emit('smoke' + T.i, 14, dt, () => { _w.set(0, 0.4, -1.2).applyEuler(T.g.rotation).add(T.pos); w.smoke.spawn(_w, _v.set(0, 0.2, 0), { life: 1.1, size: 0.45, grow: 0.9, color: 0x3a3046 }); });
    // jar hangs below on a rope; tilts its open mouth at the weather while stealing
    const p = el.prog, stealing = t >= T.steal && p < 1; T.tilt += ((stealing ? 1 : 0) - T.tilt) * Math.min(1, dt * 5);
    const J = _w.copy(T.pos).add(_v.set(0, -1.5, 0)); T.jar.position.copy(J);
    const dir = T.dir.subVectors(el.gr.position, J).normalize(); _q.setFromUnitVectors(UP, dir); T.jar.quaternion.identity().slerp(_q, T.tilt * 0.85); T.jar.rotation.z += sp > 2 ? Math.sin(t * 6) * 0.08 : 0;
    const pos = T.rope.geometry.attributes.position; pos.setXYZ(0, T.pos.x, T.pos.y + 0.3, T.pos.z); pos.setXYZ(1, J.x, J.y + 0.45, J.z); pos.needsUpdate = true;
    T.cork.visible = !(t >= T.steal - 0.3 && p < 1);
    const f = smoothstep(0.05, 1, p); T.fill.scale.set(0.3 * f + 0.001, 0.36 * f + 0.001, 0.3 * f + 0.001); T.fill.material.opacity = 0.75 + Math.sin(t * 5) * 0.15;
    if (t >= T.steal && p < 1) {
      this.once('suck' + T.i, T.steal, () => { this.tone(260, 1.7, 0.05, 'triangle', 2.6); this.noise(1.5, 0.06, 1400, 'bandpass'); });
      const mouth = T.jar.position.clone().addScaledVector(dir, 0.45);
      // the weather is pulled toward the jar, shrinking as it goes, and streams in as a ribbon of particles
      el.gr.position.lerpVectors(el.home, mouth, smoothstep(0.35, 1, p)); el.gr.scale.setScalar(Math.max(0.001, el.s));
      this.emit('suckp' + T.i, 70 * (1 - p * 0.5), dt, () => { const life = 0.35 + Math.random() * 0.25; const s0 = el.gr.position.clone().add(new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).multiplyScalar(el.r * 2 * Math.max(el.s, 0.3))); w.sparks.spawn(s0, mouth.clone().sub(s0).multiplyScalar(1 / life), { life, size: 1.1, color: el.col }); });
    }
    if (p >= 1) { el.gr.visible = false; this.once('cork' + T.i, T.steal + STEAL_LEN, () => { this.stolen++; this.tone(720, 0.14, 0.12, 'sine', 0.4); this.noise(0.08, 0.1, 2200, 'highpass'); w.burst(T.jar.position, el.col, this.mobile ? 8 : 16, 2, 0.8); g.shake(0.08); }); }
  }
  /** shot list: wide establishing -> low angle as they swoop in -> close-ups of each theft -> wide as they leave -> Juno & Fen */
  camera(t, dt) {
    const g = this.game, rm = this.rm, c = this.c, a = g.camera.aspect || 1; let look, pos;
    const place = (lk, dx, dy, dz, W, H, push = 0) => { look = lk; _v.set(dx, dy, dz).normalize(); pos = lk.clone().addScaledVector(_v, this.fit(W, H) * (1 - push)); };
    if (t < ARRIVE) { const u = t / ARRIVE, ang = rm ? -0.04 : lerp(-0.28, 0.02, smoothstep(0, 1, u)); place(this.at(0, 5.6, -6.5), Math.sin(ang), 0.32, Math.cos(ang), 10.5, 6.5, rm ? 0 : 0.1 * u); }
    else if (t < STEAL) { const u = (t - ARRIVE) / (STEAL - ARRIVE); place(this.at(0, 8.5, -8.5), rm ? 0 : lerp(0.12, -0.05, u), -0.12, 1, 10.5, 7, rm ? 0 : 0.06 * u); }
    else if (t < LEAVE) {
      if (rm) place(this.at(0, 8, -8), 0, 0.12, 1, 10, 7);
      else { const k = clamp((t - STEAL) / STEAL_GAP, 0, 3), i0 = Math.floor(k), fr = smoothstep(0.7, 1, k - i0), i1 = Math.min(3, i0 + 1);
        const sh = (i) => { const T = this.thieves[i], lk = T.el.home.clone().lerp(T.hover, 0.55); _v.set(0.35 * T.side, 0.18, 1).normalize(); return { lk, pos: lk.clone().addScaledVector(_v, this.fit(5.6, 4.4)) }; };
        const A = sh(i0), B = sh(i1); look = A.lk.lerp(B.lk, fr); pos = A.pos.lerp(B.pos, fr); }
    }
    else if (t < TITLE) { const u = (t - LEAVE) / (TITLE - LEAVE); place(this.at(0, 9.5, -16), rm ? 0 : -0.12, 0.18, 1, 13, 8.5, rm ? 0 : -0.12 * u); }
    else {
      // Juno and Fen, left looking up at an empty grey sky
      const jp = g.player.pos, d = new THREE.Vector3(0.55, 0, 1).normalize(), perp = new THREE.Vector3(d.z, 0, -d.x);
      if (!this.acc.fenPlaced) { this.acc.fenPlaced = 1; const fx = jp.x + perp.x * 2.9 - d.x * 1.4, fz = jp.z + perp.z * 2.9 - d.z * 1.4, gy = g.terrain.groundAt(fx, fz, jp.y + 3)?.y; if (gy !== undefined) { g.companion.pos.set(fx, gy, fz); g.companion.vel.set(0, 0, 0); } this.prevHold = g.companion.holdPos; g.companion.holdPos = true; }
      const mid = jp.clone().lerp(g.companion.pos, 0.45); mid.y = jp.y + 1.7; const u = clamp((t - TITLE) / (DUR - TITLE), 0, 1);
      place(mid, d.x, -0.2, d.z, 3.6 * (a < 1 ? 1.2 : 1), 2.5, rm ? 0 : 0.1 * u); pos.y = Math.max(pos.y, this.ground(pos.x, pos.z) + 0.45);
      g.player.facing = Math.atan2(d.x, d.z) - 0.25; const fy = Math.atan2(d.x, d.z) + 0.35; g.companion.yaw = fy; if (g.companion.fen?.root) g.companion.fen.root.rotation.y = fy;
      this.lookAt = jp.clone().addScaledVector(d, 5).add(new THREE.Vector3(0, 14, 0));
    }
    if (t < TITLE) this.lookAt = this.at(0, 12, -8);
    g.rig.shot = { pos, look }; g.rig.lastShot = g.rig.shot; g.rig.shotW = 1; g.shotT = 999;
  }

  // ------------------------------------------------------------------ end
  finish(skipped) {
    if (this.ending) return; this.ending = true; this.skipped = !!skipped; clearTimeout(this.watchdog);
    this.curtainEl?.classList.add('on'); this.el?.classList.add('ending');
    if (skipped) this.noise(0.4, 0.06, 1200, 'bandpass');
    setTimeout(() => this.cleanup(), 340);
  }
  cleanup() {
    if (this.cleaned) return; this.cleaned = true; const g = this.game;
    removeEventListener('keydown', this.onKey, true);
    try {
      for (const o of this.objs) g.scene.remove(o); for (const d of this.disp) d.dispose?.();
      const w = g.weather; for (const pool of [w.flakes, w.streaks]) for (const p of pool.P) if (p.life > 0) p.life = 0.001;
    } catch (e) { console.error(e); }
    const P = this.prev; g.cinematic = false; g.state = 'play'; g.player.locked = false; g.player.facing = null; if (this.prevHold !== undefined) g.companion.holdPos = this.prevHold;
    g.restore = P.restore; g.restoreT = P.restoreT; g.applyMood(); g.rig.setShot(null); g.shotT = 0; g.rig.fov = P.fov; this.lookAt = null;
    g.opening = null; g.openingResult = this.skipped ? 'skipped' : 'played'; document.body.classList.remove('opening');
    const el = this.el; requestAnimationFrame(() => el?.querySelector('.op-curtain')?.classList.remove('on')); setTimeout(() => el?.remove(), 700);
    try { this.onDone?.(); } catch (e) { console.error(e); }
  }
}
