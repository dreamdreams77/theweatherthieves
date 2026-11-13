import './../src/style.css';
import { Game } from './core/Game.js';
import { Assets } from './gfx/Assets.js';
import { Settings } from './core/Settings.js';
import { Progress } from './core/Progress.js';

const canvas = document.getElementById('c');
const bar = document.querySelector('.loadbar i'), btn = document.getElementById('begin'), cont = document.getElementById('continue');
window.addEventListener('error', (e) => console.error('[game error]', e.message));
function start() {
  let game;
  try {
    game = new Game(canvas);
    bar.style.width = '35%';
    // yield so the loading UI paints, then build
    requestAnimationFrame(() => setTimeout(async () => {
      await Assets.load((p) => (bar.style.width = 35 + p * 35 + '%')); game.useAssets?.();
      Settings.load(); game.build((p) => (bar.style.width = 70 + p * 30 + '%')); game.applySettings();
      window.__game = game;
      let has = false; try { has = !!localStorage.getItem('weather-thieves-save-v1') || (Progress.data.chapter || 1) > 1; } catch {}
      document.querySelector('.loadbar').style.display = 'none'; btn.disabled = false; btn.textContent = has ? 'Continue' : 'Begin the journey';
      if (has) { cont.classList.remove('hidden'); cont.addEventListener('click', () => { if (confirm('Start a new game? Your saved progress will be erased.')) game.begin(true); }); }
      btn.addEventListener('click', () => game.begin(false));
      let last = performance.now();
      const loop = (now) => { const dt = (now - last) / 1000; last = now; try { game.frame(dt); } catch (e) { console.error(e); } requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    }, 30));
  } catch (e) { console.error(e); document.getElementById('title').insertAdjacentHTML('beforeend', '<p>Sorry — your browser could not start WebGL.</p>'); }
}
start();
