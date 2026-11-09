(() => { const g = __game; g.begin(false); g.ui.dlg.lines = []; g.ui.endDialogue(); g.sim(0.3); const w = g.world, T = g.tools, V = g.camera.position.constructor; const log = [];
  const nd = () => { g.ui.dlg.lines = []; g.ui.endDialogue(); g.state = 'play'; g.player.locked = false; };
  w.blooms.forEach((b) => { b.water = 1; b.bloomed = true; g.narr.onBloom(b); }); nd(); g.narr.flags.melted = true; g.narr.flags.visitedB = true; g.narr.flags.visitedC = true; g.sim(1); nd();
  const place = (x, z) => { g.player.pos.set(x, w.C.heightAt(x, z), z); g.player.vel.set(0, 0, 0); };
  const aimAt = (v) => { g.debugAim = { point: v.clone(), hit: null, hitType: null, ground: true }; };
  for (let k = 0; k < 2; k++) {
    const crate = w.crates[k], plate = w.plates[k];
    for (let i = 0; i < 120 && Math.hypot(crate.pos.x - plate.pos.x, crate.pos.z - plate.pos.z) > 0.5; i++) {
      const dx = plate.pos.x - crate.pos.x, dz = plate.pos.z - crate.pos.z, d = Math.hypot(dx, dz);
      place(crate.pos.x - dx / d * 3, crate.pos.z - dz / d * 3); T.select(2); aimAt(plate.pos); g.input.down = d > 3.6; g.sim(0.25); nd();
    }
    g.input.down = false; place(crate.pos.x - 3, crate.pos.z); T.select(4); aimAt(crate.pos.clone().setY(crate.pos.y + 0.5)); g.input.down = true; g.sim(2); nd(); g.input.down = false; g.sim(0.3); nd();
    log.push(['crate', k, 'dist', Math.hypot(crate.pos.x - plate.pos.x, crate.pos.z - plate.pos.z).toFixed(2), 'frozen', crate.frozen.toFixed(2), 'plate', plate.on]);
  }
  g.sim(1); nd(); log.push(['plates flag', g.narr.flags.plates, 'braked', w.windmill.braked]);
  // blow the windmill from the south, in front of sails
  place(-16, -51.5); T.select(2); aimAt(w.hubReactive.pos.clone()); g.input.down = true; g.sim(30); nd(); g.input.down = true; g.sim(30);
  log.push(['charge', w.windmill.charge.toFixed(2), 'plates still', w.plates.map((p) => p.on), 'p3', g.narr.flags.p3, 'lift', w.lift.level.toFixed(2)]);
  g.input.down = false; g.sim(6); log.push(['lift', w.lift.level.toFixed(2), w.lift.group.position.y.toFixed(1)]);
  return log; })()
