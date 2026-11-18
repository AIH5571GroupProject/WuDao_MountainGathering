import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

function BambooGroves({ dense = false }: { dense?: boolean }) {
  const trunks = useRef<THREE.InstancedMesh>(null);
  const leaves = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(() => {
    let seed = 137;
    const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const trees: { x: number; z: number; height: number; radius: number; shade: number }[] = [];
    const clusters = dense ? [[-9, 0, 2.6, 68], [-6.2, 1.2, 2.2, 58], [7.8, 0.2, 2.3, 76], [10, 1.3, 2.1, 58], [-11, -2, 1.8, 36], [11, -2.1, 2, 38], [-4, -4, 2, 55], [0, -5, 2.5, 65], [4, -4, 2, 55]] : [];
    for (const [cx, cz, scale, n] of clusters) {
      for (let i = 0; i < n; i++) {
        const angle = rand() * Math.PI * 2;
        const radius = Math.sqrt(rand()) * scale;
        trees.push({ x: cx + Math.cos(angle) * radius, z: cz + Math.sin(angle) * radius, height: 1.1 + rand() * 1.9, radius: 0.16 + rand() * 0.18, shade: rand() });
      }
    }
    return trees;
  }, [dense]);
  const count = data.length;
  useEffect(() => {
    if (!trunks.current || !leaves.current) return;
    const dummy = new THREE.Object3D();
    const trunkColors = ["#667a5d", "#7b8b68", "#536c53"];
    const leafColors = ["#7e926d", "#95a27c", "#aab291", "#697f5e"];
    data.forEach((tree, i) => {
      dummy.position.set(tree.x, tree.height / 2 - 0.12, tree.z);
      dummy.scale.set(tree.radius, tree.height, tree.radius);
      dummy.rotation.set(0, (i % 7) * 0.1, 0);
      dummy.updateMatrix(); trunks.current!.setMatrixAt(i, dummy.matrix);
      trunks.current!.setColorAt(i, new THREE.Color(trunkColors[Math.floor(tree.shade * trunkColors.length)]));
      dummy.position.set(tree.x, tree.height + 0.14, tree.z);
      dummy.scale.set(tree.radius * 3.5, tree.radius * 2, tree.radius * 3.1);
      dummy.rotation.set(tree.shade * 0.3, (i % 9) * 0.1, 0);
      dummy.updateMatrix(); leaves.current!.setMatrixAt(i, dummy.matrix);
      leaves.current!.setColorAt(i, new THREE.Color(leafColors[Math.floor(tree.shade * leafColors.length)]));
    });
    trunks.current.instanceMatrix.needsUpdate = true;
    leaves.current.instanceMatrix.needsUpdate = true;
    if (trunks.current.instanceColor) trunks.current.instanceColor.needsUpdate = true;
    if (leaves.current.instanceColor) leaves.current.instanceColor.needsUpdate = true;
  }, [data]);
  return <>
    <instancedMesh ref={trunks} args={[undefined, undefined, count]} castShadow receiveShadow>
      <cylinderGeometry args={[1, 1.15, 1, 7]} /><meshStandardMaterial color="#718565" roughness={0.92} />
    </instancedMesh>
    <instancedMesh ref={leaves} args={[undefined, undefined, count]} castShadow>
      <sphereGeometry args={[1, 9, 7]} /><meshStandardMaterial color="#91a17d" roughness={0.9} />
    </instancedMesh>
  </>;
}

function Canopy() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.22) * 0.008;
  });
  return <group ref={ref} position={[0, 0.35, 0]}>
    {[[-8, 2.4, 2.4], [-5.7, 3.2, 1.8], [-2.6, 2.5, 1.9], [1, 3, 2.3], [4.3, 2.8, 2.1], [7.8, 2.2, 2.7]].map(([x, z, s], i) => <mesh key={i} position={[x, 4.3 + (i % 2) * 0.4, z]} scale={[s, 0.28, s * 0.72]}>
      <sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial color={["#4e6b50", "#66805d", "#79906a"][i % 3]} transparent opacity={0.35} roughness={1} />
    </mesh>)}
  </group>;
}

