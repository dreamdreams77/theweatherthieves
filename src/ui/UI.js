import * as THREE from 'three';
import { TOOLS } from '../core/Tools.js';
import { clamp } from '../core/Utils.js';
import { Progress } from '../core/Progress.js';
import { Settings } from '../core/Settings.js';
import { MEMORY_DB, drawMemory } from './memories.js';
import { ALMANAC } from '../core/Combos.js';
import { TRIALS } from '../core/Trials.js';
import { CHAPTERS } from '../chapters/index.js';

const ICON = {
  cloud: '<path d="M7 18h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7 9.3 4.4 4.4 0 0 0 7 18z" fill="currentColor"/>',
  rain: '<path d="M7 13h10a3.6 3.6 0 0 0 .5-7.2A5 5 0 0 0 7.4 6 3.6 3.6 0 0 0 7 13z" fill="currentColor"/><path d="M8 16l-1 3M12 16l-1 3M16 16l-1 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  wind: '<path d="M3 9h10a2.5 2.5 0 1 0-2.4-3M3 13h14a2.5 2.5 0 1 1-2.4 3M3 17h7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  sun: '<circle cx="12" cy="12" r="4.2" fill="currentColor"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  frost: '<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
};
const svg = (n) => `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">${ICON[n]}</svg>`;
const NAMES = { juno: 'Juno', fen: 'Fen', sunny: 'Sunny', narrator: '' };
const COLORS = { juno: '#f3b52f', fen: '#7fb1d6', sunny: '#ffcf55', narrator: '#cbbcff' };
export function registerSpeaker(id, name, color) { NAMES[id] = name; COLORS[id] = color; }

