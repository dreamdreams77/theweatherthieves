// Chapter 3 played start to finish with REAL TOUCH ONLY on a landscape phone.
const { sleep, launch, check, results, shot } = require('./lib.cjs');
const { thumb } = require('./thumb.cjs');
(async () => {
  const t0 = Date.now(); const log = (...a) => console.log('  ·', ((Date.now() - t0) / 1000).toFixed(0) + 's', ...a.map((x) => typeof x === 'object' ? JSON.stringify(x) : x));
  const { browser, ctx, page, logs } = await launch({ mobile: true, w: 844, h: 390 });
  await page.evaluate(() => localStorage.setItem('weather-thieves-progress-v1', JSON.stringify({ chapter: 3, unlocked: 3, done: [1, 2], memories: [], flags: {} })));
  await page.reload(); await page.waitForFunction(() => window.__game && __game.state === 'title', null, { timeout: 120000 });
  const T = await thumb(page, ctx), ev = T.ev; const W = (k) => ev((k) => { const v = __game.world[k]; return Array.isArray(v) ? v.map((x) => (x.pos || x).toArray ? (x.pos || x).toArray() : [x.x, x.base ?? 0, x.z]) : (v.pos || v).toArray ? (v.pos || v).toArray() : [v.x, v.base ?? 0, v.z]; }, k);
  await T.tapSel('#begin'); await page.waitForFunction(() => __game.chapterNo === 3 && __game.state !== 'loading' && !document.getElementById('chapterCard').classList.contains('show'), null, { timeout: 90000 }); await sleep(800); await T.flush();
  check('Continue drops a touch player into chapter 3', await ev(() => __game.chapterNo === 3 && __game.state === 'play'));
  await T.calibrate();
  // 1. freeze the river segment by segment, stepping onto each
  await T.tool(4); const segs = await ev(() => __game.world.segs.map((s) => [s.x, s.y, s.z]));
  await T.walkTo(0, -16.5, 1.0);
  for (let i = 0; i < segs.length; i++) { const s = segs[i]; await T.holdUse(await T.surf(s), (i) => __game.world.segs[i].frozen > 0.9, 30000, i); log('seg', i, await ev((i) => +__game.world.segs[i].frozen.toFixed(2), i)); await T.walkTo(s[0], s[2] + 0.4, 0.8, 15000); }
  const fz = await ev(() => __game.world.segs.map((s) => +s.frozen.toFixed(2)));
  check('Frost freezes the river, segment by segment', fz.every((f) => f > 0.9), JSON.stringify(fz));
  await T.walkTo(0, -36, 1.2, 30000); check('Juno walks across the frozen river to the ridge', (await T.S()).p[2] < -32, JSON.stringify((await T.S()).p));
  // 2. snow ramp: carry Flurry over the ramp and hold Frost so it snows
  const ramp = await ev(() => [__game.world.ramp.x, __game.world.ramp.base, __game.world.ramp.z]);
  check('grab Flurry', await T.grabCloud('flurry')); await T.tool(4); await T.walkTo(ramp[0] + 1, ramp[2] + 5, 1.2);
  await T.holdUse(ramp, () => __game.narr.flags.ramp || __game.world.ramp.count >= 0.98, 45000);
  check('Frost on a carried cloud makes snow that piles into a ramp', await ev(() => __game.narr.flags.ramp || __game.world.ramp.count >= 0.98), 'ramp=' + (await ev(() => __game.world.ramp.count.toFixed(2))));
  await T.tool(0); await T.tapSel('#bUse'); await sleep(200);
  await T.walkTo(ramp[0], ramp[2] + 0.2, 0.8, 15000); await T.walkTo(-4, -47, 1.0, 20000);
  const ledge = await ev(() => [__game.player.pos.y, __game.world.ledgeY]); check('up the snow ramp onto the ledge', Math.abs(ledge[0] - ledge[1]) < 0.6, JSON.stringify(ledge));
  // 3. melt the sled's ice with the mirror (Sun tool)
  const ice = await W('ice'); await T.tool(3); await T.walkTo(-7, -49, 1.0);
  await T.holdUse([ice[0], await ev(() => __game.world.ledgeY), ice[2]], () => __game.world.ice.melt >= 1 || !__game.world.sled.locked, 40000);
  check('Sun mirror melts the ice off the sled', await ev(() => __game.world.ice.melt >= 0.99 || !__game.world.sled.locked));
  await shot(page, 'qa/shots/touch3-sled.png');
  // 4. blizzard: snow over the sled from Nimbus, then blow it east onto the plate
  check('grab Nimbus', await T.grabCloud('nimbus')); const sled = await W('sled'), plate = await W('plate'), ly = await ev(() => __game.world.ledgeY);
  await T.tool(4); await T.walkTo(sled[0] - 4, sled[2] + 1, 1.0); await T.holdUse([sled[0], ly, sled[2]], () => false, 3000);
  await T.tool(2);
  for (let k = 0; k < 10 && !(await ev(() => __game.world.plate.on)); k++) { const sp = await W('sled');
    if ((await T.S()).held !== 'nimbus') await T.grabCloud('nimbus');
    await T.walkTo(sp[0] - 3.5, sp[2], 0.8, 8000); await T.tool(4); await T.holdUse([sp[0], ly, sp[2]], () => false, 1200); /* snow over the sled */
    await T.tool(0); await T.tapSel('#bUse'); await sleep(150); /* drop the snowing cloud right there */
    await T.tool(2); await T.holdUse([plate[0], ly, plate[2]], () => __game.world.plate.on, 3500); log('blizzard', k, await ev(() => ({ x: +__game.world.sled.pos.x.toFixed(1), bl: +__game.world.sled.blizzard.toFixed(2) }))); }
  check('blizzard (snow + wind) slides the sled onto the plate', await ev(() => __game.world.plate.on), 'sledX=' + (await ev(() => __game.world.sled.pos.x.toFixed(1))));
  await T.until(() => __game.world.doorOpen, 8000); check('the plate opens the way to the jar', await ev(() => !!__game.world.doorOpen));
  await T.tool(0); await T.tapSel('#bUse'); await sleep(200);
  // 5. snow on the three drifts around the jar (swap to a fuller cloud when one runs low)
  const zones = await ev(() => __game.world.jzones.map((z) => [z.x, z.base, z.z]));
  for (let i = 0; i < 3; i++) { const z = zones[i]; const best = await ev(() => { const g = __game, h = g.tools.held, p = g.player.pos; if (h && h.moisture > 0.35) return h.id; return g.weather.clouds.filter((c) => !c.personal && !c.fixed && c.moisture > 0.5).sort((a, b) => a.pos.distanceTo(p) - b.pos.distanceTo(p))[0]?.id || 'nimbus'; }); /* keep the cloud you have while it has snow left, else the nearest full one */
    if ((await T.S()).held !== best) { await T.tool(0); if ((await T.S()).held) await T.tapSel('#bUse'); let ok = await T.grabCloud(best); if (!ok) { const alt = await ev((b) => __game.weather.clouds.filter((c) => !c.personal && !c.fixed && c.id !== b && c.moisture > 0.3).sort((a, c) => a.pos.distanceTo(__game.player.pos) - c.pos.distanceTo(__game.player.pos))[0]?.id, best); ok = await T.grabCloud(alt); } log('grab', best, ok); }
    log('zone', i, z, await ev((id) => { const c = __game.weather.clouds.find((c) => c.id === id); return { m: +c.moisture.toFixed(2), pos: c.pos.toArray().map((x) => +x.toFixed(1)), held: __game.tools.held?.id }; }, best));
    const vs = await T.viewSpot(z, 3, 8); if (vs) await T.walkTo(vs[0], vs[1], 1.0); await T.tool(4);
    await T.holdUse(z, (i) => __game.world.jzones[i].count >= 2.9, 60000, i); log('drift', i, await ev((i) => +__game.world.jzones[i].count.toFixed(2), i), 'cloud', best); }
  const jz = await ev(() => __game.world.jzones.map((z) => +z.count.toFixed(2)));
  check('snow piles on all three drifts around the jar', jz.every((c) => c >= 2.9), JSON.stringify(jz));
  const fin = await T.until(() => (JSON.parse(localStorage.getItem('weather-thieves-progress-v1') || '{}').done || []).includes(3), 150000);
  await T.until(() => !document.getElementById('end').classList.contains('hidden'), 20000);
  check('finale plays and chapter 3 is saved as complete, end card up', fin && (await ev(() => !document.getElementById('end').classList.contains('hidden'))));
  await shot(page, 'qa/shots/touch3-end.png');
  console.log('chapter 3 by touch took', ((Date.now() - t0) / 1000).toFixed(0), 's real time');
  check('no console errors', logs.length === 0, logs.slice(0, 3).join(' | '));
  const bad = results.filter((x) => !x.ok); console.log(bad.length ? 'RESULT: ' + bad.length + ' FAILED' : 'RESULT: ALL ' + results.length + ' CHECKS PASSED'); await browser.close(); process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error('TEST CRASH', e); process.exit(2); });
