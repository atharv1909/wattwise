// SimReady GLB artifact — loads the converted NVIDIA/LG asset, normalizes it
// to its real-world height, and wires interactivity (selection, ON/OFF glow,
// fan spin, TV screen glow). Procedural artifacts (split AC / router / geyser)
// are modeled inline.
"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { ARTIFACTS, type Appliance } from "@/lib/wattwise/types";
import { SplitAC, Router, Geyser, TVScreenGlow } from "./Procedural";

const BASE = "/assets/simready/";

interface ArtifactProps {
  appliance: Appliance;
  selected: boolean;
  onSelect: (id: number) => void;
}

export function Artifact({ appliance, selected, onSelect }: ArtifactProps) {
  const key = appliance.artifact3d ?? "";
  if (key === "split_ac" || key === "router" || key === "geyser") {
    return <ProceduralArtifact appliance={appliance} selected={selected} onSelect={onSelect} kind={key} />;
  }
  if (!ARTIFACTS[key]) return null;
  return <GlbArtifact appliance={appliance} selected={selected} onSelect={onSelect} />;
}

function ProceduralArtifact({
  appliance,
  selected,
  onSelect,
  kind,
}: ArtifactProps & { kind: "split_ac" | "router" | "geyser" }) {
  const [hovered, setHovered] = useState(false);
  const on = appliance.is_on ?? true;
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(appliance.id);
  };
  const dims: [number, number] = kind === "split_ac" ? [1.05, 0.42] : kind === "router" ? [0.32, 0.24] : [0.6, 0.6];
  return (
    <group
      position={[appliance.pos_x, appliance.pos_y, appliance.pos_z]}
      rotation={[0, appliance.rot_y ?? 0, 0]}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {kind === "split_ac" && <SplitAC isOn={on} setpoint={24} />}
      {kind === "router" && <Router isOn={on} />}
      {kind === "geyser" && <Geyser isOn={on} />}
      <SelectionRing visible={selected || hovered} width={dims[0]} depth={dims[1]} />
    </group>
  );
}

function GlbArtifact({ appliance, selected, onSelect }: ArtifactProps) {
  const [hovered, setHovered] = useState(false);
  const spinRef = useRef<THREE.Group>(null);
  const spec = ARTIFACTS[appliance.artifact3d ?? ""];
  const gltf = useGLTF(BASE + spec.file);

  const normalized = useMemo(() => {
    const scene = gltf.scene.clone(true);
    scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = false;
        o.receiveShadow = false;
      }
    });
    const bbox = new THREE.Box3().setFromObject(scene);
    const size = bbox.getSize(new THREE.Vector3());
    const scale = spec.heightM / Math.max(size.y, 1e-6);
    scene.scale.setScalar(scale);
    const nb = new THREE.Box3().setFromObject(scene);
    const center = nb.getCenter(new THREE.Vector3());
    scene.position.x -= center.x;
    scene.position.z -= center.z;
    scene.position.y -= nb.min.y;
    return scene;
  }, [gltf, spec]);

  useFrame((_, delta) => {
    if (spinRef.current && (appliance.is_on ?? true) && (appliance.fan_speed ?? 0) > 0) {
      spinRef.current.rotation.y += delta * (1.4 + (appliance.fan_speed ?? 3) * 1.25);
    }
  });

  const isFan = appliance.category === "Ceiling Fan";
  const isTV = appliance.artifact3d === "tv";
  const on = appliance.is_on ?? true;

  return (
    <group position={[appliance.pos_x, appliance.pos_y, appliance.pos_z]} rotation={[0, appliance.rot_y ?? 0, 0]}>
      <group
        ref={isFan ? spinRef : undefined}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(appliance.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <primitive object={normalized} />
        {isTV && on && <TVScreen television={normalized} />}
      </group>
      <SelectionRing visible={selected || hovered} width={1.25} depth={1.05} />
    </group>
  );
}

/** TV screen glow sized from the loaded model's bounding box. */
function TVScreen({ television }: { television: THREE.Object3D }) {
  const { size } = useMemo(() => {
    const bbox = new THREE.Box3().setFromObject(television);
    const s = bbox.getSize(new THREE.Vector3());
    return { size: s };
  }, [television]);
  return <TVScreenGlow width={size.x} height={size.y} />;
}

function SelectionRing({ visible, width, depth }: { visible: boolean; width: number; depth: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      const m = ref.current.material as THREE.MeshBasicMaterial;
      m.opacity = visible ? 0.35 + Math.sin(clock.elapsedTime * 3) * 0.15 : 0;
    }
  });
  return (
    <mesh ref={ref} position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[Math.max(width, depth) * 0.42, Math.max(width, depth) * 0.55, 40]} />
      <meshBasicMaterial color="#fbbf24" transparent opacity={0.4} toneMapped={false} depthWrite={false} />
    </mesh>
  );
}

/** Static, non-interactive normalized GLB for furniture props. */
export function NormalizedStatic({ file, height, artifactKey }: { file: string; height: number; artifactKey: string }) {
  const gltf = useGLTF(BASE + file);
  const spec = ARTIFACTS[artifactKey];
  const normalized = useMemo(() => {
    const scene = gltf.scene.clone(true);
    const bbox = new THREE.Box3().setFromObject(scene);
    const size = bbox.getSize(new THREE.Vector3());
    const target = spec?.heightM ?? height;
    const scale = target / Math.max(size.y, 1e-6);
    scene.scale.setScalar(scale);
    const nb = new THREE.Box3().setFromObject(scene);
    const center = nb.getCenter(new THREE.Vector3());
    scene.position.x -= center.x;
    scene.position.z -= center.z;
    scene.position.y -= nb.min.y;
    return scene;
  }, [gltf, spec, height]);
  return <primitive object={normalized} />;
}

export function preloadArtifacts(keys: string[]) {
  for (const k of keys) {
    const spec = ARTIFACTS[k];
    if (spec) useGLTF.preload(BASE + spec.file);
  }
}
