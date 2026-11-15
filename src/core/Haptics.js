import { Settings } from './Settings.js';
import { isTouch } from './Utils.js';
/** Phone vibration feedback (Android / Chrome; iOS Safari has no vibration API, so it quietly does nothing there). */
const PATTERNS = { grab: 15, glint: [20, 40, 30], bloom: 25, unlock: [30, 40, 30], plate: 20, finale: [40, 60, 40, 60, 90], squeak: 10, bad: 50, fall: 60, land: 8, jump: 10, good: 12, flap: 8, pop: 12, melt: 20, flip: 6, gold: [20, 30, 40], bolt: [30, 20, 60], tool: 8 };
let last = 0;
export const Haptics = {
  get ok() { return typeof navigator !== 'undefined' && 'vibrate' in navigator && isTouch(); },
  buzz(p) { if (!this.ok || Settings.data.vibrate === false) return; const now = performance.now(); if (now - last < 70) return; last = now; try { navigator.vibrate(p); } catch {} },
  sfx(name) { const p = PATTERNS[name]; if (p) this.buzz(p); },
};
