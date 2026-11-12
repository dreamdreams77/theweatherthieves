import * as THREE from 'three';
import { Progress } from './Progress.js';

/** The Weather Almanac: every weather combination the player can discover, plus behaviour tracking for NPC reactions. */
export const ALMANAC = {
  rainbow: { name: 'Rainbow', desc: 'Sunlight bounced through falling rain paints the sky.', hint: 'Sun + Rain' },
  sunshower: { name: 'Sunshower', desc: 'Sunlight through Drizzle gave Fen his very own rainbow. He pretended not to notice.', hint: 'Sun + someone’s personal cloud' },
  hail: { name: 'Hail', desc: 'Frost breathed into a rain shower turns the drops into bouncing ice pebbles.', hint: 'Frost + Rain' },
  skate: { name: 'Skating Pond', desc: 'Frost turns still water into a floor. Fen calls it “water with ambition”.', hint: 'Frost + a pond' },
  fog: { name: 'Fog', desc: 'A cloud stretched thin and held low becomes fog — and fog shows what is hidden.', hint: 'Stretch a cloud, hold it low' },
  iceslide: { name: 'Ice Slide', desc: 'Rain-soaked umbrellas, frozen solid: official village transport.', hint: 'Rain + Frost on umbrellas' },
  blizzard: { name: 'Blizzard', desc: 'Wind and snow together can push what neither can alone.', hint: 'Snow + Wind' },
  snowglobe: { name: 'Snow Globe', desc: 'A blizzard over a warm spring makes the forest swirl in a bubble.', hint: 'Blizzard + warm spring' },
  charge: { name: 'Thunder Charge', desc: 'Squash a cloud until it crackles; lightning loves copper.', hint: 'Squash a cloud over a rod' },
  disco: { name: 'Disco Storm', desc: 'Charge + rain + wind: the whole factory dances.', hint: 'Charged rain + Wind' },
};
const FEN_COMBO = { hail: 'Ow. Ow. Ice. From the sky. I am personally offended.', sunshower: '...Is that a rainbow? Over ME? Do not look at it, Juno, you will encourage it.', rainbow: 'A rainbow. I suppose it is... acceptable.', skate: 'Water with ambition. I disapprove of ambition.', blizzard: 'Snow AND wind. Finally, weather with commitment.' };
const _v = new THREE.Vector3(), _w = new THREE.Vector3();
export class Combos {
  constructor(game) { this.game = game; this.hailT = 0; this.rbMesh = null; this.k = 0; }
  has(id) { return (Progress.data.almanac || []).includes(id); }
  discover(id) {
    const a = (Progress.data.almanac ??= []); if (a.includes(id) || !ALMANAC[id]) return false; a.push(id); Progress.save();
    const g = this.game; g.ui.toast('Weather Almanac — new combination: ' + ALMANAC[id].name + '! ' + ALMANAC[id].desc, 6500); g.audio.sfx('bloom'); g.ui.refreshMemories?.(); if (FEN_COMBO[id]) g.say?.fen(FEN_COMBO[id], 4200); return true;
  }
  style() { return (Progress.data.flags ??= {}); }
  update(dt) {
    const g = this.game, w = g.weather, T = g.tools, st = this.style();
    // behaviour tracking (how the player treats the weather) -> NPC reactions
    if (T.usingRain && T.held) { st.rainSec = (st.rainSec || 0) + dt; if (g.chapterNo === 2) { st.rainSec2 = (st.rainSec2 || 0) + dt; if (st.rainSec2 > 60 && !st.flooded) { st.flooded = true; Progress.save(); } } if (T.held.stretch > 1.4) { st.gentleSec = (st.gentleSec || 0) + dt; if (st.gentleSec > 8 && !st.gentle) { st.gentle = true; Progress.save(); } } }
    if (T.held && T.held.stretchT < 0.7 && !T.held._sq) { T.held._sq = true; st.squashed = (st.squashed || 0) + 1; } if (T.held && T.held.stretchT >= 0.9) T.held._sq = false;
    // hail: frost breath through a rain column
    let hail = null; if (w.frost.power > 0.5) for (const c of w.clouds) { if (c.raining < 0.25 || c.precip === 'snow') continue; for (let s = 1; s <= w.frost.range; s += 1) { _v.copy(w.frost.origin).addScaledVector(w.frost.dir, s); if (_v.y < c.pos.y && Math.hypot(_v.x - c.pos.x, _v.z - c.pos.z) < c.footprint + 0.6) { hail = c; break; } } if (hail) break; }
    if (hail) { this.hailT += dt; if (Math.random() < dt * 30) { _v.set(hail.pos.x + (Math.random() - 0.5) * hail.footprint * 1.6, hail.pos.y - 0.6, hail.pos.z + (Math.random() - 0.5) * hail.footprint * 1.6); w.sparks.spawn(_v, _w.set((Math.random() - 0.5) * 2, -6, (Math.random() - 0.5) * 2), { life: 1.2, size: 1.3, color: 0xe8f6ff, g: 9 }); } if (this.hailT > 0.8) this.discover('hail'); } else this.hailT = 0;
    // rainbow / sunshower: a sun beam crossing a raining cloud's column
    let rb = null, personal = false; for (const b of w.beams) { if (b.power < 0.5) continue; for (const c of w.clouds) { if (c.raining < 0.3 || c.precip === 'snow') continue; const tt = Math.max(0, Math.min(b.len, _v.subVectors(c.pos, b.o).dot(b.d))); _w.copy(b.o).addScaledVector(b.d, tt); if (_w.y < c.pos.y && _w.y > c.pos.y - 14 && Math.hypot(_w.x - c.pos.x, _w.z - c.pos.z) < c.footprint) { rb = _w.clone(); personal = !!c.personal; break; } } if (rb) break; }
    if (rb) { this.rbT = (this.rbT || 0) + dt; if (this.rbT > 0.6) { this.discover('rainbow'); if (personal) this.discover('sunshower'); } } else this.rbT = 0;
    // generic rainbow arc for chapters that do not draw their own
    if (!g.world.ownRainbow) { if (!this.rbMesh) this.makeRainbow(); this.k += ((rb ? 1 : 0) - this.k) * Math.min(1, dt * 1.5); this.rbMesh.visible = this.k > 0.01; this.rbMesh.children.forEach((m) => (m.material.opacity = this.k * 0.45)); if (rb) { this.rbMesh.position.lerp(rb.clone().add(new THREE.Vector3(0, -2, 0)), 0.2); this.rbMesh.rotation.y = Math.atan2(g.camera.position.x - rb.x, g.camera.position.z - rb.z) + Math.PI / 2; } } else if (this.rbMesh) this.rbMesh.visible = false;
  }
  makeRainbow() { const g = new THREE.Group(); [0xff4d4d, 0xff944d, 0xffe14d, 0x6fd96f, 0x4db8ff, 0x6a6aff, 0xb36bff].forEach((c, i) => g.add(new THREE.Mesh(new THREE.TorusGeometry(6 - i * 0.25, 0.14, 6, 48, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })))); this.game.scene.add(g); g.visible = false; this.rbMesh = g; }
}
