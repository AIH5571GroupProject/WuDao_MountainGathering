import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitImpl } from 'three-stdlib';
import * as THREE from 'three';
import type { MountainArenaId as ArenaId } from './model';
import { approachPath, canReturnByZoom, mountainArenas, OVERVIEW_EYE, OVERVIEW_TARGET, WELCOME_EYE, WELCOME_TARGET, qualityFraction, safeCameraPoint, smoothstep, stagePose,
  type CameraCommand, type MountainArena, type Phase, type Quality, type Vec3 } from './model';
import { makeAtmosphere, makeClouds, makeContours, makeDepthTerrain, makeFighters, makeMountainField, makeSurroundingMountains, makeStageBamboo, makeTrail } from './geometry';
import { ArrivalMist } from './ArrivalMist';
import { KendoFilm } from './KendoFilm';
import { particleTransition } from './transition';
import { createActorMaterial, createFieldMaterial } from './materials';

type Props = { command: CameraCommand; phase: Phase; arena: MountainArena | null; language: 'zh' | 'en'; quality: Quality; calm: boolean; sparring: boolean; kendoShot?: number; kendoPaused?: boolean;
  onEnter: (id: ArenaId) => void; onHover: (id: ArenaId | null) => void; onArrive: (id: ArenaId) => void; onOverview: () => void;
  onProgress: (value: number) => void; onPullBack: () => void; onChapter: () => void; onEncounter: () => void; onReady: () => void; onError: (message: string) => void; onToggleSparring: () => void };
type Visual = { arrival: number; visibility: number; page: number; scatter: number; stage: number; activeStage: ArenaId | null; time: number; fightTime: number; pointer: THREE.Vector3; pointerInside: boolean;
  ripple: THREE.Vector3; rippleAt: number; hovered: ArenaId | null };
type VRef = MutableRefObject<Visual>;

