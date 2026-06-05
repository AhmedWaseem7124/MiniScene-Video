import React from 'react';
import { Grid } from '@react-three/drei';

export default function ProxyRoom({
  viewMode,
  wallOpacity,
  floorHeight,
  roomScale,
  showGrid,
  showWalls,
  showCeiling,
  placementMode,
  onSceneClick,
  pcBounds,        // { size: THREE.Vector3, center: THREE.Vector3 } from point cloud load
  isHardcodedDemo,
  roomData,
}) {
  const isPointsMode = viewMode === 'points' || viewMode === 'semantic';

  const handlePointerDown = (e) => {
    if (placementMode) {
      e.stopPropagation();
      onSceneClick(e.point);
    }
  };

  if (isHardcodedDemo && roomData) {
    const floorSize = roomData.floor?.size || [6.4, 0.04, 7.2];
    const floorPos = roomData.floor?.position || [0, 0, 0];
    const floorColor = roomData.floor?.color || "#d7d0c4";
    const floorMat = roomData.floor?.material || "wood";
    
    let roughness = 0.7;
    let metalness = 0.05;
    if (floorMat === "marble") { roughness = 0.12; metalness = 0.1; }
    else if (floorMat === "wood") { roughness = 0.6; metalness = 0.05; }
    else if (floorMat === "tile") { roughness = 0.3; metalness = 0.05; }
    else if (floorMat === "carpet") { roughness = 0.95; metalness = 0.0; }
    else if (floorMat === "concrete") { roughness = 0.8; metalness = 0.0; }

    return (
      <group>
        {/* Floor */}
        <mesh
          position={floorPos}
          receiveShadow={!isPointsMode}
          onPointerDown={handlePointerDown}
          visible={!isPointsMode || placementMode}
        >
          <boxGeometry args={floorSize} />
          <meshStandardMaterial
            color={floorColor}
            roughness={roughness}
            metalness={metalness}
            transparent={false}
            opacity={1}
          />
        </mesh>

        {/* Walls */}
        {showWalls && !isPointsMode && roomData.walls && roomData.walls.map((wall) => (
          <mesh key={wall.id} position={wall.position} receiveShadow>
            <boxGeometry args={wall.size} />
            <meshStandardMaterial
              color={wall.color || "#b8b4aa"}
              roughness={0.9}
              transparent={true}
              opacity={0.55}
            />
          </mesh>
        ))}

        {/* Ceiling */}
        {showCeiling && !isPointsMode && roomData.ceiling && (
          <mesh position={roomData.ceiling.position} receiveShadow>
            <boxGeometry args={roomData.ceiling.size} />
            <meshStandardMaterial
              color={roomData.ceiling.color || "#f2eee8"}
              roughness={0.9}
              transparent={true}
              opacity={wallOpacity * 0.7}
            />
          </mesh>
        )}

        {/* Grid helper on floor */}
        {showGrid && !isPointsMode && (
          <gridHelper
            args={[Math.max(floorSize[0], floorSize[2]) * 1.5, 15, '#06b6d4', '#475569']}
            position={[0, floorPos[1] + floorSize[1]/2 + 0.01, 0]}
          />
        )}
      </group>
    );
  }

  // Derive room dimensions from real point-cloud bounds when available
  const scaleFactor = roomScale || 1;
  
  let rawWidth = pcBounds ? pcBounds.size.x * 1.15 : 5.0;
  let rawDepth = pcBounds ? pcBounds.size.z * 1.15 : 5.0;
  let rawHeight = pcBounds ? pcBounds.size.y * 0.8 : 2.7;
  
  // Clamp room dimensions: width: 2.5m - 8m, height: 2.2m - 3.5m, length/depth: 2.5m - 10m (Requirement 7)
  const width = Math.max(2.5, Math.min(8.0, rawWidth)) * scaleFactor;
  const depth = Math.max(2.5, Math.min(10.0, rawDepth)) * scaleFactor;
  const height = Math.max(2.2, Math.min(3.5, rawHeight)) * scaleFactor;

  return (
    <group position={[0, floorHeight, 0]}>
      {/* Floor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow={!isPointsMode}
        onPointerDown={handlePointerDown}
        visible={!isPointsMode || placementMode}
      >
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          color="#1a2035"
          roughness={0.85}
          metalness={0.05}
          transparent
          opacity={isPointsMode ? 0 : viewMode === 'hybrid' ? 0.92 : 1}
        />
      </mesh>

      {/* Subtle floor highlight */}
      {!isPointsMode && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
          <planeGeometry args={[width * 0.98, depth * 0.98]} />
          <meshStandardMaterial color="#1e2840" roughness={0.9} transparent opacity={0.4} />
        </mesh>
      )}

      {/* Grid */}
      {showGrid && !isPointsMode && (
        <Grid
          position={[0, 0.005, 0]}
          args={[width, depth]}
          cellSize={1}
          cellThickness={0.6}
          cellColor="#374151"
          sectionSize={5}
          sectionThickness={1.2}
          sectionColor="#4b5563"
          fadeDistance={Math.max(width, depth) * 2}
          fadeStrength={1.5}
        />
      )}

      {/* Walls */}
      {showWalls && !isPointsMode && (
        <group>
          {/* Back Wall */}
          <mesh position={[0, height / 2, -depth / 2]} receiveShadow>
            <planeGeometry args={[width, height]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.95} transparent opacity={wallOpacity} side={2} />
          </mesh>
          {/* Left Wall */}
          <mesh position={[-width / 2, height / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[depth, height]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.95} transparent opacity={wallOpacity} side={2} />
          </mesh>
          {/* Right Wall */}
          <mesh position={[width / 2, height / 2, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[depth, height]} />
            <meshStandardMaterial color="#e8edf5" roughness={0.95} transparent opacity={wallOpacity} side={2} />
          </mesh>
        </group>
      )}

      {/* Ceiling */}
      {showCeiling && !isPointsMode && (
        <mesh position={[0, height, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[width, depth]} />
          <meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={wallOpacity * 0.7} side={2} />
        </mesh>
      )}

      {/* Baseboard accent lines */}
      {showWalls && !isPointsMode && (
        <group>
          <mesh position={[0, 0.04, -depth / 2 + 0.01]}>
            <boxGeometry args={[width, 0.08, 0.02]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.6} />
          </mesh>
          <mesh position={[-width / 2 + 0.01, 0.04, 0]} rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[depth, 0.08, 0.02]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.6} />
          </mesh>
          <mesh position={[width / 2 - 0.01, 0.04, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <boxGeometry args={[depth, 0.08, 0.02]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.6} />
          </mesh>
        </group>
      )}
    </group>
  );
}
