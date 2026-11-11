import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Input } from './Input.js';
import { CameraRig } from './CameraRig.js';
import { Tools } from './Tools.js';
import { clamp, damp, lerp, isTouch } from './Utils.js';
import { G } from '../gfx/Mat.js';
import { Sky } from '../gfx/Sky.js';
import { Terrain } from '../world/Terrain.js';
import { SunkenSky } from '../world/SunkenSky.js';
import { WeatherSystem } from '../weather/WeatherSystem.js';
import { Player } from '../characters/Player.js';
import { Companion } from '../characters/Companion.js';
import { UI } from '../ui/UI.js';
import { AudioManager } from '../audio/Audio.js';
import { Narrative, Say } from '../puzzles/Narrative.js';
import * as S from '../ui/story.js';
import { Progress } from './Progress.js';
import { CHAPTERS } from '../chapters/index.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas; this.state = 'loading'; this.t = 0; this.cinematic = false; this.shotT = 0; this.restore = 0; this.restoreT = 0; this.fenHappy = false; this.chapterNo = 1; this.palette = { fogA: 0xb9b0c4, fogB: 0xf2d6bc, tint: 0x888888, tintAmt: 0, density: [0.0078, 0.0058] };
    const mobile = isTouch() || Math.min(innerWidth, innerHeight) < 520; this.quality = { mobile, dpr: Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2), shadow: mobile ? 1024 : 2048 }; this.dpr = this.quality.dpr;
    const qs = new URLSearchParams(location.search); this.noRender = qs.has('norender');
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance', preserveDrawingBuffer: this.noRender });
    r.setPixelRatio(this.dpr); r.setSize(innerWidth, innerHeight, false); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0; r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.3, 2500); this.camera.position.set(0, 6, 22);
    this.sunDir = new THREE.Vector3(0.38, 0.5, -0.62).normalize();
    this.scene.fog = new THREE.FogExp2(0xb9b0c4, 0.0075);
    const pm = new THREE.PMREMGenerator(r); this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; this.scene.environmentIntensity = 0.3;
    this.hemi = new THREE.HemisphereLight(0xb8c4ff, 0x9a8a78, 1.0); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xe8e4ff, 1.4); this.sun.castShadow = true; this.sun.shadow.mapSize.set(this.quality.shadow, this.quality.shadow); const sc = this.sun.shadow.camera; const R = mobile ? 26 : 34; sc.left = -R; sc.right = R; sc.top = R; sc.bottom = -R; sc.near = 1; sc.far = 160; this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.05; this.scene.add(this.sun, this.sun.target);
    this.fill = new THREE.DirectionalLight(0xaab8ff, 0.5); this.fill.position.set(-0.6, 0.4, 0.8); this.scene.add(this.fill);
    this.sky = new Sky(this.scene, this.sunDir, this.quality);
    this.terrain = new Terrain(); this.weather = new WeatherSystem(this.scene, this.terrain, this.quality);
    this.input = new Input(canvas); this.rig = new CameraRig(this.camera); this.audio = new AudioManager();
    addEventListener('resize', () => this.resize()); this.resize();
  }
  resize() { const w = innerWidth, h = innerHeight; this.renderer.setPixelRatio(this.dpr); this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.fov = w / h < 0.8 ? 62 : 52; this.camera.updateProjectionMatrix(); this.rig.fov = this.camera.fov; }
  build(progress) {
    Progress.load(); const before0 = new Set(this.scene.children);
    this.world = new SunkenSky(this); this.worldObjs = this.scene.children.filter((c) => !before0.has(c)); progress?.(0.7);
    this.player = new Player(this); this.companion = new Companion(this); this.fen = this.companion; this.tools = new Tools(this);
    this.ui = new UI(this); this.say = new Say(this); this.narr = new Narrative(this); this.puzzles = { onJar: () => this.narr.onJar(), onGrab: (c) => this.narr.onGrab(c) }; this.story = { onToolFirstUse: () => {} };
    this.world.fenCloud.owner = this.companion; this.narr.init(); this.weather.keep = [...this.weather.reactives]; this.ui.setTool(0);
    this.setRestore(this.narr.flags.freed ? 1 : this.narr.flags.melted ? 0.5 : this.narr.flags.p1 ? 0.2 : 0, true);
    this.ui.showTouch(this.input.touchMode || isTouch());
    // resume position
    const ri = this.narr.resumeIsland; if (ri) { const sp = this.spawnFor(ri); this.player.pos.copy(sp); this.player.safe.copy(sp); this.companion.pos.copy(sp).add(new THREE.Vector3(2, 0, 2)); }
    this.rig.snap(this.player.pos); this.camera.position.set(-18, 12, 30); progress?.(1);
    this.state = 'title'; this.titleT = 0;
  }
  /** Tear down the current chapter world and build another one (player, companion, tools, audio and UI persist). */
  loadChapter(n) {
    const C = CHAPTERS[n]; if (!C) return; this.state = 'loading'; this.cinematic = false; this.tools.drop?.(); this.ui.dlg.active = false; document.getElementById('dlg')?.classList.add('hidden');
    const ov = document.getElementById('chapterCard'); if (ov) { ov.querySelector('.cc-no').textContent = 'Chapter ' + n; ov.querySelector('.cc-t').textContent = C.title; ov.classList.add('show'); }
    setTimeout(() => {
      this.disposeWorld(); this.chapterNo = n; Progress.setChapter(n);
      const before = new Set(this.scene.children); this.world = new C.World(this); this.worldObjs = this.scene.children.filter((c) => !before.has(c));
      this.narr = new C.Narr(this); this.narr.restore?.(); this.narr.init();
      this.palette = { fogA: 0xb9b0c4, fogB: 0xf2d6bc, tint: 0x888888, tintAmt: 0, density: [0.0078, 0.0058], ...C.palette };
      this.setRestore(C.restore ?? 0.35, true); this.weather.ambient = C.ambient || null; this.audio.setChapter?.(n);
      const sp = this.world.spawn; const y = this.terrain.groundAt(sp[0], sp[1], 500)?.y ?? 0; this.player.pos.set(sp[0], y, sp[1]); this.player.vel.set(0, 0, 0); this.player.safe.copy(this.player.pos); this.player.locked = false; this.companion.pos.set(sp[0] + 2, y, sp[1] + 2); this.companion.vel.set(0, 0, 0);
      this.world.fenCloud && (this.world.fenCloud.owner = this.companion);
      this.rig.snap(this.player.pos); this.ui.setGlints(0); this.ui.setTool(0); this.ui.refreshMemories?.(); this.ui.showEnd && document.getElementById('end').classList.add('hidden');
      this.ui.setChapterLabel(n, C.title); this.ui.setObjective(C.title, ''); this.state = 'play'; this.shot(null);
      setTimeout(() => { ov?.classList.remove('show'); this.narr.begin?.(); }, 1800);
    }, 900);
  }
  chapterTitle() { return this.chapterNo === 1 ? 'The Sunken Sky' : (CHAPTERS[this.chapterNo]?.title || 'This chapter'); }
  disposeWorld() {
    for (const c of this.weather.clouds) c.dispose?.(); this.weather.clouds = []; this.weather.beams.length = 0; this.weather.reactives = [...(this.weather.keep || [])];
    for (const o of this.worldObjs || []) { this.scene.remove(o); o.traverse?.((m) => { if (m.geometry) m.geometry.dispose?.(); if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose?.()); }); }
    this.worldObjs = []; const t = this.terrain; t.islands.length = 0; t.surfaces.length = 0; t.colliders.length = 0; this._grass = null;
  }
  spawnFor(i) { const w = this.world; const pts = { home: [3, 8], meadow: [-26, -13], rise: [-19, -48], summit: [20, -61] }[i.id] || [3, 8]; const y = i.heightAt(pts[0], pts[1]); return new THREE.Vector3(pts[0], y, pts[1]); }
  setRestore(v, instant) { this.restoreT = v; if (instant) { this.restore = v; this.applyMood(); } }
  applyMood() {
    const r = this.restore, c = new THREE.Color(); G.uSat.value = lerp(0.58, 1.08, r); this.sky.restore.value = r;
    this.sun.intensity = lerp(1.5, 3.4, r); this.sun.color.set(0xe8e4ff).lerp(c.set(0xffdfae), r); this.hemi.intensity = lerp(1.15, 0.95, r); this.hemi.color.set(0xb8c4ff).lerp(c.set(0x9fc8ff), r); this.hemi.groundColor.set(0x9a8a78).lerp(c.set(0xb08a68), r);
    const P = this.palette; this.scene.fog.color.set(P.fogA).lerp(c.set(P.fogB), r); this.scene.fog.density = lerp(P.density[0], P.density[1], r); this.sky.tint.value.set(new THREE.Color(P.tint).r, new THREE.Color(P.tint).g, new THREE.Color(P.tint).b, P.tintAmt); this.fill.intensity = lerp(0.55, 0.35, r); this.renderer.toneMappingExposure = lerp(1.0, 1.05, r); this.scene.environmentIntensity = lerp(0.3, 0.5, r);
  }
  shot(s, dur = 4) { this.rig.setShot(s); this.shotT = s ? dur : 0; }
  shake(a) { this.rig.shake = a; }
  entityOf(who) { const npc = (this.world.npcs || []).find((n) => n.id === who); if (npc) return { pos: npc.pos, yaw: npc.yaw, head: 1.45 * npc.k * (npc.spec.tall ?? 1), face: npc.face, c: npc, rig: npc }; if (who === 'juno') return { pos: this.player.pos, yaw: this.player.yaw, head: 1.35, face: this.player.juno.face, c: this.player, rig: this.player.juno }; if (who === 'fen') return { pos: this.companion.pos, yaw: this.companion.yaw, head: 2.1, face: this.companion.fen.face, c: this.companion, rig: this.companion.fen }; if (who === 'sunny' && this.world.sunny) return { pos: this.world.sunny.group.getWorldPosition(new THREE.Vector3()), yaw: Math.PI * 0.2, head: 0, face: this.world.sunny.face, c: null, rig: null }; return null; }
  /** play dialogue with cinematic speaker framing. opts: {noLock, shot=true, onEnd} */
  dialogue(lines, opts = {}) {
    if (opts.noLock) { // non-blocking: floating barks one after another
      let delay = 0; for (const l of lines) { const who = l.who; setTimeout(() => { if (who === 'fen') this.say.fen(l.text, 4200); else if (who === 'juno') this.say.juno(l.text, 4200); else this.ui.toast(l.text, 4200); if (l.ex) { if (who === 'juno') this.player.setExpr(l.ex, 2); } if (l.anim) (who === 'fen' ? this.companion.fen : this.player.juno).play(l.anim); }, delay); delay += 2200 + l.text.length * 38; }
      if (opts.onEnd) setTimeout(opts.onEnd, delay); return;
    }
    if (this.ui.dlg.active) { const q = this.ui.dlg.lines.slice(this.ui.dlg.i + 1); this.ui.dlg.lines = this.ui.dlg.lines.slice(0, this.ui.dlg.i + 1).concat(lines, q); return; }
    const prevState = this.state; this.player.locked = true;
    this.ui.play(lines, {
      onLine: (l) => {
        const e = this.entityOf(l.who); this.speaker = e; this.talkWho = l.who;
        if (e) { if (l.ex) { e.face.set(l.ex); if (e.c === this.player) this.player.setExpr(l.ex, 30); } e.face.talk = 1; if (e.c && e.c !== this.player && e.c.talk !== undefined) e.c.talk = 30; if (l.anim && e.rig) e.rig.play(l.anim); if (opts.shot !== false) {
          const head = e.pos.clone().add(new THREE.Vector3(0, e.head, 0)); const side = l.who === 'juno' ? 0.55 : -0.6; const dist = l.who === 'sunny' ? 7.5 : 3.4 + (l.who === 'fen' ? 0.8 : 0);
          const fx = Math.sin(e.yaw + side), fz = Math.cos(e.yaw + side); const pos = head.clone().add(new THREE.Vector3(fx * dist, 0.15, fz * dist)); this.rig.setShot({ pos, look: head.clone().add(new THREE.Vector3(0, -0.05, 0)) }); this.shotT = 999; } }
        else if (opts.shot !== false) { /* narrator keeps previous shot */ }
        this.lookTarget = e ? null : null;
      },
      onEnd: () => { this.player.locked = this.cinematic ? true : false; this.rig.setShot(this.cinematic ? this.rig.shot : null); this.speaker = null; this.shotT = 0; this.player.talk = 0; this.companion.talk = 0; this.world.sunny.face.talk = 0; opts.onEnd?.(); },
    });
  }
  talkEnd() { const e = this.speaker; if (e) { e.face.talk = 0; if (e.c && e.c.talk !== undefined) e.c.talk = 0; } this.player.talk = 0; this.companion.talk = 0; if (this.world.sunny) this.world.sunny.face.talk = 0; }
  talkNPC(npc) {
    if (this.state !== 'play') return; if (Math.hypot(npc.pos.x - this.player.pos.x, npc.pos.z - this.player.pos.z) > 9) { this.say.juno('Let me get closer first!'); return; }
    const lines = this.narr.npcLines?.(npc); if (!lines || !lines.length) return; npc.react = 6; this.dialogue(lines, { shot: true, onEnd: () => (npc.react = 0) });
  }
  interact() { const p = this.player, c = this.companion; if (this.state !== 'play') return; if (this.narr.onInteract?.()) return; const nn = (this.world.npcs || []).reduce((b, n) => { const d = Math.hypot(n.pos.x - p.pos.x, n.pos.z - p.pos.z); return d < 4.2 && (!b || d < b.d) ? { n, d } : b; }, null); if (nn) { this.talkNPC(nn.n); return; } const jd = Math.hypot(p.pos.x - this.world.jarPos.x, p.pos.z - this.world.jarPos.z); if (jd < 9 && this.narr.flags.visitedD) { this.narr.onJar(); return; } if (Math.hypot(p.pos.x - c.pos.x, p.pos.z - c.pos.z) < 6) this.say.onFen(); }
  begin(newGame) {
    this.audio.start(); this.audio.setMuted(this.audio.muted);
    if (newGame) { this.narr.reset(); location.reload(); return; }
    document.body.classList.remove('on-title'); document.getElementById('title').classList.add('gone'); setTimeout(() => document.getElementById('title').remove(), 1400);
    const f = this.narr.flags;
    if (!f.intro) { f.intro = true; this.state = 'play'; this.dialogue(S.INTRO, { onEnd: () => { this.ui.setTool(0); this.ui.toast('Tip: press 1, then click the little cloud above Fen to carry it.', 8000); this.narr.save(); } }); }
    else { this.state = 'play'; this.player.locked = false; }
    this.state = this.ui.dlg.active ? 'dialogue' : 'play';
  }
  update(dt) {
    this.t += dt; const t = this.t, input = this.input; G.uTime.value = t;
    input.update();
    if (this.input.touchMode && !this.touchShown) { this.touchShown = true; this.ui.showTouch(true); }
    if (this.state === 'title') {
      this.titleT += dt; const a = 0.6 + this.titleT * 0.06, rad = 30, h = 11 + Math.sin(this.titleT * 0.3) * 1.5; this.camera.position.set(Math.sin(a) * rad - 8, h, Math.cos(a) * rad - 4); this.camera.lookAt(-4, 3, -6);
      this.weather.update(dt, t, this.camera.position); this.world.update(dt, t); this.companion.update(dt, t, this.player); this.player.update(dt, t, { move: new THREE.Vector2(), jump: false }, 0); this.sky.update(t, this.camera.position);
      this.weather.clouds.forEach((c) => c.update(dt, t, this.cloudEnv())); this.tools.aim.hit = null; this.ui.updateBarks(dt, this.camera); return;
    }
    // restore easing
    if (Math.abs(this.restore - this.restoreT) > 0.001) { this.restore = damp(this.restore, this.restoreT, 0.7, dt); this.applyMood(); }
    // shots
    if (this.shotT > 0 && this.shotT < 900) { this.shotT -= dt; if (this.shotT <= 0 && !this.cinematic && this.state !== 'dialogue') this.rig.setShot(null); }
    if (input.wasPressed('KeyF') && this.state === 'play') this.interact();
    this.tools.update(dt, t, input, this.camera);
    this.player.update(dt, t, input, this.rig.yaw);
    this.companion.update(dt, t, this.player);
    const env = this.cloudEnv(); this.weather.clouds.forEach((c) => c.update(dt, t, env));
    this.weather.update(dt, t, this.camera.position); this.world.update(dt, t); this.narr.update(dt, t); this.reactToWeather(dt);
    // camera
    if (this.state === 'dialogue' || this.cinematic) { input.orbit.set(0, 0); }
    this.rig.update(dt, this.player.pos, input, this.player.vel, this.terrain); this.camera.updateMatrixWorld();
    this.lookTarget = this.camera.position;
    this.sky.update(t, this.camera.position);
    // shadows follow player (snap texels)
    const target = this.player.pos, sd = this.sunDir; const k = 2 * this.sun.shadow.camera.right / this.quality.shadow; const sx = Math.round(target.x / k) * k, sy = Math.round(target.y / k) * k, sz = Math.round(target.z / k) * k;
    this.sun.target.position.set(sx, sy, sz); this.sun.position.set(sx + sd.x * 80, sy + sd.y * 80, sz + sd.z * 80); this.sun.target.updateMatrixWorld();
    // ui + audio
    const cp = this.camera.position; for (const c of this.weather.clouds) c.group.visible = c.group.position.distanceToSquared(cp) < 110 * 110; for (const pk of this.world.puffkins) pk.group.visible = pk.pos.distanceToSquared(cp) < 70 * 70;
    this.cull(cp);
    this.ui.updateBarks(dt, this.camera); this.ui.updateDialogue(dt);
    const gp = this.weather.gust.power; let rain = 0; for (const c of this.weather.clouds) rain = Math.max(rain, c.raining * (c.personal ? 0.3 : 1));
    this.audio.update(dt, { restore: this.restore, wind: Math.max(gp, 0.1), rain });
    if (this.state === 'play' && this.input.touchMode) { /* mobile reticle */ }
  }
  /** distance culling for things frustum culling cannot help with (instanced grass, small faces, the far whale) */
  cull(cp) {
    this._cf = (this._cf || 0) + 1; if (this._cf % 6) return;
    if (!this._grass) { this._grass = []; this.scene.traverse((o) => { if (o.userData?.island && o.isGroup) this._grass.push(o); }); }
    for (const g of this._grass) { const i = g.userData.island; g.visible = Math.hypot(cp.x - i.x, cp.z - i.z) < i.r + 70; }
    for (const c of this.weather.clouds) c.faceG.visible = c.group.position.distanceToSquared(cp) < 32 * 32;
    for (const pk of (this.world.puffkins || [])) pk.fg.visible = pk.pos.distanceToSquared(cp) < 28 * 28;
    const wh = this.world.whale; if (wh) wh.group.visible = wh.group.position.distanceToSquared(cp) < 300 * 300;
  }
  cloudEnv() { return { terrain: this.terrain, wind: this.weather, spawnSplash: this.weather.spawnSplash, refill: (p) => this.world.refillAt(p), camDir: { x: this.camera.position.x - this.player.pos.x, z: this.camera.position.z - this.player.pos.z }, lookTarget: this.player.pos.clone().sub(this.camera.position).multiplyScalar(0).add(new THREE.Vector3((this.player.pos.x - 0) * 0, 0, 1)) }; }
  reactToWeather(dt) {
    const c = this.companion, m = c.mood, t = this.t; this._fr ??= { rain: 0, sun: 0, wind: 0, frost: 0 };
    const trig = (k, cond, lines, anim, ex) => { if (cond && c.mood && this.narr.cd('fen' + k, 14) && this.state === 'play') { this.say.fen(lines[(Math.random() * lines.length) | 0]); if (anim) c.fen.play(anim); } };
    trig('rain', m.rain > 0.5 && this.tools.held && this.tools.held.id !== 'fen', S.FEN_RAIN, 'sigh');
    trig('sun', m.sun > 0.4, S.FEN_SUN, 'startle'); trig('wind', m.wind > 0.5, S.FEN_WIND, 'startle'); trig('frost', m.frost > 0.4, S.FEN_FROST, 'shake');
    const p = this.player, w = p.weatherW; if (this.narr.cd('junoWind', 25) && w.wind.length() > 8 && this.state === 'play' && false) this.say.juno('Whoa!');
  }
  /** QA helper: force one render (used with ?norender=1 for real-time headless tests) */
  renderOnce() { this.renderer.render(this.scene, this.camera); }
  /** QA helper: advance the simulation without rendering */
  sim(sec, dt = 1 / 30) { for (let t = 0; t < sec; t += dt) { this.update(dt); this.input.endFrame(); } }
  frame(dtReal) {
    const dt = Math.min(dtReal, 0.05);
    this.update(dt);
    if (!this.noRender) this.renderer.render(this.scene, this.camera);
    this.input.endFrame();
    // adaptive resolution
    this._acc = (this._acc || 0) + dtReal; this._n = (this._n || 0) + 1;
    if (this._acc > 1.2) { const fps = this._n / this._acc; this._acc = 0; this._n = 0; this.fps = fps; if (fps < 38 && this.dpr > 0.8) { this.dpr = Math.max(0.8, this.dpr - 0.2); this.renderer.setPixelRatio(this.dpr); this.renderer.setSize(innerWidth, innerHeight, false); } else if (fps > 58 && this.dpr < this.quality.dpr) { this.dpr = Math.min(this.quality.dpr, this.dpr + 0.1); this.renderer.setPixelRatio(this.dpr); this.renderer.setSize(innerWidth, innerHeight, false); } }
  }
}
