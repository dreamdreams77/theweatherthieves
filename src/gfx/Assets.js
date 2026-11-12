import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { std, grade } from './Mat.js';

/** CC0 models / textures (see public/assets/CREDITS.md). Everything is preloaded once, then cloned or merged on demand. */
const MODELS = ['CommonTree_1', 'CommonTree_3', 'CommonTree_Autumn_1', 'CommonTree_Autumn_3', 'BirchTree_1', 'BirchTree_3', 'BirchTree_Autumn_2', 'Willow_2', 'PineTree_1', 'PineTree_3', 'PineTree_Snow_1', 'PineTree_Snow_3', 'BirchTree_Snow_2', 'CommonTree_Dead_2', 'Rock_1', 'Rock_3', 'Rock_Moss_2', 'Rock_Moss_5', 'Rock_Snow_1', 'Rock_Snow_4', 'Bush_1', 'BushBerries_2', 'Bush_Snow_1', 'Flowers', 'Plant_2', 'TreeStump_Moss', 'TreeStump_Snow', 'WoodLog_Moss', 'WoodLog_Snow', 'Lilypad', 'Fox', 'Deer', 'Stag'];

/** Palettes recolour the packs' dark, muted materials into the game's soft storybook colours (by material name). */
export const PALETTES = {
  soft: { Green: 0x5fae6a, Wood: 0x7a5640, Rock: 0x9c96aa, Snow: 0xf4f8ff, Cyan: 0x7fe0e0, Yellow: 0xffd05a, _lift: 1.45 },
  autumn: { Green: 0x6aae64, Wood: 0x7a5640, Rock: 0x9c96aa, Orange: 0xf09a3a, Red: 0xe2604a, Yellow: 0xf4c450, Snow: 0xf4f8ff, _lift: 1.5 },
  snow: { Green: 0x3f8a6c, Wood: 0x6a4a3a, Rock: 0xa8acc0, Snow: 0xf6faff, _lift: 1.35 },
  rust: { Green: 0x6a7a5a, Wood: 0x5a4436, Rock: 0x7a7480, Snow: 0xdcdce4, _lift: 1.2 },
  meadow: { Green: 0x4fae8c, Wood: 0x7a5640, Rock: 0x9c96aa, Cyan: 0x9fe8ff, Yellow: 0xffe08a, _lift: 1.45 },
};
function recolor(name, col, pal) {
  const c = col.clone(); const key = Object.keys(pal).find((k) => k !== '_lift' && name && name.toLowerCase().includes(k.toLowerCase()));
  if (key) return new THREE.Color(pal[key]);
  const hsl = {}; c.getHSL(hsl); c.setHSL(hsl.h, Math.min(1, hsl.s * 1.05), Math.min(0.85, 0.12 + hsl.l * (pal._lift || 1.4) * 1.6)); return c;
}

export const Assets = {
  gltf: {}, geo: {}, tex: {}, env: null, ready: false,
  async load(onProgress) {
    const L = new GLTFLoader(), base = './assets/'; let n = 0; const total = MODELS.length + 4;
    const tick = () => onProgress?.(++n / total);
    await Promise.all(MODELS.map(async (m) => { try { this.gltf[m] = await L.loadAsync(base + 'models/' + m + '.glb'); } catch (e) { console.warn('asset failed', m, e); } tick(); }));
    const T = new THREE.TextureLoader(); const tl = async (k, f, srgb) => { try { const t = await T.loadAsync(base + 'tex/' + f); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; this.tex[k] = t; } catch (e) { console.warn('texture failed', f); } tick(); };
    await Promise.all([tl('iceColor', 'ice_color.jpg', true), tl('iceNormal', 'ice_normal.jpg'), tl('iceRough', 'ice_rough.jpg')]);
    try { this.env = await new RGBELoader().loadAsync(base + 'env/spruit_sunrise_1k.hdr'); this.env.mapping = THREE.EquirectangularReflectionMapping; } catch (e) { console.warn('env failed'); } tick();
    this.ready = true;
  },
  has(name) { return !!this.gltf[name]; },
  /** one merged, vertex-coloured, unit-height geometry per (model, palette) */
  geometry(name, palName = 'soft') {
    const key = name + '|' + palName; if (this.geo[key]) return this.geo[key]; const g = this.gltf[name]; if (!g) return null; const pal = PALETTES[palName] || PALETTES.soft;
    const parts = []; g.scene.updateMatrixWorld(true);
    g.scene.traverse((o) => { if (!o.isMesh) return; const mats = Array.isArray(o.material) ? o.material : [o.material]; let geo = o.geometry.clone(); geo.applyMatrix4(o.matrixWorld);
      const groups = geo.groups.length ? geo.groups : [{ start: 0, count: geo.index ? geo.index.count : geo.attributes.position.count, materialIndex: 0 }];
      const flat = geo.index ? geo.toNonIndexed() : geo; const pos = flat.attributes.position, nrm = flat.attributes.normal; const col = new Float32Array(pos.count * 3);
      for (const gr of groups) { const m = mats[gr.materialIndex] || mats[0]; const c = recolor(m.name, m.color || new THREE.Color(1, 1, 1), pal); for (let i = gr.start; i < gr.start + gr.count; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; } }
      const out = new THREE.BufferGeometry(); out.setAttribute('position', pos); if (nrm) out.setAttribute('normal', nrm); else out.computeVertexNormals(); out.setAttribute('color', new THREE.BufferAttribute(col, 3)); parts.push(out); });
    let geo = mergeGeometries(parts, false); geo.computeBoundingBox(); const b = geo.boundingBox, h = b.max.y - b.min.y || 1, cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2;
    geo.translate(-cx, -b.min.y, -cz); geo.scale(1 / h, 1 / h, 1 / h); geo.computeBoundingSphere(); geo.userData.width = Math.max(b.max.x - b.min.x, b.max.z - b.min.z) / h;
    return (this.geo[key] = geo);
  },
  /** a mesh normalised to `height` metres; sway adds the shared wind-bend shader */
  mesh(name, palName, height = 1, sway = false) {
    const geo = this.geometry(name, palName); if (!geo) return null;
    const mk = sway ? 'mSway' : 'mStill'; this[mk] ??= sway ? std({ vertexColors: true, roughness: 0.85 }, { sway: 1, amp: 0.25 }) : std({ vertexColors: true, roughness: 0.9 });
    const m = new THREE.Mesh(geo, this[mk]); m.castShadow = true; m.receiveShadow = true; m.scale.setScalar(height); m.userData.width = geo.userData.width * height; return m;
  },
  /** animated character clone (skinned) with lifted colours */
  animal(name, lift = 1.5) {
    const g = this.gltf[name]; if (!g) return null; const root = SkeletonUtils.clone(g.scene);
    root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.material = (Array.isArray(o.material) ? o.material : [o.material]).map((mm) => { const c = mm.clone(); const hsl = {}; c.color.getHSL(hsl); c.color.setHSL(hsl.h, hsl.s, Math.min(0.8, 0.08 + hsl.l * lift * 1.5)); c.roughness = 0.8; grade(c); return c; }); if (o.material.length === 1) o.material = o.material[0]; } });
    return { root, clips: g.animations };
  },
};
