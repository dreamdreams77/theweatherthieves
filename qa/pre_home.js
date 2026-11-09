(() => { const g = __game; g.begin(false); g.ui.dlg.lines = []; g.ui.endDialogue(); g.sim(0.5); const w = g.world, T = g.tools, V = g.camera.position.constructor;
  g.player.pos.set(4.5, w.H.heightAt(4.5,-1), -1); g.companion.pos.set(2.5, w.H.heightAt(2.5,0), 1); g.sim(0.5); T.grab(w.fenCloud); g.ui.dlg.lines=[]; g.ui.endDialogue(); T.select(1); g.player.locked=false; g.state='play';
  const b = w.blooms[0]; g.debugAim = { point: new V(b.group.position.x, b.group.position.y, b.group.position.z), hit: null, hitType: null, ground: true }; g.input.down = true; g.sim(4);
  g.rig.yaw = 0.9; g.rig.pitch = 0.22; g.rig.targetDist = 7.5; g.rig.dist = 7.5; g.sim(1.5); return 1; })()
