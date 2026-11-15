// New arcade games (Rainbow Rhythm, Snowball Stack, Lightning Link) with real keys / mouse / touch, plus the Sticker Book:
// unlock toast, persistence across reload, rendering. Run against a preview server: QA_URL=http://localhost:4181/?norender=1 node qa/stickers.cjs
const { sleep, launch, check, results } = require('./lib.cjs');
const SH = 'qa/shots/', KEY = 'weather-thieves-progress-v1', LANE_KEYS = ['ArrowLeft', 'ArrowDown', 'ArrowRight'];
const saved = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), KEY);
(async () => {
  let { browser, page, logs } = await launch({ w: 1100, h: 620 });
  let ev = (f, a) => page.evaluate(f, a); global.DBG = async () => [logs, await page.evaluate(() => JSON.stringify({ open: __game.arcade.open, cur: __game.arcade.cur?.constructor.id, ended: __game.arcade.ended, t: __game.arcade.t, st: __game.arcade.cur?.state, dead: __game.arcade.cur?.dead, endT: __game.arcade.cur?.endT })).catch((e) => e.message)];
  await page.click('#begin'); await sleep(400); for (let i = 0; i < 40 && (await ev(() => __game.ui.dlg.active)); i++) { await page.keyboard.press('Enter'); await sleep(110); }
  await ev(() => __game.arcade.openMenu()); await sleep(200);
  const m = await ev(() => [...document.querySelectorAll('.arcGame')].map((b) => b.dataset.id));
  check('arcade menu lists 6 games, original three first', m.length === 6 && m.slice(0, 3).join() === 'catch,glide,match' && m.slice(3).join() === 'rhythm,stack,link', m.join());
  await page.screenshot({ path: SH + 'arcade-menu6.png', timeout: 120000 });

  // --- Rainbow Rhythm with the keyboard (number key 4 opens it)
  await page.keyboard.press('Digit4'); await page.waitForFunction(() => __game.arcade.cur?.constructor.id === 'rhythm', null, { timeout: 20000 });
  check('number key 4 starts Rainbow Rhythm', true);
  // in-page rAF waits (Playwright's own raf polling misses short windows on this machine)
  const rhythm = async (ms, hit) => { const end = Date.now() + ms; while (Date.now() < end) { const l = await ev(() => new Promise((res) => { let k = 0; const f = () => { k++; const c = __game.arcade.cur; if (!c || c.constructor.id !== 'rhythm') return res(null); const x = c.notes.filter((q) => !q.j && q.h - c.t > -0.1).sort((a, b) => a.h - b.h)[0]; if (x && x.h - c.t < 0.03) res(x.l); else if (k > 300) res(null); else requestAnimationFrame(f); }; f(); })); if (l !== null) { await hit(l); await sleep(20); } } };
  const aimed = () => ev(() => new Promise((res) => { let k = 0; const f = () => { k++; const c = __game.arcade.cur; if (c.dead) return res('dead'); const top = c.balls[c.balls.length - 1]; if ((c.state === 'aim' && Math.abs(c.swingX() - (top ? top.x : 0)) < 0.3) || k > 1500) res(c.state); else requestAnimationFrame(f); }; f(); }));
  await rhythm(9000, (l) => page.keyboard.press(LANE_KEYS[l]));
  await page.screenshot({ path: SH + 'arcade-rhythm.png', timeout: 120000 });
  let r = await ev(() => ({ s: __game.arcade.cur.score, h: __game.arcade.cur.hits, miss: __game.arcade.cur.notes.filter((n) => n.j === 'miss').length }));
  check('Rainbow Rhythm: lane keys hit drops in time and score', r.h >= 3 && r.s > 0, JSON.stringify(r));
  await ev(() => (__game.arcade.cur.t = 40.55)); await page.waitForFunction(() => __game.arcade.ended, null, { timeout: 20000 });
  r = await ev(() => __game.arcade.lastScore); check('Rainbow Rhythm: score saved at the end', (await saved(page)).arcade?.rhythm === r, String(r));

  // --- Snowball Stack with Space
  await page.keyboard.press('Escape'); await sleep(150); await page.keyboard.press('Digit5'); await page.waitForFunction(() => __game.arcade.cur?.constructor.id === 'stack', null, { timeout: 20000 });
  for (let i = 0; i < 6; i++) { await aimed(); if (await ev(() => __game.arcade.cur.dead)) break; await page.keyboard.press('Space'); await page.waitForFunction(() => __game.arcade.cur.state !== 'fall', null, { timeout: 10000 }); await sleep(60); }
  await sleep(300); await page.screenshot({ path: SH + 'arcade-stack.png', timeout: 120000 });
  r = await ev(() => ({ h: __game.arcade.cur.height, s: __game.arcade.cur.score, p: __game.arcade.cur.perfects, lives: __game.arcade.cur.lives }));
  check('Snowball Stack: Space drops snowballs that stack up', r.h >= 4 && r.s >= 4, JSON.stringify(r));
  await ev(() => (__game.arcade.cur.lives = 0)); await page.waitForFunction(() => __game.arcade.ended, null, { timeout: 20000 });
  r = await ev(() => __game.arcade.lastScore); check('Snowball Stack: score saved', (await saved(page)).arcade?.stack === r, String(r));

  // --- Lightning Link: arrow keys zap the highlighted cloud; mouse drag from a cloud to its rod
  await page.keyboard.press('Escape'); await sleep(150); await page.click('.arcGame[data-id="link"]'); await page.waitForFunction(() => __game.arcade.cur?.constructor.id === 'link', null, { timeout: 20000 });
  for (let i = 0; i < 8; i++) { const c = await ev(() => __game.arcade.cur.current()?.c ?? -1); if (c < 0) { await sleep(250); continue; } await page.keyboard.press(LANE_KEYS[c]); await sleep(200); }
  r = await ev(() => ({ l: __game.arcade.cur.links, s: __game.arcade.cur.score, lives: __game.arcade.cur.lives }));
  check('Lightning Link: keys zap clouds into matching rods', r.l >= 4 && r.s > 4 && r.lives === 3, JSON.stringify(r));
  await page.waitForFunction(() => __game.arcade.cur.clouds.length > 0, null, { timeout: 20000 });
  const l0 = await ev(() => __game.arcade.cur.links), tg = await ev(() => { const c = __game.arcade.cur, g = c.geo(), k = c.clouds[0]; return { x: k.x * g.W, y: k.y * g.H, rx: c.rodX(k.c), ry: g.rodY }; });
  await page.mouse.move(tg.x, tg.y); await page.mouse.down(); for (let i = 1; i <= 6; i++) { await page.mouse.move(tg.x + (tg.rx - tg.x) * i / 6, tg.y + (tg.ry - tg.y) * i / 6); await sleep(40); } await page.screenshot({ path: SH + 'arcade-link.png', timeout: 120000 }); await page.mouse.up(); await sleep(250);
  check('Lightning Link: dragging a cloud onto its rod with the mouse links it', (await ev(() => __game.arcade.cur.links)) === l0 + 1);
  // ending with 40 points crosses the bronze + silver thresholds -> sticker toast
  await ev(() => { __game.arcade.cur.score = 40; __game.arcade.cur.time = 0.05; }); await page.waitForFunction(() => __game.arcade.ended, null, { timeout: 20000 });
  await page.waitForFunction(() => document.getElementById('stkToast').classList.contains('show'), null, { timeout: 5000 }).catch(() => {});
  r = await ev(() => ({ toast: document.getElementById('stkToast').classList.contains('show') ? document.querySelector('#stkToast span').textContent : '', vis: getComputedStyle(document.getElementById('stkToast')).zIndex, end: document.getElementById('arcEndS').textContent }));
  const sv = await saved(page);
  check('Lightning Link: score + medal saved', sv.arcade?.link === 40 && /silver medal/.test(r.end), r.end);
  check('crossing arcade thresholds unlocks stickers with a "New sticker" toast above the arcade', /New sticker: Lightning Link/.test(r.toast) && +r.vis > 60 && sv.stickers.includes('arc-link-bronze') && sv.stickers.includes('arc-link-silver') && !sv.stickers.includes('arc-link-gold'), JSON.stringify([r, sv.stickers]));
  await page.keyboard.press('Escape'); await sleep(150); await page.click('#arcStickers'); await sleep(300);
  r = await ev(() => ({ open: !document.getElementById('stickerBook').classList.contains('hidden'), n: document.querySelectorAll('.stk').length, on: [...document.querySelectorAll('.stk:not(.locked)')].map((d) => d.dataset.id), count: document.getElementById('stkCount').textContent }));
  check('Sticker Book opens from the arcade menu and shows ~34 stickers with the new ones unlocked', r.open && r.n >= 24 && r.n <= 36 && r.on.includes('arc-link-silver') && r.on.length < r.n, JSON.stringify(r));
  await page.keyboard.press('Escape'); await sleep(150);
  check('Esc closes the Sticker Book but keeps the arcade open', await ev(() => document.getElementById('stickerBook').classList.contains('hidden') && __game.arcade.open && !__game.arcade.cur));
  await page.click('#arcClose'); await sleep(150);

  // --- simulated achievements in localStorage -> reload -> stickers unlocked, persisted, rendered
  const before = (await saved(page)).stickers;
  await ev((k) => { const d = JSON.parse(localStorage.getItem(k)); Object.assign(d, { trials: { 1: { time: 60, medal: 'gold' }, 2: { time: 90, medal: 'silver' } }, almanac: ['rainbow', 'hail', 'fog', 'skate', 'blizzard', 'charge'], done: [1, 2], memories: Array.from({ length: 12 }, (_, i) => 'm' + i) }); d.arcade.catch = 60; d.arcade.glide = 5; d.stickers.push(42); localStorage.setItem(k, JSON.stringify(d)); }, KEY);
  await page.reload(); await page.waitForFunction(() => window.__game && __game.state === 'title', null, { timeout: 120000 });
  const after = (await saved(page)).stickers, want = ['arc-catch-gold', 'arc-glide-bronze', 'trial-1', 'trial-2', 'alm-1', 'alm-5', 'ch-1', 'ch-2', 'mem-1', 'mem-10'], never = ['arc-glide-silver', 'alm-all', 'ch-3', 'trial-gold', 'mem-all', 'arc-match-bronze'];
  check('stickers earned before the reload persist', before.every((x) => after.includes(x)) && !after.includes(42), JSON.stringify(after));
  check('simulated achievements unlock the matching stickers on load (and nothing more)', want.every((x) => after.includes(x)) && never.every((x) => !after.includes(x)), JSON.stringify(after));
  await page.click('#begin'); await sleep(500); for (let i = 0; i < 40 && (await ev(() => __game.ui.dlg.active)); i++) { await page.keyboard.press('Enter'); await sleep(110); }
  await page.keyboard.press('Escape'); await page.waitForFunction(() => __game.paused, null, { timeout: 10000 }); await page.click('#pStickers'); await sleep(300);
  r = await ev(() => { const on = [...document.querySelectorAll('.stk:not(.locked)')], cv = on[0]?.querySelector('canvas'), px = cv ? cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data : [], lk = document.querySelector('.stk.locked'); let a = 0; for (let i = 3; i < px.length; i += 4) a += px[i] > 0; return { n: on.length, ids: on.map((d) => d.dataset.id), filled: a / (px.length / 4), lockedName: lk?.querySelector('b').textContent, lockedHint: lk?.querySelector('small').textContent }; });
  check('pause menu → Sticker Book renders unlocked clay stickers + locked silhouettes with hints', want.every((x) => r.ids.includes(x)) && r.filled > 0.4 && r.lockedName === '???' && r.lockedHint.length > 5, JSON.stringify(r).slice(0, 300));
  await page.screenshot({ path: SH + 'stickers-desktop.png', timeout: 120000 });
  await page.keyboard.press('Escape'); await sleep(150);
  check('Esc closes the book without un-pausing', await ev(() => document.getElementById('stickerBook').classList.contains('hidden') && __game.paused));
  check('no console errors (desktop)', logs.length === 0, logs.slice(0, 3).join(' | '));
  await browser.close();

  // --- phone portrait 360 px, real touch
  ({ browser, page, logs } = await launch({ mobile: true, w: 360, h: 740 })); ev = (f, a) => page.evaluate(f, a);
  await page.tap('#begin'); await sleep(400); for (let i = 0; i < 40 && (await ev(() => __game.ui.dlg.active)); i++) { await page.tap('#dlg'); await sleep(110); }
  await ev(() => __game.arcade.openMenu()); await sleep(200);
  r = await ev(() => { const m = document.getElementById('arcMenu').getBoundingClientRect(); return { top: m.top, bottom: m.bottom, w: m.width, scroll: document.getElementById('arcMenu').scrollHeight > document.getElementById('arcMenu').clientHeight }; });
  check('phone: arcade menu fits the screen (scrolls if needed)', r.top >= 0 && r.bottom <= 740 && r.w <= 360, JSON.stringify(r));
  await page.screenshot({ path: SH + 'arcade-menu-phone.png', timeout: 120000 });
  await page.tap('.arcGame[data-id="rhythm"]'); await page.waitForFunction(() => __game.arcade.cur?.constructor.id === 'rhythm', null, { timeout: 20000 });
  const lx = await ev(() => [0, 1, 2].map((i) => __game.arcade.cur.laneX(i))), ly = await ev(() => __game.arcade.cur.geo().hit);
  await rhythm(8000, (l) => page.touchscreen.tap(lx[l], ly));
  await page.screenshot({ path: SH + 'arcade-rhythm-phone.png', timeout: 120000 });
  r = await ev(() => ({ s: __game.arcade.cur.score, h: __game.arcade.cur.hits }));
  check('phone: tapping the lanes plays Rainbow Rhythm', r.h >= 3 && r.s > 0, JSON.stringify(r));
  await page.tap('#arcQuit'); await sleep(150); await page.tap('.arcGame[data-id="stack"]'); await page.waitForFunction(() => __game.arcade.cur?.constructor.id === 'stack', null, { timeout: 20000 });
  for (let i = 0; i < 4; i++) { await aimed(); await page.touchscreen.tap(180, 500); await page.waitForFunction(() => __game.arcade.cur.state !== 'fall', null, { timeout: 10000 }); await sleep(60); }
  await sleep(300); await page.screenshot({ path: SH + 'arcade-stack-phone.png', timeout: 120000 });
  r = await ev(() => ({ h: __game.arcade.cur.height, s: __game.arcade.cur.score })); check('phone: tapping drops snowballs in Snowball Stack', r.h >= 3, JSON.stringify(r));
  await ev(() => (__game.arcade.cur.lives = 0)); await page.waitForFunction(() => __game.arcade.ended, null, { timeout: 20000 });
  check('phone: Snowball Stack score saved', (await saved(page)).arcade?.stack === (await ev(() => __game.arcade.lastScore)));
  await page.tap('#arcBack'); await sleep(150); await page.tap('.arcGame[data-id="link"]'); await page.waitForFunction(() => __game.arcade.cur?.clouds.length > 0, null, { timeout: 20000 });
  const pos = () => ev(() => { const c = __game.arcade.cur, g = c.geo(), k = c.clouds[0]; return k && { x: k.x * g.W, y: k.y * g.H, rx: c.rodX(k.c), ry: g.rodY }; });
  let p = await pos(); await page.touchscreen.tap(p.x, p.y); await sleep(120); await page.touchscreen.tap(p.rx, p.ry); await sleep(200);
  check('phone: tap a cloud, then its rod, links it (Lightning Link)', (await ev(() => __game.arcade.cur.links)) === 1);
  await page.waitForFunction(() => __game.arcade.cur.clouds.length > 0, null, { timeout: 20000 }); p = await pos(); const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y }] }); for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x + (p.rx - p.x) * i / 6, y: p.y + (p.ry - p.y) * i / 6 }] }); await sleep(50); }
  await page.screenshot({ path: SH + 'arcade-link-phone.png', timeout: 120000 }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(250);
  check('phone: dragging a cloud to its rod links it', (await ev(() => __game.arcade.cur.links)) === 2);
  await page.tap('#arcQuit'); await sleep(150); await page.tap('#arcStickers'); await sleep(300);
  r = await ev(() => { const c = document.querySelector('.stkCard').getBoundingClientRect(), s = document.querySelector('.stk').getBoundingClientRect(); return { w: c.width, right: c.right, sw: s.width, scroll: document.querySelector('.stkCard').scrollHeight > document.querySelector('.stkCard').clientHeight, docW: document.documentElement.scrollWidth }; });
  check('phone: Sticker Book fits 360 px and scrolls', r.right <= 360 && r.docW <= 360 && r.scroll && r.sw >= 90, JSON.stringify(r));
  await page.screenshot({ path: SH + 'stickers-phone.png', timeout: 120000 });
  await page.tap('#stkClose'); await sleep(150);
  check('phone: Close button shuts the book', await ev(() => document.getElementById('stickerBook').classList.contains('hidden')));
  check('no console errors (phone)', logs.length === 0, logs.slice(0, 3).join(' | '));
  const bad = results.filter((x) => !x.ok); console.log(bad.length ? 'RESULT: ' + bad.length + ' FAILED' : 'RESULT: ALL ' + results.length + ' CHECKS PASSED'); await browser.close(); process.exit(bad.length ? 1 : 0);
})().catch(async (e) => { console.error('TEST CRASH', e); try { console.error(await global.DBG?.()); } catch {} process.exit(2); });
