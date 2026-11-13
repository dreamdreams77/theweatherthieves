import * as THREE from 'three';
import { G } from './Mat.js';
import { Settings } from '../core/Settings.js';

/**
 * Claymation look (inspired by HollowTide's 2D clay renderer, rebuilt for 3D):
 *  - thumbprint whorls + kneaded micro-relief as a shader bump, with a little roughness variation (Mat.js)
 *  - a 12 fps "boil": every vertex re-rolls a tiny world-space noise offset each stop-motion frame (Mat.js)
 *  - character rigs pose "on twos" (12 poses a second) while they still travel smoothly (Rig.js)
 *  - warm key / cool fill, warm sub-surface wrap on the terminator, tiny wet glints (Mat.js + clayMood here)
 *  - film grain + violet shadows / warm highlights + a faint exposure flicker in the post grade (Post.js)
 * All of it is uniform-driven, so the Settings toggle is instant and never recompiles a shader.
 */
export const Clay = { on: true, twos: true, fps: 12 };

/** Read Settings + device quality into the shared uniforms. Mobile keeps the cheap parts (boil, wrap, glints) and skips thumbprints. */
export function applyClay(game) {
  const s = Settings.data, on = s.clay !== false, mobile = !!game?.quality?.mobile;
  Clay.on = on; Clay.twos = on && s.twos !== false && !s.reduceMotion;
  G.uClay.value = on ? 1 : 0;
  G.uClayFP.value = on && !mobile ? 1 : 0;
  G.uBoil.value = on && !s.reduceMotion ? (mobile ? 0.006 : 0.008) : 0;
  if (game?.sun && game.sky) game.applyMood(); // applyMood resets the lights and then calls clayMood
}

const WARM_KEY = new THREE.Color(0xffd2a0), COOL_FILL = new THREE.Color(0x8ea0ff), WARM_BOUNCE = new THREE.Color(0xc88a62);
/** Called after Game.applyMood: push the lights toward a studio set (warm key, cool fill, warm table bounce). */
export function clayMood(game) {
  game.fill.color.set(0xaab8ff); if (!Clay.on) return;
  game.sun.color.lerp(WARM_KEY, 0.35);
  game.fill.color.lerp(COOL_FILL, 0.6); game.fill.intensity *= 1.15;
  game.hemi.groundColor.lerp(WARM_BOUNCE, 0.35);
}
