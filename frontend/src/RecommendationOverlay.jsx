import React, { useMemo, useRef, useEffect } from 'react';
import { Html } from '@react-three/drei';
import { renderModel } from './FurnitureModels';
import * as THREE from 'three';

export default function RecommendationOverlay({ activeRec, settings, objects, placedItems }) {
  const width = 10 * settings.roomScale;
  const depth = 10 * settings.roomScale;
  const ghostRef = useRef();

  const allObjects = useMemo(() => {
    return [
      ...objects.map(o => ({ center: o.box_3d?.center || [0,0,0], size: o.box_3d?.size || [1,1,1] })),
      ...placedItems.map(p => ({ center: p.position, size: p.scale }))
    ];
  }, [objects, placedItems]);

  useEffect(() => {
    if (ghostRef.current) {
      const ghostMat = new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.6, wireframe: true });
      ghostRef.current.traverse((child) => {
        if (child.isMesh) {
          child.material = ghostMat;
        }
      });
    }
  }, [activeRec]);

  return (
    <group>
      {/* Show Zones (Ideal Walkable vs Restricted) */}
      <mesh position={[0, settings.floorHeight + 0.015, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.1} depthWrite={false} />
      </mesh>

      {/* Restricted Zones around existing furniture */}
      {allObjects.map((obj, i) => (
        <mesh key={i} position={[obj.center[0], settings.floorHeight + 0.016, obj.center[2]]} rotation={[-Math.PI/2, 0, 0]}>
          <planeGeometry args={[obj.size[0] + 0.5, obj.size[2] + 0.5]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.3} depthWrite={false} />
        </mesh>
      ))}

      {/* Ghost Preview Object */}
      {activeRec && (
        <group position={activeRec.position} rotation={activeRec.rotation}>
          {/* Ghost Mesh Wrapper */}
          <group ref={ghostRef}>
            {renderModel(activeRec.type)} 
          </group>
          
          {/* Highlight Base Ring */}
          <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.02, 0]}>
            <ringGeometry args={[0.5, 0.6, 32]} />
            <meshBasicMaterial color="#f59e0b" transparent opacity={0.8} side={THREE.DoubleSide} />
          </mesh>

          {/* Floating Marker */}
          <Html position={[0, 2, 0]} center distanceFactor={10} zIndexRange={[100, 0]}>
            <div style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white', padding: '6px 12px', borderRadius: '20px',
              fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)', pointerEvents: 'none', whiteSpace: 'nowrap'
            }}>
              ✨ Optimal Position ({Math.round(activeRec.score * 100)}%)
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}
