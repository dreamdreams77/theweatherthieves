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

// ---- installable app: offline service worker + "Install app" button (Android/desktop prompt, iOS instructions)
const standalone = matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone === true;
if ('serviceWorker' in navigator && import.meta.env.PROD && !/[?&](nosw|norender)=1/.test(location.search)) addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('offline cache unavailable', e)));
let deferred = null; const showInstall = () => document.getElementById('pInstall')?.classList.remove('hidden');
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; showInstall(); });
addEventListener('appinstalled', () => { deferred = null; document.getElementById('pInstall')?.classList.add('hidden'); window.__game?.ui.toast('Installed! The Weather Thieves now lives on your home screen and plays offline.', 6000); });
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const wireInstall = () => { const b = document.getElementById('pInstall'); if (!b) return setTimeout(wireInstall, 300); if (isIOS && !standalone) showInstall();
  b.addEventListener('click', async () => { if (deferred) { deferred.prompt(); const r = await deferred.userChoice.catch(() => null); deferred = null; if (r?.outcome === 'accepted') b.classList.add('hidden'); } else if (isIOS) window.__game?.ui.toast('On iPhone / iPad: tap the Share button, then "Add to Home Screen".', 8000); }); };
if (!standalone) wireInstall();
