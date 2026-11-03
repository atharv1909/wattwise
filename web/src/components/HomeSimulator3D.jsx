import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';

// ============================================================================
// ARCHETYPE LAYOUT SPECIFICATIONS (Average Indian Households)
// ============================================================================
export const HOUSE_ARCHETYPES = {
  '2BHK': {
    name: '2BHK Apartment (Standard Indian Middle-Class)',
    areaSqFt: 950,
    dimensions: { width: 14, length: 11 },
    rooms: [
      { id: 'living', name: 'Living & Dining Hall', type: 'living', x: -2.5, z: -1.5, w: 8, l: 6.5, color: '#2b3345' },
      { id: 'master_bed', name: 'Master Bedroom', type: 'bedroom', x: 4.0, z: -2.2, w: 4.8, l: 5.0, color: '#263042' },
      { id: 'bed2', name: 'Kids / Guest Bedroom', type: 'bedroom', x: 4.0, z: 3.2, w: 4.8, l: 4.2, color: '#263042' },
      { id: 'kitchen', name: 'Modular Kitchen', type: 'kitchen', x: -4.5, z: 3.2, w: 4.0, l: 4.2, color: '#2e3846' },
      { id: 'bath_master', name: 'Master Bath', type: 'bathroom', x: 0.2, z: 3.2, w: 2.8, l: 2.2, color: '#30394a' },
      { id: 'balcony', name: 'Utility Balcony', type: 'balcony', x: -1.0, z: 4.6, w: 4.0, l: 1.4, color: '#222938' }
    ],
    defaultAppliances: [
      { id: 1, name: '1.5-Ton Split AC', category: 'Air Conditioner', rated_w: 1500, bee_star_rating: 3, room: 'master_bed', x: 4.0, y: 1.9, z: -4.5, type: 'ac', is_on: true, model_kind: 'thermostatic', temp_c: 24 },
      { id: 2, name: 'Living Ceiling Fan 1', category: 'Ceiling Fan', rated_w: 75, bee_star_rating: 1, room: 'living', x: -4.0, y: 2.2, z: -1.5, type: 'fan', is_on: true, speed: 4, model_kind: 'scheduled' },
      { id: 3, name: 'Living Ceiling Fan 2', category: 'Ceiling Fan', rated_w: 75, bee_star_rating: 1, room: 'living', x: -0.5, y: 2.2, z: -1.5, type: 'fan', is_on: true, speed: 3, model_kind: 'scheduled' },
      { id: 4, name: 'Master Bed Ceiling Fan', category: 'Ceiling Fan', rated_w: 75, bee_star_rating: 1, room: 'master_bed', x: 4.0, y: 2.2, z: -2.2, type: 'fan', is_on: true, speed: 4, model_kind: 'scheduled' },
      { id: 5, name: 'Bed 2 Ceiling Fan', category: 'Ceiling Fan', rated_w: 75, bee_star_rating: 2, room: 'bed2', x: 4.0, y: 2.2, z: 3.2, type: 'fan', is_on: true, speed: 3, model_kind: 'scheduled' },
      { id: 6, name: 'Double-Door Fridge (260L)', category: 'Refrigerator', rated_w: 140, bee_star_rating: 3, room: 'kitchen', x: -5.8, y: 0.8, z: 2.0, type: 'fridge', is_on: true, model_kind: 'cyclic' },
      { id: 7, name: '55" 4K Smart LED TV', category: 'Television', rated_w: 65, bee_star_rating: 4, room: 'living', x: -2.5, y: 0.8, z: -4.4, type: 'tv', is_on: true, model_kind: 'scheduled' },
      { id: 8, name: 'Bathroom Storage Geyser', category: 'Water Geyser', rated_w: 2000, bee_star_rating: 3, room: 'bath_master', x: 0.2, y: 1.8, z: 2.2, type: 'geyser', is_on: false, model_kind: 'scheduled' },
      { id: 9, name: 'Dual-Band Wi-Fi Router', category: 'Always-On', rated_w: 10, bee_star_rating: 5, room: 'living', x: -0.8, y: 0.5, z: -4.3, type: 'router', is_on: true, model_kind: 'constant' },
      { id: 10, name: 'Automatic Washing Machine', category: 'Washing Machine', rated_w: 450, bee_star_rating: 4, room: 'balcony', x: -2.0, y: 0.5, z: 4.6, type: 'washing_machine', is_on: false, model_kind: 'per_cycle' },
      { id: 11, name: 'Kitchen Microwave (20L)', category: 'Microwave', rated_w: 1200, bee_star_rating: 3, room: 'kitchen', x: -3.5, y: 0.8, z: 4.5, type: 'microwave', is_on: false, model_kind: 'scheduled' }
    ]
  },
  '1BHK': {
    name: '1BHK Compact Flat (Nagpur / Mumbai / Pune)',
    areaSqFt: 550,
    dimensions: { width: 11, length: 9 },
    rooms: [
      { id: 'living', name: 'Living & Dining Room', type: 'living', x: -1.8, z: -1.2, w: 6.5, l: 5.5, color: '#2b3345' },
      { id: 'master_bed', name: 'Master Bedroom', type: 'bedroom', x: 3.2, z: -1.2, w: 4.2, l: 5.5, color: '#263042' },
      { id: 'kitchen', name: 'Kitchen Counter', type: 'kitchen', x: -2.2, z: 2.6, w: 4.8, l: 3.2, color: '#2e3846' },
      { id: 'bath', name: 'Bathroom', type: 'bathroom', x: 2.5, z: 2.6, w: 3.5, l: 3.2, color: '#30394a' }
    ],
    defaultAppliances: [
      { id: 1, name: '1.0-Ton Split AC', category: 'Air Conditioner', rated_w: 1100, bee_star_rating: 3, room: 'master_bed', x: 3.2, y: 1.9, z: -3.8, type: 'ac', is_on: true, model_kind: 'thermostatic', temp_c: 24 },
      { id: 2, name: 'Hall Ceiling Fan', category: 'Ceiling Fan', rated_w: 75, bee_star_rating: 2, room: 'living', x: -1.8, y: 2.2, z: -1.2, type: 'fan', is_on: true, speed: 4, model_kind: 'scheduled' },
      { id: 3, name: 'Bed Ceiling Fan', category: 'Ceiling Fan', rated_w: 75, bee_star_rating: 1, room: 'master_bed', x: 3.2, y: 2.2, z: -1.2, type: 'fan', is_on: true, speed: 3, model_kind: 'scheduled' },
      { id: 4, name: 'Single-Door Fridge (190L)', category: 'Refrigerator', rated_w: 90, bee_star_rating: 4, room: 'kitchen', x: -4.0, y: 0.7, z: 2.0, type: 'fridge', is_on: true, model_kind: 'cyclic' },
      { id: 5, name: '43" LED Smart TV', category: 'Television', rated_w: 55, bee_star_rating: 4, room: 'living', x: -1.8, y: 0.7, z: -3.8, type: 'tv', is_on: true, model_kind: 'scheduled' },
      { id: 6, name: 'Bathroom Water Geyser', category: 'Water Geyser', rated_w: 2000, bee_star_rating: 3, room: 'bath', x: 2.5, y: 1.8, z: 1.8, type: 'geyser', is_on: false, model_kind: 'scheduled' },
      { id: 7, name: 'Wi-Fi Fiber Router', category: 'Always-On', rated_w: 10, bee_star_rating: 5, room: 'living', x: 0.2, y: 0.5, z: -3.7, type: 'router', is_on: true, model_kind: 'constant' }
    ]
  },
  '3BHK': {
    name: '3BHK Premium Indian Residence',
    areaSqFt: 1400,
    dimensions: { width: 17, length: 13 },
    rooms: [
      { id: 'living', name: 'Grand Living & Dining Room', type: 'living', x: -3.5, z: -2.0, w: 9.0, l: 7.5, color: '#2b3345' },
      { id: 'master_bed', name: 'Master Bedroom Suite', type: 'bedroom', x: 4.8, z: -3.0, w: 6.5, l: 5.5, color: '#263042' },
      { id: 'bed2', name: 'Children Bedroom', type: 'bedroom', x: 4.8, z: 3.2, w: 5.0, l: 4.8, color: '#263042' },
      { id: 'bed3', name: 'Parents / Guest Room', type: 'bedroom', x: -4.5, z: 3.5, w: 5.5, l: 4.5, color: '#263042' },
      { id: 'kitchen', name: 'Modular Kitchen & Pantry', type: 'kitchen', x: 0.5, z: 3.5, w: 4.0, l: 4.5, color: '#2e3846' },
      { id: 'bath_m', name: 'Master Attached Bath', type: 'bathroom', x: 7.5, z: 0.2, w: 2.4, l: 2.2, color: '#30394a' },
      { id: 'bath_c', name: 'Common Bathroom', type: 'bathroom', x: 2.5, z: 0.2, w: 2.4, l: 2.2, color: '#30394a' }
    ],
    defaultAppliances: [
      { id: 1, name: 'Master 1.5-Ton Inverter AC (5-Star)', category: 'Air Conditioner', rated_w: 1050, bee_star_rating: 5, room: 'master_bed', x: 4.8, y: 1.9, z: -5.5, type: 'ac', is_on: true, model_kind: 'thermostatic', temp_c: 24 },
      { id: 2, name: 'Bed 2 Split AC (3-Star)', category: 'Air Conditioner', rated_w: 1500, bee_star_rating: 3, room: 'bed2', x: 4.8, y: 1.9, z: 1.0, type: 'ac', is_on: false, model_kind: 'thermostatic', temp_c: 24 },
      { id: 3, name: 'Hall 5-Star BLDC Fan 1', category: 'Ceiling Fan', rated_w: 28, bee_star_rating: 5, room: 'living', x: -5.5, y: 2.2, z: -2.0, type: 'fan', is_on: true, speed: 4, model_kind: 'scheduled' },
      { id: 4, name: 'Hall 5-Star BLDC Fan 2', category: 'Ceiling Fan', rated_w: 28, bee_star_rating: 5, room: 'living', x: -1.5, y: 2.2, z: -2.0, type: 'fan', is_on: true, speed: 3, model_kind: 'scheduled' },
      { id: 5, name: 'Master Bed BLDC Fan', category: 'Ceiling Fan', rated_w: 28, bee_star_rating: 5, room: 'master_bed', x: 4.8, y: 2.2, z: -3.0, type: 'fan', is_on: true, speed: 4, model_kind: 'scheduled' },
      { id: 6, name: 'Bed 2 Ceiling Fan', category: 'Ceiling Fan', rated_w: 75, bee_star_rating: 2, room: 'bed2', x: 4.8, y: 2.2, z: 3.2, type: 'fan', is_on: true, speed: 3, model_kind: 'scheduled' },
      { id: 7, name: 'Bed 3 Ceiling Fan', category: 'Ceiling Fan', rated_w: 75, bee_star_rating: 2, room: 'bed3', x: -4.5, y: 2.2, z: 3.5, type: 'fan', is_on: true, speed: 3, model_kind: 'scheduled' },
      { id: 8, name: 'Side-by-Side Fridge (450L)', category: 'Refrigerator', rated_w: 180, bee_star_rating: 4, room: 'kitchen', x: -0.8, y: 0.9, z: 2.2, type: 'fridge', is_on: true, model_kind: 'cyclic' },
      { id: 9, name: '65" OLED Smart Home Cinema', category: 'Television', rated_w: 95, bee_star_rating: 4, room: 'living', x: -3.5, y: 0.9, z: -5.6, type: 'tv', is_on: true, model_kind: 'scheduled' },
      { id: 10, name: 'Master Geyser (25L 5-Star)', category: 'Water Geyser', rated_w: 1800, bee_star_rating: 5, room: 'bath_m', x: 7.5, y: 1.8, z: -0.5, type: 'geyser', is_on: false, model_kind: 'scheduled' },
      { id: 11, name: 'Common Geyser (15L 3-Star)', category: 'Water Geyser', rated_w: 2000, bee_star_rating: 3, room: 'bath_c', x: 2.5, y: 1.8, z: -0.5, type: 'geyser', is_on: false, model_kind: 'scheduled' },
      { id: 12, name: 'Tri-Band Mesh Wi-Fi', category: 'Always-On', rated_w: 15, bee_star_rating: 5, room: 'living', x: -1.0, y: 0.5, z: -5.5, type: 'router', is_on: true, model_kind: 'constant' },
      { id: 13, name: 'Fully Automatic Wash + Dryer', category: 'Washing Machine', rated_w: 500, bee_star_rating: 5, room: 'kitchen', x: 1.8, y: 0.5, z: 5.2, type: 'washing_machine', is_on: false, model_kind: 'per_cycle' }
    ]
  },
  'PG_Flat': {
    name: 'PG / Student Shared Flat (4-Sharing)',
    areaSqFt: 800,
    dimensions: { width: 13, length: 10 },
    rooms: [
      { id: 'hall', name: 'Common Hall & Dining', type: 'living', x: -2.5, z: -1.5, w: 7.0, l: 6.0, color: '#2b3345' },
      { id: 'ac_room', name: 'Room 1 (AC Sharing)', type: 'bedroom', x: 3.8, z: -1.5, w: 5.0, l: 6.0, color: '#263042' },
      { id: 'fan_room', name: 'Room 2 (Fan Only Sharing)', type: 'bedroom', x: 3.8, z: 3.0, w: 5.0, l: 4.0, color: '#263042' },
      { id: 'kitchen_bath', name: 'Kitchen & Bath', type: 'kitchen', x: -2.5, z: 3.0, w: 7.0, l: 4.0, color: '#2e3846' }
    ],
    defaultAppliances: [
      { id: 1, name: 'Room 1 Split AC', category: 'Air Conditioner', rated_w: 1500, bee_star_rating: 2, room: 'ac_room', x: 3.8, y: 1.9, z: -4.2, type: 'ac', is_on: true, model_kind: 'thermostatic', temp_c: 22 },
      { id: 2, name: 'Room 1 Ceiling Fan', category: 'Ceiling Fan', rated_w: 75, bee_star_rating: 1, room: 'ac_room', x: 3.8, y: 2.2, z: -1.5, type: 'fan', is_on: true, speed: 5, model_kind: 'scheduled' },
      { id: 3, name: 'Room 2 Ceiling Fan', category: 'Ceiling Fan', rated_w: 75, bee_star_rating: 1, room: 'fan_room', x: 3.8, y: 2.2, z: 3.0, type: 'fan', is_on: true, speed: 5, model_kind: 'scheduled' },
      { id: 4, name: 'Hall Ceiling Fan', category: 'Ceiling Fan', rated_w: 75, bee_star_rating: 1, room: 'hall', x: -2.5, y: 2.2, z: -1.5, type: 'fan', is_on: true, speed: 4, model_kind: 'scheduled' },
      { id: 5, name: 'Old Shared Fridge (200L)', category: 'Refrigerator', rated_w: 160, bee_star_rating: 2, room: 'kitchen_bath', x: -5.0, y: 0.8, z: 2.0, type: 'fridge', is_on: true, model_kind: 'cyclic' },
      { id: 6, name: 'Geyser (Instant 3kW)', category: 'Water Geyser', rated_w: 3000, bee_star_rating: 2, room: 'kitchen_bath', x: 0.2, y: 1.8, z: 3.5, type: 'geyser', is_on: false, model_kind: 'scheduled' },
      { id: 7, name: 'High-Speed PG Wi-Fi', category: 'Always-On', rated_w: 12, bee_star_rating: 5, room: 'hall', x: -0.5, y: 0.5, z: -4.0, type: 'router', is_on: true, model_kind: 'constant' }
    ]
  }
};

