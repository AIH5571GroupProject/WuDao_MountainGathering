import * as THREE from 'three';

// Scatter in screen space so the distance travelled is independent of depth and lens.
// At 100% the point centre is beyond an edge, including its soft fringe.
export const screenDispersal = /* glsl */ `
vec4 disperseToEdges(vec4 clip, float seed, float amount) {
  if (clip.w <= 0. || amount <= 0.) return clip;
  vec2 uv = clip.xy / clip.w;
  float angle = seed * 6.283185;
  vec2 radial = clamp(uv, -1., 1.) + vec2(cos(angle), sin(angle)) * .36;
  vec2 edge = radial / max(max(abs(radial.x), abs(radial.y)), .001) * (1.32 + seed * .7);
  float stagger = smoothstep(seed * .20, .88 + seed * .12, amount);
  clip.xy = mix(uv, edge, stagger) * clip.w;
  return clip;
}
`;

const fieldVertex = /* glsl */ `
attribute float aSize;
attribute float aSeed;
attribute float aKind;
attribute float aWander;
uniform float uTime;
uniform float uDpr;
uniform float uVisibility;
uniform float uAssembly;
uniform float uScatter;
uniform float uPage;
uniform float uMotion;
uniform float uScale;
uniform vec3 uPointer;
uniform vec3 uFocus;
uniform vec3 uRipple;
uniform float uRippleAge;
uniform float uHover;
varying vec3 vColor;
varying float vDistance;
varying float vAlpha;
${screenDispersal}
void main() {
  float s = aSeed * 71.123;
  vec3 p = position;
  vec3 drift = vec3(sin(uTime * .27 + s + p.y * .21), cos(uTime * .22 + s * 1.7) * .45, sin(uTime * .19 + s * .9));
  p += drift * aWander * uMotion;
  p += vec3(sin(s * 1.3), cos(s * 2.3), sin(s * .7)) * (1. - uAssembly) * 2.5;
  // The same particles travel outward, then settle into the chapter margins.
  vec3 destination = vec3((aSeed > .5 ? 1. : -1.) * (5.8 + abs(position.x) * .3), position.y * .8, position.z - 5.);
  p = mix(p, destination, uPage);
  vec3 world = (modelMatrix * vec4(p, 1.)).xyz;
  vec3 toPointer = world - uPointer;
  float pointerDistance = length(toPointer);
  float influence = 1. - smoothstep(0., 3.4, pointerDistance);
  world += toPointer / max(pointerDistance, .02) * influence * .36 * uMotion;
  float rippleDistance = length(world.xz - uRipple.xz);
  float wave = exp(-pow(rippleDistance - uRippleAge * 5., 2.) * .65) * exp(-uRippleAge * 1.25);
  world.y += wave * .22 * step(0., uRippleAge) * uMotion;
  vec4 mv = viewMatrix * vec4(world, 1.);
  gl_Position = disperseToEdges(projectionMatrix * mv, aSeed, uScatter);
  float limit = aKind > 2.5 ? 64. : (aKind > 1.5 ? 22. : 18.);
  gl_PointSize = clamp(aSize * uScale * (185. / max(-mv.z, 1.)), 2.0, limit) * uDpr;
  float focus = 1. - smoothstep(2., 8., distance(world, uFocus));
  vColor = mix(color, vec3(.25, .34, .22), focus * uHover * .35);
  vDistance = length(mv.xyz);
  float base = aKind > 2.5 ? .09 : (aKind > .5 && aKind < 1.5 ? .36 : .82);
  vAlpha = base * uVisibility * (1. - uPage * .18);
}`;
const fragment = /* glsl */ `
uniform vec3 uPaper;
uniform float uFog;
varying vec3 vColor;
varying float vDistance;
varying float vAlpha;
void main() {
  vec2 uv = gl_PointCoord - .5;
  float r = dot(uv, uv);
  if (r > .25) discard;
  // A readable colour core and a wide, soft Gaussian skirt; no neon bloom on paper.
  float radius = sqrt(r) * 2.;
  float core = 1. - smoothstep(.12, .79, radius);
  float halo = exp(-r * 16.) * (1. - smoothstep(.7, 1., radius));
  float alpha = (core * .66 + halo * .34) * vAlpha;
  float light = clamp(.5 - uv.x * .7 + uv.y * .5, 0., 1.);
  vec3 petal = mix(vColor * .89, mix(vColor, uPaper, .27), light);
  petal = mix(petal, uPaper, core * .10);
  float fog = 1. - exp(-pow(vDistance * uFog, 2.));
  gl_FragColor = vec4(mix(petal, uPaper, min(.92, fog)), alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function createFieldMaterial(fog = .0045) {
  return new THREE.ShaderMaterial({ vertexShader: fieldVertex, fragmentShader: fragment, vertexColors: true,
    transparent: true, depthWrite: false, uniforms: {
      uScale: { value: 2.8 }, uScatter: { value: 0 }, uPage: { value: 0 }, uTime: { value: 0 }, uDpr: { value: 1 }, uVisibility: { value: 1 }, uAssembly: { value: 1 }, uMotion: { value: 1 },
      uPointer: { value: new THREE.Vector3(1e5, 1e5, 1e5) }, uFocus: { value: new THREE.Vector3(1e5, 1e5, 1e5) },
      uRipple: { value: new THREE.Vector3() }, uRippleAge: { value: 100 }, uHover: { value: 0 },
      uPaper: { value: new THREE.Color('#e9ecdf') }, uFog: { value: fog },
    } });
}

const actorVertex = /* glsl */ `
attribute vec3 aOffset;
attribute float aPart;
attribute float aT;
attribute float aSide;
attribute float aSize;
attribute float aSeed;
uniform float uTime;
uniform float uDpr;
uniform float uVisibility;
uniform float uAssembly;
uniform float uScatter;
uniform float uPage;
uniform float uStyle;
varying vec3 vColor;
varying float vDistance;
varying float vAlpha;
${screenDispersal}
void main() {
  float dir = -aSide;
  float speed = 1.9 + uStyle * .13;
  float t = uTime * speed + aSide * .8;
  float punch = pow(max(0., sin(t)), 3.);
  float sway = sin(t * .53) * .055;
  vec3 hip = vec3(sway, .98, 0.);
  vec3 shoulder = vec3(sway + dir * .035, 1.76, 0.);
  vec3 elbow = vec3(dir * (.38 + punch * .12), 1.45 + punch * .14, .08);
  vec3 hand = vec3(dir * (.70 + punch * .44), 1.57 + punch * .06, .13);
  vec3 kneeA = vec3(-.34, .45, .03);
  vec3 kneeB = vec3(.34, .40, -.06);
  vec3 p;
  if (aPart < .5) p = mix(hip, shoulder, aT) + aOffset;
  else if (aPart < 1.5) p = vec3(sway + dir * .04, 2.12, .01) + aOffset;
  else if (aPart < 2.5) p = mix(shoulder, elbow, aT) + aOffset;
  else if (aPart < 3.5) p = mix(elbow, hand, aT) + aOffset * .8;
  else if (aPart < 4.5) p = mix(shoulder - vec3(0., .14, .16), vec3(dir * .35, 1.83, .15), aT) + aOffset * .8;
  else if (aPart < 5.5) p = mix(hip, kneeA, aT) + aOffset;
  else if (aPart < 6.5) p = mix(kneeA, vec3(-.53, .06, .05), aT) + aOffset * .8;
  else if (aPart < 7.5) p = mix(hip, kneeB, aT) + aOffset;
  else p = mix(kneeB, vec3(.57, .06, -.13), aT) + aOffset * .8;
  p.x += aSide * 1.30;
  p.z += sin(t * .4) * .035;
  p += vec3(sin(aSeed * 51.), cos(aSeed * 83.), sin(aSeed * 31.)) * (1. - uAssembly) * 1.8;
  vec3 margin = vec3(aSide * (5.5 + aSeed * 1.6), .5 + aSeed * 5., -3. - aSeed * 7.);
  p = mix(p, margin, uPage);
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = disperseToEdges(projectionMatrix * mv, aSeed, uScatter);
  gl_PointSize = clamp(aSize * (285. / max(-mv.z, 1.)), 2.2, 18.) * uDpr;
  vColor = color;
  vDistance = length(mv.xyz);
  vAlpha = .88 * uVisibility * (1. - .35 * uPage);
}`;
export function createActorMaterial() {
  return new THREE.ShaderMaterial({ vertexShader: actorVertex, fragmentShader: fragment, vertexColors: true, transparent: true,
    depthWrite: false, uniforms: { uScatter: { value: 0 }, uPage: { value: 0 }, uTime: { value: 0 }, uDpr: { value: 1 }, uVisibility: { value: 0 }, uAssembly: { value: 0 },
      uStyle: { value: 0 }, uPaper: { value: new THREE.Color('#e9ecdf') }, uFog: { value: .016 } } });
}
