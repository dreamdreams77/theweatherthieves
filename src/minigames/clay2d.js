/** Tiny 2D "claymation" drawing kit for the mini games: lumpy blobs that boil at 12 fps, a thumbprint sheen and a wet glint. */
export const FPS = 12;
let boilFrame = 0; export function setBoil(t, still) { boilFrame = still ? 0 : Math.floor(t * FPS); }
function h(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
export function shade(hex, k) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; const f = (c) => Math.max(0, Math.min(255, Math.round(k > 0 ? c + (255 - c) * k : c * (1 + k)))); return `rgb(${f(r)},${f(g)},${f(b)})`; }
export function lump(ctx, x, y, rx, ry, seed = 1, wob = 0.07) {
  const N = 14; ctx.beginPath(); const pts = [];
  for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2, k = 1 + (h(seed * 13 + i * 7.3 + boilFrame * 3.1) - 0.5) * wob * 2 + (h(seed + i) - 0.5) * wob; pts.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]); }
  for (let i = 0; i < N; i++) { const p = pts[i], q = pts[(i + 1) % N]; const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2; if (i === 0) ctx.moveTo(mx, my); else ctx.quadraticCurveTo(p[0], p[1], mx, my); }
  const p = pts[0], q = pts[1]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); ctx.closePath();
}
/** a lit clay blob: base, warm key from top-left, thumbprint arcs, wet glint */
export function blob(ctx, x, y, rx, ry, col, seed = 1, opt = {}) {
  ctx.save(); lump(ctx, x, y, rx, ry, seed, opt.wob ?? 0.07);
  const g = ctx.createRadialGradient(x - rx * 0.35, y - ry * 0.45, Math.min(rx, ry) * 0.1, x, y, Math.max(rx, ry) * 1.15); g.addColorStop(0, shade(col, 0.28)); g.addColorStop(0.55, col); g.addColorStop(1, shade(col, -0.38)); ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = Math.max(1.5, rx * 0.06); ctx.strokeStyle = 'rgba(30,18,30,.55)'; ctx.stroke();
  if (rx > 14 && !opt.noPrint) { ctx.clip(); ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 1; const cx = x + rx * (h(seed) - 0.5) * 0.6, cy = y + ry * (h(seed + 2) - 0.5) * 0.6; for (let r = 4; r < rx * 0.9; r += 3.2) { ctx.beginPath(); ctx.ellipse(cx, cy, r * 1.25, r, h(seed + 5) * 3, 0.3, 5.6); ctx.stroke(); } }
  ctx.restore();
  if (!opt.noGlint) { ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(x - rx * 0.38, y - ry * 0.48, rx * 0.13, ry * 0.08, -0.5, 0, Math.PI * 2); ctx.fill(); }
}
export function eyes(ctx, x, y, s, look = 0, blink = false) {
  for (const d of [-1, 1]) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x + d * s, y, s * 0.7, blink ? s * 0.12 : s * 0.8, 0, 0, 7); ctx.fill(); if (!blink) { ctx.fillStyle = '#231a28'; ctx.beginPath(); ctx.arc(x + d * s + look * s * 0.3, y + s * 0.1, s * 0.38, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + d * s + look * s * 0.3 - s * 0.12, y - s * 0.1, s * 0.12, 0, 7); ctx.fill(); } }
}
export function text(ctx, s, x, y, size = 28, col = '#fff6e0', align = 'center') { ctx.font = `800 ${size}px Baloo 2, Nunito, system-ui, sans-serif`; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.lineWidth = size * 0.18; ctx.strokeStyle = 'rgba(40,24,40,.85)'; ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y); }
/** warm felt backdrop with a hand-made sky gradient and paper grain */
export function backdrop(ctx, w, hgt, top, bot) { const g = ctx.createLinearGradient(0, 0, 0, hgt); g.addColorStop(0, top); g.addColorStop(1, bot); ctx.fillStyle = g; ctx.fillRect(0, 0, w, hgt); ctx.fillStyle = 'rgba(255,240,220,.035)'; for (let i = 0; i < 160; i++) { const x = h(i * 3.7) * w, y = h(i * 9.1) * hgt; ctx.fillRect(x, y, 2, 2); } const v = ctx.createRadialGradient(w / 2, hgt / 2, Math.min(w, hgt) * 0.3, w / 2, hgt / 2, Math.max(w, hgt) * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(20,8,24,.45)'); ctx.fillStyle = v; ctx.fillRect(0, 0, w, hgt); }
