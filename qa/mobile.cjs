// Mobile touch test: real multi-touch events through CDP (joystick, camera drag, tool buttons, USE, jump, cloud tap/stretch).
const { sleep, launch, check, results, shot } = require('./lib.cjs');
(async () => {
  const { browser, ctx, page, logs } = await launch({ mobile: true, w: 844, h: 390 });
  const cdp = await ctx.newCDPSession(page); const active = new Map(); let nid = 1;
  const send = (type) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: [...active.values()].map((t) => ({ x: t.x, y: t.y, id: t.id })) });
  const down = async (x, y) => { const id = nid++; active.set(id, { x, y, id }); await send('touchStart'); return id; };
  const move = async (id, x, y) => { active.get(id).x = x; active.get(id).y = y; await send('touchMove'); };
  const up = async (id) => { active.delete(id); await send('touchEnd'); };
  const tap = async (x, y) => { const id = await down(x, y); await sleep(70); await up(id); };
  const center = async (sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
  const tapSel = async (sel) => { const c = await center(sel); await tap(c.x, c.y); await sleep(120); };
  const holdSel = async (sel) => { const c = await center(sel); return down(c.x, c.y); };
  const S = () => page.evaluate(() => { const g = __game; return { p: g.player.pos.toArray(), yaw: g.rig.yaw, tool: g.tools.tool, held: g.tools.held?.id || null, stretchT: g.tools.held?.stretchT, raining: g.world.fenCloud.raining, gust: g.weather.gust.power, dlg: g.ui.dlg.active, touchUi: !document.getElementById('touch').classList.contains('hidden'), state: g.state }; });
  const flush = async () => { for (let i = 0; i < 40 && (await S()).dlg; i++) { const c = await center('#dlg'); await tap(c.x, c.y); await sleep(150); } };

  await tapSel('#begin'); await sleep(400); await flush(); await sleep(500);
  const s0 = await S(); check('touch UI visible on mobile', s0.touchUi); await shot(page, 'docs/screenshots/mobile-01-touch-ui.png');
  // joystick
  const stick = await center('#stick'); const a = s0.p; const id = await down(stick.x, stick.y); await move(id, stick.x + 5, stick.y - 20); await move(id, stick.x + 10, stick.y - 48); await sleep(1100); const mid = await S(); await up(id); await sleep(300);
  check('virtual joystick moves Juno', Math.hypot(mid.p[0] - a[0], mid.p[2] - a[2]) > 2, 'moved=' + Math.hypot(mid.p[0] - a[0], mid.p[2] - a[2]).toFixed(1));
  await sleep(500); const still = await S(); await sleep(300); const still2 = await S(); check('joystick release stops Juno', Math.hypot(still2.p[0] - still.p[0], still2.p[2] - still.p[2]) < 0.4);
  // camera drag on canvas
  const yaw0 = (await S()).yaw; const d = await down(600, 150); await move(d, 560, 150); await move(d, 500, 160); await move(d, 440, 160); await up(d); await sleep(200); check('one-finger drag rotates camera', Math.abs((await S()).yaw - yaw0) > 0.3, 'dyaw=' + ((await S()).yaw - yaw0).toFixed(2));
  // jump
  const y0 = (await S()).p[1]; await tapSel('#bJump'); await sleep(260); check('Jump button jumps', (await S()).p[1] > y0 + 0.3);
  await sleep(900);
  // tool buttons
  for (const [i, n] of [[1, 'rain'], [2, 'wind'], [3, 'sun'], [4, 'frost'], [0, 'cloud']]) { await tapSel(`.tool[data-i="${i}"]`); check(`tap tool button -> ${n}`, (await S()).tool === n); }
  // tap a cloud on the canvas to pick it up
  const cloudScreen = async () => page.evaluate(() => { const g = __game, V = g.camera.position.constructor, p = g.world.fenCloud.pos, v = new V(p.x, p.y, p.z).project(g.camera); return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight, vis: v.z < 1 && Math.abs(v.x) < 0.9 && Math.abs(v.y) < 0.85 }; });
  let cs = await cloudScreen(); for (let i = 0; i < 8 && !cs.vis; i++) { const dd = await down(500, 200); await move(dd, 420, 200); await up(dd); await sleep(150); cs = await cloudScreen(); }
  await tap(cs.x, cs.y); await sleep(400); check('tapping a cloud picks it up', (await S()).held === 'fen', 'held=' + (await S()).held); await flush();
  // stretch / squash buttons
  const t0 = (await S()).stretchT; const hp = await holdSel('#bPlus'); await sleep(600); await up(hp); const t1 = (await S()).stretchT; const hm = await holdSel('#bMinus'); await sleep(1200); await up(hm); const t2 = (await S()).stretchT;
  check('+ stretches / − squashes held cloud', t1 > t0 + 0.2 && t2 < t1 - 0.2, `${t0.toFixed(2)} -> ${t1.toFixed(2)} -> ${t2.toFixed(2)}`);
  // USE with Rain: aim reticle at first bloom by dragging the camera (bot reads aim), hold USE with one finger while another drags
  await tapSel('.tool[data-i="1"]'); const bloom = await page.evaluate(() => __game.world.blooms[0].group.position.toArray());
  // walk toward the blooms with the stick
  const walkTo = async (x, z) => { const t0 = Date.now(); const sid = await down(stick.x, stick.y); while (Date.now() - t0 < 12000) { const st = await S(); const dx = x - st.p[0], dz = z - st.p[2], dd = Math.hypot(dx, dz); if (dd < 3.2) break; const fx = -Math.sin(st.yaw), fz = -Math.cos(st.yaw), rx = Math.cos(st.yaw), rz = -Math.sin(st.yaw); const f = (dx * fx + dz * fz) / dd, r = (dx * rx + dz * rz) / dd; await move(sid, stick.x + r * 50, stick.y - f * 50); await sleep(80); } await up(sid); };
  await walkTo(bloom[0], bloom[2]);
  for (let i = 0; i < 25; i++) { const info = await page.evaluate((b) => { const g = __game; return { d: Math.hypot(g.tools.aim.point.x - b[0], g.tools.aim.point.z - b[2]), yaw: g.rig.yaw, want: Math.atan2(b[0] - g.rig.camera.position.x, b[2] - g.rig.camera.position.z) }; }, bloom); if (info.d < 1.2) break; const dd = await down(560, 120); const diff = Math.atan2(Math.sin(info.want - (info.yaw + Math.PI)), Math.cos(info.want - (info.yaw + Math.PI))); await move(dd, 560 + Math.sign(diff) * -30, 120); await move(dd, 560 + Math.sign(diff) * -60, 120); await up(dd); await sleep(250); }
  const aimD = await page.evaluate((b) => Math.hypot(__game.tools.aim.point.x - b[0], __game.tools.aim.point.z - b[2]), bloom);
  const useId = await holdSel('#bUse'); const side = await down(560, 150); await move(side, 540, 150); await sleep(300); const rainS = await S(); // two fingers at once: USE + camera drag
  await sleep(5000); const w = await page.evaluate(() => ({ water: __game.world.blooms.map((b) => +b.water.toFixed(2)), rain: __game.world.fenCloud.raining, held: __game.tools.held?.id, moist: __game.world.fenCloud.moisture })); await shot(page, 'docs/screenshots/mobile-02-use-rain.png'); await up(side); await up(useId); await sleep(300);
  check('USE (held, multi-touch with camera finger) makes held cloud rain', w.rain > 0.3, JSON.stringify(w) + ' aimErr=' + aimD.toFixed(2));
  check('rain from touch controls waters a Lanternbloom', Math.max(...w.water) > 0.1, JSON.stringify(w.water));
  // USE with wind
  await tapSel('.tool[data-i="2"]'); const u2 = await holdSel('#bUse'); await sleep(500); const g1 = (await S()).gust; await up(u2); check('USE with Wind tool blows a gust', g1 > 0.5, 'gust=' + g1.toFixed(2));
  // Talk button -> Fen bark
  await tapSel('#bTalk'); await sleep(400); const barks = await page.evaluate(() => document.querySelectorAll('#barks .bark').length); check('Talk button makes Fen speak', barks > 0, 'barks=' + barks);
  check('no console errors', logs.length === 0, logs.slice(0, 3).join(' | '));
  const bad = results.filter((r) => !r.ok); console.log(bad.length ? 'RESULT: ' + bad.length + ' FAILED' : 'RESULT: ALL ' + results.length + ' CHECKS PASSED');
  await browser.close(); process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error('TEST CRASH', e); process.exit(2); });