function FloatingParticles({ count = 110 }: { count?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const particles = useMemo(() => Array.from({ length: count }, (_, i) => ({
    x: ((i * 37) % 240) / 10 - 12,
    y: 0.4 + ((i * 29) % 67) / 18,
    z: ((i * 61) % 115) / 10 - 5.5,
    size: 0.035 + (i % 5) * 0.013,
    phase: i * 0.78,
  })), [count]);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const obj = new THREE.Object3D();
    particles.forEach((p, i) => {
      obj.position.set(p.x + Math.sin(clock.elapsedTime * 0.24 + p.phase) * 0.08, p.y + Math.sin(clock.elapsedTime * 0.36 + p.phase) * 0.12, p.z);
      const s = p.size * (1 + Math.sin(clock.elapsedTime + p.phase) * 0.11);
      obj.scale.setScalar(s); obj.updateMatrix(); ref.current!.setMatrixAt(i, obj.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[undefined, undefined, count]}>
    <sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color="#c4cda7" transparent opacity={0.56} depthWrite={false} />
  </instancedMesh>;
}

function Fighter({ x, tone, accent, flip = false }: { x: number; tone: string; accent: string; flip?: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    ref.current.position.y = 1.0 + Math.sin(t * 2.1 + x) * 0.08;
    ref.current.rotation.z = Math.sin(t * 1.5 + x) * 0.045 + (flip ? -0.04 : 0.04);
    ref.current.position.x = x + Math.sin(t * 1.15 + x) * 0.14;
  });
  return <group ref={ref} position={[x, 1.0, 0]}>
    <mesh position={[0, 0.98, 0]}><sphereGeometry args={[0.39, 18, 14]} /><meshStandardMaterial color={tone} roughness={0.45} /></mesh>
    <mesh position={[0, 0.94, 0.28]} scale={[0.26, 0.27, 0.12]}><sphereGeometry args={[1, 14, 10]} /><meshStandardMaterial color={accent} roughness={0.4} /></mesh>
    <mesh position={[0, 0.04, 0]} scale={[0.63, 0.78, 0.45]}><sphereGeometry args={[1, 18, 14]} /><meshStandardMaterial color={tone} roughness={0.42} /></mesh>
    <mesh position={[flip ? -0.74 : 0.74, 0.35, 0]} rotation={[0, 0, flip ? -0.5 : 0.5]} scale={[0.28, 0.68, 0.27]}><capsuleGeometry args={[0.5, 0.45, 5, 10]} /><meshStandardMaterial color={accent} roughness={0.4} /></mesh>
    <mesh position={[flip ? 0.5 : -0.5, -0.66, 0]} rotation={[0, 0, flip ? -0.12 : 0.12]} scale={[0.42, 0.74, 0.3]}><capsuleGeometry args={[0.42, 0.56, 5, 9]} /><meshStandardMaterial color={tone} roughness={0.4} /></mesh>
    <mesh position={[0, 1.54, 0]}><sphereGeometry args={[0.075, 8, 6]} /><meshBasicMaterial color="#f2e7c9" /></mesh>
  </group>;
}

function GroveScene() {
  return <group>
    <mesh position={[0, -0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[11, 64]} /><meshStandardMaterial color="#53674b" roughness={1} /></mesh>
    <mesh position={[0, -0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[6, 48]} /><meshStandardMaterial color="#777b5d" roughness={1} /></mesh>
    <BambooGroves dense />
    <Canopy />
    <FloatingParticles count={160} />
    <Fighter x={-1.2} tone="#859376" accent="#d2c6a5" />
    <Fighter x={1.25} tone="#a77e60" accent="#decba5" flip />
    <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[3.2, 3.24, 96]} /><meshBasicMaterial color="#ded6b9" transparent opacity={0.36} /></mesh>
  </group>;
}


function GroveCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    camera.position.set(0, 7, 14);
    camera.lookAt(0, 1, 0);
    if (camera instanceof THREE.OrthographicCamera) {
      camera.zoom = Math.min(size.width / 24, size.height / 13);
      camera.updateProjectionMatrix();
    }
  }, [camera, size.width, size.height]);
  return null;
}

export default function World() {
  return <Canvas className="world-canvas" orthographic
    camera={{ position: [0, 7, 14], zoom: 55, near: .1, far: 80 }}
    dpr={[1, 1.5]} gl={{ antialias: true, alpha: false }}
    fallback={<div className="scene-fallback">三维竹林暂无法显示 · 仍可返回地图继续探索<br/>3D grove unavailable. Return to the map to continue.</div>}>
    <color attach="background" args={["#20372b"]} />
    <fog attach="fog" args={["#20372b", 19, 35]} />
    <ambientLight intensity={1.5} color="#e1e6cf" />
    <directionalLight position={[-4, 12, 8]} intensity={2} color="#fff7df" />
    <directionalLight position={[8, 7, -7]} intensity={.8} color="#b8c8aa" />
    <GroveCamera />
    <GroveScene />
  </Canvas>;
}
