import { blob, eyes, text, backdrop } from './clay2d.js';
/** Gust Glide: a Puffkin floats through gaps between storm clouds; tap / Space for a gust. Pass each gap for a point. */
export class Glide {
  static id = 'glide'; static title = 'Gust Glide'; static blurb = 'Puff a Puffkin through the storm. One tap = one gust.'; static howto = 'Space / click / tap to gust';
  constructor(a) { this.a = a; this.y = 0.45; this.v = 0; this.cols = []; this.score = 0; this.t = 0; this.next = 0.6; this.dead = false; this.started = false; this.deadT = 0; }
  get over() { return this.dead && this.deadT > 0.9; }
  update(dt, inp) {
    this.t += dt; if (this.dead) { this.deadT += dt; this.v += dt * 2.2; this.y = Math.min(1.1, this.y + this.v * dt); return; }
    if (inp.tap) { this.started = true; this.v = -0.62; this.a.sfx('flap'); }
    if (!this.started) { this.y = 0.45 + Math.sin(this.t * 3) * 0.02; return; }
    this.v = Math.min(0.9, this.v + dt * 1.9); this.y += this.v * dt; const speed = 0.28 + Math.min(0.2, this.score * 0.008);
    this.next -= dt; if (this.next <= 0) { this.next = 1.55 - Math.min(0.5, this.score * 0.02); const gap = Math.max(0.24, 0.34 - this.score * 0.004); this.cols.push({ x: 1.15, c: 0.25 + Math.random() * 0.5, g: gap, s: Math.random() * 99, passed: false }); }
    const ar = this.a.w / this.a.h, px = 0.28;
    for (const c of this.cols) { c.x -= speed * dt / ar * 1.6; if (!c.passed && c.x < px) { c.passed = true; this.score++; this.a.sfx('good'); } if (Math.abs(c.x - px) < 0.06 / ar * 1.6 + 0.02 && (this.y < c.c - c.g / 2 + 0.03 || this.y > c.c + c.g / 2 - 0.03)) this.die(); }
    this.cols = this.cols.filter((c) => c.x > -0.2); if (this.y > 0.97 || this.y < 0.02) this.die();
  }
  die() { if (this.dead) return; this.dead = true; this.v = -0.3; this.a.sfx('bad'); }
  draw(ctx) {
    const W = this.a.w, H = this.a.h, u = Math.min(W, H) / 20; backdrop(ctx, W, H, '#4a3a6a', '#c79a9a');
    for (let i = 0; i < 6; i++) blob(ctx, (((i * 0.21) - this.t * 0.02) % 1.2 + 1.2) % 1.2 * W - 0.1 * W, H * (0.92 + (i % 2) * 0.04), u * 4, u * 1.6, '#6a5a7a', 60 + i, { noGlint: true });
    for (const c of this.cols) { const x = c.x * W, top = (c.c - c.g / 2) * H, bot = (c.c + c.g / 2) * H, cw = u * 1.6; for (let y = top - u; y > -u * 2; y -= u * 1.6) blob(ctx, x, y, cw, u * 1.1, '#3e3352', c.s + y, { noGlint: y < top - u * 2 }); for (let y = bot + u; y < H + u * 2; y += u * 1.6) blob(ctx, x, y, cw, u * 1.1, '#3e3352', c.s + y + 9, { noGlint: y > bot + u * 2 }); if (Math.sin(this.t * 9 + c.s) > 0.93) { ctx.strokeStyle = '#ffe680'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + u * 0.4, top + u * 0.6); ctx.lineTo(x - u * 0.2, top + u * 0.9); ctx.stroke(); } }
    const px = 0.28 * W, py = this.y * H, tilt = Math.max(-0.5, Math.min(0.8, this.v)); ctx.save(); ctx.translate(px, py); ctx.rotate(tilt * 0.6); blob(ctx, 0, 0, u * 0.95, u * 0.85, '#ffb3c7', 5); eyes(ctx, u * 0.15, -u * 0.1, u * 0.22, 1, this.dead); ctx.restore();
    text(ctx, `${this.score}`, W / 2, u * 1.6, u * 1.6); if (!this.started) text(ctx, 'Tap / Space to gust!', W / 2, H * 0.7, u * 0.9);
  }
}
