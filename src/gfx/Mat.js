import * as THREE from 'three';
/** Global shader uniforms shared by every graded material. */
export const G = {
  uTime: { value: 0 },
  uSat: { value: 0.62 },
  uGust: { value: new THREE.Vector4(0, 0, 0, 0.001) }, // x,y,z centre, w radius
  uGustV: { value: new THREE.Vector3() },
  uWet: { value: 0 },
};
/** Patch a MeshStandardMaterial with world grading (desaturation until weather is restored) and optional wind sway. */
export function grade(mat, { sway = 0, amp = 0.4, rim = 0 } = {}) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = G.uTime; sh.uniforms.uSat = G.uSat; sh.uniforms.uGust = G.uGust; sh.uniforms.uGustV = G.uGustV;
    sh.fragmentShader = 'uniform float uSat;\n' + sh.fragmentShader.replace('#include <opaque_fragment>',
      `float lumG = dot(outgoingLight, vec3(0.299,0.587,0.114));
       outgoingLight = mix(vec3(lumG), outgoingLight, uSat);
       ${rim ? 'outgoingLight += vec3(1.0,0.92,0.8) * pow(1.0 - clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0), 3.0) * ' + rim.toFixed(2) + ';' : ''}
       #include <opaque_fragment>`);
    if (sway > 0) {
      sh.vertexShader = 'uniform float uTime; uniform vec4 uGust; uniform vec3 uGustV;\n' + sh.vertexShader.replace('#include <begin_vertex>',
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
  };
  mat.customProgramCacheKey = () => 'grade' + sway + '_' + amp + '_' + rim;
  return mat;
}
export function std(opts = {}, gopts) {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0, ...opts });
  return grade(m, gopts);
}
