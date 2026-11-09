import * as THREE from 'three';
import { fbm, vnoise, smoothstep, TAU, rng, lerp } from '../core/Utils.js';
import { std } from '../gfx/Mat.js';
import { Tex } from '../gfx/Textures.js';
import { Parts, tube } from './Build.js';

/** A floating island: analytic height function (used for walking) + matching top and underside meshes. */
export class Island {
  constructor(def, quality) {
    Object.assign(this, { hill: 1.2, depth: def.r * 1.15, flat: [], grass: [0x5aa05a, 0x86b95c], ...def });
    this.q = quality; this.seed = def.seed ?? 1;
  }
  edgeR(th) { return this.r * (1 + 0.16 * (fbm(Math.cos(th) * 1.4 + 9 + this.seed, Math.sin(th) * 1.4 + 3, this.seed, 3) - 0.5) * 2); }
  /** returns surface height or -Infinity when off the island */
  heightAt(x, z) {
    const dx = x - this.x, dz = z - this.z, rho = Math.hypot(dx, dz);
    if (rho > this.r * 1.3) return -Infinity;
    const R = this.edgeR(Math.atan2(dz, dx)), d = rho / R;
    if (d > 1) return -Infinity;
    return this.y + this.surf(x, z, d);
  }
  surf(x, z, d) {
    let hills = (fbm(x * 0.06, z * 0.06, this.seed + 5, 3) - 0.45) * 2 * this.hill * smoothstep(0.15, 0.75, d);
    for (const f of this.flat) { const k = smoothstep(f[2] + 2.5, f[2], Math.hypot(x - f[0], z - f[1])); hills *= 1 - k; }
    const rim = Math.pow(smoothstep(0.86, 1, d), 2) * 1.1;
    return hills - rim + Math.sin(d * 5 + this.seed) * 0.05;
  }
  nearEdge(x, z) { const R = this.edgeR(Math.atan2(z - this.z, x - this.x)); return Math.hypot(x - this.x, z - this.z) / R; }
  build() {
    const g = new THREE.Group(), q = this.q, r0 = rng(this.seed * 13 + 1);
    const nR = q.mobile ? 22 : 32, nS = q.mobile ? 64 : 112;
    // ---- top
    const pos = [], col = [], uv = [], idx = [];
    const c = new THREE.Color(), cA = new THREE.Color(this.grass[0]), cB = new THREE.Color(this.grass[1]), dirt = new THREE.Color(0x7a5c46);
    for (let i = 0; i <= nR; i++) for (let j = 0; j <= nS; j++) {
      const th = (j / nS) * TAU, R = this.edgeR(th), t = i / nR, rr = R * t;
      const x = this.x + Math.cos(th) * rr, z = this.z + Math.sin(th) * rr;
      const y = this.y + this.surf(x, z, t);
      pos.push(x - this.x, y - this.y, z - this.z);
      const patch = fbm(x * 0.12, z * 0.12, this.seed + 20, 3);
      c.copy(cA).lerp(cB, patch);
      if (this.tint) c.lerp(this.tint, 0.4 * fbm(x * 0.05, z * 0.05, 4, 2));
      c.lerp(dirt, smoothstep(0.9, 1.0, t) * 0.95);
      c.multiplyScalar(0.88 + 0.2 * vnoise(x * 0.8, z * 0.8, 3));
      col.push(c.r, c.g, c.b); uv.push(x * 0.35, z * 0.35);
    }
    for (let i = 0; i < nR; i++) for (let j = 0; j < nS; j++) { const a = i * (nS + 1) + j, b = a + nS + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
    const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    tg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); tg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    tg.setIndex(idx); tg.computeVertexNormals();
    const top = new THREE.Mesh(tg, std({ vertexColors: true, map: Tex.grass(), bumpMap: Tex.bump(), bumpScale: 1.2, roughness: 0.95 }));
    top.receiveShadow = true; top.castShadow = false; g.add(top); this.top = top;
    // ---- underside (faceted rock)
    const nU = 14, up = [], uc = [], uu = [], ui = [];
    const soil = new THREE.Color(0x6b4e3d), rock = new THREE.Color(0x8d7a88), deep = new THREE.Color(0x45405c), glow = new THREE.Color(0x6d5a8a);
    for (let i = 0; i <= nU; i++) for (let j = 0; j <= nS; j++) {
      const th = (j / nS) * TAU, R = this.edgeR(th), k = i / nU;
      const depth = this.depth * (0.7 + 0.6 * fbm(Math.cos(th) * 2 + this.seed, Math.sin(th) * 2, this.seed + 9, 3)) * (0.85 + 0.3 * Math.pow(vnoise(th * 4, this.seed, 2), 3));
      const rad = R * (1 - Math.pow(k, 1.35)) * (1 + 0.1 * (fbm(th * 3, k * 4, this.seed + 3, 3) - 0.5) * 2);
      const y = -1.1 - depth * Math.pow(k, 0.85) + 0.25 * Math.sin(th * 7 + i);
      const bump = (fbm(Math.cos(th) * 3 + k * 5, Math.sin(th) * 3 + k * 5, this.seed + 7, 3) - 0.5) * 2.2 * (1 - k * 0.5);
      pos2(up, Math.cos(th) * (rad + bump), y, Math.sin(th) * (rad + bump));
      c.copy(soil).lerp(rock, smoothstep(0.05, 0.4, k)).lerp(deep, smoothstep(0.55, 1, k));
      c.multiplyScalar(0.8 + 0.4 * fbm(th * 5, k * 6, this.seed, 3)); uc.push(c.r, c.g, c.b);
      uu.push((j / nS) * 7, k * 3);
    }
    for (let i = 0; i < nU; i++) for (let j = 0; j < nS; j++) { const a = i * (nS + 1) + j, b = a + nS + 1; ui.push(a, b, a + 1, a + 1, b, b + 1); }
    let ug = new THREE.BufferGeometry(); ug.setAttribute('position', new THREE.Float32BufferAttribute(up, 3));
    ug.setAttribute('color', new THREE.Float32BufferAttribute(uc, 3)); ug.setAttribute('uv', new THREE.Float32BufferAttribute(uu, 2)); ug.setIndex(ui);
    ug = ug.toNonIndexed(); ug.computeVertexNormals();
    const under = new THREE.Mesh(ug, std({ vertexColors: true, map: Tex.rock(), bumpMap: Tex.bump(), bumpScale: 2, roughness: 0.92, flatShading: true }));
    under.castShadow = true; under.receiveShadow = true; g.add(under);
    // hanging crystals + roots under the island
    const cp = new Parts(), rp = new Parts(); const nc = q.mobile ? 5 : 9;
    for (let i = 0; i < nc; i++) {
      const th = r0() * TAU, k = 0.15 + r0() * 0.4, R = this.edgeR(th) * (1 - k) * 0.9;
      cp.add(new THREE.ConeGeometry(0.18 + r0() * 0.25, 1.2 + r0() * 1.8, 5), 0x9fe8ff, { p: [Math.cos(th) * R, -1.5 - this.depth * k * 0.8, Math.sin(th) * R], r: [Math.PI + (r0() - 0.5) * 0.7, r0() * 6, (r0() - 0.5) * 0.7] });
    }
    for (let i = 0; i < (q.mobile ? 6 : 12); i++) {
      const th = r0() * TAU, R = this.edgeR(th) * (0.55 + r0() * 0.4), len = 2 + r0() * 5; const pts = [];
      for (let s = 0; s < 6; s++) pts.push([Math.cos(th) * R + Math.sin(s * 0.9 + i) * 0.35, -1 - s * len / 5, Math.sin(th) * R + Math.cos(s * 0.7 + i) * 0.3]);
      rp.add(tube(pts, 0.1, 10, 5), 0x5a4636, { jitter: 0.2 });
    }
    const cm = new THREE.Mesh(cp.merge(), std({ vertexColors: true, emissive: 0x3aa0c8, emissiveIntensity: 0.9, roughness: 0.2, metalness: 0.1 })); g.add(cm);
    const rm = new THREE.Mesh(rp.merge(), std({ vertexColors: true, roughness: 1 })); rm.castShadow = true; g.add(rm);
    g.position.set(this.x, this.y, this.z); this.group = g; return g;
  }
}
function pos2(a, x, y, z) { a.push(x, y, z); }
