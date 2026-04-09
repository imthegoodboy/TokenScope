"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

interface ScatterPoint {
  tokens: number;
  cost: number;
  provider: string;
  model: string;
}

interface Analytics3DProps {
  data: ScatterPoint[];
}

function ScatterPointMesh({
  position,
  color,
  size,
}: {
  position: [number, number, number];
  color: string;
  size: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y =
        position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.05;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[size, 16, 16]} />
      <meshStandardMaterial color={color} roughness={0.2} metalness={0.4} />
    </mesh>
  );
}

function Scene({ data }: { data: ScatterPoint[] }) {
  const maxTokens = Math.max(...data.map((d) => d.tokens));
  const maxCost = Math.max(...data.map((d) => d.cost));

  const providerColors: Record<string, string> = {
    openai: "#F07F3C",
    anthropic: "#16563B",
    gemini: "#002F4B",
  };

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={0.7} castShadow />
      <pointLight position={[-3, 5, -3]} intensity={0.3} color="#F7F4F0" />

      {data.map((d, i) => {
        const x = (d.tokens / maxTokens) * 4 - 2;
        const y = (d.cost / maxCost) * 2;
        const z = (i / data.length) * 4 - 2;
        const color = providerColors[d.provider] || "#6B6B6B";
        const size = Math.max(0.05, d.cost / maxCost * 0.15 + 0.03);

        return (
          <ScatterPointMesh
            key={i}
            position={[x, y, z]}
            color={color}
            size={size}
          />
        );
      })}

      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={12}
        autoRotate
        autoRotateSpeed={0.3}
      />
    </>
  );
}

export function Analytics3D({ data }: Analytics3DProps) {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [5, 3, 5], fov: 45 }}
        shadows
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Scene data={data} />
      </Canvas>
    </div>
  );
}
