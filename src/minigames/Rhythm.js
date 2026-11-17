import { blob, eyes, text, backdrop, shade } from './clay2d.js';
import { Haptics } from '../core/Haptics.js';
/** Rainbow Rhythm: coloured drops fall down three lanes; tap a lane as its drop lands on the puddle. Streaks paint a rainbow and multiply points. */
const LANES = [
  { c: '#ff6a6a', keys: ['ArrowLeft', 'KeyA', 'KeyJ'], f: 523.25, lab: '←' },
  { c: '#ffcf4a', keys: ['ArrowDown', 'KeyS', 'Space', 'KeyK', 'ArrowUp', 'KeyW', 'Enter'], f: 659.25, lab: '↓' },
  { c: '#6fb8f0', keys: ['ArrowRight', 'KeyD', 'KeyL'], f: 783.99, lab: '→' },
];
const BEAT = 60 / 100, FALL = 1.8, LEN = 40, PERFECT = 0.075, GOOD = 0.17;
const BANDS = ['#ff5a5a', '#ff9a4a', '#ffd84a', '#7ad07a', '#4db8ff', '#7a7aff', '#c07aff'];
export class Rhythm {
  static id = 'rhythm'; static title = 'Rainbow Rhythm'; static blurb = 'Tap each coloured drop as it lands on its puddle. Keep the streak going to paint a rainbow!'; static howto = '← ↓ → / A S D, or tap the three lanes'; static medals = [60, 150, 280];
  constructor(a) { this.a = a; this.t = -1.4; this.score = 0; this.combo = 0; this.best = 0; this.hits = 0; this.notes = this.chart(); this.fx = []; this.flash = [0, 0, 0]; this.beat = -1; }
  get over() { return this.t > LEN + 0.6; }
  chart() {
    const n = []; let prev = 1;
    for (let i = 4; BEAT / 2 * i < LEN - 1; i++) {
      const h = (BEAT / 2) * i, p = h / LEN, on = i % 2 === 0, prob = on ? 0.62 + p * 0.3 : 0.08 + p * 0.42;
      if (Math.random() > prob) continue; let l = Math.floor(Math.random() * 3); if (l === prev && Math.random() < 0.5) l = (l + 1 + Math.floor(Math.random() * 2)) % 3; prev = l;
      n.push({ h, l, s: Math.random() * 99, j: null });
      if (on && p > 0.5 && Math.random() < 0.16) n.push({ h, l: (l + 1 + Math.floor(Math.random() * 2)) % 3, s: Math.random() * 99, j: null });
    }
    return n;
  }
  geo() { const W = this.a.w, H = this.a.h, u = Math.min(W, H) / 20, lw = Math.min(W * 0.3, u * 6.2); return { W, H, u, lw, top: H * 0.13, hit: H * 0.8 }; }
  laneX(i, G = this.geo()) { return G.W / 2 + (i - 1) * G.lw; }
  laneAt(x) { const G = this.geo(); return Math.max(0, Math.min(2, Math.round((x - G.W / 2) / G.lw) + 1)); }
  mult() { return 1 + Math.min(3, Math.floor(this.combo / 8)); }
  hit(l) {
    this.flash[l] = 1; let n = null, d = 1e9; for (const x of this.notes) { if (x.j || x.l !== l) continue; const dd = Math.abs(x.h - this.t); if (dd < d) { d = dd; n = x; } }
    const G = this.geo(), au = this.a.game.audio;
    if (n && d <= GOOD) {
      const perfect = d <= PERFECT; n.j = perfect ? 'perfect' : 'good'; this.combo++; this.best = Math.max(this.best, this.combo); this.hits++;
      const pts = (perfect ? 3 : 1) * this.mult(); this.score += pts; this.fx.push({ x: this.laneX(l, G), y: G.hit - G.u * 2.2, t: 0.6, s: (perfect ? 'Perfect! +' : 'Good +') + pts, c: perfect ? '#fff6a0' : '#e8f4ff' });
      au?.tone?.(LANES[l].f * (perfect ? 1 : 0.5), 0.16, 0.06, 'triangle'); Haptics.sfx(perfect ? 'good' : 'flip');
    } else if (!n || d > 0.32) { if (this.combo > 3) this.fx.push({ x: this.laneX(l, G), y: G.hit - G.u * 2.2, t: 0.5, s: 'Oops', c: '#ffb0b0' }); this.combo = 0; au?.tone?.(150, 0.08, 0.03, 'square'); }
  }
  update(dt, inp) {
    this.t += dt; for (let i = 0; i < 3; i++) this.flash[i] = Math.max(0, this.flash[i] - dt * 5);
    const b = Math.floor(this.t / BEAT); if (b !== this.beat) { this.beat = b; if (this.t > 0 && this.t < LEN) this.a.game.audio?.tone?.(b % 4 === 0 ? 196 : 147, 0.09, 0.025, 'sine'); }
    const lanes = []; for (const c of inp.press || []) LANES.forEach((L, i) => { if (L.keys.includes(c)) lanes.push(i); });
    if (inp.click) lanes.push(this.laneAt(inp.click[0]));
    for (const l of lanes) this.hit(l);
    const G = this.geo(); for (const n of this.notes) if (!n.j && this.t - n.h > GOOD) { n.j = 'miss'; if (this.combo > 0) this.a.sfx('bad'); this.combo = 0; this.fx.push({ x: this.laneX(n.l, G), y: G.hit - G.u * 2.2, t: 0.5, s: 'Miss', c: '#ffb0b0' }); }
    for (const f of this.fx) { f.t -= dt; f.y -= dt * 30; } this.fx = this.fx.filter((f) => f.t > 0);
  }
  draw(ctx) {
    const G = this.geo(), { W, H, u, lw } = G; backdrop(ctx, W, H, '#3c2e62', '#7a5a8a');
    // rainbow arc: one band per 4-note streak
    const bands = Math.min(7, Math.floor(this.combo / 4)); ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) { ctx.strokeStyle = i < bands ? BANDS[i] : 'rgba(255,255,255,.06)'; ctx.lineWidth = u * 0.42; ctx.beginPath(); ctx.arc(W / 2, H * 0.72, Math.min(W * 0.46, u * 14) - i * u * 0.48, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke(); }
    ctx.restore();
    // lanes (soft clay gutters)
    for (let i = 0; i < 3; i++) { const x = this.laneX(i, G); ctx.fillStyle = `rgba(255,255,255,${0.05 + this.flash[i] * 0.12})`; ctx.beginPath(); ctx.roundRect(x - lw * 0.42, G.top - u, lw * 0.84, G.hit - G.top + u * 2.2, u); ctx.fill(); }
    // puddle pads
    for (let i = 0; i < 3; i++) { const x = this.laneX(i, G), k = 1 + this.flash[i] * 0.25; blob(ctx, x, G.hit, u * 1.7 * k, u * 0.75 * k, shade(LANES[i].c, -0.15), 20 + i); blob(ctx, x, G.hit - u * 0.1, u * 1.1 * k, u * 0.38 * k, shade(LANES[i].c, 0.35), 30 + i, { noPrint: true, noGlint: true }); text(ctx, LANES[i].lab, x, G.hit + u * 1.6, u * 0.8, 'rgba(255,246,224,.75)'); }
    // drops
    for (const n of this.notes) { if (n.j === 'perfect' || n.j === 'good') continue; const k = (n.h - this.t) / FALL; if (k > 1.05 || k < -0.25) continue; const x = this.laneX(n.l, G), y = G.hit - k * (G.hit - G.top), a = n.j === 'miss' ? 0.35 : 1; ctx.globalAlpha = a; blob(ctx, x, y, u * 0.75, u * 0.95, LANES[n.l].c, n.s); if (!n.j) eyes(ctx, x, y - u * 0.1, u * 0.2, 0, Math.sin(this.t * 3 + n.s) > 0.97); ctx.globalAlpha = 1; }
    // Puffkin conductor bobbing to the beat
    const bob = Math.abs(Math.sin((Math.PI * Math.max(0, this.t)) / BEAT)); blob(ctx, u * 2.4, H * 0.92 - bob * u * 0.8, u * 1.1, u * (0.95 + bob * 0.1), '#ffb3c7', 5); eyes(ctx, u * 2.5, H * 0.92 - bob * u * 0.8 - u * 0.1, u * 0.25, 1);
    for (const f of this.fx) text(ctx, f.s, f.x, f.y, u * 0.75, f.c);
    text(ctx, `${this.score}`, W / 2, u * 1.3, u * 1.4); text(ctx, `${Math.max(0, Math.ceil(LEN - Math.max(0, this.t)))}s`, Math.min(W - u * 2, W - 74), u * 1.3, u * 0.85);
    if (this.combo >= 4) text(ctx, `streak ${this.combo}  ×${this.mult()}`, u * 0.8, u * 1.3, u * 0.75, '#ffe680', 'left');
    if (this.t < 0.4) text(ctx, this.t < -0.5 ? 'Get ready…' : 'Tap on the puddles!', W / 2, H * 0.45, u * 1.1, '#fff6c0');
  }
}
