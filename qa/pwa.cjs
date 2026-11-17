// Installable app: manifest + icons, service worker precaches everything, game boots OFFLINE; phone vibration feedback.
const { chromium } = require('playwright');
const { sleep, launch, check, results } = require('./lib.cjs');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 900, height: 540 } }); const page = await ctx.newPage(); const logs = [];
  page.on('pageerror', (e) => logs.push(e.message));
  await page.goto('http://localhost:4173/'); await page.waitForFunction(() => window.__game && __game.state === 'title', null, { timeout: 120000 });
  const man = await page.evaluate(async () => { const l = document.querySelector('link[rel=manifest]'); const m = await (await fetch(l.href)).json(); const icons = await Promise.all(m.icons.map(async (i) => { const r = await fetch(new URL(i.src, l.href)); const b = await createImageBitmap(await r.blob()); return [i.sizes, i.purpose, b.width]; })); return { name: m.name, display: m.display, start: m.start_url, icons, apple: !!document.querySelector('link[rel=apple-touch-icon]') }; });
  check('manifest: name, fullscreen display, start url', man.name === 'The Weather Thieves' && man.display === 'fullscreen' && man.start === './index.html', JSON.stringify(man).slice(0, 160));
  check('icons load at their declared sizes (any + maskable + apple)', man.icons.length === 4 && man.icons.every(([s, , w]) => s === w + 'x' + w) && man.apple, JSON.stringify(man.icons));
  await page.waitForFunction(() => navigator.serviceWorker.controller || navigator.serviceWorker.ready.then(() => true), null, { timeout: 60000 });
  await page.waitForFunction(async () => { const ks = await caches.keys(); const k = ks.find((x) => x.startsWith('weather-thieves-') && true); if (!k) return false; return (await (await caches.open(k)).keys()).length >= 40; }, null, { timeout: 120000, polling: 1000 });
  const n = await page.evaluate(async () => { const k = (await caches.keys()).find((x) => x.startsWith('weather-thieves-') && true); const ks = await (await caches.open(k)).keys(); return { n: ks.length, glb: ks.filter((r) => r.url.endsWith('.glb')).length, hdr: ks.some((r) => r.url.endsWith('.hdr')) }; });
  check('service worker precached the whole game (models, HDR, code)', n.n >= 40 && n.glb >= 30 && n.hdr, JSON.stringify(n));
  // offline: close the tab, cut the network, open the game again in a fresh tab of the same browser profile
  await page.waitForFunction(() => navigator.serviceWorker.ready.then((r) => r.active && r.active.state === 'activated'), null, { timeout: 60000 });
  await page.close(); await ctx.setOffline(true); const page2 = await ctx.newPage(); page2.on('pageerror', (e) => logs.push(e.message));
  await page2.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' }).catch((e) => logs.push('goto ' + e.message)); await page2.waitForFunction(() => window.__game && __game.state === 'title', null, { timeout: 120000 }).catch(() => {});
  const off = await page2.evaluate(() => ({ st: window.__game?.state, online: navigator.onLine, ctl: !!navigator.serviceWorker.controller }));
  check('game boots to the title screen while OFFLINE', off.st === 'title' && off.online === false && off.ctl, JSON.stringify(off));
  await page2.click('#begin'); await sleep(800); check('and starts playing offline (opening scene, intro or play)', await page2.evaluate(() => ['opening', 'dialogue', 'play'].includes(__game.state)));
  await ctx.setOffline(false); check('no page errors (pwa)', logs.length === 0, logs.slice(0, 3).join(' | ')); await browser.close();
  // --- haptics on a phone (navigator.vibrate is recorded)
  const L = await launch({ mobile: true, w: 390, h: 844 }); const p2 = L.page;
  await p2.evaluate(() => { window.__vib = []; navigator.vibrate = (p) => { window.__vib.push(p); return true; }; });
  await p2.tap('#begin'); await sleep(400); for (let i = 0; i < 40 && (await p2.evaluate(() => __game.ui.dlg.active)); i++) { await p2.tap('#dlg'); await sleep(110); }
  await p2.evaluate(() => { const g = __game; g.tools.grab(g.weather.clouds.find((c) => !c.personal && !c.fixed)); }); await sleep(150);
  const v1 = await p2.evaluate(() => window.__vib.slice());
  check('phone vibrates when a cloud is grabbed', v1.includes(15), JSON.stringify(v1));
  await p2.tap('.tool[data-i="2"]'); await sleep(150); const b = await p2.locator('#bUse').boundingBox(); await p2.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await sleep(200);
  await p2.evaluate(() => __game.weather.bolt(__game.player.pos.clone().setY(20), __game.player.pos.clone())); await sleep(150);
  const v2 = await p2.evaluate(() => window.__vib.slice());
  check('USE and lightning give their own buzzes', v2.includes(8) && v2.some((p) => Array.isArray(p) && p[2] === 60), JSON.stringify(v2));
  await p2.evaluate(() => { __game.pause(true); }); await sleep(150); await p2.tap('#sVib'); await p2.tap('#pResume'); await sleep(150);
  await p2.evaluate(() => { window.__vib = []; __game.tools.drop(); __game.tools.grab(__game.weather.clouds.find((c) => !c.personal && !c.fixed)); }); await sleep(150);
  check('the Vibration setting turns it off', (await p2.evaluate(() => window.__vib.length)) === 0 && (await p2.evaluate(() => JSON.parse(localStorage.getItem('weather-thieves-settings-v1')).vibrate)) === false);
  check('no console errors (haptics)', L.logs.length === 0, L.logs.slice(0, 3).join(' | ')); await L.browser.close();
  const bad = results.filter((x) => !x.ok); console.log(bad.length ? 'RESULT: ' + bad.length + ' FAILED' : 'RESULT: ALL ' + results.length + ' CHECKS PASSED'); process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error('TEST CRASH', e); process.exit(2); });