function CameraJourney({ command, phase, arena, visual, controls, calm, onArrive, onOverview, onProgress, onPullBack, onChapter, onEncounter }: Props & { visual: VRef; controls: MutableRefObject<OrbitImpl | null> }) {
  const { camera } = useThree();
  const savedOverview = useRef({ eye: new THREE.Vector3(...OVERVIEW_EYE), target: new THREE.Vector3(...OVERVIEW_TARGET) });
  const phaseRef = useRef(phase); phaseRef.current = phase;
  const callbacks = useRef({ onArrive, onOverview, onProgress, onPullBack, onChapter, onEncounter }); callbacks.current = { onArrive, onOverview, onProgress, onPullBack, onChapter, onEncounter };
  const animation = useRef<{ start: number; duration: number; curve: THREE.Curve<THREE.Vector3>; targetFrom: THREE.Vector3; targetTo: THREE.Vector3;
    kind: CameraCommand['kind']; arenaId?: ArenaId; pageFrom: number } | null>(null);
  const lens = useRef('');
  const now = useRef(0), lastReport = useRef(0), returnIssued = useRef(false);
  const calmRef = useRef(calm); calmRef.current = calm;
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const currentEye = camera.position.clone();
    const currentTarget = c.target.clone();
    // Discard residual orbit velocity so it cannot reappear at the end of a flight.
    const damping = c.enableDamping; c.enableDamping = false; c.update(); c.enableDamping = damping;
    camera.position.copy(currentEye); c.target.copy(currentTarget);
    returnIssued.current = false;
    if (command.kind === 'begin') {
      animation.current = { start: performance.now() / 1000, duration: calmRef.current ? .9 : 6.2,
        curve: new THREE.CatmullRomCurve3([currentEye, new THREE.Vector3(115, 110, 166), new THREE.Vector3(90, 85, 127), new THREE.Vector3(...OVERVIEW_EYE)]),
        targetFrom: currentTarget, targetTo: new THREE.Vector3(...OVERVIEW_TARGET), kind: 'begin', pageFrom: 0 };
    } else if (command.kind === 'chapter' || command.kind === 'encounter') {
      animation.current = { start: performance.now() / 1000, duration: calmRef.current ? .35 : 2.6,
        curve: new THREE.LineCurve3(currentEye, currentEye.clone()), targetFrom: currentTarget, targetTo: currentTarget.clone(),
        kind: command.kind, pageFrom: visual.current.page };
    } else if (command.kind === 'enter') {
      const targetArena = mountainArenas.find((a) => a.id === command.id);
      if (!targetArena) return;
      if (!animation.current && visual.current.stage < .02) savedOverview.current = { eye: currentEye.clone(), target: currentTarget.clone() };
      const pose = stagePose(targetArena);
      animation.current = { start: performance.now() / 1000, duration: calmRef.current ? .55 : 3.8,
        curve: new THREE.CatmullRomCurve3(approachPath(currentEye.toArray() as Vec3, targetArena).map((v) => new THREE.Vector3(...v))),
        targetFrom: currentTarget, targetTo: new THREE.Vector3(...pose.target), kind: 'enter', arenaId: targetArena.id,
        pageFrom: visual.current.page };
    } else if (command.kind === 'return' || command.kind === 'reset') {
      const destination = command.kind === 'reset' ? { eye: new THREE.Vector3(...OVERVIEW_EYE), target: new THREE.Vector3(...OVERVIEW_TARGET) } : savedOverview.current;
      if (command.sequence === 0) {
        camera.position.set(...WELCOME_EYE); c.target.set(...WELCOME_TARGET); c.update(); return;
      }
      const lift = new THREE.Vector3(currentEye.x * 1.18, Math.max(currentEye.y + 22, 58), currentEye.z * 1.18);
      animation.current = { start: performance.now() / 1000, duration: calmRef.current ? .45 : 3.2, curve: new THREE.CatmullRomCurve3([currentEye, lift, destination.eye.clone()]),
        targetFrom: currentTarget, targetTo: destination.target.clone(), kind: command.kind, pageFrom: visual.current.page };
    } else {
      const offset = currentEye.clone().sub(currentTarget);
      const stage = phaseRef.current === 'arena';
      const distance = THREE.MathUtils.clamp(offset.length() * (command.direction === 1 ? .82 : 1.22), stage ? 6.8 : 66, stage ? 22 : 215);
      const end = currentTarget.clone().add(offset.normalize().multiplyScalar(distance));
      animation.current = { start: performance.now() / 1000, duration: calmRef.current ? .1 : .4, curve: new THREE.LineCurve3(currentEye, end),
        targetFrom: currentTarget, targetTo: currentTarget.clone(), kind: 'zoom', pageFrom: visual.current.page };
    }
    c.enabled = false;
  }, [command, camera, controls, visual]);

  useFrame(({ size }) => {
    if (camera instanceof THREE.PerspectiveCamera) {
      const film = visual.current.activeStage === 'kendo';
      const key = film ? `${size.width}x${size.height}` : '';
      if (lens.current !== key) {
        lens.current = key;
        if (film) camera.setViewOffset(size.width, size.height, 0, Math.round(size.height * .095), size.width, size.height);
        else camera.clearViewOffset();
      }
    }
    // Each command records a fresh monotonic start, including after the game releases the GPU.
    now.current = performance.now() / 1000;
    const c = controls.current;
    if (!c) return;
    const tween = animation.current;
    if (tween) {
      c.enabled = false;
      const t = Math.min(1, Math.max(0, (now.current - tween.start) / tween.duration));
      const ease = tween.kind === 'zoom' || tween.kind === 'begin' ? smoothstep(0, 1, t) : smoothstep(.37, .53, t);
      const raw = tween.curve.getPoint(ease);
      const safe = safeCameraPoint(raw.toArray() as Vec3);
      camera.position.set(...safe);
      c.target.lerpVectors(tween.targetFrom, tween.targetTo, ease);
      camera.lookAt(c.target);
      const isPage = tween.kind === 'chapter' || tween.kind === 'encounter';
      const morph = particleTransition(t, tween.pageFrom, tween.kind === 'chapter' ? 1 : 0, calmRef.current);
      if (tween.kind === 'begin') visual.current.arrival = t;
      visual.current.page = morph.page;
      visual.current.scatter = tween.kind === 'zoom' || tween.kind === 'begin' ? 0 : morph.scatter;
      visual.current.visibility = tween.kind === 'zoom' || tween.kind === 'begin' ? 1 : morph.visibility;
      if (t >= .46 && tween.kind === 'enter') {
        visual.current.activeStage = tween.arenaId!;
        visual.current.stage = 1;
      } else if (t >= .46 && tween.kind !== 'zoom' && !isPage) {
        visual.current.stage = 0;
        visual.current.activeStage = null;
      }
      if (now.current - lastReport.current > .08) { callbacks.current.onProgress(t); lastReport.current = now.current; }
      if (t >= 1) {
        animation.current = null; c.enabled = true; c.update(); callbacks.current.onProgress(1);
        visual.current.scatter = 0;
        if (tween.kind === 'chapter') callbacks.current.onChapter();
        else if (tween.kind === 'encounter') callbacks.current.onEncounter();
        else if (tween.kind === 'enter') callbacks.current.onArrive(tween.arenaId!);
        else if (tween.kind !== 'zoom') { visual.current.stage = 0; visual.current.activeStage = null; callbacks.current.onOverview(); }
      }
    } else {
      if (phaseRef.current === 'overview') {
        c.target.x = THREE.MathUtils.clamp(c.target.x, -18, 18);
        c.target.z = THREE.MathUtils.clamp(c.target.z, -18, 18);
        const safe = safeCameraPoint(camera.position.toArray() as Vec3);
        camera.position.set(...safe);
      }
      if (canReturnByZoom(phaseRef.current, c.getDistance(), false) && !returnIssued.current) { returnIssued.current = true; callbacks.current.onPullBack(); }
    }
  }, -2);
  return <OrbitControls ref={controls} makeDefault target={phase === 'welcome' ? WELCOME_TARGET : OVERVIEW_TARGET} enablePan={phase === 'overview'}
    enabled={phase === 'overview' || phase === 'arena'} enableDamping dampingFactor={.075} rotateSpeed={.5} panSpeed={.5} zoomSpeed={.7}
    minDistance={phase === 'arena' ? 6.8 : phase === 'overview' ? 66 : .1} maxDistance={phase === 'arena' ? 22 : phase === 'overview' ? 230 : 600}
    minPolarAngle={phase === 'arena' ? .98 : phase === 'overview' ? .48 : 0} maxPolarAngle={arena?.id === 'kendo' ? Math.PI : phase === 'arena' ? 1.48 : phase === 'overview' ? 1.39 : Math.PI}
    minAzimuthAngle={phase === 'arena' && arena ? arena.angle - .6 : -Infinity} maxAzimuthAngle={phase === 'arena' && arena ? arena.angle + .6 : Infinity} />;
}

