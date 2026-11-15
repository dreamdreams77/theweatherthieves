import { Progress } from './Progress.js';
import { Haptics } from './Haptics.js';
import { TRIALS } from './Trials.js';
import { ALMANAC } from './Combos.js';
import { MEMORY_DB } from '../ui/memories.js';
import { GAMES, MEDALS } from '../minigames/Arcade.js';
import { blob, eyes, lump, setBoil, shade } from '../minigames/clay2d.js';

/** The Sticker Book: clay stickers earned by achievements all over the game. Rules are re-checked after every Progress.save(). */
const TIER = { bronze: '#d08a4a', silver: '#cfd8e6', gold: '#ffd24a' };
const GAME_ART = { catch: 'drop', glide: 'puff', match: 'tile', rhythm: 'notes', stack: 'snowman', link: 'bolt' };
const TRIAL_ART = { 1: 'pod', 2: 'pinwheel', 3: 'flake', 4: 'fan' };
const CH = [['Sunken Sky', '#7ac06a'], ['Umbrella Village', '#ff8aa0'], ['Frosted Forest', '#e8f2ff'], ['Thunder Works', '#9a94a6']];
const D = () => Progress.data;
const nMem = () => Object.keys(MEMORY_DB).length;

export const STICKERS = [
  ...GAMES.flatMap((G) => MEDALS.map((m, i) => ({ id: `arc-${G.id}-${m}`, group: 'Puffkin Arcade', name: `${G.title} ${m[0].toUpperCase() + m.slice(1)}`, hint: `Score ${G.medals[i]}+ in ${G.title}`, art: GAME_ART[G.id] || 'puff', tier: m, test: () => ((D().arcade || {})[G.id] || 0) >= G.medals[i] }))),
  { id: 'arc-all', group: 'Puffkin Arcade', name: 'Pob’s Regular', hint: 'Play every arcade game once', art: 'pob', tier: 'gold', test: () => GAMES.every((G) => G.id in (D().arcade || {})) },
  ...Object.entries(TRIALS).map(([n, T]) => ({ id: `trial-${n}`, group: 'Weather Trials', name: T.name, hint: `Win any medal in the ${T.name} trial (chapter ${n})`, art: TRIAL_ART[n], tier: () => (D().trials || {})[n]?.medal, test: () => !!(D().trials || {})[n]?.medal })),
  { id: 'trial-gold', group: 'Weather Trials', name: 'Golden Forecast', hint: 'Gold medals in all four Weather Trials', art: 'trophy', tier: 'gold', test: () => Object.keys(TRIALS).every((n) => (D().trials || {})[n]?.medal === 'gold') },
  { id: 'alm-1', group: 'Weather Almanac', name: 'First Mix', hint: 'Discover your first weather combination', art: 'mix', tier: 'bronze', test: () => (D().almanac || []).length >= 1 },
  { id: 'alm-5', group: 'Weather Almanac', name: 'Rainbow Maker', hint: 'Discover 5 weather combinations', art: 'rainbow', tier: 'silver', test: () => (D().almanac || []).length >= 5 },
  { id: 'alm-all', group: 'Weather Almanac', name: 'Weather Wizard', hint: `Discover all ${Object.keys(ALMANAC).length} weather combinations`, art: 'almanac', tier: 'gold', test: () => Object.keys(ALMANAC).every((k) => (D().almanac || []).includes(k)) },
  ...CH.map(([t, c], i) => ({ id: `ch-${i + 1}`, group: 'The Story', name: t, hint: `Complete chapter ${i + 1}`, art: 'island', col: c, ch: i + 1, test: () => (D().done || []).includes(i + 1) })),
  { id: 'mem-1', group: 'The Story', name: 'Sky Glint', hint: 'Find your first weather memory', art: 'glint', n: 1, tier: 'bronze', test: () => (D().memories || []).length >= 1 },
  { id: 'mem-10', group: 'The Story', name: 'Memory Keeper', hint: 'Find 10 weather memories', art: 'glint', n: 2, tier: 'silver', test: () => (D().memories || []).length >= 10 },
  { id: 'mem-all', group: 'The Story', name: 'Sky’s Memory', hint: `Find all ${nMem()} weather memories`, art: 'glint', n: 3, tier: 'gold', test: () => (D().memories || []).length >= nMem() },
];
const tierOf = (s) => (typeof s.tier === 'function' ? s.tier() : s.tier);

