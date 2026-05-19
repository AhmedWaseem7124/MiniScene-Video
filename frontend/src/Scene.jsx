import React, { Suspense, useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PointerLockControls, Environment, ContactShadows, useCursor, TransformControls, Html } from '@react-three/drei';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { renderModel } from './FurnitureModels';
import ProxyRoom from './ProxyRoom';
import SemanticOverlay from './SemanticOverlay';
import MeasurementOverlay from './MeasurementOverlay';
import RecommendationOverlay from './RecommendationOverlay';
import GraphOverlay from './GraphOverlay';
import WalkableOverlay from './WalkableOverlay';
import CVOverlay from './CVOverlay';
import { processPointCloud } from './RepairEngine';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <group>
          <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="red" wireframe />
          </mesh>
        </group>
      );
    }
    return this.props.children;
  }
}

// Point cloud loader
function PointCloud({ settings, removedObjects, repairMode, onRepairAnalyticsUpdate, pointCloudUrl, onLoad }) {
  const [geometry, setGeometry] = useState(null);
  const [status, setStatus] = useState("Loading point cloud...");

  useEffect(() => {
    let active = true;
    const url = pointCloudUrl || '/point_cloud.ply';
    setStatus("Loading point cloud...");
    setGeometry(null);

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then(buffer => {
        if (!active) return;
        setStatus("Parsing point cloud...");
        try {
          const loader = new PLYLoader();
          const parsedPly = loader.parse(buffer);
          if (!parsedPly.attributes.position || parsedPly.attributes.position.count === 0) {
            throw new Error("0 vertices in PLYLoader");
          }
          setGeometry(parsedPly);
          setStatus(`Loaded point cloud: ${parsedPly.attributes.position.count} vertices`);
        } catch (err) {
          console.warn("PLYLoader failed, trying manual fallback...", err);
          setStatus("PLYLoader failed, using manual fallback...");
          // Manual ASCII fallback
          const text = new TextDecoder().decode(buffer);
          const lines = text.split('\n');
          let vertexCount = 0;
          let headerEnded = false;
          
          for (let line of lines) {
            line = line.trim();
            if (line.startsWith('element vertex')) {
              vertexCount = parseInt(line.split(' ')[2]);
            }
            if (line === 'end_header') {
              headerEnded = true;
              break;
            }
          }
          
          if (vertexCount === 0) throw new Error("Point cloud is empty (0 vertices).");
          
          const positions = new Float32Array(vertexCount * 3);
          const colors = new Float32Array(vertexCount * 3);
          let hasColors = false;
          
          let i = 0;
          let inData = false;
          for (let line of lines) {
            line = line.trim();
            if (!inData) {
              if (line === 'end_header') inData = true;
              continue;
            }
            if (!line) continue;
            
            const parts = line.split(/\s+/);
            if (parts.length >= 3 && i < vertexCount) {
              positions[i*3] = parseFloat(parts[0]);
              positions[i*3+1] = parseFloat(parts[1]);
              positions[i*3+2] = parseFloat(parts[2]);
              if (parts.length >= 6) {
                hasColors = true;
                colors[i*3] = parseFloat(parts[3]) / 255;
                colors[i*3+1] = parseFloat(parts[4]) / 255;
                colors[i*3+2] = parseFloat(parts[5]) / 255;
              }
              i++;
            }
          }
          
          const geom = new THREE.BufferGeometry();
          geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          if (hasColors) {
            geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
          }
          setGeometry(geom);
          setStatus(`Loaded point cloud (fallback): ${vertexCount} vertices`);
        }
      })
      .catch(err => {
        if (active) setStatus(`Error: ${err.message}`);
      });
      
    return () => { active = false; };
  }, [pointCloudUrl]);

  const { processedGeom, analytics } = useMemo(() => {
    if (!geometry) return { processedGeom: null, analytics: null };
    setStatus("Rendering point cloud...");
    return processPointCloud(geometry, removedObjects, repairMode, settings);
  }, [geometry, removedObjects, repairMode, settings]);

  useEffect(() => {
    if (analytics && onRepairAnalyticsUpdate) onRepairAnalyticsUpdate(analytics);
  }, [analytics, onRepairAnalyticsUpdate]);

  useEffect(() => {
    if (processedGeom) {
      processedGeom.computeBoundingBox();
      const bbox = processedGeom.boundingBox;
      const count = processedGeom.attributes.position.count;
      console.log(`[Validation] Point Cloud Vertex Count: ${count}`);
      
      if (count > 0) {
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        const size = new THREE.Vector3();
        bbox.getSize(size);
        
        if (onLoad) {
          onLoad({ center, size, count, min: bbox.min, max: bbox.max });
        }
        setStatus("Point cloud render complete");
      }
    }
  }, [processedGeom, onLoad]);

  const material = useMemo(() => {
    const hasColors = processedGeom && processedGeom.hasAttribute('color');
    return new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: hasColors,
      color: hasColors ? 0xffffff : 0x00ffff, // bright cyan fallback
      sizeAttenuation: true,
      transparent: true,
      opacity: settings.pointOpacity
    });
  }, [settings.pointOpacity, processedGeom]);

  if (settings.viewMode === 'room' || settings.viewMode === 'semantic') return null;

  return (
    <group>
      <Html position={[0, 0, 0]} center>
        <div style={{ color: 'white', background: 'rgba(0,0,0,0.8)', padding: '6px 12px', borderRadius: 4, whiteSpace: 'nowrap', display: status === "Point cloud render complete" ? 'none' : 'block', border: status.startsWith("Error") ? '1px solid red' : '1px solid #4ade80' }}>
          {status}
        </div>
      </Html>
      {processedGeom && <points geometry={processedGeom} material={material} rotation={[-Math.PI, 0, 0]} />}
    </group>
  );
}

