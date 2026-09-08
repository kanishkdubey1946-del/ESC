import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import earthNightUrl from "@/assets/earth-night.png";

const EARTH_RADIUS = 2.35;
const ASTEROID_COUNT = 110;

// Globe center/radius inside the source photo (286x232). The photo is an
// orthographic view of the globe, so we can unwrap it into a full
// equirectangular map and spin a real sphere instead of a flat disc.
const CROP_CENTER = { x: 148, y: 118 };
const GLOBE_RADIUS_PX = 80;

function useEarthPanoTexture(src: string) {
  const [map, setMap] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const W = 1024;
      const H = 512;

      // Read the photo's pixels once for fast sampling
      const srcCanvas = document.createElement("canvas");
      srcCanvas.width = img.width;
      srcCanvas.height = img.height;
      const sctx = srcCanvas.getContext("2d")!;
      sctx.drawImage(img, 0, 0);
      const srcData = sctx.getImageData(0, 0, img.width, img.height).data;

      // Bilinear sample so the upscaled pano keeps detail instead of blocks
      const sample = (px: number, py: number) => {
        const x0 = Math.max(0, Math.min(img.width - 1, Math.floor(px)));
        const y0 = Math.max(0, Math.min(img.height - 1, Math.floor(py)));
        const x1 = Math.min(img.width - 1, x0 + 1);
        const y1 = Math.min(img.height - 1, y0 + 1);
        const fx = px - Math.floor(px);
        const fy = py - Math.floor(py);
        const w00 = (1 - fx) * (1 - fy);
        const w10 = fx * (1 - fy);
        const w01 = (1 - fx) * fy;
        const w11 = fx * fy;
        const i00 = (y0 * img.width + x0) * 4;
        const i10 = (y0 * img.width + x1) * 4;
        const i01 = (y1 * img.width + x0) * 4;
        const i11 = (y1 * img.width + x1) * 4;
        return [
          srcData[i00] * w00 + srcData[i10] * w10 + srcData[i01] * w01 + srcData[i11] * w11,
          srcData[i00 + 1] * w00 + srcData[i10 + 1] * w10 + srcData[i01 + 1] * w01 + srcData[i11 + 1] * w11,
          srcData[i00 + 2] * w00 + srcData[i10 + 2] * w10 + srcData[i01 + 2] * w01 + srcData[i11 + 2] * w11,
        ];
      };

      const pano = document.createElement("canvas");
      pano.width = W;
      pano.height = H;
      const pctx = pano.getContext("2d")!;
      const out = pctx.createImageData(W, H);
      const data = out.data;

      for (let v = 0; v < H; v++) {
        const lat = (0.5 - (v + 0.5) / H) * Math.PI;
        const sinLat = Math.sin(lat);
        const cosLat = Math.cos(lat);
        for (let u = 0; u < W; u++) {
          const lon = ((u + 0.5) / W) * Math.PI * 2;
          const x = cosLat * Math.sin(lon);
          const y = sinLat;

          // Orthographic photo coords. The visible hemisphere maps directly;
          // the unseen one falls on the same (x, y) via the z -> -z mirror,
          // so every longitude keeps real terrain detail.
          const rgb = sample(
            CROP_CENTER.x + x * GLOBE_RADIUS_PX,
            CROP_CENTER.y - y * GLOBE_RADIUS_PX,
          );

          const o = (v * W + u) * 4;
          data[o] = rgb[0];
          data[o + 1] = rgb[1];
          data[o + 2] = rgb[2];
          data[o + 3] = 255;
        }
      }
      pctx.putImageData(out, 0, 0);

      const texture = new THREE.CanvasTexture(pano);
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

const ATMOSPHERE_VERTEX = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ATMOSPHERE_FRAGMENT = `
  varying vec3 vNormal;
  void main() {
    float intensity = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
    gl_FragColor = vec4(0.42, 0.7, 1.0, 1.0) * intensity;
  }
`;

function Earth({ map }: { map: THREE.Texture }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.06;
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[EARTH_RADIUS, 96, 96]} />
        <meshBasicMaterial map={map} toneMapped={false} />
      </mesh>
      {/* Fresnel atmosphere halo, additive so it reads as glow at the limb */}
      <mesh scale={1.16}>
        <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
        <shaderMaterial
          vertexShader={ATMOSPHERE_VERTEX}
          fragmentShader={ATMOSPHERE_FRAGMENT}
          transparent
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
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

function createAsteroidGeometry(seed: number) {
  const geo = new THREE.IcosahedronGeometry(1, 3);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // Deterministic pseudo-noise so the lumpy shape is stable per render
    const n =
      Math.sin(v.x * 3.7 + seed) * Math.cos(v.y * 4.1 + seed * 1.7) +
      Math.sin(v.z * 5.3 + seed * 2.3) * 0.6;
    v.multiplyScalar(1 + n * 0.16);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

type HeroAsteroidProps = {
  rockMap: THREE.Texture;
};

function HeroAsteroid({ rockMap }: HeroAsteroidProps) {
  const orbitRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => createAsteroidGeometry(7.31), []);
  const angle = useRef(Math.PI * 0.55);

  // Elliptical, inclined orbit sized so the asteroid sweeps in front of Earth
  const ORBIT_X = 4.1;
  const ORBIT_Z = 5.4;
  const INCLINE = 0.42;
  const SPEED = 0.22;

  useFrame((_, delta) => {
    angle.current += SPEED * delta;
    const a = angle.current;

    if (orbitRef.current) {
      orbitRef.current.position.set(
        Math.cos(a) * ORBIT_X,
        Math.sin(a) * ORBIT_Z * Math.sin(INCLINE),
        Math.sin(a) * ORBIT_Z * Math.cos(INCLINE),
      );
    }
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.55;
      meshRef.current.rotation.y += delta * 0.32;
      meshRef.current.rotation.z += delta * 0.18;
    }
  });

  return (
    <group ref={orbitRef}>
      <mesh ref={meshRef} geometry={geometry} scale={0.48}>
        <meshStandardMaterial map={rockMap} roughness={0.95} metalness={0.05} color="#a89684" />
      </mesh>
    </group>
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
        <HeroAsteroid rockMap={rockMap} />
      </group>
    </>
  );
}

export default function EarthScene() {
  const earthMap = useEarthPanoTexture(earthNightUrl);

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
