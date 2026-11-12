// Weather Trials + Ask Fen + glow toggle. Real keys/mouse; aim is pinned with debugAim so the cursor hits each target exactly.
const { sleep, launch, check, results, shot } = require('./lib.cjs');
(async () => {
  let { browser, page, logs } = await launch({ w: 1100, h: 620 });
  const ev = (f, a) => page.evaluate(f, a);
  const flush = async () => { for (let i = 0; i < 40; i++) { if (!(await ev(() => __game.ui.dlg.active))) return; await page.keyboard.press('Enter'); await sleep(110); } };
  await page.click('#begin'); await sleep(400); await flush();
  // --- Ask Fen (H key and HUD button)
  await page.keyboard.press('KeyH'); await sleep(150);
  const hint1 = await ev(() => [...document.querySelectorAll('#barks .bark.fen')].map((b) => b.textContent).pop() || '');
  check('H asks Fen for an in-character hint about the current goal', /Press 1|grey cloud/i.test(hint1), hint1.slice(0, 120));
  await page.click('#askFen'); await sleep(150); check('Ask Fen HUD button works', (await ev(() => document.querySelectorAll('#barks .bark.fen').length)) >= 2);
  // --- trial stone near spawn; walk up and press F
  const st = await ev(() => { const g = __game, s = g.trials.stonePos; g.player.pos.set(s.x + 1.6, g.terrain.topAt(s.x + 1.6, s.z) + 0.05, s.z); g.player.vel.set(0, 0, 0); g.sim(0.3); return !!s && Math.hypot(s.x - 3, s.z - 8); });
  check('trial stone stands near the chapter spawn', st && st < 12, String(st));
  await page.keyboard.press('KeyF'); await sleep(200); const intro = await ev(() => __game.ui.dlg.active && __game.ui.dlg.lines.map((l) => l.text).join(' ')); await flush(); await sleep(200);
  const a = await ev(() => { const A = __game.trials.active; return A && { n: A.targets.length, types: A.targets.map((t) => t.type).sort().join(','), hud: document.getElementById('trialHud').classList.contains('show') }; });
  check('F at the stone: Fen explains, then the Bloom Rush starts', !!intro && /Bloom Rush/.test(intro) && a && a.n === 6 && a.types === 'rain,rain,rain,rain,wind,wind' && a.hud, JSON.stringify(a));
  await sleep(3300); check('3-second countdown, then the clock runs', await ev(() => __game.trials.active.count <= 0 && __game.trials.active.t > 0));
  await shot(page, 'qa/shots/trial-start.png');
  // --- wind targets: Wind tool, real mouse hold
  await page.keyboard.press('Digit3');
  const winds = await ev(() => __game.trials.active.targets.map((t, i) => [t.type, i]).filter((x) => x[0] === 'wind').map((x) => x[1]));
  for (const i of winds) {
    await ev((i) => { const g = __game, t = g.trials.active.targets[i], V = t.pos.constructor; const px = t.pos.x + 3, pz = t.pos.z; g.player.pos.set(px, g.terrain.topAt(px, pz) + 0.05, pz); g.player.vel.set(0, 0, 0); g.debugAim = { point: new V(t.pos.x, t.pos.y, t.pos.z), hit: null, hitType: null, ground: true }; }, i);
    await page.mouse.move(550, 300); await page.mouse.down(); await sleep(2300); await page.mouse.up(); await sleep(100);
  }
  const wd = await ev(() => __game.trials.active.targets.filter((t) => t.type === 'wind').map((t) => t.done));
  check('Wind gusts spin both pinwheels', wd.every(Boolean), JSON.stringify(wd));
  // --- rain targets: carry a cloud over each pod and hold Rain
  await page.keyboard.press('Digit2');
  const rains = await ev(() => __game.trials.active.targets.map((t, i) => [t.type, i]).filter((x) => x[0] === 'rain').map((x) => x[1]));
  await ev(() => { const g = __game, c = g.weather.clouds.find((c) => !c.personal && !c.fixed); g.tools.grab(c); });
  for (const i of rains) {
    await ev((i) => { const g = __game, t = g.trials.active.targets[i], V = t.pos.constructor; const px = t.pos.x + 4, pz = t.pos.z + 2; g.player.pos.set(px, g.terrain.topAt(px, pz) + 0.05, pz); g.player.vel.set(0, 0, 0); g.tools.held.moisture = 1; g.debugAim = { point: new V(t.pos.x, t.pos.y - 0.9, t.pos.z), hit: null, hitType: null, ground: true }; g.tools.held.pos.set(t.pos.x, t.pos.y + 4.5, t.pos.z); }, i);
    await page.mouse.down(); await sleep(2600); await page.mouse.up(); await sleep(100);
  }
  await ev(() => { __game.debugAim = null; __game.tools.drop(); }); await sleep(300);
  const res = await ev(() => ({ active: !!__game.trials.active, last: __game.trials.lastResult, saved: JSON.parse(localStorage.getItem('weather-thieves-progress-v1')).trials, toast: document.getElementById('toast').textContent }));
  check('all six targets done → trial finishes with a time and medal', !res.active && res.last && res.last.medal === 'gold' && /Bloom Rush/.test(res.toast), JSON.stringify(res));
  check('best time + medal saved to progress', res.saved && res.saved[1] && res.saved[1].medal === 'gold' && Math.abs(res.saved[1].time - res.last.time) < 0.05);
  check('stone gem turns gold', await ev(() => __game.trials.gem.material.color.getHex() === 0xffd24a));
  await page.keyboard.press('Escape'); await sleep(200);
  const rows = await ev(() => [...document.querySelectorAll('#pTrials .trow')].map((r) => r.className + ':' + r.textContent));
  check('pause menu lists 4 trials with the gold result', rows.length === 4 && /gold/.test(rows[0]) && /not tried/.test(rows[1]), JSON.stringify(rows.slice(0, 2)));
  // --- glow toggle
  const fx0 = await ev(() => !!__game.post); await page.click('#sFx'); await sleep(150); const fx1 = await ev(() => !!__game.post);
  check('Glow & film effects toggle switches post-processing', fx0 !== fx1, fx0 + '->' + fx1); await page.click('#sFx'); await page.click('#pResume'); await sleep(200);
  // --- every chapter places a stone; chapter 3 trial spawns frost + snow targets; wandering off cancels
  await ev(() => __game.loadChapter(3)); await page.waitForFunction(() => __game.chapterNo === 3 && !document.getElementById('chapterCard').classList.contains('show'), null, { timeout: 60000 }); await sleep(300); await flush();
  const c3 = await ev(() => { const g = __game, s = g.trials.stonePos; g.player.pos.set(s.x + 1.6, g.terrain.topAt(s.x + 1.6, s.z) + 0.05, s.z); g.player.vel.set(0, 0, 0); g.sim(0.3); return !!s; });
  await page.keyboard.press('KeyF'); await sleep(200); await flush(); await sleep(200);
  const t3 = await ev(() => __game.trials.active && __game.trials.active.targets.map((t) => t.type).sort().join(','));
  check('chapter 3 Freeze Frame: 4 frost bubbles + 2 snow cairns', c3 && t3 === 'frost,frost,frost,frost,snow,snow', String(t3));
  await ev(() => { const g = __game; g.sim(3.5); const t = g.trials.active.targets.find((t) => t.type === 'frost'), V = t.pos.constructor, px = t.pos.x + 3, pz = t.pos.z; g.player.pos.set(px, g.terrain.topAt(px, pz) + 0.05, pz); g.player.vel.set(0, 0, 0); g.debugAim = { point: new V(t.pos.x, t.pos.y, t.pos.z), hit: null, hitType: null, ground: true }; });
  await page.keyboard.press('Digit5'); await page.mouse.down(); await sleep(2300); await page.mouse.up(); await ev(() => (__game.debugAim = null));
  check('Frost breath freezes a bubble', await ev(() => __game.trials.active.targets.some((t) => t.type === 'frost' && t.done)));
  await shot(page, 'qa/shots/trial-ch3.png');
  await ev(() => { const g = __game, s = g.trials.stonePos; g.player.pos.set(s.x + 80, s.y + 30, s.z); g.sim(0.2); });
  check('wandering far away cancels the trial', await ev(() => !__game.trials.active && /cancelled/.test(document.getElementById('toast').textContent)));
  for (const n of [2, 4]) { await ev((n) => __game.loadChapter(n), n); await page.waitForFunction((n) => __game.chapterNo === n, n, { timeout: 60000 }); await sleep(300); await flush(); check(`chapter ${n} has a trial stone`, await ev(() => !!__game.trials.stonePos && !!__game.trials.stone.parent)); }
  check('no console errors', logs.length === 0, logs.slice(0, 3).join(' | '));
  const bad = results.filter((x) => !x.ok); console.log(bad.length ? 'RESULT: ' + bad.length + ' FAILED' : 'RESULT: ALL ' + results.length + ' CHECKS PASSED'); await browser.close(); process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error('TEST CRASH', e); process.exit(2); });