// Bounding box for raw detected objects
function DetectedBoundingBox({ object, selected, onClick }) {
  const { center, size } = object.box_3d;
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  return (
    <group position={[center[0], -center[1], -center[2]]}>
      <mesh 
        onClick={(e) => { e.stopPropagation(); onClick(object.id); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[size[0], size[1], size[2]]} />
        <meshStandardMaterial 
          color={selected ? '#6366f1' : hovered ? '#818cf8' : '#ffffff'} 
          wireframe={!selected && !hovered}
          transparent
          opacity={selected || hovered ? 0.3 : 0.1}
          depthWrite={false}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(size[0], size[1], size[2])]} />
        <lineBasicMaterial color={selected ? '#4f46e5' : '#ffffff'} linewidth={2} />
      </lineSegments>
    </group>
  );
}

// Custom Walk Controls using PointerLock and WASD
function WalkControls() {
  const { camera } = useThree();
  const [keys, setKeys] = useState({ w: false, a: false, s: false, d: false, q: false, e: false });
  const speed = 0.05;

  useEffect(() => {
    const handleKeyDown = (e) => setKeys(k => ({ ...k, [e.key.toLowerCase()]: true }));
    const handleKeyUp = (e) => setKeys(k => ({ ...k, [e.key.toLowerCase()]: false }));
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame(() => {
    const dir = new THREE.Vector3();
    const right = new THREE.Vector3();
    
    camera.getWorldDirection(dir);
    dir.y = 0; // Keep movement on horizontal plane
    dir.normalize();
    right.crossVectors(camera.up, dir).normalize();

    if (keys.w) camera.position.addScaledVector(dir, speed);
    if (keys.s) camera.position.addScaledVector(dir, -speed);
    if (keys.a) camera.position.addScaledVector(right, speed);
    if (keys.d) camera.position.addScaledVector(right, -speed);
    if (keys.q) camera.position.y += speed;
    if (keys.e) camera.position.y -= speed;
  });

  return <PointerLockControls makeDefault />;
}

// Render Placed Furniture
function PlacedFurniture({ item, selected, onSelect, onUpdate }) {
  const groupRef = useRef();
  
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }
  }, [item.type]);

  const handleTransformChange = () => {
    if (groupRef.current) {
      onUpdate(item.id, {
        position: [groupRef.current.position.x, groupRef.current.position.y, groupRef.current.position.z],
        rotation: [groupRef.current.rotation.x, groupRef.current.rotation.y, groupRef.current.rotation.z],
        scale: [groupRef.current.scale.x, groupRef.current.scale.y, groupRef.current.scale.z]
      });
    }
  };

  const meshContent = (
    <group 
      ref={groupRef}
      position={item.position || [0,0,0]} 
      rotation={item.rotation || [0,0,0]}
      scale={item.scale || [1,1,1]}
      onClick={(e) => { e.stopPropagation(); onSelect(item.id); }}
    >
      {renderModel(item.type)}
    </group>
  );

  if (selected) {
    return (
      <TransformControls 
        mode="translate" 
        onMouseUp={handleTransformChange}
        object={groupRef.current}
      >
        {meshContent}
      </TransformControls>
    );
  }

  return meshContent;
}

