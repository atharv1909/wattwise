import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function HomeSimulator3D({ appliances = [], onSelectAppliance }) {
  const mountRef = useRef(null);
  const [selectedApp, setSelectedApp] = useState(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    const width = currentMount.clientWidth;
    const height = currentMount.clientHeight;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1e29);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 12, 14);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    currentMount.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff5e6, 0.9);
    dirLight.position.set(8, 16, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // 3. Floor Plan Grid (Room Layout)
    const floorGeo = new THREE.PlaneGeometry(14, 10);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x242a38,
      roughness: 0.8,
      metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Room Divider Walls (Extruded Lines/Boxes)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3d485e });
    const createWall = (w, h, d, x, z) => {
      const wallGeo = new THREE.BoxGeometry(w, h, d);
      const wall = new THREE.Mesh(wallGeo, wallMat);
      wall.position.set(x, h / 2, z);
      scene.add(wall);
    };

    // Partition walls
    createWall(0.15, 1.2, 10, 0, 0);      // Vertical divider
    createWall(14, 1.2, 0.15, 0, 0);       // Horizontal divider
    createWall(14, 0.2, 0.15, 0, 5);       // Outer bottom border
    createWall(14, 0.2, 0.15, 0, -5);      // Outer top border

    // 4. Render Procedural 3D Appliance Blocks with Power Glow
    const applianceMeshes = [];

    appliances.forEach((app, idx) => {
      const ratedW = app.rated_w || 100;
      let colorHex = 0x198754; // Green: < 100W
      let emissiveIntensity = 0.2;

      if (ratedW > 1000) {
        colorHex = 0xdc3545;   // Red glow: Heavy >1000W (AC, Geyser)
        emissiveIntensity = 0.6;
      } else if (ratedW >= 100) {
        colorHex = 0xffc107;   // Orange/Yellow: Medium (Fridge, TV, Fans)
        emissiveIntensity = 0.4;
      }

      // Procedural shape
      const geo = new THREE.BoxGeometry(0.9, 0.7, 0.9);
      const mat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: emissiveIntensity,
        roughness: 0.3
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;

      // Position logic from appliance metadata or fallback grid
      const posX = app.pos_x !== undefined ? app.pos_x : ((idx % 3) * 2 - 2);
      const posZ = app.pos_z !== undefined ? app.pos_z : (Math.floor(idx / 3) * 2 - 2);
      mesh.position.set(posX, 0.35, posZ);
      mesh.userData = app;

      scene.add(mesh);
      applianceMeshes.push(mesh);
    });

    // 5. Interactive Raycasting on Click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(applianceMeshes);

      if (intersects.length > 0) {
        const clickedApp = intersects[0].object.userData;
        setSelectedApp(clickedApp);
        if (onSelectAppliance) onSelectAppliance(clickedApp);
      }
    };

    renderer.domElement.addEventListener('click', handleClick);

    // 6. Simple Interactive Drag-to-Rotate
    let isDragging = false;
    let prevMouseX = 0;
    const handleMouseDown = (e) => { isDragging = true; prevMouseX = e.clientX; };
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      scene.rotation.y += deltaX * 0.006;
      prevMouseX = e.clientX;
    };
    const handleMouseUp = () => { isDragging = false; };

    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // Animation Loop
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      // Gentle floating animation on selected appliance
      applianceMeshes.forEach(m => {
        if (selectedApp && m.userData.id === selectedApp.id) {
          m.position.y = 0.5 + Math.sin(Date.now() * 0.005) * 0.1;
        }
      });
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!currentMount) return;
      const newW = currentMount.clientWidth;
      const newH = currentMount.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (renderer.domElement && currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [appliances]);

  return (
    <div className="canvas-container shadow-sm position-relative">
      <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />

      {/* Floating HUD Instructions */}
      <div className="position-absolute top-0 start-0 m-3 px-3 py-1 bg-dark bg-opacity-75 text-white rounded small">
        <i className="bi bi-arrows-move me-1"></i> Drag to rotate 3D Home | Click box to inspect appliance
      </div>

      {/* Color legend */}
      <div className="position-absolute bottom-0 start-0 m-3 p-2 bg-dark bg-opacity-75 text-white rounded small d-flex gap-3">
        <span><span className="badge bg-danger">■</span> Heavy Load (&gt;1000W)</span>
        <span><span className="badge bg-warning text-dark">■</span> Medium (100-1000W)</span>
        <span><span className="badge bg-success">■</span> Baseline (&lt;100W)</span>
      </div>

      {/* Selected Appliance Detail Overlay */}
      {selectedApp && (
        <div className="position-absolute top-0 end-0 m-3 p-3 bg-white rounded shadow-sm" style={{ width: '250px' }}>
          <div className="d-flex justify-content-between align-items-center mb-1">
            <h6 className="mb-0 fw-bold">{selectedApp.custom_name || selectedApp.name}</h6>
            <button className="btn btn-sm btn-close" onClick={() => setSelectedApp(null)}></button>
          </div>
          <span className="badge bg-secondary mb-2">{selectedApp.category || 'Appliance'}</span>
          <div className="small">
            <div className="d-flex justify-content-between py-1 border-bottom">
              <span className="text-muted">Rated Power:</span>
              <span className="fw-semibold">{selectedApp.rated_w} Watts</span>
            </div>
            <div className="d-flex justify-content-between py-1 border-bottom">
              <span className="text-muted">BEE Rating:</span>
              <span className="text-warning fw-bold">{'★'.repeat(selectedApp.bee_star_rating || 3)}</span>
            </div>
            <div className="d-flex justify-content-between py-1 border-bottom">
              <span className="text-muted">Daily Usage:</span>
              <span>{selectedApp.daily_hours_guess || 4} hrs/day</span>
            </div>
            <div className="d-flex justify-content-between py-1">
              <span className="text-muted">Physics Model:</span>
              <span className="badge bg-info text-dark">{selectedApp.model_kind || 'scheduled'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
