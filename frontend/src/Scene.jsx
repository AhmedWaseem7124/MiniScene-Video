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

// ─── Error Boundary ────────────────────────────────────────────────────────

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return (
      <group>
        <mesh><boxGeometry args={[1, 1, 1]} /><meshBasicMaterial color="red" wireframe /></mesh>
      </group>
    );
    return this.props.children;
  }
}

// ─── Point Cloud ───────────────────────────────────────────────────────────

function PointCloud({ settings, removedObjects, repairMode, onRepairAnalyticsUpdate, pointCloudUrl, onLoad, isSceneVisible }) {
  const [geometry, setGeometry] = useState(null);
  const [status, setStatus] = useState('Loading point cloud...');

  useEffect(() => {
    if (!pointCloudUrl) {
      setStatus('Waiting for point cloud data...');
      return;
    }
    let active = true;
    setStatus('Loading point cloud...');
    setGeometry(null);

    fetch(pointCloudUrl)
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.arrayBuffer(); })
      .then(buffer => {
        if (!active) return;
        setStatus('Parsing point cloud...');
        try {
          const loader = new PLYLoader();
          const parsed = loader.parse(buffer);
          if (!parsed.attributes.position || parsed.attributes.position.count === 0) throw new Error('0 vertices');
          
          parsed.computeBoundingBox();
          const bbox = parsed.boundingBox;
          const count = parsed.attributes.position.count;
          
          console.log("Geometry vertices:", count);
          console.log("PointCloud: geometry loaded");
          
          setGeometry(parsed);
          setStatus(`Loaded: ${count} vertices`);
          
          if (count > 0 && onLoad) {
            const center = new THREE.Vector3();
            const size = new THREE.Vector3();
            bbox.getCenter(center);
            bbox.getSize(size);
            onLoad({ center, size, count, min: bbox.min, max: bbox.max });
            console.log("PointCloud: onLoad fired");
          }
        } catch {
          // ASCII fallback
          const text = new TextDecoder().decode(buffer);
          const lines = text.split('\n');
          let vertexCount = 0;
          for (const line of lines) {
            if (line.trim().startsWith('element vertex')) vertexCount = parseInt(line.trim().split(' ')[2]);
            if (line.trim() === 'end_header') break;
          }
          if (vertexCount === 0) throw new Error('Empty point cloud');
          const positions = new Float32Array(vertexCount * 3);
          const colors = new Float32Array(vertexCount * 3);
          let hasColors = false, i = 0, inData = false;
          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!inData) { if (line === 'end_header') inData = true; continue; }
            if (!line) continue;
            const p = line.split(/\s+/);
            if (p.length >= 3 && i < vertexCount) {
              positions[i * 3] = parseFloat(p[0]);
              positions[i * 3 + 1] = parseFloat(p[1]);
              positions[i * 3 + 2] = parseFloat(p[2]);
              if (p.length >= 6) { hasColors = true; colors[i*3]=parseFloat(p[3])/255; colors[i*3+1]=parseFloat(p[4])/255; colors[i*3+2]=parseFloat(p[5])/255; }
              i++;
            }
          }
          const geom = new THREE.BufferGeometry();
          geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          if (hasColors) geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
          
          geom.computeBoundingBox();
          const bbox = geom.boundingBox;
          const count = vertexCount;
          
          console.log("Geometry vertices:", count);
          console.log("PointCloud: geometry loaded (fallback)");
          
          setGeometry(geom);
          setStatus(`Loaded (fallback): ${vertexCount} vertices`);
          
          if (count > 0 && onLoad) {
            const center = new THREE.Vector3();
            const size = new THREE.Vector3();
            bbox.getCenter(center);
            bbox.getSize(size);
            onLoad({ center, size, count, min: bbox.min, max: bbox.max });
            console.log("PointCloud: onLoad fired");
          }
        }
      })
      .catch(err => { if (active) setStatus(`Error: ${err.message}`); });

    return () => { active = false; };
  }, [pointCloudUrl]);

  const { processedGeom, analytics } = useMemo(() => {
    if (!geometry) return { processedGeom: null, analytics: null };
    
    // Bypass repair processing entirely on initial load, or if repair is explicitly disabled and no objects are deleted
    const shouldRunRepair = isSceneVisible && (repairMode === true || repairMode === 'visualize' || repairMode === 'original' || (removedObjects && removedObjects.length > 0));
    
    if (!shouldRunRepair) {
      return { processedGeom: geometry, analytics: null };
    }
    
    return processPointCloud(geometry, removedObjects, repairMode, settings);
  }, [geometry, removedObjects, repairMode, settings, isSceneVisible]);

  useEffect(() => {
    if (analytics && onRepairAnalyticsUpdate) onRepairAnalyticsUpdate(analytics);
  }, [analytics, onRepairAnalyticsUpdate]);

  useEffect(() => {
    if (processedGeom) {
      console.log("PointCloud: geometry rendered");
    }
  }, [processedGeom]);

  const material = useMemo(() => {
    const hasColors = processedGeom?.hasAttribute('color');
    return new THREE.PointsMaterial({
      size: settings.pointSize || 0.05,
      vertexColors: hasColors,
      color: hasColors ? 0xffffff : 0x00ddff,
      sizeAttenuation: true,
      transparent: true,
      opacity: settings.pointOpacity,
    });
  }, [settings.pointOpacity, settings.pointSize, processedGeom]);

  if (settings.viewMode === 'room' || settings.viewMode === 'semantic') return null;

  return (
    <group>
      {processedGeom && <points geometry={processedGeom} material={material} rotation={[-Math.PI, 0, 0]} />}
    </group>
  );
}