function CameraSetup() {
  const { camera } = useThree();
  
  useFrame(() => {
    if (isNaN(camera.position.x) || isNaN(camera.position.y) || isNaN(camera.position.z)) {
      console.warn("Camera position was NaN, applying safe fallback.");
      camera.position.set(0, 2, 5);
      camera.lookAt(0, 1, 0);
    }
    // Also protect if OrbitControls targets [0,0,0] and camera is at [0,0,0]
    if (camera.position.length() < 0.001) {
      camera.position.set(0, 2, 5);
      camera.lookAt(0, 1, 0);
    }
  });
  return null;
}

function AutoFitController({ stats, fitTrigger }) {
  const { camera, controls } = useThree();

  useEffect(() => {
    if (!stats) return;
    
    // Scale max dimension to 10
    const maxDim = Math.max(stats.size.x, stats.size.y, stats.size.z);
    const targetScale = maxDim > 0 ? 10 / maxDim : 1;
    
    // Move camera to view the whole point cloud exactly as requested
    camera.position.set(0, 3, 8);
    camera.lookAt(0, 0, 0);
    
    // If OrbitControls is present, we must update its target
    if (controls) {
      controls.target.set(0, 0, 0);
      controls.update();
    }
    
    console.log(`[AutoFit] Camera moved to:`, camera.position, `Looking at: 0,0,0`);
    
  }, [stats, fitTrigger, camera, controls]);

  return null;
}

