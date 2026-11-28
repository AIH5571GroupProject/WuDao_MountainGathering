import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, Group, Object3D, ShaderMaterial, Vector3 } from 'three';
import { makeBoxingFigure, makeBoxingHaze, makeBoxingMist, makeBoxingSet, makeSpeedBag, speedBagPivot, type BoxingFigureKind } from './boxingGeometry';
import { screenDispersal } from './materials';
import { smoothstep, type Vec3 } from './model';

type FilmVisual = { activeStage: string | null; filmFrame: number; filmTime: number; scatter: number; visibility: number };
const up = new Vector3(0, 1, 0);
const direction = new Vector3();
const pushUpPeriod = 2.8;

const vertex = /* glsl */ `
attribute vec2 aStyle;
uniform float uDpr;
uniform float uScatter;
uniform float uTime;
uniform float uSpread;
uniform float uDrift;
uniform float uSoft;
uniform float uRadiusScale;
uniform float uPixelDensity;
varying vec3 vColor;
varying float vDepth;
varying float vDensity;
varying float vFocus;
${screenDispersal}
void main() {
  vec4 world = modelMatrix * vec4(position, 1.);
  float seed = aStyle.y * 73.3;
  float phase = uTime * .87;
  float cloud = sin(dot(world.xyz, vec3(1.7, 3.4, 1.2)) + phase)
    + .61 * sin(dot(world.xyz, vec3(3.1, -1.1, 2.4)) - phase * .82);
  // Keep the gaps attached to the model as it moves.
  float cluster = sin(dot(position, vec3(10.1, 16.2, 9.3)) + 1.4)
    + .55 * sin(dot(position, vec3(-12.3, 8.1, 16.3)));
  float coverage = mix(.32, 1.28, smoothstep(-.65, .65, cluster));
  if (uSoft < .5 && aStyle.y > uPixelDensity * coverage) {
    gl_Position = vec4(2., 2., 2., 1.);
    gl_PointSize = 1.;
    return;
  }
  float loose = pow(aStyle.y, 1.8);
  float wave = phase + dot(world.xyz, vec3(.85, .34, .62)) + aStyle.y * 1.4;
  vec3 offset = vec3(sin(seed * 1.89), cos(seed * 1.32) * .82, sin(seed * 2.17) * .65);
  world.xyz += uSpread * (.31 + .79 * loose) * offset;
  world.xyz += uDrift * (.35 + .90 * loose) * vec3(sin(wave), .7 * cos(wave * .82), .54 * sin(wave + 1.6));
  vec4 mv = viewMatrix * world;
  vec4 clip = projectionMatrix * mv;
  gl_Position = disperseToEdges(clip, aStyle.y, uScatter);
  float size = aStyle.x * 166. * uRadiusScale / max(1., -mv.z);
  gl_PointSize = uSoft > .5
    ? clamp(size, 14., 100.) * uDpr
    : max(1., floor(clamp(size, 1., 3.) * uDpr + .5));
  vec2 gaze = clip.xy / max(.01, clip.w) - vec2(-.13, -.07);
  vFocus = exp(-dot(gaze * vec2(1.25, 1.65), gaze * vec2(1.25, 1.65)));
  float breath = 1. + .22 * sin(wave + .85) * (.42 + .58 * loose);
  vDensity = (.56 + .32 * smoothstep(-1.4, 1.5, cloud)) * (1. - loose * .40) * breath;
  vColor = color;
  vDepth = -mv.z;
}`;

const fragment = /* glsl */ `
uniform float uOpacity;
uniform float uVisibility;
uniform float uClarity;
uniform float uSoft;
uniform vec3 uMist;
varying vec3 vColor;
varying float vDepth;
varying float vDensity;
varying float vFocus;
void main() {
  float fog = smoothstep(4.5, 21., vDepth);
  float clarity = uClarity * mix((.56 + .44 * vFocus) * (1. - fog * .50), 1., uSoft);
  float alpha = .84 * (1. - fog * .52);
  if (uSoft > .5) {
    vec2 center = gl_PointCoord * 2. - 1.;
    float distance2 = dot(center, center);
    alpha = exp(-3.2 * distance2) * (1. - smoothstep(.35, 1., distance2));
  }
  vec3 color = mix(uMist, vColor, clarity);
  gl_FragColor = vec4(color, uOpacity * uVisibility * alpha * vDensity);
  #include <colorspace_fragment>
}`;

