import * as THREE from 'three';
import { Parts, mesh, vcMat, tube, puff } from './Build.js';
import { std } from '../gfx/Mat.js';
import { waterfallMaterial, waterMaterial } from '../gfx/Shaders.js';
import { ParticlePool } from '../weather/Particles.js';
import { Tex } from '../gfx/Textures.js';
import { rng, TAU, lerp } from '../core/Utils.js';

const glowMat = (c, i = 1.6) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.4 });
const windowMat = new THREE.MeshStandardMaterial({ color: 0xffd58a, emissive: 0xffb04a, emissiveIntensity: 1.1, roughness: 0.5 });

export function cottage() {
  const g = new THREE.Group(), p = new Parts(), r = rng(11);
  // stone base ring of cobbles
  p.add(new THREE.CylinderGeometry(2.25, 2.4, 1.0, 18), 0x8a8494, { p: [0, 0.5, 0], jitter: 0.12 });
  for (let i = 0; i < 26; i++) { const a = (i / 26) * TAU; p.add(new THREE.DodecahedronGeometry(0.34 + r() * 0.12, 0), 0x9a94a2, { p: [Math.cos(a) * 2.33, 0.35 + (i % 2) * 0.45, Math.sin(a) * 2.33], s: [1, 0.75, 1], r: [r(), r(), r()], jitter: 0.3 }); }
  // plaster body, leaning slightly
  p.add(new THREE.CylinderGeometry(2.0, 2.15, 2.2, 18), 0xf0dcc0, { p: [0, 2.05, 0], jitter: 0.06 });
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; p.add(new THREE.BoxGeometry(0.16, 2.2, 0.16), 0x7a4e3a, { p: [Math.cos(a) * 2.06, 2.05, Math.sin(a) * 2.06], r: [0, -a, 0] }); }
  p.add(new THREE.TorusGeometry(2.1, 0.09, 6, 24), 0x7a4e3a, { p: [0, 1.15, 0], r: [Math.PI / 2, 0, 0] }); p.add(new THREE.TorusGeometry(2.0, 0.09, 6, 24), 0x7a4e3a, { p: [0, 3.1, 0], r: [Math.PI / 2, 0, 0] });
  // roof: layered scales
  for (let l = 0; l < 7; l++) { const rad = 2.7 - l * 0.34, y = 3.0 + l * 0.42, n = 24 - l * 2; for (let i = 0; i < n; i++) { const a = (i / n) * TAU + l * 0.2; const c = [0xd8604a, 0xe89a3c, 0x3c9a9a, 0xd8604a, 0xe8c24a][(i + l) % 5];
    p.add(new THREE.BoxGeometry(0.62 - l * 0.04, 0.05, 0.55), c, { p: [Math.cos(a) * rad, y, Math.sin(a) * rad], r: [0.62, -a + Math.PI / 2, 0], jitter: 0.2 }); } }
  p.add(new THREE.ConeGeometry(0.5, 1.1, 10), 0xd8604a, { p: [0, 6.0, 0] });
  // chimney
  p.add(new THREE.CylinderGeometry(0.34, 0.4, 1.8, 8), 0x8a6a62, { p: [0.9, 4.6, -0.5], jitter: 0.1 }); p.add(new THREE.TorusGeometry(0.34, 0.07, 6, 12), 0x6a4a42, { p: [0.9, 5.5, -0.5], r: [Math.PI / 2, 0, 0] });
  // door + step + porch posts
  p.add(new THREE.BoxGeometry(1.0, 1.7, 0.2), 0x6a4a8a, { p: [0, 1.15, 2.1], r: [0, 0, 0] }); p.add(new THREE.CylinderGeometry(0.5, 0.5, 0.2, 12, 1, false, 0, Math.PI), 0x6a4a8a, { p: [0, 2.0, 2.1], r: [Math.PI / 2, 0, Math.PI / 2] });
  p.add(new THREE.SphereGeometry(0.07, 6, 6), 0xd9b25a, { p: [0.3, 1.1, 2.22] });
  p.add(new THREE.CylinderGeometry(0.9, 1.0, 0.18, 10), 0x9a94a2, { p: [0, 0.1, 2.5] });
  const body = mesh(p.merge(), vcMat({ roughness: 0.85 })); g.add(body);
  for (const [a, y] of [[0.9, 2.4], [-0.9, 2.4], [2.3, 2.3]]) { const w = new THREE.Mesh(new THREE.CircleGeometry(0.32, 14), windowMat); w.position.set(Math.sin(a) * 2.03, y, Math.cos(a) * 2.03); w.rotation.y = a; g.add(w);
    const fr = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.05, 6, 16), std({ color: 0x7a4e3a })); fr.position.copy(w.position).multiplyScalar(1.003); fr.rotation.y = a; g.add(fr); }
  // anemometer on roof
  const an = new THREE.Group(); an.position.set(0, 6.8, 0); const ap = new Parts(); ap.add(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6), 0xd9b25a, { p: [0, 0.2, 0] });
  for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; ap.add(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 5), 0xd9b25a, { p: [Math.cos(a) * 0.4, 0.62, Math.sin(a) * 0.4], r: [Math.PI / 2, 0, a + Math.PI / 2], s: [1, 0.5, 1] }); ap.add(new THREE.SphereGeometry(0.17, 8, 6, 0, TAU, 0, Math.PI), 0xd8604a, { p: [Math.cos(a) * 0.8, 0.62, Math.sin(a) * 0.8], s: [1, 1, 1] }); }
  const anm = mesh(ap.merge(), vcMat({ metalness: 0.3, roughness: 0.4, side: THREE.DoubleSide })); an.add(anm); g.add(an);
  g.userData = { anemometer: an, smoke: new THREE.Vector3(0.9, 5.7, -0.5), radius: 2.5 };
  return g;
}

