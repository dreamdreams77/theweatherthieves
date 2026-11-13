import * as THREE from 'three';
/** Global shader uniforms shared by every graded material. */
export const G = {
  uTime: { value: 0 },
  uSat: { value: 0.62 },
  uGust: { value: new THREE.Vector4(0, 0, 0, 0.001) }, // x,y,z centre, w radius
  uGustV: { value: new THREE.Vector3() },
  uWet: { value: 0 },
  // claymation look (see Clay.js): uClay = master strength (0 = plain renderer), uClayFP = thumbprint relief on/off (off on mobile),
  // uBoil = stop-motion "boil" amplitude in metres (0 with reduce motion). Uniform-driven so toggling never recompiles a shader.
  uClay: { value: 1 },
  uClayFP: { value: 1 },
  uBoil: { value: 0.008 },
};

/** Cheap 3D hash + value noise shared by the clay chunks (prefixed so they never collide with three's own helpers). */
const CLAY_NOISE = `
float clH(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float clN(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(clH(i), clH(i + vec3(1.,0.,0.)), f.x), mix(clH(i + vec3(0.,1.,0.)), clH(i + vec3(1.,1.,0.)), f.x), f.y),
             mix(mix(clH(i + vec3(0.,0.,1.)), clH(i + vec3(1.,0.,1.)), f.x), mix(clH(i + vec3(0.,1.,1.)), clH(i + vec3(1.,1.,1.)), f.x), f.y), f.z); }
`;
/**
 * Stop-motion boil: after projection, nudge every vertex by a smooth 3D noise field sampled in WORLD space whose seed re-rolls
 * 12 times a second (like an animator re-touching the clay between exposures). World space means parts that touch (eye on a head,
 * an outline hull on its mesh) move together, and a position-only offset never cracks split normals. Fades out with distance.
 */
const boilChunk = (k) => `
#include <project_vertex>
if (uBoil > 0.0) {
  float clBF = (1.0 - smoothstep(14.0, 32.0, -mvPosition.z)) * ${k.toFixed(3)};
  if (clBF > 0.0) {
    vec3 clW = (mvPosition.xyz - viewMatrix[3].xyz) * mat3(viewMatrix);
    float clFr = floor(uTime * 12.0);
    vec3 clQ = clW * 5.5 + fract(vec3(clFr * 0.1713, clFr * 0.3711, clFr * 0.5293)) * 97.0;
    vec3 clO = vec3(clN(clQ), clN(clQ + 19.1), clN(clQ + 41.7)) - 0.5;
    mvPosition.xyz += mat3(viewMatrix) * clO * (uBoil * 3.0 * clBF);
    gl_Position = projectionMatrix * mvPosition;
  }
}`;
/** Add the boil to any three.js built-in material's shader (used directly by the characters' ink-outline hulls). */
export function boilPatch(sh, k = 1) {
  sh.uniforms.uTime = G.uTime; sh.uniforms.uBoil = G.uBoil;
  sh.vertexShader = 'uniform float uTime; uniform float uBoil;\n' + CLAY_NOISE + sh.vertexShader.replace('#include <project_vertex>', boilChunk(k));
}

/** Fragment side: hand-kneaded unevenness + thumbprint whorls as a height field, turned into a bump on the shading normal. */
const CLAY_FRAG_PARS = `
uniform float uClay, uClayFP; varying vec3 vClayP;
float clayHeight(vec3 p, float px, out float ridge){
  // broad kneading lumps + a finer knuckle-and-palm unevenness
  float h = (clN(p * 3.1) - 0.5) * 0.04 + (clN(p * 8.5 + 7.0) - 0.5) * 0.01;
  ridge = 0.0;
  const float SP = 0.019;                               // ridge spacing (m): exaggerated so it reads at game scale
  if (uClayFP > 0.5 && px < SP * 0.6) {               // skip the whorls entirely once they would be sub-pixel (most distant pixels)
    // nearest "thumb press" among the 8 closest jittered cells
    const float S = 0.24; vec3 q = p / S, c0 = floor(q - 0.5); float bd = 9.0, bid = 0.0;
    for (int z = 0; z < 2; z++) for (int y = 0; y < 2; y++) for (int x = 0; x < 2; x++) {
      vec3 c = c0 + vec3(float(x), float(y), float(z)); float id = clH(c + 0.37);
      vec3 ctr = c + 0.5 + (vec3(clH(c + 11.1), clH(c + 23.7), id) - 0.5) * 0.5;
      float d = length(q - ctr); if (d < bd) { bd = d; bid = id; }
    }
    float m = smoothstep(0.55, 0.15, bd) * step(0.15, bid);
    float rM = bd * S + (clN(p * 36.0) - 0.5) * 0.007;   // ring radius (m), warped so the whorl is hand-made, not machined
    float aa = 1.0 - smoothstep(SP * 0.22, SP * 0.6, px); // fade the ridges out before they alias
    ridge = (0.5 + 0.5 * cos(rM * 6.2832 / SP + bid * 40.0)) * m * aa;
    h += ridge * 0.0013 - m * m * 0.01 * (1.0 - smoothstep(SP * 0.3, SP * 0.6, px)); // ridges + the thumb's shallow dent (faded, so the cut-off is seamless)
  }
  return h;
}
vec3 clayBump(vec3 sp, vec3 n, vec2 dH, float fd){
  vec3 sx = dFdx(sp), sy = dFdy(sp), r1 = cross(sy, n), r2 = cross(n, sx);
  float det = dot(sx, r1) * fd; vec3 g = sign(det) * (dH.x * r1 + dH.y * r2);
  return normalize(abs(det) * n - g);
}
`;
const CLAY_NORMAL = `
#include <normal_fragment_maps>
float clRidge = 0.0;
float clDist = length(vViewPosition);
if (uClay > 0.0 && clDist < 90.0) {
  float clPx = max(length(dFdx(vClayP)), length(dFdy(vClayP)));
  float clHt = clayHeight(vClayP, clPx, clRidge) * uClay * (1.0 - smoothstep(30.0, 90.0, clDist));
  normal = clayBump(-vViewPosition, normal, vec2(dFdx(clHt), dFdy(clHt)), faceDirection);
  // albedo: uneven kneading blotches, darker grooves in the print, and tiny dust crumbs (all fade out with pixel size)
  float clB = clN(vClayP * 4.3 + 3.0), clCr = smoothstep(0.82, 0.9, clN(vClayP * 70.0)) * (1.0 - smoothstep(0.004, 0.012, clPx));
  diffuseColor.rgb *= 1.0 + uClay * ((clB - 0.5) * 0.16 - clRidge * 0.07 - clCr * 0.22);
  roughnessFactor = clamp(roughnessFactor * (0.9 + 0.2 * clN(vClayP * 6.0)) + clRidge * 0.08 * uClay, 0.04, 1.0);
}
`;
/** Warm sub-surface wrap on the key light's terminator + tiny wet specular glints (the "fresh plasticine" sparkle). */
const CLAY_LIGHT = `
#if NUM_DIR_LIGHTS > 0
if (uClay > 0.0) {
  vec3 clL = directionalLights[0].direction, clC = directionalLights[0].color;
  float clNl = dot(normal, clL);
  float clWr = max(0.0, (clNl + 0.55) / 1.55); clWr *= clWr;
  outgoingLight += diffuseColor.rgb * clC * max(0.0, clWr - max(clNl, 0.0)) * vec3(0.32, 0.13, 0.07) * uClay;
  float clNh = max(dot(normal, normalize(clL + normalize(vViewPosition))), 0.0);
  float clGm = smoothstep(0.6, 0.78, clN(vClayP * 24.0)) * step(0.0, clNl);
  outgoingLight += clC * pow(clNh, 260.0) * clGm * 0.7 * uClay * (1.0 - metalnessFactor);
}
#endif
`;

