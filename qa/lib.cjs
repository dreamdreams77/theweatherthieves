// Shared helpers for human-style Playwright tests (real keyboard / mouse / touch events; page state is only READ).
const { chromium } = require('playwright');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function launch({ mobile = false, w = 1280, h = 720, url = 'http://localhost:4173/?norender=1' } = {}) {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const ctx = await browser.newContext(mobile ? { viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 } : { viewport: { width: w, height: h } });
  const page = await ctx.newPage(); const logs = [];
  page.on('console', (m) => { if (m.type() === 'error') logs.push('console.error: ' + m.text()); });
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
  await page.goto(url); await page.waitForFunction(() => window.__game && window.__game.state === 'title', null, { timeout: 120000 });
  return { browser, ctx, page, logs };
}
const results = [];
function check(name, ok, info = '') { results.push({ name, ok: !!ok, info }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info ? '  [' + info + ']' : '')); return ok; }
async function shot(page, file) { await page.evaluate(() => __game.renderOnce()); await page.screenshot({ path: file, timeout: 120000 }); console.log('shot', file); }
module.exports = { sleep, launch, check, results, shot };