export class UI {
  constructor(game) {
    this.game = game; this.root = document.getElementById('ui'); this.barks = []; this.toastT = 0; this.hoverEl = null;
    this.root.innerHTML = `
      <div id="obj" class="panel"><div class="obj-h">Chapter 1 · The Sunken Sky</div><div id="objText">&nbsp;</div><div id="objSub"></div></div>
      <div id="top-r"><div id="glints" class="pill" title="Sky Glints found"><span class="gem"></span><b id="glintN">0</b>/5</div><button id="mute" class="pill" aria-label="Toggle sound">♪</button><button id="memBtn" class="pill" aria-label="Memories">Memories</button><button id="pauseBtn" class="pill" aria-label="Pause and settings">❚❚</button><button id="helpBtn" class="pill" aria-label="Help">?</button></div>
      <div id="toast" class="toast"></div>
      <div id="trialHud" class="panel"></div>
      <button id="askFen" class="pill" aria-label="Ask Fen for a hint">Ask Fen <kbd>H</kbd></button>
      <div id="hover" class="hover"></div>
      <div id="barks"></div>
      <div id="meter"><div class="mt-l" id="mtName">Cloud</div><div class="mt-b"><i id="mtFill"></i></div><div class="mt-s" id="mtStretch"></div></div>
      <div id="toolbar" class="panel">${TOOLS.map((t, i) => `<button class="tool" data-i="${i}" style="--c:${t.color}" aria-label="${t.name} tool"><span class="ic">${svg(t.id)}</span><span class="nm">${t.name}</span><kbd>${t.key}</kbd></button>`).join('')}</div>
      <div id="toolhint"></div>
      <div id="dlg" class="panel hidden"><div id="dName"></div><div id="dText"></div><div id="dNext">▾</div></div>
      <div id="flash"></div>
      <div id="help" class="overlay hidden"><div class="card"><h2>How to play</h2><ul>
        <li><b>Move</b> WASD / arrows · <b>Jump</b> Space · <b>Camera</b> right-drag · <b>Zoom</b> wheel</li>
        <li><b>1 Cloud</b> click a cloud to carry it; wheel or Q/E squashes and stretches it</li>
        <li><b>2 Rain</b> hold to rain from your cloud · <b>3 Wind</b> hold to blow a gust</li>
        <li><b>4 Sun</b> hold to bounce sunlight from a mirror · <b>5 Frost</b> hold to freeze</li>
        <li><b>F</b> talk / use · <b>Esc</b> close this</li></ul><button id="helpClose" class="btn">Back to the sky</button></div></div>
      <div id="end" class="overlay hidden"><div class="card end"><div class="eyebrow">Chapter 1 complete</div><h1>The Sunken Sky is saved</h1><p>Sunny is free — and four more jars are waiting.<br>Rain's village, Snow's forest and Thunder's factory still need their weather back.</p><p class="sm" id="endStats"></p><button id="endNext" class="btn">Next chapter</button> <button id="endClose" class="btn alt">Keep exploring</button></div></div>
      <div id="pause" class="overlay hidden"><div class="card wide pausecard"><h2>Paused</h2>
        <div class="prow"><button id="pResume" class="btn">Resume</button><button id="pRestart" class="btn alt">Restart chapter</button><button id="pHelp" class="btn alt">Controls</button></div>
        <h3>Chapters</h3><div id="pChapters" class="prow"></div>
        <h3>Weather trials</h3><div id="pTrials" class="prow trials"></div>
        <h3>Settings</h3>
        <label class="set">Sound volume <input id="sVol" type="range" min="0" max="1" step="0.05"></label>
        <label class="set">Music <input id="sMusic" type="range" min="0" max="1" step="0.05"></label>
        <label class="set"><input id="sMotion" type="checkbox"> Reduce motion (no camera shake or flashes)</label>
        <label class="set"><input id="sText" type="checkbox"> Larger text</label>
        <label class="set"><input id="sInvert" type="checkbox"> Invert camera up/down</label>
        <label class="set"><input id="sFx" type="checkbox"> Glow &amp; film effects (turn off for speed)</label>
      </div></div>
      <div id="chapterCard"><div class="cc-no"></div><div class="cc-t"></div></div>
      <div id="album" class="overlay hidden"><div class="card wide"><h2>Weather memories</h2><div id="albumGrid"></div><h2>Weather almanac</h2><div id="almanac"></div><button id="albumClose" class="btn">Close</button></div></div>
      <div id="touch" class="hidden">
        <div id="stick"><i id="knob"></i></div>
        <div id="tbtns"><button id="bUse" class="tb big">USE</button><button id="bJump" class="tb">Jump</button><button id="bMinus" class="tb sm">−</button><button id="bPlus" class="tb sm">+</button><button id="bTalk" class="tb sm">Talk</button></div>
      </div>`;
    this.q = (s) => this.root.querySelector(s);
    this.tools = [...this.root.querySelectorAll('.tool')]; this.tools.forEach((b) => b.addEventListener('click', () => game.tools.select(+b.dataset.i)));
    this.q('#mute').addEventListener('click', () => { game.audio.start(); game.audio.setMuted(!game.audio.muted); this.q('#mute').classList.toggle('off', game.audio.muted); });
    this.q('#helpBtn').addEventListener('click', () => this.q('#help').classList.remove('hidden')); this.q('#helpClose').addEventListener('click', () => this.q('#help').classList.add('hidden'));
    this.q('#endClose').addEventListener('click', () => this.q('#end').classList.add('hidden'));
    this.q('#endNext').addEventListener('click', () => { this.q('#end').classList.add('hidden'); game.loadChapter(game.chapterNo + 1); });
    this.q('#askFen').addEventListener('click', () => game.askFen());
    this.q('#pauseBtn').addEventListener('click', () => game.pause(!game.paused)); this.q('#pResume').addEventListener('click', () => game.pause(false));
    this.q('#pHelp').addEventListener('click', () => { this.q('#help').classList.remove('hidden'); });
    this.q('#pRestart').addEventListener('click', () => { if (!confirm('Restart this chapter from the beginning?')) return; Progress.data.flags['ch' + game.chapterNo] = null; if (game.chapterNo === 1) { try { localStorage.removeItem('weather-thieves-save-v1'); } catch {} } Progress.save(); game.pause(false); game.loadChapter(game.chapterNo); });
    const S = Settings.data, bind = (id, key, ev = 'input', get = (el) => +el.value) => { const el = this.q(id); if (el.type === 'checkbox') el.checked = !!S[key]; else el.value = S[key]; el.addEventListener(ev, () => { S[key] = el.type === 'checkbox' ? el.checked : get(el); Settings.save(); game.applySettings(); }); };
    bind('#sVol', 'volume'); bind('#sMusic', 'music'); bind('#sMotion', 'reduceMotion', 'change'); bind('#sText', 'bigText', 'change'); bind('#sInvert', 'invertY', 'change'); { const fx = this.q('#sFx'); fx.checked = S.fx ?? !game.quality.mobile; fx.addEventListener('change', () => { S.fx = fx.checked; Settings.save(); game.applySettings(); }); }
    addEventListener('keydown', (e) => { if ((e.code === 'Escape' || e.code === 'KeyP') && game.state !== 'title' && game.state !== 'loading' && this.q('#help').classList.contains('hidden') && this.q('#album').classList.contains('hidden')) { e.preventDefault(); game.pause(!game.paused); } });
    this.q('#memBtn').addEventListener('click', () => { this.refreshMemories(); this.q('#album').classList.remove('hidden'); }); this.q('#albumClose').addEventListener('click', () => this.q('#album').classList.add('hidden'));
    this.dlg = { lines: [], i: 0, typing: false, text: '', pos: 0, onEnd: null, onLine: null, active: false };
    const adv = () => this.advance(); this.q('#dlg').addEventListener('pointerdown', (e) => { e.stopPropagation(); adv(); });
    addEventListener('keydown', (e) => { if ((e.code === 'Enter' || e.code === 'KeyF' || e.code === 'Space') && this.dlg.active) { e.preventDefault(); adv(); } if (e.code === 'Escape') this.q('#help').classList.add('hidden'); if (e.code === 'KeyH' && game.state === 'play' && !game.paused) game.askFen(); });
    this.setTool(0); this.initTouch();
  }
  initTouch() {
    const input = this.game.input, touch = this.q('#touch'); this.touchEl = touch;
    const stick = this.q('#stick'), knob = this.q('#knob'); let sid = null, cx = 0, cy = 0;
    const move = (e) => { let dx = e.clientX - cx, dy = e.clientY - cy; const m = Math.hypot(dx, dy), R = 52; if (m > R) { dx *= R / m; dy *= R / m; } knob.style.transform = `translate(${dx}px,${dy}px)`; input.touchMove.set(dx / R, -dy / R); };
    stick.addEventListener('pointerdown', (e) => { sid = e.pointerId; stick.setPointerCapture(sid); const r = stick.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; move(e); });
    stick.addEventListener('pointermove', (e) => { if (e.pointerId === sid) move(e); });
    const end = (e) => { if (e.pointerId === sid) { sid = null; knob.style.transform = ''; input.touchMove.set(0, 0); } }; stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
    const hold = (el, on, off) => { el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.setPointerCapture(e.pointerId); on(); el.classList.add('on'); }); const o = () => { off?.(); el.classList.remove('on'); }; el.addEventListener('pointerup', o); el.addEventListener('pointercancel', o); };
    hold(this.q('#bUse'), () => { input.useHeld = true; input.tapUse = true; }, () => (input.useHeld = false));
    hold(this.q('#bJump'), () => input.pressedTouch.add('jump'));
    hold(this.q('#bMinus'), () => (input.stretchHeld = -1), () => (input.stretchHeld = 0)); hold(this.q('#bPlus'), () => (input.stretchHeld = 1), () => (input.stretchHeld = 0));
    hold(this.q('#bTalk'), () => this.game.interact());
    input.stretchHeld = 0;
    this.q('#bUse').textContent = 'USE';
  }
  showTouch(v) { this.touchEl.classList.toggle('hidden', !v); document.body.classList.toggle('touch', v); }
  setTool(i) { this.tools.forEach((b, k) => b.classList.toggle('sel', k === i)); const t = TOOLS[i]; this.q('#toolhint').textContent = t.name + ' — ' + t.hint; this.q('#toolhint').classList.remove('fade'); clearTimeout(this._th); this._th = setTimeout(() => this.q('#toolhint').classList.add('fade'), 5500); }
  setMeter(m, c) { const el = this.q('#meter'); if (m === null) { el.classList.remove('show'); return; } el.classList.add('show'); this.q('#mtFill').style.width = (m * 100).toFixed(0) + '%'; this.q('#mtName').textContent = c.name; this.q('#mtStretch').textContent = c.stretch > 1.15 ? 'stretched · gentle drizzle' : c.stretch < 0.85 ? 'squashed · heavy downpour' : 'normal'; }
  setChapterLabel(n, title) { this.q('.obj-h').textContent = 'Chapter ' + n + ' · ' + title; }
  setObjective(text, sub = '') { const o = this.q('#objText'); if (o.textContent !== text) { o.textContent = text; this.q('#obj').classList.remove('pulse'); void this.q('#obj').offsetWidth; this.q('#obj').classList.add('pulse'); } this.q('#objSub').textContent = sub; }
  setGlints(n) { this.q('#glintN').textContent = n; }
  setHover(type, obj) { const el = this.q('#hover'); let txt = ''; if (type === 'npc') txt = obj.name + ' (click / F to talk)'; if (type === 'cloud') txt = obj.name; else if (type === 'mirror') txt = 'Sun mirror'; else if (type === 'puffkin') txt = 'Puffkin'; else if (type === 'fen') txt = 'Fen (press F to chat)'; else if (type === 'jar') txt = 'The Glass Jar'; else if (type === 'glint') txt = 'Sky Glint'; el.textContent = txt; el.classList.toggle('show', !!txt && this.game.state === 'play'); if (txt) { const p = this.game.input.touchMode ? { x: innerWidth / 2, y: innerHeight * 0.46 } : this.game.input.pointerPx; el.style.transform = `translate(${p.x + 16}px,${p.y + 16}px)`; } }
  toast(text, ms = 4200) { const t = this.q('#toast'); t.textContent = text; t.classList.add('show'); clearTimeout(this._tt); this._tt = setTimeout(() => t.classList.remove('show'), ms); }
  flash() { if (Settings.data.reduceMotion) return; const f = this.q('#flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }
  bark(getPos, text, ms = 2600, who = 'fen') {
    const el = document.createElement('div'); el.className = 'bark ' + who; el.textContent = text; this.q('#barks').appendChild(el);
    this.barks.push({ el, getPos, t: ms / 1000 }); if (this.barks.length > 5) { const b = this.barks.shift(); b.el.remove(); }
  }
  updateBarks(dt, camera) {
    const v = new THREE.Vector3(); for (let i = this.barks.length - 1; i >= 0; i--) { const b = this.barks[i]; b.t -= dt; if (b.t <= 0) { b.el.remove(); this.barks.splice(i, 1); continue; }
      v.copy(b.getPos()).project(camera); const vis = v.z < 1 && Math.abs(v.x) < 1.2; b.el.style.opacity = vis ? Math.min(1, b.t * 2) : 0; b.el.style.transform = `translate(-50%,-100%) translate(${(v.x * 0.5 + 0.5) * innerWidth}px,${(-v.y * 0.5 + 0.5) * innerHeight}px)`; }
  }
  // ---- dialogue
  play(lines, { onLine, onEnd } = {}) {
    const d = this.dlg; d.lines = lines; d.i = -1; d.onEnd = onEnd; d.onLine = onLine; d.active = true; this.game.state = 'dialogue'; this.q('#dlg').classList.remove('hidden'); this.q('#toolhint').classList.add('fade'); this.next();
  }
  next() {
    const d = this.dlg; d.i++; if (d.i >= d.lines.length) { this.endDialogue(); return; } const l = d.lines[d.i]; d.text = l.text; d.pos = 0; d.typing = true; d.who = l.who;
    const nm = this.q('#dName'); nm.textContent = NAMES[l.who] ?? l.who; nm.style.color = COLORS[l.who] || '#fff'; nm.style.display = NAMES[l.who] === '' ? 'none' : ''; this.q('#dText').textContent = ''; this.q('#dlg').classList.toggle('narr', l.who === 'narrator'); this.q('#dNext').style.opacity = 0; d.onLine?.(l); d._t = 0;
  }
  advance() { const d = this.dlg; if (!d.active) return; if (d.typing) { d.pos = d.text.length; d.typing = false; this.q('#dText').textContent = d.text; this.q('#dNext').style.opacity = 1; this.game.talkEnd?.(); } else this.next(); }
  endDialogue() { const d = this.dlg; d.active = false; this.q('#dlg').classList.add('hidden'); this.game.state = 'play'; this.game.talkEnd?.(); const cb = d.onEnd; d.onEnd = null; cb?.(); }
  updateDialogue(dt) {
    const d = this.dlg; if (!d.active || !d.typing) return; d._t += dt * 46; const n = Math.min(d.text.length, Math.floor(d._t)); if (n !== d.pos) { if (n % 2 === 0) this.game.audio.blip(d.who); d.pos = n; this.q('#dText').textContent = d.text.slice(0, n); }
    if (d.pos >= d.text.length) { d.typing = false; this.q('#dNext').style.opacity = 1; this.game.talkEnd?.(); }
  }
  showPause(on) {
    this.q('#pause').classList.toggle('hidden', !on); if (!on) return; const box = this.q('#pChapters'); box.innerHTML = ''; const un = Progress.unlocked();
    const tr = this.q('#pTrials'); tr.innerHTML = ''; for (let n = 1; n <= 4; n++) { const b = (Progress.data.trials || {})[n], d = document.createElement('div'); d.className = 'trow ' + (b?.medal || ''); d.innerHTML = `<b>${TRIALS[n].name}</b><span>${b ? b.time.toFixed(1) + ' s · ' + (b.medal || 'no medal') : 'not tried yet — find the glowing stone in chapter ' + n}</span>`; tr.appendChild(d); }
    for (let n = 1; n <= 4; n++) { const b = document.createElement('button'); b.className = 'btn alt chbtn' + (n === this.game.chapterNo ? ' cur' : ''); b.textContent = n + '. ' + (CHAPTERS[n]?.title || ''); b.disabled = n > un; if (n > un) b.title = 'Locked — finish the chapter before it'; b.addEventListener('click', () => { this.game.pause(false); if (n !== this.game.chapterNo) this.game.loadChapter(n); }); box.appendChild(b); }
  }
  refreshMemories() {
    const grid = this.q('#albumGrid'); grid.innerHTML = ''; const have = Progress.data.memories; const ids = Object.keys(MEMORY_DB);
    for (const id of ids) { const m = MEMORY_DB[id], div = document.createElement('div'); div.className = 'mem' + (have.includes(id) ? '' : ' locked'); const cv = document.createElement('canvas'); cv.width = 160; cv.height = 90; if (have.includes(id)) drawMemory(cv, id); div.appendChild(cv); const t = document.createElement('div'); t.className = 'mt'; t.textContent = have.includes(id) ? m.title : '???'; const x = document.createElement('div'); x.className = 'mx'; x.textContent = have.includes(id) ? m.text : 'Not found yet'; div.append(t, x); grid.appendChild(div); }
    this.q('#memBtn').textContent = 'Memories ' + have.length + '/' + ids.length;
    const al = this.q('#almanac'); al.innerHTML = ''; const got = Progress.data.almanac || []; for (const [id, a] of Object.entries(ALMANAC)) { const d = document.createElement('div'); d.className = 'alm' + (got.includes(id) ? '' : ' locked'); d.innerHTML = `<b>${got.includes(id) ? a.name : '???'}</b><span>${got.includes(id) ? a.desc : 'Try: ' + a.hint}</span>`; al.appendChild(d); }
  }
  showEnd(stats, chapterDone) {
    const nxt = CHAPTERS[(this.game.chapterNo || 1) + 1]; const b = this.q('#endNext'); b.style.display = nxt ? '' : 'none'; if (nxt) b.textContent = 'Next: ' + nxt.title; if (chapterDone) { this.q('#end .eyebrow').textContent = 'Chapter ' + this.game.chapterNo + ' complete'; this.q('#end h1').textContent = this.game.chapterTitle() + ' is saved'; if (chapterDone === 4) { this.q('#end .eyebrow').textContent = 'The End'; this.q('#end h1').textContent = 'The weather is home'; this.q('#end p').innerHTML = 'Sunshine, rain, snow and thunder are back — and so is the sky’s memory.<br>Juno, Fen and Wren will look after them together.'; } } this.q('#endStats').textContent = stats; this.q('#end').classList.remove('hidden'); }
}
