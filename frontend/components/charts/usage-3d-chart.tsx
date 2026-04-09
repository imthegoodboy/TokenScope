"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";

interface ChartDataPoint {
  date: string;
  tokens: number;
  cost: number;
  provider: string;
}

interface Usage3DChartProps {
  data: ChartDataPoint[];
  period: "7d" | "14d" | "30d";
}

function Bar({
  position,
  height,
  color,
  label,
  value,
}: {
  position: [number, number, number];
  height: number;
  color: string;
  label: string;
  value: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} castShadow receiveShadow>
        <boxGeometry args={[0.6, Math.max(height, 0.05), 0.6]} />
        <meshStandardMaterial
          color={color}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>
      <mesh position={[0, -0.01, 0]} receiveShadow>
        <boxGeometry args={[0.6, 0.02, 0.6]} />
        <meshStandardMaterial color="#E8E4DE" roughness={0.8} />
      </mesh>
      <Text
        position={[0, -0.2, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.08}
        color="#6B6B6B"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  );
}

function Scene({ data }: { data: ChartDataPoint[] }) {
  const maxTokens = Math.max(...data.map((d) => d.tokens));
  const barWidth = 0.7;
  const spacing = 1.0;
  const totalWidth = (data.length - 1) * spacing;

  const providerColors: Record<string, string> = {
    openai: "#10A37F",
    anthropic: "#D4A574",
    gemini: "#4285F4",
  };

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} castShadow />
      <pointLight position={[-5, 5, -5]} intensity={0.3} color="#FAF7F2" />

      <group position={[-totalWidth / 2, 0, 0]}>
        {data.map((d, i) => {
          const height = (d.tokens / maxTokens) * 3;
          const color = providerColors[d.provider] || "#6B6B6B";
          const day = new Date(d.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          return (
            <Bar
              key={d.date}
              position={[i * spacing, height / 2, 0]}
              height={height}
              color={color}
              label={day}
              value={d.tokens}
            />
          );
        })}
      </group>

      {/* Floor */}
      <mesh position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[12, 6]} />
        <meshStandardMaterial color="#FAF7F2" roughness={0.9} />
      </mesh>

      <OrbitControls
        enablePan={false}
        minDistance={4}
        maxDistance={12}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.2}
        autoRotate
        autoRotateSpeed={0.5}
      />
    </>
  );
}

export function Usage3DChart({ data, period }: Usage3DChartProps) {
  const displayData = useMemo(() => {
    const count = period === "7d" ? 7 : period === "14d" ? 14 : 30;
    return data.slice(-count);
  }, [data, period]);

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [6, 4, 6], fov: 45 }}
        shadows
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Scene data={displayData} />
      </Canvas>
      {/* Legend */}
      <div className="absolute bottom-2 right-2 flex gap-3 bg-surface/80 backdrop-blur-sm rounded-lg px-3 py-1.5">
        {[
          { label: "OpenAI", color: "#10A37F" },
          { label: "Anthropic", color: "#D4A574" },
          { label: "Gemini", color: "#4285F4" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: l.color }} />
            <span className="text-xs text-black-muted">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
