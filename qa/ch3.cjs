// Chapter 3 mechanics test (state-driven; drives the real update loop with simulated aim).
const { launch, sleep, check, results } = require('./lib.cjs');
(async () => {
  const { browser, page, logs } = await launch({ w: 800, h: 450 });
  await page.click('#begin'); await sleep(300); await page.evaluate(() => { __game.ui.dlg.lines = []; __game.ui.endDialogue(); __game.loadChapter(3); });
  await page.waitForFunction(() => !document.getElementById('chapterCard').classList.contains('show'), null, { timeout: 60000 }); await sleep(300);
  const r = await page.evaluate(() => {
    const g = __game, w = g.world, T = g.tools, V = g.camera.position.constructor, out = {}; const nd = () => { g.ui.dlg.lines = []; g.ui.endDialogue(); g.state = 'play'; g.player.locked = false; g.cinematic = false; };
    nd(); g.sim(1); const aim = (x, y, z) => { g.debugAim = { point: new V(x, y, z), hit: null, hitType: null, ground: true }; };
    // 1. freeze the river segments from the south bank, walking onto each as it freezes
    T.select(4); g.player.pos.set(0, w.A.heightAt(0, -16), -16.5); nd(); g.sim(0.3);
    for (const s of w.segs) { g.input.down = true; aim(s.x, 0, s.z); g.sim(4); g.input.down = false; g.player.pos.set(0, 0.05, s.z + 0.6); g.player.vel.set(0, 0, 0); g.sim(0.5); }
    out.seg = w.segs.map((s) => +s.frozen.toFixed(2)); out.onIce = +g.player.pos.y.toFixed(2); out.crossed = !!g.narr.flags.crossed || w.segs.every((s) => s.frozen > 0.9);
    // 2. snow ramp: grab Flurry, hold Frost over the ramp
    const fl = w.weather.clouds.find((c) => c.id === 'flurry'); g.player.pos.set(-4, w.B.heightAt(-4, -40), -38); nd(); T.grab(fl); nd(); T.select(4); g.input.down = true; aim(w.ramp.x, w.ramp.base, w.ramp.z); g.sim(16); g.input.down = false; out.ramp = +w.ramp.count.toFixed(2);
    // walk onto the ramp then the ledge
    T.drop(); g.player.pos.set(w.ramp.x, w.ramp.base + 0.1, w.ramp.z + 3.4); g.player.vel.set(0, 0, 0); g.sim(0.3); g.player.pos.set(w.ramp.x, w.ramp.base + w.ramp.h() + 0.05, w.ramp.z); g.sim(0.4); g.player.pos.set(-4, w.ledgeY + 0.1, -47); g.sim(0.4); out.onLedge = +g.player.pos.y.toFixed(2);
    // 3. melt the sled's ice with the mirror
    T.select(3); g.player.pos.set(-7, w.ledgeY, -50); nd(); g.input.down = true; aim(w.ice.group.position.x, w.ledgeY, w.ice.group.position.z); g.sim(16); g.input.down = false; out.melt = +w.ice.melt.toFixed(2); out.sledLocked = w.sled.locked;
    // 4. blizzard: snow over the sled, then blow it east onto the plate
    const nim = w.weather.clouds.find((c) => c.id === 'nimbus'); g.player.pos.set(-6, w.ledgeY, -50); T.grab(nim); nd(); T.select(4); g.input.down = true; aim(w.sled.pos.x, w.ledgeY, w.sled.pos.z); g.sim(2.5); g.input.down = false; T.drop(); T.select(2);
    for (let i = 0; i < 14; i++) { nim.snowT = 5; g.player.pos.set(w.sled.pos.x - 3, w.ledgeY, w.sled.pos.z); g.input.down = true; aim(w.plate.pos.x, w.ledgeY, w.plate.pos.z); g.sim(0.6); g.input.down = false; g.sim(0.6); if (w.plate.on) break; }
    out.sledX = +w.sled.pos.x.toFixed(1); out.plate = w.plate.on; g.sim(3); nd(); out.doorOpen = !!w.doorOpen;
    // 5. snow the three drifts around the jar
    const nim2 = nim; nim2.moisture = 1; for (const z of w.jzones) { nim2.moisture = 1; g.player.pos.set(z.x - 3, w.B.heightAt(z.x - 3, z.z), z.z); nd(); T.grab(nim2); nd(); T.select(4); g.input.down = true; aim(z.x, z.base, z.z); g.sim(14); g.input.down = false; T.drop(); nim2.moisture = 1; }
    out.jar = w.jzones.map((z) => +z.count.toFixed(2)); out.spiritFree = !!g.narr.flags.freedSpirit;
    return out;
  });
  console.log(JSON.stringify(r));
  await sleep(3500); const r2 = await page.evaluate(() => { const g = __game; for (let i = 0; i < 80; i++) { if (g.ui.dlg.active) { g.ui.advance(); g.ui.advance(); } g.sim(0.4); } return { freed: g.narr.flags.freed, end: !document.getElementById('end').classList.contains('hidden'), next: document.getElementById('endNext').style.display !== 'none' ? document.getElementById('endNext').textContent : '(none)' }; });
  check('river segments freeze under Frost', r.seg.every((s) => s > 0.9), JSON.stringify(r.seg)); check('player stands on the ice (walkable)', r.onIce > -0.2 && r.onIce < 0.6, 'y=' + r.onIce);
  check('held cloud + Frost snows a drift to full height', r.ramp > 2.8, 'count=' + r.ramp); check('snow ramp lets you climb to the ledge', r.onLedge > 1.2, 'y=' + r.onLedge);
  check('mirror sunlight melts the sled’s ice', r.melt >= 1 && !r.sledLocked, 'melt=' + r.melt); check('blizzard (snow + wind) pushes the sled onto the plate', r.plate, 'sledX=' + r.sledX); check('plate opens the Pine Gate', r.doorOpen);
  check('three jar drifts freed the Quiet', r.spiritFree, JSON.stringify(r.jar)); check('Chapter 3 end card', r2.end && r2.freed, r2.next);
  check('no console errors', logs.length === 0, logs.slice(0, 3).join(' | '));
  const bad = results.filter((x) => !x.ok); console.log(bad.length ? 'RESULT: ' + bad.length + ' FAILED' : 'RESULT: ALL ' + results.length + ' CHECKS PASSED'); await browser.close(); process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error('TEST CRASH', e); process.exit(2); });
