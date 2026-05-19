import React, { useMemo } from 'react';
import { Html, Line } from '@react-three/drei';
import { generateSceneGraph } from './SceneGraphEngine';

export default function GraphOverlay({ settings, objects, placedItems, hoverSource, hoverTarget }) {
  const graphData = useMemo(() => {
    return generateSceneGraph(objects, placedItems, settings);
  }, [objects, placedItems, settings]);

  const getColor = (relation) => {
    switch (relation) {
      case 'attached_to': return '#ef4444'; // red
      case 'on_top_of': return '#f59e0b'; // orange
      case 'next_to': return '#3b82f6'; // blue
      case 'in_front_of': return '#10b981'; // green
      case 'behind': return '#6366f1'; // indigo
      case 'facing': return '#a855f7'; // purple
      case 'near': return '#94a3b8'; // slate
      default: return '#ec4899'; // pink
    }
  };

  return (
    <group>
      {/* Draw Nodes (Objects) */}
      {graphData.nodes.map(node => {
        const isHovered = node.id === hoverSource || node.id === hoverTarget;
        return (
          <group key={`node-${node.id}`}>
            <mesh position={[node.center[0], node.center[1] + node.size[1]/2 + 0.5, node.center[2]]}>
              <sphereGeometry args={[isHovered ? 0.2 : 0.1]} />
              <meshBasicMaterial color={isHovered ? '#ec4899' : '#334155'} />
            </mesh>
            {isHovered && (
              <mesh position={node.center}>
                <boxGeometry args={[node.size[0] + 0.2, node.size[1] + 0.2, node.size[2] + 0.2]} />
                <meshBasicMaterial color="#ec4899" transparent opacity={0.2} wireframe />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Draw Edges (Relationships) */}
      {graphData.edges.map(edge => {
        const isHovered = edge.source === hoverSource && edge.target === hoverTarget;
        const color = getColor(edge.relation);
        const lineWidth = isHovered ? 4 : 1.5;
        const opacity = isHovered ? 1 : (hoverSource ? 0.1 : 0.6); // Fade out if another is hovered

        // Start from above the object
        const startY = edge.start[1] + 0.8;
        const endY = edge.end[1] + 0.8;
        
        // Midpoint for the label with an arc
        const midX = (edge.start[0] + edge.end[0]) / 2;
        const midZ = (edge.start[2] + edge.end[2]) / 2;
        const midY = (startY + endY) / 2 + 0.5; // Arced line

        return (
          <group key={edge.id} visible={opacity > 0.1 || isHovered}>
            <Line 
              points={[[edge.start[0], startY, edge.start[2]], [midX, midY, midZ], [edge.end[0], endY, edge.end[2]]]} 
              color={color} 
              lineWidth={lineWidth}
              transparent
              opacity={opacity}
            />
            
            <Html position={[midX, midY, midZ]} center zIndexRange={[100, 0]}>
              <div style={{
                background: color, color: '#fff', padding: '2px 6px', borderRadius: '4px',
                fontSize: isHovered ? '0.8rem' : '0.65rem', fontWeight: 'bold', 
                opacity: opacity, transition: '0.2s', pointerEvents: 'none', whiteSpace: 'nowrap',
                boxShadow: isHovered ? `0 0 10px ${color}` : 'none'
              }}>
                {edge.relation}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
