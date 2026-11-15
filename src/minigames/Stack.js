import { blob, eyes, text, backdrop } from './clay2d.js';
import { Haptics } from '../core/Haptics.js';
/** Snowball Stack: a snowball swings under a cloud; drop it onto the snowman. Land it centred for a Perfect, lean too far and the tower topples. */
const R = 1.5, STEP = R * 2 * 0.84, G = 70;
export class Stack {
  static id = 'stack'; static title = 'Snowball Stack'; static blurb = 'Drop swinging snowballs to build the tallest snowman. Centre them — lean too far and it topples!'; static howto = 'Space / ↓ / click / tap to drop';
  static medals = [8, 18, 30];
  constructor(a) { this.a = a; this.balls = []; this.score = 0; this.lives = 3; this.time = 60; this.t = 0; this.ph = Math.random() * 6; this.state = 'aim'; this.wait = 0; this.drop = null; this.lost = []; this.cam = 0; this.wob = 0; this.fx = []; this.perfects = 0; this.endT = 0; this.fell = 0; }
  get height() { return this.balls.length; }
  get dead() { return this.lives <= 0 || this.time <= 0 || this.fell > 0; }
  get over() { return this.dead && this.endT > 1.3; }
  geo() { const W = this.a.w, H = this.a.h, u = Math.min(W, H) / 20, amp = Math.max(2, Math.min(W / 2 / u - R - 0.6, 6.5)); return { W, H, u, amp, ground: H * 0.9 }; }
  topY() { return this.balls.length ? R + (this.balls.length - 1) * STEP : -R; }
  landY() { return this.balls.length ? this.topY() + STEP : R; }
  hangY(g = this.geo()) { return this.cam + (g.ground - g.H * 0.2) / g.u; }
  swingX(g = this.geo()) { return Math.sin(this.ph) * g.amp; }
  update(dt, inp) {
    const g = this.geo(); this.t += dt; this.wob *= Math.exp(-dt * 2.2);
    for (const f of this.fx) { f.t -= dt; f.y -= dt * 30; } this.fx = this.fx.filter((f) => f.t > 0);
    for (const b of this.lost) { b.vy -= G * dt; b.x += b.vx * dt; b.y = Math.max(R - 0.2, b.y + b.vy * dt); b.r += b.vx * dt * 0.6; b.t -= dt; } this.lost = this.lost.filter((b) => b.t > 0);
    const camT = Math.max(0, this.topY() + R - (g.ground - g.H * 0.55) / g.u); this.cam += (camT - this.cam) * Math.min(1, dt * 3);
    if (this.dead) { this.endT += dt; if (this.fell) this.fell += dt; return; }
    this.time -= dt; this.ph += dt * Math.min(4.2, 1.7 + this.height * 0.11);
    const press = inp.tap || (inp.press || []).some((c) => c === 'ArrowDown' || c === 'KeyS');
    if (this.state === 'wait') { this.wait -= dt; if (this.wait <= 0) this.state = 'aim'; }
    else if (this.state === 'aim' && press) { this.drop = { x: this.swingX(g), y: this.hangY(g) - R * 1.1, v: 0, s: this.t * 13 }; this.state = 'fall'; this.a.sfx('flip'); }
    else if (this.state === 'fall') {
      const d = this.drop; d.v += G * dt; d.y -= d.v * dt; const ly = this.landY();
      if (d.y <= ly) {
        const top = this.balls[this.balls.length - 1], dx = top ? d.x - top.x : 0;
        if (top && Math.abs(dx) > R * 1.15) { this.lives--; this.lost.push({ x: d.x, y: ly, vx: Math.sign(dx) * 7, vy: 4, r: 0, t: 1.6, s: d.s }); this.fx.push({ x: d.x, y: ly, t: 0.8, s: 'Missed!', c: '#ffb0b0' }); this.a.sfx('bad'); }
        else {
          const perfect = top ? Math.abs(dx) < R * 0.22 : Math.abs(d.x) < R * 0.6; const b = { x: perfect && top ? top.x : d.x, s: d.s, sq: 1 }; this.balls.push(b);
          const pts = perfect ? 3 : 1; this.score += pts; if (perfect) this.perfects++; this.wob += top ? dx * 0.06 : 0; this.fx.push({ x: b.x, y: ly + R, t: 0.8, s: perfect ? `Perfect! +${pts}` : `+${pts}`, c: perfect ? '#fff6a0' : '#ffffff' });
          this.a.sfx(perfect ? 'gold' : 'good'); Haptics.sfx('land');
          // balance: the centre of mass of everything above the base must stay over the base
          if (this.balls.length > 2) { const base = this.balls[0].x, com = this.balls.slice(1).reduce((s, q) => s + q.x, 0) / (this.balls.length - 1); if (Math.abs(com - base) > R * 1.05) { this.fell = 0.001; this.tip = Math.sign(com - base); this.fx.push({ x: b.x, y: ly + R * 2, t: 1.2, s: 'Timber!', c: '#ffb0b0' }); this.a.sfx('bad'); } }
        }
        this.drop = null; this.state = 'wait'; this.wait = 0.25;
      }
    }
    for (const b of this.balls) b.sq += (1 - b.sq) * Math.min(1, dt * 10);
  }
  ball(ctx, sx, sy, u, s, face, arms) {
    if (arms) { ctx.strokeStyle = '#6a4a32'; ctx.lineWidth = u * 0.22; ctx.lineCap = 'round'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx + d * u * R * 0.8, sy); ctx.lineTo(sx + d * u * R * 1.7, sy - u * 0.9); ctx.lineTo(sx + d * u * R * 1.9, sy - u * 1.4); ctx.stroke(); } }
    blob(ctx, sx, sy, u * R, u * R * 0.96, '#f4f8ff', s);
    if (face) { eyes(ctx, sx, sy - u * 0.35, u * 0.28, 0, Math.sin(this.t * 2.3) > 0.97); ctx.fillStyle = '#ff8a3a'; ctx.strokeStyle = 'rgba(40,24,40,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(sx, sy + u * 0.05); ctx.lineTo(sx + u * 1.0, sy + u * 0.25); ctx.lineTo(sx, sy + u * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else { ctx.fillStyle = '#2a2230'; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.arc(sx, sy + k * u * 0.55, u * 0.13, 0, 7); ctx.fill(); } }
  }
  draw(ctx) {
    const g = this.geo(), { W, H, u } = g, sy = (y) => g.ground - (y - this.cam) * u, cx = W / 2;
    backdrop(ctx, W, H, '#7fa6d6', '#e9eef8');
    ctx.fillStyle = 'rgba(255,255,255,.6)'; for (let i = 0; i < 40; i++) { const x = ((i * 97.3 + this.t * 12 * (1 + (i % 3))) % W), y = ((i * 53.1 + this.t * 30 * (1 + (i % 2))) % H); ctx.beginPath(); ctx.arc(x, y, 1.5 + (i % 3), 0, 7); ctx.fill(); }
    // height marks on the side
    for (let k = 5; k <= 60; k += 5) { const y = sy(R + (k - 1) * STEP); if (y < -20 || y > H) continue; ctx.strokeStyle = 'rgba(60,70,110,.25)'; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); ctx.setLineDash([]); text(ctx, String(k), u * 0.9, y - u * 0.4, u * 0.6, '#ffffff', 'left'); }
    blob(ctx, cx, sy(0) + H * 0.5, W * 0.75, H * 0.5 + u, '#f4f8ff', 7, { noGlint: true });
    // the snowman (sways with the wobble; topples when it falls)
    ctx.save(); const ang = this.fell ? this.tip * Math.min(1.5, this.fell * this.fell * 2.2) : this.wob * Math.sin(this.t * 9); const bx = this.balls[0]?.x || 0; ctx.translate(cx + bx * u, sy(0)); ctx.rotate(ang); ctx.translate(-(cx + bx * u), -sy(0));
    this.balls.forEach((b, i) => { const y = sy(R + i * STEP), last = i === this.balls.length - 1; ctx.save(); ctx.translate(cx + b.x * u, y + u * R); ctx.scale(1 + (1 - b.sq) * 0.3, b.sq); ctx.translate(-(cx + b.x * u), -(y + u * R)); this.ball(ctx, cx + b.x * u, y, u, b.s, last, i === 1 && !last); ctx.restore(); if (last && this.balls.length > 1) { ctx.fillStyle = '#2a2230'; ctx.fillRect(cx + b.x * u - u * 0.9, y - u * R * 0.9, u * 1.8, u * 0.28); ctx.fillRect(cx + b.x * u - u * 0.6, y - u * R * 0.9 - u * 0.85, u * 1.2, u * 0.9); } });
    ctx.restore();
    for (const b of this.lost) { ctx.save(); ctx.globalAlpha = Math.min(1, b.t); ctx.translate(cx + b.x * u, sy(b.y)); ctx.rotate(b.r); this.ball(ctx, 0, 0, u, b.s, false, false); ctx.restore(); }
    // the cloud crane and the swinging / falling snowball
    const hy = sy(this.hangY(g)), sxw = this.swingX(g); blob(ctx, cx + sxw * u, hy - u * 1.3, u * 2.4, u * 1.1, '#d6d0e0', 3, { noGlint: true }); eyes(ctx, cx + sxw * u, hy - u * 1.4, u * 0.22, Math.cos(this.ph) > 0 ? 1 : -1);
    if (this.state === 'aim' && !this.dead) { ctx.strokeStyle = 'rgba(80,90,130,.25)'; ctx.setLineDash([4, 8]); ctx.beginPath(); ctx.moveTo(cx + sxw * u, hy + u * R); ctx.lineTo(cx + sxw * u, sy(this.landY())); ctx.stroke(); ctx.setLineDash([]); this.ball(ctx, cx + sxw * u, hy, u, 99, false, false); }
    if (this.drop) this.ball(ctx, cx + this.drop.x * u, sy(this.drop.y), u, this.drop.s, false, false);
    for (const f of this.fx) text(ctx, f.s, cx + f.x * u, sy(f.y) + (f.t - 0.8) * 30, u * 0.8, f.c);
    text(ctx, `${this.score}`, W / 2, u * 1.3, u * 1.4); text(ctx, `${Math.max(0, Math.ceil(this.time))}s`, W - u * 2, u * 1.3, u * 0.85); text(ctx, '❄'.repeat(Math.max(0, this.lives)), u * 2.2, u * 1.3, u * 0.9, '#bfe4ff');
    text(ctx, `height ${this.height}`, u * 0.8, u * 2.7, u * 0.7, '#ffffff', 'left');
    if (this.t < 2.5 && !this.balls.length) text(ctx, 'Tap / Space to drop!', W / 2, H * 0.62, u * 0.95, '#fff6c0');
  }
}
