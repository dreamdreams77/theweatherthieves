// "Thumb bot": plays the game ONLY through real touch input on a phone-sized screen (CDP touch events):
// walks with the on-screen joystick, aims by dragging the camera so the touch reticle lands on the target,
// and presses the real USE / Jump / Talk / +/- / tool buttons. Page state is only read (to decide what a player would do).
const { sleep } = require('./lib.cjs');
async function thumb(page, ctx) {
  const cdp = await ctx.newCDPSession(page); const active = new Map(); let nid = 1;
  const send = (type) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: [...active.values()].map((t) => ({ x: t.x, y: t.y, id: t.id })) });
  const down = async (x, y) => { const id = nid++; active.set(id, { x, y, id }); await send('touchStart'); return id; };
  const move = async (id, x, y) => { const t = active.get(id); if (!t) return; t.x = x; t.y = y; await send('touchMove'); };
  const up = async (id) => { if (!active.has(id)) return; active.delete(id); await send('touchEnd'); };
  const ev = (f, a) => page.evaluate(f, a);
  const center = (sel) => ev((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
  const tap = async (x, y) => { const id = await down(x, y); await sleep(70); await up(id); };
  const tapSel = async (sel) => { const c = await center(sel); await tap(c.x, c.y); await sleep(150); };
  const S = () => ev(() => { const g = __game; return { p: g.player.pos.toArray(), yaw: g.rig.yaw, dlg: g.ui.dlg.active, st: g.state, held: g.tools.held?.id || null, tool: g.tools.tool }; });
  const flush = async () => { for (let i = 0; i < 60 && (await ev(() => __game.ui.dlg.active)); i++) { const c = await center('#dlg'); await tap(c.x, c.y); await sleep(160); } };
  const proj = (pt) => ev((p) => { const g = __game, v = new g.camera.position.constructor(...p).project(g.camera); return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight, z: v.z, nx: v.x, ny: v.y }; }, pt);
  const reticle = () => ev(() => { const r = __game.tools.reticle; return { x: (r.x * 0.5 + 0.5) * innerWidth, y: (-r.y * 0.5 + 0.5) * innerHeight }; });
  const W = () => ev(() => [innerWidth, innerHeight]);
  // --- camera drag on open screen space (upper middle), sign-calibrated once
  let sx = 0, sy = 0; const dragCam = async (dx, dy) => { const [w, h] = await W(); const x0 = w * 0.5, y0 = h * 0.42; const id = await down(x0, y0); const n = 5; for (let i = 1; i <= n; i++) { await move(id, x0 + (dx * i) / n, y0 + (dy * i) / n); await sleep(30); } await up(id); await sleep(80); };
  const calibrate = async () => { const a = await ev(() => [__game.rig.yaw, __game.rig.pitch]); await dragCam(60, 0); await sleep(150); const b = await ev(() => [__game.rig.yaw, __game.rig.pitch]); await dragCam(-60, 0); await dragCam(0, 40); await sleep(150); const c = await ev(() => [__game.rig.yaw, __game.rig.pitch]); await dragCam(0, -40); sx = (b[0] - a[0]) / 60; sy = (c[1] - b[1]) / 40; return { sx, sy }; };
  // aim: rotate the camera until the reticle sits on pt (screen-space error -> drag)
  const aimErr = (pt) => ev((p) => { const a = __game.tools.aim.point; return Math.hypot(a.x - p[0], a.z - p[2]); }, pt);
  const aimAt = async (pt, tol = 0.6, tries = 18) => { let prev = null; for (let i = 0; i < tries; i++) { await sleep(220); const s = await proj(pt), r = await reticle(), e = await aimErr(pt);
      if (process.env.DBG) console.log('    aim', i, JSON.stringify({ pt: pt.map((x) => +x.toFixed(1)), s: [s.x | 0, s.y | 0, +s.z.toFixed(2)], r: [r.x | 0, r.y | 0], err: +e.toFixed(2) }));
      if (s.z < 1 && (e < tol || Math.hypot(s.x - r.x, s.y - r.y) < 3)) return true;
      if (prev && Math.hypot(prev.x - s.x, prev.y - s.y) < 1.5 && s.z < 1) return e < 1.6; prev = s; // camera at its tilt limit: as close as it gets
      const st = await ev(() => [__game.rig.yaw, __game.rig.pitch, __game.camera.fov, innerHeight]); let dyaw, dpitch;
      if (s.z >= 1 || Math.abs(s.nx) > 1.3) { const me = await S(); const want = Math.atan2(-(pt[0] - me.p[0]), -(pt[2] - me.p[2])); dyaw = Math.atan2(Math.sin(want - st[0]), Math.cos(want - st[0])); dpitch = 0; }
      else { const radPerPx = (st[2] * Math.PI / 180) / st[3]; dyaw = -(s.x - r.x) * radPerPx; dpitch = (s.y - r.y) * radPerPx; }
      const px = sx ? Math.max(-220, Math.min(220, dyaw / sx)) : 0, py = sy ? Math.max(-160, Math.min(160, dpitch / sy)) : 0; await dragCam(px, py); } return false; };
  // walk with the joystick toward (x,z); jumps when blocked
  let stickId = null, stickC = null; const stickRelease = async () => { if (stickId) { await up(stickId); stickId = null; } };
  const walkTo = async (x, z, tol = 1.3, timeout = 45000, stopIf = null) => { const t0 = Date.now(); let last = null, lastT = Date.now(); stickC = await center('#stick');
    while (Date.now() - t0 < timeout) { if (await ev(() => __game.ui.dlg.active)) { await stickRelease(); await flush(); }
      const st = await S(), dx = x - st.p[0], dz = z - st.p[2], d = Math.hypot(dx, dz); if (d < tol || (stopIf && (await ev(stopIf)))) { await stickRelease(); return true; }
      const fx = -Math.sin(st.yaw), fz = -Math.cos(st.yaw), rx = Math.cos(st.yaw), rz = -Math.sin(st.yaw), f = (dx * fx + dz * fz) / d, r = (dx * rx + dz * rz) / d; const R = 44 * (d < 3 ? 0.6 : 1);
      if (!stickId) stickId = await down(stickC.x, stickC.y); await move(stickId, stickC.x + r * R, stickC.y - f * R);
      if (last && Math.hypot(st.p[0] - last[0], st.p[2] - last[2]) < 0.25 && Date.now() - lastT > 1400) { await tapSel('#bJump'); lastT = Date.now(); last = null; } else if (!last || Date.now() - lastT > 1400) { last = st.p; lastT = Date.now(); }
      await sleep(70); }
    await stickRelease(); return false; };
  // hold the real USE button while keeping the reticle on pt, until cond() or timeout
  const holdUse = async (pt, cond, ms, arg) => { const t0 = Date.now(); if (pt) await aimAt(pt); const c = await center('#bUse'); let id = await down(c.x, c.y);
    while (Date.now() - t0 < ms) { if (await ev(cond, arg)) break; if (await ev(() => __game.ui.dlg.active)) { await up(id); await flush(); id = await down(c.x, c.y); } if (process.env.DBG && Date.now() % 2000 < 130) console.log('    hold', JSON.stringify(await ev(() => { const g = __game, c = g.tools.held, a = g.tools.aim, r = (v) => v && v.toArray().map((x) => +x.toFixed(1)); return { aim: r(a.point), ht: a.hitType, cl: c && r(c.pos), m: c && +c.moisture.toFixed(2), rain: c && +c.raining.toFixed(2), useHeld: g.input.useHeld, tool: g.tools.tool, st: g.state, lk: g.player.locked }; })));
      if (pt) { const s = await proj(pt), r = await reticle(); if ((await aimErr(pt)) > 2.0) { await up(id); await aimAt(pt); id = await down(c.x, c.y); } } await sleep(120); }
    await up(id); await sleep(80); return ev(cond, arg); };
  const holdBtn = async (sel, ms) => { const c = await center(sel); const id = await down(c.x, c.y); await sleep(ms); await up(id); };
  const tool = (i) => tapSel(`.tool[data-i="${i}"]`);
  // grab a cloud: Cloud tool, then tap the cloud on screen (turn the camera first if it is off-screen)
  const grabCloud = async (id) => { await tool(0); for (let i = 0; i < 8; i++) { const cp = await ev((id) => __game.weather.clouds.find((c) => c.id === id)?.pos.toArray(), id); let s = await proj(cp);
      if (!(s.z < 1 && Math.abs(s.nx) < 0.45 && s.ny > -0.2 && s.ny < 0.7)) { await aimAt(cp, 0.5, 6); s = await proj(cp); } // keep clear of the toolbar, stick and buttons
      if (process.env.DBG) console.log('    grab', id, JSON.stringify({ cp: cp.map((x) => +x.toFixed(1)), s: [s.x | 0, s.y | 0, +s.z.toFixed(2)] }));
      await tap(s.x, s.y); await sleep(300); if ((await S()).held === id) return true; } return false; };
  const until = async (fn, ms, every = 150, arg) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(() => __game.ui.dlg.active)) await flush(); if (await ev(fn, arg)) return true; await sleep(every); } return false; };
  // a standing spot on open ground from which the target is in plain view (what a player would pick by looking around)
  const viewSpot = (pt, rMin = 5, rMax = 13, sameLevel = false) => ev(([pt, rMin, rMax, sameLevel]) => { const g = __game, T = g.terrain, me = g.player.pos; let best = null;
      for (let r = rMin; r <= rMax; r += 1) for (let a = 0; a < 24; a++) { const th = (a / 24) * Math.PI * 2, x = pt[0] + Math.cos(th) * r, z = pt[2] + Math.sin(th) * r, gy = T.topAt(x, z); if (!(gy > -50)) continue; if (sameLevel && Math.abs(gy - me.y) > 0.6) continue;
        if (T.colliders.some((c) => c.enabled !== false && Math.hypot(c.x - x, c.z - z) < c.r + 0.8)) continue; const ey = gy + 1.6; let clear = true;
        for (let k = 1; k < 20; k++) { const f = k / 20, sx = x + (pt[0] - x) * f, sz = z + (pt[2] - z) * f, sy = ey + (pt[1] + 0.4 - ey) * f; if (T.topAt(sx, sz) > sy + 0.05) { clear = false; break; } }
        if (!clear) continue; const cost = Math.abs(gy - me.y) * 12 + Math.hypot(x - me.x, z - me.z) * 0.2 + Math.abs(r - (8 + Math.max(0, pt[1] - gy) * 1.2)); if (!best || cost < best[2]) best = [x, z, cost, gy]; }
      return best; }, [pt, rMin, rMax, sameLevel]);
  const surf = (pt) => ev((p) => [p[0], __game.terrain.topAt(p[0], p[2]), p[2]], pt); // the walkable/roof surface right under a point
  return { surf, viewSpot, down, move, up, tap, tapSel, center, S, flush, proj, aimAt, walkTo, holdUse, holdBtn, tool, grabCloud, calibrate, until, ev, stickRelease };
}
module.exports = { thumb };
