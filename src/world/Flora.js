import * as THREE from 'three';
import { Parts, mesh, vcMat, tube, puff } from './Build.js';
import { std } from '../gfx/Mat.js';
import { rng, TAU, lerp } from '../core/Utils.js';

function bladeGeo() {
  const pos = [], idx = [];
  for (let b = 0; b < 3; b++) { const a = (b / 3) * Math.PI, c = Math.cos(a) * 0.09, s = Math.sin(a) * 0.09, lean = 0.05 + b * 0.02; const o = pos.length / 3;
    pos.push(-c, 0, -s, c, 0, s, -c * 0.45 + lean, 0.5, -s * 0.45, c * 0.45 + lean, 0.5, s * 0.45, lean * 2, 1, 0); idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2, o + 2, o + 3, o + 4); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill(0).flatMap(() => [0, 1, 0]), 3)); return g;
}
const grassMat = () => std({ color: 0xffffff, roughness: 1, side: THREE.DoubleSide }, { sway: 1, amp: 0.9 });
/** scatter grass / flowers on an island, avoiding circles. returns {group, update?} */
export function scatterGrass(island, q, avoid, opts = {}) {
  const r = rng(island.seed * 91 + 5), area = Math.PI * island.r * island.r, N = Math.floor(area * (opts.density ?? 6) * (q.mobile ? 0.55 : 1));
  const mesh_ = new THREE.InstancedMesh(bladeGeo(), grassMat(), N), m = new THREE.Matrix4(), c = new THREE.Color(), qn = new THREE.Quaternion(), e = new THREE.Euler();
  let k = 0; const g1 = new THREE.Color(opts.a ?? 0x4f9a4c), g2 = new THREE.Color(opts.b ?? 0xa4cf62);
  for (let i = 0; i < N * 2 && k < N; i++) {
    const th = r() * TAU, rho = Math.sqrt(r()) * island.r, x = island.x + Math.cos(th) * rho, z = island.z + Math.sin(th) * rho;
    const y = island.heightAt(x, z); if (y === -Infinity || island.nearEdge(x, z) > 0.94) continue;
    let bad = false; for (const a of avoid) if ((x - a[0]) ** 2 + (z - a[1]) ** 2 < a[2] * a[2]) { bad = true; break; } if (bad) continue;
    const s = 0.6 + r() * 0.9; e.set(0, r() * 6.28, 0); qn.setFromEuler(e); m.compose(new THREE.Vector3(x, y - 0.03, z), qn, new THREE.Vector3(s * 0.8, s * (0.35 + r() * 0.4), s * 0.8));
    mesh_.setMatrixAt(k, m); c.copy(g1).lerp(g2, r()).multiplyScalar(0.8 + 0.4 * r()); mesh_.setColorAt(k, c); k++;
  }
  mesh_.count = k; mesh_.instanceMatrix.needsUpdate = true; mesh_.receiveShadow = false; mesh_.frustumCulled = false;
  // flowers
  const NF = Math.floor(k * 0.06), stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.016, 0.5, 4).translate(0, 0.25, 0), std({ color: 0x4a8a44 }, { sway: 0.5, amp: 0.8 }), NF);
  const heads = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.08, 1).scale(1.2, 0.5, 1.2).translate(0, 0.52, 0), std({ color: 0xffffff, roughness: 0.5, emissive: 0x222222 }, { sway: 0.55, amp: 0.8 }), NF);
  const pal = opts.flowers ?? [0xff8fb8, 0xffd05a, 0xffffff, 0xb59cff, 0xff7a5a, 0x7fe0ff];
  let f = 0; for (let i = 0; i < NF * 8 && f < NF; i++) {
    const th = r() * TAU, rho = Math.sqrt(r()) * island.r * 0.92, x = island.x + Math.cos(th) * rho, z = island.z + Math.sin(th) * rho;
    const y = island.heightAt(x, z); if (y === -Infinity) continue; let bad = false; for (const a of avoid) if ((x - a[0]) ** 2 + (z - a[1]) ** 2 < a[2] * a[2]) { bad = true; break; } if (bad) continue;
    const s = 0.8 + r() * 0.9; m.compose(new THREE.Vector3(x, y - 0.02, z), qn.identity(), new THREE.Vector3(s, s, s)); stems.setMatrixAt(f, m); heads.setMatrixAt(f, m); heads.setColorAt(f, c.set(pal[(r() * pal.length) | 0])); f++;
  }
  stems.count = heads.count = f; stems.frustumCulled = heads.frustumCulled = false;
  const g = new THREE.Group(); g.add(mesh_, stems, heads); return g;
}

