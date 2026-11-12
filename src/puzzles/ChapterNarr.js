import * as THREE from 'three';
import { Progress } from '../core/Progress.js';
import { MEMORY_DB } from '../ui/memories.js';
const pick = (a) => a[(Math.random() * a.length) | 0];

/** Shared story/state helper for chapters 2-4: flags, memories, objectives, hints, NPC dialogue selection, behaviour tracking. */
export class ChapterNarr {
  constructor(game, no) {
    this.game = game; this.no = no; this.flags = { intro: false, freed: false }; this.cool_ = {}; this.t = 0; this.glints = new Set(); this.hintT = 0; this.step = ''; this.finale = null;
    this.style = Progress.data.flags; // gentle / flooded / squashed behaviour flags persist across chapters
  }
  cd(k, s) { if ((this.cool_[k] ?? -99) > this.t) return false; this.cool_[k] = this.t + s; return true; }
  cool(k, s) { return this.cd(k, s); }
  say(lines, opts) { this.game.dialogue(lines, opts); }
  init() { this.game.ui.setGlints(Progress.data.memories.filter((x) => x.startsWith('c' + this.no)).length); for (const gl of this.game.world.glints || []) if (Progress.hasMemory(gl.id)) { gl.got = true; gl.group.visible = false; } }
  /** re-apply saved puzzle progress to the freshly built world (overridden per chapter) */
  applySaved() {}
  stepChanged() { this.hintT = 0; this.save(); }
  save() { Progress.data.flags['ch' + this.no] = { ...this.flags }; Progress.save(); }
  restore() { const f = Progress.data.flags['ch' + this.no]; if (f) Object.assign(this.flags, f); }
  reset() {}
  onJar() {}
  onGrab(c) { if (c.stretchT < 0.7) this.style.squashed = (this.style.squashed || 0) + 1; }
  memory(id) {
    if (Progress.addMemory(id)) { const m = MEMORY_DB[id]; this.game.ui.toast('Weather memory found: ' + (m?.title || 'a memory') + ' — ' + (m?.text || ''), 7000); this.game.audio.sfx('glint'); this.game.ui.setGlints(Progress.data.memories.filter((x) => x.startsWith('c' + this.no)).length); this.game.ui.refreshMemories?.(); }
  }
  glintCollect(gl) {
    if (gl.got) return; gl.got = true; gl.group.visible = false; this.glints.add(gl.id); this.game.weather.burst(gl.pos, 0x9fe8ff, 20, 3, 1.2); this.game.player.setExpr('love', 1.2); this.game.player.juno.play('cheer'); this.memory(gl.id); this.save();
  }
  /** NPC dialogue: npc.spec.talk(ctx) returns an array of lines (or a string). ctx exposes flags and behaviour style. */
  npcLines(npc) {
    const ctx = { ch: this.no, f: this.flags, style: this.style, memories: Progress.data.memories.length, rain: npc.rain, n: (npc.talkCount = (npc.talkCount || 0) + 1) };
    const out = npc.spec.talk ? npc.spec.talk(ctx, this) : ['...'];
    return (Array.isArray(out) ? out : [out]).map((t) => ({ who: npc.id, text: t, ex: npc.spec.talkEx || 'happy' }));
  }
  updateCommon(dt, t) {
    this.t = t; const g = this.game, w = g.world, p = g.player;
    for (const gl of w.glints) { if (gl.got) continue; if (Math.hypot(p.pos.x - gl.pos.x, p.pos.z - gl.pos.z) < 1.8 && Math.abs(p.pos.y + 0.8 - gl.pos.y) < 2.6) this.glintCollect(gl); }
    if (g.state === 'play' && this.hints && this.hints[this.step]) { this.hintT += dt; if (this.hintT > 55) { this.hintT = -45; g.ui.toast(this.hints[this.step], 7000); } }
    if (g.state === 'play' && this.cd('fenIdle', 60)) { const c = g.companion; if (Math.hypot(c.pos.x - p.pos.x, c.pos.z - p.pos.z) < 8 && this.fenIdle) g.say.fen(pick(this.fenIdle)); }
  }
  update(dt, t) { this.updateCommon(dt, t); }
}
