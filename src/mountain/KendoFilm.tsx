import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, Group, ShaderMaterial } from 'three';
import { makeKendoLandscape, makeSwordsmanParts } from './kendoGeometry';
import { screenDispersal } from './materials';
import { smoothstep } from './model';

type FilmState = { activeStage: string | null; visibility: number; scatter: number };
const vertex = /* glsl */ `
attribute float aSize;
attribute float aSeed;
attribute float aBend;
uniform float uTime;
uniform float uWind;
uniform float uScatter;
uniform float uDpr;
uniform float uLimit;
varying vec3 vColor;
varying float vDepth;
varying float vStretch;
${screenDispersal}
void main() {
  vec3 p = position;
  float phase = uTime * 2.9 + p.z * .31 - p.x * .22;
  float gust = (.58 + .36 * sin(phase) + .13 * sin(phase * 2.4)) * uWind;
  p.x += gust * aBend;
  p.y -= abs(gust) * aBend * .17;
  if (aBend > 1.4) {
    p.x = mod(p.x + uTime * 4.8 + 32., 64.) - 32.;
    p.y += sin(uTime * 2. + aSeed * 62.) * .27;
  }
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = disperseToEdges(projectionMatrix * mv, aSeed, uScatter);
  gl_PointSize = clamp(aSize * 182. / max(1., -mv.z), 1.10, uLimit) * uDpr;
  vColor = color;
  vDepth = -mv.z;
  vStretch = aBend > 1.4 ? 2.5 : 1.;
}
`;
const fragment = /* glsl */ `
uniform vec3 uPaper;
uniform float uVisibility;
varying vec3 vColor;
varying float vDepth;
varying float vStretch;
void main() {
  vec2 uv = gl_PointCoord * 2. - 1.;
  uv.y = (uv.y + uv.x * .17 * (vStretch - 1.)) * vStretch;
  float d = length(uv);
  if (d >= 1.) discard;
  float feather = 1. - smoothstep(.22, 1., d);
  float fog = smoothstep(11., 73., vDepth);
  gl_FragColor = vec4(mix(vColor, uPaper, fog * .88), feather * (.92 - fog * .32) * uVisibility);
  #include <colorspace_fragment>
}
`;

function filmMaterial(limit: number) {
  return new ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, vertexColors: true, transparent: true,
    depthWrite: false, uniforms: { uTime: { value: 0 }, uWind: { value: 0 }, uScatter: { value: 0 },
      uVisibility: { value: 0 }, uLimit: { value: limit }, uDpr: { value: 1 }, uPaper: { value: new Color('#e9ecdf') } } });
}

function Swordsman({ material, light, shot, clock }: {
  material: ShaderMaterial; light: boolean; shot: number; clock: MutableRefObject<number>;
}) {
  const body = useRef<Group>(null), arms = useRef<Group>(null), legA = useRef<Group>(null), legB = useRef<Group>(null);
  const parts = useMemo(() => makeSwordsmanParts(light, light && shot !== 2, shot !== 2), [light, shot]);
  useEffect(() => () => Object.values(parts).forEach(geometry => geometry.dispose()), [parts]);
  useFrame(() => {
    const group = body.current;
    if (!group || !group.parent?.visible) return;
    const t = clock.current;
    if (shot !== 2) {
      const gait = Math.sin(t * 5.9 + (light ? .3 : 2.4));
      const walk = Math.min(t, 8.5) * .42;
      group.position.set(light ? .65 : -.52, .045 * Math.abs(gait), (light ? -4.8 : -1.4) - walk);
      group.rotation.set(.015, Math.PI + (light ? -.12 : .06), .022 * gait);
      legA.current!.rotation.x = gait * .28;
      legB.current!.rotation.x = -gait * .28;
      arms.current!.rotation.x = gait * .055;
      return;
    }
    const beat = t % 8.6;
    const advance = smoothstep(2.1, 3.25, beat) * (1 - smoothstep(5.35, 7.8, beat));
    const cut = smoothstep(3.45, 3.86, beat) * (1 - smoothstep(4.25, 5.1, beat));
    const parry = smoothstep(3.62, 3.92, beat) * (1 - smoothstep(4.65, 5.2, beat));
    const side = light ? -1 : 1, gesture = light ? cut : parry;
    group.position.set(side * (2.25 - advance * 1.60), .04 * Math.sin(t * 2) - advance * .12, light ? -3.3 + advance * .52 : -1.8 - advance * .50);
    group.rotation.set(.06 + gesture * .19, light ? 1.12 : -2.03, side * (.04 + .08 * gesture));
    legA.current!.rotation.x = -.26 - advance * .31;
    legB.current!.rotation.x = .26 + advance * .29;
    arms.current!.rotation.x = -.33 + (light ? 1.15 : -.61) * gesture;
    arms.current!.rotation.z = side * (.14 + (light ? 1.02 : .32) * gesture);
  });
  return <group ref={body}>
    <points geometry={parts.torso} material={material} frustumCulled={false} renderOrder={6} />
    <group ref={legA} position={[-.17, 1.03, 0]}><points geometry={parts.leg} material={material} frustumCulled={false} renderOrder={6} /></group>
    <group ref={legB} position={[.17, 1.03, 0]}><points geometry={parts.leg} material={material} frustumCulled={false} renderOrder={6} /></group>
    <group ref={arms} position={[0, 1.63, 0]}><points geometry={parts.arms} material={material} frustumCulled={false} renderOrder={7} /></group>
  </group>;
}

export function KendoFilm({ visual, shot, paused }: { visual: MutableRefObject<FilmState>; shot: number; paused: boolean }) {
  const group = useRef<Group>(null), clock = useRef(0), lastShot = useRef(shot);
  const scenes = useMemo(() => [0, 1, 2].map(makeKendoLandscape), []);
  const scenery = useMemo(() => filmMaterial(9.6), []);
  const figure = useMemo(() => filmMaterial(5.4), []);
  useEffect(() => () => { scenes.forEach(geometry => geometry.dispose()); scenery.dispose(); figure.dispose(); }, [scenes, scenery, figure]);
  useFrame(({ gl }, dt) => {
    const v = visual.current;
    const active = v.activeStage === 'kendo' && v.visibility > .001;
    if (group.current) group.current.visible = active;
    if (lastShot.current !== shot || !active) { clock.current = 0; lastShot.current = shot; }
    else if (!paused) clock.current += Math.min(dt, .08);
    for (const material of [scenery, figure]) {
      material.uniforms.uTime.value = clock.current;
      material.uniforms.uDpr.value = gl.getPixelRatio();
      material.uniforms.uScatter.value = v.scatter;
      material.uniforms.uVisibility.value = v.visibility;
    }
    scenery.uniforms.uWind.value = shot === 2 ? .98 : shot === 1 ? .25 : 0;
  }, -0.5);
  return <group ref={group} visible={false}>
    <points geometry={scenes[shot]} material={scenery} frustumCulled={false} renderOrder={4} />
    <Swordsman material={figure} light={false} shot={shot} clock={clock} />
    <Swordsman material={figure} light shot={shot} clock={clock} />
  </group>;
}