function Field({ geometry, visual, layer = 'world', quality, calm, arenaId }: { geometry: THREE.BufferGeometry; visual: VRef; layer?: 'world' | 'stage'; quality: Quality; calm: boolean; arenaId?: ArenaId }) {
  const ref = useRef<THREE.Points>(null);
  const material = useMemo(() => createFieldMaterial(layer === 'world' ? .0018 : .009), [layer]);
  const opacity = useRef(layer === 'world' ? 1 : 0);
  const { gl } = useThree();
  useEffect(() => () => material.dispose(), [material]);
  useFrame(() => {
    const v = visual.current;
    const target = layer === 'world' ? 1 - v.stage : v.activeStage === arenaId ? v.stage : 0;
    opacity.current = target;
    const u = material.uniforms;
    u.uTime.value = v.time; u.uDpr.value = gl.getPixelRatio(); u.uVisibility.value = opacity.current * v.visibility;
    u.uAssembly.value = layer === 'world' ? 1 - v.stage * .8 : .15 + v.stage * .85;
    u.uScatter.value = calm ? 0 : v.scatter; u.uPage.value = layer === 'stage' ? v.page : 0;
    u.uScale.value = layer === 'world' ? 4.0 : 2.4;
    u.uMotion.value = calm ? .08 : 1;
    u.uPointer.value.copy(v.pointer); u.uRipple.value.copy(v.ripple); u.uRippleAge.value = v.time - v.rippleAt;
    const a = mountainArenas.find((item) => item.id === v.hovered);
    u.uFocus.value.set(a?.x ?? 1e5, a?.elevation ?? 1e5, a?.z ?? 1e5); u.uHover.value = a ? 1 : 0;
    if (ref.current) ref.current.visible = opacity.current > .003;
  });
  // All fields share the current density setting, including the repeated stage backdrop.
  useEffect(() => { geometry.setDrawRange(0, Math.floor(geometry.getAttribute('position').count * qualityFraction(quality))); }, [geometry, quality]);
  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} renderOrder={2} />;
}

