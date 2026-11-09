import * as THREE from 'three';
import { std } from '../gfx/Mat.js';
import { clamp, damp, lerp } from '../core/Utils.js';

const outlineMat = new THREE.MeshBasicMaterial({ color: 0x2b1d33, side: THREE.BackSide });
outlineMat.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed += normalize(normal) * 0.018;'); };
outlineMat.customProgramCacheKey = () => 'outline';
/** Add a mesh with an inverted-hull outline (film-style ink line). */
export function inked(parent, geo, mat, { p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0], outline = true, name } = {}) {
  const m = new THREE.Mesh(geo, mat); m.position.set(...p); m.scale.set(...s); m.rotation.set(...r); m.castShadow = !!outline; if (name) m.name = name;
  if (outline) { const o = new THREE.Mesh(geo, outlineMat); o.renderOrder = -1; m.add(o); }
  parent.add(m); return m;
}
export const cmat = (color, o = {}) => std({ color, roughness: 0.6, ...o }, { rim: 0.35 });
export function node(parent, name, x = 0, y = 0, z = 0) { const n = new THREE.Group(); n.name = name; n.position.set(x, y, z); parent.add(n); return n; }
export const capsule = (r, len) => new THREE.CapsuleGeometry(r, len, 6, 12);
export function lathe(pts, seg = 20) { return new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg); }

/** Chain-follow cloth ribbon (scarf / coat tail). Positions are simulated in world space. */
export class Ribbon {
  constructor(parent, { segs = 9, len = 0.9, w0 = 0.09, w1 = 0.07, color = 0x2aa198, side = THREE.DoubleSide, stripe = 0 } = {}) {
    this.segs = segs; this.len = len / segs; this.w0 = w0; this.w1 = w1; this.pts = []; this.parent = parent;
    for (let i = 0; i < segs + 1; i++) this.pts.push(new THREE.Vector3());
    const n = (segs + 1) * 2, pos = new Float32Array(n * 3), idx = [], col = new Float32Array(n * 3), c = new THREE.Color(color), c2 = new THREE.Color(stripe || color);
    for (let i = 0; i < segs; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    for (let i = 0; i <= segs; i++) { const cc = stripe && i % 3 === 1 ? c2 : c; for (let k = 0; k < 2; k++) { const j = (i * 2 + k) * 3; col[j] = cc.r; col[j + 1] = cc.g; col[j + 2] = cc.b; } }
    this.geo = new THREE.BufferGeometry(); this.geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); this.geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); this.geo.setIndex(idx);
    this.mesh = new THREE.Mesh(this.geo, std({ vertexColors: true, side, roughness: 0.9 })); this.mesh.frustumCulled = false; this.mesh.castShadow = true;
    // lives in world space (added to scene by owner)
    this.init = false; this._v = new THREE.Vector3(); this._s = new THREE.Vector3();
  }
  /** anchor: world position, side: world unit vector for ribbon width, wind: world accel vec */
  update(dt, anchor, side, wind, vel) {
    const p = this.pts; if (!this.init) { for (let i = 0; i < p.length; i++) p[i].copy(anchor).addScaledVector(wind, 0); this.init = true; }
    p[0].copy(anchor);
    for (let i = 1; i < p.length; i++) {
      const prev = p[i - 1], cur = p[i];
      cur.y -= 1.6 * dt * (i / p.length + 0.2);
      cur.addScaledVector(wind, dt * (0.4 + i / p.length));
      cur.addScaledVector(vel, -dt * 0.9 * (1 / i));
      cur.x += Math.sin(performance.now() * 0.004 + i * 0.7) * 0.01 * i * dt * 20 * (wind.lengthSq() > 0.01 ? 2 : 0.5);
      this._v.subVectors(cur, prev); const l = this._v.length() || 1e-4; this._v.multiplyScalar(this.len / l); cur.copy(prev).add(this._v);
    }
    const pos = this.geo.attributes.position.array;
    for (let i = 0; i < p.length; i++) {
      const w = lerp(this.w0, this.w1, i / (p.length - 1)) * (1 + 0.15 * Math.sin(i * 1.3 + performance.now() * 0.006));
      const j = i * 6; pos[j] = p[i].x + side.x * w; pos[j + 1] = p[i].y + side.y * w; pos[j + 2] = p[i].z + side.z * w;
      pos[j + 3] = p[i].x - side.x * w; pos[j + 4] = p[i].y - side.y * w; pos[j + 5] = p[i].z - side.z * w;
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.computeVertexNormals(); this.geo.computeBoundingSphere();
  }
}

