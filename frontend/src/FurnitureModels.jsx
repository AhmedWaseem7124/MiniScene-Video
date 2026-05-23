import React from 'react';

// ─── Existing Models (improved) ────────────────────────────────────────────

export const Bed = () => (
  <group>
    <mesh position={[0, 0.2, 0]}><boxGeometry args={[1.4, 0.4, 2.1]} /><meshStandardMaterial color="#7c5235" roughness={0.8} /></mesh>
    <mesh position={[0, 0.52, 0]}><boxGeometry args={[1.35, 0.24, 2.05]} /><meshStandardMaterial color="#e8e0d5" roughness={0.9} /></mesh>
    <mesh position={[-0.32, 0.66, -0.8]}><boxGeometry args={[0.5, 0.12, 0.32]} /><meshStandardMaterial color="#f1ece6" /></mesh>
    <mesh position={[0.32, 0.66, -0.8]}><boxGeometry args={[0.5, 0.12, 0.32]} /><meshStandardMaterial color="#f1ece6" /></mesh>
    {/* Headboard */}
    <mesh position={[0, 0.7, -1.05]}><boxGeometry args={[1.42, 0.9, 0.08]} /><meshStandardMaterial color="#5c3a1e" roughness={0.7} /></mesh>
  </group>
);

export const KingBed = () => (
  <group>
    <mesh position={[0, 0.2, 0]}><boxGeometry args={[2.0, 0.4, 2.2]} /><meshStandardMaterial color="#6b4423" roughness={0.8} /></mesh>
    <mesh position={[0, 0.52, 0]}><boxGeometry args={[1.95, 0.24, 2.15]} /><meshStandardMaterial color="#ddd5c8" roughness={0.9} /></mesh>
    <mesh position={[-0.5, 0.66, -0.88]}><boxGeometry args={[0.6, 0.13, 0.35]} /><meshStandardMaterial color="#f5f0ea" /></mesh>
    <mesh position={[0.5, 0.66, -0.88]}><boxGeometry args={[0.6, 0.13, 0.35]} /><meshStandardMaterial color="#f5f0ea" /></mesh>
    <mesh position={[0, 0.75, -1.1]}><boxGeometry args={[2.02, 1.0, 0.09]} /><meshStandardMaterial color="#4a2a10" roughness={0.7} /></mesh>
  </group>
);

export const Chair = () => (
  <group>
    <mesh position={[0, 0.48, 0]}><boxGeometry args={[0.52, 0.07, 0.52]} /><meshStandardMaterial color="#2d3748" /></mesh>
    <mesh position={[0, 0.82, -0.23]}><boxGeometry args={[0.52, 0.68, 0.06]} /><meshStandardMaterial color="#2d3748" /></mesh>
    {[[-0.22, -0.22], [-0.22, 0.22], [0.22, -0.22], [0.22, 0.22]].map(([x, z], i) => (
      <mesh key={i} position={[x, 0.23, z]}><cylinderGeometry args={[0.022, 0.022, 0.46]} /><meshStandardMaterial color="#718096" metalness={0.4} roughness={0.6} /></mesh>
    ))}
  </group>
);

export const Armchair = () => (
  <group>
    {/* Seat */}
    <mesh position={[0, 0.42, 0]}><boxGeometry args={[0.82, 0.12, 0.78]} /><meshStandardMaterial color="#4a5568" roughness={0.85} /></mesh>
    {/* Back */}
    <mesh position={[0, 0.82, -0.35]}><boxGeometry args={[0.82, 0.8, 0.1]} /><meshStandardMaterial color="#4a5568" roughness={0.85} /></mesh>
    {/* Left arm */}
    <mesh position={[-0.41, 0.62, 0]}><boxGeometry args={[0.1, 0.42, 0.76]} /><meshStandardMaterial color="#2d3748" /></mesh>
    {/* Right arm */}
    <mesh position={[0.41, 0.62, 0]}><boxGeometry args={[0.1, 0.42, 0.76]} /><meshStandardMaterial color="#2d3748" /></mesh>
    {/* Legs */}
    {[[-0.35, -0.32], [-0.35, 0.32], [0.35, -0.32], [0.35, 0.32]].map(([x, z], i) => (
      <mesh key={i} position={[x, 0.17, z]}><boxGeometry args={[0.07, 0.34, 0.07]} /><meshStandardMaterial color="#1a202c" /></mesh>
    ))}
  </group>
);