export default function Scene({ 
  objects, 
  placedItems, 
  selectedId, 
  onSelect, 
  cameraMode, 
  onUpdatePlacedItem,
  placementMode,
  onSceneClick,
  viewSettings,
  showMeasurements,
  activeHoverRec,
  showAssistantPanel,
  showGraphPanel,
  activeGraphSource,
  activeGraphTarget,
  showWalkablePanel,
  onWalkableAnalyticsUpdate,
  showCVPanel,
  cvStage,
  cvFrame,
  removedObjects,
  repairMode,
  showRepairPanel,
  onRepairAnalyticsUpdate,
  pointCloudUrl,
  fitTrigger
}) {
  const [pcStats, setPcStats] = useState(null);
  
  // Transform state to center and scale the scene
  const [sceneTransform, setSceneTransform] = useState({ position: [0, 0, 0], scale: [1, 1, 1] });

  const handlePointCloudLoad = useCallback((stats) => {
    setPcStats(stats);
    
    const maxDim = Math.max(stats.size.x, stats.size.y, stats.size.z);
    const targetScale = maxDim > 0 ? 10 / maxDim : 1;
    
    const offset = [
      -stats.center.x * targetScale,
      -stats.center.y * targetScale,
      -stats.center.z * targetScale
    ];
    
    setSceneTransform({ position: offset, scale: [targetScale, targetScale, targetScale] });
  }, []);
  const handleSceneClickInternal = (point) => {
    if (placementMode) {
      const localX = (point.x - sceneTransform.position[0]) / sceneTransform.scale[0];
      const localY = (point.y - sceneTransform.position[1]) / sceneTransform.scale[1];
      const localZ = (point.z - sceneTransform.position[2]) / sceneTransform.scale[2];
      onSceneClick({ x: localX, y: localY, z: localZ });
    }
  };

  return (
    <Canvas
      camera={{ position: [0, 2, 5], fov: 60 }}
      gl={{ antialias: true, alpha: false }}
      shadows
    >
      <AutoFitController stats={pcStats} fitTrigger={fitTrigger} />
      <color attach="background" args={['#0f1115']} />
      <Environment preset="apartment" />
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      
      {/* Required helpers */}
      <gridHelper args={[20, 20]} />
      <axesHelper args={[5]} />
      
      {pcStats && (
        <Html position={[0, -2, 0]} center>
          <div style={{ background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', color: 'white', whiteSpace: 'nowrap', pointerEvents: 'none', marginTop: '20vh' }} id="debug-camera">
            Debug - Bounds: Min [{pcStats.min?.x?.toFixed(1)}, {pcStats.min?.y?.toFixed(1)}, {pcStats.min?.z?.toFixed(1)}] | Max [{pcStats.max?.x?.toFixed(1)}, {pcStats.max?.y?.toFixed(1)}, {pcStats.max?.z?.toFixed(1)}] | Vtx: {pcStats.count}
          </div>
        </Html>
      )}

      <group position={sceneTransform.position} scale={sceneTransform.scale}>
        <Suspense fallback={null}>
          <ErrorBoundary>
            <PointCloud 
              settings={viewSettings} 
              removedObjects={removedObjects} 
              repairMode={repairMode}
              onRepairAnalyticsUpdate={onRepairAnalyticsUpdate}
              pointCloudUrl={pointCloudUrl}
              onLoad={handlePointCloudLoad}
            />
          </ErrorBoundary>
        </Suspense>

        <ProxyRoom 
          viewMode={viewSettings.viewMode}
          wallOpacity={viewSettings.wallOpacity}
          floorHeight={viewSettings.floorHeight}
          roomScale={viewSettings.roomScale}
          showGrid={viewSettings.showGrid}
          showWalls={viewSettings.showWalls}
          showCeiling={viewSettings.showCeiling}
          placementMode={placementMode}
          onSceneClick={handleSceneClickInternal}
        />

        {showWalkablePanel && (
          <WalkableOverlay 
            settings={viewSettings} 
            objects={objects} 
            placedItems={placedItems}
            onUpdateAnalytics={onWalkableAnalyticsUpdate}
          />
        )}

        <SemanticOverlay 
          viewMode={viewSettings.viewMode}
          settings={viewSettings}
          objects={objects}
          placedItems={placedItems}
        />

        <MeasurementOverlay 
          objects={objects}
          placedItems={placedItems}
          settings={viewSettings}
          visible={showMeasurements}
        />

        {showAssistantPanel && (
          <RecommendationOverlay 
            activeRec={activeHoverRec}
            settings={viewSettings}
            objects={objects}
            placedItems={placedItems}
          />
        )}

        {showGraphPanel && (
          <GraphOverlay 
            objects={objects}
            placedItems={placedItems}
            settings={viewSettings}
            hoverSource={activeGraphSource}
            hoverTarget={activeGraphTarget}
          />
        )}

        {showCVPanel && (
          <CVOverlay 
            settings={viewSettings}
            pipelineStage={cvStage}
            currentFrame={cvFrame}
          />
        )}

        {objects.map((obj) => (
          <DetectedBoundingBox 
            key={obj.id} 
            object={obj} 
            selected={selectedId === obj.id} 
            onClick={onSelect} 
          />
        ))}

        {placedItems.map(item => (
          <PlacedFurniture
            key={item.id}
            item={item}
            selected={selectedId === item.id}
            onSelect={onSelect}
            onUpdate={onUpdatePlacedItem}
          />
        ))}

        <ContactShadows opacity={0.5} scale={10} blur={2} far={4} position={[0, viewSettings.floorHeight + 0.01, 0]} />
        <Environment preset="city" />
        
        {cameraMode === 'walk' ? (
          <WalkControls />
        ) : (
          <OrbitControls makeDefault dampingFactor={0.05} />
        )}
      </group>
    </Canvas>
  );
}
