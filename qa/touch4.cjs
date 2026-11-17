// Chapter 4 played start to finish with REAL TOUCH ONLY on a landscape phone.
const { sleep, launch, check, results, shot } = require('./lib.cjs');
const { thumb } = require('./thumb.cjs');
(async () => {
  const t0 = Date.now(); const log = (...a) => console.log('  ·', ((Date.now() - t0) / 1000).toFixed(0) + 's', ...a.map((x) => typeof x === 'object' ? JSON.stringify(x) : x));
  const { browser, ctx, page, logs } = await launch({ mobile: true, w: 844, h: 390 });
  await page.evaluate(() => localStorage.setItem('weather-thieves-progress-v1', JSON.stringify({ chapter: 4, unlocked: 4, done: [1, 2, 3], memories: [], flags: {} })));
  await page.reload(); await page.waitForFunction(() => window.__game && __game.state === 'title', null, { timeout: 120000 });
  const T = await thumb(page, ctx), ev = T.ev; const P = (k) => ev((k) => { const v = __game.world[k]; return (v.pos || v).toArray(); }, k);
  await T.tapSel('#begin'); await page.waitForFunction(() => __game.chapterNo === 4 && __game.state !== 'loading' && !document.getElementById('chapterCard').classList.contains('show'), null, { timeout: 90000 }); await sleep(800); await T.flush();
  check('Continue drops a touch player into chapter 4', await ev(() => __game.chapterNo === 4 && __game.state === 'play'));
  await T.calibrate();
  // carry a cloud, squash it with the − button until it crackles, park it over a rod
  const strike = async (cloud, rodKey) => { const rod = await P(rodKey); const ok = await T.grabCloud(cloud); log('grab', cloud, ok);
    await T.tool(0); for (let k = 0; k < 6 && (await ev(() => (__game.tools.held?.charge || 0) < 0.85)); k++) await T.holdBtn('#bMinus', 1200);
    log('charge', await ev(() => +(__game.tools.held?.charge || 0).toFixed(2)));
    await T.aimAt(await T.surf(rod)); await T.until((k) => __game.world[k].latched, 20000, 150, rodKey); log('rod', rodKey, await ev((k) => { const g = __game, r = g.world[k], c = g.tools.held, f = (v) => v.toArray().map((x) => +x.toFixed(1)); return { tip: f(r.tip), cl: c && f(c.pos), ch: c && +c.charge.toFixed(2), st: c && +c.stretchT.toFixed(2), aim: f(g.tools.aim.point), held: c?.id }; }, rodKey)); const done = await ev((k) => __game.world[k].latched, rodKey);
    if ((await T.S()).held) await T.tapSel('#bUse'); await sleep(200); return done; };
  // 1. rod A in the courtyard
  const rodA = await P('rodA'); await T.walkTo(rodA[0] + 3, rodA[2] + 5, 1.2);
  check('squash a carried cloud with − until it crackles, park it over rod A: lightning!', await strike('grumble', 'rodA'));
  // 2. ride the powered lift up to the catwalk
  const lift = await P('liftBase'); await T.walkTo(lift[0], lift[2], 0.6, 30000); await T.until(() => __game.player.pos.y > 6.5 && __game.player.grounded, 25000);
  check('the powered lift carries Juno up to the catwalk', (await T.S()).p[1] > 6.5, JSON.stringify((await T.S()).p));
  // 3. rod B on the catwalk powers the belt; ride it to rod C
  await T.walkTo(-9, -8, 1.0, 15000);
  check('strike rod B from the catwalk', await strike('rumble', 'rodB'));
  check('rod B powers the belt', await ev(() => __game.world.belt.on));
  await T.walkTo(13, -9, 1.5, 60000); check('the belt (plus walking) takes Juno along the catwalk to rod C', Math.abs((await T.S()).p[0] - 13) < 3 && (await T.S()).p[1] > 6, JSON.stringify((await T.S()).p));
  check('strike rod C: all three rods latched', await strike('nimbus', 'rodC') && (await ev(() => __game.world.rods.every((r) => r.latched))));
  await T.until(() => __game.narr.flags.door && !__game.ui.dlg.active, 30000); await T.flush();
  check('the Engine Door opens and the thief is revealed', await ev(() => __game.narr.flags.door && __game.narr.flags.revealed));
  // 4. rainbow: aim the mirror along the plaza, then rain across the beam with Fen's cloud
  await T.walkTo(-6, -17, 1.2, 60000); await T.tool(3); const fy = (x, z) => ev(([x, z]) => __game.terrain.topAt(x, z), [x, z]);
  await T.holdUse([6, await fy(6, -19), -19], () => false, 6000);
  check('Sun tool aims the mirror beam along the plaza', await ev(() => __game.weather.beams.some((b) => b.power > 0.5) || __game.world.mirror.lit > 0.5));
  const fc = await ev(() => __game.world.fenCloud.pos.toArray()); check('take Fen’s cloud', await T.grabCloud('fen')); await T.tool(1);
  await T.holdUse([-2, await fy(-2, -19), -19], () => __game.narr.flags.freed || __game.narr.flags.rainbow >= 1, 30000);
  check('rain across the sunbeam makes the rainbow that frees the last jar', await T.until(() => __game.narr.flags.freed, 20000), 'rainbow=' + (await ev(() => __game.narr.flags.rainbow)));
  await shot(page, 'qa/shots/touch4-rainbow.png');
  const fin = await T.until(() => (JSON.parse(localStorage.getItem('weather-thieves-progress-v1') || '{}').done || []).includes(4), 150000);
  await T.until(() => !document.getElementById('end').classList.contains('hidden'), 30000);
  check('the game ends: chapter 4 saved as complete, final card up', fin && (await ev(() => !document.getElementById('end').classList.contains('hidden'))));
  await shot(page, 'qa/shots/touch4-end.png');
  console.log('chapter 4 by touch took', ((Date.now() - t0) / 1000).toFixed(0), 's real time');
  check('no console errors', logs.length === 0, logs.slice(0, 3).join(' | '));
  const bad = results.filter((x) => !x.ok); console.log(bad.length ? 'RESULT: ' + bad.length + ' FAILED' : 'RESULT: ALL ' + results.length + ' CHECKS PASSED'); await browser.close(); process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error('TEST CRASH', e); process.exit(2); });