// ---------- hero plants ----------
export function cloudcapTree(seed, col = [0x58b98c, 0xe58ab4]) {
  const r = rng(seed), p = new Parts(); const h = 3.2 + r() * 1.6;
  const trunk = tube([[0, 0, 0], [0.25, h * 0.4, 0.1], [-0.2, h * 0.7, -0.1], [0.05, h, 0]], 0.2, 10, 7); p.add(trunk, 0x7a5a48, { jitter: 0.15 });
  p.add(new THREE.CylinderGeometry(0.2, 0.5, 0.5, 8), 0x6a4c3c, { p: [0, 0.1, 0] });
  const cap = col[(r() * 2) | 0]; puff(p, cap, 0.05, h + 0.4, 0, 7, 1.5, 0.95, seed, 0.25);
  puff(p, col[0], 0.0, h + 1.2, 0, 3, 0.6, 0.7, seed + 3, 0.25);
  const g = mesh(p.merge(), vcMat({ roughness: 0.85 }, { sway: 4, amp: 0.4 })); g.userData.trunkR = 0.5; return g;
}
export function umbrellaPine(seed) {
  const r = rng(seed), p = new Parts(), h = 5 + r() * 2.5;
  p.add(tube([[0, 0, 0], [0.2, h * 0.5, 0], [-0.15, h, 0.05]], 0.14, 12, 6), 0x6b4a3a, { jitter: 0.2 });
  for (let i = 0; i < 5; i++) { const y = h * (0.45 + i * 0.12), rad = 2.1 - i * 0.28; p.add(new THREE.SphereGeometry(rad, 14, 8, 0, TAU, 0, Math.PI * 0.45), i % 2 ? 0x3f9a78 : 0x4fae7c, { p: [0, y, 0], s: [1, 0.55, 1], jitter: 0.2 }); p.add(new THREE.CylinderGeometry(rad * 0.85, rad * 0.85, 0.06, 14), 0x2a6a58, { p: [0, y - 0.02, 0] }); }
  const g = mesh(p.merge(), vcMat({ roughness: 0.9, side: THREE.DoubleSide }, { sway: 7, amp: 0.25 })); g.userData.trunkR = 0.4; return g;
}
export function spotMushroom(seed, s = 1, cap = 0xd8505a) {
  const r = rng(seed), p = new Parts(); const h = 1.1 * s;
  p.add(new THREE.CylinderGeometry(0.2 * s, 0.32 * s, h, 10), 0xf1e6cf, { p: [0, h / 2, 0], jitter: 0.1 });
  p.add(new THREE.SphereGeometry(1.1 * s, 18, 10, 0, TAU, 0, Math.PI * 0.55), cap, { p: [0, h * 0.9, 0], s: [1, 0.75, 1], jitter: 0.12 });
  for (let i = 0; i < 7; i++) { const a = r() * TAU, t = r() * 0.9 + 0.1, rr = 0.9 * s * t; p.add(new THREE.SphereGeometry(0.11 * s, 6, 5), 0xfff4e6, { p: [Math.cos(a) * rr, h * 0.9 + Math.sqrt(Math.max(0.05, 1 - t * t)) * 0.78 * s, Math.sin(a) * rr], s: [1, 0.4, 1] }); }
  const g = mesh(p.merge(), vcMat({ roughness: 0.6 })); g.userData.trunkR = 0.25 * s; return g;
}
export function crookFern(seed, s = 1) {
  const r = rng(seed), p = new Parts();
  for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU + r(), L = (1.2 + r() * 0.8) * s; const pts = []; for (let k = 0; k < 6; k++) { const t = k / 5; pts.push([Math.cos(a) * t * L * 0.9, Math.sin(t * 2.2) * L * 0.55 + t * L * 0.3 - (t > 0.8 ? (t - 0.8) * L * 0.9 : 0), Math.sin(a) * t * L * 0.9]); }
    p.add(tube(pts, 0.035 * s, 8, 4), 0x3f8a58, { jitter: 0.2 }); const e = pts[5]; p.add(new THREE.SphereGeometry(0.1 * s, 6, 6), 0xb4e27a, { p: e }); for (let k = 1; k < 5; k++) { p.add(new THREE.ConeGeometry(0.05 * s, 0.3 * s, 4), 0x5fb36e, { p: [pts[k][0], pts[k][1], pts[k][2]], r: [0, a, 1.2], jitter: 0.2 }); } }
  return mesh(p.merge(), vcMat({ roughness: 0.8, side: THREE.DoubleSide }, { sway: 1.2, amp: 0.7 }));
}
export function pillowMoss(seed, s = 1) {
  const p = new Parts(); puff(p, 0x7bc487, 0, 0.2 * s, 0, 5, 0.5 * s, 0.45 * s, seed, 0.3); puff(p, 0xe8b6d0, 0, 0.45 * s, 0, 2, 0.2 * s, 0.22 * s, seed + 2, 0.3);
  return mesh(p.merge(), vcMat({ roughness: 1 }));
}
export function rock(seed, s = 1) {
  const r = rng(seed), p = new Parts(); for (let i = 0; i < 3; i++) p.add(new THREE.DodecahedronGeometry((0.35 + r() * 0.4) * s, 0), 0x8d8a96, { p: [(r() - 0.5) * 0.7 * s, 0.15 * s, (r() - 0.5) * 0.7 * s], s: [1, 0.7, 1], r: [r(), r(), r()], jitter: 0.25 });
  return mesh(p.merge(), vcMat({ roughness: 0.95, flatShading: true }));
}
/** Lanternbloom: puzzle plant. returns {group, bulb, petals[], stem} */
export function lanternbloom() {
  const g = new THREE.Group();
  const stemP = new Parts(); stemP.add(tube([[0, 0, 0], [0.05, 0.6, 0], [-0.05, 1.2, 0], [0.0, 1.6, 0.05]], 0.05, 10, 6), 0x3f8a58, { jitter: 0.15 });
  for (let i = 0; i < 4; i++) stemP.add(new THREE.SphereGeometry(0.18, 8, 6), 0x4fa064, { p: [Math.cos(i * 1.6) * 0.2, 0.2 + i * 0.25, Math.sin(i * 1.6) * 0.2], s: [1.4, 0.15, 0.7], r: [0, i * 1.6, 0.3] });
  const stem = new THREE.Group(); stem.add(mesh(stemP.merge(), vcMat({ roughness: 0.8 }))); g.add(stem);
  stem.position.y = 0;
  const head = new THREE.Group(); head.position.set(0, 1.6, 0.05); stem.add(head);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 16), new THREE.MeshStandardMaterial({ color: 0x8a8a7a, emissive: 0xffa84a, emissiveIntensity: 0, roughness: 0.4, transparent: true, opacity: 0.95 })); bulb.scale.set(1, 1.2, 1); bulb.castShadow = false; head.add(bulb);
  const petals = []; const pm = std({ color: 0x9a8a8a, roughness: 0.6, side: THREE.DoubleSide, emissive: 0xff7aa0, emissiveIntensity: 0 });
  for (let i = 0; i < 6; i++) { const pv = new THREE.Group(); pv.rotation.y = (i / 6) * TAU; const pt = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8, 0, TAU, 0, Math.PI * 0.5).scale(0.45, 1.4, 0.18), pm); pt.position.set(0, 0.0, 0.0);
    const hinge = new THREE.Group(); hinge.position.set(0.1, -0.2, 0); hinge.add(pt); pt.position.set(0.0, 0.4, 0); pv.add(hinge); head.add(pv); petals.push({ hinge, pv, pt }); }
  const leaf = new THREE.PointLight(0xffa860, 0, 6, 2); leaf.position.y = 0.2; head.add(leaf);
  return { group: g, bulb, head, petals, light: leaf, petalMat: pm };
}
