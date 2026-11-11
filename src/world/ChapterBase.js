import * as THREE from 'three';
import { BridgeSurface } from './Terrain.js';
import { Parts, mesh, vcMat, tube } from './Build.js';
import { Tex } from '../gfx/Textures.js';
import { std } from '../gfx/Mat.js';
import { rng, TAU } from '../core/Utils.js';
const Tex_wood = () => Tex.wood();

/** Shared helpers for every chapter world: placing props on islands, glints, scattering trees, rope bridges. */
export class ChapterBase {
  on(i, x, z, dy = 0) { return i.heightAt(x, z) + dy; }
  place(obj, i, x, z, yaw = 0, s = 1, dy = 0, col = 0) {
    obj.position.set(x, this.on(i, x, z, dy), z); obj.rotation.y = yaw; obj.scale.setScalar(s); this.scene.add(obj);
    if (col) this.terrain.addCollider({ x, z, r: col * s, y0: obj.position.y - 1, y1: obj.position.y + 8 }); return obj;
  }
  glint(x, y, z, id, label) {
    const g = new THREE.Group(); g.position.set(x, y, z); const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), new THREE.MeshStandardMaterial({ color: 0xbff3ff, emissive: 0x7fe8ff, emissiveIntensity: 1.6, roughness: 0.1, transparent: true, opacity: 0.92 })); m.scale.y = 1.5; g.add(m);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 10), new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false })); g.add(h); this.scene.add(g);
    const o = { id, label, group: g, pos: new THREE.Vector3(x, y, z), got: false, mesh: m }; this.glints.push(o); return o;
  }
  scatterTrees(i, n, seed, avoid, kinds) {
    const r = rng(seed), out = [];
    for (let k = 0, tries = 0; k < n && tries < 400; tries++) {
      const th = r() * TAU, rho = (0.25 + 0.7 * Math.sqrt(r())) * i.r, x = i.x + Math.cos(th) * rho, z = i.z + Math.sin(th) * rho, y = i.heightAt(x, z);
      if (y === -Infinity || i.nearEdge(x, z) > 0.88) continue; if (avoid.some((a) => (x - a[0]) ** 2 + (z - a[1]) ** 2 < (a[2] + 1.2) ** 2)) continue;
      const kind = kinds[(r() * kinds.length) | 0], o = kind(seed + k * 7); o.position.set(x, y - 0.05, z); o.rotation.y = r() * 6; const s = 0.6 + r() * 0.35; o.scale.setScalar(s); this.scene.add(o);
      const tr = (o.userData.trunkR || 0.4) * s; this.terrain.addCollider({ x, z, r: tr, y0: y - 1, y1: y + 10, cam: { r: 2.7 * s, y0: y + 2.2, y1: y + 9 } }); avoid.push([x, z, tr + 0.8]); k++; out.push(o);
    } return out;
  }
  edge(i, toX, toZ, inset = 1.1) { const dx = toX - i.x, dz = toZ - i.z, L = Math.hypot(dx, dz); const ux = dx / L, uz = dz / L; for (let d = i.r * 1.3; d > 0; d -= 0.15) { const x = i.x + ux * d, z = i.z + uz * d; if (i.heightAt(x, z) !== -Infinity && i.nearEdge(x, z) < 0.93) return new THREE.Vector3(x - ux * inset * 0.0, i.heightAt(x, z) + 0.12, z); } return new THREE.Vector3(i.x, i.y, i.z); }
  makeBridge(a, b, { width = 2.2, sag = 0.8, grow = false } = {}) {
    const surface = new BridgeSurface(a, b, width, sag); const g = new THREE.Group(); const n = Math.max(8, Math.round(surface.len / 0.62)); this.scene.add(g);
    const plankGeo = new THREE.BoxGeometry(width * 0.98, 0.1, 0.5), pm = std({ color: 0xffffff, map: Tex_wood(), roughness: 0.85 }), planks = new THREE.InstancedMesh(plankGeo, pm, n); planks.castShadow = true; planks.receiveShadow = true; g.add(planks);
    const dir = new THREE.Vector3(b.x - a.x, 0, b.z - a.z).normalize(), yaw = Math.atan2(dir.x, dir.z), side = new THREE.Vector3(dir.z, 0, -dir.x);
    const pt = (t, o = 0, up = 0) => new THREE.Vector3().lerpVectors(a, b, t).addScaledVector(side, o).add(new THREE.Vector3(0, -sag * 4 * t * (1 - t) + up, 0));
    const rr = rng(Math.floor(a.x * 7 + b.z)); const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e = new THREE.Euler(), cc = new THREE.Color();
    const place = (k) => { const t = (k + 0.5) / n, p = pt(t), t2 = Math.min(1, t + 0.01), p2 = pt(t2); const slope = Math.atan2(p2.y - p.y, surface.len * 0.01); e.set(-slope, yaw + (rr() - 0.5) * 0.06, 0, 'YXZ'); q4.setFromEuler(e); m4.compose(p, q4, new THREE.Vector3(1, 1, 1)); planks.setMatrixAt(k, m4); planks.setColorAt(k, cc.setHSL(0.07, 0.35, 0.55 + rr() * 0.2)); };
    for (let k = 0; k < n; k++) place(k); planks.instanceMatrix.needsUpdate = true;
    const rp = new Parts(); for (const s of [-1, 1]) { const pts = []; for (let k = 0; k <= 12; k++) { const p = pt(k / 12, s * width * 0.5, 1.1); pts.push([p.x, p.y, p.z]); } rp.add(tube(pts, 0.04, 24, 5), 0xb09870, { jitter: 0.2 });
      const pts2 = []; for (let k = 0; k <= 12; k++) { const p = pt(k / 12, s * width * 0.5, 0.15); pts2.push([p.x, p.y, p.z]); } rp.add(tube(pts2, 0.035, 24, 5), 0xb09870, {});
      for (let k = 0; k <= Math.floor(surface.len / 2.4); k++) { const t = k / Math.floor(surface.len / 2.4), p = pt(t, s * width * 0.5, 0); rp.add(new THREE.CylinderGeometry(0.07, 0.09, 1.25, 6), 0x7a5a42, { p: [p.x, p.y + 0.6, p.z] }); }
      for (let k = 0; k < 24; k++) { const t = (k + 0.5) / 24, p = pt(t, s * width * 0.5, 0.6); rp.add(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 3), 0xb09870, { p: [p.x, p.y, p.z] }); } }
    const rails = mesh(rp.merge(), vcMat({ roughness: 0.9 }), { receive: false }); g.add(rails);
    // lanterns every few planks
    const lamp = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.1, 1), new THREE.MeshBasicMaterial({ color: 0xffc46a }), 6); let li = 0; for (const t of [0.2, 0.5, 0.8]) for (const s of [-1, 1]) { const p = pt(t, s * width * 0.5, 1.35); m4.compose(p, q4.identity(), new THREE.Vector3(1, 1, 1)); lamp.setMatrixAt(li++, m4); } g.add(lamp);
    const obj = { surface, group: g, planks, grow: 0, n, place, update: null };
    if (grow) { surface.enabled = false; g.visible = false; }
    return obj;
  }
}