function Actors({ geometry, visual, arena, index }: { geometry: THREE.BufferGeometry; visual: VRef; arena: MountainArena; index: number }) {
  const ref = useRef<THREE.Points>(null), opacity = useRef(0);
  const material = useMemo(createActorMaterial, []);
  const { gl } = useThree();
  useEffect(() => () => material.dispose(), [material]);
  useFrame(() => {
    const v = visual.current, target = v.activeStage === arena.id ? smoothstep(.2, 1, v.stage) : 0;
    opacity.current = target;
    material.uniforms.uVisibility.value = opacity.current * v.visibility;
    material.uniforms.uAssembly.value = .15 + opacity.current * .85;
    material.uniforms.uScatter.value = v.scatter; material.uniforms.uPage.value = v.page;
    material.uniforms.uTime.value = v.fightTime; material.uniforms.uDpr.value = gl.getPixelRatio(); material.uniforms.uStyle.value = index;
    if (ref.current) ref.current.visible = opacity.current > .003;
  });
  return <points ref={ref} geometry={geometry} material={material} renderOrder={3} />;
}

function Hotspot({ arena, index, visual, language, phase, onEnter, onHover }: { arena: MountainArena; index: number; visual: VRef; language: 'zh' | 'en'; phase: Phase; onEnter: Props['onEnter']; onHover: Props['onHover'] }) {
  const ring = useRef<THREE.Mesh>(null), floor = useRef<THREE.Mesh>(null), label = useRef<HTMLDivElement>(null);
  useFrame(() => {
    const v = visual.current, hovered = v.hovered === arena.id;
    if (ring.current) {
      ring.current.scale.setScalar(hovered ? 1 + Math.sin(v.time * 2) * .035 : 1);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = (hovered ? .9 : .42) * (1 - v.stage) * (1 - v.scatter) * v.visibility * smoothstep(.82, 1, v.arrival);
    }
    if (floor.current) (floor.current.material as THREE.MeshBasicMaterial).opacity = .55 * (1 - v.stage) * (1 - v.scatter) * v.visibility * smoothstep(.82, 1, v.arrival);
    if (label.current) {
      const alpha = (1 - smoothstep(.05, .48, v.stage)) * (1 - v.scatter) * v.visibility * smoothstep(.82, 1, v.arrival);
      label.current.style.opacity = String(alpha);
      label.current.style.pointerEvents = phase === 'overview' && alpha > .8 ? 'auto' : 'none';
      label.current.style.visibility = alpha < .01 ? 'hidden' : 'visible';
    }
  });
  const enter = (event: ThreeEvent<MouseEvent>) => { if (event.delta > 5 || phase !== 'overview') return; event.stopPropagation(); onEnter(arena.id); };
  return <group position={[arena.x, arena.elevation + .13, arena.z]}>
    <mesh ref={floor} rotation={[-Math.PI / 2, 0, 0]} onClick={enter} onPointerOver={(e) => { if (phase !== 'overview') return; e.stopPropagation(); onHover(arena.id); }} onPointerOut={() => onHover(null)}>
      <circleGeometry args={[4.5, 64]} /><meshBasicMaterial color="#e5e7d4" transparent opacity={.55} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
    <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, .06, 0]}>
      <ringGeometry args={[4.18, 4.25, 80]} /><meshBasicMaterial color="#78856b" transparent opacity={.5} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
    <Html center position={[0, 4.2, 0]} zIndexRange={[9, 1]}>
      <div ref={label} className={`mountain-marker ${visual.current.hovered === arena.id ? 'hovered' : ''}`}>
        <button aria-label={`${arena.cn} ${arena.en}`} onPointerEnter={() => onHover(arena.id)} onPointerLeave={() => onHover(null)}
          disabled={phase !== 'overview'} onClick={(e) => { e.stopPropagation(); onEnter(arena.id); }}>
          <small>0{index + 1}</small><span>{language === 'zh' ? arena.cn : arena.en}<em>{language === 'zh' ? arena.place : arena.placeEn}</em></span><b>↗</b>
        </button><i />
      </div>
    </Html>
  </group>;
}

