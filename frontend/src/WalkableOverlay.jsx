import React, { useMemo, useEffect } from 'react';
import { Html, Line } from '@react-three/drei';
import { generateWalkableMap } from './WalkableEngine';

export default function WalkableOverlay({ objects, placedItems, settings, onUpdateAnalytics }) {
  const mapData = useMemo(() => {
    return generateWalkableMap(objects, placedItems, settings);
  }, [objects, placedItems, settings]);

  useEffect(() => {
    if (onUpdateAnalytics) onUpdateAnalytics(mapData.analytics);
  }, [mapData.analytics, onUpdateAnalytics]);

  const width = 10 * settings.roomScale;
  const depth = 10 * settings.roomScale;

  return (
    <group>
      {/* Heatmap Floor Grid */}
      <mesh position={[0, settings.floorHeight + 0.015, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial 
          map={mapData.texture} 
          transparent 
          opacity={0.4} 
          depthWrite={false} 
        />
      </mesh>

      {/* Path Simulation */}
      {mapData.path && mapData.path.length > 0 && (
        <group>
          <Line 
            points={mapData.path} 
            color="#3b82f6" 
            lineWidth={4} 
          />
          <Html position={mapData.path[Math.floor(mapData.path.length/2)]} center zIndexRange={[100,0]}>
            <div style={{
              background: '#3b82f6', color: 'white', padding: '4px 8px', borderRadius: 20,
              fontSize: '0.7rem', fontWeight: 'bold', pointerEvents: 'none', boxShadow: '0 2px 10px rgba(59, 130, 246, 0.5)'
            }}>
              Simulated Path
            </div>
          </Html>
        </group>
      )}

      {/* Collision / Blocked Zones Warning */}
      {mapData.analytics.blockedPercent > 40 && (
        <Html position={[0, settings.floorHeight + 2, 0]} center zIndexRange={[100,0]}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.9)', color: 'white', padding: '8px 16px', borderRadius: 8,
            fontSize: '0.9rem', fontWeight: 'bold', pointerEvents: 'none', border: '1px solid #fca5a5'
          }}>
            ⚠️ High Collision Risk: Pathways Blocked
          </div>
        </Html>
      )}
    </group>
  );
}
