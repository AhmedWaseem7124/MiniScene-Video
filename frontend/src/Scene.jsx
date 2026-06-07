import React, { Suspense, useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PointerLockControls, Environment, ContactShadows, useCursor, TransformControls, Html, Line } from '@react-three/drei';
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

// ─── Radial Gradient Shadow Texture Generator (Requirement 9) ────────────────
const createRadialShadowTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
  gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
};

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

  console.log("PointCloud URL:", pointCloudUrl);

  useEffect(() => {
    if (!pointCloudUrl) {
      setStatus('Waiting for point cloud data...');
      return;
    }
    let active = true;
    console.log("PLY fetch started");
    setStatus('Loading point cloud...');
    setGeometry(null);

    fetch(pointCloudUrl)
      .then(res => { 
        console.log("PLY fetch complete");
        if (!res.ok) throw new Error(`HTTP ${res.status}`); 
        return res.arrayBuffer(); 
      })
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
          
          console.log("PLY parsed vertices:", count);
          
          setGeometry(parsed);
          setStatus(`Loaded: ${count} vertices`);
          
          if (count > 0 && onLoad) {
            const center = new THREE.Vector3();
            const size = new THREE.Vector3();
            bbox.getCenter(center);
            bbox.getSize(size);
            console.log("Calling onLoad");
            onLoad({ center, size, count, min: bbox.min, max: bbox.max });
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
          
          console.log("PLY parsed vertices (fallback):", count);
          
          setGeometry(geom);
          setStatus(`Loaded (fallback): ${vertexCount} vertices`);
          
          if (count > 0 && onLoad) {
            const center = new THREE.Vector3();
            const size = new THREE.Vector3();
            bbox.getCenter(center);
            bbox.getSize(size);
            console.log("Calling onLoad");
            onLoad({ center, size, count, min: bbox.min, max: bbox.max });
          }
        }
      })
      .catch(err => { 
        console.error("PointCloud load failed:", err);
        if (active) {
          setStatus(`Error: ${err.message}`);
          if (onLoad) {
            console.warn("Calling onLoad fallback due to loading error");
            onLoad({
              center: new THREE.Vector3(0, 0, 0),
              size: new THREE.Vector3(5, 3, 5),
              count: 0,
              min: new THREE.Vector3(-2.5, -1.5, -2.5),
              max: new THREE.Vector3(2.5, 1.5, 2.5)
            });
          }
        }
      });

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
  chair:          'Chair',
  couch:          'Sofa',
  sofa:           'Sofa',
  bench:          'Sofa',
  'dining table': 'Table',
  table:          'Table',
  bed:            'Bed',
  plant:          'Plant',
  'potted plant': 'Plant',
  tv:             'TVStand',
  monitor:        'TVStand',
  rug:            'Rug',
  carpet:         'Rug',
  mirror:         'Mirror',
  painting:       'Painting',
  'wall art':     'Painting',
  lamp:           'Light',
  light:          'Light',
  curtain:        'Painting',
  shelf:          'Bookshelf',
  cupboard:       'Cupboard',
  wardrobe:       'Cupboard',
  cabinet:        'Cupboard',
  refrigerator:   'Cupboard',
  microwave:      'Cupboard',
  oven:           'Cupboard',
  sink:           'Cupboard',
  vase:           'Decoration',
  book:           'Bookshelf',
  clock:          'Mirror',
  window:         'Mirror',
  door:           'Mirror',
};

