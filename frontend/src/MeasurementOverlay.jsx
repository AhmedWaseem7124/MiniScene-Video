import React, { useMemo } from 'react';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';

export default function MeasurementOverlay({
  objects,
  placedItems,
  settings,
  visible,
  roomAnalysis,
  pcStats,
  scaleFactor = 1.0,
  distancePickerObjects = [],
}) {
  if (!visible) return null;

  // 1. Get raw room dimensions from point cloud or backend analysis
  const rawDimensions = useMemo(() => {
    if (pcStats) {
      return {
        width: pcStats.size.x,
        length: pcStats.size.z,
        height: pcStats.size.y,
      };
    }
    if (roomAnalysis?.dimensions) {
      const w = roomAnalysis.dimensions.width_m || roomAnalysis.dimensions.width || 5.0;
      const l = roomAnalysis.dimensions.length_m || roomAnalysis.dimensions.length || 5.0;
      const h = roomAnalysis.dimensions.height_m || roomAnalysis.dimensions.height || 3.0;
      return { width: w, length: l, height: h };
    }
    return { width: 5.0, length: 5.0, height: 3.0 };
  }, [pcStats, roomAnalysis]);

  const calibRoom = useMemo(() => {
    return {
      width: rawDimensions.width * scaleFactor,
      length: rawDimensions.length * scaleFactor,
      height: rawDimensions.height * scaleFactor,
    };
  }, [rawDimensions, scaleFactor]);

  const allObjects = useMemo(() => {
    return [
      ...objects.map(o => ({
        id: o.id,
        label: o.label,
        center: [o.box_3d?.center[0] || 0, o.box_3d?.center[1] || settings.floorHeight, o.box_3d?.center[2] || 0],
        size: [o.box_3d?.size[0] || 1, o.box_3d?.size[1] || 1, o.box_3d?.size[2] || 1]
      })),
      ...placedItems.map(p => ({
        id: p.id,
        label: p.name,
        center: [p.position[0], p.position[1] || settings.floorHeight, p.position[2]],
        size: [p.scale[0] || 1, p.scale[1] || 1, p.scale[2] || 1]
      }))
    ];
  }, [objects, placedItems, settings.floorHeight]);

  const distances = useMemo(() => {
    const lines = [];
    for (let i = 0; i < allObjects.length; i++) {
      for (let j = i + 1; j < allObjects.length; j++) {
        const a = allObjects[i];
        const b = allObjects[j];
        
        const dx = a.center[0] - b.center[0];
        const dz = a.center[2] - b.center[2];
        const rawDist = Math.sqrt(dx * dx + dz * dz);
        const dist = rawDist * scaleFactor;
        
        // Approximate clearance based on simple radius
        const radiusA = (Math.max(a.size[0], a.size[2]) / 2) * scaleFactor;
        const radiusB = (Math.max(b.size[0], b.size[2]) / 2) * scaleFactor;
        const clearance = dist - (radiusA + radiusB);

        // Only show lines for relatively close objects to avoid clutter
        if (rawDist < 4) {
          lines.push({
            id: `${a.id}-${b.id}`,
            start: [a.center[0], settings.floorHeight + 0.1, a.center[2]],
            end: [b.center[0], settings.floorHeight + 0.1, b.center[2]],
            mid: [(a.center[0] + b.center[0]) / 2, settings.floorHeight + 0.1, (a.center[2] + b.center[2]) / 2],
            dist,
            clearance,
            isWarning: clearance < 0.6,
            isOverlap: clearance < 0
          });
        }
      }
    }
    return lines;
  }, [allObjects, settings.floorHeight, scaleFactor]);

  // Picker line measurement
  const activePickerLine = useMemo(() => {
    if (!distancePickerObjects || distancePickerObjects.length < 2) return null;
    const aId = distancePickerObjects[0];
    const bId = distancePickerObjects[1];
    if (aId === bId || !aId || !bId) return null;

    const objA = allObjects.find(o => o.id === aId);
    const objB = allObjects.find(o => o.id === bId);

    if (!objA || !objB) return null;

    const pA = objA.center;
    const pB = objB.center;
    
    const dx = pA[0] - pB[0];
    const dy = pA[1] - pB[1];
    const dz = pA[2] - pB[2];
    const rawDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const dist = rawDist * scaleFactor;

    return {
      start: [pA[0], pA[1] + 0.05, pA[2]],
      end: [pB[0], pB[1] + 0.05, pB[2]],
      mid: [(pA[0] + pB[0]) / 2, ((pA[1] + pB[1]) / 2) + 0.2, (pA[2] + pB[2]) / 2],
      distance: dist,
      labelA: objA.label,
      labelB: objB.label,
    };
  }, [allObjects, distancePickerObjects, scaleFactor]);

  const rWidth = rawDimensions.width;
  const rDepth = rawDimensions.length;
  const rHeight = rawDimensions.height;

  return (
    <group>
      {/* Room Dimensions */}
      <MeasurementLine 
        start={[-rWidth / 2, settings.floorHeight + 0.05, -rDepth / 2]}
        end={[rWidth / 2, settings.floorHeight + 0.05, -rDepth / 2]}
        label={`${calibRoom.width.toFixed(2)}m (Width)`}
        color="#06b6d4"
      />
      <MeasurementLine 
        start={[rWidth / 2, settings.floorHeight + 0.05, -rDepth / 2]}
        end={[rWidth / 2, settings.floorHeight + 0.05, rDepth / 2]}
        label={`${calibRoom.length.toFixed(2)}m (Length)`}
        color="#06b6d4"
      />
      <MeasurementLine 
        start={[rWidth / 2, settings.floorHeight + 0.05, -rDepth / 2]}
        end={[rWidth / 2, settings.floorHeight + rHeight, -rDepth / 2]}
        label={`${calibRoom.height.toFixed(2)}m (Height)`}
        color="#06b6d4"
      />
      
      {/* Object Dimensions & Clearances */}
      {distances.map(line => (
        <group key={line.id}>
          <Line 
            points={[line.start, line.end]} 
            color={line.isOverlap ? '#ef4444' : line.isWarning ? '#f59e0b' : '#10b981'} 
            lineWidth={2}
            dashed={true}
          />
          <Html position={line.mid} center zIndexRange={[100, 0]}>
            <div style={{
              background: line.isOverlap ? 'rgba(239, 68, 68, 0.9)' : line.isWarning ? 'rgba(245, 158, 11, 0.9)' : 'rgba(16, 185, 129, 0.9)',
              color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem',
              fontWeight: 'bold', pointerEvents: 'none', whiteSpace: 'nowrap',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
              {line.isOverlap ? 'Overlapping!' : `${line.clearance.toFixed(2)}m clr`}
            </div>
          </Html>
        </group>
      ))}

      {/* Selected picker line */}
      {activePickerLine && (
        <group>
          <Line 
            points={[activePickerLine.start, activePickerLine.end]} 
            color="#06b6d4" 
            lineWidth={4}
          />
          {/* Active Picker End cap spheres */}
          <mesh position={activePickerLine.start}>
            <sphereGeometry args={[0.12]} />
            <meshBasicMaterial color="#06b6d4" />
          </mesh>
          <mesh position={activePickerLine.end}>
            <sphereGeometry args={[0.12]} />
            <meshBasicMaterial color="#06b6d4" />
          </mesh>
          <Html position={activePickerLine.mid} center zIndexRange={[100, 0]}>
            <div style={{
              background: '#06b6d4',
              color: '#0f1115', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem',
              fontWeight: 'bold', pointerEvents: 'none', whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(6,182,212,0.4)', border: '1px solid rgba(255,255,255,0.2)'
            }}>
              {activePickerLine.labelA} ↔ {activePickerLine.labelB}: {activePickerLine.distance.toFixed(2)}m
            </div>
          </Html>
        </group>
      )}

      {/* Object Width/Length Labels */}
      {allObjects.map(obj => (
        <Html key={`dim-${obj.id}`} position={[obj.center[0], settings.floorHeight + obj.size[1] + 0.2, obj.center[2]]} center>
           <div style={{
              background: 'rgba(15, 17, 21, 0.85)', color: '#94a3b8', border: '1px solid #475569',
              padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem',
              pointerEvents: 'none', whiteSpace: 'nowrap', fontWeight: 600
            }}>
              {(obj.size[0] * scaleFactor).toFixed(2)}x{(obj.size[2] * scaleFactor).toFixed(2)}m
            </div>
        </Html>
      ))}
    </group>
  );
}

function MeasurementLine({ start, end, label, color }) {
  const mid = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2];
  
  return (
    <group>
      <Line points={[start, end]} color={color} lineWidth={3} />
      {/* End caps */}
      <mesh position={start}>
        <sphereGeometry args={[0.08]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={end}>
        <sphereGeometry args={[0.08]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <Html position={mid} center zIndexRange={[100, 0]}>
        <div style={{
          background: color, color: '#0f1115', padding: '3px 8px', borderRadius: '4px',
          fontSize: '0.75rem', fontWeight: 'bold', pointerEvents: 'none', whiteSpace: 'nowrap',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
        }}>
          {label}
        </div>
      </Html>
    </group>
  );
}
