(() => { const g = __game; g.begin(false); g.ui.dlg.lines = []; g.ui.endDialogue(); g.sim(0.3); const w = g.world, T = g.tools, V = g.camera.position.constructor; const log = [];
  // fast-forward puzzle 1
  w.blooms.forEach((b) => { b.water = 1; b.bloomed = true; g.narr.onBloom(b); }); g.ui.dlg.lines = []; g.ui.endDialogue(); g.sim(5);
  g.player.pos.set(-27, w.B.heightAt(-27, -14), -14); g.sim(0.5); g.ui.dlg.lines = []; g.ui.endDialogue(); g.state = 'play'; g.player.locked = false;
  log.push(['shaded by', w.mirror.shaded?.name, 'lit', w.mirror.lit.toFixed(2)]);
  // grab Gertrude and move away
  T.grab(w.gertrude); g.ui.dlg.lines = []; g.ui.endDialogue(); g.state = 'play'; g.player.locked = false;
  g.debugAim = { point: new V(-20, w.B.heightAt(-20, -22), -22), hit: null, hitType: null, ground: true }; g.sim(4); T.drop(); g.sim(2);
  log.push(['after move shaded', w.mirror.shaded?.name || null, 'lit', w.mirror.lit.toFixed(2), 'gpos', w.gertrude.pos.toArray().map((x) => +x.toFixed(1))]);
  T.select(3); g.player.pos.set(-28, w.B.heightAt(-28, -20), -20); g.input.down = true; g.debugAim = { point: w.ice.pos.clone(), hit: null, hitType: null, ground: true }; g.sim(2); g.ui.dlg.lines = []; g.ui.endDialogue(); g.state = 'play'; g.player.locked = false; g.input.down = true; g.sim(12);
  log.push(['mirror yaw', w.mirror.yaw.toFixed(2), 'ice melt', w.ice.melt.toFixed(2), 'gate', w.gate.target]);
  g.input.down = false; g.sim(1); g.ui.dlg.lines = []; g.ui.endDialogue(); g.sim(4); log.push(['gate open', w.gate.open.toFixed(2), 'collider', w.iceCollider.enabled]); return log; })()
