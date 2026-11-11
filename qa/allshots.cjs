// Screenshots of every chapter (+ draw-call stats). Scene dressing for the pictures is applied through the page (e.g. opened umbrellas, a lightning bolt).
const { launch, sleep } = require('./lib.cjs');
(async () => {
  const { browser, page, logs } = await launch({ w: 1280, h: 720 });
  await page.click('#begin'); await sleep(300); await page.evaluate(() => { __game.ui.dlg.lines = []; __game.ui.endDialogue(); });
  const stats = () => page.evaluate(() => { const g = __game; g.renderOnce(); g.renderer.info.reset(); g.renderOnce(); return { calls: g.renderer.info.render.calls, tris: Math.round(g.renderer.info.render.triangles / 1000) + 'k' }; });
  const frame = (pre) => page.evaluate(pre);
  const setCam = 'const g=__game; g.ui.dlg.lines=[]; g.ui.endDialogue(); g.state="play"; g.player.locked=false; g.sim(2);';
  // chapter 1: restored sky, Juno + Fen + Sunken Sky
  await frame(`(()=>{${setCam} g.setRestore(0.9,true); const p=g.player; g.rig.yaw=0.5; g.rig.pitch=0.22; g.rig.targetDist=9; g.rig.dist=9; g.rig.snap(p.pos); g.sim(2); return 1})()`); await sleep(500);
  await page.evaluate(() => __game.renderOnce()); await page.screenshot({ path: 'docs/screenshots/chapter1-sunken-sky.png' }); console.log('ch1', JSON.stringify(await stats()));
  for (const [n, pre] of [[2, `(()=>{${setCam} const w=g.world; w.pads.forEach(p=>{p.wet=1;}); g.setRestore(0.7,true); g.rig.yaw=0.3; g.rig.pitch=0.3; g.rig.targetDist=12; g.rig.dist=12; g.rig.snap(g.player.pos); g.sim(4); return 1})()`],
    [3, `(()=>{${setCam} g.rig.yaw=0.15; g.rig.pitch=0.25; g.rig.targetDist=11; g.rig.dist=11; g.player.pos.set(0, g.world.A.heightAt(0,-12), -12); g.rig.snap(g.player.pos); g.sim(5); return 1})()`],
    [4, `(()=>{${setCam} const w=g.world; g.player.pos.set(-4, 0, 13); g.rig.yaw=0.55; g.rig.pitch=0.2; g.rig.targetDist=12; g.rig.dist=12; g.rig.snap(g.player.pos); w.rodA.power=40; g.weather.bolt(new g.camera.position.constructor(-7,22,9), new g.camera.position.constructor(-7,6.4,9)); g.sim(0.05); return 1})()`]]) {
    await page.evaluate((k) => __game.loadChapter(k), n); await page.waitForFunction(() => !document.getElementById('chapterCard').classList.contains('show'), null, { timeout: 60000 }); await sleep(400);
    await frame(pre); await sleep(300); await page.evaluate(() => { __game.ui.dlg.lines = []; __game.ui.endDialogue(); __game.state = 'play'; }); await sleep(300);
    await page.evaluate(() => __game.renderOnce()); await page.screenshot({ path: `docs/screenshots/chapter${n}.png`, timeout: 120000 }); console.log('ch' + n, JSON.stringify(await stats()));
  }
  console.log(logs.length ? logs.slice(0, 5).join('\n') : 'no console errors'); await browser.close();
})();
