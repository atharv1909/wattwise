// WattWise 3D Virtual Household — dollhouse scene composed of a procedural
// shell (floors, partitions, labels) with NVIDIA SimReady / LG SimReady GLB
// artifacts placed per room, live power-draw lighting, and full interactivity.
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { FLOORPLANS } from "@/lib/wattwise/seed";
import { ARTIFACTS, type Room } from "@/lib/wattwise/types";
import { Artifact, NormalizedStatic } from "./Artifact";
import { useWattWise } from "../useWattWise";

const ROOM_COLORS: Record<string, string> = {
  "Living Room": "#8d7b64",
  Bedroom: "#7d7590",
  Kitchen: "#6f8474",
  Bathroom: "#65808f",
  Balcony: "#8a8265",
};

function Rooms({ rooms }: { rooms: Room[] }) {
  return (
    <group>
      {rooms.map((r) => {
        const color = ROOM_COLORS[r.room_type] ?? "#7f7a70";
        return (
          <group key={r.id}>
            <mesh position={[r.x + r.w / 2, 0.006, r.z + r.d / 2]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[r.w, r.d]} />
              <meshStandardMaterial color={color} roughness={0.9} metalness={0.02} />
            </mesh>
            {[
              { x: r.x + r.w / 2, z: r.z + 0.045, w: r.w, rot: 0 },
              { x: r.x + r.w / 2, z: r.z + r.d - 0.045, w: r.w, rot: 0 },
              { x: r.x + 0.045, z: r.z + r.d / 2, w: r.d, rot: Math.PI / 2 },
              { x: r.x + r.w - 0.045, z: r.z + r.d / 2, w: r.d, rot: Math.PI / 2 },
            ].map((wall, i) => (
              <mesh key={i} position={[wall.x, 0.45, wall.z]} rotation={[0, wall.rot, 0]}>
                <boxGeometry args={[wall.w, 0.9, 0.09]} />
                <meshStandardMaterial color="#cbc4b8" roughness={0.95} />
              </mesh>
            ))}
            {[
              [r.x, r.z],
              [r.x + r.w, r.z],
              [r.x, r.z + r.d],
              [r.x + r.w, r.z + r.d],
            ].map(([px, pz], i) => (
              <mesh key={i} position={[px, 1.35, pz]}>
                <boxGeometry args={[0.09, 2.7, 0.09]} />
                <meshStandardMaterial color="#b7b0a4" roughness={0.9} />
              </mesh>
            ))}
            <Html position={[r.x + r.w / 2, 0.02, r.z + r.d - 0.14]} center distanceFactor={9} zIndexRange={[10, 0]}>
              <div className="whitespace-nowrap rounded-sm bg-black/55 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-amber-50 backdrop-blur-sm">
                {r.name}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

function BaseSlab({ w, d }: { w: number; d: number }) {
  return (
    <group>
      <mesh position={[w / 2, -0.02, d / 2]}>
        <boxGeometry args={[w + 0.6, 0.08, d + 0.6]} />
        <meshStandardMaterial color="#57534e" roughness={1} />
      </mesh>
      <mesh position={[w / 2, -0.062, d / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w + 7, d + 7]} />
        <meshStandardMaterial color="#3b3733" roughness={1} />
      </mesh>
    </group>
  );
}

function Props() {
  const props = useWattWise((s) => s.props);
  const [batch, setBatch] = useState(4);
  useEffect(() => {
    if (batch >= props.length) return;
    const t = setTimeout(() => setBatch((b) => b + 4), 700);
    return () => clearTimeout(t);
  }, [batch, props.length]);
  return (
    <group>
      {props.slice(0, batch).map((p, i) => (
        <group key={i} position={p.pos} rotation={[0, p.rotY ?? 0, 0]} scale={p.scale ?? 1}>
          <Suspense fallback={null}>
            <NormalizedStatic file={ARTIFACTS[p.artifact3d]?.file ?? ""} height={ARTIFACTS[p.artifact3d]?.heightM ?? 1} artifactKey={p.artifact3d} />
          </Suspense>
        </group>
      ))}
    </group>
  );
}

function RoomLights() {
  const bundle = useWattWise((s) => s.bundle);
  const lights = useMemo(() => {
    if (!bundle) return [];
    return bundle.appliances.filter((a) => a.category === "Lighting" && (a.is_on ?? true)).slice(0, 1);
  }, [bundle]);
  return (
    <group>
      {lights.map((a) => (
        <pointLight
          key={a.id}
          position={[a.pos_x, Math.max(1.4, a.pos_y - 0.25), a.pos_z]}
          intensity={12}
          distance={6}
          decay={1.8}
          color="#ffd9a0"
        />
      ))}
    </group>
  );
}

function ApplianceGroundDiscs() {
  const bundle = useWattWise((s) => s.bundle);
  const discs = useMemo(() => {
    if (!bundle) return [];
    return bundle.appliances.filter((a) =>
      ["refrigerator", "washer", "gas_range", "water_cooler", "air_purifier"].includes(a.artifact3d ?? "")
    );
  }, [bundle]);
  return (
    <group>
      {discs.map((a) => (
        <mesh key={a.id} position={[a.pos_x, 0.009, a.pos_z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.42, 24]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.18} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function SceneContent() {
  const bundle = useWattWise((s) => s.bundle);
  const selectedId = useWattWise((s) => s.selectedApplianceId);
  const selectAppliance = useWattWise((s) => s.selectAppliance);
  const plan = bundle ? FLOORPLANS[bundle.household.archetype] : null;
  const [batch, setBatch] = useState(4);

  // progressive artifact mounting: shell first, GLB appliances in batches so
  // the first paint (and software renderers) stay responsive
  useEffect(() => {
    if (!bundle) return;
    if (batch >= bundle.appliances.length) return;
    const t = setTimeout(() => setBatch((b) => b + 3), 650);
    return () => clearTimeout(t);
  }, [batch, bundle]);

  const ordered = useMemo(() => {
    if (!bundle) return [];
    const weight: Record<string, number> = { refrigerator: 90, tv: 80, ceiling_fan: 85, blinds: 60, water_cooler: 55, air_purifier: 45, washer: 40, gas_range: 42 };
    return [...bundle.appliances].sort((a, b2) => (weight[a.artifact3d ?? ""] ?? 20) - (weight[b2.artifact3d ?? ""] ?? 20));
  }, [bundle]);

  if (!bundle || !plan) return null;
  const { w, d } = plan.footprint;
  const center: [number, number, number] = [w / 2, 0, d / 2];
  return (
    <group>
      <hemisphereLight args={["#fdf4e3", "#3a332b", 0.85]} />
      <directionalLight position={[w * 0.9, 9, d * 0.4]} intensity={1.15} color="#fff1dd" />
      <directionalLight position={[-4, 5, -3]} intensity={0.25} color="#c9d8ff" />
      <BaseSlab w={w} d={d} />
      <Rooms rooms={bundle.rooms} />
      <Props />
      <ApplianceGroundDiscs />
      {ordered.slice(0, batch).map((a) => (
        <Artifact key={a.id} appliance={a} selected={selectedId === a.id} onSelect={selectAppliance} />
      ))}
      <RoomLights />
      <FanDriver />
      <OrbitControls
        target={center}
        enableDamping
        dampingFactor={0.08}
        minDistance={3.2}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2.08}
      />
    </group>
  );
}

/**
 * In demand frameloop mode, drives just-enough invalidation: smooth 60fps
 * fan spin + glow cycles on hardware GL, a slow tick on software renderers
 * (SwiftShader) so the page never saturates the main thread.
 */
function FanDriver() {
  const bundle = useWattWise((s) => s.bundle);
  const invalidate = useThree((s) => s.invalidate);
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const ext = gl.getContext().getExtension("WEBGL_debug_renderer_info");
    const renderer = ext ? String(gl.getContext().getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "";
    const software = /swiftshader|software|llvmpipe/i.test(renderer);
    const anyFanOn = (bundle?.appliances ?? []).some((a) => a.category === "Ceiling Fan" && (a.is_on ?? true));
    const period = software ? 2000 : anyFanOn ? 16 : 400;
    const t = setInterval(() => invalidate(), period);
    return () => clearInterval(t);
  }, [bundle, invalidate, gl]);
  return null;
}

export default function HouseScene() {
  const bundle = useWattWise((s) => s.bundle);
  const plan = bundle ? FLOORPLANS[bundle.household.archetype] : null;
  const { w, d } = plan?.footprint ?? { w: 9.5, d: 7.5 };
  return (
    <Canvas
      frameloop="demand"
      dpr={[0.75, 1.4]}
      camera={{ position: [w / 2 + w * 0.72, 6.4, d / 2 + d * 0.95], fov: 42, near: 0.1, far: 80 }}
      gl={{ antialias: false, powerPreference: "high-performance", stencil: false, depth: true }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        scene.fog = new THREE.Fog("#191613", 16, 34);
      }}
    >
      <color attach="background" args={["#191613"]} />
      <Suspense fallback={null}>
        <SceneContent />
      </Suspense>
    </Canvas>
  );
}

