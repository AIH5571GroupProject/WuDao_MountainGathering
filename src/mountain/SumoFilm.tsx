import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, Euler, Group, ShaderMaterial, Vector3 } from 'three';
import { screenDispersal } from './materials';
import { smoothstep } from './model';
import { makeDohyo, makeDohyoRim, makeDohyoRoof, makeRikishi, makeRingSurroundings, makeSalt } from './sumoGeometry';

type SumoVisual = { activeStage: string | null; visibility: number; scatter: number; filmFrame: number; filmTime: number };

const vertex = /* glsl */ `
attribute vec2 aStyle;
uniform float uScatter;
uniform float uDpr;
uniform float uTime;
uniform float uSalt;
uniform float uDrift;
varying vec3 vColor;
varying float vDepth;
varying float vLife;
${screenDispersal}
void main() {
  vec3 p = position;
  vLife = 1.;
  if (uSalt > .5) {
    float t = uTime - .12 * (aStyle.y + 1.);
    float spread = t * (.55 + .39 * t);
    p = vec3(position.x * spread + .56 * t,
      max(-2.31, (2.8 + position.y * .67) * t - 3.6 * t * t),
      (1.8 + .9 * position.z) * t);
    vLife = step(0., t) * (1. - smoothstep(1.16, 1.53, t));
  }
  float arrive = smoothstep(0., 1.35, uTime);
  if (uDrift > 1.5) {
    float angle = uTime * .115;
    float c = cos(angle), s = sin(angle);
    p.xz = mat2(c, -s, s, c) * p.xz;
    float ripple = atan(p.z, p.x) * 3. + uTime * .95;
    float mote = aStyle.y * 51.7;
    p.xz *= 1. + arrive * (.017 * cos(ripple) + .024 * sin(mote + uTime * .68));
    p.y += arrive * (.09 + .05 * sin(ripple) + .32 * pow(aStyle.y, 6.) * (.6 + .4 * sin(mote + uTime * .83)));
  } else if (uDrift > .5) {
    float mote = aStyle.y * 91.9;
    float strength = arrive * smoothstep(.12, .78, position.y) * (.38 + aStyle.y * .62);
    p += strength * vec3(.041 * sin(mote + uTime * .78),
      .058 * sin(mote + uTime * .94) + .024 * sin(uTime * 1.05 + position.y),
      .035 * cos(mote + uTime * .70));
    vLife *= 1. - strength * (.12 + .12 * sin(mote + uTime * .73));
  }
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = disperseToEdges(projectionMatrix * mv, aStyle.y, uScatter);
  gl_PointSize = clamp(aStyle.x * 164. / max(1., -mv.z), 1.2, uSalt > .5 ? 5. : 11.) * uDpr;
  vColor = color;
  vDepth = -mv.z;
}`;

const fragment = /* glsl */ `
uniform vec3 uPaper;
uniform vec3 uSaltRim;
uniform float uVisibility;
uniform float uSalt;
varying vec3 vColor;
varying float vDepth;
varying float vLife;
void main() {
  vec2 uv = gl_PointCoord * 2. - 1.;
  float r = length(uv);
  if (r >= 1. || vLife < .002) discard;
  float core = 1. - smoothstep(.22, .84, r);
  float halo = exp(-4. * r * r) * (1. - smoothstep(.7, 1., r));
  float fog = smoothstep(9., 36., vDepth) * .84;
  vec3 tone = mix(vColor * .86, mix(vColor, uPaper, .15), clamp(.56 - uv.x * .36 + uv.y * .3, 0., 1.));
  if (uSalt > .5) tone = mix(vColor, uSaltRim, smoothstep(.13, .64, r) * .80);
  tone = mix(tone, uPaper, fog);
  gl_FragColor = vec4(tone, (.77 * core + .23 * halo) * uVisibility * vLife * mix(.87, 1., uSalt));
  #include <colorspace_fragment>
}`;

function makeMaterial(kind: 'ink' | 'salt' | 'figure' | 'rim' = 'ink') {
  return new ShaderMaterial({
    vertexShader: vertex, fragmentShader: fragment, vertexColors: true, transparent: true, depthWrite: false,
    uniforms: {
      uVisibility: { value: 0 }, uScatter: { value: 0 }, uDpr: { value: 1 }, uTime: { value: 0 },
      uSalt: { value: Number(kind === 'salt') }, uDrift: { value: kind === 'rim' ? 2 : kind === 'figure' ? 1 : 0 },
      uPaper: { value: new Color('#e9ecdf') }, uSaltRim: { value: new Color('#88704e') },
    },
  });
}