export const Sofa = () => (
  <group>
    {/* Base/Frame */}
    <mesh position={[0, 0.2, 0]}><boxGeometry args={[2.1, 0.4, 0.92]} /><meshStandardMaterial color="#4a5568" roughness={0.85} /></mesh>
    {/* Back cushion */}
    <mesh position={[0, 0.64, -0.35]}><boxGeometry args={[2.05, 0.52, 0.16]} /><meshStandardMaterial color="#4a5568" roughness={0.85} /></mesh>
    {/* Seat cushions (3) */}
    {[-0.65, 0, 0.65].map((x, i) => (
      <mesh key={i} position={[x, 0.46, 0.06]}><boxGeometry args={[0.66, 0.14, 0.6]} /><meshStandardMaterial color="#5a6478" roughness={0.8} /></mesh>
    ))}
    {/* Armrests */}
    <mesh position={[-1.05, 0.52, 0]}><boxGeometry args={[0.12, 0.64, 0.92]} /><meshStandardMaterial color="#374151" /></mesh>
    <mesh position={[1.05, 0.52, 0]}><boxGeometry args={[0.12, 0.64, 0.92]} /><meshStandardMaterial color="#374151" /></mesh>
    {/* Legs */}
    {[[-0.9, -0.37], [-0.9, 0.37], [0.9, -0.37], [0.9, 0.37]].map(([x, z], i) => (
      <mesh key={i} position={[x, 0.05, z]}><boxGeometry args={[0.08, 0.1, 0.08]} /><meshStandardMaterial color="#1f2937" /></mesh>
    ))}
  </group>
);

export const Table = () => (
  <group>
    <mesh position={[0, 0.75, 0]}><boxGeometry args={[1.6, 0.06, 0.85]} /><meshStandardMaterial color="#d97706" roughness={0.6} /></mesh>
    {[[-0.72, -0.37], [0.72, -0.37], [-0.72, 0.37], [0.72, 0.37]].map(([x, z], i) => (
      <mesh key={i} position={[x, 0.375, z]}><boxGeometry args={[0.06, 0.75, 0.06]} /><meshStandardMaterial color="#1c1917" /></mesh>
    ))}
  </group>
);

export const Desk = () => (
  <group>
    {/* Tabletop */}
    <mesh position={[0, 0.76, 0]}><boxGeometry args={[1.4, 0.05, 0.7]} /><meshStandardMaterial color="#78350f" roughness={0.7} /></mesh>
    {/* Drawer unit */}
    <mesh position={[0.55, 0.38, 0]}><boxGeometry args={[0.35, 0.76, 0.65]} /><meshStandardMaterial color="#57534e" /></mesh>
    {/* Drawer handles */}
    {[0.15, 0.38, 0.62].map((y, i) => (
      <mesh key={i} position={[0.73, y, 0]}><boxGeometry args={[0.02, 0.04, 0.12]} /><meshStandardMaterial color="#a8a29e" metalness={0.6} /></mesh>
    ))}
    {/* Left legs */}
    <mesh position={[-0.62, 0.38, -0.3]}><boxGeometry args={[0.05, 0.76, 0.05]} /><meshStandardMaterial color="#1c1917" /></mesh>
    <mesh position={[-0.62, 0.38, 0.3]}><boxGeometry args={[0.05, 0.76, 0.05]} /><meshStandardMaterial color="#1c1917" /></mesh>
  </group>
);

export const SideTable = () => (
  <group>
    <mesh position={[0, 0.55, 0]}><cylinderGeometry args={[0.3, 0.3, 0.04, 16]} /><meshStandardMaterial color="#d4a96a" roughness={0.7} /></mesh>
    <mesh position={[0, 0.28, 0]}><cylinderGeometry args={[0.025, 0.025, 0.55, 8]} /><meshStandardMaterial color="#78716c" metalness={0.4} /></mesh>
    <mesh position={[0, 0.03, 0]}><cylinderGeometry args={[0.18, 0.2, 0.06, 16]} /><meshStandardMaterial color="#57534e" /></mesh>
  </group>
);

