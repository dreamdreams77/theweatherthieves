import { blob, eyes, text, backdrop } from './clay2d.js';
/** Drizzle Dash: steer Fen's bucket-cloud to catch raindrops; dodge hailstones; golden drops are worth 5. */
export class Catch {
  static id = 'catch'; static title = 'Drizzle Dash'; static blurb = 'Catch raindrops in Fen\'s bucket. Dodge the hail!'; static howto = '← → / A D, drag or tilt your finger';
  constructor(a) { this.a = a; this.x = 0.5; this.items = []; this.score = 0; this.lives = 3; this.time = 45; this.spawn = 0; this.t = 0; this.hurt = 0; this.pops = []; }
  get over() { return this.time <= 0 || this.lives <= 0; }
  update(dt, inp) {
    const W = this.a.w, H = this.a.h; this.t += dt; this.time -= dt; this.hurt = Math.max(0, this.hurt - dt);
    let mv = (inp.right ? 1 : 0) - (inp.left ? 1 : 0); if (inp.pointer != null) mv = Math.max(-1, Math.min(1, (inp.pointer / W - this.x) * 8)); this.x = Math.max(0.06, Math.min(0.94, this.x + mv * dt * 0.9));
    const rate = 1.4 + (45 - this.time) * 0.06; this.spawn -= dt; if (this.spawn <= 0) { this.spawn = 1 / rate; const r = Math.random(); this.items.push({ x: 0.05 + Math.random() * 0.9, y: -0.05, v: 0.22 + Math.random() * 0.12 + (45 - this.time) * 0.004, k: r < 0.18 + (45 - this.time) * 0.004 ? 'hail' : r > 0.94 ? 'gold' : 'drop', s: Math.random() * 99 }); }
    const bx = this.x, by = 0.86;
    for (const it of this.items) { it.y += it.v * dt; if (!it.dead && Math.abs(it.x - bx) < 0.075 && Math.abs(it.y - by) < 0.04) { it.dead = true; if (it.k === 'hail') { this.lives--; this.hurt = 0.6; this.a.sfx('bad'); } else { const p = it.k === 'gold' ? 5 : 1; this.score += p; this.pops.push({ x: it.x * W, y: by * H - 30, t: 0.7, s: '+' + p }); this.a.sfx(it.k === 'gold' ? 'gold' : 'good'); } } }
    this.items = this.items.filter((i) => !i.dead && i.y < 1.1); for (const p of this.pops) { p.t -= dt; p.y -= dt * 40; } this.pops = this.pops.filter((p) => p.t > 0);
  }
  draw(ctx) {
    const W = this.a.w, H = this.a.h, u = Math.min(W, H) / 20; backdrop(ctx, W, H, '#8fb4d8', '#e8d6c0');
    for (let i = 0; i < 5; i++) blob(ctx, ((i * 0.23 + this.t * 0.01) % 1.2 - 0.1) * W, H * (0.08 + (i % 2) * 0.05), u * 3, u * 1.2, '#f2eef6', 40 + i, { noGlint: true });
    blob(ctx, W / 2, H * 1.02, W * 0.7, H * 0.1, '#7aa86a', 7);
    for (const it of this.items) { const x = it.x * W, y = it.y * H; if (it.k === 'hail') blob(ctx, x, y, u * 0.55, u * 0.55, '#dfe8f0', it.s, { wob: 0.18 }); else blob(ctx, x, y, u * 0.38, u * 0.5, it.k === 'gold' ? '#ffcf4a' : '#6fb8f0', it.s); }
    const bx = this.x * W, by = 0.86 * H, sh = this.hurt > 0 ? Math.sin(this.t * 60) * 4 : 0;
    blob(ctx, bx + sh, by, u * 1.8, u * 1.0, this.hurt > 0 ? '#9a8aa8' : '#c9c2d4', 3); eyes(ctx, bx + sh, by - u * 0.15, u * 0.32, (this.items[0]?.x ?? 0.5) - this.x > 0 ? 1 : -1, this.hurt > 0);
    for (const p of this.pops) text(ctx, p.s, p.x, p.y, u * 0.9, '#fff6c0');
    text(ctx, `${this.score}`, W / 2, u * 1.4, u * 1.4); text(ctx, `${Math.max(0, Math.ceil(this.time))}s`, W - u * 2, u * 1.4, u * 0.9); text(ctx, '♥'.repeat(Math.max(0, this.lives)), u * 2.5, u * 1.4, u * 0.9, '#ff8aa0');
  }
}
