import { blob, text, backdrop } from './clay2d.js';
/** Weather Pairs: flip clay tiles to match weather symbols. Fewer flips and less time = more points. */
const ICONS = ['sun', 'rain', 'snow', 'wind', 'bolt', 'rainbow', 'cloud', 'moon'];
export class Match {
  static id = 'match'; static title = 'Weather Pairs'; static blurb = 'Flip clay tiles and match the weather. Fewer flips, more points.'; static howto = 'Click / tap tiles, or arrows + Space';
  constructor(a) { this.a = a; const d = [...ICONS, ...ICONS].sort(() => Math.random() - 0.5); this.tiles = d.map((k, i) => ({ k, up: false, done: false, f: 0, s: i * 7 + 3 })); this.open = []; this.flips = 0; this.t = 0; this.wait = 0; this.cur = 0; this.fin = 0; this.score = 0; }
  get busy() { return this.wait > 0; }
  get over() { return this.fin > 1.2; }
  layout() { const W = this.a.w, H = this.a.h, port = H > W, cols = port ? 4 : 4, rows = 4, cs = Math.min((W * 0.92) / cols, (H * 0.74) / rows), x0 = (W - cs * cols) / 2, y0 = H * 0.17 + (H * 0.8 - cs * rows) / 2; return { cols, cs, x0, y0 }; }
  update(dt, inp) {
    this.t += dt; for (const t of this.tiles) t.f += ((t.up || t.done ? 1 : 0) - t.f) * Math.min(1, dt * 12);
    if (this.tiles.every((t) => t.done)) { if (!this.fin) this.score = Math.max(10, Math.round(200 - this.flips * 4 - this.t)); this.fin += dt; return; }
    if (this.wait > 0) { this.wait -= dt; if (this.wait <= 0) { for (const t of this.open) t.up = false; this.open = []; } return; }
    const L = this.layout(); if (inp.nav) { this.cur = (this.cur + inp.nav + 16) % 16; }
    let pick = null; if (inp.click) { const c = Math.floor((inp.click[0] - L.x0) / L.cs), r = Math.floor((inp.click[1] - L.y0) / L.cs); if (c >= 0 && c < 4 && r >= 0 && r < 4) pick = r * 4 + c; } if (inp.tap && !inp.click) pick = this.cur;
    const t = this.tiles[pick]; if (!t || t.up || t.done) return; t.up = true; this.open.push(t); this.flips++; this.a.sfx('flip');
    if (this.open.length === 2) { const [p, q] = this.open; if (p.k === q.k) { p.done = q.done = true; this.open = []; this.a.sfx('good'); } else { this.wait = 0.8; this.a.sfx('bad'); } }
  }
  icon(ctx, k, x, y, s) {
    const c = { sun: '#ffcf4a', rain: '#6fb8f0', snow: '#f4f8ff', wind: '#a6e3cf', bolt: '#ffe14a', rainbow: '#ff8aa0', cloud: '#d6d0e0', moon: '#f0e2b0' }[k];
    if (k === 'rainbow') { ['#ff6a6a', '#ffcf4a', '#7ad07a', '#6fb8f0'].forEach((cc, i) => { ctx.strokeStyle = cc; ctx.lineWidth = s * 0.1; ctx.beginPath(); ctx.arc(x, y + s * 0.2, s * (0.55 - i * 0.1), Math.PI, 0); ctx.stroke(); }); return; }
    if (k === 'bolt') { ctx.fillStyle = c; ctx.strokeStyle = '#3a2a30'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + s * 0.1, y - s * 0.5); ctx.lineTo(x - s * 0.25, y + s * 0.05); ctx.lineTo(x, y + s * 0.05); ctx.lineTo(x - s * 0.1, y + s * 0.5); ctx.lineTo(x + s * 0.3, y - s * 0.1); ctx.lineTo(x + s * 0.05, y - s * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke(); return; }
    if (k === 'wind') { ctx.strokeStyle = c; ctx.lineWidth = s * 0.1; ctx.lineCap = 'round'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x - s * 0.45, y - s * 0.25 + i * s * 0.25); ctx.quadraticCurveTo(x + s * 0.3, y - s * 0.4 + i * s * 0.25, x + s * 0.35, y - s * 0.25 + i * s * 0.25); ctx.stroke(); } return; }
    blob(ctx, x, y, s * 0.42, k === 'cloud' ? s * 0.3 : s * 0.42, c, k.length * 5, { noPrint: true });
    if (k === 'rain') for (let i = 0; i < 3; i++) blob(ctx, x - s * 0.25 + i * s * 0.25, y + s * 0.5, s * 0.07, s * 0.1, '#6fb8f0', i, { noPrint: true, noGlint: true });
    if (k === 'moon') { ctx.fillStyle = '#5a4870'; ctx.beginPath(); ctx.arc(x + s * 0.18, y - s * 0.1, s * 0.34, 0, 7); ctx.fill(); }
  }
  draw(ctx) {
    const W = this.a.w, H = this.a.h, u = Math.min(W, H) / 20, L = this.layout(); backdrop(ctx, W, H, '#5a4870', '#2e2440');
    this.tiles.forEach((t, i) => { const c = i % 4, r = (i / 4) | 0, x = L.x0 + (c + 0.5) * L.cs, y = L.y0 + (r + 0.5) * L.cs, sx = Math.abs(Math.cos(t.f * Math.PI)) * 0.9 + 0.02, face = t.f > 0.5; ctx.save(); ctx.translate(x, y); ctx.scale(sx, 1); blob(ctx, 0, 0, L.cs * 0.42, L.cs * 0.42, t.done ? '#9fd29a' : face ? '#f3e6cf' : '#c9866a', t.s); if (face) this.icon(ctx, t.k, 0, 0, L.cs * 0.62); ctx.restore(); if (i === this.cur && this.a.usedKeys) { ctx.strokeStyle = '#ffe680'; ctx.lineWidth = 3; ctx.strokeRect(x - L.cs * 0.47, y - L.cs * 0.47, L.cs * 0.94, L.cs * 0.94); } });
    text(ctx, `Flips ${this.flips}   ·   ${this.t.toFixed(0)}s`, W / 2, H * 0.08, u * 0.85); if (this.fin) text(ctx, `All matched! +${this.score}`, W / 2, H / 2, u * 1.4, '#ffe680');
  }
}