export default function HomeSimulator3D({
  archetype = '2BHK',
  onSelectAppliance,
  liveDeviceTelemetry = null
}) {
  const mountRef = useRef(null);
  const [currentArchetypeKey, setCurrentArchetypeKey] = useState(archetype);
  const [selectedAppliance, setSelectedAppliance] = useState(null);
  const [timeOfDay, setTimeOfDay] = useState(14.5); // 14:30 default (2:30 PM)
  const [isPlaying, setIsPlaying] = useState(true);
  const [simSpeed, setSimSpeed] = useState(1); // 1x, 10x, 60x
  const [viewMode, setViewMode] = useState('3d'); // '3d' or 'heatmap'
  const [activePreset, setActivePreset] = useState('iso'); // 'iso', 'top', 'living', 'master'

  // Local state of appliances for user interaction (toggle ON/OFF, adjust temp/speed)
  const [appliancesState, setAppliancesState] = useState(() => {
    const arch = HOUSE_ARCHETYPES[archetype] || HOUSE_ARCHETYPES['2BHK'];
    return arch.defaultAppliances.map(a => ({ ...a }));
  });

  // Keep synced when archetype changes
  useEffect(() => {
    const arch = HOUSE_ARCHETYPES[currentArchetypeKey] || HOUSE_ARCHETYPES['2BHK'];
    setAppliancesState(arch.defaultAppliances.map(a => ({ ...a })));
    setSelectedAppliance(null);
  }, [currentArchetypeKey]);

  // Handle incoming live IoT hardware telemetry (smart plug trigger)
  useEffect(() => {
    if (!liveDeviceTelemetry) return;
    const { applianceId, p_w, state } = liveDeviceTelemetry;
    if (applianceId) {
      setAppliancesState(prev => prev.map(app => {
        if (app.id === Number(applianceId)) {
          return {
            ...app,
            is_on: state ? state === 'ON' : p_w > 10,
            live_watts: p_w
          };
        }
        return app;
      }));
    }
  }, [liveDeviceTelemetry]);

  // Clock progression loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setTimeOfDay(prev => {
        const increment = (0.05 * simSpeed);
        const next = prev + increment;
        return next >= 24 ? 0 : next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying, simSpeed]);

  // Total active power consumption calculated from appliances
  const totalActiveWatts = useMemo(() => {
    return appliancesState.reduce((sum, app) => {
      if (!app.is_on) return sum;
      let effectiveW = app.live_watts !== undefined ? app.live_watts : app.rated_w;
      // Thermostatic model: scales with time of day ambient heat
      if (app.type === 'ac') {
        const isAfternoon = (timeOfDay >= 12 && timeOfDay <= 17);
        effectiveW = isAfternoon ? effectiveW : effectiveW * 0.75;
      }
      return sum + effectiveW;
    }, 0);
  }, [appliancesState, timeOfDay]);

  // Reference hooks for Three.js animation and controls
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const fanBladesRef = useRef([]);
  const acLouverRef = useRef([]);
  const applianceMeshesRef = useRef([]);

  // ============================================================================
  // THREE.JS SCENE INITIALIZATION & PROCEDURAL RENDER PIPELINE
  // ============================================================================
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(13, 16, 17);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Sunlight & Ambient Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.2);
    sunLight.position.set(14, 20, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // Subtle Ground Floor Plane
    const groundGeo = new THREE.PlaneGeometry(35, 30);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x141822, roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    scene.add(ground);

    const activeArch = HOUSE_ARCHETYPES[currentArchetypeKey] || HOUSE_ARCHETYPES['2BHK'];

    // 1. Build Room Floors with Tile Style
    activeArch.rooms.forEach(room => {
      const roomFloorGeo = new THREE.BoxGeometry(room.w, 0.08, room.l);
      const roomFloorMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(room.color),
        roughness: 0.4,
        metalness: 0.1
      });
      const roomFloor = new THREE.Mesh(roomFloorGeo, roomFloorMat);
      roomFloor.position.set(room.x, 0.02, room.z);
      roomFloor.receiveShadow = true;
      roomFloor.userData = { isRoomFloor: true, roomId: room.id, roomName: room.name };
      scene.add(roomFloor);
    });

    // 2. Build Architectural Partition Walls (1.4m height for open visual cutaway)
    const wallHeight = 1.4;
    const wallThick = 0.14;
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3a4559, roughness: 0.8 });

    activeArch.rooms.forEach(room => {
      const halfW = room.w / 2;
      const halfL = room.l / 2;
      const rx = room.x;
      const rz = room.z;

      const makeWallSegment = (w, h, d, x, z) => {
        const geo = new THREE.BoxGeometry(w, h, d);
        const wall = new THREE.Mesh(geo, wallMat);
        wall.position.set(x, h / 2, z);
        wall.castShadow = true;
        wall.receiveShadow = true;
        scene.add(wall);
      };

      // Top wall
      makeWallSegment(room.w, wallHeight, wallThick, rx, rz - halfL);
      // Bottom wall (with door gap)
      makeWallSegment(room.w * 0.4, wallHeight, wallThick, rx - halfW * 0.6, rz + halfL);
      makeWallSegment(room.w * 0.4, wallHeight, wallThick, rx + halfW * 0.6, rz + halfL);
      // Left wall
      makeWallSegment(wallThick, wallHeight, room.l, rx - halfW, rz);
      // Right wall
      makeWallSegment(wallThick, wallHeight, room.l, rx + halfW, rz);
    });

    // 3. Build Procedural 3D Appliances
    applianceMeshesRef.current = [];
    fanBladesRef.current = [];
    acLouverRef.current = [];

    appliancesState.forEach((app) => {
      const appGroup = new THREE.Group();
      appGroup.position.set(app.x, 0, app.z);
      appGroup.userData = app;

      // Thermal Power Indicator Glow Color
      let glowColorHex = 0x198754; // Green (<100W)
      if (app.rated_w > 1000) {
        glowColorHex = 0xdc3545; // Pulsing Crimson (>1000W)
      } else if (app.rated_w >= 100) {
        glowColorHex = 0xffc107; // Amber (100 - 1000W)
      }

      // Procedural shapes matching authentic Indian appliances:
      if (app.type === 'ac') {
        // Wall-mounted Split AC indoor unit
        const acBodyGeo = new THREE.BoxGeometry(1.2, 0.38, 0.32);
        const acBodyMat = new THREE.MeshStandardMaterial({
          color: 0xf4f5f7,
          roughness: 0.2,
          emissive: app.is_on ? glowColorHex : 0x000000,
          emissiveIntensity: app.is_on ? 0.45 : 0.0
        });
        const acBody = new THREE.Mesh(acBodyGeo, acBodyMat);
        acBody.position.y = app.y;
        acBody.castShadow = true;
        appGroup.add(acBody);

        // Louver flap
        const louverGeo = new THREE.BoxGeometry(1.1, 0.04, 0.15);
        const louverMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const louver = new THREE.Mesh(louverGeo, louverMat);
        louver.position.set(0, app.y - 0.15, 0.1);
        appGroup.add(louver);
        acLouverRef.current.push({ mesh: louver, appId: app.id });

        // Blue running LED pilot light
        const ledGeo = new THREE.SphereGeometry(0.03, 8, 8);
        const ledMat = new THREE.MeshBasicMaterial({ color: app.is_on ? 0x00bfff : 0x333333 });
        const led = new THREE.Mesh(ledGeo, ledMat);
        led.position.set(0.48, app.y - 0.05, 0.17);
        appGroup.add(led);

      } else if (app.type === 'fridge') {
        // Double-door frost-free refrigerator
        const fridgeGeo = new THREE.BoxGeometry(0.75, 1.55, 0.75);
        const fridgeMat = new THREE.MeshStandardMaterial({
          color: 0x9099a8,
          metalness: 0.5,
          roughness: 0.3,
          emissive: app.is_on ? glowColorHex : 0x000000,
          emissiveIntensity: app.is_on ? 0.3 : 0.0
        });
        const fridge = new THREE.Mesh(fridgeGeo, fridgeMat);
        fridge.position.y = 0.775;
        fridge.castShadow = true;
        appGroup.add(fridge);

        // Divider strip between freezer and fridge
        const divGeo = new THREE.BoxGeometry(0.77, 0.03, 0.76);
        const divMat = new THREE.MeshBasicMaterial({ color: 0x1f242e });
        const div = new THREE.Mesh(divGeo, divMat);
        div.position.y = 1.05;
        appGroup.add(div);

        // Chrome door handles
        const handleGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.3);
        const handleMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.1 });
        const handle1 = new THREE.Mesh(handleGeo, handleMat);
        handle1.position.set(0.3, 1.25, 0.39);
        appGroup.add(handle1);

        const handle2 = new THREE.Mesh(handleGeo, handleMat);
        handle2.position.set(0.3, 0.7, 0.39);
        appGroup.add(handle2);

      } else if (app.type === 'fan') {
        // Ceiling Fan with Downrod & 3 Aerodynamic Blades
        const downrodGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.4);
        const downrodMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6 });
        const downrod = new THREE.Mesh(downrodGeo, downrodMat);
        downrod.position.y = app.y + 0.2;
        appGroup.add(downrod);

        // Motor Hub
        const hubGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.12, 16);
        const hubMat = new THREE.MeshStandardMaterial({
          color: 0xd4af37, // Golden/Bronze Indian ceiling fan finish
          metalness: 0.4,
          roughness: 0.3,
          emissive: app.is_on ? glowColorHex : 0x000000,
          emissiveIntensity: app.is_on ? 0.35 : 0.0
        });
        const hub = new THREE.Mesh(hubGeo, hubMat);
        hub.position.y = app.y;
        appGroup.add(hub);

        // 3 Aerodynamic Blades attached to a rotating rotor group
        const rotorGroup = new THREE.Group();
        rotorGroup.position.y = app.y;

        for (let i = 0; i < 3; i++) {
          const angle = (i * 2 * Math.PI) / 3;
          const bladeGeo = new THREE.BoxGeometry(0.9, 0.015, 0.18);
          const bladeMat = new THREE.MeshStandardMaterial({ color: 0x4a3b32 });
          const blade = new THREE.Mesh(bladeGeo, bladeMat);
          blade.position.set(Math.cos(angle) * 0.45, 0, Math.sin(angle) * 0.45);
          blade.rotation.y = -angle;
          rotorGroup.add(blade);
        }
        appGroup.add(rotorGroup);
        fanBladesRef.current.push({ group: rotorGroup, appId: app.id, isOn: app.is_on, speed: app.speed || 4 });

      } else if (app.type === 'tv') {
        // 55-inch Smart 4K TV + Media Console
        const consoleGeo = new THREE.BoxGeometry(1.6, 0.4, 0.45);
        const consoleMat = new THREE.MeshStandardMaterial({ color: 0x3d312a, roughness: 0.7 });
        const consoleMesh = new THREE.Mesh(consoleGeo, consoleMat);
        consoleMesh.position.y = 0.2;
        appGroup.add(consoleMesh);

        // TV screen panel
        const tvGeo = new THREE.BoxGeometry(1.3, 0.75, 0.05);
        const tvMat = new THREE.MeshStandardMaterial({
          color: 0x111111,
          roughness: 0.1,
          emissive: app.is_on ? 0x1e90ff : 0x000000,
          emissiveIntensity: app.is_on ? 0.6 : 0.0
        });
        const tv = new THREE.Mesh(tvGeo, tvMat);
        tv.position.set(0, 0.78, 0);
        tv.castShadow = true;
        appGroup.add(tv);

      } else if (app.type === 'geyser') {
        // Vertical Enamelled Storage Water Geyser
        const geyserGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.65, 16);
        const geyserMat = new THREE.MeshStandardMaterial({
          color: 0xf5f5f5,
          roughness: 0.2,
          emissive: app.is_on ? glowColorHex : 0x000000,
          emissiveIntensity: app.is_on ? 0.7 : 0.0
        });
        const geyser = new THREE.Mesh(geyserGeo, geyserMat);
        geyser.position.y = app.y;
        appGroup.add(geyser);

        // Red pilot heating lamp
        const lampGeo = new THREE.SphereGeometry(0.03, 8, 8);
        const lampMat = new THREE.MeshBasicMaterial({ color: app.is_on ? 0xff0000 : 0x330000 });
        const lamp = new THREE.Mesh(lampGeo, lampMat);
        lamp.position.set(0, app.y - 0.2, 0.25);
        appGroup.add(lamp);

      } else if (app.type === 'router') {
        // Wi-Fi Fiber Router with Dual Antennas
        const boxGeo = new THREE.BoxGeometry(0.3, 0.07, 0.2);
        const boxMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
        const box = new THREE.Mesh(boxGeo, boxMat);
        box.position.y = app.y;
        appGroup.add(box);

        // Antennas
        const antGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.28);
        const antMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        const ant1 = new THREE.Mesh(antGeo, antMat);
        ant1.position.set(-0.12, app.y + 0.12, -0.08);
        ant1.rotation.z = 0.2;
        appGroup.add(ant1);

        const ant2 = new THREE.Mesh(antGeo, antMat);
        ant2.position.set(0.12, app.y + 0.12, -0.08);
        ant2.rotation.z = -0.2;
        appGroup.add(ant2);

        // Green activity LEDs
        const ledG = new THREE.SphereGeometry(0.015, 6, 6);
        const ledM = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        for (let l = -0.06; l <= 0.06; l += 0.04) {
          const bl = new THREE.Mesh(ledG, ledM);
          bl.position.set(l, app.y + 0.036, 0.09);
          appGroup.add(bl);
        }

      } else if (app.type === 'washing_machine') {
        // Fully Automatic Washing Machine
        const wmGeo = new THREE.BoxGeometry(0.65, 0.85, 0.65);
        const wmMat = new THREE.MeshStandardMaterial({ color: 0xe6e9ef, roughness: 0.3 });
        const wm = new THREE.Mesh(wmGeo, wmMat);
        wm.position.y = 0.425;
        appGroup.add(wm);

        // Circular Porthole Door
        const doorGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.02, 16);
        const doorMat = new THREE.MeshStandardMaterial({ color: 0x1a2638, metalness: 0.8, roughness: 0.2 });
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.rotation.x = Math.PI / 2;
        door.position.set(0, 0.45, 0.33);
        appGroup.add(door);

      } else {
        // Generic / Microwave / Utility Appliance
        const genGeo = new THREE.BoxGeometry(0.5, 0.35, 0.35);
        const genMat = new THREE.MeshStandardMaterial({
          color: 0x4a5568,
          emissive: app.is_on ? glowColorHex : 0x000000,
          emissiveIntensity: app.is_on ? 0.3 : 0.0
        });
        const gen = new THREE.Mesh(genGeo, genMat);
        gen.position.y = app.y || 0.5;
        appGroup.add(gen);
      }

      scene.add(appGroup);
      applianceMeshesRef.current.push(appGroup);
    });

    // 4. Raycasting on Click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Check intersect with appliance groups
      const hitCandidates = [];
      applianceMeshesRef.current.forEach(g => {
        g.traverse(child => {
          if (child.isMesh) {
            child.userData.parentGroup = g;
            hitCandidates.push(child);
          }
        });
      });

      const intersects = raycaster.intersectObjects(hitCandidates, false);

      if (intersects.length > 0) {
        const topMesh = intersects[0].object;
        const targetGroup = topMesh.userData.parentGroup;
        if (targetGroup && targetGroup.userData) {
          const appData = targetGroup.userData;
          // Find live state
          const currentApp = appliancesState.find(a => a.id === appData.id) || appData;
          setSelectedAppliance(currentApp);
          if (onSelectAppliance) onSelectAppliance(currentApp);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    // 5. Interactive Orbit Navigation (Pan / Rotate / Zoom)
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;

    const onMouseDown = (e) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;

      // Orbit around center
      scene.rotation.y += dx * 0.005;

      prevX = e.clientX;
      prevY = e.clientY;
    };

    const onMouseUp = () => { isDragging = false; };

    const onWheel = (e) => {
      camera.position.multiplyScalar(e.deltaY > 0 ? 1.05 : 0.95);
      camera.position.clampLength(6, 40);
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true });

    // 6. Animation Loop (Spinning fan blades, pulsing glow, sun movement)
    let animId;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Spin ceiling fan blades
      fanBladesRef.current.forEach(({ group, appId, isOn, speed }) => {
        const app = appliancesState.find(a => a.id === appId);
        if (app && app.is_on) {
          const radSpeed = (app.speed || speed || 4) * 3.5;
          group.rotation.y += radSpeed * delta;
        }
      });

      // Subtle AC louver oscillation
      acLouverRef.current.forEach(({ mesh, appId }) => {
        const app = appliancesState.find(a => a.id === appId);
        if (app && app.is_on) {
          mesh.rotation.x = Math.sin(elapsed * 2.0) * 0.15;
        }
      });

      // Adjust sun and sky based on simulated timeOfDay (0 - 24)
      const sunTheta = ((timeOfDay - 6) / 12) * Math.PI;
      const sunHeight = Math.sin(sunTheta);
      const isNight = timeOfDay < 5.5 || timeOfDay > 19.0;

      if (isNight) {
        scene.background = new THREE.Color(0x0a0d14);
        ambientLight.intensity = 0.25;
        sunLight.intensity = 0.1;
      } else if (timeOfDay >= 17.5 && timeOfDay <= 19.0) {
        // Sunset golden hour
        scene.background = new THREE.Color(0x231a29);
        ambientLight.intensity = 0.55;
        ambientLight.color.setHex(0xffaa66);
        sunLight.intensity = 0.9;
        sunLight.color.setHex(0xff7733);
      } else {
        // Broad daylight
        scene.background = new THREE.Color(0x181e2b);
        ambientLight.intensity = 0.65;
        ambientLight.color.setHex(0xffffff);
        sunLight.intensity = 1.25;
        sunLight.color.setHex(0xfffaed);
      }

      sunLight.position.set(Math.cos(sunTheta) * 16, Math.max(1, sunHeight * 22), 10);

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [currentArchetypeKey, appliancesState, timeOfDay]);

  // Camera presets
  const handleCameraPreset = (preset) => {
    setActivePreset(preset);
    const camera = cameraRef.current;
    const scene = sceneRef.current;
    if (!camera || !scene) return;

    if (preset === 'top') {
      camera.position.set(0, 22, 0.001);
      camera.lookAt(0, 0, 0);
      scene.rotation.y = 0;
    } else if (preset === 'living') {
      camera.position.set(-2, 5, 8);
      camera.lookAt(-2, 0, -1.5);
      scene.rotation.y = 0;
    } else if (preset === 'master') {
      camera.position.set(4, 5, 6);
      camera.lookAt(4, 0, -2);
      scene.rotation.y = 0;
    } else {
      // Iso default
      camera.position.set(13, 16, 17);
      camera.lookAt(0, 0, 0);
      scene.rotation.y = 0;
    }
  };

  // Toggle appliance power ON / OFF in 3D
  const toggleAppliance = (id) => {
    setAppliancesState(prev => prev.map(a => {
      if (a.id === id) {
        const nextState = !a.is_on;
        const updated = { ...a, is_on: nextState };
        if (selectedAppliance?.id === id) setSelectedAppliance(updated);
        return updated;
      }
      return a;
    }));
  };

  // Format time of day
  const formattedTime = useMemo(() => {
    const hours = Math.floor(timeOfDay);
    const mins = Math.floor((timeOfDay - hours) * 60);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 === 0 ? 12 : hours % 12;
    return `${h12.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${ampm}`;
  }, [timeOfDay]);

  const activeArch = HOUSE_ARCHETYPES[currentArchetypeKey] || HOUSE_ARCHETYPES['2BHK'];

  return (
    <div className="position-relative w-100 rounded-3 overflow-hidden shadow-sm border border-secondary border-opacity-25 bg-dark">
      {/* 3D Canvas Container */}
      <div
        ref={mountRef}
        style={{ width: '100%', height: '540px', cursor: 'grab' }}
      />

      {/* TOP HUD: Archetype Selector & Live Household Metrics */}
      <div className="position-absolute top-0 start-0 m-3 d-flex flex-wrap align-items-center gap-2">
        {/* House Type Dropdown Selector */}
        <div className="btn-group shadow-sm bg-dark bg-opacity-90 p-1 rounded-pill border border-secondary border-opacity-50">
          <span className="text-white small fw-bold px-3 d-flex align-items-center">
            <i className="bi bi-house-door-fill text-warning me-2"></i> House Archetype:
          </span>
          {Object.keys(HOUSE_ARCHETYPES).map(key => (
            <button
              key={key}
              type="button"
              className={`btn btn-sm rounded-pill px-3 fw-semibold ${currentArchetypeKey === key ? 'btn-primary text-white' : 'btn-dark text-light'}`}
              onClick={() => setCurrentArchetypeKey(key)}
            >
              {key}
            </button>
          ))}
        </div>

        {/* Camera Preset Quick Buttons */}
        <div className="btn-group shadow-sm bg-dark bg-opacity-90 p-1 rounded-pill border border-secondary border-opacity-50">
          <button
            type="button"
            className={`btn btn-sm rounded-pill px-2 ${activePreset === 'iso' ? 'btn-outline-warning active' : 'btn-dark text-muted'}`}
            onClick={() => handleCameraPreset('iso')}
            title="3D Isometric"
          >
            <i className="bi bi-box me-1"></i> 3D Iso
          </button>
          <button
            type="button"
            className={`btn btn-sm rounded-pill px-2 ${activePreset === 'top' ? 'btn-outline-warning active' : 'btn-dark text-muted'}`}
            onClick={() => handleCameraPreset('top')}
            title="Top-Down 2D Blueprint"
          >
            <i className="bi bi-grid-3x3 me-1"></i> 2D Blueprint
          </button>
        </div>
      </div>

      {/* TOP RIGHT HUD: Instant Load Meter */}
      <div className="position-absolute top-0 end-0 m-3 p-2 px-3 bg-dark bg-opacity-90 text-white rounded-3 border border-secondary border-opacity-50 shadow-sm text-end">
        <span className="text-muted small d-block">ACTIVE POWER DRAW</span>
        <div className="d-flex align-items-baseline gap-1 justify-content-end">
          <h4 className="fw-bold mb-0 text-warning">{totalActiveWatts.toLocaleString()}</h4>
          <span className="small text-muted">Watts</span>
        </div>
        <span className="badge bg-secondary mt-1" style={{ fontSize: '0.7rem' }}>
          {activeArch.name.split('(')[0]} (~{activeArch.areaSqFt} sq.ft)
        </span>
      </div>

      {/* BOTTOM FLOATING CONTROLS: Time of Day Scrubber */}
      <div className="position-absolute bottom-0 start-50 translate-middle-x mb-3 w-75 p-2 px-3 bg-dark bg-opacity-90 text-white rounded-pill border border-secondary border-opacity-50 shadow d-flex align-items-center gap-3">
        {/* Play/Pause */}
        <button
          className="btn btn-sm btn-outline-light rounded-circle"
          style={{ width: 34, height: 34 }}
          onClick={() => setIsPlaying(!isPlaying)}
        >
          <i className={`bi ${isPlaying ? 'bi-pause-fill' : 'bi-play-fill'}`}></i>
        </button>

        {/* Current Time Display */}
        <div className="fw-bold text-warning small text-nowrap d-flex align-items-center gap-1" style={{ minWidth: 85 }}>
          <i className={`bi ${timeOfDay >= 6 && timeOfDay <= 18 ? 'bi-sun-fill text-warning' : 'bi-moon-stars-fill text-info'}`}></i>
          {formattedTime}
        </div>

        {/* Time Slider */}
        <input
          type="range"
          className="form-range flex-grow-1"
          min="0"
          max="23.9"
          step="0.1"
          value={timeOfDay}
          onChange={(e) => setTimeOfDay(parseFloat(e.target.value))}
        />

        {/* Speed multiplier */}
        <div className="btn-group btn-group-sm">
          {[1, 10, 60].map(s => (
            <button
              key={s}
              className={`btn btn-sm ${simSpeed === s ? 'btn-primary' : 'btn-dark text-muted'}`}
              onClick={() => setSimSpeed(s)}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* BOTTOM-LEFT: Color Legend */}
      <div className="position-absolute bottom-0 start-0 m-3 p-2 bg-dark bg-opacity-90 text-white rounded-3 border border-secondary border-opacity-50 small d-none d-md-flex gap-3">
        <span><span className="badge bg-danger me-1">■</span> Heavy Load (&gt;1000W)</span>
        <span><span className="badge bg-warning text-dark me-1">■</span> Medium (100-1000W)</span>
        <span><span className="badge bg-success me-1">■</span> Baseline (&lt;100W)</span>
      </div>

      {/* INSPECTOR MODAL: Selected Appliance Details & Interactive Controls */}
      {selectedAppliance && (
        <div
          className="position-absolute end-0 top-50 translate-middle-y me-3 p-3 bg-white text-dark rounded-3 shadow-lg border"
          style={{ width: 300, zIndex: 1050 }}
        >
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="fw-bold mb-0 text-truncate">{selectedAppliance.name}</h6>
            <button
              className="btn btn-sm btn-close"
              onClick={() => setSelectedAppliance(null)}
            ></button>
          </div>

          <div className="d-flex align-items-center gap-2 mb-3">
            <span className={`badge ${selectedAppliance.is_on ? 'bg-success' : 'bg-secondary'}`}>
              {selectedAppliance.is_on ? '● RUNNING' : '○ TURNED OFF'}
            </span>
            <span className="badge bg-light text-dark border">
              {selectedAppliance.category}
            </span>
          </div>

          {/* Details Table */}
          <div className="small mb-3">
            <div className="d-flex justify-content-between py-1 border-bottom">
              <span className="text-muted">Rated Power:</span>
              <span className="fw-bold">{selectedAppliance.rated_w} W</span>
            </div>
            <div className="d-flex justify-content-between py-1 border-bottom">
              <span className="text-muted">BEE Star Rating:</span>
              <span className="text-warning fw-bold">
                {'★'.repeat(selectedAppliance.bee_star_rating || 3)}
              </span>
            </div>
            <div className="d-flex justify-content-between py-1 border-bottom">
              <span className="text-muted">Physics Model:</span>
              <span className="badge bg-info-subtle text-info-emphasis">
                {selectedAppliance.model_kind || 'scheduled'}
              </span>
            </div>
            <div className="d-flex justify-content-between py-1">
              <span className="text-muted">Est. Monthly Cost:</span>
              <span className="fw-bold text-success">
                ₹{Math.round(((selectedAppliance.rated_w * (selectedAppliance.type === 'ac' ? 6 : selectedAppliance.type === 'fridge' ? 24 * 0.4 : 8) * 30) / 1000) * 9.64)}/mo
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="d-grid gap-2">
            <button
              className={`btn btn-sm ${selectedAppliance.is_on ? 'btn-outline-danger' : 'btn-success'}`}
              onClick={() => toggleAppliance(selectedAppliance.id)}
            >
              <i className="bi bi-power me-1"></i>
              {selectedAppliance.is_on ? 'Turn Off Appliance' : 'Turn On Appliance'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