const eq = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
function qtrack(name, keys) { // keys: [time,[x,y,z]]
  const times = [], vals = []; for (const [t, e] of keys) { times.push(t); const q = eq(...e); vals.push(q.x, q.y, q.z, q.w); }
  return new THREE.QuaternionKeyframeTrack(name + '.quaternion', times, vals);
}
function ptrack(name, keys) { const times = [], vals = []; for (const [t, v] of keys) { times.push(t); vals.push(...v); } return new THREE.VectorKeyframeTrack(name + '.position', times, vals); }

/** Generic biped skeleton of pivot nodes with procedural locomotion + AnimationMixer gestures. */
export class Biped {
  constructor(d) {
    this.d = d; this.root = new THREE.Group(); const n = this.n = {};
    n.body = node(this.root, 'body', 0, d.legU + d.legL + d.footH);
    n.bodyG = node(n.body, 'body_g');
    n.spine = node(n.bodyG, 'spine');
    n.neck = node(n.spine, 'neck', 0, d.torsoH);
    n.head = node(n.neck, 'head', 0, d.neckH ?? 0.04);
    n.headG = node(n.head, 'head_g');
    n.headC = node(n.headG, 'headC', 0, d.headY);
    for (const s of [-1, 1]) {
      const k = s < 0 ? 'L' : 'R';
      n['sh' + k] = node(n.spine, 'sh' + k, s * d.shX, d.shY, 0);
      n['arm' + k + 'G'] = node(n['sh' + k], 'arm' + k + '_g');
      n['el' + k] = node(n['arm' + k + 'G'], 'el' + k, 0, -d.armU, 0);
      n['hip' + k] = node(n.body, 'hip' + k, s * d.hipX, 0, 0);
      n['knee' + k] = node(n['hip' + k], 'knee' + k, 0, -d.legU, 0);
      n['foot' + k] = node(n['knee' + k], 'foot' + k, 0, -d.legL, 0);
    }
    this.phase = 0; this.sq = 0; this.sqV = 0; this.wasGround = true; this.lean = 0; this.t = Math.random() * 10; this.armAim = { L: 0, R: 0 }; this.aimDir = { L: null, R: null };
    this.breath = 0; this.mood = 0; this.slump = 0; this.headLook = new THREE.Vector2();
    this.mixer = new THREE.AnimationMixer(this.root); this.actions = {};
    this.addClips();
  }
  addClips() {
    const A = (name, dur, tracks, loop = false) => { const c = new THREE.AnimationClip(name, dur, tracks); const a = this.mixer.clipAction(c); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = false; this.actions[name] = a; };
    A('wave', 1.6, [qtrack('armR_g', [[0, [0, 0, 0]], [0.25, [0, 0, 2.6]], [0.5, [0, 0, 2.2]], [0.75, [0, 0, 2.7]], [1.0, [0, 0, 2.2]], [1.3, [0, 0, 2.6]], [1.6, [0, 0, 0]]]), qtrack('head_g', [[0, [0, 0, 0]], [0.4, [0, 0, -0.12]], [1.2, [0, 0, -0.12]], [1.6, [0, 0, 0]]])]);
    A('cheer', 1.3, [qtrack('armL_g', [[0, [0, 0, 0]], [0.2, [0, 0, -2.9]], [0.5, [0, 0, -2.6]], [0.8, [0, 0, -2.9]], [1.3, [0, 0, 0]]]), qtrack('armR_g', [[0, [0, 0, 0]], [0.2, [0, 0, 2.9]], [0.5, [0, 0, 2.6]], [0.8, [0, 0, 2.9]], [1.3, [0, 0, 0]]]),
      ptrack('body_g', [[0, [0, 0, 0]], [0.15, [0, -0.08, 0]], [0.35, [0, 0.22, 0]], [0.6, [0, 0, 0]], [0.8, [0, 0.2, 0]], [1.0, [0, 0, 0]], [1.3, [0, 0, 0]]]), qtrack('head_g', [[0, [0, 0, 0]], [0.35, [-0.35, 0, 0]], [1.3, [0, 0, 0]]])]);
    A('shrug', 1.4, [qtrack('armL_g', [[0, [0, 0, 0]], [0.25, [0, 0, -0.9]], [1.0, [0, 0, -0.9]], [1.4, [0, 0, 0]]]), qtrack('armR_g', [[0, [0, 0, 0]], [0.25, [0, 0, 0.9]], [1.0, [0, 0, 0.9]], [1.4, [0, 0, 0]]]),
      qtrack('head_g', [[0, [0, 0, 0]], [0.3, [0, 0, 0.25]], [1.0, [0, 0, 0.25]], [1.4, [0, 0, 0]]]), ptrack('body_g', [[0, [0, 0, 0]], [0.25, [0, -0.03, 0]], [1.0, [0, -0.03, 0]], [1.4, [0, 0, 0]]])]);
    A('nod', 0.8, [qtrack('head_g', [[0, [0, 0, 0]], [0.2, [0.35, 0, 0]], [0.4, [-0.05, 0, 0]], [0.6, [0.3, 0, 0]], [0.8, [0, 0, 0]]])]);
    A('shake', 0.9, [qtrack('head_g', [[0, [0, 0, 0]], [0.18, [0, 0.45, 0]], [0.4, [0, -0.45, 0]], [0.62, [0, 0.35, 0]], [0.9, [0, 0, 0]]])]);
    A('sigh', 2.0, [qtrack('head_g', [[0, [0, 0, 0]], [0.5, [0.45, 0, 0.05]], [1.5, [0.4, 0, 0.05]], [2, [0, 0, 0]]]), ptrack('body_g', [[0, [0, 0, 0]], [0.5, [0, -0.07, 0]], [1.5, [0, -0.07, 0]], [2, [0, 0, 0]]]),
      qtrack('armL_g', [[0, [0, 0, 0]], [0.6, [0.2, 0, -0.12]], [1.5, [0.2, 0, -0.12]], [2, [0, 0, 0]]]), qtrack('armR_g', [[0, [0, 0, 0]], [0.6, [0.2, 0, 0.12]], [1.5, [0.2, 0, 0.12]], [2, [0, 0, 0]]])]);
    A('startle', 0.9, [ptrack('body_g', [[0, [0, 0, 0]], [0.1, [0, 0.25, -0.15]], [0.3, [0, 0, -0.1]], [0.9, [0, 0, 0]]]), qtrack('armL_g', [[0, [0, 0, 0]], [0.1, [-0.6, 0, -1.6]], [0.9, [0, 0, 0]]]), qtrack('armR_g', [[0, [0, 0, 0]], [0.1, [-0.6, 0, 1.6]], [0.9, [0, 0, 0]]]), qtrack('head_g', [[0, [0, 0, 0]], [0.1, [-0.3, 0, 0]], [0.9, [0, 0, 0]]])]);
    A('point', 1.2, [qtrack('head_g', [[0, [0, 0, 0]], [0.3, [-0.1, 0.25, 0]], [1.0, [-0.1, 0.25, 0]], [1.2, [0, 0, 0]]])]);
  }
  play(name, fade = 0.12) { const a = this.actions[name]; if (!a) return; a.reset().setEffectiveWeight(1).fadeIn(fade).play(); }
  /** point an arm along a local direction (relative to body yaw) */
  aim(side, dirLocal) { this.aimDir[side] = dirLocal; }
  /** procedural layer. c: {speed, maxSpeed, grounded, vy, windX, windZ, yawRate} */
  animate(dt, c) {
    const d = this.d, n = this.n; this.t += dt; const t = this.t;
    const sp = c.speed, mv = clamp(sp / (c.maxSpeed || 5), 0, 1.4), ground = c.grounded;
    this.phase += dt * (sp * d.stride + (sp > 0.1 ? 1.5 : 0)) * (ground ? 1 : 0);
    const ph = this.phase, sw = Math.sin(ph), cw = Math.cos(ph);
    const walk = ground ? clamp(mv * 1.6, 0, 1) : 0, idle = 1 - walk;
    // landing / take-off squash spring
    if (this.wasGround !== ground) { if (ground) this.sqV -= clamp(-(this.lastVy || -3), 2, 14) * 0.9; else if (c.vy > 1) this.sqV += 3.5; this.wasGround = ground; }
    this.lastVy = c.vy;
    this.sqV += (-70 * this.sq - 9 * this.sqV) * dt; this.sq += this.sqV * dt;
    const sqS = clamp(this.sq * 0.09, -0.3, 0.3) + (ground ? 0 : clamp(c.vy * 0.012, -0.12, 0.15));
    n.body.scale.set(1 - sqS * 0.5, 1 + sqS, 1 - sqS * 0.5);
    const bob = Math.abs(cw) * d.bob * walk; n.body.position.y = d.legU + d.legL + d.footH + bob - (1 - idle) * 0.0 - this.slump * 0.04 + Math.sin(t * 1.7) * 0.006 * idle;
    this.lean = damp(this.lean, clamp(sp / (c.maxSpeed || 5), 0, 1) * d.lean, 8, dt);
    n.spine.rotation.x = this.lean + d.slouch + Math.sin(t * 1.7) * 0.015 * idle + this.slump * 0.1;
    n.spine.rotation.y = sw * 0.12 * walk * d.twist; n.spine.rotation.z = Math.sin(t * 0.6) * 0.012 * idle + cw * 0.04 * walk;
    n.head.rotation.x = -n.spine.rotation.x * 0.6 + this.headLook.y * 0.5 + Math.sin(t * 1.1) * 0.012; n.head.rotation.y = this.headLook.x * 0.9 - n.spine.rotation.y * 0.8;
    // legs
    const amp = d.legSwing;
    for (const [k, s] of [['L', 1], ['R', -1]]) {
      const p = sw * s, p2 = Math.cos(ph) * s;
      if (ground) {
        n['hip' + k].rotation.x = -p * amp * walk + Math.sin(t * 0.9) * 0.01;
        n['knee' + k].rotation.x = Math.max(0, -Math.sin(ph + (s > 0 ? 0 : Math.PI) + 0.9)) * amp * 1.5 * walk + (k === 'L' ? 0.02 : 0) ;
        n['foot' + k].rotation.x = -n['hip' + k].rotation.x * 0.5 - n['knee' + k].rotation.x * 0.4;
      } else {
        const up = clamp(c.vy * 0.06, -0.5, 0.6);
        n['hip' + k].rotation.x = damp(n['hip' + k].rotation.x, (s > 0 ? -0.5 : 0.3) - up, 12, dt); n['knee' + k].rotation.x = damp(n['knee' + k].rotation.x, s > 0 ? 0.9 : 0.4, 12, dt); n['foot' + k].rotation.x = 0.3;
      }
    }
    // arms
    for (const [k, s] of [['L', 1], ['R', -1]]) {
      const sh = n['sh' + k], el = n['el' + k], aim = this.aimDir[k];
      let tx = sw * s * d.armSwing * walk * 0.9, tz = s * (d.armOut + Math.sin(t * 1.3 + s) * 0.015 * idle) * 1, ty = 0, tel = -0.2 - walk * 0.35 - (ground ? 0 : 0.4);
      if (!ground) { tx = -0.4; tz = s * (0.9 + clamp(-c.vy * 0.05, 0, 0.7)); }
      sh.rotation.order = 'YXZ';
      if (aim) {
        const yaw = Math.atan2(aim.x, aim.z), pitch = Math.atan2(aim.y, Math.hypot(aim.x, aim.z));
        this.armAim[k] = damp(this.armAim[k], 1, 12, dt);
        const a = this.armAim[k];
        sh.rotation.y = lerp(sh.rotation.y, yaw, a); sh.rotation.x = lerp(tx, -(Math.PI / 2 + pitch), a); sh.rotation.z = lerp(tz, 0, a); el.rotation.x = lerp(tel, -0.15, a);
      } else {
        this.armAim[k] = damp(this.armAim[k], 0, 10, dt);
        sh.rotation.y = damp(sh.rotation.y, 0, 12, dt); sh.rotation.x = tx + (c.windHold ? -0.9 : 0); sh.rotation.z = tz; el.rotation.x = tel;
        sh.rotation.x += this.slump * 0.06;
      }
    }
    this.aimDir.L = this.aimDir.R = null;
    this.mixer.update(dt);
  }
}