// ─── Label-matched placeholder models ─────────────────────────────────────
// These are simple geometry placeholders rendered when a YOLO object is
// detected but we do not have an explicit PlacedFurniture for it.

const LABEL_TO_MODEL_TYPE = {
  chair:         'Chair',
  couch:         'Sofa',
  sofa:          'Sofa',
  'dining table':'Table',
  table:         'Table',
  bed:           'Bed',
  plant:         'Plant',
  tv:            'TVStand',
  monitor:       'TVStand',
};

function DetectedPlaceholderModel({ label, size }) {
  const modelType = LABEL_TO_MODEL_TYPE[label?.toLowerCase()];
  if (!modelType) {
    // Generic semi-transparent box for unknown labels
    return (
      <mesh>
        <boxGeometry args={size || [0.8, 0.8, 0.8]} />
        <meshStandardMaterial color="#6366f1" transparent opacity={0.18} wireframe={false} />
      </mesh>
    );
  }
  // Render model at a small scale so it fits within the box bounds
  const s = size || [1, 1, 1];
  const scaleFactor = Math.min(s[0], s[1], s[2]) * 0.9;
  return (
    <group scale={[scaleFactor, scaleFactor, scaleFactor]}>
      {renderModel(modelType)}
    </group>
  );
}

// ─── Detected Bounding Box ─────────────────────────────────────────────────

