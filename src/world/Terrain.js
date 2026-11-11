import * as THREE from 'three';
/** Walkable surfaces + circle colliders. Everything the characters stand on goes through here. */
export class Terrain {
  constructor() { this.islands = []; this.surfaces = []; this.colliders = []; }
  addIsland(i) { this.islands.push(i); this.surfaces.push(i); }
  addSurface(s) { this.surfaces.push(s); }
  addCollider(c) { c.enabled ??= true; c.y0 ??= -1e3; c.y1 ??= 1e3; this.colliders.push(c); return c; }
  /** highest surface at or below yRef+step */
  groundAt(x, z, yRef = 1e3, step = 0.7) {
    let best = -Infinity, surf = null;
    for (const s of this.surfaces) {
      if (s.enabled === false) continue;
      const h = s.heightAt(x, z);
      if (h > best && h <= yRef + step) { best = h; surf = s; }
    }
    return best === -Infinity ? null : { y: best, surf };
  }
  /** top-most surface height regardless of reference (for ray marching) */
  topAt(x, z) { let b = -Infinity; for (const s of this.surfaces) { if (s.enabled === false) continue; const h = s.heightAt(x, z); if (h > b) b = h; } return b; }
  push(pos, radius, y = pos.y) {
    for (const c of this.colliders) {
      if (!c.enabled || y > c.y1 || y + 1 < c.y0) continue;
      const dx = pos.x - c.x, dz = pos.z - c.z, rr = radius + c.r, d2 = dx * dx + dz * dz;
      if (d2 < rr * rr) { const d = Math.sqrt(d2) || 1e-4; pos.x = c.x + (dx / d) * rr; pos.z = c.z + (dz / d) * rr; }
    }
  }
}
/** Rope bridge walking surface (a thick segment with sag). */
export class BridgeSurface {
  constructor(a, b, width = 2.2, sag = 0.7) { this.a = a.clone(); this.b = b.clone(); this.w = width; this.sag = sag; this.enabled = true; this.isBridge = true;
    this.d = new THREE.Vector2(b.x - a.x, b.z - a.z); this.len = this.d.length(); this.d.normalize(); }
  heightAt(x, z) {
    const px = x - this.a.x, pz = z - this.a.z, t = (px * this.d.x + pz * this.d.y) / this.len;
    if (t < -0.01 || t > 1.01) return -Infinity;
    const off = Math.abs(px * -this.d.y + pz * this.d.x);
    if (off > this.w * 0.5) return -Infinity;
    const tt = Math.min(1, Math.max(0, t));
    return this.a.y + (this.b.y - this.a.y) * tt - this.sag * 4 * tt * (1 - tt);
  }
}
/** Flat or moving platform (lift, ice sheet). */
export class DiscSurface {
  constructor(x, z, r, y) { this.x = x; this.z = z; this.r = r; this.y = y; this.enabled = true; }
  heightAt(x, z) { return Math.hypot(x - this.x, z - this.z) < this.r ? this.y : -Infinity; }
}
