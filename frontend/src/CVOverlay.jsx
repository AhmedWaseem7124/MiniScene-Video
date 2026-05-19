import React, { useMemo } from 'react';
import { Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { generateCVData } from './CVReconstructionEngine';

export default function CVOverlay({ settings, pipelineStage, currentFrame }) {
  const cvData = useMemo(() => generateCVData(settings), [settings]);

  const activeCameras = cvData.cameras.slice(0, currentFrame + 1);
  const cameraPath = activeCameras.map(c => c.position);

  // Active matches for the current timeline up to currentFrame
  const activeMatches = cvData.featureMatches.filter(m => m.frameIdx <= currentFrame);
  
  // Active features for current frame
  const activeFeatures = cvData.features.slice(0, currentFrame + 1).flat();

  return (
    <group>
      {/* 1. Camera Trajectory Line */}
      {cameraPath.length > 1 && (
        <Line points={cameraPath} color="#10b981" lineWidth={3} dashed />
      )}

      {/* 2. Camera Frustums */}
      {activeCameras.map((cam, i) => (
        <group key={cam.id} position={cam.position} rotation={cam.rotation}>
          {/* Simple Camera Body */}
          <mesh>
            <boxGeometry args={[0.2, 0.15, 0.3]} />
            <meshBasicMaterial color={i === currentFrame ? "#ec4899" : "#94a3b8"} wireframe={i !== currentFrame} />
          </mesh>
          
          {/* Frustum Pyramid */}
          <group position={[0, 0, -0.6]} rotation={[Math.PI / 2, 0, 0]}>
            <mesh>
              <coneGeometry args={[0.4, 0.8, 4, 1, true]} />
              <meshBasicMaterial color={i === currentFrame ? "#38bdf8" : "#64748b"} wireframe transparent opacity={0.3} />
            </mesh>
          </group>

          {/* Label for current active frame */}
          {i === currentFrame && (
            <Html position={[0, 0.4, 0]} center>
              <div style={{ background: '#ec4899', color: 'white', padding: '2px 6px', borderRadius: 4, fontSize: '0.6rem', fontWeight: 'bold' }}>
                Frame {i}
              </div>
            </Html>
          )}
        </group>
      ))}

      {/* 3. Feature Points (Stage 2+) */}
      {pipelineStage >= 2 && (
        <group>
          {activeFeatures.map((p, i) => (
            <mesh key={`f_${i}`} position={p}>
              <sphereGeometry args={[0.03]} />
              <meshBasicMaterial color="#fcd34d" />
            </mesh>
          ))}
        </group>
      )}

      {/* 4. Feature Matches / Correspondences (Stage 2+) */}
      {pipelineStage >= 2 && activeMatches.map((match, i) => (
        <Line 
          key={`m_${i}`}
          points={[match.start, match.end]} 
          color="#f59e0b" 
          lineWidth={1} 
          transparent opacity={0.4} 
        />
      ))}
    </group>
  );
}
