import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// A screen-filling cloud curtain lets the camera travel through the same world.
// No image, video or external asset is required for the entrance.
export function ArrivalMist({ visual, calm }: { visual: MutableRefObject<{ arrival: number; time: number }>; calm: boolean }) {
  const mesh = useRef<THREE.Mesh>(null);
  const { size } = useThree();
  const material = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false,
    uniforms: { uOpen: { value: 0 }, uTime: { value: 0 }, uAspect: { value: 1 } },
    vertexShader: `varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
    fragmentShader: `precision highp float;
      varying vec2 vUv;
      uniform float uOpen, uTime, uAspect;
      float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p) {
        vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);
      }
      float fbm(vec2 p) { float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*noise(p); p=p*2.03+vec2(17.,3.); a*=.5; } return s; }
      void main() {
        vec2 q=(vUv-.5)*vec2(uAspect,1.);
        float side=sign(q.x);
        vec2 flow=q*2.2-vec2(side*uOpen*2.5,uOpen*.7);
        float n=fbm(flow+vec2(uTime*.019, -uTime*.012));
        float billow=fbm(flow*1.5+vec2(n*1.7,uTime*.015));
        float distanceFromCenter=length(vec2(q.x*.82,q.y*1.05));
        float rim=smoothstep(uOpen*2.1-.10,uOpen*2.1+.24,distanceFromCenter+(billow-.5)*.45);
        float alpha=mix(1.,rim,smoothstep(0.,.18,uOpen))*(1.-smoothstep(.70,1.,uOpen));
        vec3 paper=vec3(.914,.925,.875);
        vec3 sage=vec3(.70,.76,.65);
        float shade=smoothstep(.23,.80,n)*.40+billow*.07;
        vec3 col=mix(paper,sage,shade);
        col+=vec3(.018,.016,.009)*(1.-length(q)*.28);
        gl_FragColor=vec4(col,alpha);
      }`,
  }), []);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(() => {
    const { arrival, time } = visual.current;
    if (mesh.current) mesh.current.visible = arrival < 1;
    material.uniforms.uOpen.value = arrival;
    material.uniforms.uTime.value = calm ? 0 : time;
    material.uniforms.uAspect.value = size.width / size.height;
  });
  return <mesh ref={mesh} renderOrder={100} frustumCulled={false} material={material} raycast={() => {}}><planeGeometry args={[2, 2]} /></mesh>;
}
