// QA helper: node qa/shot.cjs <url> <out.png> [js-to-eval-before-shot] [waitMs] [w] [h] [mobile]
const { chromium } = require('playwright');
(async () => {
  const [url, out, pre = '', wait = '3000', w = '1280', h = '720', mobile = ''] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const ctx = await browser.newContext(mobile ? { viewport: { width: +w, height: +h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : { viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage(); const logs = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
  await page.goto(url); await page.waitForFunction(() => window.__game && window.__game.state, null, { timeout: 120000 });
  await page.waitForTimeout(500);
  if (pre) { const r = await page.evaluate(pre); if (r !== undefined) console.log('eval:', JSON.stringify(r)); }
  await page.waitForTimeout(+wait);
  await page.screenshot({ path: out, timeout: 180000 });
  console.log('fps', await page.evaluate(() => window.__game.fps));
  console.log(logs.slice(0, 25).join('\n') || 'no console errors');
  await browser.close();
})();
