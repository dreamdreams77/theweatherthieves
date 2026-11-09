(() => { const g = __game; g.begin(false); g.ui.dlg.lines = []; g.ui.endDialogue(); g.sim(0.3); const w = g.world; const [x,z,isl,yaw,pitch,dist]=window.__v||[0,0,'H',0.5,0.25,8];
  const I = w[isl]; g.player.pos.set(x, I.heightAt(x,z), z); g.companion.pos.set(x+2, I.heightAt(x+2,z+1), z+1); g.sim(1);
  g.rig.yaw=yaw; g.rig.pitch=pitch; g.rig.targetDist=dist; g.rig.dist=dist; g.rig.snap(g.player.pos); g.sim(1); return 1; })()
