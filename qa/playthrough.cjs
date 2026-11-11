// Plays Chapter 1 start to finish with REAL keyboard + mouse events only. Page state is read (never written) to decide what to do.
const { sleep, launch, check, results, shot } = require('./lib.cjs');
(async () => {
  const { browser, page, logs } = await launch({ w: 1280, h: 720 });
  const ev = (f, a) => page.evaluate(f, a);
  const S = () => ev(() => { const g = __game, w = g.world, f = g.narr.flags; return { p: g.player.pos.toArray(), yaw: g.rig.yaw, state: g.state, dlg: g.ui.dlg.active, f: { ...f }, held: g.tools.held?.id || null, tool: g.tools.tool, fenCloud: w.fenCloud.pos.toArray() }; });
  const keys = new Set();
  const setKeys = async (want) => { for (const k of [...keys]) if (!want.has(k)) { await page.keyboard.up(k); keys.delete(k); } for (const k of want) if (!keys.has(k)) { await page.keyboard.down(k); keys.add(k); } };
  const flush = async () => { for (let i = 0; i < 40; i++) { const d = await ev(() => __game.ui.dlg.active); if (!d) return i; await page.keyboard.press('Enter'); await sleep(120); } return 40; };
  const press = async (k) => { await page.keyboard.press(k); await sleep(60); };
  const proj = (pt) => ev((p) => { const g = __game, V = g.camera.position.constructor; const v = new V(...p).project(g.camera); return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight, vis: v.z < 1 && Math.abs(v.x) < 0.92 && Math.abs(v.y) < 0.85 }; }, pt);
  const ground = (x, z, dy = 0) => ev(([x, z, dy]) => [x, __game.terrain.topAt(x, z) + dy, z], [x, z, dy]);
  // rotate camera with a real right-button drag until the point is on screen
  const faceCamera = async (pt) => { for (let i = 0; i < 16; i++) { const s = await proj(pt); if (s.vis) return s; const st = await S(); const bx = pt[0] - st.p[0], bz = pt[2] - st.p[2]; const want = Math.atan2(-bx, -bz); let d = Math.atan2(Math.sin(want - st.yaw), Math.cos(want - st.yaw));
      const v = await ev((pt) => { const g = __game, V = g.camera.position.constructor; return new V(...pt).project(g.camera).y; }, pt);
      await page.mouse.move(640, 360); await page.mouse.down({ button: 'right' }); await page.mouse.move(640 - (Math.abs(d) > 0.9 ? Math.sign(d) * 90 : 0), 360 + (v > 0.85 ? 70 : v < -0.85 ? -70 : 0), { steps: 4 }); await page.mouse.up({ button: 'right' }); await sleep(150); } return proj(pt); };
  const walkTo = async (x, z, tol = 1.3, timeout = 40000) => { const t0 = Date.now(); let last = null, lastT = Date.now(); while (Date.now() - t0 < timeout) { if (await ev(() => __game.ui.dlg.active)) { await setKeys(new Set()); await flush(); }
      const st = await S(), dx = x - st.p[0], dz = z - st.p[2], d = Math.hypot(dx, dz); if (d < tol) { await setKeys(new Set()); return true; }
      const fx = -Math.sin(st.yaw), fz = -Math.cos(st.yaw), rx = Math.cos(st.yaw), rz = -Math.sin(st.yaw), f = (dx * fx + dz * fz) / d, r = (dx * rx + dz * rz) / d; const want = new Set(); if (f > 0.35) want.add('KeyW'); if (f < -0.35) want.add('KeyS'); if (r > 0.35) want.add('KeyD'); if (r < -0.35) want.add('KeyA');
      if (last && Math.hypot(st.p[0] - last[0], st.p[2] - last[2]) < 0.25 && Date.now() - lastT > 1500) { want.add('Space'); lastT = Date.now(); last = null; } else if (!last || Date.now() - lastT > 1500) { last = st.p; lastT = Date.now(); }
      await setKeys(want); await sleep(60); } await setKeys(new Set()); if (process.env.DBG) console.log('walk timeout', x, z, JSON.stringify((await S()).p)); return false; };
  const until = async (fn, ms, every = 100) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(() => __game.ui.dlg.active)) await flush(); if (await ev(fn)) return true; await sleep(every); } return false; };
  const holdAt = async (pt, cond, ms, btn = 'left') => { const t0 = Date.now(); let s = await faceCamera(pt); await page.mouse.move(s.x, s.y); await page.mouse.down(); while (Date.now() - t0 < ms) { if (await ev(() => __game.ui.dlg.active)) { await page.mouse.up(); await flush(); await page.mouse.down(); } s = await proj(pt); await page.mouse.move(s.x, s.y); if (await ev(cond)) break; await sleep(100); } await page.mouse.up(); return ev(cond); };
  const OUT = 'docs/screenshots/';

  // ---- 1. title -> Begin (real click), intro dialogue (real Enter)
  await page.click('#begin'); await sleep(400);
  const nLines = await flush(); check('intro dialogue played & advanced with keyboard', nLines > 6 && !(await ev(() => __game.ui.dlg.active)), 'lines advanced=' + nLines);
  await shot(page, OUT + 'play-01-intro-end.png');
  // movement + camera
  const p0 = (await S()).p; await setKeys(new Set(['KeyD', 'KeyW'])); await sleep(900); await setKeys(new Set()); const p1 = (await S()).p; check('WASD moves Juno', Math.hypot(p1[0] - p0[0], p1[2] - p0[2]) > 2, 'moved=' + Math.hypot(p1[0] - p0[0], p1[2] - p0[2]).toFixed(1));
  const y0 = (await S()).yaw; await page.mouse.move(640, 360); await page.mouse.down({ button: 'right' }); await page.mouse.move(740, 340, { steps: 5 }); await page.mouse.up({ button: 'right' }); await sleep(200); check('right-drag orbits camera', Math.abs((await S()).yaw - y0) > 0.2);
  const y1 = (await ev(() => __game.player.pos.y)); await press('Space'); await sleep(250); const y2 = await ev(() => __game.player.pos.y); check('Space jumps', y2 > y1 + 0.3, 'dy=' + (y2 - y1).toFixed(2));
  await sleep(900);
  if (process.env.START === 'meadow') { // DEBUG ONLY: skip to the Meadow by teleport (never used for the real verification run)
    await ev(() => { const g = __game, w = g.world; w.blooms.forEach((b) => { b.water = 1; b.bloomed = true; g.narr.onBloom(b); }); g.player.pos.set(-27, w.B.heightAt(-27, -14), -14); g.player.safe.copy(g.player.pos); g.narr.flags.visitedB = true; g.companion.pos.set(-25, w.B.heightAt(-25, -13), -13); });
    await sleep(1500); await flush();
  } else {
  // ---- 2. puzzle 1: grab Fen's cloud with the mouse, rain on blooms
  await press('Digit1'); let c = await faceCamera(((await S()).fenCloud)); await page.mouse.move(c.x, c.y); await sleep(150); await page.mouse.down(); await sleep(80); await page.mouse.up(); await sleep(400);
  check('clicked cloud is picked up (Cloud tool)', (await S()).held === 'fen', 'held=' + (await S()).held); await flush();
  await press('Digit2'); check('key 2 selects Rain', (await S()).tool === 'rain');
  const blooms = await ev(() => __game.world.blooms.map((b) => b.group.position.toArray()));
  await walkTo(6, -3, 2.5);
  const nowW = () => ev(() => __game.world.blooms.map((b) => +b.water.toFixed(2)));
  // stretch the cloud with the wheel to confirm squash/stretch works
  const s0 = await ev(() => __game.tools.held.stretchT); await page.mouse.move(640, 300); await page.mouse.wheel(0, -300); await sleep(300); const s1 = await ev(() => __game.tools.held.stretchT); check('mouse wheel stretches held cloud', Math.abs(s1 - s0) > 0.05, s0.toFixed(2) + '->' + s1.toFixed(2));
  for (let i = 0; i < 3; i++) { const g = await ground(blooms[i][0], blooms[i][2]); await holdAt(g, (() => `__game.world.blooms[${i}].bloomed`) ? new Function(`return __game.world.blooms[${i}].bloomed`) : null, 30000); }
  check('three Lanternblooms watered by hand', (await S()).f.bloom === 3, JSON.stringify(await nowW()));
  await shot(page, OUT + 'play-02-blooms.png');
  await until(() => __game.world.bridge1.surface.enabled, 15000); check('Skyroad bridge unfurled', await ev(() => __game.world.bridge1.surface.enabled)); await flush();
  // drop the cloud (click it with Cloud tool)
  await press('Digit1'); for (let i = 0; i < 6 && (await S()).held; i++) { await flush(); await sleep(400); await flush(); const gx = await ground(...(await ev(() => { const p = __game.player.pos; return [p.x - 2, p.z - 2]; }))); c = await faceCamera(gx); await page.mouse.move(c.x, c.y); await sleep(150); await page.mouse.down(); await sleep(60); await page.mouse.up(); await sleep(400); } check('cloud released', (await S()).held === null);
  // ---- 3. cross to Meadow
  const br = await ev(() => { const b = __game.world.bridge1.surface; return [b.a.toArray(), b.b.toArray()]; });
  check('reached bridge', await walkTo(br[0][0], br[0][2], 1.2)); check('crossed bridge', await walkTo(br[1][0], br[1][2], 1.2)); await walkTo(-27, -14, 1.8);
  await until(() => __game.narr.flags.visitedB, 3000); await flush(); check('arrived Mirror Meadow', (await S()).f.visitedB);
  await shot(page, OUT + 'play-03-meadow.png');
  }
  // ---- 4. puzzle 2: move Gertrude, aim mirror, melt ice
  await flush(); await press('Digit1'); const gp = () => ev(() => __game.world.gertrude.pos.toArray()); for (let i = 0; i < 5 && (await S()).held !== 'gertrude'; i++) { await flush(); c = await faceCamera(await gp()); await page.mouse.move(c.x, c.y); await sleep(350); await page.mouse.down(); await sleep(60); await page.mouse.up(); await sleep(400); if (process.env.DBG) console.log('dbg', JSON.stringify(await ev(() => { const g = __game, a = g.tools.aim; return { type: a.hitType, hit: a.hit?.id || a.hit?.name, held: g.tools.held?.id, tool: g.tools.tool, state: g.state, locked: g.player.locked, dlg: g.ui.dlg.active, ptr: g.input.pointer.toArray(), clouds: g.weather.clouds.map((c) => c.id + ':' + c.pos.toArray().map((x) => x.toFixed(1)).join(',')) }; })), JSON.stringify(c)); }
  check('Gertrude grabbed', (await S()).held === 'gertrude'); await flush();
  const away = await ground(-36, -10); c = await faceCamera(away); await page.mouse.move(c.x, c.y, { steps: 6 }); await sleep(3500);
  c = await faceCamera(await gp()); await page.mouse.move(c.x, c.y); await sleep(150); await page.mouse.down(); await sleep(60); await page.mouse.up(); await sleep(400);
  check('mirror unshaded after moving Gertrude', await ev(() => __game.world.mirror.shaded === null && __game.world.mirror.lit > 0.8), 'lit=' + (await ev(() => __game.world.mirror.lit)).toFixed(2));
  await flush(); await press('Digit4'); const ice = await ev(() => { const i = __game.world.ice.pos; return [i.x, i.y - 1.4, i.z]; }); // aim at the ice's base on the ground, like a player would
  await holdAt(ice, () => __game.world.ice.melt >= 1, 45000); check('ice melted with sunlight (Sun tool + mouse)', await ev(() => __game.world.ice.melt >= 1), 'melt=' + (await ev(() => __game.world.ice.melt)).toFixed(2));
  await until(() => __game.world.gate.open > 0.9, 8000); await flush(); await shot(page, OUT + 'play-04-sun-gate-open.png'); check('Sun Gate open', await ev(() => __game.world.gate.open > 0.9));
  // ---- 5. to Windmill Rise
  const gate = await ev(() => { const g = __game.world.gate; return g.pos.toArray(); });
  await walkTo(gate[0] - 0.466 * 5, gate[2] + 0.885 * 5, 1.5); await walkTo(gate[0] + 0.466 * 3, gate[2] - 0.885 * 3, 1.5);
  const b2 = await ev(() => { const b = __game.world.bridge2.surface; return [b.a.toArray(), b.b.toArray()]; }); await walkTo(b2[0][0], b2[0][2], 1.2); await walkTo(b2[1][0], b2[1][2], 1.2); await walkTo(-18, -50, 2);
  await until(() => __game.narr.flags.visitedC, 4000); await flush(); check('arrived Windmill Rise', (await S()).f.visitedC);
  // ---- 6. puzzle 3: wind crates onto plates, freeze, blow sails
  for (let k = 0; k < 2; k++) {
    const gs = () => ev((k) => { const w = __game.world; return { c: w.crates[k].pos.toArray(), p: w.plates[k].pos.toArray(), on: w.plates[k].on }; }, k);
    for (let i = 0; i < 40; i++) { let q = await gs(); const dx = q.p[0] - q.c[0], dz = q.p[2] - q.c[2], d = Math.hypot(dx, dz); if (d < 0.55) break;
      await press('Digit3'); const sx = q.c[0] - dx / d * 3, sz = q.c[2] - dz / d * 3; await walkTo(sx, sz, 0.8, 15000);
      const tgt = await ground(q.p[0], q.p[2]); const s = await faceCamera(tgt); await page.mouse.move(s.x, s.y); await page.mouse.down(); const t0 = Date.now(); while (Date.now() - t0 < 2500) { q = await gs(); if (Math.hypot(q.p[0] - q.c[0], q.p[2] - q.c[2]) < 3.4) break; const s2 = await proj(tgt); await page.mouse.move(s2.x, s2.y); await sleep(80); } await page.mouse.up(); await sleep(900); }
    const q = await gs(); await press('Digit5'); const cs = await ground(q.c[0], q.c[2], 0.5); await walkTo(q.c[0] - 3, q.c[2], 1.0, 15000); await holdAt(cs, new Function(`return __game.world.crates[${k}].frozen>0.95`), 8000);
    check(`crate ${k + 1} on plate and frozen`, (await gs()).on && (await ev((k) => __game.world.crates[k].frozen > 0.9, k)));
  }
  await sleep(600); await flush(); check('both plates active, brake released', await ev(() => __game.narr.flags.plates && !__game.world.windmill.braked));
  await shot(page, OUT + 'play-05-plates.png');
  await walkTo(-16, -50.5, 1.2); await press('Digit3'); const hub = await ev(() => __game.world.hubReactive.pos.toArray());
  await holdAt(hub, () => __game.world.windmill.charge >= 0.995, 70000); check('windmill charged by blowing wind', await ev(() => __game.world.windmill.charge >= 0.99), 'charge=' + (await ev(() => __game.world.windmill.charge)).toFixed(2));
  check('plates stayed lit while blowing (crates frozen)', await ev(() => __game.world.plates.every((p) => p.on)));
  await flush();
  // ---- 7. lift to summit
  await walkTo(-4.5, -60, 1.0); await until(() => __game.world.lift.level > 0.97, 30000); check('lift raised with Juno aboard', await ev(() => __game.world.lift.level > 0.97 && __game.player.pos.y > 17), 'y=' + (await ev(() => __game.player.pos.y)).toFixed(1));
  const b3 = await ev(() => { const b = __game.world.bridge3.surface; return [b.a.toArray(), b.b.toArray()]; }); await walkTo(b3[0][0] + 0.3, b3[0][2], 1.0); await walkTo(b3[1][0], b3[1][2], 1.2); await walkTo(21, -62, 1.5);
  await until(() => __game.narr.flags.visitedD, 4000); await flush(); check('reached Jar Summit', (await S()).f.visitedD);
  await shot(page, OUT + 'play-06-summit.png');
  // ---- 8. finale
  await walkTo(22.5, -62, 1.0); await press('KeyF'); await sleep(600);
  check('finale started with F', await ev(() => __game.narr.flags.freed || !!__game.narr.finale));
  await until(() => document.querySelector('#end') && !document.querySelector('#end').classList.contains('hidden'), 90000, 200);
  check('end card shown after finale dialogue', await ev(() => !document.querySelector('#end').classList.contains('hidden')), await ev(() => document.getElementById('endStats').textContent));
  check('world restored (saturation + state)', await ev(() => __game.restore > 0.95 && __game.narr.flags.freed && __game.state === 'play'));
  await shot(page, OUT + 'play-07-finale-end-card.png');
  await page.click('#endClose'); await sleep(300); await shot(page, OUT + 'play-08-restored-world.png');
  check('no console errors during whole playthrough', logs.length === 0, logs.slice(0, 3).join(' | '));
  const bad = results.filter((r) => !r.ok); console.log(bad.length ? 'RESULT: ' + bad.length + ' FAILED' : 'RESULT: ALL ' + results.length + ' CHECKS PASSED');
  await browser.close(); process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error('TEST CRASH', e); process.exit(2); });
