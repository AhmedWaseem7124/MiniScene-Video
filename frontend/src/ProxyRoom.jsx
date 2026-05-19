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
  onSceneClick
}) {
  const isPointsMode = viewMode === 'points' || viewMode === 'semantic';

  const width = 10 * roomScale;
  const depth = 10 * roomScale;
  const height = 4 * roomScale;

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
          color="#1e293b" 
          roughness={0.8} 
          metalness={0.1}
          transparent
          opacity={isPointsMode ? 0 : viewMode === 'hybrid' ? 0.9 : 1}
        />
      </mesh>

      {/* Grid */}
      {showGrid && !isPointsMode && (
        <Grid 
          position={[0, 0.01, 0]} 
          args={[width, depth]} 
          cellSize={1} 
          cellThickness={1} 
          cellColor="#64748b" 
          sectionSize={5} 
          sectionThickness={1.5} 
          sectionColor="#94a3b8" 
          fadeDistance={30} 
          fadeStrength={1.5}
        />
      )}

      {/* Walls */}
      {showWalls && !isPointsMode && (
        <group>
          {/* Back Wall */}
          <mesh position={[0, height / 2, -depth / 2]} receiveShadow>
            <planeGeometry args={[width, height]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.9} transparent opacity={wallOpacity} side={2} />
          </mesh>
          {/* Left Wall */}
          <mesh position={[-width / 2, height / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[depth, height]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.9} transparent opacity={wallOpacity} side={2} />
          </mesh>
          {/* Right Wall */}
          <mesh position={[width / 2, height / 2, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[depth, height]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.9} transparent opacity={wallOpacity} side={2} />
          </mesh>
        </group>
      )}

      {/* Ceiling */}
      {showCeiling && !isPointsMode && (
        <mesh position={[0, height, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[width, depth]} />
          <meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={wallOpacity} side={2} />
        </mesh>
      )}
    </group>
  );
}
