import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';

export default function SemanticOverlay({ viewMode, settings, objects, placedItems }) {
  if (!viewMode.includes('semantic')) return null;

  const width = 10 * settings.roomScale;
  const depth = 10 * settings.roomScale;
  const height = 4 * settings.roomScale;

  // Hybrid vs Pure Semantic Opacity
  const baseOpacity = viewMode === 'semantic-hybrid' ? 0.3 : 0.6;

  // Combine objects and placed items for clustering/obstacles
  const obstacles = useMemo(() => {
    return [
      ...objects.map(o => ({
        id: o.id,
        label: o.label,
        center: [o.box_3d?.center[0] || 0, settings.floorHeight, o.box_3d?.center[2] || 0],
        size: [o.box_3d?.size[0] || 1, 0.1, o.box_3d?.size[2] || 1]
      })),
      ...placedItems.map(p => ({
        id: p.id,
        label: p.name,
        center: [p.position[0], settings.floorHeight, p.position[2]],
        size: [p.scale[0], 0.1, p.scale[2]]
      }))
    ];
  }, [objects, placedItems, settings.floorHeight]);

  return (
    <group>
      {/* Floor - Blue Tint */}
      <mesh position={[0, settings.floorHeight + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={baseOpacity * 0.5} depthWrite={false} />
        <SemanticLabel text="Floor" position={[0, 0, 0]} color="#3b82f6" />
      </mesh>

      {/* Walls - Gray Tint */}
      <group>
        <mesh position={[0, settings.floorHeight + height / 2, -depth / 2 + 0.05]}>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial color="#64748b" transparent opacity={baseOpacity * 0.8} depthWrite={false} side={2} />
          <SemanticLabel text="Wall" position={[0, 0, 0]} color="#64748b" />
        </mesh>
        <mesh position={[-width / 2 + 0.05, settings.floorHeight + height / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[depth, height]} />
          <meshBasicMaterial color="#64748b" transparent opacity={baseOpacity * 0.8} depthWrite={false} side={2} />
          <SemanticLabel text="Wall" position={[0, 0, 0]} color="#64748b" />
        </mesh>
        <mesh position={[width / 2 - 0.05, settings.floorHeight + height / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[depth, height]} />
          <meshBasicMaterial color="#64748b" transparent opacity={baseOpacity * 0.8} depthWrite={false} side={2} />
          <SemanticLabel text="Wall" position={[0, 0, 0]} color="#64748b" />
        </mesh>
      </group>

      {/* Obstacles / Furniture Zones - Red/Purple Tint */}
      {obstacles.map(obs => (
        <group key={obs.id}>
          {/* Floor Obstacle footprint (Red) */}
          <mesh position={[obs.center[0], settings.floorHeight + 0.03, obs.center[2]]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[obs.size[0] * 1.5, obs.size[2] * 1.5]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={baseOpacity * 0.8} depthWrite={false} />
          </mesh>
          
          {/* Furniture Volume (Purple) */}
          <mesh position={[obs.center[0], settings.floorHeight + 1, obs.center[2]]}>
            <boxGeometry args={[obs.size[0] * 1.2, 2, obs.size[2] * 1.2]} />
            <meshBasicMaterial color="#a855f7" transparent opacity={baseOpacity * 0.4} wireframe depthWrite={false} />
          </mesh>
          
          <SemanticLabel text={obs.label} position={[obs.center[0], settings.floorHeight + 2.2, obs.center[2]]} color="#a855f7" />
        </group>
      ))}
    </group>
  );
}

function SemanticLabel({ text, position, color }) {
  return (
    <Html position={position} center distanceFactor={10} zIndexRange={[100, 0]}>
      <div style={{
        background: 'rgba(15, 17, 21, 0.8)',
        backdropFilter: 'blur(4px)',
        border: `1px solid ${color}`,
        color: '#f8fafc',
        padding: '4px 8px',
        borderRadius: '6px',
        fontSize: '0.8rem',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        pointerEvents: 'none',
        whiteSpace: 'nowrap'
      }}>
        {text}
      </div>
    </Html>
  );
}