function DetectedPlaceholderModel({ label, size, object }) {
  const labelLower = label?.toLowerCase() || '';
  const s = size || [1, 1, 1];
  const groupRef = useRef();

  useEffect(() => {
    if (groupRef.current) {
      const color = object?.color ? new THREE.Color(object.color) : null;
      const opacity = typeof object?.opacity === 'number' ? object.opacity : 1.0;
      const roughness = typeof object?.roughness === 'number' ? object.roughness : 0.65;
      const metalness = typeof object?.metalness === 'number' ? object.metalness : 0.05;
      const emissive = object?.emissive ? new THREE.Color(object.emissive) : null;
      const emissiveIntensity = typeof object?.emissiveIntensity === 'number' ? object.emissiveIntensity : 0;

      groupRef.current.traverse((child) => {
        if (child.isMesh && child.material) {
          let materialToStyle = null;
          if (Array.isArray(child.material)) {
            child.material = child.material.map(m => m.clone());
            materialToStyle = child.material;
          } else {
            child.material = child.material.clone();
            materialToStyle = child.material;
          }

          const applyProperties = (mat) => {
            if (color) mat.color = color;
            mat.roughness = roughness;
            mat.metalness = metalness;
            mat.opacity = opacity;
            mat.transparent = opacity < 1.0;
            if (emissive && mat.emissive !== undefined) {
              mat.emissive = emissive;
              mat.emissiveIntensity = emissiveIntensity;
            }
          };

          if (Array.isArray(materialToStyle)) {
            materialToStyle.forEach(applyProperties);
          } else {
            applyProperties(materialToStyle);
          }
        }
      });
    }
  }, [object]);

  const getModelScaleAndOffset = () => {
    let type = null;
    
    // Curtains
    if (labelLower.includes('curtain') || labelLower.includes('blind') || labelLower.includes('rail')) {
      type = 'Curtain';
    }
    // Bed and frame
    else if (labelLower.includes('king')) {
      type = 'KingBed';
    }
    else if (labelLower.includes('bed_frame') || labelLower.includes('bedding') || (labelLower.includes('bed') && !labelLower.includes('side'))) {
      type = 'Bed';
    }
    // Nightstand / Bedside table
    else if (labelLower.includes('nightstand') || labelLower.includes('bedside') || labelLower.includes('drawer')) {
      type = 'BedsideTable';
    }
    // Kitchen specific models
    else if (labelLower.includes('refrigerator') || labelLower.includes('fridge')) {
      type = 'Refrigerator';
    }
    else if (labelLower.includes('oven')) {
      type = 'OvenStack';
    }
    else if (labelLower.includes('display_cabinet') || (labelLower.includes('display') && labelLower.includes('cabinet'))) {
      type = 'DisplayCabinet';
    }
    else if (labelLower.includes('kitchen_cabinet') || labelLower.includes('lower_kitchen') || labelLower.includes('base_cabinet') || labelLower.includes('cabinet_main')) {
      type = 'KitchenCabinet';
    }
    // Wardrobe
    else if (labelLower.includes('wardrobe')) {
      type = 'Wardrobe';
    }
    // Console
    else if (labelLower.includes('console') || labelLower.includes('vanity')) {
      type = 'Console';
    }
    // Mirror
    else if (labelLower.includes('mirror')) {
      type = 'WallMirror';
    }
    // Pendant Light / Chandelier
    else if (labelLower.includes('pendant_light') || labelLower.includes('pendant') || labelLower.includes('chandelier')) {
      type = 'PendantLight';
    }
    // Rug
    else if (labelLower.includes('rug') || labelLower.includes('carpet')) {
      type = 'Rug';
    }
    // Lounge seating
    else if (labelLower.includes('lounge')) {
      type = 'Armchair';
    }
    // TV Wall or TV Stand
    else if (labelLower.includes('tv_wall') || labelLower.includes('tv') || labelLower.includes('screen')) {
      type = 'TVStand';
    }
    // Cabinet/Cupboard
    else if (labelLower.includes('cabinet') || labelLower.includes('cupboard')) {
      type = 'Cupboard';
    }
    // Chandelier or ceiling light / sconce
    else if (labelLower.includes('ceiling_light') || labelLower.includes('light') || labelLower.includes('lamp') || labelLower.includes('sconce')) {
      type = 'Light';
    }
    // Sofa, sectional, chaise
    else if (labelLower.includes('sofa') || labelLower.includes('sectional') || labelLower.includes('chaise')) {
      type = 'Sofa';
    }
    // Coffee table, side table, table
    else if (labelLower.includes('table')) {
      type = 'Table';
    }
    // Chair, armchair
    else if (labelLower.includes('chair') || labelLower.includes('armchair') || labelLower.includes('stool') || labelLower.includes('ottoman') || labelLower.includes('seat')) {
      type = 'Chair';
    }
    // Painting, wall art
    else if (labelLower.includes('painting') || labelLower.includes('wall_art') || labelLower.includes('canvas') || labelLower.includes('art') || labelLower.includes('artwork')) {
      type = 'Painting';
    }
    else {
      const modelType = LABEL_TO_MODEL_TYPE[labelLower];
      if (modelType) type = modelType;
    }

    if (!type) {
      // Default box is unit-sized and centered at [0, 0, 0]
      return { scale: [1, 1, 1], offset: [0, 0, 0], isCustom: false };
    }

    let scale = [1, 1, 1];
    let offset = [0, -0.5, 0]; // Most models start at y=0 and extend to y=1 (or their natural height)

    if (type === 'Cupboard') scale = [1 / 1.05, 1 / 2.0, 1 / 0.54];
    else if (type === 'Bookshelf') scale = [1 / 0.9, 1 / 2.0, 1 / 0.3];
    else if (type === 'TVStand') scale = [1 / 1.6, 1 / 0.6, 1 / 0.45];
    else if (type === 'Mirror') scale = [1 / 0.72, 1 / 1.76, 1 / 0.06];
    else if (type === 'WallMirror') scale = [1, 1, 1];
    else if (type === 'Painting') scale = [1 / 1.1, 1 / 1.525, 1 / 0.06];
    else if (type === 'Light') scale = [1 / 0.26, 1 / 1.61, 1 / 0.26];
    else if (type === 'PendantLight') {
      scale = [1 / 0.28, 1 / 1.97, 1 / 0.28];
      offset = [0, 0.385, 0]; // Center translation since raw ranges [-1.37, 0.6]
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
    else if (['Curtain', 'BedsideTable', 'Wardrobe', 'Console', 'KitchenCabinet', 'Refrigerator', 'OvenStack', 'DisplayCabinet'].includes(type)) {
      scale = [1, 1, 1];
    }

    return { scale, offset, isCustom: true };
  };

  const getModel = () => {
    // Curtains
    if (labelLower.includes('curtain') || labelLower.includes('blind') || labelLower.includes('rail')) {
      return renderModel('Curtain');
    }

    // Bed and frame
    if (labelLower.includes('king')) {
      return renderModel('KingBed');
    }
    if (labelLower.includes('bed_frame') || labelLower.includes('bedding') || (labelLower.includes('bed') && !labelLower.includes('side'))) {
      return renderModel('Bed');
    }

    // Nightstand / Bedside table
    if (labelLower.includes('nightstand') || labelLower.includes('bedside') || labelLower.includes('drawer')) {
      return renderModel('BedsideTable');
    }

    // Kitchen specific models
    if (labelLower.includes('refrigerator') || labelLower.includes('fridge')) {
      return renderModel('Refrigerator');
    }
    if (labelLower.includes('oven')) {
      return renderModel('OvenStack');
    }
    if (labelLower.includes('display_cabinet') || (labelLower.includes('display') && labelLower.includes('cabinet'))) {
      return renderModel('DisplayCabinet');
    }
    if (labelLower.includes('kitchen_cabinet') || labelLower.includes('lower_kitchen') || labelLower.includes('base_cabinet') || labelLower.includes('cabinet_main')) {
      return renderModel('KitchenCabinet');
    }

    // Wardrobe
    if (labelLower.includes('wardrobe')) {
      return renderModel('Wardrobe');
    }

    // Console
    if (labelLower.includes('console') || labelLower.includes('vanity')) {
      return renderModel('Console');
    }

    // Mirror
    if (labelLower.includes('mirror')) {
      return renderModel('WallMirror');
    }

    // Pendant Light / Chandelier
    if (labelLower.includes('pendant_light') || labelLower.includes('pendant') || labelLower.includes('chandelier')) {
      return renderModel('PendantLight');
    }

    // Rug
    if (labelLower.includes('rug') || labelLower.includes('carpet')) {
      return renderModel('Rug');
    }

    // Lounge seating
    if (labelLower.includes('lounge')) {
      return renderModel('Armchair');
    }

    // Custom simple decor boxes for pillows, books, blankets, cups, frames, centerpiece, candles
    if (labelLower.includes('pillow') || labelLower.includes('book') || labelLower.includes('blanket') || labelLower.includes('magazine') || labelLower.includes('decor') || labelLower.includes('throw') || labelLower.includes('vase') || labelLower.includes('cup') || labelLower.includes('frame') || labelLower.includes('centerpiece') || labelLower.includes('candle')) {
      return (
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={object?.color || "#c59a72"} roughness={0.8} />
        </mesh>
      );
    }

    // TV Wall or TV Stand
    if (labelLower.includes('tv_wall') || labelLower.includes('tv') || labelLower.includes('screen')) {
      return renderModel('TVStand');
    }

    // Cabinet/Cupboard
    if (labelLower.includes('cabinet') || labelLower.includes('cupboard')) {
      return renderModel('Cupboard');
    }

    // Chandelier or ceiling light / sconce
    if (labelLower.includes('ceiling_light') || labelLower.includes('light') || labelLower.includes('lamp') || labelLower.includes('sconce')) {
      return renderModel('Light');
    }

    // Sofa, sectional, chaise
    if (labelLower.includes('sofa') || labelLower.includes('sectional') || labelLower.includes('chaise')) {
      return renderModel('Sofa');
    }

    // Coffee table, side table, table
    if (labelLower.includes('table')) {
      return renderModel('Table');
    }

    // Chair, armchair
    if (labelLower.includes('chair') || labelLower.includes('armchair') || labelLower.includes('stool') || labelLower.includes('ottoman') || labelLower.includes('seat')) {
      return renderModel('Chair');
    }

    // Painting, wall art
    if (labelLower.includes('painting') || labelLower.includes('wall_art') || labelLower.includes('canvas') || labelLower.includes('art') || labelLower.includes('artwork')) {
      return renderModel('Painting');
    }

    const modelType = LABEL_TO_MODEL_TYPE[labelLower];
    if (!modelType) {
      return (
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={object?.color || "#6366f1"} transparent opacity={0.3} />
        </mesh>
      );
    }

    return renderModel(modelType);
  };

  const { scale: modelScale, offset: modelOffset } = getModelScaleAndOffset();

  return (
    <group ref={groupRef} scale={s}>
      <group scale={modelScale} position={modelOffset}>
        {getModel()}
      </group>
    </group>
  );
}

// ─── Detected Bounding Box ─────────────────────────────────────────────────

function DetectedBoundingBox({ object, selected, onClick, viewSettings, shadowTexture, roomBounds }) {
  if (!object || !object.box_3d || !Array.isArray(object.box_3d.center) || !Array.isArray(object.box_3d.size)) {
    return null;
  }
  const [x, y, z] = object.box_3d.center;
  const [w_raw, h_raw, d_raw] = object.box_3d.size;
  const w = (typeof w_raw === 'number' && !isNaN(w_raw) && w_raw > 0) ? w_raw : 1.0;
  const h = (typeof h_raw === 'number' && !isNaN(h_raw) && h_raw > 0) ? h_raw : 1.0;
  const d = (typeof d_raw === 'number' && !isNaN(d_raw) && d_raw > 0) ? d_raw : 1.0;
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  const label = object.label || 'object';
  const conf  = typeof object.confidence === 'number' ? object.confidence : 0;
  const confPct = Math.round(conf * 100);

  const isEstimated = object.placement_quality === 'estimated';
  const category = object.placement_category || 'floor';
  
  const catLower = category?.toLowerCase();
  const isFloorObject = ['floor', 'seating', 'table', 'chair', 'console', 'cupboard', 'wardrobe', 'cabinet', 'plant', 'sofa', 'desk', 'armchair', 'decor'].includes(catLower) || !['wall', 'ceiling', 'wall_art', 'painting', 'curtain', 'opening', 'wall_light', 'ceiling_light', 'window', 'door'].includes(catLower);

  const boxColor = selected 
    ? '#6366f1' 
    : hovered 
      ? (isEstimated ? '#f43f5e' : '#818cf8') 
      : (object.color || (isEstimated ? '#fda4af' : '#06b6d4'));

  const lineRef = useRef();
  useEffect(() => {
    if (lineRef.current) {
      lineRef.current.computeLineDistances();
    }
  }, [w, h, d]);

  // Object base approach:
  // group position is set to the base of the object: base_position
  const pos = object.box_3d.base_position || [x, viewSettings?.floorHeight || -2, z];
  const rotY = object.box_3d?.rotationY || 0;
  const centerPos = [pos[0], pos[1] + h / 2, pos[2]];

  // For debug output:
  const [x_scene, y_scene, z_scene] = object.converted_center || [x, -y, -z];
  const floorY = viewSettings?.floorHeight || -2;
  const [minX, maxX, minZ, maxZ] = roomBounds || [-5, 5, -5, 5];

  return (
    <group position={centerPos} rotation={[0, rotY, 0]}>
      {/* Red Cube at object origin (Requirement 7) */}
      {viewSettings?.showObjectDebug && (
        <mesh position={[0, -h / 2, 0]} renderOrder={9999}>
          <boxGeometry args={[0.08, 0.08, 0.08]} />
          <meshBasicMaterial color="#ef4444" depthTest={false} transparent opacity={0.95} />
        </mesh>
      )}

      {/* Floor Contact Shadow (Requirement 9) */}
      {isFloorObject && shadowTexture && (
        <mesh position={[0, -h / 2 + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w * 1.2, d * 1.2]} />
          <meshBasicMaterial map={shadowTexture} transparent opacity={object.opacity ? object.opacity * 0.75 : 0.7} depthWrite={false} />
        </mesh>
      )}

      {/* Placeholder model */}
      <group position={[0, 0, 0]}>
        <DetectedPlaceholderModel label={label} size={[w, h, d]} object={object} />
      </group>

      {/* Semi-transparent bounding box */}
      <mesh
        onClick={e => { e.stopPropagation(); onClick(object.id); }}
        onPointerOver={e => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={() => setHovered(false)}
        position={[0, 0, 0]}
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
        <lineSegments position={[0, 0, 0]} ref={lineRef}>
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
        <lineSegments position={[0, 0, 0]}>
          <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
          <lineBasicMaterial color={boxColor} transparent opacity={selected ? 0.9 : 0.55} />
        </lineSegments>
      )}

      {/* Dark thin outline for all objects (Requirement 4) */}
      <lineSegments position={[0, 0, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
        <lineBasicMaterial color="#1a1a1a" transparent opacity={0.45} />
      </lineSegments>

      {/* Floating HTML label (Requirement 7) */}
      {(viewSettings?.showLabels || selected || viewSettings?.showObjectDebug) && (
        <Html
          position={[0, h / 2 + 0.35, 0]}
          center
          distanceFactor={8}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
        {object.isDemo ? (
          <div style={{
            background: selected ? 'rgba(99,102,241,0.92)' : 'rgba(6,182,212,0.88)',
            color: 'white',
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: 11,
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 700,
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            border: `1px solid ${selected ? 'rgba(165,180,252,0.5)' : 'rgba(103,232,249,0.4)'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ textTransform: 'capitalize' }}>{label.replace(/_/g, ' ')}</span>
              {confPct > 0 && (
                <span style={{ fontWeight: 400, opacity: 0.85, fontSize: 10 }}>
                  {confPct}%
                </span>
              )}
            </div>
            {viewSettings?.showObjectDebug && (
              <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.2)', fontSize: '0.68rem', fontWeight: 400, textAlign: 'left', lineHeight: '1.25', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div>Object Name: {label.replace(/_/g, ' ')}</div>
                <div>Floor Y: {floorY.toFixed(3)}</div>
                <div>Object Height: {h.toFixed(3)}</div>
                <div>Final Y: {y.toFixed(3)}</div>
              </div>
            )}
          </div>
        ) : (
          <div style={{
            background: selected 
              ? 'rgba(99,102,241,0.92)' 
              : (isEstimated ? 'rgba(244,63,94,0.85)' : 'rgba(6,182,212,0.88)'),
            color: 'white',
            padding: '4px 10px',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{label}</span>
              <span style={{
                background: object.source === 'heuristic' ? 'rgba(249,115,22,0.9)' : 'rgba(6,182,212,0.9)',
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: '0.6rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontWeight: 800
              }}>
                {object.source === 'heuristic' ? 'HEURISTIC' : 'YOLO'}
              </span>
              <span style={{
                background: category === 'ceiling' 
                  ? 'rgba(236, 72, 153, 0.95)' 
                  : category === 'wall' 
                    ? 'rgba(168, 85, 247, 0.95)' 
                    : 'rgba(59, 130, 246, 0.95)',
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: '0.6rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontWeight: 800
              }}>
                {category}
              </span>
              {object.placement_quality && (
                <span style={{
                  background: object.placement_quality === 'wall-snapped' 
                    ? 'rgba(168,85,247,0.85)' 
                    : object.placement_quality === 'floor-snapped' 
                      ? 'rgba(16,185,129,0.85)' 
                      : 'rgba(0,0,0,0.25)',
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontSize: '0.6rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: 650
                }}>
                  {object.placement_quality.replace('-', ' ')}
                </span>
              )}
              {confPct > 0 && !isEstimated && (
                <span style={{ fontWeight: 400, opacity: 0.85, fontSize: 10 }}>
                  {confPct}%
                </span>
              )}
            </div>
            {viewSettings?.showObjectDebug && (
              <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.2)', fontSize: '0.68rem', fontWeight: 400, textAlign: 'left', lineHeight: '1.25', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div>Object Name: {label}</div>
                <div>Floor Y: {floorY.toFixed(3)}</div>
                <div>Object Height: {h.toFixed(3)}</div>
                <div>Final Y: {y.toFixed(3)}</div>
                <div>BBox 2D Size: {object.bbox_2d ? `[${object.bbox_2d[2] - object.bbox_2d[0]}x${object.bbox_2d[3] - object.bbox_2d[1]}] px` : 'N/A'}</div>
                <div>Est. Size: {object.estimated_size ? `[${object.estimated_size.map(n => n.toFixed(2)).join(', ')}] m` : 'N/A'}</div>
                <div>Final Size: [{w.toFixed(2)}, {h.toFixed(2)}, {d.toFixed(2)}] m</div>
                <div>Scale Source: {object.scale_source || 'estimated_from_point_cloud'}</div>
                <div>Final Position: [{pos.map(n => n.toFixed(2)).join(', ')}]</div>
                <div>Rotation Y: {object.box_3d?.rotationY?.toFixed(2)} rad</div>
                <div>Facing Reason: {object.placement_reason || 'N/A'}</div>
              </div>
            )}
          </div>
        )}
      </Html>
      )}

      {/* Facing Direction Visualizer Arrow */}
      {viewSettings?.showObjectDirections && (
        <group position={[0, -h / 2 + 0.05, 0]}>
          {/* Stem pointing forward (+Z local is forward) */}
          <Line
            points={[[0, 0, 0], [0, 0, d / 2 + 0.6]]}
            color="#10b981"
            lineWidth={3}
          />
          {/* Arrow Head (cone) */}
          <mesh position={[0, 0, d / 2 + 0.6]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.08, 0.2, 8]} />
            <meshBasicMaterial color="#10b981" />
          </mesh>
          {/* Label indicating facing reason */}
          <Html position={[0, 0.1, d / 2 + 0.7]} center distanceFactor={8} zIndexRange={[100, 0]}>
            <div style={{
              background: 'rgba(16, 185, 129, 0.95)',
              color: '#0f1115',
              padding: '2px 6px',
              borderRadius: 4,
              fontSize: '0.65rem',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              boxShadow: '0 2px 6px rgba(16,185,129,0.3)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              {object.placement_reason 
                ? object.placement_reason.replace(/_/g, ' ') 
                : 'oriented'}
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}

// ─── Walk Controls ─────────────────────────────────────────────────────────

function WalkControls({ activeHouse }) {
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
    
    // Save old position in case of collision
    const oldPos = camera.position.clone();
    
    // Calculate potential new position
    const nextPos = camera.position.clone();
    if (keys.current.w) nextPos.addScaledVector(dir, speed);
    if (keys.current.s) nextPos.addScaledVector(dir, -speed);
    if (keys.current.a) nextPos.addScaledVector(right, speed);
    if (keys.current.d) nextPos.addScaledVector(right, -speed);
    if (keys.current.q) nextPos.y += speed;
    if (keys.current.e) nextPos.y -= speed;

    // Boundary check / Collision engine
    let collides = false;

    if (activeHouse && activeHouse.rooms) {
      for (const room of activeHouse.rooms) {
        const offset = room.offset || [0, 0, 0];
        const w = room.room?.dimensions?.width || 5.0;
        const l = room.room?.dimensions?.length || 5.0;
        const h = room.room?.dimensions?.height || 3.0;

        // Calculate absolute room bounds in global coordinates
        const minX = offset[0] - w / 2;
        const maxX = offset[0] + w / 2;
        const minZ = offset[2] - l / 2;
        const maxZ = offset[2] + l / 2;

        // Check if camera is within room height bounds
        const insideY = nextPos.y >= 0 && nextPos.y <= h;
        if (!insideY) continue;

        // Is camera within horizontal boundaries of this room?
        const insideXZ = nextPos.x >= minX && nextPos.x <= maxX && nextPos.z >= minZ && nextPos.z <= maxZ;

        if (insideXZ) {
          const wallMargin = 0.3; // 0.3m margin from wall

          // Check left wall (X = minX)
          if (nextPos.x - minX < wallMargin) {
            // Check if there is an active connection to the left
            const hasLeftConn = activeHouse.connections?.some(conn => {
              const other = activeHouse.rooms.find(r => r.room_id === (conn.from === room.room_id ? conn.to : conn.from));
              return other && other.offset[0] < offset[0] && Math.abs(other.offset[2] - offset[2]) < 2.0;
            });
            const nearDoorZ = Math.abs(nextPos.z - offset[2]) < 1.0; // 1m doorway width
            if (!hasLeftConn || !nearDoorZ) collides = true;
          }

          // Check right wall (X = maxX)
          if (maxX - nextPos.x < wallMargin) {
            const hasRightConn = activeHouse.connections?.some(conn => {
              const other = activeHouse.rooms.find(r => r.room_id === (conn.from === room.room_id ? conn.to : conn.from));
              return other && other.offset[0] > offset[0] && Math.abs(other.offset[2] - offset[2]) < 2.0;
            });
            const nearDoorZ = Math.abs(nextPos.z - offset[2]) < 1.0;
            if (!hasRightConn || !nearDoorZ) collides = true;
          }

          // Check back wall (Z = minZ)
          if (nextPos.z - minZ < wallMargin) {
            const hasBackConn = activeHouse.connections?.some(conn => {
              const other = activeHouse.rooms.find(r => r.room_id === (conn.from === room.room_id ? conn.to : conn.from));
              return other && other.offset[2] < offset[2] && Math.abs(other.offset[0] - offset[0]) < 2.0;
            });
            const nearDoorX = Math.abs(nextPos.x - offset[0]) < 1.0;
            if (!hasBackConn || !nearDoorX) collides = true;
          }

          // Check front wall (Z = maxZ)
          if (maxZ - nextPos.z < wallMargin) {
            const hasFrontConn = activeHouse.connections?.some(conn => {
              const other = activeHouse.rooms.find(r => r.room_id === (conn.from === room.room_id ? conn.to : conn.from));
              return other && other.offset[2] > offset[2] && Math.abs(other.offset[0] - offset[0]) < 2.0;
            });
            const nearDoorX = Math.abs(nextPos.x - offset[0]) < 1.0;
            if (!hasFrontConn || !nearDoorX) collides = true;
          }

          // Check furniture item collisions inside this room
          for (const item of room.furniture || []) {
            if (['Rug', 'PendantLight', 'WallMirror', 'Mirror', 'Painting'].includes(item.type)) continue;

            const itemPos = item.position || [0,0,0];
            const size = item.size || [1,1,1];

            const itemX = offset[0] + itemPos[0];
            const itemY = offset[1] + itemPos[1];
            const itemZ = offset[2] + itemPos[2];

            const itemMargin = 0.25;
            const minFX = itemX - size[0]/2 - itemMargin;
            const maxFX = itemX + size[0]/2 + itemMargin;
            const minFY = itemY - size[1]/2 - itemMargin;
            const maxFY = itemY + size[1]/2 + itemMargin;
            const minFZ = itemZ - size[2]/2 - itemMargin;
            const maxFZ = itemZ + size[2]/2 + itemMargin;

            if (nextPos.x >= minFX && nextPos.x <= maxFX &&
                nextPos.y >= minFY && nextPos.y <= maxFY &&
                nextPos.z >= minFZ && nextPos.z <= maxFZ) {
              collides = true;
              break;
            }
          }
        }
      }
    }

    if (!collides) {
      camera.position.copy(nextPos);
    }

    // Set camera state globally for Minimap coordinate updates
    window.minisceneCameraState = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
      angle: Math.atan2(dir.x, dir.z)
    };
  });

  return <PointerLockControls makeDefault />;
}

// ─── Placed Furniture — fixed TransformControls ────────────────────────────

// ─── Material Presets & Part Types Customization ───────────────────────────
const MATERIAL_PRESETS = {
  fabric: { roughness: 0.9, metalness: 0.0, opacity: 0.95 },
  velvet: { roughness: 0.9, metalness: 0.0, opacity: 0.95 },
  leather: { roughness: 0.5, metalness: 0.05, opacity: 1.0 },
  wood: { roughness: 0.8, metalness: 0.05, opacity: 1.0 },
  metal: { roughness: 0.2, metalness: 0.9, opacity: 1.0 },
  marble: { roughness: 0.1, metalness: 0.1, opacity: 1.0 },
  glass: { roughness: 0.1, metalness: 0.9, opacity: 0.4, transparent: true },
  plastic: { roughness: 0.4, metalness: 0.0, opacity: 0.9 },
  matte: { roughness: 0.8, metalness: 0.0, opacity: 0.95 },
  glossy: { roughness: 0.15, metalness: 0.05, opacity: 1.0 }
};

function getPartType(type, defaultColorHex) {
  if (!defaultColorHex) return 'primary';
  const hex = defaultColorHex.toLowerCase().trim();
  const typeLower = type?.toLowerCase() || '';

  if (typeLower.includes('sofa') || typeLower.includes('armchair')) {
    if (hex === '#1f2937' || hex === '#1a202c') return 'accent'; // legs
    if (hex === '#5a6478') return 'secondary'; // cushions
    return 'primary'; // body / armrests
  }

  if (typeLower.includes('bed')) {
    if (hex === '#f1ece6' || hex === '#f5f0ea') return 'accent'; // pillows
    if (hex === '#e8e0d5' || hex === '#ddd5c8') return 'secondary'; // mattress
    return 'primary'; // frame / headboard
  }

  if (typeLower.includes('table') || typeLower.includes('desk') || typeLower.includes('console')) {
    if (hex === '#a8a29e') return 'accent'; // handles
    if (hex === '#1c1917' || hex === '#57534e' || hex === '#78716c') return 'secondary'; // legs / frame
    return 'primary'; // tabletop
  }

  if (
    typeLower.includes('cabinet') || 
    typeLower.includes('cupboard') || 
    typeLower.includes('bookshelf') || 
    typeLower.includes('stand') || 
    typeLower.includes('refrigerator') || 
    typeLower.includes('oven')
  ) {
    if (hex === '#a8a29e' || hex === '#111111' || hex === '#cbd5e1' || hex === '#0c0a09') return 'accent'; // handles/legs
    if (hex === '#1c1917' || hex === '#44403c' || hex === '#292524' || hex === '#7a4e31' || hex === '#1a1a1a' || hex === '#2d2c2a' || hex === '#60a5fa') return 'secondary'; // shelves/panels/divider
    return 'primary'; // main body
  }

  return 'primary';
}

function HardcodedDemoFurniture({ item, selected, onSelect, onUpdate, transformMode, viewSettings, demoSceneData, onDraggingChange, compareOriginal }) {
  const outerGroupRef = useRef();
  const innerGroupRef = useRef();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (selected && innerGroupRef.current) {
      const timer = setTimeout(() => setReady(true), 0);
      return () => clearTimeout(timer);
    } else {
      setReady(false);
    }
  }, [selected]);

  useEffect(() => {
    if (innerGroupRef.current) {
      const typeLower = item.type?.toLowerCase() || '';
      let categoryColor = '#d6cabc';
      if (typeLower.includes('sofa') || typeLower.includes('armchair')) categoryColor = '#d6cabc';
      else if (typeLower.includes('chair') || typeLower.includes('stool') || typeLower.includes('seat')) categoryColor = '#b77745';
      else if (typeLower.includes('table') || typeLower.includes('desk')) categoryColor = '#f7f3ec';
      else if (typeLower.includes('bed')) categoryColor = '#d8cfc4';
      else if (typeLower.includes('cabinet') || typeLower.includes('cupboard') || typeLower.includes('bookshelf') || typeLower.includes('stand')) categoryColor = '#bfa889';
      else if (typeLower.includes('rug') || typeLower.includes('carpet')) categoryColor = '#b9afa2';
      
      const preset = MATERIAL_PRESETS[item.material] || MATERIAL_PRESETS.matte;
      const opacity = typeof item.opacity === 'number' ? item.opacity : (preset.opacity ?? 0.95);
      const roughness = typeof item.roughness === 'number' ? item.roughness : (preset.roughness ?? 0.8);
      const metalness = typeof item.metalness === 'number' ? item.metalness : (preset.metalness ?? 0.0);
      const transparent = preset.transparent || opacity < 1.0;

      innerGroupRef.current.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = false;
          child.receiveShadow = false;

          if (child.userData.originalColor === undefined) {
            child.userData.originalColor = child.material && child.material.color 
              ? '#' + child.material.color.getHexString() 
              : '#ffffff';
          }

          const partType = getPartType(item.type, child.userData.originalColor);
          let chosenColorHex = item.color || categoryColor || '#ffffff';
          if (partType === 'primary') {
            chosenColorHex = item.primaryColor || item.color || categoryColor || '#ffffff';
          } else if (partType === 'secondary') {
            chosenColorHex = item.secondaryColor || item.color || categoryColor || '#ffffff';
          } else if (partType === 'accent') {
            chosenColorHex = item.accentColor || item.color || categoryColor || '#ffffff';
          }
          const colorObj = new THREE.Color(chosenColorHex);

          let materialToStyle = null;
          if (!child.material) {
            child.material = new THREE.MeshStandardMaterial();
            materialToStyle = child.material;
          } else if (Array.isArray(child.material)) {
            child.material = child.material.map(m => m.clone());
            materialToStyle = child.material;
          } else {
            child.material = child.material.clone();
            materialToStyle = child.material;
          }

          const applyProperties = (mat) => {
            mat.color = colorObj;
            mat.roughness = roughness;
            mat.metalness = metalness;
            mat.opacity = opacity;
            mat.transparent = transparent;
          };

          if (Array.isArray(materialToStyle)) {
            materialToStyle.forEach(applyProperties);
          } else {
            applyProperties(materialToStyle);
          }
        }
      });
    }
  }, [item.color, item.primaryColor, item.secondaryColor, item.accentColor, item.material, item.opacity, item.roughness, item.metalness, item.type]);

  const handleChange = useCallback(() => {
    const g = innerGroupRef.current;
    if (!g) return;
    
    const originalSize = item.size || [1, 1, 1];
    const nextScale = [g.scale.x / originalSize[0], g.scale.y / originalSize[1], g.scale.z / originalSize[2]];

    onUpdate(item.id, {
      position: [g.position.x, g.position.y, g.position.z],
      rotation: [g.rotation.x, g.rotation.y, g.rotation.z],
      scale: nextScale,
    });
  }, [item.id, item.size, onUpdate]);

  const s = item.size || [1, 1, 1];
  const groupScale = [
    s[0] * (item.scale ? item.scale[0] : 1),
    s[1] * (item.scale ? item.scale[1] : 1),
    s[2] * (item.scale ? item.scale[2] : 1)
  ];

  const getModelForHardcoded = () => {
    const labelLower = (item.label || item.name || '').toLowerCase();
    
    if (
      labelLower.includes('kitchen_cabinet') || 
      labelLower.includes('lower_kitchen') || 
      labelLower.includes('base_cabinet') || 
      labelLower.includes('cabinet_main') || 
      labelLower.includes('storage_cabinet') || 
      labelLower.includes('tall_cabinet')
    ) {
      return renderModel('KitchenCabinet');
    }
    if (labelLower.includes('refrigerator') || labelLower.includes('fridge')) {
      return renderModel('Refrigerator');
    }
    if (labelLower.includes('oven')) {
      return renderModel('OvenStack');
    }
    if (labelLower.includes('pendant') || labelLower.includes('chandelier')) {
      return renderModel('PendantLight');
    }
    if (labelLower.includes('rug') || labelLower.includes('carpet')) {
      return renderModel('Rug');
    }
    if (labelLower.includes('mirror')) {
      return renderModel('WallMirror');
    }
    if (labelLower.includes('painting') || labelLower.includes('art')) {
      return renderModel('Painting');
    }
    if (labelLower.includes('sofa') || labelLower.includes('couch') || labelLower.includes('bench')) {
      return renderModel('Sofa');
    }
    if (labelLower.includes('table') || labelLower.includes('desk')) {
      return renderModel('Table');
    }
    if (labelLower.includes('chair') || labelLower.includes('stool')) {
      return renderModel('Chair');
    }
    if (labelLower.includes('cupboard') || (labelLower.includes('cabinet') && !labelLower.includes('kitchen') && !labelLower.includes('display'))) {
      return renderModel('Cupboard');
    }
    if (labelLower.includes('display_cabinet') || (labelLower.includes('display') && labelLower.includes('cabinet'))) {
      return renderModel('DisplayCabinet');
    }

    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial 
          color={item.color || "#b9aa97"} 
          roughness={0.7} 
          transparent={item.opacity < 1.0}
          opacity={item.opacity !== undefined ? item.opacity : 1.0}
        />
      </mesh>
    );
  };

  const innerMesh = (
    <group
      ref={innerGroupRef}
      name={`hardcoded-furniture-${item.id}`}
      position={item.position || [0, 0, 0]}
      rotation={item.rotation || [0, 0, 0]}
      scale={groupScale}
      onClick={e => {
        if (compareOriginal) return;
        e.stopPropagation();
        onSelect(item.id);
      }}
    >
      <group scale={[1, 1, 1]} position={[0, -0.5, 0]}>
        {getModelForHardcoded()}
      </group>
      {selected && !compareOriginal && (
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(1.01, 1.01, 1.01)]} />
          <lineBasicMaterial color="#06b6d4" linewidth={2} depthWrite={false} transparent opacity={0.8} />
        </lineSegments>
      )}
    </group>
  );

  return (
    <group ref={outerGroupRef}>
      {selected && ready && innerGroupRef.current && !compareOriginal && (
        <TransformControls
          object={innerGroupRef.current}
          mode={transformMode || 'translate'}
          onMouseUp={handleChange}
          onDraggingChange={(e) => {
            if (onDraggingChange) {
              onDraggingChange(!!e.value);
            }
          }}
        />
      )}
      {innerMesh}
    </group>
  );
}

function DetectedFurniture({ item, selected, onSelect, onUpdate, transformMode, viewSettings, onDraggingChange, compareOriginal }) {
  const outerGroupRef = useRef();
  const innerGroupRef = useRef();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (selected && innerGroupRef.current) {
      const timer = setTimeout(() => setReady(true), 0);
      return () => clearTimeout(timer);
    } else {
      setReady(false);
    }
  }, [selected]);

  useEffect(() => {
    if (innerGroupRef.current) {
      const typeLower = item.type?.toLowerCase() || '';
      let categoryColor = '#d6cabc';
      if (typeLower.includes('sofa') || typeLower.includes('armchair')) categoryColor = '#d6cabc';
      else if (typeLower.includes('chair') || typeLower.includes('stool') || typeLower.includes('seat')) categoryColor = '#b77745';
      else if (typeLower.includes('table') || typeLower.includes('desk')) categoryColor = '#f7f3ec';
      else if (typeLower.includes('bed')) categoryColor = '#d8cfc4';
      else if (typeLower.includes('cabinet') || typeLower.includes('cupboard') || typeLower.includes('bookshelf') || typeLower.includes('stand')) categoryColor = '#bfa889';
      else if (typeLower.includes('rug') || typeLower.includes('carpet')) categoryColor = '#b9afa2';
      
      const preset = MATERIAL_PRESETS[item.material] || MATERIAL_PRESETS.matte;
      const opacity = typeof item.opacity === 'number' ? item.opacity : (preset.opacity ?? 0.95);
      const roughness = typeof item.roughness === 'number' ? item.roughness : (preset.roughness ?? 0.8);
      const metalness = typeof item.metalness === 'number' ? item.metalness : (preset.metalness ?? 0.0);
      const transparent = preset.transparent || opacity < 1.0;

      innerGroupRef.current.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = false;
          child.receiveShadow = false;

          if (child.userData.originalColor === undefined) {
            child.userData.originalColor = child.material && child.material.color 
              ? '#' + child.material.color.getHexString() 
              : '#ffffff';
          }

          const partType = getPartType(item.type, child.userData.originalColor);
          let chosenColorHex = item.color || categoryColor || '#ffffff';
          if (partType === 'primary') {
            chosenColorHex = item.primaryColor || item.color || categoryColor || '#ffffff';
          } else if (partType === 'secondary') {
            chosenColorHex = item.secondaryColor || item.color || categoryColor || '#ffffff';
          } else if (partType === 'accent') {
            chosenColorHex = item.accentColor || item.color || categoryColor || '#ffffff';
          }
          const colorObj = new THREE.Color(chosenColorHex);

          let materialToStyle = null;
          if (!child.material) {
            child.material = new THREE.MeshStandardMaterial();
            materialToStyle = child.material;
          } else if (Array.isArray(child.material)) {
            child.material = child.material.map(m => m.clone());
            materialToStyle = child.material;
          } else {
            child.material = child.material.clone();
            materialToStyle = child.material;
          }

          const applyProperties = (mat) => {
            mat.color = colorObj;
            mat.roughness = roughness;
            mat.metalness = metalness;
            mat.opacity = opacity;
            mat.transparent = transparent;
          };

          if (Array.isArray(materialToStyle)) {
            materialToStyle.forEach(applyProperties);
          } else {
            applyProperties(materialToStyle);
          }
        }
      });
    }
  }, [item.color, item.primaryColor, item.secondaryColor, item.accentColor, item.material, item.opacity, item.roughness, item.metalness, item.type]);

  const getModelScaleAndOffset = () => {
    const type = item.type;
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

  const { scale: modelScale, offset: modelOffset } = getModelScaleAndOffset();
  const s = item.size || [1, 1, 1];
  const groupScale = [s[0] * (item.scale ? item.scale[0] : 1), s[1] * (item.scale ? item.scale[1] : 1), s[2] * (item.scale ? item.scale[2] : 1)];

  const handleChange = useCallback(() => {
    const g = innerGroupRef.current;
    if (!g) return;
    
    let y = g.position.y;
    let x = g.position.x;
    let z = g.position.z;
    const FLOOR_Y = viewSettings?.floorHeight || -2;
    const height = g.scale.y;
    
    const originalSize = item.size || [1, 1, 1];
    const nextScale = [g.scale.x / originalSize[0], g.scale.y / originalSize[1], g.scale.z / originalSize[2]];
    
    if (item.type === 'Rug') {
      y = FLOOR_Y + 0.01;
    } else if (isPlacedFloorFurniture(item.type)) {
      y = FLOOR_Y + height / 2;
    }
    
    onUpdate(item.id, {
      position: [x, y, z],
      rotation: [g.rotation.x, g.rotation.y, g.rotation.z],
      scale: nextScale,
    });
  }, [item.id, item.type, item.size, onUpdate, viewSettings]);

  const innerMesh = (
    <group
      ref={innerGroupRef}
      name={`detected-furniture-${item.id}`}
      position={item.position || [0, 0, 0]}
      rotation={item.rotation || [0, 0, 0]}
      scale={groupScale}
      onClick={e => {
        if (compareOriginal) return;
        e.stopPropagation();
        onSelect(item.id);
      }}
    >
      <group scale={modelScale} position={modelOffset}>
        {renderModel(item.type)}
      </group>
      {selected && !compareOriginal && (
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(1.01, 1.01, 1.01)]} />
          <lineBasicMaterial color="#06b6d4" linewidth={2} depthWrite={false} transparent opacity={0.8} />
        </lineSegments>
      )}
    </group>
  );

  return (
    <group ref={outerGroupRef}>
      {selected && ready && innerGroupRef.current && !compareOriginal && (
        <TransformControls
          object={innerGroupRef.current}
          mode={transformMode || 'translate'}
          onMouseUp={handleChange}
          onDraggingChange={(e) => {
            if (onDraggingChange) {
              onDraggingChange(!!e.value);
            }
          }}
        />
      )}
      {innerMesh}
    </group>
  );
}

function PlacedFurniture({ item, selected, onSelect, onUpdate, transformMode, isHardcodedDemo, viewSettings, demoSceneData, onDraggingChange, compareOriginal }) {
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

  useEffect(() => {
    if (innerGroupRef.current) {
      const typeLower = item.type?.toLowerCase() || '';
      let categoryColor = '#d6cabc';
      if (typeLower.includes('sofa') || typeLower.includes('armchair')) categoryColor = '#d6cabc';
      else if (typeLower.includes('chair') || typeLower.includes('stool') || typeLower.includes('seat')) categoryColor = '#b77745';
      else if (typeLower.includes('table') || typeLower.includes('desk')) categoryColor = '#f7f3ec';
      else if (typeLower.includes('bed')) categoryColor = '#d8cfc4';
      else if (typeLower.includes('cabinet') || typeLower.includes('cupboard') || typeLower.includes('bookshelf') || typeLower.includes('stand')) categoryColor = '#bfa889';
      else if (typeLower.includes('rug') || typeLower.includes('carpet')) categoryColor = '#b9afa2';
      
      const preset = MATERIAL_PRESETS[item.material] || MATERIAL_PRESETS.matte;
      const opacity = typeof item.opacity === 'number' ? item.opacity : (preset.opacity ?? 0.95);
      const roughness = typeof item.roughness === 'number' ? item.roughness : (preset.roughness ?? 0.8);
      const metalness = typeof item.metalness === 'number' ? item.metalness : (preset.metalness ?? 0.0);
      const transparent = preset.transparent || opacity < 1.0;

      innerGroupRef.current.traverse((child) => {
        if (child.isMesh) {
          // Disable shadows temporarily on added furniture to prevent black screen issues (Requirement 8)
          child.castShadow = false;
          child.receiveShadow = false;

          // Stash original default color in userData for consistent part classification
          if (child.userData.originalColor === undefined) {
            child.userData.originalColor = child.material && child.material.color 
              ? '#' + child.material.color.getHexString() 
              : '#ffffff';
          }

          const partType = getPartType(item.type, child.userData.originalColor);
          let chosenColorHex = item.color || categoryColor || '#ffffff';
          if (partType === 'primary') {
            chosenColorHex = item.primaryColor || item.color || categoryColor || '#ffffff';
          } else if (partType === 'secondary') {
            chosenColorHex = item.secondaryColor || item.color || categoryColor || '#ffffff';
          } else if (partType === 'accent') {
            chosenColorHex = item.accentColor || item.color || categoryColor || '#ffffff';
          }
          const colorObj = new THREE.Color(chosenColorHex);

          let materialToStyle = null;
          // Safe material fallback (Requirement 2)
          if (!child.material) {
            child.material = new THREE.MeshStandardMaterial();
            materialToStyle = child.material;
          } else if (Array.isArray(child.material)) {
            // Always clone material first, never mutate directly (Requirement 1)
            child.material = child.material.map(m => m.clone());
            materialToStyle = child.material;
          } else {
            // Always clone material first, never mutate directly (Requirement 1)
            child.material = child.material.clone();
            materialToStyle = child.material;
          }

          const applyProperties = (mat) => {
            mat.color = colorObj;
            mat.roughness = roughness;
            mat.metalness = metalness;
            mat.opacity = opacity;
            mat.transparent = transparent;
          };

          if (Array.isArray(materialToStyle)) {
            materialToStyle.forEach(applyProperties);
          } else {
            applyProperties(materialToStyle);
          }
        }
      });
    }
  }, [item.color, item.primaryColor, item.secondaryColor, item.accentColor, item.material, item.opacity, item.roughness, item.metalness, item.type]);

  const getModelScaleAndOffset = () => {
    const type = item.type;
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

  const { scale: modelScale, offset: modelOffset } = getModelScaleAndOffset();
  const s = item.size || [1, 1, 1];
  const groupScale = [s[0] * (item.scale ? item.scale[0] : 1), s[1] * (item.scale ? item.scale[1] : 1), s[2] * (item.scale ? item.scale[2] : 1)];

  const handleChange = useCallback(() => {
    const g = innerGroupRef.current;
    if (!g) return;
    
    let y = g.position.y;
    let x = g.position.x;
    let z = g.position.z;
    const FLOOR_Y = isHardcodedDemo ? 0 : (viewSettings?.floorHeight || -2);
    const height = g.scale.y;
    
    const originalSize = item.size || [1, 1, 1];
    const nextScale = [g.scale.x / originalSize[0], g.scale.y / originalSize[1], g.scale.z / originalSize[2]];
    
    if (isHardcodedDemo && demoSceneData?.scene_type === 'scratch' && demoSceneData?.room?.dimensions) {
      const roomW = demoSceneData.room.dimensions.width;
      const roomL = demoSceneData.room.dimensions.length;
      const roomH = demoSceneData.room.dimensions.height;
      
      const scaledW = originalSize[0] * nextScale[0];
      const scaledH = originalSize[1] * nextScale[1];
      const scaledD = originalSize[2] * nextScale[2];
      
      // Clamp boundaries
      const minX = -roomW / 2 + scaledW / 2;
      const maxX = roomW / 2 - scaledW / 2;
      if (maxX > minX) {
        x = Math.max(minX, Math.min(maxX, x));
      } else {
        x = 0;
      }
      
      const minZ = -roomL / 2 + scaledD / 2;
      const maxZ = roomL / 2 - scaledD / 2;
      if (maxZ > minZ) {
        z = Math.max(minZ, Math.min(maxZ, z));
      } else {
        z = 0;
      }
      
      // Ground Y position
      if (item.placementType === 'ceiling' || item.type === 'PendantLight') {
        y = roomH - scaledH / 2;
      } else if (item.placementType === 'rug' || item.type === 'Rug') {
        y = 0.01;
      } else if (item.placementType === 'wall' || item.type === 'Mirror' || item.type === 'Painting') {
        y = Math.max(scaledH / 2, Math.min(roomH - scaledH / 2, y));
        
        // Nearest wall snapping
        const distLeft = Math.abs(x - (-roomW / 2));
        const distRight = Math.abs(x - (roomW / 2));
        const distBack = Math.abs(z - (-roomL / 2));
        const minDist = Math.min(distLeft, distRight, distBack);
        
        if (minDist === distLeft) {
          x = -roomW / 2 + scaledW / 2;
          g.rotation.set(0, Math.PI / 2, 0);
        } else if (minDist === distRight) {
          x = roomW / 2 - scaledW / 2;
          g.rotation.set(0, -Math.PI / 2, 0);
        } else {
          z = -roomL / 2 + scaledD / 2;
          g.rotation.set(0, 0, 0);
        }
      } else {
        y = scaledH / 2;
      }
    } else {
      if (item.type === 'Rug') {
        y = FLOOR_Y + 0.01;
      } else if (isPlacedFloorFurniture(item.type)) {
        y = FLOOR_Y + height / 2;
      }
    }
    
    onUpdate(item.id, {
      position: [x, y, z],
      rotation: [g.rotation.x, g.rotation.y, g.rotation.z],
      scale: nextScale,
    });
  }, [item.id, item.type, item.size, item.placementType, onUpdate, isHardcodedDemo, viewSettings, demoSceneData]);

  const innerMesh = (
    <group
      ref={innerGroupRef}
      name={`placed-furniture-${item.id}`}
      position={item.position || [0, 0, 0]}
      rotation={item.rotation || [0, 0, 0]}
      scale={groupScale}
      onClick={e => {
        if (compareOriginal) return;
        e.stopPropagation();
        onSelect(item.id);
      }}
    >
      <group scale={modelScale} position={modelOffset}>
        {renderModel(item.type)}
      </group>
      {selected && !compareOriginal && (
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(1.01, 1.01, 1.01)]} />
          <lineBasicMaterial color="#06b6d4" linewidth={2} depthWrite={false} transparent opacity={0.8} />
        </lineSegments>
      )}
    </group>
  );

  return (
    <group ref={outerGroupRef}>
      {selected && ready && innerGroupRef.current && !compareOriginal && (
        <TransformControls
          object={innerGroupRef.current}
          mode={transformMode || 'translate'}
          onMouseUp={handleChange}
          onDraggingChange={(e) => {
            if (onDraggingChange) {
              onDraggingChange(!!e.value);
            }
          }}
        />
      )}
      {innerMesh}
    </group>
  );
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
  const lastStatsRef = useRef(null);
  const lastFitTriggerRef = useRef(null);

  useEffect(() => {
    if (!stats) return;
    if (lastStatsRef.current === stats && lastFitTriggerRef.current === fitTrigger) {
      return;
    }
    camera.position.set(0, 3.5, 9);
    camera.lookAt(0, 0, 0);
    if (controls) { controls.target.set(0, 0, 0); controls.update(); }
    lastStatsRef.current = stats;
    lastFitTriggerRef.current = fitTrigger;
  }, [stats, fitTrigger, camera, controls]);
  return null;
}

function DemoCameraController({ isHardcodedDemo, cameraStart }) {
  const { camera, controls } = useThree();
  const lastKeyRef = useRef(null);

  useEffect(() => {
    if (!isHardcodedDemo || !cameraStart) return;
    const key = JSON.stringify(cameraStart);
    if (lastKeyRef.current === key) {
      return;
    }
    const pos = cameraStart.position || [0, 1.6, 5.7];
    const target = cameraStart.target || [0, 1.1, -1.2];
    const fov = cameraStart.fov || 58;
    camera.position.set(pos[0], pos[1], pos[2]);
    camera.fov = fov;
    camera.updateProjectionMatrix();
    if (controls) {
      controls.target.set(target[0], target[1], target[2]);
      controls.update();
    }
    lastKeyRef.current = key;
  }, [isHardcodedDemo, cameraStart, camera, controls]);
  return null;
}

function HouseCameraController({ activeHouse, cameraMode }) {
  const { camera, controls } = useThree();
  const targetPos = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());
  const activeRoomIdRef = useRef(null);

  useEffect(() => {
    if (!activeHouse || cameraMode !== 'orbit') return;
    const activeRoomId = activeHouse.currentRoomId;
    
    if (activeRoomId === 'whole_house') {
      let minX = Infinity, maxX = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;

      activeHouse.rooms.forEach(room => {
        const offset = room.offset || [0, 0, 0];
        const w = room.room?.dimensions?.width || 5.0;
        const l = room.room?.dimensions?.length || 5.0;
        
        if (offset[0] - w / 2 < minX) minX = offset[0] - w / 2;
        if (offset[0] + w / 2 > maxX) maxX = offset[0] + w / 2;
        if (offset[2] - l / 2 < minZ) minZ = offset[2] - l / 2;
        if (offset[2] + l / 2 > maxZ) maxZ = offset[2] + l / 2;
      });

      const centerX = (minX + maxX) / 2;
      const centerZ = (minZ + maxZ) / 2;
      const sizeX = maxX - minX;
      const sizeZ = maxZ - minZ;
      const maxDim = Math.max(sizeX, sizeZ) || 10;

      targetLookAt.current.set(centerX, 0, centerZ);
      targetPos.current.set(centerX, maxDim * 0.9 + 3, centerZ + maxDim * 1.1);
    } else {
      const room = activeHouse.rooms.find(r => r.room_id === activeRoomId);
      if (room) {
        const offset = room.offset || [0, 0, 0];
        const dimensions = room.room?.dimensions || { width: 6.0, length: 6.0, height: 3.0 };
        
        targetLookAt.current.set(offset[0], dimensions.height / 2, offset[2]);
        targetPos.current.set(offset[0], dimensions.height + 2.5, offset[2] + dimensions.length * 1.1 + 1.5);
      }
    }

    if (activeRoomIdRef.current === null) {
      camera.position.copy(targetPos.current);
      if (controls) {
        controls.target.copy(targetLookAt.current);
        controls.update();
      }
    }
    
    activeRoomIdRef.current = activeRoomId;
  }, [activeHouse, activeHouse?.currentRoomId, cameraMode, camera, controls]);

  useFrame(() => {
    if (!activeHouse || cameraMode !== 'orbit' || activeRoomIdRef.current === null) return;
    
    const lerpSpeed = 0.05;
    camera.position.lerp(targetPos.current, lerpSpeed);
    
    if (controls) {
      controls.target.lerp(targetLookAt.current, lerpSpeed);
      controls.update();
    }
  });

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

// ─── Wall Snap Helper ───────────────────────────────────────────────────────
function snapToWall(obj, room) {
  const wall = obj.wall || obj.placement_wall;

  if (wall === "right") {
    obj.position[0] = room.width / 2 - obj.size[0] / 2;
    obj.rotation_y = -Math.PI / 2;
  }

  if (wall === "left") {
    obj.position[0] = -room.width / 2 + obj.size[0] / 2;
    obj.rotation_y = Math.PI / 2;
  }

  if (wall === "back") {
    obj.position[2] = -room.length / 2 + obj.size[2] / 2;
    obj.rotation_y = 0;
  }

  return obj;
}

const FURNITURE_HEIGHTS = {
  Sofa: 0.9,
  Armchair: 1.22,
  Bed: 1.15,
  KingBed: 1.25,
  Chair: 1.16,
  Table: 0.78,
  Desk: 0.785,
  SideTable: 0.57,
  Cupboard: 2.0,
  Bookshelf: 2.0,
  TVStand: 0.6,
  Plant: 1.06,
  Decoration: 0.62,
  Rug: 0.012,
  Mirror: 1.76,
  Painting: 1.525,
  Light: 1.61,
  PendantLight: 1.97
};

function isPlacedFloorFurniture(type) {
  return !['Mirror', 'Painting', 'PendantLight'].includes(type);
}

// ─── Add Furniture Auditor (Urgent Debug) ──────────────────────────────────
function AddFurnitureAuditor({ placedItems, selectedId }) {
  const { scene, camera, gl, controls } = useThree();
  const prevCountRef = useRef(0);

  useEffect(() => {
    const count = placedItems ? placedItems.length : 0;
    const prevCount = prevCountRef.current;

    if (count !== prevCount) {
      console.log("ADD FURNITURE START");
      console.log({
        placedFurnitureCount: count,
        selectedObject: selectedId,
        sceneBackground: scene.background,
        environment: scene.environment,
        cameraPosition: [camera.position.x, camera.position.y, camera.position.z],
        controlsTarget: controls ? [controls.target.x, controls.target.y, controls.target.z] : null
      });

      // Check lights (Step 2)
      scene.traverse((obj) => {
        if (obj.isLight) {
          console.log(
            "LIGHT",
            obj.type,
            obj.intensity,
            obj.visible
          );
        }
      });

      // Check environment (Step 7)
      console.log("scene.environment", scene.environment);
      console.log("scene.background", scene.background);

      // Check renderer (Step 8)
      console.log("renderer.toneMappingExposure", gl.toneMappingExposure);
      console.log("renderer.toneMapping", gl.toneMapping);
      console.log("renderer.outputColorSpace", gl.outputColorSpace);

      console.log("ADD FURNITURE END");
    }

    prevCountRef.current = count;
  }, [placedItems, selectedId, scene, camera, gl, controls]);

  return null;
}

// ─── Camera Stabilizer (Requirement 3 & 4) ──────────────────────────────────
function CameraStabilizer({ placedItems }) {
  const { camera, controls } = useThree();
  const prevLengthRef = useRef(0);
  const savedCamPosRef = useRef(new THREE.Vector3());
  const savedTargetRef = useRef(new THREE.Vector3());

  useFrame(() => {
    if (camera && (!placedItems || placedItems.length === prevLengthRef.current)) {
      savedCamPosRef.current.copy(camera.position);
      if (controls) {
        savedTargetRef.current.copy(controls.target);
      }
    }
  });

  useEffect(() => {
    const currentLength = placedItems ? placedItems.length : 0;
    
    if (currentLength > prevLengthRef.current && prevLengthRef.current > 0) {
      const latestItem = placedItems[placedItems.length - 1];
      if (latestItem && latestItem.position) {
        camera.position.copy(savedCamPosRef.current);
        if (controls) {
          controls.target.copy(savedTargetRef.current);
        }

        const itemPos = new THREE.Vector3(...latestItem.position);
        const camToItem = new THREE.Vector3().copy(camera.position).sub(itemPos);
        const distance = camToItem.length();
        const minDistance = 2.0;

        if (distance < minDistance) {
          const pushDirection = camToItem.lengthSq() > 0.001 
            ? camToItem.normalize() 
            : new THREE.Vector3(0, 0.5, 1).normalize();
          
          camera.position.copy(itemPos).addScaledVector(pushDirection, minDistance);
          
          if (controls) {
            controls.target.copy(savedTargetRef.current);
          }
        }
        
        if (controls) {
          controls.update();
        }
      }
    }
    
    prevLengthRef.current = currentLength;
  }, [placedItems, camera, controls]);

  return null;
}

// ─── Debug Overlay (Requirement 7) ──────────────────────────────────────────
function DebugOverlay({ placedItems, selectedId }) {
  const { camera, controls } = useThree();
  const [tick, setTick] = useState(0);

  useFrame(() => {
    setTick(t => t + 1);
  });

  const camPosStr = `[${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)}]`;
  const targetStr = controls 
    ? `[${controls.target.x.toFixed(2)}, ${controls.target.y.toFixed(2)}, ${controls.target.z.toFixed(2)}]`
    : 'N/A';
  
  const selectedItem = placedItems?.find(p => p.id === selectedId);
  const selectedName = selectedItem ? selectedItem.name : 'None';
  const selectedPosStr = selectedItem && selectedItem.position 
    ? `[${selectedItem.position[0].toFixed(2)}, ${selectedItem.position[1].toFixed(2)}, ${selectedItem.position[2].toFixed(2)}]`
    : 'N/A';

  return (
    <Html style={{ position: 'absolute', top: 16, right: 16, pointerEvents: 'none', userSelect: 'none' }}>
      <div style={{
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        color: '#f8fafc',
        padding: '10px 12px',
        borderRadius: '8px',
        fontSize: '11px',
        fontFamily: 'monospace',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
        width: '220px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}>
        <div><strong>Camera:</strong> {camPosStr}</div>
        <div><strong>Target:</strong> {targetStr}</div>
        <div><strong>Selected:</strong> {selectedName}</div>
        <div><strong>Position:</strong> {selectedPosStr}</div>
      </div>
    </Html>
  );
}

// ─── Setup Renderer (Requirement 5) ─────────────────────────────────────────
function SetupRenderer() {
  const { gl } = useThree();
  useEffect(() => {
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.2;
  }, [gl]);
  return null;
}

// ─── Debug Logger (Requirement 7) ───────────────────────────────────────────
function DebugLogger({ placedItems }) {
  const { scene, gl } = useThree();

  useEffect(() => {
    if (placedItems && placedItems.length > 0) {
      console.log("lights mounted");
      console.log("scene background", scene.background);
      console.log("renderer exposure", gl.toneMappingExposure);
    }
  }, [placedItems, scene, gl]);

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
  roomAnalysis,
  scaleFactor,
  distancePickerObjects,
  isHardcodedDemo,
  demoSceneData,
  showCameraDebug,
  compareOriginal,
  activeHouse,
  presentationMode,
}) {
  useEffect(() => {
    console.log("Scene mounted", pointCloudUrl);
  }, [pointCloudUrl]);

  const [pcStats, setPcStats] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sceneTransform, setSceneTransform] = useState({ position: [0, 0, 0], scale: [1, 1, 1] });
  const shadowTexture = useMemo(() => createRadialShadowTexture(), []);

  const roomBounds = useMemo(() => {
    if (isHardcodedDemo && demoSceneData?.room?.dimensions) {
      const w = demoSceneData.room.dimensions.width || 6.4;
      const d = demoSceneData.room.dimensions.length || 7.2;
      return [-w / 2 * scaleFactor, w / 2 * scaleFactor, -d / 2 * scaleFactor, d / 2 * scaleFactor];
    }
    let minX = -2.5, maxX = 2.5, minZ = -2.5, maxZ = 2.5;
    if (pcStats && pcStats.min && pcStats.max && pcStats.size) {
      const centerX = (pcStats.min.x + pcStats.max.x) / 2;
      const centerZ = (-pcStats.min.z - pcStats.max.z) / 2;
      
      const rawWidth = (pcStats.size.x || 5.0) * 1.15;
      const rawDepth = (pcStats.size.z || 5.0) * 1.15;
      
      const clampedW = Math.max(2.5, Math.min(8.0, rawWidth));
      const clampedD = Math.max(2.5, Math.min(10.0, rawDepth));
      
      minX = centerX - clampedW / 2;
      maxX = centerX + clampedW / 2;
      minZ = centerZ - clampedD / 2;
      maxZ = centerZ + clampedD / 2;
    }
    return [minX * scaleFactor, maxX * scaleFactor, minZ * scaleFactor, maxZ * scaleFactor];
  }, [pcStats, scaleFactor, isHardcodedDemo, demoSceneData]);

  const alignObjectsList = useCallback((list) => {
    const FLOOR_Y = isHardcodedDemo ? 0 : (viewSettings.floorHeight || -2);
    const FLOOR_Y_SCALED = FLOOR_Y * scaleFactor;
    
    const roomHeight = isHardcodedDemo 
      ? (demoSceneData?.room?.dimensions?.height || 3.05) 
      : (pcStats?.size?.y || 3.0);
    const roomHeight_scaled = roomHeight * scaleFactor;

    const [minX, maxX, minZ, maxZ] = roomBounds;

    if (isHardcodedDemo) {
      const roomW = demoSceneData?.room?.dimensions?.width || 6.8;
      const roomD = demoSceneData?.room?.dimensions?.length || 6.2;
      const roomH = demoSceneData?.room?.dimensions?.height || 3.0;

      const leftWallX = -roomW / 2;
      const rightWallX = roomW / 2;
      const frontWallZ = -roomD / 2;
      const backWallZ = roomD / 2;

      // Helper to find against relations recursively
      const getAgainstRelation = (objId) => {
        if (!demoSceneData?.relations) return null;
        const direct = demoSceneData.relations.find(r => r.source === objId && r.relation === 'against');
        if (direct) return direct;
        const parentRel = demoSceneData.relations.find(r => r.source === objId && ['on_top_of', 'above', 'behind', 'inside'].includes(r.relation));
        if (parentRel) {
          return getAgainstRelation(parentRel.target);
        }
        return null;
      };

      return list.map(obj => {
        const roomObj = { width: roomW, length: roomD, height: roomH };
        const clonedObj = {
          ...obj,
          position: obj.position ? [...obj.position] : [0, 0, 0],
          size: obj.size ? [...obj.size] : [1, 1, 1],
          rotation_y: obj.rotation_y !== undefined ? obj.rotation_y : 0
        };
        const snappedObj = snapToWall(clonedObj, roomObj);

        const [w, h, d] = snappedObj.size;
        const raw_pos = snappedObj.position;
        const rotY = snappedObj.rotation_y;

        const cat = (snappedObj.category || snappedObj.placement_category || 'floor').toLowerCase();
        const labelLower = (snappedObj.label || '').toLowerCase();
        
        const isSuspendedOrSurface = ['upper', 'countertop', 'backsplash', 'stove', 'cooktop', 'sink', 'faucet', 'window', 'oven'].some(c => cat.includes(c) || labelLower.includes(c));
        const isFurniture = ['bed', 'sofa', 'chair', 'table', 'wardrobe', 'console', 'cabinet', 'bookshelf', 'rug', 'nightstand', 'stool', 'seating', 'appliance', 'bench'].some(c => cat.includes(c) || labelLower.includes(c)) && !isSuspendedOrSurface;
        
        const isWallMounted = ['wall_art', 'mirror', 'radiator', 'painting', 'curtain', 'wall_light'].includes(cat) || ['wall_art', 'mirror', 'radiator', 'painting', 'curtain', 'wall_light'].some(c => labelLower.includes(c));

        let snapX = raw_pos[0];
        let snapZ = raw_pos[2];

        const wall = snappedObj.wall || snappedObj.placement_wall;
        if (wall) {
          snapX = raw_pos[0];
          snapZ = raw_pos[2];
        } else {
          const againstRel = getAgainstRelation(snappedObj.id);
          if (againstRel) {
            const targetId = againstRel.target.toLowerCase();
            if (targetId.includes('left')) {
              snapX = leftWallX + d / 2;
            } else if (targetId.includes('right')) {
              snapX = rightWallX - d / 2;
            } else if (targetId.includes('front') || (targetId.includes('back') && targetId.includes('window'))) {
              snapZ = frontWallZ + d / 2;
            } else if (targetId.includes('back') || targetId.includes('entrance')) {
              snapZ = backWallZ - d / 2;
            }
          }
        }

        const isRotated90 = Math.abs(Math.abs(rotY) - 1.5708) < 0.1;
        const w_world = isRotated90 ? d : w;
        const d_world = isRotated90 ? w : d;

        const scaledX = snapX * scaleFactor;
        const scaledZ = snapZ * scaleFactor;

        let clampedX = scaledX;
        let clampedZ = scaledZ;
        if (!isWallMounted) {
          clampedX = Math.max(minX + (w_world * scaleFactor) / 2, Math.min(maxX - (w_world * scaleFactor) / 2, scaledX));
          clampedZ = Math.max(minZ + (d_world * scaleFactor) / 2, Math.min(maxZ - (d_world * scaleFactor) / 2, scaledZ));
        }
        
        const scaledW = w * scaleFactor;
        const scaledH = h * scaleFactor;
        const scaledD = d * scaleFactor;

        let finalPosY = FLOOR_Y_SCALED + scaledH / 2;
        let finalBaseY = FLOOR_Y_SCALED;

        if (isWallMounted) {
          finalPosY = FLOOR_Y_SCALED + raw_pos[1] * scaleFactor;
          finalBaseY = finalPosY - scaledH / 2;
        } else if (isFurniture) {
          if (cat.includes('rug') || labelLower.includes('rug')) {
            finalPosY = FLOOR_Y_SCALED + (0.01 * scaleFactor) + scaledH / 2;
            finalBaseY = FLOOR_Y_SCALED + (0.01 * scaleFactor);
          } else {
            finalPosY = FLOOR_Y_SCALED + scaledH / 2;
            finalBaseY = FLOOR_Y_SCALED;
          }
        } else if (labelLower.includes('lamp') && !cat.includes('ceiling') && !labelLower.includes('chandelier') && !labelLower.includes('pendant')) {
          const tableBelow = list.find(other => {
            if (other.id === snappedObj.id) return false;
            const otherCat = (other.category || other.placement_category || '').toLowerCase();
            const otherLabel = (other.label || '').toLowerCase();
            const isTable = otherLabel.includes('table') || otherLabel.includes('nightstand') || otherCat.includes('table') || otherCat.includes('nightstand') || otherLabel.includes('drawer');
            if (!isTable) return false;
            const otherX = other.position ? other.position[0] : 0;
            const otherZ = other.position ? other.position[2] : 0;
            const objX = raw_pos[0];
            const objZ = raw_pos[2];
            const distSq = (otherX - objX) ** 2 + (otherZ - objZ) ** 2;
            return distSq < 0.25;
          });
          if (tableBelow) {
            const tableHeight = tableBelow.size ? tableBelow.size[1] : 0.64;
            const tableTopY = FLOOR_Y_SCALED + tableHeight * scaleFactor;
            finalPosY = tableTopY + scaledH / 2;
            finalBaseY = tableTopY;
          } else {
            const tempY = raw_pos[1];
            finalPosY = FLOOR_Y_SCALED + tempY * scaleFactor;
            finalBaseY = finalPosY - scaledH / 2;
          }
        } else if (cat.includes('wall') || cat.includes('mirror') || cat.includes('painting') || cat.includes('window') || cat.includes('curtain') || labelLower.includes('mirror') || labelLower.includes('painting') || labelLower.includes('window') || labelLower.includes('curtain') || labelLower.includes('tv') || labelLower.includes('screen')) {
          if (labelLower.includes('painting') || labelLower.includes('wall_art') || labelLower.includes('art') || labelLower.includes('artwork')) {
            finalPosY = FLOOR_Y_SCALED + roomHeight_scaled * 0.65;
          } else if (labelLower.includes('tv') || labelLower.includes('screen')) {
            finalPosY = FLOOR_Y_SCALED + 1.4 * scaleFactor;
          } else if (labelLower.includes('mirror')) {
            finalPosY = FLOOR_Y_SCALED + 1.5 * scaleFactor;
          } else {
            const tempY = raw_pos[1];
            finalPosY = FLOOR_Y_SCALED + tempY * scaleFactor;
          }
          finalBaseY = finalPosY - scaledH / 2;
        } else if (cat.includes('ceiling') || labelLower.includes('chandelier') || labelLower.includes('pendant')) {
          if (labelLower.includes('pendant')) {
            finalPosY = FLOOR_Y_SCALED + roomHeight_scaled - 0.25 * scaleFactor;
          } else {
            finalPosY = FLOOR_Y_SCALED + roomHeight_scaled - 0.3 * scaleFactor;
          }
          finalBaseY = finalPosY - scaledH / 2;
        } else {
          const base_y_json = snappedObj.base_position ? snappedObj.base_position[1] : (raw_pos[1] - h / 2);
          finalPosY = FLOOR_Y_SCALED + raw_pos[1] * scaleFactor;
          finalBaseY = FLOOR_Y_SCALED + base_y_json * scaleFactor;
        }

        let validatedPosY = finalPosY;
        let validatedBaseY = finalBaseY;
        let validatedX = clampedX;
        let validatedZ = clampedZ;

        const bottomY = validatedPosY - scaledH / 2;
        if (bottomY < FLOOR_Y_SCALED) {
          validatedPosY += (FLOOR_Y_SCALED - bottomY);
          validatedBaseY = validatedPosY - scaledH / 2;
        }

        const isFloorFurniture = isFurniture && !isSuspendedOrSurface;
        if (isFloorFurniture && !labelLower.includes('rug')) {
          if (validatedBaseY > FLOOR_Y_SCALED + 0.001) {
            validatedBaseY = FLOOR_Y_SCALED;
            validatedPosY = FLOOR_Y_SCALED + scaledH / 2;
          }
        }

        if (!isWallMounted) {
          const halfW = (w_world * scaleFactor) / 2;
          const halfD = (d_world * scaleFactor) / 2;
          if (validatedX - halfW < minX) validatedX = minX + halfW;
          if (validatedX + halfW > maxX) validatedX = maxX - halfW;
          if (validatedZ - halfD < minZ) validatedZ = minZ + halfD;
          if (validatedZ + halfD > maxZ) validatedZ = maxZ - halfD;
        }

        const basePos = [validatedX, validatedBaseY, validatedZ];
        const centerPos = [validatedX, validatedPosY, validatedZ];
        
        return {
          ...snappedObj,
          isDemo: true,
          placement_category: cat,
          box_3d: {
            center: centerPos,
            base_position: basePos,
            size: [scaledW, scaledH, scaledD],
            rotationY: rotY,
          }
        };
      });
    }

    return list.map(obj => {
      const [rawX, rawY, rawZ] = obj.box_3d?.center || [0, 0, 0];
      const [w, h, d] = obj.box_3d?.size || [1, 1, 1];

      let x_scene = rawX;
      let y_scene = -rawY;
      let z_scene = -rawZ;

      const isEstimated = obj.placement_quality === 'estimated';
      if (isEstimated && obj.bbox_2d && pcStats) {
        let maxX2d = 640;
        let maxY2d = 480;
        list.forEach(o => {
          if (o.bbox_2d) {
            const [,, xmax, ymax] = o.bbox_2d;
            if (xmax > maxX2d) maxX2d = xmax;
            if (ymax > maxY2d) maxY2d = ymax;
          }
        });

        const [xmin, ymin, xmax, ymax] = obj.bbox_2d;
        const imgX = (xmin + xmax) / 2;
        const imgY = ymax;

        const normX = imgX / maxX2d;
        const normZ = imgY / maxY2d;

        const roomWidth = maxX - minX;
        const roomDepth = maxZ - minZ;

        x_scene = minX + normX * roomWidth;
        z_scene = minZ + normZ * roomDepth;
      }

      const clampedX = Math.max(minX + (w * scaleFactor) / 2, Math.min(maxX - (w * scaleFactor) / 2, x_scene * scaleFactor));
      const clampedZ = Math.max(minZ + (d * scaleFactor) / 2, Math.min(maxZ - (d * scaleFactor) / 2, z_scene * scaleFactor));

      const scaledW = w * scaleFactor;
      const scaledH = h * scaleFactor;
      const scaledD = d * scaleFactor;

      const labelLower = obj.label?.toLowerCase() || '';
      const isWallObject = ['painting', 'mirror', 'curtain', 'window', 'clock', 'wall art'].includes(labelLower);
      const isWallMountedOrStandingAgainstWall = ['cupboard', 'wardrobe', 'cabinet', 'shelf', 'painting', 'mirror', 'curtain', 'window', 'clock', 'wall art'].includes(labelLower);

      let finalX = clampedX;
      let finalZ = clampedZ;
      let rotationY = obj.rotation_y !== undefined ? obj.rotation_y : 0;

      if (obj.base_position) {
        finalX = obj.base_position[0] * scaleFactor;
        finalZ = -obj.base_position[2] * scaleFactor;
      }

      let finalPosY = FLOOR_Y_SCALED + scaledH / 2;
      let finalBaseY = FLOOR_Y_SCALED;

      const category = obj.placement_category || (isWallObject ? 'wall' : 'floor');
      const cat = category.toLowerCase();
      
      const isSuspendedOrSurface = ['upper', 'countertop', 'backsplash', 'stove', 'cooktop', 'sink', 'faucet', 'window', 'oven'].some(c => cat.includes(c) || labelLower.includes(c));
      const isFurniture = ['bed', 'sofa', 'chair', 'table', 'wardrobe', 'console', 'cabinet', 'bookshelf', 'rug', 'nightstand', 'stool', 'seating', 'appliance', 'bench'].some(c => cat.includes(c) || labelLower.includes(c)) && !isSuspendedOrSurface;

      if (isFurniture) {
        if (cat.includes('rug') || labelLower.includes('rug')) {
          finalPosY = FLOOR_Y_SCALED + (0.01 * scaleFactor) + scaledH / 2;
          finalBaseY = FLOOR_Y_SCALED + (0.01 * scaleFactor);
        } else {
          finalPosY = FLOOR_Y_SCALED + scaledH / 2;
          finalBaseY = FLOOR_Y_SCALED;
        }
      } else if (labelLower.includes('lamp') && !cat.includes('ceiling') && !labelLower.includes('chandelier') && !labelLower.includes('pendant')) {
        const tableBelow = list.find(other => {
          if (other.id === obj.id) return false;
          const otherCat = (other.category || other.placement_category || '').toLowerCase();
          const otherLabel = (other.label || '').toLowerCase();
          const isTable = otherLabel.includes('table') || otherLabel.includes('nightstand') || otherCat.includes('table') || otherCat.includes('nightstand') || otherLabel.includes('drawer');
          if (!isTable) return false;
          const otherX = other.box_3d?.center ? other.box_3d.center[0] : 0;
          const otherZ = other.box_3d?.center ? other.box_3d.center[2] : 0;
          const objX = rawX;
          const objZ = rawZ;
          const distSq = (otherX - objX) ** 2 + (otherZ - objZ) ** 2;
          return distSq < 0.25;
        });
        if (tableBelow) {
          const tableHeight = tableBelow.box_3d?.size ? tableBelow.box_3d.size[1] : 0.64;
          const tableTopY = FLOOR_Y_SCALED + tableHeight * scaleFactor;
          finalPosY = tableTopY + scaledH / 2;
          finalBaseY = tableTopY;
        } else {
          const tempY = obj.position_world ? -obj.position_world[1] : y_scene;
          finalPosY = FLOOR_Y_SCALED + tempY * scaleFactor;
          finalBaseY = finalPosY - scaledH / 2;
        }
      } else if (cat.includes('wall') || cat.includes('mirror') || cat.includes('painting') || cat.includes('window') || cat.includes('curtain') || labelLower.includes('mirror') || labelLower.includes('painting') || labelLower.includes('window') || labelLower.includes('curtain') || labelLower.includes('tv') || labelLower.includes('screen')) {
        if (labelLower.includes('painting') || labelLower.includes('wall_art') || labelLower.includes('art')) {
          finalPosY = FLOOR_Y_SCALED + roomHeight_scaled * 0.65;
        } else if (labelLower.includes('tv') || labelLower.includes('screen')) {
          finalPosY = FLOOR_Y_SCALED + 1.4 * scaleFactor;
        } else if (labelLower.includes('mirror')) {
          finalPosY = FLOOR_Y_SCALED + 1.5 * scaleFactor;
        } else {
          const tempY = obj.position_world ? -obj.position_world[1] : y_scene;
          finalPosY = Math.max(FLOOR_Y_SCALED + 1.2 * scaleFactor, Math.min(FLOOR_Y_SCALED + 1.8 * scaleFactor, tempY * scaleFactor));
        }
        finalBaseY = finalPosY - scaledH / 2;
      } else if (cat.includes('ceiling') || labelLower.includes('chandelier') || labelLower.includes('pendant')) {
        if (labelLower.includes('pendant')) {
          finalPosY = FLOOR_Y_SCALED + roomHeight_scaled - 0.25 * scaleFactor;
        } else {
          finalPosY = FLOOR_Y_SCALED + roomHeight_scaled - 0.3 * scaleFactor;
        }
        finalBaseY = finalPosY - scaledH / 2;
      } else {
        const tempY = obj.position_world ? -obj.position_world[1] : y_scene;
        finalPosY = FLOOR_Y_SCALED + tempY * scaleFactor;
        finalBaseY = finalPosY - scaledH / 2;
      }

      if (!obj.base_position && isWallMountedOrStandingAgainstWall && !obj.rotation_y) {
        const distToLeft = Math.abs(clampedX - minX);
        const distToRight = Math.abs(clampedX - maxX);
        const distToBack = Math.abs(clampedZ - minZ);
        const distToFront = Math.abs(clampedZ - maxZ);
        const minDist = Math.min(distToLeft, distToRight, distToBack, distToFront);

        if (minDist === distToLeft) {
          finalX = minX + scaledW / 2;
          rotationY = Math.PI / 2;
        } else if (minDist === distToRight) {
          finalX = maxX - scaledW / 2;
          rotationY = -Math.PI / 2;
        } else if (minDist === distToBack) {
          finalZ = minZ + scaledD / 2;
          rotationY = 0;
        } else {
          finalZ = maxZ - scaledD / 2;
          rotationY = Math.PI;
        }
      }

      let validatedPosY = finalPosY;
      let validatedBaseY = finalBaseY;
      const bottom = validatedPosY - scaledH / 2;
      if (bottom < FLOOR_Y_SCALED) {
        validatedPosY += (FLOOR_Y_SCALED - bottom);
        validatedBaseY = validatedPosY - scaledH / 2;
      }

      const rotationY_c = obj.rotation_y !== undefined ? -obj.rotation_y : 0;

      return {
        ...obj,
        placement_category: category,
        raw_center: [rawX, rawY, rawZ],
        converted_center: [x_scene * scaleFactor, y_scene * scaleFactor, z_scene * scaleFactor],
        box_3d: {
          ...obj.box_3d,
          center: [finalX, validatedPosY, finalZ],
          base_position: [finalX, validatedBaseY, finalZ],
          size: [scaledW, scaledH, scaledD],
          rotationY: rotationY_c,
        }
      };
    });
  }, [pcStats, viewSettings.floorHeight, scaleFactor, roomBounds, isHardcodedDemo, demoSceneData]);

  const originalObjects = useMemo(() => {
    return [
      ...objects.map(item => ({
        ...item,
        position: item.originalPosition ? [...item.originalPosition] : item.position,
        rotation: item.originalRotation ? [...item.originalRotation] : item.rotation,
        scale: item.originalScale ? [...item.originalScale] : item.scale,
        color: item.originalColor || item.color,
        material: item.originalMaterial || item.material,
        edited: false
      })),
      ...removedObjects.map(item => ({
        ...item,
        position: item.originalPosition ? [...item.originalPosition] : item.position,
        rotation: item.originalRotation ? [...item.originalRotation] : item.rotation,
        scale: item.originalScale ? [...item.originalScale] : item.scale,
        color: item.originalColor || item.color,
        material: item.originalMaterial || item.material,
        edited: false
      }))
    ];
  }, [objects, removedObjects]);

  const originalAlignedObjects = useMemo(() => {
    return alignObjectsList(originalObjects);
  }, [originalObjects, alignObjectsList]);

  const rawAlignedObjects = useMemo(() => {
    return alignObjectsList(objects);
  }, [objects, alignObjectsList]);

  const currentAlignedObjects = useMemo(() => {
    return objects.map(item => {
      if (item.edited) {
        const [w, h, d] = item.size || [1, 1, 1];
        const [scaleX, scaleY, scaleZ] = item.scale || [1, 1, 1];
        const scaledW = w * scaleX;
        const scaledH = h * scaleY;
        const scaledD = d * scaleZ;
        return {
          ...item,
          placement_category: item.category || 'floor',
          box_3d: {
            center: item.position,
            base_position: [item.position[0], item.position[1] - scaledH / 2, item.position[2]],
            size: [scaledW, scaledH, scaledD],
            rotationY: item.rotation[1],
          }
        };
      } else {
        const aligned = rawAlignedObjects.find(a => a.id === item.id);
        return aligned || item;
      }
    });
  }, [objects, rawAlignedObjects]);

  const activeAlignedObjects = useMemo(() => {
    return compareOriginal ? originalAlignedObjects : currentAlignedObjects;
  }, [compareOriginal, originalAlignedObjects, currentAlignedObjects]);

  const displayedItems = useMemo(() => {
    if (compareOriginal) {
      return originalAlignedObjects.map(obj => ({
        ...obj,
        position: obj.box_3d.center,
        rotation: [0, obj.box_3d.rotationY, 0],
        scale: [1, 1, 1],
        size: obj.box_3d.size,
      }));
    } else {
      const currentDetectedMapped = currentAlignedObjects.map(obj => {
        if (obj.edited) {
          return obj;
        } else {
          return {
            ...obj,
            position: obj.box_3d.center,
            rotation: [0, obj.box_3d.rotationY, 0],
            scale: [1, 1, 1],
            size: obj.box_3d.size,
          };
        }
      });
      return [...currentDetectedMapped, ...placedItems];
    }
  }, [compareOriginal, originalAlignedObjects, currentAlignedObjects, placedItems]);

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
    <Canvas camera={{ position: [0, 3, 9], fov: 58, near: 0.01, far: 1000 }} gl={{ antialias: true, alpha: false, outputColorSpace: THREE.SRGBColorSpace, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }} shadows>
      <SetupRenderer />
      <AddFurnitureAuditor placedItems={placedItems} selectedId={selectedId} />
      <DebugLogger placedItems={placedItems} />
      <CameraStabilizer placedItems={placedItems} />
      {showCameraDebug && !isDragging && !presentationMode && (
        <DebugOverlay placedItems={placedItems} selectedId={selectedId} />
      )}
      <KeyboardHandler selectedId={selectedId} onDelete={onDeleteSelected} onTransformMode={onTransformModeChange} />
      <AutoFitController stats={pcStats} fitTrigger={fitTrigger} />
      <DemoCameraController isHardcodedDemo={isHardcodedDemo} cameraStart={demoSceneData?.camera_start} />
      <HouseCameraController activeHouse={activeHouse} cameraMode={cameraMode} />
      <CameraSetup />
      <color attach="background" args={['#0b0f19']} />
      
      {isHardcodedDemo ? (
        <>
          <ambientLight intensity={0.9} />
          <hemisphereLight intensity={0.75} />
          <directionalLight position={[5, 8, 5]} intensity={1.3} />
        </>
      ) : (
        <>
          <ambientLight intensity={0.5} />
          <directionalLight position={[8, 12, 6]} intensity={1.2} castShadow shadow-mapSize={[2048, 2048]} />
          <directionalLight position={[-6, 8, -4]} intensity={0.4} />
        </>
      )}

      <group position={sceneTransform.position} scale={sceneTransform.scale}>
        {isHardcodedDemo && demoSceneData?.lighting?.fixtures && demoSceneData.lighting.fixtures.map((fixture) => {
          let pos = fixture.position;
          if (!pos && demoSceneData.objects) {
            const obj = demoSceneData.objects.find(o => o.id === fixture.id);
            if (obj) pos = obj.position;
          }
          if (!pos) return null;
          return (
            <pointLight
              key={fixture.id}
              position={pos}
              intensity={fixture.intensity || 1.0}
              color={fixture.color || "#ffffff"}
              distance={8}
              decay={2}
            />
          );
        })}

        {activeHouse ? (
          activeHouse.rooms.map(room => {
            const isCurrentRoom = activeHouse.currentRoomId === 'whole_house' || activeHouse.currentRoomId === room.room_id;
            if (!isCurrentRoom) return null;

            const roomObjects = room.furniture || [];
            const roomPlaced = roomObjects.filter(f => !f.detected);
            
            const alignRoomObjects = (list) => {
              const FLOOR_Y = !room.pointCloudUrl ? 0 : (viewSettings.floorHeight || -2);
              const FLOOR_Y_SCALED = FLOOR_Y * scaleFactor;
              const roomW = room.room.dimensions.width;
              const roomD = room.room.dimensions.length;
              const roomH = room.room.dimensions.height;
              const roomHeight_scaled = roomH * scaleFactor;

              const leftWallX = -roomW / 2;
              const rightWallX = roomW / 2;
              const frontWallZ = -roomD / 2;
              const backWallZ = roomD / 2;

              return list.map(obj => {
                if (obj.edited) {
                  const [w, h, d] = obj.size || [1, 1, 1];
                  const [scaleX, scaleY, scaleZ] = obj.scale || [1, 1, 1];
                  const scaledW = w * scaleX;
                  const scaledH = h * scaleY;
                  const scaledD = d * scaleZ;
                  return {
                    ...obj,
                    placement_category: obj.category || 'floor',
                    box_3d: {
                      center: obj.position,
                      base_position: [obj.position[0], obj.position[1] - scaledH / 2, obj.position[2]],
                      size: [scaledW, scaledH, scaledD],
                      rotationY: obj.rotation[1],
                    }
                  };
                }

                const rawPos = obj.originalPosition || obj.position || [0,0,0];
                const rawSize = obj.size || [1,1,1];
                const rotY = obj.rotation ? obj.rotation[1] : 0;

                const cat = (obj.category || 'floor').toLowerCase();
                const labelLower = (obj.name || obj.label || '').toLowerCase();
                
                const isSuspendedOrSurface = ['upper', 'countertop', 'backsplash', 'stove', 'cooktop', 'sink', 'faucet', 'window', 'oven'].some(c => cat.includes(c) || labelLower.includes(c));
                const isFurniture = ['bed', 'sofa', 'chair', 'table', 'wardrobe', 'console', 'cabinet', 'bookshelf', 'rug', 'nightstand', 'stool', 'seating', 'appliance', 'bench'].some(c => cat.includes(c) || labelLower.includes(c)) && !isSuspendedOrSurface;
                const isWallMounted = ['wall_art', 'mirror', 'radiator', 'painting', 'curtain', 'wall_light'].includes(cat) || ['wall_art', 'mirror', 'radiator', 'painting', 'curtain', 'wall_light'].some(c => labelLower.includes(c));

                let snapX = rawPos[0];
                let snapZ = rawPos[2];

                const wall = obj.wall || obj.placement_wall;
                if (wall) {
                  if (wall === "right") {
                    snapX = roomW / 2 - rawSize[0] / 2;
                  } else if (wall === "left") {
                    snapX = -roomW / 2 + rawSize[0] / 2;
                  } else if (wall === "back") {
                    snapZ = -roomD / 2 + rawSize[2] / 2;
                  }
                }

                const isRotated90 = Math.abs(Math.abs(rotY) - 1.5708) < 0.1;
                const w_world = isRotated90 ? rawSize[2] : rawSize[0];
                const d_world = isRotated90 ? rawSize[0] : rawSize[2];

                let clampedX = snapX * scaleFactor;
                let clampedZ = snapZ * scaleFactor;
                if (!isWallMounted) {
                  clampedX = Math.max(leftWallX * scaleFactor + (w_world * scaleFactor) / 2, Math.min(rightWallX * scaleFactor - (w_world * scaleFactor) / 2, snapX * scaleFactor));
                  clampedZ = Math.max(frontWallZ * scaleFactor + (d_world * scaleFactor) / 2, Math.min(backWallZ * scaleFactor - (d_world * scaleFactor) / 2, snapZ * scaleFactor));
                }
                
                const scaledW = rawSize[0] * scaleFactor;
                const scaledH = rawSize[1] * scaleFactor;
                const scaledD = rawSize[2] * scaleFactor;

                let finalPosY = FLOOR_Y_SCALED + scaledH / 2;
                let finalBaseY = FLOOR_Y_SCALED;

                if (isWallMounted) {
                  finalPosY = FLOOR_Y_SCALED + rawPos[1] * scaleFactor;
                  finalBaseY = finalPosY - scaledH / 2;
                } else if (isFurniture) {
                  if (cat.includes('rug') || labelLower.includes('rug')) {
                    finalPosY = FLOOR_Y_SCALED + (0.01 * scaleFactor) + scaledH / 2;
                    finalBaseY = FLOOR_Y_SCALED + (0.01 * scaleFactor);
                  } else {
                    finalPosY = FLOOR_Y_SCALED + scaledH / 2;
                    finalBaseY = FLOOR_Y_SCALED;
                  }
                } else {
                  finalPosY = FLOOR_Y_SCALED + rawPos[1] * scaleFactor;
                  finalBaseY = finalPosY - scaledH / 2;
                }

                let validatedPosY = finalPosY;
                let validatedBaseY = finalBaseY;
                if (validatedPosY - scaledH / 2 < FLOOR_Y_SCALED) {
                  validatedPosY += (FLOOR_Y_SCALED - (validatedPosY - scaledH / 2));
                  validatedBaseY = validatedPosY - scaledH / 2;
                }

                return {
                  ...obj,
                  placement_category: cat,
                  box_3d: {
                    center: [clampedX, validatedPosY, clampedZ],
                    base_position: [clampedX, validatedBaseY, clampedZ],
                    size: [scaledW, scaledH, scaledD],
                    rotationY: rotY,
                  }
                };
              });
            };

            const activeAlignedRoomObjects = alignRoomObjects(roomObjects);

            const displayedRoomItems = compareOriginal
              ? alignRoomObjects(roomObjects.map(item => ({
                  ...item,
                  position: item.originalPosition || item.position,
                  rotation: item.originalRotation || item.rotation,
                  scale: item.originalScale || item.scale,
                  color: item.originalColor || item.color,
                  material: item.originalMaterial || item.material
                })))
              : activeAlignedRoomObjects;

            return (
              <group key={room.room_id} position={room.offset}>
                <ProxyRoom
                  viewMode={viewSettings.viewMode}
                  wallOpacity={viewSettings.wallOpacity}
                  floorHeight={viewSettings.floorHeight}
                  roomScale={scaleFactor}
                  showGrid={viewSettings.showGrid}
                  showWalls={viewSettings.showWalls}
                  showCeiling={viewSettings.showCeiling}
                  placementMode={placementMode}
                  onSceneClick={(pt) => {
                    if (placementMode) {
                      const [sx, sy, sz] = sceneTransform.scale;
                      const [px, py, pz] = sceneTransform.position;
                      onSceneClick({
                        x: (pt.x - px) / sx,
                        y: (pt.y - py) / sy,
                        z: (pt.z - pz) / sz
                      });
                    }
                  }}
                  pcBounds={room.pcStats}
                  isHardcodedDemo={!room.pointCloudUrl}
                  roomData={room.room}
                />

                {room.pointCloudUrl && (
                  <Suspense fallback={null}>
                    <ErrorBoundary>
                      <PointCloud
                        settings={viewSettings}
                        removedObjects={room.removedObjects || []}
                        repairMode={repairMode}
                        onRepairAnalyticsUpdate={onRepairAnalyticsUpdate}
                        pointCloudUrl={room.pointCloudUrl}
                        onLoad={() => {}}
                        isSceneVisible={isSceneVisible}
                      />
                    </ErrorBoundary>
                  </Suspense>
                )}

                {isSceneVisible && displayedRoomItems.map(item => {
                  const isSelected = selectedId === item.id;
                  const itemProps = {
                    key: item.id,
                    item: {
                      ...item,
                      position: item.box_3d?.center || item.position,
                      rotation: [0, item.box_3d?.rotationY || item.rotation[1], 0],
                      scale: [1, 1, 1],
                      size: item.box_3d?.size || item.size,
                    },
                    selected: compareOriginal ? false : isSelected,
                    onSelect,
                    onUpdate: onUpdatePlacedItem,
                    transformMode,
                    viewSettings,
                    onDraggingChange: setIsDragging,
                    compareOriginal,
                    presentationMode
                  };

                  if (!room.pointCloudUrl && item.detected) {
                    return <HardcodedDemoFurniture {...itemProps} demoSceneData={{ room: room.room }} />;
                  } else if (room.pointCloudUrl && item.detected) {
                    return <DetectedFurniture {...itemProps} />;
                  } else {
                    return <PlacedFurniture {...itemProps} isHardcodedDemo={!room.pointCloudUrl} demoSceneData={{ room: room.room }} />;
                  }
                })}

                {showWalkablePanel && isSceneVisible && (
                  <WalkableOverlay
                    settings={viewSettings}
                    objects={activeAlignedRoomObjects}
                    placedItems={compareOriginal ? [] : roomPlaced}
                    onUpdateAnalytics={onWalkableAnalyticsUpdate}
                  />
                )}

                {isSceneVisible && !presentationMode && (
                  <SemanticOverlay viewMode={viewSettings.viewMode} settings={viewSettings} objects={activeAlignedRoomObjects} placedItems={compareOriginal ? [] : roomPlaced} />
                )}
                
                {isSceneVisible && !presentationMode && (
                  <MeasurementOverlay 
                    objects={activeAlignedRoomObjects} 
                    placedItems={compareOriginal ? [] : roomPlaced} 
                    settings={viewSettings} 
                    visible={showMeasurements} 
                    roomAnalysis={room.roomAnalysis}
                    pcStats={room.pcStats}
                    scaleFactor={scaleFactor}
                    distancePickerObjects={distancePickerObjects}
                  />
                )}
              </group>
            );
          })
        ) : (
          <>
            <ProxyRoom
              viewMode={viewSettings.viewMode}
              wallOpacity={viewSettings.wallOpacity}
              floorHeight={viewSettings.floorHeight}
              roomScale={scaleFactor}
              showGrid={viewSettings.showGrid}
              showWalls={viewSettings.showWalls}
              showCeiling={viewSettings.showCeiling}
              placementMode={placementMode}
              onSceneClick={handleSceneClickInternal}
              pcBounds={pcStats}
              isHardcodedDemo={isHardcodedDemo}
              roomData={demoSceneData?.room}
            />

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

            {isSceneVisible && !presentationMode && (
              <SemanticOverlay viewMode={viewSettings.viewMode} settings={viewSettings} objects={activeAlignedObjects} placedItems={compareOriginal ? [] : placedItems} />
            )}
            
            {isSceneVisible && !presentationMode && (
              <MeasurementOverlay 
                objects={activeAlignedObjects} 
                placedItems={compareOriginal ? [] : placedItems} 
                settings={viewSettings} 
                visible={showMeasurements} 
                roomAnalysis={roomAnalysis}
                pcStats={pcStats}
                scaleFactor={scaleFactor}
                distancePickerObjects={distancePickerObjects}
              />
            )}

            {showWalkablePanel && isSceneVisible && (
              <WalkableOverlay
                settings={viewSettings}
                objects={activeAlignedObjects}
                placedItems={compareOriginal ? [] : placedItems}
                onUpdateAnalytics={onWalkableAnalyticsUpdate}
              />
            )}

            {showAssistantPanel && isSceneVisible && (
              <RecommendationOverlay activeRec={activeHoverRec} settings={viewSettings} objects={activeAlignedObjects} placedItems={compareOriginal ? [] : placedItems} />
            )}

            {showGraphPanel && isSceneVisible && !presentationMode && (
              <GraphOverlay
                objects={activeAlignedObjects}
                placedItems={compareOriginal ? [] : placedItems}
                settings={viewSettings}
                hoverSource={activeGraphSource}
                hoverTarget={activeGraphTarget}
                isHardcodedDemo={isHardcodedDemo}
                relations={demoSceneData?.relations}
                demoSceneData={demoSceneData}
              />
            )}

            {showCVPanel && isSceneVisible && !presentationMode && (
              <CVOverlay settings={viewSettings} pipelineStage={cvStage} currentFrame={cvFrame} />
            )}

            {isSceneVisible && displayedItems.map(item => {
              const itemProps = {
                key: item.id,
                item,
                selected: compareOriginal ? false : (selectedId === item.id),
                onSelect,
                onUpdate: onUpdatePlacedItem,
                transformMode,
                viewSettings,
                onDraggingChange: setIsDragging,
                compareOriginal,
                presentationMode
              };

              if (isHardcodedDemo && item.detected) {
                return <HardcodedDemoFurniture {...itemProps} demoSceneData={demoSceneData} />;
              } else if (!isHardcodedDemo && item.detected) {
                return <DetectedFurniture {...itemProps} />;
              } else {
                return <PlacedFurniture {...itemProps} isHardcodedDemo={isHardcodedDemo} demoSceneData={demoSceneData} />;
              }
            })}
          </>
        )}

        {viewSettings.showGrid && !presentationMode && (
          <gridHelper args={[15, 15, '#06b6d4', '#475569']} position={[0, viewSettings.floorHeight + 0.02, 0]} />
        )}

        {viewSettings?.showObjectDebug && !presentationMode && (
          <group>
            <gridHelper 
              args={[30, 30, '#22c55e', '#22c55e']} 
              position={[0, isHardcodedDemo ? 0.005 : (viewSettings.floorHeight + 0.005), 0]} 
            />
            <gridHelper
              args={[30, 2, '#16a34a', '#16a34a']}
              position={[0, isHardcodedDemo ? 0.006 : (viewSettings.floorHeight + 0.006), 0]}
            />
          </group>
        )}

        {isSceneVisible && (
          <ContactShadows opacity={0.4} scale={12} blur={2.5} far={5} position={[0, viewSettings.floorHeight + 0.01, 0]} />
        )}
        {isSceneVisible && (
          <Environment preset="apartment" />
        )}

        {cameraMode === 'walk' ? (
          <WalkControls activeHouse={activeHouse} />
        ) : (
          <OrbitControls makeDefault dampingFactor={0.06} enableDamping />
        )}
      </group>
    </Canvas>
  );
}
