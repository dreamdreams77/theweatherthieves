(() => { const g = __game; g.begin(false); g.ui.dlg.lines = []; g.ui.endDialogue(); g.sim(0.5);
  const w = g.world, T = g.tools; const V = g.camera.position.constructor; const b = w.blooms[0];
  g.player.pos.set(5, 0, -3); g.sim(0.5); T.grab(w.fenCloud); g.ui.dlg.lines = []; g.ui.endDialogue(); T.select(1); g.player.locked = false; g.state='play';
  g.input.down = true; g.debugAim = { point: new V(b.group.position.x, b.group.position.y, b.group.position.z), hit: null, hitType: null, ground: true }; g.sim(5);
  const c = w.fenCloud; return { cpos: c.pos.toArray(), target: c.target?.toArray(), raining: c.raining, rainOn: c.rainOn, held: c.held, bpos: b.pos.toArray(), rainAt: c.rainAt(b.pos.x, b.pos.y, b.pos.z), fp: c.footprint, state: g.state, locked: g.player.locked, tool: T.tool, regs: g.weather.reactives.length, inreg: g.weather.reactives.includes(b) }; })()