export const Plant = () => (
  <group>
    <mesh position={[0, 0.22, 0]}><cylinderGeometry args={[0.22, 0.16, 0.44, 12]} /><meshStandardMaterial color="#b0b8c4" roughness={0.9} /></mesh>
    <mesh position={[0, 0.26, 0]}><cylinderGeometry args={[0.2, 0.22, 0.06, 12]} /><meshStandardMaterial color="#8a939f" /></mesh>
    <mesh position={[0, 0.74, 0]}><sphereGeometry args={[0.32, 10, 10]} /><meshStandardMaterial color="#16a34a" roughness={0.85} /></mesh>
    <mesh position={[0.12, 0.92, 0.1]}><sphereGeometry args={[0.22, 8, 8]} /><meshStandardMaterial color="#15803d" roughness={0.85} /></mesh>
    <mesh position={[-0.15, 0.84, -0.1]}><sphereGeometry args={[0.26, 8, 8]} /><meshStandardMaterial color="#166534" roughness={0.85} /></mesh>
  </group>
);

export const Cupboard = () => (
  <group>
    <mesh position={[0, 1.0, 0]}><boxGeometry args={[1.05, 2.0, 0.52]} /><meshStandardMaterial color="#44403c" roughness={0.7} /></mesh>
    <mesh position={[0, 1.0, 0.27]}><boxGeometry args={[0.018, 1.95, 0.01]} /><meshStandardMaterial color="#1c1917" /></mesh>
    <mesh position={[-0.06, 1.0, 0.275]}><boxGeometry args={[0.018, 0.22, 0.018]} /><meshStandardMaterial color="#a8a29e" metalness={0.5} /></mesh>
    <mesh position={[0.06, 1.0, 0.275]}><boxGeometry args={[0.018, 0.22, 0.018]} /><meshStandardMaterial color="#a8a29e" metalness={0.5} /></mesh>
  </group>
);

export const Bookshelf = () => (
  <group>
    {/* Frame */}
    <mesh position={[0, 1.0, 0]}><boxGeometry args={[0.9, 2.0, 0.3]} /><meshStandardMaterial color="#57534e" roughness={0.8} /></mesh>
    {/* Shelves */}
    {[0.15, 0.62, 1.1, 1.58].map((y, i) => (
      <mesh key={i} position={[0, y, 0]}><boxGeometry args={[0.86, 0.04, 0.28]} /><meshStandardMaterial color="#44403c" /></mesh>
    ))}
    {/* Books */}
    {[[-0.22, 0.35], [0.1, 0.38], [-0.3, 0.82], [0.2, 0.85], [-0.1, 1.3]].map(([x, y], i) => (
      <mesh key={`b${i}`} position={[x, y, 0.02]}>
        <boxGeometry args={[0.1, 0.24, 0.22]} />
        <meshStandardMaterial color={['#dc2626','#2563eb','#16a34a','#d97706','#7c3aed'][i]} />
      </mesh>
    ))}
  </group>
);

export const TVStand = () => (
  <group>
    <mesh position={[0, 0.3, 0]}><boxGeometry args={[1.6, 0.6, 0.45]} /><meshStandardMaterial color="#1c1917" roughness={0.6} /></mesh>
    {/* Shelf dividers */}
    <mesh position={[-0.52, 0.3, 0]}><boxGeometry args={[0.02, 0.58, 0.43]} /><meshStandardMaterial color="#292524" /></mesh>
    <mesh position={[0.52, 0.3, 0]}><boxGeometry args={[0.02, 0.58, 0.43]} /><meshStandardMaterial color="#292524" /></mesh>
    {/* Leg strip */}
    <mesh position={[0, 0.04, 0]}><boxGeometry args={[1.56, 0.08, 0.41]} /><meshStandardMaterial color="#0c0a09" metalness={0.2} /></mesh>
  </group>
);

export const Decoration = () => (
  <group>
    <mesh position={[0, 0.22, 0]}><cylinderGeometry args={[0.1, 0.06, 0.44, 12]} /><meshStandardMaterial color="#f59e0b" metalness={0.3} roughness={0.5} /></mesh>
    <mesh position={[0, 0.46, 0]}><sphereGeometry args={[0.16, 10, 10]} /><meshStandardMaterial color="#ef4444" roughness={0.6} /></mesh>
    <mesh position={[-0.08, 0.56, 0.06]}><sphereGeometry args={[0.07, 8, 8]} /><meshStandardMaterial color="#fb923c" /></mesh>
    <mesh position={[0.1, 0.52, -0.05]}><sphereGeometry args={[0.06, 8, 8]} /><meshStandardMaterial color="#fbbf24" /></mesh>
  </group>
);

