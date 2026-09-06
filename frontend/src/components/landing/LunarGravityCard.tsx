import React, { useRef, useMemo, Suspense, useState, Component } from "react";
import type { ErrorInfo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

const RADIUS = 2.0;

/** Procedurally-generated photorealistic moon texture (no CDN) */
function createMoonTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Base
  ctx.fillStyle = "#8a8a8a";
  ctx.fillRect(0, 0, size, size);

  // Main dark-side shading
  const shade = ctx.createRadialGradient(size * 0.35, size * 0.3, size * 0.05, size * 0.55, size * 0.5, size * 0.75);
  shade.addColorStop(0, "rgba(215,210,195,0.95)");
  shade.addColorStop(0.35, "rgba(145,140,128,0.7)");
  shade.addColorStop(0.7, "rgba(80,75,68,0.8)");
  shade.addColorStop(1, "rgba(40,38,33,0.9)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, size, size);

  // Maria (dark flat areas)
  const maria = [
    { x: 0.55, y: 0.38, rx: 0.12, ry: 0.09 },
    { x: 0.42, y: 0.58, rx: 0.09, ry: 0.07 },
    { x: 0.68, y: 0.62, rx: 0.07, ry: 0.055 },
  ];
  for (const m of maria) {
    ctx.beginPath();
    ctx.ellipse(m.x * size, m.y * size, m.rx * size, m.ry * size, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(55,50,44,0.45)";
    ctx.fill();
  }

  // Craters
  const craters = [
    { x: 0.25, y: 0.30, r: 0.07 }, { x: 0.60, y: 0.55, r: 0.09 },
    { x: 0.45, y: 0.70, r: 0.05 }, { x: 0.75, y: 0.25, r: 0.06 },
    { x: 0.15, y: 0.60, r: 0.04 }, { x: 0.55, y: 0.20, r: 0.035 },
    { x: 0.80, y: 0.70, r: 0.055 }, { x: 0.35, y: 0.48, r: 0.03 },
    { x: 0.68, y: 0.40, r: 0.042 }, { x: 0.22, y: 0.78, r: 0.038 },
    { x: 0.50, y: 0.42, r: 0.025 }, { x: 0.30, y: 0.18, r: 0.028 },
  ];
  for (const c of craters) {
    const cx = c.x * size, cy = c.y * size, cr = c.r * size;
    const rim = ctx.createRadialGradient(cx - cr * 0.3, cy - cr * 0.3, cr * 0.1, cx, cy, cr * 1.3);
    rim.addColorStop(0, "rgba(200,195,180,0.0)");
    rim.addColorStop(0.72, "rgba(200,195,180,0.0)");
    rim.addColorStop(0.85, "rgba(230,225,210,0.6)");
    rim.addColorStop(1, "rgba(200,195,180,0.0)");
    ctx.beginPath(); ctx.arc(cx, cy, cr * 1.3, 0, Math.PI * 2);
    ctx.fillStyle = rim; ctx.fill();
    const floor = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
    floor.addColorStop(0, "rgba(70,65,58,0.85)");
    floor.addColorStop(1, "rgba(70,65,58,0.0)");
    ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fillStyle = floor; ctx.fill();
  }

  // Noise
  const imageData = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 22;
    imageData.data[i]     = Math.min(255, Math.max(0, imageData.data[i] + n));
    imageData.data[i + 1] = Math.min(255, Math.max(0, imageData.data[i + 1] + n));
    imageData.data[i + 2] = Math.min(255, Math.max(0, imageData.data[i + 2] + n));
  }
  ctx.putImageData(imageData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** The moon mesh */
const Moon = ({ onClick }: { onClick?: () => void }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useMemo(() => createMoonTexture(), []);

  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.045;
  });

  return (
    <mesh
      ref={meshRef}
      onClick={onClick}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "auto")}
    >
      <sphereGeometry args={[RADIUS, 72, 72]} />
      <meshStandardMaterial map={texture} roughness={0.94} metalness={0.03} />
    </mesh>
  );
};

/** Asteroid ring / debris field — matches the image */
const AsteroidRing = () => {
  const groupRef = useRef<THREE.Group>(null);
  const count = 160;

  const { positions, scales, rotations } = useMemo(() => {
    const pos: THREE.Vector3[] = [];
    const sc: number[] = [];
    const rot: THREE.Euler[] = [];

    for (let i = 0; i < count; i++) {
      // Spread in an elliptical band around the moon
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const spread = 0.4 + Math.random() * 1.2;
      const rx = (RADIUS + 0.6 + spread) * (1 + Math.random() * 0.3);
      const ry = (RADIUS + 0.1 + spread * 0.35);
      // Tilt the ring ~30deg
      const x = rx * Math.cos(angle);
      const y = (Math.random() - 0.5) * 0.8;
      const z = ry * Math.sin(angle);
      pos.push(new THREE.Vector3(x, y, z));
      sc.push(0.025 + Math.random() * 0.09);
      rot.push(new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI));
    }
    return { positions: pos, scales: sc, rotations: rot };
  }, []);

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.08;
  });

  return (
    <group ref={groupRef}>
      {positions.map((pos, i) => (
        <mesh key={i} position={pos} scale={scales[i]} rotation={rotations[i]}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.95} metalness={0.1} />
        </mesh>
      ))}
    </group>
  );
};

