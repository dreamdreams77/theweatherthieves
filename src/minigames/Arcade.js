import * as THREE from 'three';
import { Progress } from '../core/Progress.js';
import { Settings } from '../core/Settings.js';
import { std } from '../gfx/Mat.js';
import { setBoil, text } from './clay2d.js';
import { Catch } from './Catch.js';
import { Glide } from './Glide.js';
import { Match } from './Match.js';

const _free = (o) => o.traverse((m) => { m.geometry?.dispose(); [].concat(m.material || []).forEach((x) => { x.map?.dispose(); x.dispose(); }); });
export const GAMES = [Catch, Glide, Match];

/** The Puffkin Arcade: a striped booth in every chapter that opens three clay-style mini games in an overlay. */
export class Arcade {
  constructor(game) {
    this.game = game; this.open = false; this.cur = null; this.booth = null; this.inp = this.freshInput(); this.usedKeys = false;
    const el = document.createElement('div'); el.id = 'arcade'; el.className = 'hidden'; el.innerHTML = `<canvas id="arcadeCv"></canvas>
      <div id="arcMenu" class="panel"><h2>Puffkin Arcade</h2><p class="sub">Run by Pib's cousin Pob. Tickets are free; pride is not.</p><div id="arcList"></div><button id="arcClose" class="pill">Back to the world <kbd>Esc</kbd></button></div>
      <div id="arcEnd" class="panel hidden"><h2 id="arcEndT"></h2><p id="arcEndS"></p><div class="row"><button id="arcAgain" class="pill">Play again <kbd>Space</kbd></button><button id="arcBack" class="pill">Arcade menu</button></div></div>
      <button id="arcQuit" class="pill hidden" aria-label="Quit mini game">✕</button>`;
    document.body.appendChild(el); this.el = el; this.cv = el.querySelector('canvas'); this.ctx = this.cv.getContext('2d');
    el.querySelector('#arcClose').onclick = () => this.close(); el.querySelector('#arcQuit').onclick = () => this.menu(); el.querySelector('#arcBack').onclick = () => this.menu(); el.querySelector('#arcAgain').onclick = () => this.play(this.last);
    addEventListener('keydown', (e) => this.key(e, true), true); addEventListener('keyup', (e) => this.key(e, false), true);
    const pt = (e) => { const r = this.cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    this.cv.addEventListener('pointerdown', (e) => { if (!this.cur) return; e.preventDefault(); this.usedKeys = false; const p = pt(e); (this.clicks ??= []).push(p); this.inp.pointer = p[0]; this.dragging = true; });
    this.cv.addEventListener('pointermove', (e) => { if (this.cur && this.dragging) this.inp.pointer = pt(e)[0]; });
    addEventListener('pointerup', () => { this.dragging = false; if (this.inp) this.inp.pointer = null; });
    addEventListener('resize', () => this.resize());
  }
  freshInput() { return { left: false, right: false, tap: false, click: null, nav: 0, pointer: null }; }
  key(e, down) {
    if (!this.open) return; e.stopImmediatePropagation(); if (down) e.preventDefault(); const c = e.code;
    if (c === 'ArrowLeft' || c === 'KeyA') { this.inp.left = down; if (down) this.inp.nav = -1; } if (c === 'ArrowRight' || c === 'KeyD') { this.inp.right = down; if (down) this.inp.nav = 1; }
    if (down && (c === 'ArrowUp' || c === 'KeyW')) this.inp.nav = -4; if (down && (c === 'ArrowDown' || c === 'KeyS')) this.inp.nav = 4; if (down && c.startsWith('Arrow')) this.usedKeys = true;
    if (!down || e.repeat) return;
    if (c === 'Escape') { if (this.cur) this.menu(); else this.close(); return; }
    if (c === 'Space' || c === 'Enter' || c === 'KeyF') { if (this.cur && !this.ended) this.inp.tap = true; else if (this.ended) this.play(this.last); }
    if (!this.cur && /^Digit[1-3]$/.test(c)) this.play(GAMES[+c.slice(5) - 1]);
  }
  best(id) { return (Progress.data.arcade || {})[id] || 0; }
  /** booth beside the chapter's trial stone */
  setup() {
    const g = this.game; if (this.booth) { g.scene.remove(this.booth); _free(this.booth); this.booth = null; } const s = g.trials.stonePos; if (!s) return;
    const sp = g.world.spawn || [3, 8], dx = s.x - sp[0], dz = s.z - sp[1], dl = Math.hypot(dx, dz) || 1, ux = dx / dl, uz = dz / dl; // beyond the stone, away from the spawn (never between the camera and the player)
    let x = s.x + ux * 3.5 - uz * 2, z = s.z + uz * 3.5 + ux * 2; for (let i = 0; i < 12; i++) { const gr = g.terrain.groundAt(x, z, s.y + 6, 20); if (gr && Math.abs(gr.y - s.y) < 2 && !g.terrain.colliders.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + 1.6)) break; const a = Math.atan2(uz, ux) + (i % 2 ? 1 : -1) * (0.35 + i * 0.18); x = s.x + Math.cos(a) * 4.5; z = s.z + Math.sin(a) * 4.5; }
    const y = g.terrain.groundAt(x, z, s.y + 6, 20)?.y ?? s.y, b = new THREE.Group(); b.position.set(x, y, z); b.rotation.y = Math.atan2(s.x - x, s.z - z) + Math.PI;
    const stripes = 10, R = 1.25; for (let i = 0; i < stripes; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, R, 1.1, 3, 1, true, (i / stripes) * Math.PI * 2, Math.PI * 2 / stripes), std({ color: i % 2 ? 0xffefd8 : 0xe8607a, side: THREE.DoubleSide, roughness: 0.8 })); m.position.y = 2.35; m.castShadow = true; b.add(m); }
    const counter = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.95, R, 1.0, 16), std({ color: 0x9a6a4a, roughness: 0.85 })); counter.position.y = 0.5; counter.castShadow = true; b.add(counter);
    for (const [px, pz] of [[0.9, 0.9], [-0.9, 0.9], [0.9, -0.9], [-0.9, -0.9]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 6), std({ color: 0xffefd8 })); p.position.set(px * 0.85, 1.0 + 0.9 * 0.5, pz * 0.85); b.add(p); }
    const pob = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 14), std({ color: 0xffb3c7, roughness: 0.7 })); pob.position.set(0, 1.35, 0); b.add(pob); this.pob = pob;
    for (const d of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), std({ color: 0x231a28 })); e.position.set(d * 0.14, 1.45, -0.37); b.add(e); }
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const c = cv.getContext('2d'); c.fillStyle = '#3a2848'; c.fillRect(0, 0, 256, 64); c.font = '800 34px Baloo 2, system-ui'; c.fillStyle = '#ffe680'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ARCADE', 128, 34);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv) })); sign.position.set(0, 1.15, -1.02); sign.rotation.y = Math.PI; b.add(sign);
    const back = sign.clone(); back.position.z = 1.02; back.rotation.y = 0; b.add(back);
    g.scene.add(b); this.booth = b; this.pos = new THREE.Vector3(x, y, z); g.terrain.addCollider({ x, z, r: 1.2 });
  }
  update(dt, t) { if (this.pob) { this.pob.position.y = 1.35 + Math.abs(Math.sin(t * 3)) * 0.12; this.pob.scale.set(1 + Math.sin(t * 6) * 0.03, 1 - Math.sin(t * 6) * 0.03, 1); } }
  near() { const p = this.game.player.pos; return this.pos && Math.hypot(p.x - this.pos.x, p.z - this.pos.z) < 3.4; }
  interact() { if (!this.near()) return false; this.openMenu(); return true; }
  openMenu() {
    const g = this.game; if (this.open) return; if (g.trials?.active) { g.ui.toast('Finish (or cancel) your Weather Trial first.'); return; }
    this.open = true; g.arcadeOpen = true; this.el.classList.remove('hidden'); this.resize(); this.menu(); g.audio.sfx?.('tool');
    if (!this._loop) { let last = performance.now(); const loop = (now) => { if (!this.open) { this._loop = null; return; } const dt = Math.min(0.05, (now - last) / 1000); last = now; this.step(dt); this._loop = requestAnimationFrame(loop); }; this._loop = requestAnimationFrame(loop); }
  }
  close() { this.open = false; this.game.arcadeOpen = false; this.cur = null; this.el.classList.add('hidden'); }
  menu() {
    this.cur = null; this.ended = false; this.q('#arcEnd').classList.add('hidden'); this.q('#arcQuit').classList.add('hidden'); this.q('#arcMenu').classList.remove('hidden');
    const L = this.q('#arcList'); L.innerHTML = ''; GAMES.forEach((G, i) => { const b = document.createElement('button'); b.className = 'arcGame'; b.dataset.id = G.id; b.innerHTML = `<b>${i + 1}. ${G.title}</b><span>${G.blurb}</span><small>${G.howto} · best ${this.best(G.id)}</small>`; b.onclick = () => this.play(G); L.appendChild(b); });
  }
  play(G) { this.last = G; this.cur = new G(this); this.ended = false; this.inp = this.freshInput(); this.clicks = []; this.q('#arcMenu').classList.add('hidden'); this.q('#arcEnd').classList.add('hidden'); this.q('#arcQuit').classList.remove('hidden'); this.sfx('flip'); }
  step(dt) {
    const c = this.cur, ctx = this.ctx; this.t = (this.t || 0) + dt; setBoil(this.t, Settings.data.reduceMotion);
    if (!c) { ctx.fillStyle = '#21182c'; ctx.fillRect(0, 0, this.w, this.h); return; }
    if (!this.ended) { const q = this.clicks; if (q?.length && !c.busy) { this.inp.click = q.shift(); this.inp.tap = true; } c.update(dt, this.inp); this.inp.tap = false; this.inp.click = null; this.inp.nav = 0; if (c.over) this.end(); }
    c.draw(ctx);
  }
  end() {
    const c = this.cur, id = this.last.id, prev = this.best(id), best = c.score > prev || !(id in (Progress.data.arcade || {})); this.ended = true; this.lastScore = c.score;
    if (best) { (Progress.data.arcade ??= {})[id] = c.score; Progress.save(); }
    this.q('#arcEndT').textContent = best && c.score > 0 ? 'New best!' : 'Nice try!'; this.q('#arcEndS').textContent = `${this.last.title}: ${c.score} point${c.score === 1 ? '' : 's'}${prev && !best ? ` · best ${prev}` : ''}`;
    this.q('#arcEnd').classList.remove('hidden'); this.sfx(best ? 'gold' : 'end');
    const g = this.game, n = (Progress.data.arcade || {}); if (Object.keys(n).length === GAMES.length && !Progress.data.flags?.arcadeAll) { (Progress.data.flags ??= {}).arcadeAll = true; Progress.save(); g.ui.toast('You have played every arcade game! Pob is delighted.'); }
  }
  sfx(k) { const a = this.game.audio; if (!a?.tone) return; ({ good: () => a.tone(880, 0.09, 0.07, 'triangle'), gold: () => { a.tone(988, 0.1, 0.07, 'triangle'); a.tone(1318, 0.18, 0.07, 'triangle', 0, 0.08); }, bad: () => a.tone(180, 0.25, 0.08, 'square', -80), flap: () => a.tone(420, 0.08, 0.05, 'sine', 260), flip: () => a.tone(620, 0.05, 0.05, 'triangle'), end: () => a.tone(330, 0.3, 0.07, 'triangle', -60) })[k]?.(); }
  resize() { const d = Math.min(2, devicePixelRatio || 1); this.w = innerWidth; this.h = innerHeight; this.cv.width = this.w * d; this.cv.height = this.h * d; this.cv.style.width = this.w + 'px'; this.cv.style.height = this.h + 'px'; this.ctx.setTransform(d, 0, 0, d, 0, 0); }
  q(s) { return this.el.querySelector(s); }
}