function DetectedBoundingBox({ object, selected, onClick }) {
  const [x, y, z] = object.box_3d.center;
  const [w, h, d] = object.box_3d.size;
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  const label = object.label || 'object';
  const conf  = typeof object.confidence === 'number' ? object.confidence : 0;
  const confPct = Math.round(conf * 100);

  // Flip Y because the point cloud is rendered with Y-flipped rotation
  const pos = [x, -y, -z];
  
  const isEstimated = object.placement_quality === 'estimated';
  const boxColor = selected 
    ? '#6366f1' 
    : hovered 
      ? (isEstimated ? '#f43f5e' : '#818cf8') 
      : (isEstimated ? '#fda4af' : '#06b6d4');

  const lineRef = useRef();
  useEffect(() => {
    if (lineRef.current) {
      lineRef.current.computeLineDistances();
    }
  }, [w, h, d]);

  return (
    <group position={pos}>
      {/* Placeholder model */}
      <group position={[0, h / 2, 0]}>
        <DetectedPlaceholderModel label={label} size={[w, h, d]} />
      </group>

      {/* Semi-transparent bounding box */}
      <mesh
        onClick={e => { e.stopPropagation(); onClick(object.id); }}
        onPointerOver={e => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={() => setHovered(false)}
        position={[0, h / 2, 0]}
      >
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={boxColor}
          transparent
          opacity={isEstimated ? (selected ? 0.12 : hovered ? 0.08 : 0.03) : (selected ? 0.18 : hovered ? 0.14 : 0.06)}
          depthWrite={false}
        />
      </mesh>

      {/* Box wireframe edges */}
      {isEstimated ? (
        <lineSegments position={[0, h / 2, 0]} ref={lineRef}>
          <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
          <lineDashedMaterial 
            color={boxColor} 
            transparent 
            opacity={selected ? 0.8 : 0.35} 
            dashSize={0.08}
            gapSize={0.05}
          />
        </lineSegments>
      ) : (
        <lineSegments position={[0, h / 2, 0]}>
          <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
          <lineBasicMaterial color={boxColor} transparent opacity={selected ? 0.9 : 0.55} />
        </lineSegments>
      )}

      {/* Floating HTML label */}
      <Html
        position={[0, h + 0.25, 0]}
        center
        distanceFactor={8}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <div style={{
          background: selected 
            ? 'rgba(99,102,241,0.92)' 
            : (isEstimated ? 'rgba(244,63,94,0.85)' : 'rgba(6,182,212,0.88)'),
          color: 'white',
          padding: '3px 8px',
          borderRadius: 6,
          fontSize: 11,
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 700,
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
          border: `1px solid ${selected 
            ? 'rgba(165,180,252,0.5)' 
            : (isEstimated ? 'rgba(251,113,133,0.4)' : 'rgba(103,232,249,0.4)')}`,
        }}>
          {label}
          {isEstimated ? (
            <span style={{ marginLeft: 5, background: 'rgba(0,0,0,0.25)', padding: '2px 5px', borderRadius: 4, fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Estimated
            </span>
          ) : (
            confPct > 0 && (
              <span style={{ marginLeft: 5, fontWeight: 400, opacity: 0.85, fontSize: 10 }}>
                {confPct}%
              </span>
            )
          )}
        </div>
      </Html>
    </group>
  );
}

// ─── Walk Controls ─────────────────────────────────────────────────────────

function WalkControls() {
  const { camera } = useThree();
  const keys = useRef({ w: false, a: false, s: false, d: false, q: false, e: false });
  const speed = 0.06;

  useEffect(() => {
    const dn = e => { keys.current[e.key.toLowerCase()] = true; };
    const up = e => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', dn);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up); };
  }, []);

  useFrame(() => {
    const dir = new THREE.Vector3(); const right = new THREE.Vector3();
    camera.getWorldDirection(dir); dir.y = 0; dir.normalize();
    right.crossVectors(camera.up, dir).normalize();
    if (keys.current.w) camera.position.addScaledVector(dir, speed);
    if (keys.current.s) camera.position.addScaledVector(dir, -speed);
    if (keys.current.a) camera.position.addScaledVector(right, speed);
    if (keys.current.d) camera.position.addScaledVector(right, -speed);
    if (keys.current.q) camera.position.y += speed;
    if (keys.current.e) camera.position.y -= speed;
  });

  return <PointerLockControls makeDefault />;
}

// ─── Placed Furniture — fixed TransformControls ────────────────────────────

function PlacedFurniture({ item, selected, onSelect, onUpdate, transformMode }) {
  const outerGroupRef = useRef();
  const innerGroupRef = useRef();
  const [ready, setReady] = useState(false);

  // Delay one tick so innerGroupRef is mounted before TransformControls tries to attach
  useEffect(() => {
    if (selected && innerGroupRef.current) {
      const timer = setTimeout(() => setReady(true), 0);
      return () => clearTimeout(timer);
    } else {
      setReady(false);
    }
  }, [selected]);

  const handleChange = useCallback(() => {
    const g = innerGroupRef.current;
    if (!g) return;
    onUpdate(item.id, {
      position: [g.position.x, g.position.y, g.position.z],
      rotation: [g.rotation.x, g.rotation.y, g.rotation.z],
      scale: [g.scale.x, g.scale.y, g.scale.z],
    });
  }, [item.id, onUpdate]);

  const innerMesh = (
    <group
      ref={innerGroupRef}
      position={item.position || [0, 0, 0]}
      rotation={item.rotation || [0, 0, 0]}
      scale={item.scale || [1, 1, 1]}
      onClick={e => { e.stopPropagation(); onSelect(item.id); }}
    >
      {renderModel(item.type)}
    </group>
  );

  if (selected && ready && innerGroupRef.current) {
    return (
      <group ref={outerGroupRef}>
        <TransformControls
          object={innerGroupRef.current}
          mode={transformMode || 'translate'}
          onMouseUp={handleChange}
        />
        {innerMesh}
      </group>
    );
  }

  return innerMesh;
}

// ─── Camera safety + AutoFit ────────────────────────────────────────────────

function CameraSetup() {
  const { camera } = useThree();
  useFrame(() => {
    if (isNaN(camera.position.x) || camera.position.length() < 0.001) {
      camera.position.set(0, 3, 8);
      camera.lookAt(0, 0, 0);
    }
  });
  return null;
}

function AutoFitController({ stats, fitTrigger }) {
  const { camera, controls } = useThree();
  useEffect(() => {
    if (!stats) return;
    camera.position.set(0, 3.5, 9);
    camera.lookAt(0, 0, 0);
    if (controls) { controls.target.set(0, 0, 0); controls.update(); }
  }, [stats, fitTrigger]);
  return null;
}

// ─── Keyboard global handler ───────────────────────────────────────────────

function KeyboardHandler({ selectedId, onDelete, onTransformMode }) {
  useEffect(() => {
    const handle = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Delete' || e.key === 'Backspace') { if (selectedId) onDelete(selectedId); }
      if (e.key === 'g' || e.key === 'G') onTransformMode('translate');
      if (e.key === 'r' || e.key === 'R') onTransformMode('rotate');
      if (e.key === 's' || e.key === 'S') onTransformMode('scale');
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [selectedId, onDelete, onTransformMode]);
  return null;
}

// ─── Main Scene export ─────────────────────────────────────────────────────

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
  fitTrigger,
  transformMode,
  onTransformModeChange,
  onDeleteSelected,
  onPointCloudLoad,
  isSceneVisible,
}) {
  const [pcStats, setPcStats] = useState(null);
  const [sceneTransform, setSceneTransform] = useState({ position: [0, 0, 0], scale: [1, 1, 1] });

  const handlePointCloudLoad = useCallback((stats) => {
    setPcStats(stats);
    const maxDim = Math.max(stats.size.x, stats.size.y, stats.size.z);
    const targetScale = maxDim > 0 ? 10 / maxDim : 1;
    setSceneTransform({
      position: [-stats.center.x * targetScale, -stats.center.y * targetScale, -stats.center.z * targetScale],
      scale: [targetScale, targetScale, targetScale],
    });
    if (onPointCloudLoad) onPointCloudLoad(stats);
  }, [onPointCloudLoad]);

  const handleSceneClickInternal = (point) => {
    if (placementMode) {
      const [sx, sy, sz] = sceneTransform.scale;
      const [px, py, pz] = sceneTransform.position;
      onSceneClick({ x: (point.x - px) / sx, y: (point.y - py) / sy, z: (point.z - pz) / sz });
    }
  };

  return (
    <Canvas camera={{ position: [0, 3, 9], fov: 58 }} gl={{ antialias: true, alpha: false }} shadows>
      <KeyboardHandler selectedId={selectedId} onDelete={onDeleteSelected} onTransformMode={onTransformModeChange} />
      <AutoFitController stats={pcStats} fitTrigger={fitTrigger} />
      <CameraSetup />
      <color attach="background" args={['#080b12']} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[8, 12, 6]} intensity={1.2} castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[-6, 8, -4]} intensity={0.4} />

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
              isSceneVisible={isSceneVisible}
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
          pcBounds={pcStats}
        />

        {showWalkablePanel && (
          <WalkableOverlay
            settings={viewSettings}
            objects={objects}
            placedItems={placedItems}
            onUpdateAnalytics={onWalkableAnalyticsUpdate}
          />
        )}

        <SemanticOverlay viewMode={viewSettings.viewMode} settings={viewSettings} objects={objects} placedItems={placedItems} />
        <MeasurementOverlay objects={objects} placedItems={placedItems} settings={viewSettings} visible={showMeasurements} />

        {showAssistantPanel && (
          <RecommendationOverlay activeRec={activeHoverRec} settings={viewSettings} objects={objects} placedItems={placedItems} />
        )}

        {showGraphPanel && (
          <GraphOverlay objects={objects} placedItems={placedItems} settings={viewSettings} hoverSource={activeGraphSource} hoverTarget={activeGraphTarget} />
        )}

        {showCVPanel && (
          <CVOverlay settings={viewSettings} pipelineStage={cvStage} currentFrame={cvFrame} />
        )}

        {objects.map(obj => (
          <DetectedBoundingBox key={obj.id} object={obj} selected={selectedId === obj.id} onClick={onSelect} />
        ))}

        {placedItems.map(item => (
          <PlacedFurniture
            key={item.id}
            item={item}
            selected={selectedId === item.id}
            onSelect={onSelect}
            onUpdate={onUpdatePlacedItem}
            transformMode={transformMode}
          />
        ))}

        <ContactShadows opacity={0.4} scale={12} blur={2.5} far={5} position={[0, viewSettings.floorHeight + 0.01, 0]} />
        <Environment preset="apartment" />

        {cameraMode === 'walk' ? (
          <WalkControls />
        ) : (
          <OrbitControls makeDefault dampingFactor={0.06} enableDamping />
        )}
      </group>
    </Canvas>
  );
}
