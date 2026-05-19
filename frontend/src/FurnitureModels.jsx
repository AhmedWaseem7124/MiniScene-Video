import React from 'react';
import * as THREE from 'three';

// Low-poly placeholder models

export const Bed = () => (
  <group>
    {/* Base */}
    <mesh position={[0, 0.25, 0]}>
      <boxGeometry args={[1.4, 0.5, 2]} />
      <meshStandardMaterial color="#8b5a2b" />
    </mesh>
    {/* Mattress */}
    <mesh position={[0, 0.6, 0]}>
      <boxGeometry args={[1.35, 0.2, 1.95]} />
      <meshStandardMaterial color="#ffffff" />
    </mesh>
    {/* Pillows */}
    <mesh position={[-0.3, 0.75, -0.7]}>
      <boxGeometry args={[0.5, 0.1, 0.3]} />
      <meshStandardMaterial color="#e2e8f0" />
    </mesh>
    <mesh position={[0.3, 0.75, -0.7]}>
      <boxGeometry args={[0.5, 0.1, 0.3]} />
      <meshStandardMaterial color="#e2e8f0" />
    </mesh>
  </group>
);

export const Chair = () => (
  <group>
    {/* Seat */}
    <mesh position={[0, 0.5, 0]}>
      <boxGeometry args={[0.5, 0.05, 0.5]} />
      <meshStandardMaterial color="#334155" />
    </mesh>
    {/* Backrest */}
    <mesh position={[0, 0.85, -0.225]}>
      <boxGeometry args={[0.5, 0.7, 0.05]} />
      <meshStandardMaterial color="#334155" />
    </mesh>
    {/* Legs */}
    <mesh position={[-0.2, 0.25, -0.2]}>
      <cylinderGeometry args={[0.02, 0.02, 0.5]} />
      <meshStandardMaterial color="#94a3b8" />
    </mesh>
    <mesh position={[0.2, 0.25, -0.2]}>
      <cylinderGeometry args={[0.02, 0.02, 0.5]} />
      <meshStandardMaterial color="#94a3b8" />
    </mesh>
    <mesh position={[-0.2, 0.25, 0.2]}>
      <cylinderGeometry args={[0.02, 0.02, 0.5]} />
      <meshStandardMaterial color="#94a3b8" />
    </mesh>
    <mesh position={[0.2, 0.25, 0.2]}>
      <cylinderGeometry args={[0.02, 0.02, 0.5]} />
      <meshStandardMaterial color="#94a3b8" />
    </mesh>
  </group>
);

export const Table = () => (
  <group>
    {/* Top */}
    <mesh position={[0, 0.75, 0]}>
      <boxGeometry args={[1.5, 0.05, 0.8]} />
      <meshStandardMaterial color="#d97706" />
    </mesh>
    {/* Legs */}
    <mesh position={[-0.7, 0.375, -0.35]}>
      <boxGeometry args={[0.05, 0.75, 0.05]} />
      <meshStandardMaterial color="#1e293b" />
    </mesh>
    <mesh position={[0.7, 0.375, -0.35]}>
      <boxGeometry args={[0.05, 0.75, 0.05]} />
      <meshStandardMaterial color="#1e293b" />
    </mesh>
    <mesh position={[-0.7, 0.375, 0.35]}>
      <boxGeometry args={[0.05, 0.75, 0.05]} />
      <meshStandardMaterial color="#1e293b" />
    </mesh>
    <mesh position={[0.7, 0.375, 0.35]}>
      <boxGeometry args={[0.05, 0.75, 0.05]} />
      <meshStandardMaterial color="#1e293b" />
    </mesh>
  </group>
);

export const Plant = () => (
  <group>
    {/* Pot */}
    <mesh position={[0, 0.2, 0]}>
      <cylinderGeometry args={[0.2, 0.15, 0.4]} />
      <meshStandardMaterial color="#cbd5e1" />
    </mesh>
    {/* Leaves */}
    <mesh position={[0, 0.7, 0]}>
      <sphereGeometry args={[0.3, 8, 8]} />
      <meshStandardMaterial color="#22c55e" />
    </mesh>
    <mesh position={[0.1, 0.9, 0.1]}>
      <sphereGeometry args={[0.2, 8, 8]} />
      <meshStandardMaterial color="#16a34a" />
    </mesh>
    <mesh position={[-0.15, 0.8, -0.1]}>
      <sphereGeometry args={[0.25, 8, 8]} />
      <meshStandardMaterial color="#15803d" />
    </mesh>
  </group>
);

export const Cupboard = () => (
  <group>
    <mesh position={[0, 1, 0]}>
      <boxGeometry args={[1, 2, 0.5]} />
      <meshStandardMaterial color="#475569" />
    </mesh>
    {/* Doors line */}
    <mesh position={[0, 1, 0.26]}>
      <boxGeometry args={[0.02, 1.9, 0.01]} />
      <meshStandardMaterial color="#1e293b" />
    </mesh>
    {/* Handles */}
    <mesh position={[-0.05, 1, 0.27]}>
      <boxGeometry args={[0.02, 0.2, 0.02]} />
      <meshStandardMaterial color="#94a3b8" />
    </mesh>
    <mesh position={[0.05, 1, 0.27]}>
      <boxGeometry args={[0.02, 0.2, 0.02]} />
      <meshStandardMaterial color="#94a3b8" />
    </mesh>
  </group>
);

export const Decoration = () => (
  <group>
    {/* Vase */}
    <mesh position={[0, 0.2, 0]}>
      <cylinderGeometry args={[0.1, 0.05, 0.4]} />
      <meshStandardMaterial color="#fcd34d" />
    </mesh>
    {/* Flowers */}
    <mesh position={[0, 0.45, 0]}>
      <sphereGeometry args={[0.15, 8, 8]} />
      <meshStandardMaterial color="#ef4444" />
    </mesh>
  </group>
);

export const Painting = () => (
  <group>
    {/* Frame */}
    <mesh position={[0, 1, 0]}>
      <boxGeometry args={[1, 0.8, 0.05]} />
      <meshStandardMaterial color="#1e293b" />
    </mesh>
    {/* Canvas */}
    <mesh position={[0, 1, 0.03]}>
      <boxGeometry args={[0.9, 0.7, 0.01]} />
      <meshStandardMaterial color="#38bdf8" />
    </mesh>
  </group>
);

export const Light = () => (
  <group>
    {/* Base */}
    <mesh position={[0, 0.025, 0]}>
      <cylinderGeometry args={[0.2, 0.2, 0.05]} />
      <meshStandardMaterial color="#334155" />
    </mesh>
    {/* Pole */}
    <mesh position={[0, 0.75, 0]}>
      <cylinderGeometry args={[0.02, 0.02, 1.5]} />
      <meshStandardMaterial color="#64748b" />
    </mesh>
    {/* Shade */}
    <mesh position={[0, 1.4, 0]}>
      <cylinderGeometry args={[0.15, 0.25, 0.3]} />
      <meshStandardMaterial color="#fef3c7" transparent opacity={0.9} />
    </mesh>
  </group>
);

export const renderModel = (type) => {
  switch (type) {
    case 'Bed': return <Bed />;
    case 'Chair': return <Chair />;
    case 'Table': return <Table />;
    case 'Plant': return <Plant />;
    case 'Cupboard': return <Cupboard />;
    case 'Decoration': return <Decoration />;
    case 'Painting': return <Painting />;
    case 'Light': return <Light />;
    default: return <mesh><boxGeometry args={[0.5, 0.5, 0.5]}/><meshStandardMaterial color="hotpink"/></mesh>;
  }
};
