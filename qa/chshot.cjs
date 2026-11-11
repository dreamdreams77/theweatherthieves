// node qa/chshot.cjs <chapter> <out.png> '<js run after load, optional>' [w h]
const { launch, sleep } = require('./lib.cjs');
(async () => {
  const [ch, out, pre = '', w = '960', h = '540'] = process.argv.slice(2);
  const { browser, page, logs } = await launch({ w: +w, h: +h });
  await page.click('#begin'); await sleep(300);
  await page.evaluate(() => { const g = __game; g.ui.dlg.lines = []; g.ui.endDialogue(); });
  if (+ch > 1) { await page.evaluate((n) => __game.loadChapter(n), +ch); await page.waitForFunction(() => document.getElementById('chapterCard') && !document.getElementById('chapterCard').classList.contains('show'), null, { timeout: 60000 }); await sleep(500); await page.evaluate(() => { const g = __game; g.ui.dlg.lines = []; g.ui.endDialogue(); g.player.locked = false; g.state = 'play'; }); }
  if (pre) { const r = await page.evaluate(pre); if (r !== undefined) console.log('eval', JSON.stringify(r)); }
  await sleep(800); await page.evaluate(() => __game.renderOnce()); await page.screenshot({ path: out, timeout: 120000 });
  console.log(logs.length ? logs.slice(0, 6).join('\n') : 'no console errors'); await browser.close();
})();
