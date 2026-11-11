// Chapter 4 mechanics test (state-driven; drives the real update loop with simulated aim).
const { launch, sleep, check, results } = require('./lib.cjs');
(async () => {
  const { browser, page, logs } = await launch({ w: 800, h: 450 });
  await page.click('#begin'); await sleep(300); await page.evaluate(() => { __game.ui.dlg.lines = []; __game.ui.endDialogue(); __game.loadChapter(4); });
  await page.waitForFunction(() => !document.getElementById('chapterCard').classList.contains('show'), null, { timeout: 60000 }); await sleep(300);
  const r = await page.evaluate(() => {
    const g = __game, w = g.world, T = g.tools, V = g.camera.position.constructor, out = {}; const nd = () => { g.ui.dlg.lines = []; g.ui.endDialogue(); g.state = 'play'; g.player.locked = false; g.cinematic = false; };
    nd(); g.sim(1); const aim = (x, y, z) => { g.debugAim = { point: new V(x, y, z), hit: null, hitType: null, ground: true }; };
    const charge = (cloud, rod, from) => { g.player.pos.set(...from); g.player.vel.set(0, 0, 0); nd(); T.grab(cloud); nd(); cloud.stretchT = 0.5; T.select(0); const gp = new V(rod.pos.x, rod.pos.y, rod.pos.z); aim(gp.x, gp.y, gp.z); g.sim(8); T.drop(); g.sim(1); };
    const grumble = w.weather.clouds.find((c) => c.id === 'grumble'), rumble = w.weather.clouds.find((c) => c.id === 'rumble'), nim = w.weather.clouds.find((c) => c.id === 'nimbus');
    // 1. squash -> charge -> strike rod A
    charge(grumble, w.rodA, [-5, 0, 13]); out.rodA = [w.rodA.latched, +w.rodA.power.toFixed(0)];
    // 2. ride the lift while powered
    g.player.pos.set(w.liftBase.x, w.liftBase.y + 0.1, w.liftBase.z); g.player.vel.set(0, 0, 0); g.sim(6); out.liftY = +g.player.pos.y.toFixed(1);
    // 3. rod B on the catwalk, then walk the powered belt to rod C
    g.player.pos.set(-9, 7.3, -8); g.player.vel.set(0, 0, 0); g.sim(0.3); rumble.charge = 0; charge(rumble, w.rodB, [-9, 7.3, -8]); out.rodB = [w.rodB.latched, +w.rodB.power.toFixed(0), w.belt.on];
    g.player.pos.set(-3.0, 7.3, -9); g.player.vel.set(0, 0, 0); g.player.grounded = true; g.sim(0.2); const x0 = g.player.pos.x; g.sim(4); out.carried = +(g.player.pos.x - x0).toFixed(1); out.beltY = +g.player.pos.y.toFixed(1);
    g.player.pos.set(14, 7.3, -9); g.player.vel.set(0, 0, 0); g.sim(0.3); nim.charge = 0; charge(nim, w.rodC, [14, 7.3, -9]); out.rodC = w.rodC.latched; out.flags = JSON.stringify({ latched: g.narr.flags.latched, door: g.narr.flags.door, babies: g.narr.flags.babies });
    return out;
  });
  console.log(JSON.stringify(r));
  await sleep(3000); const r2 = await page.evaluate(() => { const g = __game, w = g.world, T = g.tools, V = g.camera.position.constructor, out = {}; const nd = () => { g.ui.dlg.lines = []; g.state = 'play'; g.player.locked = false; };
    for (let i = 0; i < 40; i++) { if (g.ui.dlg.active) { g.ui.advance(); g.ui.advance(); } g.sim(0.3); } nd(); out.revealed = g.narr.flags.revealed; out.wren = w.wren.root.visible; out.doorOpen = !!w.doorOpen;
    const aim = (x, y, z) => { g.debugAim = { point: new V(x, y, z), hit: null, hitType: null, ground: true }; };
    // aim the mirror along the plaza, then rain across the beam
    g.player.pos.set(-6, w.F.heightAt(-6, -17), -17); g.player.vel.set(0, 0, 0); nd(); T.select(3); g.input.down = true; aim(6, w.F.heightAt(6, -19), -19); g.sim(6); g.input.down = false;
    const fc = w.fenCloud; T.grab(fc); nd(); T.select(1); g.input.down = true; aim(-2, w.F.heightAt(-2, -19), -19); g.sim(9); g.input.down = false; out.rainbow = +g.narr.flags.rainbow.toFixed(2); out.mirrorLit = +w.mirror.lit.toFixed(2); return out; });
  console.log(JSON.stringify(r2)); await sleep(3500);
  const r3 = await page.evaluate(() => { const g = __game; for (let i = 0; i < 100; i++) { if (g.ui.dlg.active) { g.ui.advance(); g.ui.advance(); } g.sim(0.4); } return { freed: g.narr.flags.freed, end: !document.getElementById('end').classList.contains('hidden'), h1: document.querySelector('#end h1').textContent, next: document.getElementById('endNext').style.display }; });
  console.log(JSON.stringify(r3));
  check('squashed cloud charges and strikes rod A', r.rodA[0] && r.rodA[1] > 20, JSON.stringify(r.rodA)); check('lift rises with Juno aboard while powered', r.liftY > 6.5, 'y=' + r.liftY);
  check('rod B struck on the catwalk, belt powered', r.rodB[0] && r.rodB[2], JSON.stringify(r.rodB)); check('powered conveyor carries the player', r.carried > 4, 'dx=' + r.carried); check('rod C struck', r.rodC);
  check('all three rods open the Engine Door and Wren appears', r2.revealed && r2.doorOpen && r2.wren, JSON.stringify(r2)); check('rainbow (sun beam through rain) builds up', r2.rainbow > 0.9 || r3.freed, 'rb=' + r2.rainbow + ' lit=' + r2.mirrorLit);
  check('Great Jar opens, finale plays, end card (The End)', r3.freed && r3.end && /home/i.test(r3.h1), JSON.stringify(r3)); check('no console errors', logs.length === 0, logs.slice(0, 3).join(' | '));
  const bad = results.filter((x) => !x.ok); console.log(bad.length ? 'RESULT: ' + bad.length + ' FAILED' : 'RESULT: ALL ' + results.length + ' CHECKS PASSED'); await browser.close(); process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error('TEST CRASH', e); process.exit(2); });