function boxingMaterial({ opacity, clarity, spread, radius, pixelDensity = 1, drift = .045, soft = false }: {
  opacity: number; clarity: number; spread: number; radius: number; pixelDensity?: number; drift?: number; soft?: boolean;
}) {
  return new ShaderMaterial({
    vertexShader: vertex, fragmentShader: fragment, transparent: true, depthWrite: false, vertexColors: true,
    uniforms: {
      uDpr: { value: 1 }, uScatter: { value: 0 }, uVisibility: { value: 0 }, uTime: { value: 0 },
      uOpacity: { value: opacity }, uClarity: { value: clarity }, uSpread: { value: spread },
      uDrift: { value: drift }, uSoft: { value: Number(soft) },
      uRadiusScale: { value: radius }, uPixelDensity: { value: pixelDensity }, uMist: { value: new Color('#4e5045') },
    },
  });
}

function placeSegment(part: Object3D, from: Vec3, to: Vec3) {
  part.position.set(...from);
  direction.set(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  part.scale.y = Math.max(.02, direction.length());
  part.quaternion.setFromUnitVectors(up, direction.normalize());
}

function Boxer({ kind, at, material, gloveMaterial = material, visual, calm, rotation = 0 }: {
  kind: BoxingFigureKind; at: Vec3; material: ShaderMaterial; gloveMaterial?: ShaderMaterial;
  visual: MutableRefObject<FilmVisual>; calm: boolean; rotation?: number;
}) {
  const actor = useRef<Group>(null), torso = useRef<Group>(null);
  const joints = useRef<(Group | null)[]>([]);
  const geometry = useMemo(() => makeBoxingFigure(kind), [kind]);
  useEffect(() => () => Object.values(geometry).forEach(g => g.dispose()), [geometry]);
  const shadow = kind === 'coach' || kind === 'corner';

  useFrame(() => {
    const root = actor.current, chest = torso.current, parts = joints.current;
    if (!root?.parent?.visible || !visual.current.visibility || !chest) return;
    const t = calm ? 0 : visual.current.filmTime;
    const strength = kind === 'strength';
    const repetition = t % pushUpPeriod;
    const dip = strength ? smoothstep(.35, 1.33, repetition) * (1 - smoothstep(1.55, 2.45, repetition)) : 0;
    const pace = kind === 'hood' ? Math.sin(t * 1.32) : 0;
    const rocking = kind === 'speed' ? Math.sin(t * 3.25) : 0;
    root.position.set(at[0] + pace * .34, at[1] - Math.abs(pace) * .036, at[2] + pace * .06);
    root.rotation.y = rotation + pace * .18 + rocking * .045;
    chest.position.set(0, strength ? -.34 * dip : .032 * rocking, 0);
    chest.rotation.set(strength ? -.13 : .05 * pace, 0, strength ? -1.43 + .035 * dip : .04 * pace);
    chest.updateMatrix();

    const point = (x: number, y: number, z: number): Vec3 => new Vector3(x, y, z).applyMatrix4(chest.matrix).toArray();
    for (let i = 0; i < 2; i++) {
      const s = i === 0 ? -1 : 1, offset = i * 6;
      const shoulder = point(s * .225, .604, .025);
      const hip = point(s * .139, .006, -.018);
      const strike = kind === 'speed' ? Math.pow(.5 + .5 * Math.cos(t * 6.5 - i * Math.PI), 2.8)
        : shadow || strength ? 0 : Math.pow(.5 + .5 * Math.sin(t * 2.6 - i * Math.PI), 4) * smoothstep(.2, .8, t);
      let elbow = point(s * (.25 - strike * .04), shadow ? .30 : .39 + .20 * strike, shadow ? .11 : .18 + .28 * strike);
      let hand = point(s * (.165 - strike * .056), shadow ? .26 : .70 + (kind === 'speed' ? .27 : .035) * strike, shadow ? .20 : .20 + .46 * strike);
      let knee = point(s * .177, -.42, .05 + s * pace * .11);
      let foot = point(s * .19, -.87, .07 + s * pace * .24);
      if (strength) {
        const near = s === 1;
        hand = near ? [.82, -.545, .37] : [-.04, .12 - dip * .34, -.23];
        elbow = near ? [(shoulder[0] + hand[0]) / 2 + .035 + .18 * dip,
          (shoulder[1] + hand[1]) / 2 + .03 * dip,
          (shoulder[2] + hand[2]) / 2 + .12 * dip] : [.15, .15 - dip * .36, -.31];
        knee = [-.55, -.28 - dip * .08, s * .18];
        foot = [-.99 - i * .19, -.536, s * .19];
      }
      const [upperArm, lowerArm, palm, upperLeg, lowerLeg, shoe] = parts.slice(offset, offset + 6);
      if (!upperArm || !lowerArm || !palm || !upperLeg || !lowerLeg || !shoe) continue;
      placeSegment(upperArm, shoulder, elbow);
      placeSegment(lowerArm, elbow, hand);
      palm.position.set(...hand);
      placeSegment(upperLeg, hip, knee);
      placeSegment(lowerLeg, knee, foot);
      shoe.position.set(...foot);
    }
  });

  const limbParts = [geometry.arm, geometry.forearm, geometry.glove, geometry.thigh, geometry.calf, geometry.shoe];
  return <group ref={actor} position={at}>
    <group ref={torso}><points geometry={geometry.body} material={material} frustumCulled={false} renderOrder={shadow ? 4 : 6} /></group>
    {[...limbParts, ...limbParts].map((part, index) => <group key={index} ref={node => { joints.current[index] = node; }}>
      <points geometry={part} material={part === geometry.glove ? gloveMaterial : material} frustumCulled={false} renderOrder={shadow ? 4 : 6} />
    </group>)}
  </group>;
}

export function BoxingFilm({ visual, calm }: { visual: MutableRefObject<FilmVisual>; calm: boolean }) {
  const root = useRef<Group>(null), ring = useRef<Group>(null), gym = useRef<Group>(null), training = useRef<Group>(null), bag = useRef<Group>(null);
  const sets = useMemo(() => [0, 1, 2].map(makeBoxingSet), []);
  const mist = useMemo(() => [0, 1, 2].map(makeBoxingMist), []);
  const haze = useMemo(() => [0, 1, 2].map(shot => ({
    rear: makeBoxingHaze(shot, false),
    foreground: makeBoxingHaze(shot, true),
  })), []);
  const bagGeometry = useMemo(makeSpeedBag, []);
  const materials = useMemo(() => ({
    roomPixels: boxingMaterial({ opacity: .46, clarity: .40, spread: .08, radius: .53, pixelDensity: .34 }),
    structurePixels: boxingMaterial({ opacity: .62, clarity: .49, spread: .066, radius: .61, pixelDensity: .43 }),
    boxerPixels: boxingMaterial({ opacity: .67, clarity: .54, spread: .20, radius: .53, pixelDensity: .28, drift: .11 }),
    stancePixels: boxingMaterial({ opacity: .69, clarity: .54, spread: .15, radius: .49, pixelDensity: .36, drift: .10 }),
    coachPixels: boxingMaterial({ opacity: .46, clarity: .41, spread: .17, radius: .5, pixelDensity: .24, drift: .08 }),
    actionPixels: boxingMaterial({ opacity: .79, clarity: .65, spread: .077, radius: .58, pixelDensity: .53, drift: .018 }),
    mistPixels: boxingMaterial({ opacity: .42, clarity: .47, spread: .14, radius: .74, pixelDensity: .95, drift: .24 }),
    rearHaze: boxingMaterial({ opacity: .14, clarity: .83, spread: .25, radius: 1.37, drift: .34, soft: true }),
    floorHaze: boxingMaterial({ opacity: .105, clarity: .82, spread: .18, radius: 1.02, drift: .26, soft: true }),
  }), []);
  useEffect(() => () => {
    sets.forEach(set => Object.values(set).forEach(geo => geo.dispose()));
    mist.forEach(geo => geo.dispose());
    haze.forEach(layer => { layer.rear.dispose(); layer.foreground.dispose(); });
    bagGeometry.dispose();
    Object.values(materials).forEach(material => material.dispose());
  }, [sets, mist, haze, bagGeometry, materials]);
  const { roomPixels, structurePixels, boxerPixels, stancePixels, coachPixels, actionPixels, mistPixels, rearHaze, floorHaze } = materials;

  useFrame(({ gl }) => {
    const state = visual.current, active = state.activeStage === 'boxing' && state.visibility > .001;
    if (!root.current) return;
    root.current.visible = active;
    ring.current!.visible = active && state.filmFrame === 0;
    gym.current!.visible = active && state.filmFrame === 1;
    training.current!.visible = active && state.filmFrame === 2;
    if (!active) return;
    const t = calm ? 0 : state.filmTime;
    if (bag.current) {
      const pulse = smoothstep(.2, .70, t);
      bag.current.rotation.set(pulse * .13 * Math.sin(t * 13 + .38), 0, pulse * .29 * Math.sin(t * 13));
    }
    for (const material of Object.values(materials)) {
      material.uniforms.uDpr.value = gl.getPixelRatio();
      material.uniforms.uVisibility.value = state.visibility;
      material.uniforms.uScatter.value = state.scatter;
      material.uniforms.uTime.value = t;
    }
  }, -.5);

  return <group ref={root} visible={false}>
    <group ref={ring} visible={false}>
      <points geometry={haze[0].rear} material={rearHaze} frustumCulled={false} renderOrder={1} />
      <points geometry={mist[0]} material={mistPixels} frustumCulled={false} renderOrder={1} />
      <points geometry={sets[0].room} material={roomPixels} frustumCulled={false} renderOrder={2} />
      <points geometry={sets[0].props} material={structurePixels} frustumCulled={false} renderOrder={3} />
      <Boxer kind="hood" at={[-1.35, .94, -.45]} rotation={1.15} material={boxerPixels} gloveMaterial={actionPixels} visual={visual} calm={calm} />
      <points geometry={sets[0].foreground} material={roomPixels} frustumCulled={false} renderOrder={8} />
      <points geometry={haze[0].foreground} material={floorHaze} frustumCulled={false} renderOrder={9} />
    </group>
    <group ref={gym} visible={false}>
      <points geometry={haze[1].rear} material={rearHaze} frustumCulled={false} renderOrder={1} />
      <points geometry={mist[1]} material={mistPixels} frustumCulled={false} renderOrder={1} />
      <points geometry={sets[1].room} material={roomPixels} frustumCulled={false} renderOrder={2} />
      <points geometry={sets[1].props} material={structurePixels} frustumCulled={false} renderOrder={3} />
      <Boxer kind="speed" at={[-.74, .98, .23]} rotation={1.36} material={boxerPixels} gloveMaterial={actionPixels} visual={visual} calm={calm} />
      <Boxer kind="coach" at={[1.30, 1, -.55]} rotation={-.73} material={coachPixels} visual={visual} calm={calm} />
      <group ref={bag} position={speedBagPivot}><points geometry={bagGeometry} material={actionPixels} frustumCulled={false} renderOrder={7} /></group>
      <points geometry={haze[1].foreground} material={floorHaze} frustumCulled={false} renderOrder={9} />
    </group>
    <group ref={training} visible={false}>
      <points geometry={haze[2].rear} material={rearHaze} frustumCulled={false} renderOrder={1} />
      <points geometry={mist[2]} material={mistPixels} frustumCulled={false} renderOrder={1} />
      <points geometry={sets[2].room} material={roomPixels} frustumCulled={false} renderOrder={2} />
      <points geometry={sets[2].props} material={structurePixels} frustumCulled={false} renderOrder={3} />
      <Boxer kind="corner" at={[-2.04, .82, -1.8]} rotation={.55} material={coachPixels} visual={visual} calm={calm} />
      <Boxer kind="strength" at={[-.18, .60, .20]} rotation={-.12} material={stancePixels} gloveMaterial={actionPixels} visual={visual} calm={calm} />
      <points geometry={haze[2].foreground} material={floorHaze} frustumCulled={false} renderOrder={9} />
    </group>
  </group>;
}