/**
 * Patch a MeshStandardMaterial with world grading (desaturation until weather is restored), optional wind sway, rim light and
 * the claymation layer: fingerprint/kneaded micro-relief, warm wrap light, wet glints and the 12 fps boil (boil: 0 disables it).
 */
export function grade(mat, { sway = 0, amp = 0.4, rim = 0, boil = 1 } = {}) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = G.uTime; sh.uniforms.uSat = G.uSat; sh.uniforms.uGust = G.uGust; sh.uniforms.uGustV = G.uGustV;
    sh.uniforms.uClay = G.uClay; sh.uniforms.uClayFP = G.uClayFP; sh.uniforms.uBoil = G.uBoil;
    sh.fragmentShader = 'uniform float uSat;\n' + CLAY_NOISE + CLAY_FRAG_PARS + sh.fragmentShader
      .replace('#include <normal_fragment_maps>', CLAY_NORMAL)
      .replace('#include <opaque_fragment>',
      `${CLAY_LIGHT}
       float lumG = dot(outgoingLight, vec3(0.299,0.587,0.114));
       outgoingLight = mix(vec3(lumG), outgoingLight, uSat);
       ${rim ? 'outgoingLight += vec3(1.0,0.92,0.8) * pow(1.0 - clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0), 3.0) * ' + rim.toFixed(2) + ';' : ''}
       #include <opaque_fragment>`);
    let vs = sh.vertexShader.replace('#include <begin_vertex>',
      `#include <begin_vertex>
      {
        #ifdef USE_INSTANCING
          vClayP = transformed * length((modelMatrix * instanceMatrix)[0].xyz);
        #else
          vClayP = transformed * length(modelMatrix[0].xyz);
        #endif
      }`);
    if (sway > 0) {
      vs = vs.replace('#include <begin_vertex>',
        `#include <begin_vertex>
        {
          #ifdef USE_INSTANCING
            vec4 wp0 = modelMatrix * instanceMatrix * vec4(0.,0.,0.,1.);
          #else
            vec4 wp0 = modelMatrix * vec4(0.,0.,0.,1.);
          #endif
          float hh = max(position.y,0.)/${sway.toFixed(3)}; hh = hh*hh;
          float ph = wp0.x*0.35 + wp0.z*0.27;
          vec3 off = vec3(sin(uTime*1.7+ph), 0., cos(uTime*1.3+ph*1.3))*${amp.toFixed(3)}*0.35;
          float gd = distance(wp0.xz, uGust.xz);
          float gf = smoothstep(uGust.w, 0., gd) * step(abs(wp0.y-uGust.y), 7.);
          off += vec3(uGustV.x, -0.15*length(uGustV.xz), uGustV.z) * gf * ${amp.toFixed(3)};
          transformed += off*hh*${sway.toFixed(3)};
        }`);
    }
    if (boil > 0) vs = vs.replace('#include <project_vertex>', boilChunk(boil));
    sh.vertexShader = 'uniform float uTime; uniform vec4 uGust; uniform vec3 uGustV; uniform float uBoil; varying vec3 vClayP;\n' + CLAY_NOISE + vs;
  };
  mat.customProgramCacheKey = () => 'clay1_' + sway + '_' + amp + '_' + rim + '_' + boil;
  return mat;
}
export function std(opts = {}, gopts) {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0, ...opts });
  return grade(m, gopts);
}