export function lanternPost(h = 2.6, color = 0xffc46a) {
  const g = new THREE.Group(), p = new Parts();
  p.add(new THREE.CylinderGeometry(0.06, 0.1, h, 6), 0x4a3a44, { p: [0, h / 2, 0] }); p.add(new THREE.TorusGeometry(0.4, 0.04, 6, 14, Math.PI * 0.6), 0x4a3a44, { p: [0.4, h - 0.1, 0], r: [0, 0, Math.PI * 0.5] });
  p.add(new THREE.ConeGeometry(0.27, 0.26, 6), 0x4a3a44, { p: [0.8, h - 0.3, 0] });
  g.add(mesh(p.merge(), vcMat({ roughness: 0.6 })));
  const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18, 1), glowMat(color, 1.8)); l.position.set(0.8, h - 0.6, 0); l.castShadow = false; g.add(l); g.userData.lamp = l; return g;
}
export function signpost(text = '') {
  const g = new THREE.Group(), p = new Parts();
  p.add(new THREE.CylinderGeometry(0.07, 0.09, 1.9, 6), 0x7a5a42, { p: [0, 0.95, 0], jitter: 0.1 });
  p.add(new THREE.BoxGeometry(1.1, 0.34, 0.07), 0xa07850, { p: [0.15, 1.6, 0.06], r: [0, 0.1, 0.05], jitter: 0.1 }); p.add(new THREE.ConeGeometry(0.19, 0.3, 3), 0xa07850, { p: [0.78, 1.62, 0.06], r: [0, 0, -Math.PI / 2] });
  p.add(new THREE.BoxGeometry(0.9, 0.3, 0.07), 0x8a6844, { p: [-0.1, 1.15, 0.06], r: [0, -0.15, -0.04] });
  g.add(mesh(p.merge(), vcMat({ roughness: 0.9 }))); return g;
}
export function wellBarrel() { const p = new Parts(); p.add(new THREE.CylinderGeometry(0.45, 0.4, 0.9, 12), 0x8a5a3a, { p: [0, 0.45, 0], jitter: 0.2 }); for (const y of [0.2, 0.7]) p.add(new THREE.TorusGeometry(0.44, 0.03, 6, 16), 0x4a3a34, { p: [0, y, 0], r: [Math.PI / 2, 0, 0] }); p.add(new THREE.CircleGeometry(0.4, 12), 0x6aa8c8, { p: [0, 0.82, 0], r: [-Math.PI / 2, 0, 0] }); return mesh(p.merge(), vcMat()); }
export function bench() { const p = new Parts(); p.add(new THREE.BoxGeometry(1.5, 0.08, 0.45), 0x9a7048, { p: [0, 0.5, 0] }); p.add(new THREE.BoxGeometry(1.5, 0.4, 0.06), 0x9a7048, { p: [0, 0.8, -0.22], r: [-0.12, 0, 0] }); for (const s of [-1, 1]) p.add(new THREE.BoxGeometry(0.08, 0.5, 0.4), 0x6a4a34, { p: [s * 0.65, 0.25, 0] }); return mesh(p.merge(), vcMat()); }
export function fenceRun(n, spacing = 0.9) { const p = new Parts(); for (let i = 0; i < n; i++) { p.add(new THREE.BoxGeometry(0.1, 0.9 + (i % 3) * 0.06, 0.08), 0xb08a5c, { p: [i * spacing, 0.45, 0], r: [0, 0, (i % 2 ? 0.03 : -0.02)], jitter: 0.2 }); if (i < n - 1) for (const y of [0.3, 0.65]) p.add(new THREE.BoxGeometry(spacing, 0.06, 0.05), 0x8a6844, { p: [i * spacing + spacing / 2, y, 0] }); } return mesh(p.merge(), vcMat()); }
export function ruinArch(s = 1) {
  const p = new Parts(), r = rng(31); for (const sx of [-1, 1]) { for (let i = 0; i < 4; i++) p.add(new THREE.BoxGeometry(1.1 * s, 1.0 * s, 1.1 * s), 0xa59cae, { p: [sx * 2.0 * s, (0.5 + i) * s, 0], r: [0, r() * 0.1, 0], jitter: 0.25 }); }
  for (let i = 0; i < 9; i++) { const a = (i / 8) * Math.PI; p.add(new THREE.BoxGeometry(0.95 * s, 0.7 * s, 1.1 * s), 0xb3aabb, { p: [Math.cos(a) * 2.0 * s, 4.0 * s + Math.sin(a) * 1.6 * s, 0], r: [0, 0, a - Math.PI / 2], jitter: 0.25 }); }
  p.add(new THREE.SphereGeometry(0.4 * s, 10, 8), 0x7bc487, { p: [-2 * s, 4.4 * s, 0.2], s: [1.4, 0.6, 1.4] });
  return mesh(p.merge(), vcMat({ roughness: 0.95, flatShading: true }));
}
export function windChimes() {
  const g = new THREE.Group(), r = rng(5), p = new Parts(); p.add(new THREE.TorusGeometry(0.28, 0.03, 6, 14), 0xd9b25a, { p: [0, 0, 0], r: [Math.PI / 2, 0, 0] });
  g.add(mesh(p.merge(), vcMat({ metalness: 0.7, roughness: 0.3 }))); g.userData.tubes = [];
  for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU, piv = new THREE.Group(); piv.position.set(Math.cos(a) * 0.24, 0, Math.sin(a) * 0.24); const L = 0.5 + r() * 0.5;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, L, 8), std({ color: 0xcfd8e0, metalness: 0.85, roughness: 0.25 })); t.position.y = -L / 2 - 0.1; t.castShadow = true; piv.add(t); g.add(piv); g.userData.tubes.push(piv); }
  return g;
}
/** Dangling laundry flags that flap with wind (vertex flap in shader) */
export function laundryLine(a, b, n = 6) {
  const g = new THREE.Group(); const dir = new THREE.Vector3().subVectors(b, a), len = dir.length(); dir.normalize();
  const rope = tube([[a.x, a.y, a.z], [(a.x + b.x) / 2, (a.y + b.y) / 2 - 0.35, (a.z + b.z) / 2], [b.x, b.y, b.z]], 0.012, 12, 4); g.add(mesh(rope, std({ color: 0x5a4a3a }), { receive: false }));
  const cols = [0xe86a5a, 0xf4ead2, 0x4aa8a0, 0xe8b23a, 0xb08ad8, 0xf4ead2]; g.userData.cloths = [];
  for (let i = 0; i < n; i++) { const t = (i + 0.7) / (n + 0.4), pos = new THREE.Vector3().lerpVectors(a, b, t); pos.y -= Math.sin(t * Math.PI) * 0.35;
    const geo = new THREE.PlaneGeometry(0.5 + (i % 3) * 0.12, 0.6 + (i % 2) * 0.2, 6, 6); geo.translate(0, -0.3 - (i % 2) * 0.1, 0);
    const m = std({ color: cols[i % cols.length], side: THREE.DoubleSide, roughness: 0.95, map: Tex.cloth() }, { sway: 0.8, amp: 1.2 }); const cl = new THREE.Mesh(geo, m); cl.position.copy(pos); cl.rotation.y = Math.atan2(dir.x, dir.z) + Math.PI / 2; cl.castShadow = true; g.add(cl); }
  return g;
}
/** ---- Upside-down waterfall: water rises from a pool into a cloud ---- */
export class RisingFall {
  constructor(scene, x, y, z, { height = 20, radius = 1.3, quality, withCloud = true, seed = 1 } = {}) {
    this.group = new THREE.Group(); this.group.position.set(x, y, z); scene.add(this.group); this.height = height; this.top = new THREE.Vector3(x, y + height, z);
    const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector3(Math.sin(t * 4 + seed) * 0.6 * t, t * height, Math.cos(t * 3 + seed) * 0.6 * t)); }
    this.curve = new THREE.CatmullRomCurve3(pts);
    // build column as open ribbon-tube, radius grows with height
    const seg = 28, rad = 12, pos = [], uv = [], idx = [], nor = [];
    for (let i = 0; i <= seg; i++) { const t = i / seg, c = this.curve.getPoint(t); const rr = radius * (1 + t * 0.35) * (1 - Math.pow(Math.max(0, t - 0.85) / 0.15, 2) * 0.35);
      for (let j = 0; j <= rad; j++) { const a = (j / rad) * TAU; pos.push(c.x + Math.cos(a) * rr, c.y, c.z + Math.sin(a) * rr); nor.push(Math.cos(a), 0, Math.sin(a)); uv.push(j / rad, t); } }
    for (let i = 0; i < seg; i++) for (let j = 0; j < rad; j++) { const a = i * (rad + 1) + j, b = a + rad + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
    this.column = new THREE.Mesh(geo, waterfallMaterial()); this.column.renderOrder = 3; this.group.add(this.column);
    // pool
    this.pool = new THREE.Mesh(new THREE.CircleGeometry(radius * 3.2, 28).rotateX(-Math.PI / 2), waterMaterial()); this.pool.position.y = 0.06; this.pool.material.uniforms.uRain.value = 0.25; this.group.add(this.pool);
    const rim = new Parts(); const rr = rng(seed + 3); for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU; rim.add(new THREE.DodecahedronGeometry(0.45 + rr() * 0.3, 0), 0x8d8a96, { p: [Math.cos(a) * radius * 3.4, 0.1, Math.sin(a) * radius * 3.4], s: [1, 0.6, 1], r: [rr(), rr(), rr()], jitter: 0.3 }); }
    this.group.add(mesh(rim.merge(), vcMat({ roughness: 0.95, flatShading: true })));
    if (withCloud) { const cp = new Parts(); puff(cp, 0xffffff, 0, 0, 0, 9, radius * 2.8, radius * 1.9, seed + 11, 0.1); this.cloud = mesh(cp.merge(), std({ vertexColors: true, roughness: 1, emissive: 0x8a96b8, emissiveIntensity: 0.2 })); this.cloud.position.copy(this.curve.getPoint(1)).add(new THREE.Vector3(0, radius * 0.9, 0)); this.group.add(this.cloud); }
    this.drops = new ParticlePool(scene, new THREE.IcosahedronGeometry(0.06, 0), new THREE.MeshBasicMaterial({ color: 0xcff4ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }), quality.mobile ? 40 : 90, { fade: 'color' });
    this.mist = new ParticlePool(scene, new THREE.IcosahedronGeometry(0.4, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, depthWrite: false }), 24, { fade: 'scale' });
    this.radius = radius; this.t = 0; this.pos = new THREE.Vector3(x, y, z); this.seed = seed;
  }
  update(dt) {
    this.t += dt; const _v = new THREE.Vector3(), _w = new THREE.Vector3();
    if (this.t > 0.07) { this.t = 0; const tt = Math.random(), c = this.curve.getPoint(tt), a = Math.random() * TAU, r = this.radius * (0.5 + Math.random() * 0.8) * (1 + tt * 0.3);
      _v.set(c.x + Math.cos(a) * r, c.y, c.z + Math.sin(a) * r).add(this.pos); this.drops.spawn(_v, _w.set(0, 3 + Math.random() * 4, 0), { life: (this.height * (1 - tt)) / 5 + 1, size: 1, color: 0xcff4ff });
      if (Math.random() < 0.35) { const a2 = Math.random() * TAU; _v.set(this.pos.x + Math.cos(a2) * this.radius * 2, this.pos.y + 0.3, this.pos.z + Math.sin(a2) * this.radius * 2); this.mist.spawn(_v, _w.set(0, 0.3, 0), { life: 2.4, size: 1.2, grow: 1.4 }); } }
    this.drops.update(dt); this.mist.update(dt);
  }
}
