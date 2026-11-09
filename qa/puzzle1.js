(() => { const g = __game; g.begin(false); g.ui.dlg.lines = []; g.ui.endDialogue(); g.sim(0.5);
  const log = []; const w = g.world, T = g.tools; const V = g.camera.position.constructor;
  g.player.pos.set(5, 0, -3); g.player.vel.set(0,0,0); g.sim(0.5);
  T.grab(w.fenCloud); g.ui.dlg.lines = []; g.ui.endDialogue(); g.sim(0.2); T.select(1); g.player.locked = false; g.state='play';
  g.input.down = true;
  for (const b of w.blooms) { g.debugAim = { point: new V(b.group.position.x, b.group.position.y, b.group.position.z), hit: null, hitType: null, ground: true }; g.sim(9); log.push(b.water.toFixed(2)); }
  g.input.down = false; g.sim(1); log.push(['bloomed', g.narr.flags.bloom, 'p1', g.narr.flags.p1, 'moist', w.fenCloud.moisture.toFixed(2)]);
  g.ui.dlg.lines = []; g.ui.endDialogue(); g.sim(8); log.push(['bridge', w.bridge1.surface.enabled, w.bridgeGrow.t.toFixed(2)]);
  return log; })()
