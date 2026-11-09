(() => { const g = __game; g.begin(false); g.ui.dlg.lines = []; g.ui.endDialogue(); g.sim(0.3); const w = g.world, T = g.tools; const log = [];
  const nd = () => { g.ui.dlg.lines = []; g.ui.endDialogue(); g.state = 'play'; g.player.locked = false; };
  nd(); const crate = w.crates[0], plate = w.plates[0]; log.push(['start', crate.pos.toArray().map((x)=>+x.toFixed(1)), plate.pos.toArray().map((x)=>+x.toFixed(1))]);
  for (let i = 0; i < 12; i++) { const dx = plate.pos.x - crate.pos.x, dz = plate.pos.z - crate.pos.z, d = Math.hypot(dx, dz);
    g.player.pos.set(crate.pos.x - dx / d * 3, w.C.heightAt(crate.pos.x - dx / d * 3, crate.pos.z - dz / d * 3), crate.pos.z - dz / d * 3); T.select(2); g.debugAim = { point: plate.pos.clone(), hit: null, hitType: null, ground: true }; g.input.down = true; g.sim(0.25); nd();
    log.push([crate.pos.toArray().map((x)=>+x.toFixed(2)), 'v', crate.vel.length().toFixed(2), 'gust', g.weather.gust.power.toFixed(2), 'f', g.weather.force(crate.pos, 0.6).length().toFixed(1), 'state', g.state]); }
  return log; })()
