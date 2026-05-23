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
}) {
  const isPointsMode = viewMode === 'points' || viewMode === 'semantic';

  // Derive room dimensions from real point-cloud bounds when available
  const scaleFactor = roomScale || 1;
  const width  = pcBounds ? Math.max(4, pcBounds.size.x * 1.15) * scaleFactor : 10 * scaleFactor;
  const depth  = pcBounds ? Math.max(4, pcBounds.size.z * 1.15) * scaleFactor : 10 * scaleFactor;
  // Height: use actual Y extent capped between 2.5 and 5 for reasonable wall height
  const height = pcBounds ? Math.min(5, Math.max(2.5, pcBounds.size.y * 0.8)) * scaleFactor : 4 * scaleFactor;

  const handlePointerDown = (e) => {
    if (placementMode) {
      e.stopPropagation();
      onSceneClick(e.point);
    }
  };

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
