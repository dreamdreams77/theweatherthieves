// Puffkin Arcade: booth → menu → three mini games with real keys / mouse / touch; scores saved; world resumes.
const { sleep, launch, check, results } = require('./lib.cjs');
const SH = 'qa/shots/';
(async () => {
  let { browser, page, logs } = await launch({ w: 1100, h: 620 });
  const ev = (f, a) => page.evaluate(f, a);
  const flush = async () => { for (let i = 0; i < 40; i++) { if (!(await ev(() => __game.ui.dlg.active))) return; await page.keyboard.press('Enter'); await sleep(110); } };
  await page.click('#begin'); await sleep(400); await flush();
  const d = await ev(() => { const g = __game, b = g.arcade.pos, s = g.trials.stonePos, l = Math.hypot(b.x - s.x, b.z - s.z), px = b.x - (b.x - s.x) / l * 1.9, pz = b.z - (b.z - s.z) / l * 1.9; g.player.pos.set(px, g.terrain.topAt(px, pz) + 0.05, pz); g.player.vel.set(0, 0, 0); g.sim(0.3); return b && Math.hypot(b.x - g.trials.stonePos.x, b.z - g.trials.stonePos.z); });
  check('arcade booth stands beside the trial stone', d > 2 && d < 8, String(d));
  await page.keyboard.press('KeyF'); await page.waitForFunction(() => __game.arcade.open, null, { timeout: 20000 });
  const m = await ev(() => ({ open: __game.arcade.open, items: [...document.querySelectorAll('.arcGame b')].map((b) => b.textContent) }));
  check('F at the booth opens the arcade menu with 3 games', m.open && m.items.length === 3, JSON.stringify(m.items));
  const p0 = await ev(() => __game.player.pos.toArray()); await page.keyboard.down('KeyW'); await sleep(400); await page.keyboard.up('KeyW'); const p1 = await ev(() => __game.player.pos.toArray());
  check('the world is frozen while the arcade is open', Math.hypot(p1[0] - p0[0], p1[2] - p0[2]) < 0.01);
  await page.screenshot({ path: SH + 'arcade-menu.png', timeout: 120000 });
  // --- 1. Drizzle Dash: arrow keys move the bucket, raindrops score
  await page.keyboard.press('Digit1'); await page.waitForFunction(() => __game.arcade.cur, null, { timeout: 20000 }); const x0 = await ev(() => __game.arcade.cur.x); await page.keyboard.down('ArrowRight'); await sleep(500); await page.keyboard.up('ArrowRight'); const x1 = await ev(() => __game.arcade.cur.x);
  check('Drizzle Dash: arrow keys steer the bucket', x1 > x0 + 0.1, x0.toFixed(2) + '->' + x1.toFixed(2));
  // chase drops with the keyboard for a few seconds (simple bot: steer toward lowest non-hail item)
  for (let i = 0; i < 60; i++) { const dir = await ev(() => { const c = __game.arcade.cur, it = c.items.filter((t) => t.k !== 'hail' && t.y < 0.9).sort((a, b) => b.y - a.y)[0]; return it ? Math.sign(it.x - c.x) : 0; }); if (dir > 0) { await page.keyboard.down('ArrowRight'); await sleep(80); await page.keyboard.up('ArrowRight'); } else if (dir < 0) { await page.keyboard.down('ArrowLeft'); await sleep(80); await page.keyboard.up('ArrowLeft'); } else await sleep(80); }
  await page.screenshot({ path: SH + 'arcade-catch.png', timeout: 120000 });
  const sc = await ev(() => __game.arcade.cur.score); check('Drizzle Dash: catching drops scores points', sc > 0, String(sc));
  await ev(() => (__game.arcade.cur.time = 0.2)); await page.waitForFunction(() => __game.arcade.ended, null, { timeout: 20000 });
  const e1 = await ev(() => ({ ended: __game.arcade.ended, txt: document.getElementById('arcEndS').textContent, best: JSON.parse(localStorage.getItem('weather-thieves-progress-v1')).arcade }));
  check('round ends with a score card and the best score is saved', e1.ended && /Drizzle Dash/.test(e1.txt) && e1.best && e1.best.catch === sc, JSON.stringify(e1));
  // --- 2. Gust Glide: Space gusts, the puffkin climbs, crashing ends the round
  await page.keyboard.press('Escape'); await sleep(150); await page.click('.arcGame[data-id="glide"]'); await page.waitForFunction(() => __game.arcade.cur?.constructor.id === 'glide', null, { timeout: 20000 });
  const y0 = await ev(() => __game.arcade.cur.y); await page.keyboard.press('Space'); await page.waitForFunction(() => __game.arcade.cur.started && __game.arcade.cur.v < 0, null, { timeout: 20000 }); const y1 = await ev(() => __game.arcade.cur.y);
  check('Gust Glide: Space gives a gust (puffkin rises)', y1 < y0, y0.toFixed(3) + '->' + y1.toFixed(3));
  for (let i = 0; i < 25; i++) { const need = await ev(() => { const c = __game.arcade.cur, col = c.cols.find((k) => k.x > 0.2); const target = col ? col.c + 0.04 : 0.5; return c.y > target && c.v > -0.2; }); if (need) await page.keyboard.press('Space'); await sleep(110); }
  await page.screenshot({ path: SH + 'arcade-glide.png', timeout: 120000 });
  await page.waitForFunction(() => __game.arcade.ended, null, { timeout: 60000 });
  check('Gust Glide: crashing ends the round with a score card', await ev(() => __game.arcade.ended && /Gust Glide/.test(document.getElementById('arcEndS').textContent)));
  await page.keyboard.press('Space'); await page.waitForFunction(() => !__game.arcade.ended, null, { timeout: 20000 }); check('Space on the score card plays again', await ev(() => !__game.arcade.ended && __game.arcade.cur && __game.arcade.cur.constructor.id === 'glide'));
  // --- 3. Weather Pairs: click tiles with the real mouse
  await page.click('#arcQuit'); await sleep(150); await page.click('.arcGame[data-id="match"]'); await page.waitForFunction(() => __game.arcade.cur?.constructor.id === 'match', null, { timeout: 20000 });
  const pos = await ev(() => { const c = __game.arcade.cur, L = c.layout(); return c.tiles.map((t, i) => ({ k: t.k, x: L.x0 + (i % 4 + 0.5) * L.cs, y: L.y0 + (((i / 4) | 0) + 0.5) * L.cs })); });
  await page.mouse.click(pos[0].x, pos[0].y); await sleep(60); const wrong = pos.findIndex((p, i) => i > 0 && p.k !== pos[0].k); await page.mouse.click(pos[wrong].x, pos[wrong].y); await sleep(100);
  check('Weather Pairs: two different tiles flip back', await ev(() => __game.arcade.cur.flips === 2 && __game.arcade.cur.wait > 0)); await sleep(1000);
  const done = new Set(); for (let i = 0; i < 16; i++) { if (done.has(i)) continue; const j = pos.findIndex((p, k) => k !== i && p.k === pos[i].k); await page.mouse.click(pos[i].x, pos[i].y); await sleep(60); await page.mouse.click(pos[j].x, pos[j].y); await sleep(120); done.add(i); done.add(j); }
  await sleep(300); await page.screenshot({ path: SH + 'arcade-pairs.png', timeout: 120000 });
  await page.waitForFunction(() => __game.arcade.ended, null, { timeout: 20000 });
  const mp = await ev(() => ({ s: __game.arcade.lastScore, best: JSON.parse(localStorage.getItem('weather-thieves-progress-v1')).arcade }));
  check('Weather Pairs: matching all 8 pairs scores and saves', mp.s > 100 && mp.best.match === mp.s && mp.best.glide !== undefined, JSON.stringify(mp));
  // --- back to the world
  await page.keyboard.press('Escape'); await sleep(150); await page.keyboard.press('Escape'); await sleep(200);
  check('Esc twice returns to the world, which moves again', await ev(() => !__game.arcade.open && !__game.paused));
  await ev(() => { const g = __game; g.player.pos.set(1.5, g.terrain.topAt(1.5, 6.5) + 0.05, 6.5); g.player.vel.set(0, 0, 0); });
  const q0 = await ev(() => __game.player.pos.toArray()); await page.keyboard.down('KeyW'); await page.waitForFunction((z) => Math.abs(__game.player.pos.z - z) > 0.3, q0[2], { timeout: 30000 }).catch(() => {}); await page.keyboard.up('KeyW'); const q1 = await ev(() => __game.player.pos.toArray());
  check('player can walk again after closing', Math.hypot(q1[0] - q0[0], q1[2] - q0[2]) > 0.3, JSON.stringify([q0, q1, await ev(() => ({ st: __game.state, lk: __game.player.locked, keys: [...__game.input.keys], open: __game.arcade.open, dlg: __game.ui.dlg.active, paused: __game.paused, ao: __game.arcadeOpen, t: __game.time ?? __game.t, card: document.getElementById('chapterCard').className }))]));
  await page.keyboard.press('Escape'); await sleep(200); const best = await ev(() => document.querySelector('.arcGame') ? 1 : 0); await page.click('#pArcade'); await sleep(200);
  check('pause menu "Play mini games" opens the arcade and shows best scores', await ev(() => __game.arcade.open && !__game.paused && /best [1-9]/.test(document.querySelector('.arcGame[data-id="match"] small').textContent)));
  await page.click('#arcClose'); await sleep(100);
  check('no console errors (desktop)', logs.length === 0, logs.slice(0, 3).join(' | '));
  await browser.close();
  // --- mobile: real touch
  ({ browser, page, logs } = await launch({ mobile: true, w: 390, h: 844 }));
  await page.tap('#begin'); await sleep(400); for (let i = 0; i < 40 && (await page.evaluate(() => __game.ui.dlg.active)); i++) { await page.tap('#dlg'); await sleep(110); }
  await page.evaluate(() => __game.arcade.openMenu()); await sleep(200); await page.tap('.arcGame[data-id="glide"]'); await sleep(200);
  const g0 = await page.evaluate(() => __game.arcade.cur.y); await page.touchscreen.tap(200, 400); await sleep(120); const g1 = await page.evaluate(() => ({ y: __game.arcade.cur.y, s: __game.arcade.cur.started }));
  check('mobile: tapping the screen gusts in Gust Glide', g1.s && g1.y < g0, JSON.stringify(g1));
  await page.screenshot({ path: SH + 'arcade-mobile.png', timeout: 120000 });
  await page.tap('#arcQuit'); await sleep(150); await page.tap('.arcGame[data-id="catch"]'); await sleep(200);
  const cx0 = await page.evaluate(() => __game.arcade.cur.x); const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 60, y: 700 }] }); for (let i = 0; i < 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 50 + i * 2, y: 700 }] }); await sleep(60); } await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const cx1 = await page.evaluate(() => __game.arcade.cur.x); check('mobile: dragging steers the Drizzle Dash bucket', cx1 < cx0 - 0.1, cx0.toFixed(2) + '->' + cx1.toFixed(2));
  check('no console errors (mobile)', logs.length === 0, logs.slice(0, 3).join(' | '));
  const bad = results.filter((x) => !x.ok); console.log(bad.length ? 'RESULT: ' + bad.length + ' FAILED' : 'RESULT: ALL ' + results.length + ' CHECKS PASSED'); await browser.close(); process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error('TEST CRASH', e); process.exit(2); });
