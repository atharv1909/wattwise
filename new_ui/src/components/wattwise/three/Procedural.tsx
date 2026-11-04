// Procedurally modeled artifacts for appliances with no SimReady equivalent:
// split-AC indoor unit, Wi-Fi router, storage geyser. Clean PBR geometry so
// they blend with the photoreal SimReady/LG assets.
"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function SplitAC({ isOn, setpoint }: { isOn: boolean; setpoint: number }) {
  const ledRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (ledRef.current) {
      ledRef.current.emissiveIntensity = isOn ? 1.2 + Math.sin(clock.elapsedTime * 2.4) * 0.35 : 0.05;
    }
  });
  return (
    <group>
      {/* body */}
      <RoundedBox args={[0.92, 0.32, 0.235]} radius={0.045} smoothness={6}>
        <meshStandardMaterial color="#f4f5f4" roughness={0.32} metalness={0.06} />
      </RoundedBox>
      {/* front fascia seam */}
      <mesh position={[0, -0.055, 0.119]}>
        <boxGeometry args={[0.86, 0.012, 0.004]} />
        <meshStandardMaterial color="#c9cdc9" roughness={0.5} />
      </mesh>
      {/* louver slit */}
      <mesh position={[0, -0.115, 0.117]}>
        <boxGeometry args={[0.8, 0.028, 0.006]} />
        <meshStandardMaterial color="#2a2c2e" roughness={0.7} />
      </mesh>
      {/* brand strip */}
      <mesh position={[0.3, 0.06, 0.118]}>
        <boxGeometry args={[0.16, 0.03, 0.003]} />
        <meshStandardMaterial color="#9aa0a6" roughness={0.4} metalness={0.4} />
      </mesh>
      {/* status LED */}
      <mesh position={[0.38, 0.115, 0.119]}>
        <sphereGeometry args={[0.011, 12, 12]} />
        <meshStandardMaterial ref={ledRef} color="#22c55e" emissive="#22c55e" emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
      {/* cool-air shimmer cone when running */}
      {isOn && (
        <mesh position={[0, -0.5, 0.28]} rotation={[0.5, 0, 0]}>
          <coneGeometry args={[0.42, 0.85, 20, 1, true]} />
          <meshBasicMaterial color="#7dd3fc" transparent opacity={0.055} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
      {/* setpoint tag */}
      {isOn && (
        <mesh position={[-0.36, 0.115, 0.119]}>
          <planeGeometry args={[0.09, 0.028]} />
          <meshBasicMaterial color={`hsl(${200 - setpoint * 6}, 70%, 55%)`} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

function RoundedBox({ args, radius = 0.02, smoothness = 4, children, ...rest }: { args: [number, number, number]; radius?: number; smoothness?: number; children: React.ReactNode; [k: string]: unknown }) {
  // lightweight rounded box via extruded shape
  const shape = new THREE.Shape();
  const [w, h] = [args[0] / 2, args[1] / 2];
  const r = radius;
  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h);
  shape.quadraticCurveTo(w, -h, w, -h + r);
  shape.lineTo(w, h - r);
  shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(-w + r, h);
  shape.quadraticCurveTo(-w, h, -w, h - r);
  shape.lineTo(-w, -h + r);
  shape.quadraticCurveTo(-w, -h, -w + r, -h);
  const geom = new THREE.ExtrudeGeometry(shape, { depth: args[2] - 0.001, bevelEnabled: false, curveSegments: smoothness });
  geom.translate(0, 0, -(args[2] - 0.001) / 2);
  return (
    <mesh geometry={geom} {...rest}>
      {children}
    </mesh>
  );
}

export function Router({ isOn }: { isOn: boolean }) {
  const ledsRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ledsRef.current) {
      ledsRef.current.children.forEach((c, i) => {
        const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial;
        m.emissiveIntensity = isOn ? (Math.sin(clock.elapsedTime * (2 + i) + i * 2) > 0 ? 1.4 : 0.15) : 0;
      });
    }
  });
  return (
    <group>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.19, 0.04, 0.13]} />
        <meshStandardMaterial color="#1c1e21" roughness={0.45} />
      </mesh>
      {[-0.06, 0.06].map((x, i) => (
        <mesh key={i} position={[x, 0.09, 0]} rotation={[0, 0, 0.12]}>
          <cylinderGeometry args={[0.004, 0.004, 0.11, 8]} />
          <meshStandardMaterial color="#242629" roughness={0.5} />
        </mesh>
      ))}
      <group ref={ledsRef} position={[0.055, 0.041, 0.05]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[-i * 0.022, 0, 0]}>
            <sphereGeometry args={[0.004, 8, 8]} />
            <meshStandardMaterial color="#4ade80" emissive="#4ade80" emissiveIntensity={1.2} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function Geyser({ isOn }: { isOn: boolean }) {
  const ledRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (ledRef.current) {
      ledRef.current.emissiveIntensity = isOn ? (Math.sin(clock.elapsedTime * 1.2) > 0.4 ? 1.6 : 0.1) : 0.05;
    }
  });
  return (
    <group>
      {/* tank */}
      <mesh>
        <cylinderGeometry args={[0.23, 0.23, 0.62, 24]} />
        <meshStandardMaterial color="#eef0f2" roughness={0.28} metalness={0.1} />
      </mesh>
      {/* caps */}
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.235, 0.235, 0.035, 24]} />
        <meshStandardMaterial color="#d8dcdf" roughness={0.35} />
      </mesh>
      <mesh position={[0, -0.32, 0]}>
        <cylinderGeometry args={[0.235, 0.235, 0.035, 24]} />
        <meshStandardMaterial color="#d8dcdf" roughness={0.35} />
      </mesh>
      {/* inlet/outlet pipes */}
      <mesh position={[0.16, -0.38, 0]}>
        <cylinderGeometry args={[0.017, 0.017, 0.12, 10]} />
        <meshStandardMaterial color="#b9bec3" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0.02, -0.38, 0]}>
        <cylinderGeometry args={[0.017, 0.017, 0.12, 10]} />
        <meshStandardMaterial color="#b9bec3" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* heat glow when on */}
      {isOn && (
        <mesh position={[0, 0, -0.1]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshBasicMaterial color="#fb923c" transparent opacity={0.35} toneMapped={false} />
        </mesh>
      )}
      {/* indicator */}
      <mesh position={[0.1, 0.1, 0.231]}>
        <sphereGeometry args={[0.012, 10, 10]} />
        <meshStandardMaterial ref={ledRef} color="#f59e0b" emissive="#f59e0b" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function TVScreenGlow({ width, height }: { width: number; height: number }) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    if (matRef.current) {
      const t = clock.elapsedTime;
      matRef.current.color.setHSL(0.55 + Math.sin(t * 0.4) * 0.08, 0.5, 0.55 + Math.sin(t * 0.9) * 0.06);
    }
  });
  return (
    <mesh position={[0, height * 0.06, 0.012]}>
      <planeGeometry args={[width * 0.92, height * 0.88]} />
      <meshBasicMaterial ref={matRef} transparent opacity={0.55} toneMapped={false} depthWrite={false} />
    </mesh>
  );
}
