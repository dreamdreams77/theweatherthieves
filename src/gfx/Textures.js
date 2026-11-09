import * as THREE from 'three';
import { fbm, vnoise, clamp, lerp } from '../core/Utils.js';
function canvasTex(size, fn, { repeat = 1, srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d'); const img = ctx.createImageData(size, size);
  fn(img.data, size); ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 4; t.repeat.set(repeat, repeat); t.needsUpdate = true; return t;
}
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
function put(d, i, c, k = 1) { d[i] = clamp(c[0] * k, 0, 255); d[i + 1] = clamp(c[1] * k, 0, 255); d[i + 2] = clamp(c[2] * k, 0, 255); d[i + 3] = 255; }
const cache = {};
export const Tex = {
  grass() { return cache.grass ??= canvasTex(256, (d, s) => { for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const n = fbm(x / 32, y / 32, 1, 4, 8), st = vnoise(x / 3, y / 20, 5, s / 3 | 0);
    put(d, (y * s + x) * 4, mix3([70, 120, 60], [140, 180, 80], n), 0.82 + st * 0.3); } }, { repeat: 6 }); },
  rock() { return cache.rock ??= canvasTex(256, (d, s) => { for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const n = fbm(x / 24, y / 24, 3, 5, 10), strata = Math.sin((y / s) * 6.283 * 4 + n * 4) * 0.5 + 0.5;
    const crack = Math.abs(vnoise(x / 16, y / 16, 9, 16) - 0.5) < 0.025 ? 0.55 : 1;
    put(d, (y * s + x) * 4, mix3([110, 96, 112], [170, 150, 150], n * 0.6 + strata * 0.4), crack * (0.8 + n * 0.3)); } }, { repeat: 1 }); },
  wood() { return cache.wood ??= canvasTex(128, (d, s) => { for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const g = vnoise(x / 6, y / 40, 2, 128 / 6 | 0) * 0.6 + fbm(x / 20, y / 20, 4, 3, 6) * 0.4;
    put(d, (y * s + x) * 4, mix3([120, 80, 52], [190, 135, 88], g)); } }); },
  cloth() { return cache.cloth ??= canvasTex(128, (d, s) => { for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const w = (Math.sin(x * 1.57) * Math.sin(y * 1.57)) * 0.08 + 0.92, n = fbm(x / 16, y / 16, 6, 3, 8);
    put(d, (y * s + x) * 4, [255, 255, 255], w * (0.9 + n * 0.12)); } }); },
  bump() { return cache.bump ??= canvasTex(128, (d, s) => { for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const n = fbm(x / 14, y / 14, 8, 4, 8) * 255; const i = (y * s + x) * 4; d[i] = d[i + 1] = d[i + 2] = n; d[i + 3] = 255; } }, { srgb: false, repeat: 4 }); },
  glowDot() { return cache.dot ??= (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })(); },
  toonGradient() { return cache.toon ??= (() => { const t = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })(); },
};