export const Rug = () => (
  <group>
    <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[2.4, 1.6]} />
      <meshStandardMaterial color="#8b5cf6" roughness={1} />
    </mesh>
    <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[2.2, 1.4]} />
      <meshStandardMaterial color="#7c3aed" roughness={1} />
    </mesh>
  </group>
);

export const Mirror = () => (
  <group>
    {/* Frame */}
    <mesh position={[0, 1.0, 0]}><boxGeometry args={[0.72, 1.52, 0.06]} /><meshStandardMaterial color="#1c1917" /></mesh>
    {/* Glass */}
    <mesh position={[0, 1.0, 0.04]}><boxGeometry args={[0.62, 1.4, 0.02]} /><meshStandardMaterial color="#bae6fd" metalness={0.9} roughness={0.05} transparent opacity={0.75} /></mesh>
  </group>
);

export const Painting = () => (
  <group>
    <mesh position={[0, 1.1, 0]}><boxGeometry args={[1.1, 0.85, 0.06]} /><meshStandardMaterial color="#1e293b" /></mesh>
    <mesh position={[0, 1.1, 0.04]}><boxGeometry args={[0.98, 0.74, 0.01]} /><meshStandardMaterial color="#38bdf8" roughness={0.9} /></mesh>
    <mesh position={[-0.18, 1.22, 0.05]}><sphereGeometry args={[0.12, 8, 8]} /><meshStandardMaterial color="#f59e0b" roughness={0.8} /></mesh>
    <mesh position={[0.22, 0.98, 0.05]}><sphereGeometry args={[0.09, 8, 8]} /><meshStandardMaterial color="#ef4444" roughness={0.8} /></mesh>
  </group>
);

export const Light = () => (
  <group>
    <mesh position={[0, 0.03, 0]}><cylinderGeometry args={[0.2, 0.2, 0.06, 14]} /><meshStandardMaterial color="#334155" /></mesh>
    <mesh position={[0, 0.78, 0]}><cylinderGeometry args={[0.018, 0.018, 1.5, 8]} /><meshStandardMaterial color="#64748b" metalness={0.5} /></mesh>
    <mesh position={[0, 1.45, 0]}><cylinderGeometry args={[0.14, 0.26, 0.32, 14]} /><meshStandardMaterial color="#fef9c3" transparent opacity={0.92} emissive="#fffbeb" emissiveIntensity={0.4} /></mesh>
  </group>
);

export const PendantLight = () => (
  <group>
    <mesh position={[0, 0, 0]}><cylinderGeometry args={[0.01, 0.01, 1.2, 6]} /><meshStandardMaterial color="#374151" /></mesh>
    <mesh position={[0, -1.2, 0]}><cylinderGeometry args={[0.2, 0.28, 0.3, 16]} /><meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} /></mesh>
    <mesh position={[0, -1.22, 0]}><sphereGeometry args={[0.1, 12, 12]} /><meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={0.8} /></mesh>
  </group>
);

// ─── Model Renderer ────────────────────────────────────────────────────────

export const renderModel = (type) => {
  switch (type) {
    case 'Bed':          return <Bed />;
    case 'KingBed':      return <KingBed />;
    case 'Chair':        return <Chair />;
    case 'Armchair':     return <Armchair />;
    case 'Sofa':         return <Sofa />;
    case 'Table':        return <Table />;
    case 'Desk':         return <Desk />;
    case 'SideTable':    return <SideTable />;
    case 'Plant':        return <Plant />;
    case 'Cupboard':     return <Cupboard />;
    case 'Bookshelf':    return <Bookshelf />;
    case 'TVStand':      return <TVStand />;
    case 'Decoration':   return <Decoration />;
    case 'Rug':          return <Rug />;
    case 'Mirror':       return <Mirror />;
    case 'Painting':     return <Painting />;
    case 'Light':        return <Light />;
    case 'PendantLight': return <PendantLight />;
    default:
      return <mesh><boxGeometry args={[0.6, 0.6, 0.6]} /><meshStandardMaterial color="#6366f1" wireframe /></mesh>;
  }
};
