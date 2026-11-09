import * as THREE from 'three';
import { clamp, damp } from './Utils.js';
export const TOOLS = [
  { id: 'cloud', name: 'Cloud', key: '1', color: '#ffffff', hint: 'Click a cloud to pick it up. Click again to let go. Wheel / Q / E squashes and stretches it.' },
  { id: 'rain', name: 'Rain', key: '2', color: '#7fc8ff', hint: 'Hold to rain from the cloud you are holding.' },
  { id: 'wind', name: 'Wind', key: '3', color: '#c9f0e0', hint: 'Hold to blow a gust towards your cursor.' },
  { id: 'sun', name: 'Sun', key: '4', color: '#ffd873', hint: 'Hold to bounce sunlight from a mirror to your cursor.' },
  { id: 'frost', name: 'Frost', key: '5', color: '#aee4ff', hint: 'Hold to breathe frost towards your cursor.' },
];
const _o = new THREE.Vector3(), _d = new THREE.Vector3(), _v = new THREE.Vector3(), _ray = new THREE.Raycaster();
/** Pointer aiming + all five weather tools. */
export class Tools {
  constructor(game) {
    this.game = game; this.index = 0; this.held = null; this.aim = { point: new THREE.Vector3(0, 0, -10), hit: null, hitType: null, ground: false }; this.usingWind = false; this.usingRain = false; this.holdingCloud = false;
    this.reticle = new THREE.Vector2(0, 0.08); this.glow = 0; this.cooldown = 0; this.onGrab = null; this.firstUse = {}; this.sunUsing = false; this.aimLine = null;
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending })); this.ring.renderOrder = 8; game.scene.add(this.ring);
  }
  get tool() { return TOOLS[this.index].id; }
  select(i) { if (i === this.index) return; this.index = clamp(i, 0, TOOLS.length - 1); this.game.ui.setTool(this.index); this.game.audio?.sfx('tool'); }
  computeAim(input, camera) {
    const g = this.game; const ndc = input.tap ? input.pointer : (input.touchMode || !input.hasPointer ? this.reticle : input.pointer);
    _ray.setFromCamera(ndc, camera); const ro = _ray.ray.origin, rd = _ray.ray.direction;
    let best = Infinity, hit = null, type = null;
    const test = (center, rad, obj, ty) => { if (type === 'cloud') return; _v.subVectors(center, ro); const t = _v.dot(rd); if (t < 0 || t > 90) return; const dd = _v.sub(_o.copy(rd).multiplyScalar(t)).length(); if (dd < rad && t < best) { best = t; hit = obj; type = ty; } };
    let cBest = Infinity, cHit = null; for (const c of g.weather.clouds) { _v.subVectors(c.pos, ro); const t = _v.dot(rd); if (t < 0 || t > 90) continue; const dd = _v.sub(_o.copy(rd).multiplyScalar(t)).length(); if (dd < c.footprint * 0.85 + 0.4 && t < cBest) { cBest = t; cHit = c; } }
    const m = g.world.mirror; test(_v.copy(m.pos).add(new THREE.Vector3(0, 2.4, 0)), 1.9, m, 'mirror');
    for (const p of g.world.puffkins) test(_o.copy(p.pos).add(new THREE.Vector3(0, 0.5, 0)), 0.8, p, 'puffkin');
    test(_o.copy(g.companion.pos).add(new THREE.Vector3(0, 1.1, 0)), 1.0, g.companion, 'fen');
    test(_o.copy(g.world.jarPos).add(new THREE.Vector3(0, 3.2, 0)), 2.4, g.world.jar, 'jar');
    for (const gl of g.world.glints) if (!gl.got) test(gl.pos, 0.9, gl, 'glint');
    if (cHit) { best = cBest; hit = cHit; type = 'cloud'; } // clouds are easy to pick: they win over creatures/props in front of them
    // ground march
    let gp = null; for (let t = 1; t < 120; t += 0.6) { const x = ro.x + rd.x * t, y = ro.y + rd.y * t, z = ro.z + rd.z * t; const top = g.terrain.topAt(x, z); if (top > -Infinity && y <= top + 0.1) { gp = { x, y: top, z, t }; break; } }
    const aim = this.aim; aim.hit = hit; aim.hitType = type;
    if (gp && gp.t < best) { aim.point.set(gp.x, gp.y, gp.z); aim.ground = true; aim.hit = type === 'cloud' ? aim.hit : null; if (!(hit && best < gp.t)) { aim.hit = null; aim.hitType = null; } }
    if (hit && best <= (gp ? gp.t : Infinity)) { aim.point.copy(ro).addScaledVector(rd, best); aim.ground = false; }
    else if (!gp) { aim.point.copy(ro).addScaledVector(rd, 28); aim.ground = false; }
    if (hit && type !== 'cloud' && gp) { aim.point.set(gp.x, gp.y, gp.z); aim.ground = true; } // pointing through a creature/prop still aims at the ground behind it
    aim.dist = best;
    return aim;
  }
  update(dt, t, input, camera) {
    const g = this.game, p = g.player, aim = g.debugAim || this.computeAim(input, camera), w = g.weather;
    // tool select
    TOOLS.forEach((tl, i) => { if (input.wasPressed('Digit' + (i + 1)) || input.wasPressed('Numpad' + (i + 1))) this.select(i); });
    if (input.wasPressed('Tab')) this.select((this.index + 1) % TOOLS.length);
    const locked = g.state !== 'play' || p.locked;
    const useDown = !locked && (input.down || input.useHeld), useJust = !locked && (input.justDown || input.tapUse || input.tap);
    const tool = this.tool; const origin = _o.set(p.pos.x, p.pos.y + 1.0, p.pos.z);
    // --- cloud grabbing is available with the Cloud tool AND by clicking any cloud
    const clickCloud = useJust && aim.hitType === 'cloud' && (tool === 'cloud' || tool === 'rain');
    if (clickCloud && !this.held) this.grab(aim.hit);
    else if (useJust && tool === 'cloud' && this.held && !(aim.hitType === 'cloud' && aim.hit === this.held)) this.drop();
    else if (useJust && tool === 'cloud' && this.held && aim.hit === this.held) this.drop();
    // stretch
    const sq = (input.zoom ? -input.zoom * 0.18 : 0) + ((input.keys.has('KeyE') || input.stretchHeld > 0) ? dt * 0.9 : 0) - ((input.keys.has('KeyQ') || input.stretchHeld < 0) ? dt * 0.9 : 0);
    if (this.held && sq) { this.held.squeeze(sq); if (input.zoom) input.zoom = 0; }
    // held cloud follows
    this.holdingCloud = !!this.held; g.cloudHeld = !!this.held;
    if (this.held) {
      const c = this.held; const dx = aim.point.x - p.pos.x, dz = aim.point.z - p.pos.z; const dist = Math.hypot(dx, dz), maxD = 26; const k = dist > maxD ? maxD / dist : 1;
      const tx = p.pos.x + dx * k, tz = p.pos.z + dz * k; const top = Math.max(g.terrain.topAt(tx, tz), p.pos.y);
      c.target = c.target || new THREE.Vector3(); c.target.set(tx, Math.max(top, aim.ground ? aim.point.y : top) + 4.6 + (c.stretch - 1) * 0.4, tz);
      c.rainOn = tool === 'rain' && useDown; c.rainTarget = 1; this.usingRain = c.rainOn;
      if (c.rainOn && c.moisture <= 0.01 && useJust) g.ui.toast('This cloud has run dry — let it rest, or park it near a rising waterfall.');
      if (c.rainOn) { p.facing = Math.atan2(c.pos.x - p.pos.x, c.pos.z - p.pos.z); p.juno.aim('L', _v.set(0.2, 1.3, 0.8).normalize()); p.juno.aim('R', _v.set(-0.2, 1.3, 0.8).normalize()); }
      else p.juno.aim('R', new THREE.Vector3(Math.sin(Math.atan2(dx, dz) - p.yaw) * 0.5, 0.9, Math.cos(Math.atan2(dx, dz) - p.yaw) * 0.5).normalize());
      g.ui.setMeter(c.moisture, c);
    } else { this.usingRain = false; g.ui.setMeter(null); }
    for (const c of w.clouds) if (c !== this.held && c.personal) { c.rainOn = true; c.rainTarget = 0.34; } else if (c !== this.held) c.rainOn = false;
    // wind
    this.usingWind = false; let gust = false, frost = false;
    const aimDir = _d.subVectors(aim.point, origin); aimDir.y *= 0.35; if (aimDir.lengthSq() < 0.01) aimDir.set(Math.sin(p.yaw), 0, Math.cos(p.yaw)); aimDir.normalize();
    if (tool === 'wind' && useDown) { gust = true; this.usingWind = true; p.facing = Math.atan2(aimDir.x, aimDir.z); const loc = _v.copy(aimDir).applyAxisAngle(new THREE.Vector3(0, 1, 0), -p.yaw); p.juno.aim('L', loc.clone().add(new THREE.Vector3(-0.2, 0, 0)).normalize()); p.juno.aim('R', loc.clone().add(new THREE.Vector3(0.2, 0, 0)).normalize()); p.setExpr('cringe', 0.2); }
    w.setGust(gust, _v.copy(origin).addScaledVector(aimDir, 0.9), aimDir); w.gust.strength = 17;
    if (tool === 'frost' && useDown) { frost = true; p.facing = Math.atan2(aimDir.x, aimDir.z); const loc = _v.copy(aimDir).applyAxisAngle(new THREE.Vector3(0, 1, 0), -p.yaw); p.juno.aim('R', loc.clone().normalize()); p.setExpr('smug', 0.2); }
    w.setFrost(frost, _v.copy(origin).addScaledVector(aimDir, 0.7), aimDir);
    // sun: aim nearest mirror at cursor
    this.sunUsing = false; const m = g.world.mirror;
    if (tool === 'sun' && useDown && g.world.mirrorActive !== false) {
      const dm = Math.hypot(m.pos.x - p.pos.x, m.pos.z - p.pos.z);
      if (dm < 30) { const yaw = Math.atan2(aim.point.x - m.pos.x, aim.point.z - m.pos.z); let d = yaw - m.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); m.yaw += d * Math.min(1, dt * 3.5); this.sunUsing = true; p.facing = Math.atan2(m.pos.x - p.pos.x, m.pos.z - p.pos.z); p.juno.aim('R', _v.set(Math.sin(Math.atan2(m.pos.x - p.pos.x, m.pos.z - p.pos.z) - p.yaw), 0.5, Math.cos(Math.atan2(m.pos.x - p.pos.x, m.pos.z - p.pos.z) - p.yaw)).normalize()); p.setExpr('excited', 0.25); }
      else if (useJust) g.ui.toast('Get closer to the sun mirror to aim it.');
    }
    if (tool === 'sun' && (input.keys.has('KeyQ') || input.keys.has('KeyE') || input.stretchHeld)) { const dm = Math.hypot(m.pos.x - p.pos.x, m.pos.z - p.pos.z); if (dm < 30) m.yaw += ((input.keys.has('KeyE') || input.stretchHeld > 0 ? -1 : 1) * dt * 1.2); }
    // cursor ring
    this.ring.visible = !locked && aim.ground && (tool !== 'cloud' || !!aim.hit === false); this.ring.position.copy(aim.point).add(new THREE.Vector3(0, 0.08, 0)); const s = 1 + Math.sin(t * 5) * 0.06; this.ring.scale.setScalar((useDown ? 1.3 : 1) * s * (tool === 'rain' && this.held ? this.held.footprint * 0.9 : 1)); this.ring.material.color.set(TOOLS[this.index].color);
    // first-use hooks
    if (useDown && !this.firstUse[tool]) { this.firstUse[tool] = true; g.story?.onToolFirstUse?.(tool); }
    // cursor style
    g.canvas.style.cursor = aim.hitType === 'cloud' || aim.hitType === 'mirror' || aim.hitType === 'puffkin' || aim.hitType === 'fen' || aim.hitType === 'jar' || aim.hitType === 'glint' ? 'pointer' : 'crosshair';
    g.ui.setHover(aim.hitType, aim.hit);
    // poke creatures
    if (useJust && aim.hitType === 'puffkin') { aim.hit.poke(); g.audio?.sfx('squeak'); g.say?.onPuffkin(aim.hit); }
    if (useJust && aim.hitType === 'fen') g.say?.onFen();
    if (useJust && aim.hitType === 'jar') g.puzzles?.onJar();
    if (useJust && aim.hitType === 'mirror' && tool !== 'sun') g.ui.toast('Select the Sun tool (4), then hold the mouse to aim the mirror.');
    input.tapUse = false;
  }
  grab(c) {
    if (this.held) this.drop(); this.held = c; c.held = true; c.homeTimer = 0; c.grab = 0; c.face.set('surprised'); this.game.audio?.sfx('grab'); this.game.say?.onGrab(c); this.game.puzzles?.onGrab?.(c);
  }
  drop() { const c = this.held; if (!c) return; c.held = false; c.rainOn = false; c.homeTimer = 0; this.held = null; c.target = null; this.game.say?.onDrop(c); }
}
