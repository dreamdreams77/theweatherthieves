(() => { const g = __game; g.begin(false); g.ui.dlg.lines = []; g.ui.endDialogue(); g.sim(1); g.renderOnce(); const a = g.renderer.info.render; const res = { total: [a.calls, Math.round(a.triangles / 1000) + 'k tris'] };
  g.sun.castShadow = false; g.renderer.info.reset(); g.renderOnce(); const b = g.renderer.info.render; res.noShadow = [b.calls, Math.round(b.triangles / 1000) + 'k']; g.sun.castShadow = true;
  g.renderer.info.reset(); g.renderOnce(); res.again = g.renderer.info.render.calls; return res; })()
