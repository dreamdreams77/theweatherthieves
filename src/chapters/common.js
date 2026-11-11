import * as THREE from 'three';
import { Island } from '../world/Island.js';
import { Parts, mesh, vcMat } from '../world/Build.js';
import { RisingFall } from '../world/Props.js';
import { std } from '../gfx/Mat.js';
import { rng, TAU } from '../core/Utils.js';

/** Distant drifting islands with trees, so every chapter sits in a living sky. */
export function farScenery(world, { seed = 404, n = 14, colors = [0x58b98c, 0xe58ab4, 0x3f9a78], grass = [0x56a07c, 0x9acb8a], tint = [0xd9b25a, 0x6ac0a0], center = [0, -40], falls = true, snowy = false } = {}) {
  const { scene, q } = world, r = rng(seed), mat = std({ vertexColors: true, roughness: 0.95 }); n = q.mobile ? Math.ceil(n * 0.6) : n;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU + r() * 0.3, d = 90 + r() * 140, rad = 6 + r() * 20, x = center[0] + Math.cos(a) * d, z = center[1] + Math.sin(a) * d, y = -35 + r() * 80;
    const isl = new Island({ x, y, z, r: rad, seed: 50 + k + seed, hill: 1.5, depth: rad * 1.3, grass, tint: new THREE.Color(tint[(r() * tint.length) | 0]) }, { mobile: true }); const g = isl.build(); scene.add(g); g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    const p = new Parts(); for (let t = 0; t < 5 + (rad / 4 | 0); t++) { const th = r() * TAU, rho = Math.sqrt(r()) * rad * 0.8, tx = Math.cos(th) * rho, tz = Math.sin(th) * rho, ty = isl.heightAt(x + tx, z + tz) - y; if (ty === -Infinity) continue; const tall = 2 + r() * 4;
      p.add(new THREE.CylinderGeometry(0.15, 0.3, tall, 5), 0x6b4a3a, { p: [tx, ty + tall / 2, tz] });
      if (snowy) p.add(new THREE.ConeGeometry(1.6 + r(), tall * 1.2, 6), r() > 0.5 ? 0xe8f4ff : 0x4f8a78, { p: [tx, ty + tall + 0.8, tz], jitter: 0.12 }); else p.add(new THREE.IcosahedronGeometry(1.2 + r() * 1.2, 1), colors[(r() * colors.length) | 0], { p: [tx, ty + tall + 0.6, tz], jitter: 0.2 }); }
    if (p.list.length) { const tm = mesh(p.merge(), mat); tm.position.set(x, y, z); scene.add(tm); }
    if (falls && r() > 0.5) world.risingFalls?.push(new RisingFall(scene, x + rad * 0.3, y + 0.2, z, { height: 15 + r() * 25, radius: 0.9, quality: q, seed: k }));
  }
}

/** Scalloped umbrella canopy (8 wedges, alternating colours). */
export function umbrellaCanopy(parts, cx, cy, cz, rad, hgt, c1, c2) {
  for (let i = 0; i < 8; i++) parts.add(new THREE.SphereGeometry(rad, 4, 5, (i / 8) * TAU, TAU / 8, 0, Math.PI * 0.5), i % 2 ? c1 : c2, { p: [cx, cy, cz], s: [1, hgt / rad, 1], jitter: 0.06 });
  parts.add(new THREE.TorusGeometry(rad, 0.07, 6, 28), 0x5a4a3a, { p: [cx, cy + 0.02, cz], r: [Math.PI / 2, 0, 0] }); parts.add(new THREE.SphereGeometry(0.16, 8, 6), 0xd9b25a, { p: [cx, cy + hgt * 0.98, cz] });
}
/** A house whose roof is a giant umbrella. */
export function umbrellaHouse(c1 = 0xd8604a, c2 = 0xf4d8a0, r = 1.8, h = 2.8, wall = 0xf0dcc0) {
  const g = new THREE.Group(), p = new Parts();
  p.add(new THREE.CylinderGeometry(r, r * 1.08, h, 14), wall, { p: [0, h / 2, 0], jitter: 0.08 }); p.add(new THREE.CylinderGeometry(r * 1.12, r * 1.18, 0.4, 14), 0x9a94a2, { p: [0, 0.2, 0], jitter: 0.15 });
  p.add(new THREE.BoxGeometry(0.9, 1.7, 0.18), 0x6a4a8a, { p: [0, 0.95, r * 1.0] }); p.add(new THREE.SphereGeometry(0.07, 6, 6), 0xd9b25a, { p: [0.28, 0.95, r * 1.05] });
  p.add(new THREE.CylinderGeometry(0.07, 0.07, 1.6, 6), 0x5a4a3a, { p: [0, h + 0.7, 0] });
  umbrellaCanopy(p, 0, h + 0.5, 0, r * 1.9, 1.8, c1, c2);
  g.add(mesh(p.merge(), vcMat({ roughness: 0.8, flatShading: true })));
  const wm = new THREE.MeshStandardMaterial({ color: 0xffd58a, emissive: 0xffb04a, emissiveIntensity: 1.0 });
  for (const a of [0.9, -0.9, 2.4, -2.4]) { const w = new THREE.Mesh(new THREE.CircleGeometry(0.28, 12), wm); w.position.set(Math.sin(a) * (r + 0.01), h * 0.62, Math.cos(a) * (r + 0.01)); w.rotation.y = a; g.add(w); }
  g.userData.radius = r * 1.2; return g;
}
export function marketStall(c1 = 0x4aa8a0, c2 = 0xf4ead2) {
  const g = new THREE.Group(), p = new Parts();
  for (const [x, z] of [[-1.2, -0.8], [1.2, -0.8], [-1.2, 0.8], [1.2, 0.8]]) p.add(new THREE.CylinderGeometry(0.06, 0.06, 2.1, 6), 0x7a5a42, { p: [x, 1.05, z] });
  p.add(new THREE.BoxGeometry(2.6, 0.08, 1.2), 0xb08a5c, { p: [0, 0.9, -0.2] });
  for (let i = 0; i < 6; i++) p.add(new THREE.BoxGeometry(0.44, 0.06, 2.0), i % 2 ? c1 : c2, { p: [-1.1 + i * 0.44, 2.1, 0], r: [0.18, 0, 0] });
  for (let i = 0; i < 5; i++) p.add(new THREE.SphereGeometry(0.16, 8, 6), [0xe8604a, 0xf0c040, 0x70c060, 0xff9060, 0xb070d0][i], { p: [-0.9 + i * 0.45, 1.08, -0.2] });
  g.add(mesh(p.merge(), vcMat({ roughness: 0.8 }))); g.userData.radius = 1.8; return g;
}
