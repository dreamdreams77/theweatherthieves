// Opening cinematic test: plays on a fresh game (with ?opening=1 in norender mode), captions + jars + colour drain, Skip button,
// keyboard skip via the pause-menu replay, tap-anywhere skip on a portrait phone, never replays on Continue, and plain
// ?norender=1 runs (all other QA scripts) skip it entirely. Usage: QA_PORT=4180 node qa/opening.cjs  (default port 4173)
const { chromium } = require('playwright');
const { sleep, check, results } = require('./lib.cjs');
const BASE = `http://localhost:${process.env.QA_PORT || 4173}/`;
const ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'];
(async () => {
  const browser = await chromium.launch({ args: ARGS }); const logs = [];
  const open = async (query, opts = { viewport: { width: 1280, height: 720 } }) => {
    const ctx = await browser.newContext(opts); const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') logs.push('console.error: ' + m.text()); }); page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
    await page.goto(BASE + query); await page.waitForFunction(() => window.__game && window.__game.state === 'title', null, { timeout: 120000 }); return { ctx, page };
  };
  const S = (page) => page.evaluate(() => { const g = __game, o = g.opening; return { state: g.state, ch: g.chapterNo, op: !!o, t: o ? o.t : -1, stolen: o ? o.stolen : -1, cap: document.querySelector('#opening .op-cap.show')?.textContent || '', title: !!document.querySelector('#opening .op-title.show'), el: !!document.getElementById('opening'), dlg: g.ui.dlg.active, locked: g.player.locked, result: g.openingResult || null, uiHidden: document.body.classList.contains('opening') }; });
  const waitT = (page, t) => page.waitForFunction((tt) => !__game.opening || __game.opening.t >= tt, t, { timeout: 90000 });
  // freeze the simulation while the (slow, software-GL) screenshot is taken so the timeline does not run on without us
  const snap = async (page, file) => { await page.evaluate(() => { __game.paused = true; __game.renderOnce(); __game.renderOnce(); }); await page.screenshot({ path: file, timeout: 120000 }); await page.evaluate(() => { __game.paused = false; }); console.log('shot', file); };
  const flush = async (page) => { for (let i = 0; i < 40; i++) { const s = await S(page); if (!s.dlg && s.state === 'play') break; await page.keyboard.press('Enter'); await sleep(140); } };

  // 0) plain ?norender=1 (what every other QA script uses): no opening, Enter flushes the intro straight into play
  { const { ctx, page } = await open('?norender=1'); await page.click('#begin'); await sleep(500); const s0 = await S(page);
    check('norender without &opening=1 skips the opening', !s0.op && !s0.el && s0.state === 'dialogue', JSON.stringify(s0)); await flush(page); const s1 = await S(page);
    check('#begin + Enter reaches play in chapter 1', s1.state === 'play' && s1.ch === 1 && !s1.locked, JSON.stringify(s1)); await ctx.close(); }

  // 1) fresh game with the opening: let it play to the end
  { const { ctx, page } = await open('?norender=1&opening=1'); await page.click('#begin'); await sleep(300);
    const a = await S(page); check('fresh game starts the opening', a.op && a.state === 'opening' && a.el && a.uiHidden, JSON.stringify(a));
    await waitT(page, 2.4); const b = await S(page); const satHi = await page.evaluate(() => __game.restore); check('caption 1 shows over a vivid (restored) world', b.cap.startsWith('Once') && satHi > 0.95, b.cap + ' restore=' + satHi.toFixed(2)); await snap(page, 'qa/shots/opening-1-peaceful.png');
    await waitT(page, 7.0); const c = await S(page); check('thieves caption', /thieves came/.test(c.cap), c.cap); await snap(page, 'qa/shots/opening-2-thieves.png');
    await waitT(page, 10.6); await snap(page, 'qa/shots/opening-3-jars.png');
    await waitT(page, 15.2); const d = await S(page); const satLo = await page.evaluate(() => ({ r: __game.restore }));
    check('all four weathers are jarred', d.stolen === 4, 'stolen=' + d.stolen); check('colour drains (restore -> ~0)', satLo.r < 0.1, 'restore=' + satLo.r.toFixed(3));
    check('player input locked during the opening', d.locked && d.state === 'opening');
    await waitT(page, 18.8); const e = await S(page); check('title card appears', e.title); await snap(page, 'qa/shots/opening-4-title.png');
    await page.waitForFunction(() => !__game.opening, null, { timeout: 60000 }); await sleep(500); const f = await S(page);
    check('opening ends by itself into the intro dialogue', f.result === 'played' && f.dlg && f.state === 'dialogue' && !f.uiHidden, JSON.stringify(f));
    await flush(page); const g = await S(page); check('after the intro: play, input unlocked', g.state === 'play' && !g.locked, JSON.stringify(g)); await sleep(800);
    check('#opening overlay removed', !(await S(page)).el); await ctx.close(); }

  // 2) Skip button; no replay on Continue; replay from the pause menu + keyboard (Enter) skip
  { const { ctx, page } = await open('?norender=1&opening=1'); await page.click('#begin'); await waitT(page, 1.2);
    await page.click('#opening .op-skip'); await page.waitForFunction(() => !__game.opening, null, { timeout: 10000 }); await sleep(300); const a = await S(page);
    check('Skip button skips cleanly to the intro', a.result === 'skipped' && a.dlg && a.state === 'dialogue', JSON.stringify(a));
    const r = await page.evaluate(() => __game.restore); check('saturation restored after skip (fresh world stays grey)', r < 0.05, 'restore=' + r);
    await flush(page); const b = await S(page); check('play after skip + intro', b.state === 'play' && !b.locked, JSON.stringify(b));
    await page.reload(); await page.waitForFunction(() => window.__game && __game.state === 'title', null, { timeout: 120000 });
    const label = await page.textContent('#begin'); await page.click('#begin'); await sleep(1500); const c = await S(page);
    check('Continue does not replay the opening', /Continue/.test(label) && !c.op && !c.el && c.state === 'play', label + ' ' + JSON.stringify(c));
    await page.click('#pauseBtn'); await sleep(200); await page.click('#pOpening'); await sleep(200); const d = await S(page);
    check('pause menu "Replay opening" starts it', d.op && d.state === 'opening', JSON.stringify(d)); await waitT(page, 0.8);
    await page.keyboard.press('Enter'); await page.waitForFunction(() => !__game.opening, null, { timeout: 10000 }); await sleep(300); const e = await S(page);
    check('Enter skips; back to play, not paused, no dialogue', e.state === 'play' && !e.dlg && !e.locked && !(await page.evaluate(() => __game.paused)), JSON.stringify(e));
    await page.click('#pauseBtn'); await sleep(200); await page.click('#pOpening'); await waitT(page, 0.8); await page.keyboard.press('Escape'); await page.waitForFunction(() => !__game.opening, null, { timeout: 10000 }); await sleep(300);
    check('Esc skips without opening the pause menu', !(await page.evaluate(() => __game.paused)) && (await S(page)).state === 'play'); await ctx.close(); }

  // 3) portrait phone: tap anywhere skips
  { const { ctx, page } = await open('?norender=1&opening=1', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 }); await page.tap('#begin'); await waitT(page, 2.2);
    await snap(page, 'qa/shots/opening-5-portrait.png'); const fs = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#opening .op-cap')).fontSize)); check('portrait caption readable', fs >= 17, 'font=' + fs);
    await page.touchscreen.tap(195, 420); await page.waitForFunction(() => !__game.opening, null, { timeout: 10000 }); await sleep(400); const a = await S(page);
    check('tap anywhere skips on a phone', a.result === 'skipped' && a.dlg, JSON.stringify(a));
    for (let i = 0; i < 40 && (await S(page)).dlg; i++) { await page.tap('#dlg').catch(() => {}); await sleep(150); } check('phone: taps flush the intro to play', (await S(page)).state === 'play'); await ctx.close(); }

  check('no console errors', logs.length === 0, logs.slice(0, 3).join(' | '));
  const bad = results.filter((r) => !r.ok); console.log(bad.length ? 'RESULT: ' + bad.length + ' FAILED' : 'RESULT: ALL ' + results.length + ' CHECKS PASSED');
  await browser.close(); process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error('TEST CRASH', e); process.exit(2); });