/** paint one sticker (unlocked = clay colours; locked = dark silhouette) onto a canvas */
export function drawSticker(cv, s, locked) {
  const S = 96, d = 2; cv.width = S * d; cv.height = S * d; const ctx = cv.getContext('2d'); ctx.setTransform(d, 0, 0, d, 0, 0); setBoil(0, true);
  const tier = tierOf(s), seed = s.id.length * 7 + s.id.charCodeAt(s.id.length - 1);
  if (locked) {
    ctx.save(); lump(ctx, 48, 48, 42, 42, seed, 0.05); ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fill(); ctx.setLineDash([5, 5]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.stroke(); ctx.restore();
    const o = document.createElement('canvas'); o.width = S * d; o.height = S * d; const oc = o.getContext('2d'); oc.setTransform(d, 0, 0, d, 0, 0); art(oc, s, 48, 50, seed);
    oc.globalCompositeOperation = 'source-in'; oc.fillStyle = '#231c3a'; oc.fillRect(0, 0, S, S); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(o, 0, 0); return;
  }
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3; lump(ctx, 48, 48, 43, 43, seed, 0.05); ctx.fillStyle = '#fffaf0'; ctx.fill(); ctx.restore();
  blob(ctx, 48, 48, 36, 36, TIER[tier] ? shade(TIER[tier], -0.05) : s.col ? shade(s.col, -0.35) : '#8a78c8', seed, { noGlint: true, wob: 0.04 });
  ctx.save(); lump(ctx, 48, 48, 36, 36, seed, 0.04); ctx.clip(); ctx.fillStyle = 'rgba(30,20,50,.18)'; ctx.fillRect(0, 0, S, S); ctx.restore();
  art(ctx, s, 48, 50, seed);
}
function bolt(ctx, x, y, k, col) { ctx.fillStyle = col; ctx.strokeStyle = '#3a2a30'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 4 * k, y - 18 * k); ctx.lineTo(x - 9 * k, y + 2 * k); ctx.lineTo(x, y + 2 * k); ctx.lineTo(x - 4 * k, y + 18 * k); ctx.lineTo(x + 10 * k, y - 4 * k); ctx.lineTo(x + 2 * k, y - 4 * k); ctx.closePath(); ctx.fill(); ctx.stroke(); }
function art(ctx, s, x, y, seed) {
  const a = s.art;
  if (a === 'drop') { blob(ctx, x, y, 15, 19, '#6fb8f0', seed); eyes(ctx, x, y - 1, 4.5, 0.5); }
  else if (a === 'puff') { blob(ctx, x - 13, y - 4, 9, 6, '#fff0f6', seed + 3, { noGlint: true }); blob(ctx, x, y, 18, 16, '#ffb3c7', seed); eyes(ctx, x + 3, y - 2, 4.5, 1); }
  else if (a === 'tile') { blob(ctx, x, y, 21, 21, '#f3e6cf', seed); blob(ctx, x, y, 9, 9, '#ffcf4a', seed + 1, { noPrint: true }); ctx.strokeStyle = '#ffcf4a'; ctx.lineWidth = 3; ctx.lineCap = 'round'; for (let i = 0; i < 8; i++) { const t = (i / 8) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(x + Math.cos(t) * 12, y + Math.sin(t) * 12); ctx.lineTo(x + Math.cos(t) * 16, y + Math.sin(t) * 16); ctx.stroke(); } }
  else if (a === 'notes') { ['#ff6a6a', '#ffcf4a', '#6fb8f0'].forEach((c, i) => { blob(ctx, x - 16 + i * 16, y - 6 + (i % 2) * 12, 8, 10, c, seed + i, { noPrint: true }); }); eyes(ctx, x, y + 5, 2.8, 0); }
  else if (a === 'snowman') { blob(ctx, x, y + 12, 15, 13, '#f4f8ff', seed); blob(ctx, x, y - 8, 11, 10, '#f4f8ff', seed + 1); eyes(ctx, x, y - 10, 3, 0); ctx.fillStyle = '#ff8a3a'; ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + 9, y - 4); ctx.lineTo(x, y - 2); ctx.fill(); ctx.fillStyle = '#2a2230'; ctx.fillRect(x - 10, y - 19, 20, 3); ctx.fillRect(x - 6, y - 27, 12, 8); }
  else if (a === 'bolt') { blob(ctx, x, y - 8, 20, 12, '#d6d0e0', seed, { noGlint: true }); bolt(ctx, x, y + 8, 0.9, '#ffe14a'); }
  else if (a === 'pob') { blob(ctx, x, y + 2, 20, 18, '#ffb3c7', seed); eyes(ctx, x, y - 2, 5, 0); ctx.fillStyle = '#e8607a'; ctx.beginPath(); ctx.moveTo(x - 14, y - 14); ctx.lineTo(x, y - 30); ctx.lineTo(x + 14, y - 14); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(30,18,30,.5)'; ctx.lineWidth = 1.5; ctx.stroke(); }
  else if (a === 'pod') { blob(ctx, x, y + 3, 13, 17, '#7ad07a', seed); blob(ctx, x - 8, y - 14, 7, 4, '#4f9a52', seed + 1, { noGlint: true, noPrint: true }); blob(ctx, x + 6, y + 18, 3, 4, '#6fb8f0', seed + 2, { noPrint: true }); }
  else if (a === 'pinwheel') { ['#ff8aa0', '#ffcf4a', '#6fb8f0', '#a6e3cf'].forEach((c, i) => { const t = (i * Math.PI) / 2; blob(ctx, x + Math.cos(t + 0.5) * 10, y + Math.sin(t + 0.5) * 10, 10, 6, c, seed + i, { noPrint: true, noGlint: true }); }); blob(ctx, x, y, 4, 4, '#fff6e0', seed + 9, { noPrint: true }); }
  else if (a === 'flake') { ctx.strokeStyle = '#eaf6ff'; ctx.lineWidth = 4; ctx.lineCap = 'round'; for (let i = 0; i < 3; i++) { const t = (i * Math.PI) / 3; ctx.beginPath(); ctx.moveTo(x - Math.cos(t) * 19, y - Math.sin(t) * 19); ctx.lineTo(x + Math.cos(t) * 19, y + Math.sin(t) * 19); ctx.stroke(); } blob(ctx, x, y, 6, 6, '#aee4ff', seed, { noPrint: true }); }
  else if (a === 'fan') { blob(ctx, x, y, 20, 20, '#8a8496', seed); for (let i = 0; i < 3; i++) { const t = (i * Math.PI * 2) / 3; blob(ctx, x + Math.cos(t) * 9, y + Math.sin(t) * 9, 8, 5, '#c9f0e0', seed + i, { noPrint: true, noGlint: true }); } blob(ctx, x, y, 4, 4, '#ffe14a', seed + 5, { noPrint: true }); }
  else if (a === 'trophy') { blob(ctx, x, y - 4, 16, 14, '#ffd24a', seed); ctx.fillStyle = '#c9962a'; ctx.fillRect(x - 3, y + 8, 6, 8); blob(ctx, x, y + 18, 11, 4, '#c9962a', seed + 1, { noGlint: true, noPrint: true }); eyes(ctx, x, y - 5, 3.5, 0); }
  else if (a === 'mix') { blob(ctx, x - 7, y, 12, 9, '#d6d0e0', seed, { noGlint: true }); blob(ctx, x + 10, y - 9, 8, 8, '#ffcf4a', seed + 1, { noPrint: true }); for (let i = 0; i < 3; i++) blob(ctx, x - 13 + i * 6, y + 14, 2, 3.5, '#6fb8f0', seed + 2 + i, { noPrint: true, noGlint: true }); }
  else if (a === 'rainbow') { ctx.lineCap = 'round'; ['#ff5a5a', '#ffcf4a', '#7ad07a', '#4db8ff'].forEach((c, i) => { ctx.strokeStyle = c; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y + 10, 24 - i * 5, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); }); blob(ctx, x - 20, y + 10, 8, 5, '#fff', seed, { noGlint: true, noPrint: true }); blob(ctx, x + 20, y + 10, 8, 5, '#fff', seed + 1, { noGlint: true, noPrint: true }); }
  else if (a === 'almanac') { ctx.save(); ctx.translate(x, y); ctx.rotate(-0.12); blob(ctx, 0, 0, 20, 22, '#6a4a8a', seed); ctx.fillStyle = '#fff6e0'; ctx.fillRect(-14, -16, 4, 32); ctx.restore(); blob(ctx, x + 3, y - 3, 7, 7, '#ffcf4a', seed + 1, { noPrint: true }); }
  else if (a === 'island') { blob(ctx, x, y + 8, 22, 9, '#8a6a52', seed, { noGlint: true }); blob(ctx, x, y, 22, 8, s.col, seed + 1); if (s.ch === 2) { blob(ctx, x, y - 12, 12, 6, '#e8607a', seed + 2, { noPrint: true }); ctx.fillStyle = '#6a4a32'; ctx.fillRect(x - 1, y - 8, 2, 8); } else if (s.ch === 3) { for (const dx of [-8, 6]) { ctx.fillStyle = '#4f8a6a'; ctx.beginPath(); ctx.moveTo(x + dx - 6, y - 2); ctx.lineTo(x + dx, y - 20); ctx.lineTo(x + dx + 6, y - 2); ctx.fill(); } } else if (s.ch === 4) { ctx.fillStyle = '#6a6474'; ctx.fillRect(x - 8, y - 16, 16, 14); ctx.fillRect(x + 3, y - 24, 4, 8); bolt(ctx, x - 12, y - 16, 0.4, '#ffe14a'); } else { blob(ctx, x - 5, y - 9, 6, 6, '#ffcf55', seed + 3, { noPrint: true }); blob(ctx, x + 8, y - 6, 4, 4, '#ff8aa0', seed + 4, { noPrint: true }); } }
  else if (a === 'glint') { const n = s.n || 1; for (let i = 0; i < n; i++) { const gx = x + (i - (n - 1) / 2) * 15, gy = y + (i % 2 ? 6 : -3), r = n === 1 ? 17 : 10; ctx.fillStyle = '#bff0ff'; ctx.strokeStyle = 'rgba(30,18,30,.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let k = 0; k < 8; k++) { const t = (k / 8) * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? r * 0.42 : r; ctx[k ? 'lineTo' : 'moveTo'](gx + Math.cos(t) * rr, gy + Math.sin(t) * rr); } ctx.closePath(); ctx.fill(); ctx.stroke(); } }
}

export class Stickers {
  constructor(game) {
    this.game = game; this.isOpen = false; this.queue = []; this.busy = false;
    const book = document.createElement('div'); book.id = 'stickerBook'; book.className = 'hidden'; book.innerHTML = `<div class="stkCard"><div class="stkHead"><h2>Sticker Book <span id="stkCount"></span></h2><button id="stkClose" class="pill" aria-label="Close sticker book">Close <kbd>Esc</kbd></button></div><div id="stkBody"></div></div>`;
    document.body.appendChild(book); this.book = book; book.querySelector('#stkClose').onclick = () => this.close(); book.addEventListener('pointerdown', (e) => { if (e.target === book) this.close(); });
    const t = document.createElement('div'); t.id = 'stkToast'; t.innerHTML = '<canvas></canvas><span></span>'; document.body.appendChild(t); this.toastEl = t;
    addEventListener('keydown', (e) => { if (!this.isOpen) return; if (e.code === 'Escape' || e.code === 'KeyP') { e.preventDefault(); e.stopImmediatePropagation(); this.close(); } }, true);
    // entry points: the memories album, the pause menu (the arcade menu has its own button)
    const add = (sel, id, cls, label, where = 'append') => { const host = document.querySelector(sel); if (!host || document.getElementById(id)) return; const b = document.createElement('button'); b.id = id; b.className = cls; b.textContent = label; b.onclick = () => this.open(); if (where === 'before') host.parentNode.insertBefore(b, host); else host.appendChild(b); };
    add('#albumClose', 'albumStickers', 'btn alt', 'Sticker book', 'before'); add('#pArcade', 'pStickers', 'pill', 'Sticker book', 'before'); const p = document.getElementById('pStickers'), pa = document.getElementById('pArcade'); if (p && pa) pa.after(p);
    Progress.data.stickers ??= []; const fresh = this.check({ silent: true });
    if (fresh.length) setTimeout(() => this.toast(fresh.length === 1 ? `New sticker: ${fresh[0].name}` : `${fresh.length} stickers added to your Sticker Book`, fresh[0]), 1500);
    Progress.onSave = () => this.check();
  }
  has(id) { return (Progress.data.stickers || []).includes(id); }
  get count() { return STICKERS.filter((s) => this.has(s.id)).length; }
  /** evaluate every rule; unlock + announce the new ones. Returns the newly unlocked stickers. */
  check(opt = {}) {
    if (this.busy) return []; this.busy = true; const got = (Progress.data.stickers ??= []), fresh = [];
    try { for (const s of STICKERS) { if (got.includes(s.id)) continue; let ok = false; try { ok = s.test(); } catch {} if (ok) { got.push(s.id); fresh.push(s); } } if (fresh.length) Progress.save(); } finally { this.busy = false; }
    if (fresh.length && !opt.silent) { for (const s of fresh) this.queue.push(s); this.pump(); if (this.isOpen) this.render(); }
    return fresh;
  }
  pump() {
    if (this.showing || !this.queue.length) return; const s = this.queue.shift(); this.showing = true; this.toast(`New sticker: ${s.name}`, s);
    Haptics.sfx('sticker'); const a = this.game.audio; a?.tone?.(1046.5, 0.12, 0.06, 'triangle'); a?.tone?.(1568, 0.22, 0.06, 'triangle', 0, 0.1);
    setTimeout(() => { this.showing = false; this.pump(); }, 2600);
  }
  toast(msg, s) { const t = this.toastEl; t.querySelector('span').textContent = msg; const cv = t.querySelector('canvas'); if (s) drawSticker(cv, s, false); cv.style.display = s ? '' : 'none'; t.classList.add('show'); clearTimeout(this._tt); this._tt = setTimeout(() => t.classList.remove('show'), 2400); }
  open() { this.isOpen = true; this.render(); this.book.classList.remove('hidden'); this.book.querySelector('#stkClose').focus?.({ preventScroll: true }); }
  close() { this.isOpen = false; this.book.classList.add('hidden'); }
  render() {
    const body = this.book.querySelector('#stkBody'); body.innerHTML = ''; this.book.querySelector('#stkCount').textContent = `${this.count} / ${STICKERS.length}`;
    let grid = null, group = null;
    for (const s of STICKERS) {
      if (s.group !== group) { group = s.group; const h = document.createElement('h3'); h.textContent = group; body.appendChild(h); grid = document.createElement('div'); grid.className = 'stkGrid'; body.appendChild(grid); }
      const on = this.has(s.id), d = document.createElement('div'); d.className = 'stk' + (on ? '' : ' locked'); d.dataset.id = s.id; d.title = s.hint;
      const cv = document.createElement('canvas'); drawSticker(cv, s, !on); const n = document.createElement('b'); n.textContent = on ? s.name : '???'; const h = document.createElement('small'); h.textContent = s.hint; d.append(cv, n, h); grid.appendChild(d);
    }
  }
}
