// Chapter 2 mechanics test (state-driven: drives the real game loop with simulated aim; keyboard/mouse chain is covered by the Ch1 playthrough).
const { launch, sleep, check, results } = require('./lib.cjs');
(async () => {
  const { browser, page, logs } = await launch({ w: 800, h: 450 });
  await page.click('#begin'); await sleep(300); await page.evaluate(() => { __game.ui.dlg.lines = []; __game.ui.endDialogue(); __game.loadChapter(2); });
  await page.waitForFunction(() => !document.getElementById('chapterCard').classList.contains('show'), null, { timeout: 60000 }); await sleep(300);
  const r = await page.evaluate(() => {
    const g = __game, w = g.world, T = g.tools, V = g.camera.position.constructor, out = {}; const nd = () => { g.ui.dlg.lines = []; g.ui.endDialogue(); g.state = 'play'; g.player.locked = false; g.cinematic = false; };
    nd(); g.sim(1); const aim = (x, y, z) => { g.debugAim = { point: new V(x, y, z), hit: null, hitType: null, ground: true }; };
    const rainAt = (pos, secs, cloud) => { T.grab(cloud); nd(); T.select(1); g.input.down = true; aim(pos.x, pos.y, pos.z); g.player.pos.set(pos.x + 4, pos.y, pos.z + 3); g.sim(secs); g.input.down = false; T.drop(); };
    // 1. open the three umbrellas
    const fc = w.fenCloud; for (const p of w.pads) { g.player.pos.set(p.pos.x + 3, p.pos.y, p.pos.z + 3); g.sim(0.2); rainAt(p.pos, 9, fc); fc.moisture = 1; nd(); }
    out.padsOpen = w.pads.map((p) => +p.open.toFixed(2));
    // 2. bounce chain: stand on pad 1 -> roof A -> pad 2 -> roof B -> pad 3 -> balcony
    g.player.pos.set(w.pads[0].pos.x, w.pads[0].pos.y, w.pads[0].pos.z + 0.2); g.player.vel.set(0, 0, 0); g.player.grounded = true; g.sim(3); out.afterB1 = g.player.pos.toArray().map((x) => +x.toFixed(1));
    g.player.pos.set(w.pads[1].pos.x, w.pads[1].pos.y, w.pads[1].pos.z + 0.2); g.player.grounded = true; g.sim(3); out.afterB2 = g.player.pos.toArray().map((x) => +x.toFixed(1));
    g.player.pos.set(w.pads[2].pos.x, w.pads[2].pos.y, w.pads[2].pos.z + 0.2); g.player.grounded = true; g.sim(3); out.afterB3 = g.player.pos.toArray().map((x) => +x.toFixed(1)); out.balconyY = +w.balcony.y.toFixed(1);
    // 3. fog: stretch Nimbus and park it low over the valve
    const nim = w.weather.clouds.find((c) => c.id === 'nimbus'); T.grab(nim); nd(); nim.stretchT = 2.0; const vp = w.valve.pos; aim(vp.x, vp.y - 1.2, vp.z); g.sim(6); out.valveUp = !!w.valve.up; out.nimY = +nim.pos.y.toFixed(1);
    g.player.pos.set(vp.x + 1.5, vp.y - 1.2, vp.z); g.player.vel.set(0, 0, 0); g.sim(0.3); g.interact(); g.sim(0.5); nd(); out.valveFlag = w.flags.valve; T.drop();
    // 4. basins in the right order (short, tall, wide) with Fen's cloud
    g.player.pos.set(5, 0, 14); const order = [0, 1, 2]; for (const i of order) { const b = w.basins[i]; fc.moisture = 1; rainAt(b.pos, 9, fc); nd(); } out.basinsDone = w.nextBasin; out.basinFlags = w.basins.map((b) => b.locked);
    // wrong order test: reset and do tall first
    // 5. tickle the Dry Cloud with wind three times
    T.select(2); g.player.pos.set(w.fountainPos.x - 5, w.fountainPos.y, w.fountainPos.z + 2); nd(); for (let i = 0; i < 3; i++) { g.input.down = true; aim(w.dry.pos.x, w.dry.pos.y, w.dry.pos.z); g.sim(1.2); g.input.down = false; g.sim(2.6); nd(); }
    out.laughs = w.laughs; out.dryOpen = !!w.dryOpen; g.sim(3);
    return out;
  });
  await sleep(3500); // the finale dialogue starts on a real-time timer
  Object.assign(r, await page.evaluate(() => { const g = __game, out = {}; for (let i = 0; i < 80; i++) { if (g.ui.dlg.active) { g.ui.advance(); g.ui.advance(); } g.sim(0.4); } out.flagsFreed = g.narr.flags.freed; out.endShown = !document.getElementById('end').classList.contains('hidden'); out.endBtn = document.getElementById('endNext').style.display !== 'none' ? document.getElementById('endNext').textContent : '(none)'; return out; }));
  console.log(JSON.stringify(r));
  check('umbrella pads open with rain', r.padsOpen.every((o) => o > 0.9), JSON.stringify(r.padsOpen));
  check('bounce 1 lands on Orla’s roof', r.afterB1[1] > 4, JSON.stringify(r.afterB1)); check('bounce 2 lands on bakery roof', r.afterB2[1] > 8, JSON.stringify(r.afterB2)); check('bounce 3 lands on the clock-tower balcony', Math.abs(r.afterB3[1] - r.balconyY) < 1.2, JSON.stringify(r.afterB3) + ' vs ' + r.balconyY);
  check('stretched low cloud (fog) reveals the hidden valve', r.valveUp); check('valve turned with F', r.valveFlag);
  check('basins filled in order (short, tall, wide)', r.basinsDone === 3, JSON.stringify(r.basinFlags));
  check('Dry Cloud laughs 3x and jar opens', r.laughs >= 3 && r.dryOpen, 'laughs=' + r.laughs); check('Chapter 2 end card with next-chapter button', r.endShown, r.endBtn);
  check('no console errors', logs.length === 0, logs.slice(0, 3).join(' | '));
  const bad = results.filter((x) => !x.ok); console.log(bad.length ? 'RESULT: ' + bad.length + ' FAILED' : 'RESULT: ALL ' + results.length + ' CHECKS PASSED'); await browser.close(); process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error('TEST CRASH', e); process.exit(2); });