/** Particle dust trail — the teal/white spray in the image */
const DustTrail = () => {
  const count = 2400;
  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Arc trail starting from right side of moon, spreading outward
      const t = Math.random();
      const arc = -Math.PI * 0.05 + t * Math.PI * 0.75; // arc angle
      const r = (RADIUS + 0.3) + t * 3.5 + (Math.random() - 0.5) * 1.2;
      const spread = (1 - t) * 0.6 * (Math.random() - 0.5);
      pos[i * 3]     = r * Math.cos(arc);
      pos[i * 3 + 1] = spread + (Math.random() - 0.5) * t * 0.8;
      pos[i * 3 + 2] = r * Math.sin(arc) * 0.4;

      // Color: white → teal gradient
      const f = Math.random();
      if (f < 0.6) {
        col[i * 3] = 0.9; col[i * 3 + 1] = 0.95; col[i * 3 + 2] = 1.0; // white-blue
      } else {
        col[i * 3] = 0.1; col[i * 3 + 1] = 0.8; col[i * 3 + 2] = 0.75; // teal
      }
    }
    return { positions: pos, colors: col };
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.022} vertexColors sizeAttenuation transparent opacity={0.65} />
    </points>
  );
};

/** Star field */
const Stars = () => {
  const count = 1200;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 20 + Math.random() * 15;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
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
      <pointsMaterial color="#ffffff" size={0.055} sizeAttenuation transparent opacity={0.8} />
    </points>
  );
};

/** Error boundary */
class CanvasErrorBoundary extends Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("[LunarGravityCard] Canvas error:", error, info);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

interface LunarGravityCardProps {
  onLaunch?: () => void;
}

export default function LunarGravityCard({ onLaunch }: LunarGravityCardProps) {
  const [clicked, setClicked] = useState(false);

  const handleMoonClick = () => {
    setClicked(true);
    setTimeout(() => setClicked(false), 700);
    onLaunch?.();
  };

  const fallback = (
    <div style={{
      width: "100%", height: "100%", minHeight: 460, borderRadius: "2rem",
      background: "radial-gradient(ellipse at 50% 50%, #0f0f1a 0%, #000 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "rgba(255,255,255,0.2)", fontSize: "0.85rem", letterSpacing: "0.1em",
    }}>
      ESC
    </div>
  );

  return (
    <div style={{
      position: "relative",
      width: "100%",
      height: "100%",
      minHeight: 460,
      borderRadius: "2rem",
      overflow: "hidden",
      background: "radial-gradient(ellipse at 55% 45%, #0d0d1a 0%, #060608 70%, #000 100%)",
    }}>
      {/* Ambient glow */}
      <div style={{
        position: "absolute", top: "50%", left: "55%",
        transform: "translate(-50%, -50%)",
        width: 320, height: 320, borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(167,139,250,0.08) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 1,
      }} />

      <CanvasErrorBoundary fallback={fallback}>
        <Canvas
          camera={{ position: [0, 1.5, 7], fov: 42 }}
          style={{ position: "absolute", inset: 0, zIndex: 2 }}
        >
          {/* Lighting — key light from upper-left like the image */}
          <ambientLight intensity={0.07} />
          <directionalLight position={[-6, 4, 5]} intensity={2.6} color="#ddd8c8" />
          <directionalLight position={[8, -2, -4]} intensity={0.18} color="#4488ff" />
          <pointLight position={[0, 0, -6]} intensity={0.12} color="#6644cc" />

          <Suspense fallback={null}>
            <Stars />
            <DustTrail />
            <AsteroidRing />
            <Moon onClick={handleMoonClick} />
          </Suspense>

          <OrbitControls
            enableZoom={false}
            enablePan={false}
            rotateSpeed={0.45}
            minPolarAngle={Math.PI / 3.5}
            maxPolarAngle={Math.PI / 1.6}
          />
        </Canvas>
      </CanvasErrorBoundary>

      {/* Bottom label */}
      <div style={{
        position: "absolute", bottom: 20, left: 0, right: 0,
        display: "flex", justifyContent: "center",
        zIndex: 10, pointerEvents: "none",
      }}>
        <span style={{
          fontSize: "0.65rem", letterSpacing: "0.2em",
          textTransform: "uppercase", color: "rgba(255,255,255,0.28)",
        }}>
          drag to orbit · click to launch
        </span>
      </div>

      {/* Ripple on click */}
      {clicked && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 20,
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <div style={{
            width: 140, height: 140, borderRadius: "50%",
            border: "2px solid rgba(167,139,250,0.6)",
            animation: "escMoonRipple 0.7s ease-out forwards",
          }} />
        </div>
      )}
    </div>
  );
}
