import React, { useMemo } from 'react';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';

export default function MeasurementOverlay({ objects, placedItems, settings, visible }) {
  if (!visible) return null;

  const roomWidth = 10 * settings.roomScale;
  const roomDepth = 10 * settings.roomScale;
  const roomHeight = 4 * settings.roomScale;

  const allObjects = useMemo(() => {
    return [
      ...objects.map(o => ({
        id: o.id,
        label: o.label,
        center: [o.box_3d?.center[0] || 0, settings.floorHeight, o.box_3d?.center[2] || 0],
        size: [o.box_3d?.size[0] || 1, o.box_3d?.size[1] || 1, o.box_3d?.size[2] || 1]
      })),
      ...placedItems.map(p => ({
        id: p.id,
        label: p.name,
        center: [p.position[0], settings.floorHeight, p.position[2]],
        size: [p.scale[0], p.scale[1], p.scale[2]]
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
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        // Approximate clearance based on simple radius
        const radiusA = Math.max(a.size[0], a.size[2]) / 2;
        const radiusB = Math.max(b.size[0], b.size[2]) / 2;
        const clearance = dist - (radiusA + radiusB);

        // Only show lines for relatively close objects to avoid clutter
        if (dist < 4) {
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
  }, [allObjects, settings.floorHeight]);

  return (
    <group>
      {/* Room Dimensions */}
      <MeasurementLine 
        start={[-roomWidth / 2, settings.floorHeight + 0.05, -roomDepth / 2]}
        end={[roomWidth / 2, settings.floorHeight + 0.05, -roomDepth / 2]}
        label={`${roomWidth.toFixed(1)}m (Width)`}
        color="#38bdf8"
      />
      <MeasurementLine 
        start={[roomWidth / 2, settings.floorHeight + 0.05, -roomDepth / 2]}
        end={[roomWidth / 2, settings.floorHeight + 0.05, roomDepth / 2]}
        label={`${roomDepth.toFixed(1)}m (Length)`}
        color="#38bdf8"
      />
      <MeasurementLine 
        start={[roomWidth / 2, settings.floorHeight + 0.05, -roomDepth / 2]}
        end={[roomWidth / 2, settings.floorHeight + roomHeight, -roomDepth / 2]}
        label={`${roomHeight.toFixed(1)}m (Height)`}
        color="#38bdf8"
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
              {line.isOverlap ? 'Overlapping!' : `${line.clearance.toFixed(1)}m clr`}
            </div>
          </Html>
        </group>
      ))}

      {/* Object Width/Length Labels */}
      {allObjects.map(obj => (
        <Html key={`dim-${obj.id}`} position={[obj.center[0], settings.floorHeight + obj.size[1] + 0.2, obj.center[2]]} center>
           <div style={{
              background: 'rgba(15, 17, 21, 0.8)', color: '#94a3b8', border: '1px solid #475569',
              padding: '2px 4px', borderRadius: '4px', fontSize: '0.65rem',
              pointerEvents: 'none', whiteSpace: 'nowrap'
            }}>
              {obj.size[0].toFixed(1)}x{obj.size[2].toFixed(1)}m
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
          background: color, color: '#0f1115', padding: '2px 6px', borderRadius: '4px',
          fontSize: '0.75rem', fontWeight: 'bold', pointerEvents: 'none', whiteSpace: 'nowrap'
        }}>
          {label}
        </div>
      </Html>
    </group>
  );
}