function MountainScene(props: Props & { visual: VRef }) {
  const { visual, quality, calm, phase } = props;
  const controls = useRef<OrbitImpl | null>(null), depthMesh = useRef<THREE.Mesh>(null), contour = useRef<THREE.LineSegments>(null), trail = useRef<THREE.Line>(null);
  const surroundings = useMemo(makeSurroundingMountains, []);
  const mountain = useMemo(makeMountainField, []), depth = useMemo(makeDepthTerrain, []), contours = useMemo(makeContours, []), route = useMemo(makeTrail, []);
  const trailObject = useMemo(() => new THREE.Line(route, new THREE.LineBasicMaterial({ color: '#8a9373', transparent: true, opacity: .3, depthWrite: false })), [route]);
  const air = useMemo(() => makeAtmosphere(), []), clouds = useMemo(() => makeClouds(), []);
  const stageData = useMemo(() => ({ bamboo: makeStageBamboo(), air: makeAtmosphere(true), clouds: makeClouds(true) }), []);
  const actors = useMemo(makeFighters, []);
  const ray = useMemo(() => new THREE.Raycaster(), []), plane = useMemo(() => new THREE.Plane(), []), hit = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => () => { [surroundings, mountain, depth, contours, route, air, clouds, actors, ...Object.values(stageData)].forEach((g) => g.dispose()); }, [surroundings, mountain, depth, contours, route, air, clouds, actors, stageData]);
  useEffect(() => () => trailObject.material.dispose(), [trailObject]);
  useFrame((state, delta) => {
    const v = visual.current;
    v.time += Math.min(delta, .05);
    if (props.sparring && !calm) v.fightTime += Math.min(delta, .05);
    const arena = mountainArenas.find((a) => a.id === v.activeStage);
    if (v.pointerInside) {
      plane.set(new THREE.Vector3(0, 1, 0), -(arena ? arena.elevation + 1.1 : 22));
      ray.setFromCamera(state.pointer, state.camera);
      if (ray.ray.intersectPlane(plane, hit)) v.pointer.copy(hit); else v.pointer.setScalar(1e5);
    } else v.pointer.setScalar(1e5);
    if (depthMesh.current) {
      const m = depthMesh.current.material as THREE.MeshLambertMaterial;
      m.opacity = .075 * (1 - v.stage) * (1 - v.scatter) * v.visibility; m.depthWrite = v.stage < .65 && v.scatter < .1 && v.visibility > .95; depthMesh.current.visible = v.stage < .98;
    }
    if (contour.current) (contour.current.material as THREE.LineBasicMaterial).opacity = .14 * (1 - v.stage) * (1 - v.scatter) * v.visibility;
    if (trail.current) (trail.current.material as THREE.LineBasicMaterial).opacity = .2 * (1 - v.stage) * (1 - v.scatter) * v.visibility;
  }, -1);
  return <>
    <color attach="background" args={['#e9ecdf']} />
    <ambientLight intensity={1.6} color="#f0f0df" /><directionalLight position={[-30, 80, 40]} intensity={1.3} color="#fff9df" />
    <CameraJourney {...props} controls={controls} />
    <mesh ref={depthMesh} geometry={depth} renderOrder={0} onClick={(e) => { if (e.delta < 5) { visual.current.ripple.copy(e.point); visual.current.rippleAt = visual.current.time; } }}>
      <meshLambertMaterial color="#c5ceb7" transparent opacity={.17} depthWrite side={THREE.DoubleSide} />
    </mesh>
    <ArrivalMist visual={visual} calm={calm} />
    <Field geometry={surroundings} visual={visual} quality={quality} calm={calm} />
    <Field geometry={mountain} visual={visual} quality={quality} calm={calm} />
    <Field geometry={air} visual={visual} quality={quality} calm={calm} />
    <Field geometry={clouds} visual={visual} quality={quality} calm={calm} />
    <lineSegments ref={contour} geometry={contours} renderOrder={1}><lineBasicMaterial color="#62745b" transparent opacity={.23} depthWrite={false} /></lineSegments>
    <primitive ref={trail} object={trailObject} />
    {mountainArenas.map((arena, index) => <Hotspot key={arena.id} arena={arena} index={index} visual={visual} language={props.language} phase={phase} onEnter={props.onEnter} onHover={props.onHover} />)}
    {mountainArenas.map((arena, i) => <group key={`stage-${arena.id}`} position={[arena.x, arena.elevation + .2, arena.z]} rotation={[0, arena.angle, 0]}>
      {arena.id === 'kendo' ? <KendoFilm visual={visual} shot={props.kendoShot ?? 0} paused={!!props.kendoPaused} /> : <>
      <Field geometry={stageData.bamboo} visual={visual} quality={quality} calm={calm} layer="stage" arenaId={arena.id} />
      <Field geometry={stageData.air} visual={visual} quality={quality} calm={calm} layer="stage" arenaId={arena.id} />
      <Field geometry={stageData.clouds} visual={visual} quality={quality} calm={calm} layer="stage" arenaId={arena.id} />
      <Actors geometry={actors} visual={visual} arena={arena} index={i} />
      {phase === 'arena' && props.arena?.id === arena.id && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .02, 0]}
        onClick={(event) => { if (event.delta < 5) { event.stopPropagation(); visual.current.ripple.copy(event.point); visual.current.rippleAt = visual.current.time; } }}>
        <circleGeometry args={[20, 64]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>}
      {[-1.3, 1.3].map((x) => <mesh key={x} position={[x, 1.15, 0]} raycast={phase === 'arena' && props.arena?.id === arena.id ? THREE.Mesh.prototype.raycast : () => {}}
        onClick={(event) => { if (event.delta < 5) { event.stopPropagation(); props.onToggleSparring(); } }}>
        <capsuleGeometry args={[.43, 1.5, 4, 8]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>)}
      </>}
    </group>)}
  </>;
}

