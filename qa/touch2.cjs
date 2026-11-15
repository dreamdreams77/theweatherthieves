// Chapter 2 played start to finish with REAL TOUCH ONLY on a landscape phone (joystick, camera drags, USE / Jump / Talk / +/- / tool buttons).
const { sleep, launch, check, results, shot } = require('./lib.cjs');
const { thumb } = require('./thumb.cjs');
(async () => {
  const t0 = Date.now();
  const { browser, ctx, page, logs } = await launch({ mobile: true, w: 844, h: 390 });
  await page.evaluate(() => localStorage.setItem('weather-thieves-progress-v1', JSON.stringify({ chapter: 2, unlocked: 2, done: [1], memories: [], flags: {} })));
  await page.reload(); await page.waitForFunction(() => window.__game && __game.state === 'title', null, { timeout: 120000 });
  const log = (...a) => console.log('  ·', ((Date.now() - t0) / 1000).toFixed(0) + 's', ...a.map((x) => typeof x === 'object' ? JSON.stringify(x) : x)); const T = await thumb(page, ctx), ev = T.ev; const W = (k) => ev((k) => { const w = __game.world, v = w[k]; return Array.isArray(v) ? v.map((x) => x.pos.toArray()) : (v.pos || v).toArray(); }, k);
  await T.tapSel('#begin'); await page.waitForFunction(() => __game.chapterNo === 2 && __game.state !== 'loading' && !document.getElementById('chapterCard').classList.contains('show'), null, { timeout: 90000 }); await sleep(800); await T.flush();
  check('Continue drops a touch player into chapter 2', await ev(() => __game.chapterNo === 2 && __game.state === 'play'));
  const cal = await T.calibrate(); check('camera drag turns the camera (calibrated)', cal.sx !== 0 && cal.sy !== 0, JSON.stringify(cal));
  // 1. borrow Fen's cloud and rain on the three umbrellas
  const fen = await ev(() => __game.world.fenCloud.pos.toArray()); await T.walkTo(fen[0], fen[2] - 3, 2.5);
  check('tap Fen’s cloud to carry it', await T.grabCloud('fen'));
  // 1-2. the umbrella climb: rain on an umbrella, step on it, get bounced onto the next roof, repeat up to the balcony
  await T.tool(1); const pads = await W('pads'); const opened = [];
  for (let i = 0; i < 3; i++) { const p = pads[i]; if (i === 0) { const vs = await T.viewSpot(p, 5, 14); await T.walkTo(vs[0], vs[1], 1.0); } log('pad', i, 'from', (await T.S()).p.map((x) => +x.toFixed(1)), 'pad', p);
    await T.holdUse(await T.surf(p), (i) => __game.world.pads[i].open > 0.9, 40000, i); opened.push(await ev((i) => +__game.world.pads[i].open.toFixed(2), i));
    const y0 = (await T.S()).p[1]; await T.walkTo(p[0], p[2], 0.6, 20000, () => __game.player.vel.y > 3); await T.until((y0) => __game.player.pos.y > y0 + 3 && __game.player.grounded, 9000, 150, y0); log('bounced to y', (await T.S()).p[1].toFixed(1)); }
  check('USE rains open all three umbrellas (each from the roof below it)', opened.every((o) => o > 0.9), JSON.stringify(opened));
  await shot(page, 'qa/shots/touch2-umbrellas.png');
  const bal = await ev(() => [__game.player.pos.y, __game.world.balconyPos.y]);
  check('umbrella bounces carry Juno up to the clock-tower balcony', Math.abs(bal[0] - bal[1]) < 1.5, JSON.stringify(bal));
  await T.tool(0); await T.tapSel('#bUse'); await sleep(200);
  // 3. fog: grab Nimbus, stretch it with +, hold it low over the balcony to reveal the valve, then Talk to turn it
  const valve = await W('valve'); await T.walkTo(valve[0] + 2, valve[2] + 1, 1.2, 15000);
  check('grab Nimbus from the balcony', await T.grabCloud('nimbus'));
  await T.holdBtn('#bPlus', 2500); await T.aimAt([valve[0], valve[1] - 1.2, valve[2]]);
  check('stretched low cloud (fog) reveals the hidden valve', await T.until(() => __game.world.valve.up, 25000), '');
  await T.walkTo(valve[0] + 1.2, valve[2], 0.8, 10000); await T.tapSel('#bTalk'); await sleep(400); await T.flush();
  check('Talk button turns the valve', await ev(() => __game.world.flags.valve));
  await T.tool(0); await T.tapSel('#bUse'); await sleep(200);
  // 4. jump down, take Fen's cloud and fill the basins in Tock's order
  const basins = await W('basins'); await T.walkTo(basins[0][0] + 3, basins[0][2] + 3, 2, 45000);
  const fp = await ev(() => __game.world.fenCloud.pos.toArray()); await T.walkTo(fp[0], fp[2] - 3, 3, 30000); await T.grabCloud('fen'); await T.tool(1);
  for (let i = 0; i < 3; i++) { const b = basins[i], vs = await T.viewSpot(b, 4, 9); log('basin', i, vs); await T.walkTo(vs[0], vs[1], 1.4); await T.holdUse(await T.surf(b), (i) => __game.world.basins[i].locked, 40000, i); }
  const bs = await ev(() => __game.world.basins.map((b) => b.locked));
  check('basins filled in order (short, tall, wide) by touch', bs.every(Boolean), JSON.stringify(bs));
  await T.tool(0); await T.tapSel('#bUse'); await sleep(200);
  // 5. tickle the Dry Cloud with Wind until the jar opens
  const dry = await W('dry'); await T.walkTo(dry[0] + 6, dry[2] + 3, 1.5); await T.tool(2);
  for (let k = 0; k < 8 && !(await ev(() => __game.world.dryOpen)); k++) { await T.holdUse(dry, () => false, 1300); await sleep(2700); await T.flush(); }
  log('after laughs', await ev(() => ({ ch: __game.chapterNo, no: __game.narr.no, flags: __game.narr.flags, st: __game.state, end: document.getElementById('end').className }))); check('Wind tickles the Dry Cloud until the jar opens', await ev(() => __game.world.dryOpen), 'laughs=' + (await ev(() => __game.world.laughs)));
  // 6. finale + end card
  const fin = await T.until(() => !document.getElementById('end').classList.contains('hidden') || (JSON.parse(localStorage.getItem('weather-thieves-progress-v1') || '{}').done || []).includes(2) && __game.chapterNo === 2, 150000); log('finale state', await ev(() => ({ freed: __game.narr.flags.freed, rained: __game.narr.flags.rained, st: __game.state, dlg: __game.ui.dlg.active, fin: !!__game.narr.finale, end: document.getElementById('end').className })));
  const endUp = await ev(() => !document.getElementById('end').classList.contains('hidden')); check('finale plays, chapter 2 is saved as complete and its end card stays up', fin && endUp && (await ev(() => __game.chapterNo === 2 && __game.narr.flags.freed && JSON.parse(localStorage.getItem('weather-thieves-progress-v1')).done.includes(2))));
  await sleep(1600); await T.tapSel('#endNext'); check('Next button on the end card loads chapter 3', await T.until(() => __game.chapterNo === 3, 60000));
  await shot(page, 'qa/shots/touch2-end.png');
  console.log('chapter 2 by touch took', ((Date.now() - t0) / 1000).toFixed(0), 's real time');
  check('no console errors', logs.length === 0, logs.slice(0, 3).join(' | '));
  const bad = results.filter((x) => !x.ok); console.log(bad.length ? 'RESULT: ' + bad.length + ' FAILED' : 'RESULT: ALL ' + results.length + ' CHECKS PASSED'); await browser.close(); process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error('TEST CRASH', e); process.exit(2); });
