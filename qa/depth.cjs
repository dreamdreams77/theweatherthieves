// Depth features: pause/settings, chapter select, mid-chapter save + Continue, Weather Almanac (hail), chapter soundscapes.
const { sleep, launch, check, results } = require('./lib.cjs');
(async () => {
  let { browser, ctx, page, logs } = await launch({ w: 1100, h: 620 });
  const ev = (f, a) => page.evaluate(f, a);
  const flush = async () => { for (let i = 0; i < 40; i++) { if (!(await ev(() => __game.ui.dlg.active))) return; await page.keyboard.press('Enter'); await sleep(110); } };
  await page.click('#begin'); await sleep(400); await flush();
  // --- pause with Escape freezes the game
  await page.keyboard.press('Escape'); await sleep(200); const p0 = await ev(() => __game.player.pos.toArray()); await page.keyboard.down('KeyW'); await sleep(700); await page.keyboard.up('KeyW'); const p1 = await ev(() => __game.player.pos.toArray());
  check('Esc opens the pause menu and freezes play', (await ev(() => __game.paused && !document.getElementById('pause').classList.contains('hidden'))) && Math.hypot(p1[0] - p0[0], p1[2] - p0[2]) < 0.05);
  // --- settings (real inputs)
  await page.locator('#sVol').fill('0.3'); await page.click('#sMotion'); await page.click('#sText'); await sleep(200);
  const s1 = await ev(() => { __game.shake(1); return { vol: JSON.parse(localStorage.getItem('weather-thieves-settings-v1')).volume, shake: __game.rig.shake, big: document.body.classList.contains('big-text'), audioVol: __game.audio.vol }; });
  check('volume slider saves and applies', s1.vol === 0.3 && s1.audioVol === 0.3, JSON.stringify(s1)); check('reduce motion disables camera shake', s1.shake === 0); check('larger text toggles', s1.big);
  await page.click('#pResume'); await sleep(200); check('Resume closes the menu', await ev(() => !__game.paused));
  // --- hail: frost breath through Fen's drizzle (real key + mouse)
  await page.keyboard.press('Digit5'); const tgt = await ev(() => { const g = __game, V = g.camera.position.constructor; g.sim(2); const cl = g.world.fenCloud.pos, gy = g.terrain.topAt(cl.x, cl.z); g.player.pos.set(cl.x, g.terrain.topAt(cl.x, cl.z + 4), cl.z + 4); g.player.vel.set(0, 0, 0); g.rig.yaw = 0; g.rig.pitch = 0.35; g.rig.snap(g.player.pos); g.sim(0.6); const v = new V(cl.x, gy + 0.3, cl.z).project(g.camera); /* aim under Fen drizzle */ return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight }; });
  await page.mouse.move(tgt.x, tgt.y); await page.mouse.down(); await sleep(2200); await page.mouse.up(); await sleep(300);
  check('Frost into a raining cloud = Hail (Almanac entry)', await ev(() => (__game.combos.has('hail'))), JSON.stringify(await ev(() => ({ alm: (window.__p = (localStorage.getItem('weather-thieves-progress-v1') || '').slice(0, 200)) }))));
  await page.click('#memBtn'); await sleep(300); const alm = await ev(() => ({ n: document.querySelectorAll('#almanac .alm').length, got: [...document.querySelectorAll('#almanac .alm:not(.locked) b')].map((b) => b.textContent) })); await page.click('#albumClose');
  check('Almanac lists all 10 combinations, discovered ones named', alm.n === 10 && alm.got.includes('Hail'), JSON.stringify(alm));
  // --- chapter select (unlock all for the test), go to Chapter 2
  await ev(() => { const P = window.__progress; }); await ev(() => { localStorage.setItem('weather-thieves-progress-v1', JSON.stringify({ ...JSON.parse(localStorage.getItem('weather-thieves-progress-v1') || '{}'), unlocked: 4, chapter: 1 })); });
  await page.reload(); await page.waitForFunction(() => window.__game && __game.state === 'title', null, { timeout: 120000 }); await page.click('#begin'); await sleep(500); await flush();
  await page.keyboard.press('Escape'); await sleep(200); const btns = await ev(() => [...document.querySelectorAll('#pChapters button')].map((b) => [b.textContent, b.disabled]));
  check('chapter select lists four chapters, unlocked ones enabled', btns.length === 4 && btns.every((b) => !b[1]), JSON.stringify(btns));
  await page.click('#pChapters button:nth-child(2)'); await page.waitForFunction(() => __game.chapterNo === 2 && !document.getElementById('chapterCard').classList.contains('show'), null, { timeout: 60000 }); await sleep(400); await flush();
  check('chapter 2 loads from chapter select, its soundscape is active', await ev(() => __game.chapterNo === 2 && __game.audio.ch === 2));
  // --- solve part of chapter 2 through the real game loop, then reload and Continue
  await ev(() => { const g = __game, w = g.world; w.pads.forEach((p) => (p.wet = 1)); g.sim(2); g.player.pos.set(w.valve.pos.x + 1.5, w.valve.pos.y - 1.2, w.valve.pos.z); g.player.vel.set(0, 0, 0); const n = w.weather.clouds.find((c) => c.id === 'nimbus'); g.tools.grab(n); n.stretchT = 2; g.debugAim = { point: new g.camera.position.constructor(w.valve.pos.x, w.valve.pos.y - 1.2, w.valve.pos.z), hit: null, hitType: null, ground: true }; g.ui.dlg.lines = []; g.ui.endDialogue(); g.state = 'play'; g.sim(6); g.debugAim = null; g.tools.drop(); });
  await page.keyboard.press('KeyF'); await sleep(300); await flush();
  const before = await ev(() => ({ valve: __game.narr.flags.valve, pads: __game.world.pads.map((p) => p.open > 0.9) }));
  check('valve turned with F after fog reveal', before.valve, JSON.stringify(before));
  await page.reload(); await page.waitForFunction(() => window.__game && __game.state === 'title', null, { timeout: 120000 }); const label = await ev(() => document.getElementById('begin').textContent); await page.click('#begin');
  await page.waitForFunction(() => __game.chapterNo === 2 && !document.getElementById('chapterCard').classList.contains('show'), null, { timeout: 60000 }); await sleep(600);
  const after = await ev(() => { __game.sim(1); return { valve: __game.narr.flags.valve, worldValve: __game.world.flags.valve, pads: __game.world.pads.map((p) => p.open > 0.9), intro: __game.ui.dlg.active }; });
  check('Continue resumes chapter 2 with the valve and umbrellas restored', after.valve && after.worldValve && after.pads.every(Boolean) && !after.intro, label + ' ' + JSON.stringify(after));
  check('settings survive a reload', await ev(() => document.body.classList.contains('big-text') && __game.audio.vol === 0.3));
  check('no console errors', logs.length === 0, logs.slice(0, 3).join(' | '));
  const bad = results.filter((x) => !x.ok); console.log(bad.length ? 'RESULT: ' + bad.length + ' FAILED' : 'RESULT: ALL ' + results.length + ' CHECKS PASSED'); await browser.close(); process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error('TEST CRASH', e); process.exit(2); });