export default function MountainWorld(props: Props) {
  const visual = useRef<Visual>({ arrival: props.phase === 'welcome' ? 0 : 1, visibility: 1, page: 0, scatter: 0, stage: 0, activeStage: null, time: 0, fightTime: .5, pointer: new THREE.Vector3(1e5, 1e5, 1e5), pointerInside: false,
    ripple: new THREE.Vector3(), rippleAt: -100, hovered: null });
  const hovered = useRef<ArenaId | null>(null);
  const onHover = (id: ArenaId | null) => { visual.current.hovered = id; hovered.current = id; props.onHover(id); };
  const phase = useRef(props.phase); phase.current = props.phase;
  const wheelIntent = useRef(0);
  return <div className="mountain-canvas" onPointerMove={() => { visual.current.pointerInside = true; }} onPointerLeave={() => { visual.current.pointerInside = false; onHover(null); }}
    onWheelCapture={(e) => {
      if (phase.current !== 'overview' || !hovered.current || e.deltaY > 0) { wheelIntent.current = 0; return; }
      wheelIntent.current += -e.deltaY;
      if (wheelIntent.current > 100) { props.onEnter(hovered.current); wheelIntent.current = 0; }
    }}>
    <Canvas frameloop={props.phase === 'game' ? 'never' : 'always'} camera={{ position: WELCOME_EYE, fov: 44, near: .1, far: 1500 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      fallback={<span>此浏览器无法显示三维画布 / Canvas unavailable</span>} onCreated={({ gl }) => {
        gl.setClearColor('#e9ecdf');
        gl.debug.onShaderError = (webgl, program, vertex, fragment) => props.onError([
          'Particle shader failed to compile', webgl.getShaderInfoLog(vertex), webgl.getShaderInfoLog(fragment), webgl.getProgramInfoLog(program),
        ].filter(Boolean).join('\n'));
        props.onReady();
      }}>
      <MountainScene {...props} onHover={onHover} visual={visual} />
    </Canvas>
  </div>;
}
