import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import earthMapUrl from "@/assets/earth-map.jpg";

const EARTH_RADIUS = 2.35;
const ASTEROID_COUNT = 110;

function useImageTexture(src: string) {
  const [map, setMap] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const texture = new THREE.Texture(img);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      texture.needsUpdate = true;
      setMap(texture);
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  return map;
}

function createRockTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#6b5b4a";
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 80; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, 4 + Math.random() * 18, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${90 + Math.random() * 70},${70 + Math.random() * 50},${50 + Math.random() * 30},${0.25 + Math.random() * 0.4})`;
    ctx.fill();
  }

  const data = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < data.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 36;
    data.data[i] = Math.min(255, Math.max(0, data.data[i] + n));
    data.data[i + 1] = Math.min(255, Math.max(0, data.data[i + 1] + n * 0.9));
    data.data[i + 2] = Math.min(255, Math.max(0, data.data[i + 2] + n * 0.7));
  }
  ctx.putImageData(data, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function Earth({ map }: { map: THREE.Texture }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.045;
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[EARTH_RADIUS, 96, 96]} />
        <meshBasicMaterial map={map} toneMapped={false} />
      </mesh>
      <mesh scale={1.045}>
        <sphereGeometry args={[EARTH_RADIUS, 48, 48]} />
        <meshBasicMaterial
          color="#67b7ff"
          transparent
          opacity={0.16}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

type AsteroidData = {
  radius: number;
  speed: number;
  tilt: number;
  phase: number;
  y: number;
  scale: number;
  rx: number;
  ry: number;
  rz: number;
  spin: THREE.Vector3;
};

function generateAsteroids(count: number): AsteroidData[] {
  const data: AsteroidData[] = [];
  for (let i = 0; i < count; i++) {
    const band = Math.random();
    const radius = band < 0.7
      ? 3.15 + Math.random() * 1.35
      : 4.5 + Math.random() * 1.8;
    data.push({
      radius,
      speed: (0.05 + Math.random() * 0.12) * (Math.random() > 0.45 ? 1 : -1),
      tilt: (Math.random() - 0.5) * 0.35,
      phase: Math.random() * Math.PI * 2,
      y: (Math.random() - 0.5) * 1.15,
      scale: 0.04 + Math.pow(Math.random(), 3.2) * 0.28,
      rx: Math.random() * Math.PI,
      ry: Math.random() * Math.PI,
      rz: Math.random() * Math.PI,
      spin: new THREE.Vector3(
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.8,
      ),
    });
  }
  return data;
}

function AsteroidBelt({ rockMap }: { rockMap: THREE.Texture }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const [asteroids] = useState(() => generateAsteroids(ASTEROID_COUNT));
  const geometry = useMemo(() => {
    const geo = new THREE.DodecahedronGeometry(1, 0);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i);
      v.multiplyScalar(0.75 + Math.random() * 0.5);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    asteroids.forEach((ast, i) => {
      ast.phase += ast.speed * delta;
      ast.rx += ast.spin.x * delta;
      ast.ry += ast.spin.y * delta;
      ast.rz += ast.spin.z * delta;

      const x = Math.cos(ast.phase) * ast.radius;
      const z = Math.sin(ast.phase) * ast.radius;
      const y = ast.y + Math.sin(ast.phase * 2) * ast.tilt;

      dummy.position.set(x, y, z);
      dummy.rotation.set(ast.rx, ast.ry, ast.rz);
      dummy.scale.setScalar(ast.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, ASTEROID_COUNT]}>
      <meshStandardMaterial
        map={rockMap}
        roughness={0.92}
        metalness={0.08}
        color="#c4b19a"
      />
    </instancedMesh>
  );
}

function Stars() {
  const positions = useMemo(() => {
    const count = 1800;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 18 + Math.random() * 28;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.045} sizeAttenuation transparent opacity={0.85} />
    </points>
  );
}

function Scene({ earthMap }: { earthMap: THREE.Texture }) {
  const rockMap = useMemo(() => createRockTexture(), []);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.012;
  });

  return (
    <>
      <color attach="background" args={["#05050c"]} />
      <ambientLight intensity={1.35} />
      <directionalLight position={[6, 4, 8]} intensity={0.85} color="#fff6e8" />
      <directionalLight position={[-7, -2, -5]} intensity={0.7} color="#dbe7ff" />
      <Stars />
      <group ref={groupRef} position={[1.15, -0.1, 0]} rotation={[0.18, 0.4, 0]}>
        <Earth map={earthMap} />
        <AsteroidBelt rockMap={rockMap} />
      </group>
    </>
  );
}

export default function EarthScene() {
  const earthMap = useImageTexture(earthMapUrl);

  return (
    <Canvas
      camera={{ position: [0, 0.35, 8.2], fov: 42 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: false }}
    >
      <Suspense fallback={null}>
        {earthMap ? <Scene earthMap={earthMap} /> : <color attach="background" args={["#05050c"]} />}
      </Suspense>
    </Canvas>
  );
}
