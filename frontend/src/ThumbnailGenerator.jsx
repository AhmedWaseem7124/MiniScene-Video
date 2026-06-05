import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { renderModel } from './FurnitureModels';

function SceneCapturer({ currentItem, onCapture }) {
  const { gl, scene } = useThree();
  const renderedTicks = useRef(0);

  useEffect(() => {
    renderedTicks.current = 0;
  }, [currentItem.id]);

  useFrame(() => {
    // Wait 5 frames to ensure Three.js has initialized, loaded the geometry, and rendered to buffer
    if (renderedTicks.current === 5) {
      const dataUrl = gl.domElement.toDataURL('image/png');
      onCapture(dataUrl);
    }
    renderedTicks.current++;
  });

  const getModelScaleAndOffset = (type) => {
    let scale = [1, 1, 1];
    let offset = [0, -0.5, 0];

    if (type === 'Cupboard') scale = [1 / 1.05, 1 / 2.0, 1 / 0.54];
    else if (type === 'Bookshelf') scale = [1 / 0.9, 1 / 2.0, 1 / 0.3];
    else if (type === 'TVStand') scale = [1 / 1.6, 1 / 0.6, 1 / 0.45];
    else if (type === 'Mirror') scale = [1 / 0.72, 1 / 1.76, 1 / 0.06];
    else if (type === 'WallMirror') scale = [1, 1, 1];
    else if (type === 'Painting') scale = [1 / 1.1, 1 / 1.525, 1 / 0.06];
    else if (type === 'Light') scale = [1 / 0.26, 1 / 1.61, 1 / 0.26];
    else if (type === 'PendantLight') {
      scale = [1 / 0.28, 1 / 1.97, 1 / 0.28];
      offset = [0, 0.385, 0];
    }
    else if (type === 'Bed') scale = [1 / 1.42, 1 / 1.15, 1 / 2.14];
    else if (type === 'KingBed') scale = [1 / 2.02, 1 / 1.25, 1 / 2.29];
    else if (type === 'Chair') scale = [1 / 0.52, 1 / 1.16, 1 / 0.52];
    else if (type === 'Armchair') scale = [1 / 0.82, 1 / 1.22, 1 / 0.8];
    else if (type === 'Sofa') scale = [1 / 2.1, 1 / 0.9, 1 / 0.92];
    else if (type === 'Table') scale = [1 / 1.6, 1 / 0.78, 1 / 0.85];
    else if (type === 'Desk') scale = [1 / 1.4, 1 / 0.785, 1 / 0.7];
    else if (type === 'SideTable') scale = [1 / 0.6, 1 / 0.57, 1 / 0.6];
    else if (type === 'Plant') scale = [1 / 0.44, 1 / 1.06, 1 / 0.44];
    else if (type === 'Decoration') scale = [1 / 0.32, 1 / 0.62, 1 / 0.32];
    else if (type === 'Rug') scale = [1 / 2.4, 1 / 0.012, 1 / 1.6];

    return { scale, offset };
  };

  const { scale, offset } = getModelScaleAndOffset(currentItem.type);

  // Styling traversal to color-code models elegantly for pre-render
  useEffect(() => {
    const colorObj = new THREE.Color(currentItem.defaultColor || '#a8a29e');
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
        
        if (!child.material) {
          child.material = new THREE.MeshStandardMaterial({ color: colorObj });
        } else {
          child.material = child.material.clone();
          child.material.color = colorObj;
          
          if (currentItem.material === 'metal') {
            child.material.metalness = 0.8;
            child.material.roughness = 0.2;
          } else if (currentItem.material === 'glass') {
            child.material.metalness = 0.95;
            child.material.roughness = 0.05;
            child.material.opacity = 0.4;
            child.material.transparent = true;
          } else if (currentItem.material === 'wood') {
            child.material.metalness = 0.05;
            child.material.roughness = 0.5;
          } else {
            child.material.metalness = 0.05;
            child.material.roughness = 0.75;
          }
        }
      }
    });
  }, [currentItem.id, scene]);

  return (
    <group>
      <ambientLight intensity={1.2} />
      <directionalLight position={[4, 8, 4]} intensity={1.5} />
      <directionalLight position={[-4, 4, -4]} intensity={0.6} />
      <group rotation={[0.22, Math.PI / 4, 0]} scale={scale} position={offset}>
        {renderModel(currentItem.type)}
      </group>
    </group>
  );
}

export default function ThumbnailGenerator({ items, isGenerating, onProgress, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (isGenerating) {
      setCurrentIndex(0);
    }
  }, [isGenerating]);

  if (!isGenerating || currentIndex >= items.length) return null;

  const currentItem = items[currentIndex];

  const handleCapture = async (dataUrl) => {
    try {
      const catFolder = currentItem.category.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      const filename = `${catFolder}/${currentItem.id}.png`;

      const response = await fetch('http://127.0.0.1:5000/api/save-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: filename,
          image: dataUrl
        })
      });

      const result = await response.json();
      if (result.success) {
        console.log(`Thumbnail generated successfully: ${filename}`);
      } else {
        console.error(`Failed to save thumbnail: ${result.error}`);
      }
    } catch (err) {
      console.error('Error posting thumbnail capture:', err);
    }

    const nextIndex = currentIndex + 1;
    onProgress(nextIndex, items.length);

    if (nextIndex >= items.length) {
      onComplete();
    } else {
      setCurrentIndex(nextIndex);
    }
  };

  return (
    <div 
      style={{ 
        position: 'absolute', 
        left: -9999, 
        top: -9999, 
        width: 256, 
        height: 256, 
        pointerEvents: 'none', 
        visibility: 'hidden',
        zIndex: -1
      }}
    >
      <Canvas 
        gl={{ preserveDrawingBuffer: true, alpha: true }} 
        style={{ width: 256, height: 256 }}
        camera={{ position: [0, 0, 1.8], fov: 45 }}
      >
        <SceneCapturer currentItem={currentItem} onCapture={handleCapture} />
      </Canvas>
    </div>
  );
}
