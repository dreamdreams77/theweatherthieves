import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { std } from '../gfx/Mat.js';
import { rng } from '../core/Utils.js';
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _c = new THREE.Color();
/** Collects coloured primitives and merges them into one geometry. */
export class Parts {
  constructor() { this.list = []; }
  add(geo, color, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1], jitter = 0, seed = 1 } = {}) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    _e.set(r[0], r[1], r[2]); _q.setFromEuler(_e); _m.compose(new THREE.Vector3(...p), _q, new THREE.Vector3(...s)); g.applyMatrix4(_m);
    const n = g.attributes.position.count, col = new Float32Array(n * 3); _c.set(color);
    const rr = rng(seed + this.list.length * 7);
    for (let i = 0; i < n; i++) { const j = jitter ? 1 + (rr() - 0.5) * jitter : 1; col[i * 3] = _c.r * j; col[i * 3 + 1] = _c.g * j; col[i * 3 + 2] = _c.b * j; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); this.list.push(g); return this;
  }
  /** vertical gradient on the last added part */
  merge() { for (const g of this.list) { if (!g.attributes.normal) g.computeVertexNormals(); } const m = mergeGeometries(this.list, false); m.computeBoundingSphere(); return m; }
}
export function mesh(geo, mat, { castShadow = true, receive = true } = {}) { const m = new THREE.Mesh(geo, mat); m.castShadow = castShadow; m.receiveShadow = receive; return m; }
export const vcMat = (o = {}, g) => std({ vertexColors: true, roughness: 0.8, ...o }, g);
export function tube(points, r, seg = 12, radial = 6) { return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), seg, r, radial); }
export function puff(parts, color, cx, cy, cz, n, spread, rad, seed, jitter = 0.18) {
  const r = rng(seed); for (let i = 0; i < n; i++) { const a = r() * 6.283, b = (r() - 0.3) * 1.6, d = spread * (0.35 + r() * 0.65);
    parts.add(new THREE.IcosahedronGeometry(rad * (0.6 + r() * 0.55), 2), color, { p: [cx + Math.cos(a) * d, cy + Math.sin(b) * spread * 0.55, cz + Math.sin(a) * d], jitter }); }
}
