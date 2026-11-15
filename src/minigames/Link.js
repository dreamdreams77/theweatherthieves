import { blob, eyes, text, backdrop, shade } from './clay2d.js';
import { Haptics } from '../core/Haptics.js';
/** Lightning Link: charged clouds crackle with a colour; send each one's bolt to the copper rod of the same colour before its fuse runs out. */
const COLS = ['#ffd84a', '#6fe0ff', '#ff8ac8'], NAMES = ['yellow', 'blue', 'pink'], LEN = 45;
export class Link {
  static id = 'link'; static title = 'Lightning Link'; static blurb = 'Charged clouds are about to fizzle! Zap each one into the rod of its colour.'; static howto = 'Tap/drag a cloud to its rod · keys: ← ↓ → zap the glowing cloud, ↑ switches';
  static medals = [15, 35, 60];
  constructor(a) { this.a = a; this.clouds = []; this.score = 0; this.lives = 3; this.time = LEN; this.t = 0; this.next = 0.4; this.sel = null; this.pick = false; this.bolts = []; this.fx = []; this.endT = 0; this.links = 0; this.n = 0; }
  get dead() { return this.lives <= 0 || this.time <= 0; }
  get over() { return this.dead && this.endT > 1; }
  geo() { const W = this.a.w, H = this.a.h, u = Math.min(W, H) / 20, gap = Math.min(W * 0.31, u * 8); return { W, H, u, gap, rodY: H * 0.84, r: u * 1.55 }; }
  rodX(i, g = this.geo()) { return g.W / 2 + (i - 1) * g.gap; }
  rodAt(x, y, g = this.geo()) { if (y < g.H * 0.68) return -1; const i = Math.round((x - g.W / 2) / g.gap) + 1; return i >= 0 && i <= 2 && Math.abs(x - this.rodX(i, g)) < g.gap * 0.5 ? i : -1; }
  cloudAt(x, y, g = this.geo()) { let best = null, bd = g.r * 1.45; for (const c of this.clouds) { const d = Math.hypot(c.x * g.W - x, c.y * g.H - y); if (d < bd) { bd = d; best = c; } } return best; }
  spawn() {
    const g = this.geo(), max = Math.min(5, 2 + Math.floor(this.t / 11)); if (this.clouds.length >= max) return;
    for (let k = 0; k < 20; k++) {
      const x = 0.14 + Math.random() * 0.72, y = 0.2 + Math.random() * 0.4; if (this.clouds.some((c) => Math.hypot((c.x - x) * g.W, (c.y - y) * g.H) < g.r * 2.6)) continue;
      const fuse = Math.max(3.3, 6 - this.t * 0.06); this.clouds.push({ x, y, c: Math.floor(Math.random() * 3), fuse, left: fuse, s: Math.random() * 99, id: ++this.n, in: 0 }); return;
    }
  }
  current() { if (!this.sel || !this.clouds.includes(this.sel)) { this.sel = this.clouds.reduce((a, c) => (!a || c.left < a.left ? c : a), null); this.pick = false; } return this.sel; }
  fire(i) {
    const c = this.current(), g = this.geo(); if (!c) return; this.clouds = this.clouds.filter((x) => x !== c); this.sel = null;
    const from = [c.x * g.W, c.y * g.H + g.r * 0.6], to = [this.rodX(i, g), g.rodY - g.u * 1.6];
    if (c.c === i) {
      const pts = 1 + Math.ceil((c.left / c.fuse) * 3); this.score += pts; this.links++; this.bolts.push({ from, to, t: 0.35, c: COLS[i], seed: Math.random() * 99 }); this.fx.push({ x: to[0], y: to[1] - g.u, t: 0.8, s: '+' + pts, c: '#fff6a0' });
      this.a.sfx(pts >= 4 ? 'gold' : 'good'); Haptics.sfx('bolt'); this.a.game.audio?.tone?.(1200, 0.12, 0.05, 'sawtooth', -600);
    } else { this.lives--; this.fx.push({ x: from[0], y: from[1], t: 0.9, s: `Wrong rod — ${NAMES[c.c]}!`, c: '#ffb0b0' }); this.puff(from); this.a.sfx('bad'); }
  }
  puff(p) { for (let k = 0; k < 6; k++) this.fx.push({ x: p[0] + (Math.random() - 0.5) * 40, y: p[1] + (Math.random() - 0.5) * 20, t: 0.6, s: '·', c: '#9a8aa8', puff: true }); }
  update(dt, inp) {
    const g = this.geo(); this.t += dt;
    for (const f of this.fx) { f.t -= dt; f.y -= dt * 30; } this.fx = this.fx.filter((f) => f.t > 0); for (const b of this.bolts) b.t -= dt; this.bolts = this.bolts.filter((b) => b.t > 0);
    if (this.dead) { this.endT += dt; return; }
    this.time -= dt; this.next -= dt; if (this.next <= 0) { this.next = Math.max(0.75, 1.7 - this.t * 0.022); this.spawn(); }
    for (const c of this.clouds) { c.left -= dt; c.in = Math.min(1, c.in + dt * 4); c.x += Math.sin(this.t * 0.8 + c.s) * dt * 0.006; }
    for (const c of [...this.clouds]) if (c.left <= 0) { this.clouds = this.clouds.filter((x) => x !== c); this.lives--; this.fx.push({ x: c.x * g.W, y: c.y * g.H, t: 0.8, s: 'Fizzle…', c: '#c8b8d8' }); this.puff([c.x * g.W, c.y * g.H]); this.a.sfx('bad'); if (this.sel === c) this.sel = null; }
    for (const k of inp.press || []) {
      if (k === 'ArrowLeft' || k === 'KeyA') this.fire(0); else if (k === 'ArrowDown' || k === 'KeyS') this.fire(1); else if (k === 'ArrowRight' || k === 'KeyD') this.fire(2);
      else if (k === 'ArrowUp' || k === 'KeyW' || k === 'Space' || k === 'Tab' || k === 'KeyE') { const cs = [...this.clouds].sort((a, b) => a.x - b.x), cur = this.current(); if (cs.length) { this.sel = cs[(cs.indexOf(cur) + 1) % cs.length]; this.pick = true; this.a.sfx('flip'); } }
    }
    if (inp.click) { const [x, y] = inp.click, c = this.cloudAt(x, y, g); if (c) { this.sel = c; this.pick = true; this.drag = true; this.a.sfx('flip'); } else { const r = this.rodAt(x, y, g); if (r >= 0) this.fire(r); } }
    if (inp.release) { const r = this.drag ? this.rodAt(inp.release[0], inp.release[1], g) : -1; if (r >= 0 && this.sel) this.fire(r); this.drag = false; }
    this.ptr = this.drag ? inp.ptr : null; this.current();
  }
  zig(ctx, a, b, seed, w, col) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); const n = 7; for (let k = 1; k < n; k++) { const f = k / n, j = (Math.sin(seed + k * 12.9 + Math.floor(this.t * 12) * 3.1) * 0.5) * 26; ctx.lineTo(a[0] + (b[0] - a[0]) * f + j, a[1] + (b[1] - a[1]) * f); } ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  draw(ctx) {
    const g = this.geo(), { W, H, u, r } = g; backdrop(ctx, W, H, '#2a2448', '#4a3a5a');
    blob(ctx, W / 2, H * 1.02, W * 0.7, H * 0.12, '#5a5048', 7);
    // rods
    for (let i = 0; i < 3; i++) { const x = this.rodX(i, g), y = g.rodY; ctx.fillStyle = '#b8743a'; ctx.strokeStyle = 'rgba(30,18,30,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x - u * 0.22, y - u * 1.4, u * 0.44, u * 3, u * 0.2); ctx.fill(); ctx.stroke(); blob(ctx, x, y + u * 1.5, u * 1.3, u * 0.5, '#7a6a5e', 40 + i); blob(ctx, x, y - u * 1.6, u * 0.62, u * 0.62, COLS[i], 50 + i); }
    // drag line
    const sel = this.current();
    if (this.ptr && sel) this.zig(ctx, [sel.x * W, sel.y * H], this.ptr, 3, 3, 'rgba(255,255,255,.7)');
    for (const b of this.bolts) { this.zig(ctx, b.from, b.to, b.seed, u * 0.5, 'rgba(255,255,255,.5)'); this.zig(ctx, b.from, b.to, b.seed, u * 0.18, b.c); }
    // clouds with fuse rings
    for (const c of this.clouds) {
      const x = c.x * W, y = c.y * H, k = c.in, f = c.left / c.fuse, shake = f < 0.3 ? Math.sin(this.t * 50 + c.s) * 2 : 0, s = r * (0.6 + 0.4 * k);
      if (c === sel) { ctx.strokeStyle = '#fff6c0'; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.arc(x, y, s * 1.55, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = u * 0.28; ctx.beginPath(); ctx.arc(x, y, s * 1.3, 0, 7); ctx.stroke();
      ctx.strokeStyle = f < 0.3 ? '#ff7a7a' : COLS[c.c]; ctx.beginPath(); ctx.arc(x, y, s * 1.3, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); ctx.stroke();
      blob(ctx, x + shake - s * 0.5, y + s * 0.1, s * 0.7, s * 0.55, shade(COLS[c.c], -0.45), c.s + 1, { noGlint: true }); blob(ctx, x + shake + s * 0.5, y + s * 0.1, s * 0.7, s * 0.55, shade(COLS[c.c], -0.45), c.s + 2, { noGlint: true }); blob(ctx, x + shake, y - s * 0.15, s * 0.85, s * 0.7, shade(COLS[c.c], -0.3), c.s);
      eyes(ctx, x + shake, y - s * 0.1, s * 0.2, Math.sign(this.rodX(c.c, g) - x) * 0.8, false);
      if (Math.sin(this.t * 17 + c.s) > 0.5) { ctx.strokeStyle = COLS[c.c]; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x - s * 0.2, y + s * 0.55); ctx.lineTo(x + s * 0.05, y + s * 0.85); ctx.lineTo(x - s * 0.1, y + s * 0.95); ctx.lineTo(x + s * 0.15, y + s * 1.25); ctx.stroke(); }
    }
    for (const f of this.fx) { if (f.puff) { ctx.globalAlpha = f.t; blob(ctx, f.x, f.y, u * 0.5, u * 0.4, '#8a7a98', f.x, { noGlint: true, noPrint: true }); ctx.globalAlpha = 1; } else text(ctx, f.s, f.x, f.y, u * 0.75, f.c); }
    text(ctx, `${this.score}`, W / 2, u * 1.3, u * 1.4); text(ctx, `${Math.max(0, Math.ceil(this.time))}s`, W - u * 2, u * 1.3, u * 0.85); text(ctx, '⚡'.repeat(Math.max(0, this.lives)), u * 2.4, u * 1.3, u * 0.85, '#ffe14a');
    if (this.t < 3) text(ctx, 'Match each cloud to its rod!', W / 2, H * 0.66, u * 0.85, '#fff6c0');
  }
}