const saltRelease = new Vector3(.19, -.60, .33).applyEuler(new Euler(-1.88, -.26, .13)).add(new Vector3(.385, 1.81, 0));

export function SumoFilm({ visual, calm }: { visual: MutableRefObject<SumoVisual>; calm: boolean }) {
  const scene = useRef<Group>(null), pavilion = useRef<Group>(null), ready = useRef<Group>(null), standing = useRef<Group>(null);
  const rightArmA = useRef<Group>(null), rightArmB = useRef<Group>(null);
  const data = useMemo(() => ({
    platform: makeDohyo(), rim: makeDohyoRim(), roof: makeDohyoRoof(), surroundings: makeRingSurroundings(), salt: makeSalt(),
    standing: [makeRikishi(0, false), makeRikishi(1, false)],
    ready: [makeRikishi(0, true), makeRikishi(1, true)],
  }), []);
  const ink = useMemo(() => makeMaterial(), []);
  const figures = useMemo(() => makeMaterial('figure'), []);
  const rim = useMemo(() => makeMaterial('rim'), []);
  const salts = useMemo(() => [makeMaterial('salt'), makeMaterial('salt')], []);

  useEffect(() => () => {
    [data.platform, data.rim, data.roof, data.surroundings, data.salt].forEach(g => g.dispose());
    [...data.standing, ...data.ready].forEach(({ body, arm }) => { body.dispose(); arm.dispose(); });
    [ink, figures, rim, ...salts].forEach(material => material.dispose());
  }, [data, ink, figures, rim, salts]);

  useFrame(({ gl }) => {
    const v = visual.current;
    if (!scene.current) return;
    scene.current.visible = v.activeStage === 'sumo' && v.visibility > .001;
    if (!scene.current.visible) return;
    pavilion.current!.visible = v.filmFrame === 0;
    standing.current!.visible = v.filmFrame === 1;
    ready.current!.visible = v.filmFrame === 2;
    for (const material of [ink, figures, rim, ...salts]) {
      material.uniforms.uVisibility.value = v.visibility;
      material.uniforms.uScatter.value = v.scatter;
      material.uniforms.uDpr.value = gl.getPixelRatio();
    }
    figures.uniforms.uTime.value = rim.uniforms.uTime.value = v.filmFrame === 2 && !calm ? v.filmTime : 0;
    [rightArmA, rightArmB].forEach((arm, i) => {
      const moment = v.filmTime - (1.78 + i * 1.25);
      const swing = smoothstep(-.6, .03, moment) * (1 - smoothstep(.19, .77, moment));
      if (arm.current) arm.current.rotation.set(-1.88 * swing, -.26 * swing, .13 * swing);
      salts[i].uniforms.uTime.value = moment;
    });
  }, -.5);

  return <group ref={scene} visible={false}>
    <points geometry={data.surroundings} material={ink} frustumCulled={false} renderOrder={1} />
    <points geometry={data.platform} material={ink} frustumCulled={false} renderOrder={3} />
    <points geometry={data.rim} material={rim} frustumCulled={false} renderOrder={4} />
    <group ref={pavilion}><points geometry={data.roof} material={ink} frustumCulled={false} renderOrder={5} /></group>
    <group ref={standing} visible={false}>
      {data.standing.map(({ body, arm }, index) => <group key={index} position={[index ? 2.05 : -2.05, 0, index ? -.26 : .28]} rotation={[0, index ? -.84 : .88, 0]}>
        <points geometry={body} material={ink} frustumCulled={false} renderOrder={6} />
        <group ref={index ? rightArmB : rightArmA} position={[.385, 1.81, 0]}>
          <points geometry={arm} material={ink} frustumCulled={false} renderOrder={7} />
        </group>
        <points geometry={data.salt} material={salts[index]} position={saltRelease} frustumCulled={false} renderOrder={8} />
      </group>)}
    </group>
    <group ref={ready} visible={false}>
      {data.ready.map(({ body }, index) => <group key={index} position={[index ? 1.26 : -1.26, 0, 0]} rotation={[0, index ? -Math.PI / 2 : Math.PI / 2, 0]}>
        <points geometry={body} material={figures} frustumCulled={false} renderOrder={index ? 6 : 7} />
      </group>)}
    </group>
  </group>;
}
