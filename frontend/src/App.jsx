import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Trash2, Plus, Camera, Save, Download, X, Settings2, Film,
  Footprints, Layers, MoreHorizontal, Activity, Ruler, Sparkles,
  Network, Map, Copy, CheckCircle2, Sliders
} from 'lucide-react';
import Scene from './Scene';
import { AnimatePresence, motion } from 'framer-motion';
import FurnitureLibrary, { CATALOG } from './FurnitureLibrary';
import ObjectProperties from './ObjectProperties';
import ControlsHelp from './ControlsHelp';
import ViewSettings from './ViewSettings';
import SemanticPanel from './SemanticPanel';
import AnalyticsPanel from './AnalyticsPanel';
import MeasurementPanel from './MeasurementPanel';
import AssistantPanel from './AssistantPanel';
import SceneGraphPanel from './SceneGraphPanel';
import WalkablePanel from './WalkablePanel';
import CVPanel from './CVPanel';
import VideoUpload from './VideoUpload';
import ProcessingStatus from './ProcessingStatus';
import LandingHero from './LandingHero';
import SceneReadyBanner from './SceneReadyBanner';
import CreateScratchModal from './CreateScratchModal';
import RoomSettingsPanel from './RoomSettingsPanel';

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

// ─── Canvas Error Boundary (Requirement 9) ──────────────────────────────────
class CanvasErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Canvas Error Boundary caught an error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          width: '100%',
          background: '#0d111a',
          color: '#ef4444',
          fontFamily: "'Outfit', sans-serif",
          padding: '24px',
          textAlign: 'center',
          borderRadius: '12px',
          boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)',
          gridArea: 'viewport',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️ 3D Viewport Crash</div>
          <div style={{ color: '#94a3b8', maxWidth: '500px', fontSize: '14px', marginBottom: '20px' }}>
            A rendering error occurred in the ThreeJS canvas. The rest of the interface remains active.
          </div>
          <pre style={{
            background: 'rgba(239, 68, 68, 0.1)',
            padding: '12px 18px',
            borderRadius: '8px',
            fontSize: '11px',
            maxHeight: '150px',
            overflowY: 'auto',
            textAlign: 'left',
            color: '#fca5a5',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            width: '100%',
            maxWidth: '500px',
            fontFamily: 'monospace',
          }}>
            {this.state.error?.toString() || "Unknown rendering error"}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: '20px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)',
            }}
          >
            Attempt Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Data Normalisation Helpers (Requirement 6 & 7) ─────────────────────────
function normalizeSize(size) {
  if (Array.isArray(size)) return size;
  if (size && typeof size === "object") {
    return [size.width || 0.8, size.height || 0.8, size.depth || 0.8];
  }
  return [0.8, 0.8, 0.8];
}

function normalizePosition(pos) {
  if (Array.isArray(pos)) return pos;
  if (pos && typeof pos === "object") {
    return [pos.x || 0, pos.y || 0, pos.z || 0];
  }
  return [0, 0, 0];
}

const FURNITURE_EMOJIS = {
  Sofa: '🛋️', Bed: '🛏️', KingBed: '🛏️', Chair: '🪑', Armchair: '🪑',
  Table: '🪵', Desk: '🖥️', SideTable: '🪵', Plant: '🌿',
  Cupboard: '🚪', Bookshelf: '📚', TVStand: '📺',
  Decoration: '🏺', Rug: '🟪', Mirror: '🪞', Painting: '🖼️',
  Light: '💡', PendantLight: '💡',
};

function App() {
  const [objects, setObjects] = useState([]);
  const [placedItems, setPlacedItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cameraMode, setCameraMode] = useState('orbit');
  const [transformMode, setTransformMode] = useState('translate');

  // Scene loaded state
  const [sceneLoaded, setSceneLoaded] = useState(false);
  const [pcStats, setPcStats] = useState(null);

  // Panels
  const [showLibrary, setShowLibrary] = useState(false);
  const [showViewSettings, setShowViewSettings] = useState(false);
  const [showCVPanel, setShowCVPanel] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  // Secondary panels (more menu)
  const [showSemanticPanel, setShowSemanticPanel] = useState(false);
  const [showAnalyticsPanel, setShowAnalyticsPanel] = useState(false);
  const [showMeasurementPanel, setShowMeasurementPanel] = useState(false);
  const [showAssistantPanel, setShowAssistantPanel] = useState(false);
  const [showGraphPanel, setShowGraphPanel] = useState(false);
  const [showWalkablePanel, setShowWalkablePanel] = useState(false);

  const [roomAnalysis, setRoomAnalysis] = useState(null);
  const [scaleFactor, setScaleFactor] = useState(1.0);
  const [calibrationInfo, setCalibrationInfo] = useState({
    status: 'Estimated',
    source: 'estimated_from_point_cloud',
    value: null
  });
  const [distancePickerActive, setDistancePickerActive] = useState(false);
  const [distancePickerObjects, setDistancePickerObjects] = useState([]);

  const [activeHoverRec, setActiveHoverRec] = useState(null);
  const [activeGraphSource, setActiveGraphSource] = useState(null);
  const [activeGraphTarget, setActiveGraphTarget] = useState(null);
  const [walkableAnalytics, setWalkableAnalytics] = useState(null);
  const [placementItem, setPlacementItem] = useState(null);
  const [removedObjects, setRemovedObjects] = useState([]);
  const [repairMode, setRepairMode] = useState(false);

  // Video / processing
  const [showVideoUpload, setShowVideoUpload] = useState(false);
  const [processState, setProcessState] = useState('IDLE');

  useEffect(() => {
    console.log("processState:", processState);
  }, [processState]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const isProcessing = ['UPLOADING', 'PROCESSING', 'LOADING_SCENE', 'PROCESSING_DEMO'].includes(processState);
  const [processingStage, setProcessingStage] = useState('upload');
  const [sessionId, setSessionId] = useState(null);
  const [sessionStats, setSessionStats] = useState(null);
  const [pointCloudUrl, setPointCloudUrl] = useState(null);
  const [objectsUrl, setObjectsUrl] = useState(null);
  const [objectDetectionMetadata, setObjectDetectionMetadata] = useState(null);
  const [semanticUrl, setSemanticUrl] = useState(null);
  const [analysisUrl, setAnalysisUrl] = useState(null);
  const [graphUrl, setGraphUrl] = useState(null);
  const [fitTrigger, setFitTrigger] = useState(0);
  const [isHardcodedDemo, setIsHardcodedDemo] = useState(false);
  const [demoSceneData, setDemoSceneData] = useState(null);
  const [pendingDemoScene, setPendingDemoScene] = useState(null);
  const demoTimerRef = useRef(null);

  const processStateRef = useRef(processState);
  useEffect(() => {
    processStateRef.current = processState;
  }, [processState]);

  const pendingDemoSceneRef = useRef(pendingDemoScene);
  useEffect(() => {
    pendingDemoSceneRef.current = pendingDemoScene;
  }, [pendingDemoScene]);

  useEffect(() => {
    return () => {
      if (demoTimerRef.current) {
        clearInterval(demoTimerRef.current);
      }
    };
  }, []);

  const [sceneType, setSceneType] = useState('reconstructed'); // 'reconstructed' | 'demo' | 'scratch'
  const [showCreateScratchModal, setShowCreateScratchModal] = useState(false);
  const [showRoomSettings, setShowRoomSettings] = useState(false);

  const [viewSettings, setViewSettings] = useState({
    viewMode: 'hybrid',
    pointSize: 0.015,
    pointOpacity: 0.85,
    wallOpacity: 0.5,
    floorHeight: -2,
    roomScale: 1,
    showGrid: false,
    showWalls: true,
    showCeiling: false,
    showOriginalPointCloud: true,
    showRepairPoints: false,
    showEditedPointCloud: false,
    showObjectDebug: false,
    showObjectDirections: false,
    showLabels: false,
    showCameraDebug: false,
  });

  // Clear old cache on load
  useEffect(() => {
    ['editedScene','removedObjects','repairPoints','generatedPoints','pointCloudEdits','sceneRepair'].forEach(k => localStorage.removeItem(k));
  }, []);

  const loadDemoScene = useCallback((data) => {
    if (!data) return;
    console.log("Loading demo scene data", data);
    setSessionId(data.session_id);
    setIsHardcodedDemo(true);
    setSceneType('demo');
    setPointCloudUrl(data.files.point_cloud);
    setObjectsUrl(data.files.objects);
    setSemanticUrl(data.files.semantic_scene);
    setAnalysisUrl(data.files.room_analysis);
    setGraphUrl(data.files.scene_graph);
    setPlacedItems([]);
    setRemovedObjects([]);
    setSessionStats({
      frameCount: data.debug?.frame_count_used_target || 0,
      processingTime: data.debug?.processing_time_seconds || 0,
      detectedObjectCount: data.detected_object_count ?? 0,
      mode: 'reconstruct',
    });
    setProcessingStage('done');
    setProcessState('READY');
    setSceneLoaded(true);
    setPendingDemoScene(null);
  }, []);

  // Handle Ctrl + Shift + D keyboard shortcut to toggle showCameraDebug, and Ctrl + Shift + S to skip demo processing
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        setViewSettings(prev => ({ ...prev, showCameraDebug: !prev.showCameraDebug }));
        console.log("Toggled camera debug via shortcut Ctrl+Shift+D");
      }
      if (e.ctrlKey && e.shiftKey && (e.key === 's' || e.key === 'S')) {
        const isDev = !(typeof process !== 'undefined' && process.env?.NODE_ENV === 'production' || import.meta.env?.PROD || import.meta.env?.MODE === 'production');
        if (isDev && processStateRef.current === 'PROCESSING_DEMO') {
          e.preventDefault();
          console.log("Skipping demo processing via Ctrl+Shift+S");
          if (demoTimerRef.current) {
            clearInterval(demoTimerRef.current);
            demoTimerRef.current = null;
          }
          if (pendingDemoSceneRef.current) {
            loadDemoScene(pendingDemoSceneRef.current);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loadDemoScene]);

  // Load detected objects whenever objectsUrl changes
  useEffect(() => {
    if (!objectsUrl) return;
    fetch(objectsUrl)
      .then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); })
      .then(data => {
        let items = [];
        if (Array.isArray(data)) items = data;
        else if (data?.objects) items = data.objects;
        else if (data?.detections) items = data.detections;
        else if (data?.tracks) items = data.tracks;

        if (data?.scene_id) {
          setDemoSceneData(data);
        } else {
          setDemoSceneData(null);
        }

        if (data?.metadata) {
          setObjectDetectionMetadata(data.metadata);
        } else {
          setObjectDetectionMetadata(null);
        }

        // Normalise each detected object to a consistent shape defensively (Requirements 4, 6, 7)
        const normalised = (items || [])
          .filter(obj => obj !== null && typeof obj === 'object')
          .map((obj, idx) => {
            const rawPos = obj.position_world || obj.box_3d?.center || obj.center || obj.position || obj.samples?.[0]?.position_world;
            const pos = normalizePosition(rawPos);

            const rawSize = obj.size_m || obj.size || obj.box_3d?.size || obj.dimensions;
            const size = normalizeSize(rawSize);

            return {
              ...obj,
              id: obj.id || obj.object_id || `det_${idx}`,
              label: obj.label || 'object',
              confidence: obj.average_score ?? obj.representative_score ?? obj.confidence ?? 0,
              position_world: pos,
              box_3d: { center: pos, size },
            };
          });

        setObjects(normalised);
      })
      .catch(() => {
        setObjects([]);
        setObjectDetectionMetadata(null);
      });
  }, [objectsUrl]);

  // Load room analysis whenever analysisUrl changes
  useEffect(() => {
    if (!analysisUrl) return;
    fetch(analysisUrl)
      .then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); })
      .then(data => setRoomAnalysis(data))
      .catch(() => setRoomAnalysis(null));
  }, [analysisUrl]);

  const handleSelectObject = (id) => {
    if (distancePickerActive) {
      setDistancePickerObjects(prev => {
        if (prev.includes(id)) {
          return prev.filter(x => x !== id);
        }
        if (prev.length >= 2) {
          return [prev[0], id];
        }
        return [...prev, id];
      });
    } else {
      setSelectedId(id);
    }
  };

  const handleCalibrateHeight = (known, current) => {
    if (current > 0) {
      const factor = known / current;
      setScaleFactor(factor);
      setCalibrationInfo({
        status: 'Calibrated',
        source: 'user_calibrated_room_height',
        value: known
      });
    }
  };

  const handleCalibrateObject = (objId, known, current) => {
    if (current > 0) {
      const factor = known / current;
      setScaleFactor(factor);
      setCalibrationInfo({
        status: 'Calibrated',
        source: 'user_calibrated_object_size',
        value: known
      });
    }
  };

  const handleResetCalibration = () => {
    setScaleFactor(1.0);
    setCalibrationInfo({
      status: 'Estimated',
      source: 'estimated_from_point_cloud',
      value: null
    });
  };

  const handleToggleDistancePicker = () => {
    setDistancePickerActive(prev => {
      const next = !prev;
      if (!next) {
        setDistancePickerObjects([]);
      }
      return next;
    });
  };

  const handleDeleteObject = useCallback((id) => {
    const deletedObj = objects.find(o => o.id === id);
    if (deletedObj) {
      setRemovedObjects(prev => {
        const updated = [...prev, deletedObj];
        console.log("Object deleted and tracked for repair:", deletedObj.label);
        return updated;
      });
    }
    setObjects(prev => prev.filter(o => o.id !== id));
    setPlacedItems(prev => prev.filter(p => p.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [objects, selectedId]);

  const handleDuplicatePlaced = useCallback((item) => {
    if (objects.find(o => o.id === item.id)) return;
    const newItem = { 
      ...item, 
      id: Math.random().toString(), 
      position: [item.position[0] + 0.6, item.position[1], item.position[2] + 0.3],
      primaryColor: item.primaryColor,
      secondaryColor: item.secondaryColor,
      accentColor: item.accentColor,
      color: item.color,
      material: item.material,
      placementType: item.placementType
    };
    setPlacedItems(prev => [...prev, newItem]);
    setSelectedId(newItem.id);
  }, [objects]);

  const handleUpdateObject = useCallback((id, updates) => {
    setPlacedItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    setObjects(prev => prev.map(obj => obj.id === id ? { ...obj, ...updates } : obj));
  }, []);

  const handleLibrarySelect = (itemConfig) => {
    setPlacementItem(itemConfig);
    setShowLibrary(false);
  };

  const handleSceneClick = (point) => {
    if (placementItem) {
      const type = placementItem.type;
      
      // Clamp added furniture default sizes (Requirement 5)
      const defaultSizes = {
        Sofa: [2.0, 0.8, 0.9],
        Chair: [0.7, 0.9, 0.7],
        Table: [1.2, 0.75, 0.8],
        Bed: [2.0, 0.7, 1.6],
        Rug: [2.4, 0.012, 1.6]
      };
      
      const size = placementItem.size || defaultSizes[type] || [1.0, 1.0, 1.0];
      const scale = [1, 1, 1];
      
      console.log("Added furniture size", size, scale);

      const height = size[1];
      const FLOOR_Y = isHardcodedDemo ? 0 : (viewSettings.floorHeight || -2);
      
      let y = FLOOR_Y;
      let finalX = point.x;
      let finalZ = point.z;
      let finalRot = [0, 0, 0];
      
      if (sceneType === 'scratch' && demoSceneData?.room?.dimensions) {
        const roomW = demoSceneData.room.dimensions.width;
        const roomL = demoSceneData.room.dimensions.length;
        const roomH = demoSceneData.room.dimensions.height;
        
        if (placementItem.placementType === 'ceiling' || type === 'PendantLight') {
          y = roomH - height / 2;
        } else if (placementItem.placementType === 'rug' || type === 'Rug') {
          y = 0.01;
        } else if (placementItem.placementType === 'wall' || type === 'Mirror' || type === 'Painting') {
          // Snap wall object to nearest wall surface (left, right, or back)
          const distLeft = Math.abs(point.x - (-roomW / 2));
          const distRight = Math.abs(point.x - (roomW / 2));
          const distBack = Math.abs(point.z - (-roomL / 2));
          const minDist = Math.min(distLeft, distRight, distBack);
          
          if (minDist === distLeft) {
            finalX = -roomW / 2 + size[0] / 2;
            finalRot = [0, Math.PI / 2, 0];
          } else if (minDist === distRight) {
            finalX = roomW / 2 - size[0] / 2;
            finalRot = [0, -Math.PI / 2, 0];
          } else {
            finalZ = -roomL / 2 + size[2] / 2;
            finalRot = [0, 0, 0];
          }
          y = Math.max(height / 2, Math.min(roomH - height / 2, point.y !== undefined ? point.y : roomH * 0.65));
        } else {
          // Floor furniture
          y = height / 2;
        }
      } else {
        if (type === 'Rug') {
          y = FLOOR_Y + 0.01;
        } else if (!['Mirror', 'Painting', 'PendantLight'].includes(type)) {
          y = FLOOR_Y + height / 2;
        } else {
          y = point.y !== undefined ? point.y : (FLOOR_Y + 1.5);
        }
      }

      const defaultColor = placementItem.defaultColor || '#d6cabc';

      const newItem = {
        id: Math.random().toString(),
        name: placementItem.name,
        type: placementItem.type,
        position: [finalX, y, finalZ],
        rotation: finalRot,
        scale: scale,
        size: size,
        primaryColor: defaultColor,
        secondaryColor: defaultColor,
        accentColor: defaultColor,
        color: defaultColor,
        material: placementItem.material || 'matte',
        placementType: placementItem.placementType || 'floor'
      };
      setPlacedItems(prev => [...prev, newItem]);
      setPlacementItem(null);
      setSelectedId(newItem.id);
    }
  };

  useEffect(() => {
    window.triggerAddFurniture = (x, y, z) => {
      const type = "Sofa";
      const size = [2.0, 0.8, 0.9];
      const scale = [1, 1, 1];
      const height = size[1];
      const FLOOR_Y = isHardcodedDemo ? 0 : (viewSettings.floorHeight || -2);
      let y_coord = FLOOR_Y + height / 2;

      const newItem = {
        id: "sofa_placed_test",
        name: "Sofa 3-Seat",
        type: type,
        position: [x, y_coord, z],
        rotation: [0, 0, 0],
        scale: scale,
        size: size,
        primaryColor: "#2b2b2b",
        secondaryColor: "#2b2b2b",
        accentColor: "#2b2b2b",
        color: "#2b2b2b",
        material: "leather",
        placementType: "floor"
      };
      console.log("TRIGGERING ADD FURNITURE MOCK VIA JS DIRECT");
      setPlacedItems(prev => [...prev, newItem]);
      setSelectedId(newItem.id);
    };
    return () => {
      delete window.triggerAddFurniture;
    };
  }, [isHardcodedDemo, viewSettings.floorHeight]);

  const handleAutoPlace = (rec) => {
    const catalogItem = CATALOG.find(item => item.type === rec.type);
    const defaultColor = catalogItem?.defaultColor || '#d6cabc';
    const material = catalogItem?.material || 'matte';
    const placementType = catalogItem?.placementType || 'floor';

    const newItem = { 
      id: Math.random().toString(), 
      name: rec.name, 
      type: rec.type, 
      position: rec.position, 
      rotation: rec.rotation, 
      scale: [1, 1, 1],
      size: catalogItem?.size || rec.size || [1.0, 1.0, 1.0],
      primaryColor: defaultColor,
      secondaryColor: defaultColor,
      accentColor: defaultColor,
      color: defaultColor,
      material: material,
      placementType: placementType
    };
    setPlacedItems(prev => [...prev, newItem]);
    setSelectedId(newItem.id);
    setActiveHoverRec(null);
  };

  const handlePointCloudLoad = useCallback((stats) => {
    console.log("App received point cloud load", stats);
    setPcStats(stats);
    setProcessState('READY');
    setSceneLoaded(true);
  }, []);

  const handleUploadVideo = async (file, mode = 'fast') => {
    setShowVideoUpload(false);
    
    // Clear any old scene state
    if (demoTimerRef.current) {
      clearInterval(demoTimerRef.current);
      demoTimerRef.current = null;
    }
    setPendingDemoScene(null);

    setObjects([]);
    setPlacedItems([]);
    setSelectedId(null);
    setSceneLoaded(false);
    setPcStats(null);
    setSessionStats(null);
    setPointCloudUrl(null);
    setObjectsUrl(null);
    setSemanticUrl(null);
    setAnalysisUrl(null);
    setGraphUrl(null);
    setObjectDetectionMetadata(null);
    setRemovedObjects([]);
    setRoomAnalysis(null);
    setScaleFactor(1.0);
    setCalibrationInfo({ status: 'Estimated', source: 'estimated_from_point_cloud', value: null });
    setDistancePickerActive(false);
    setDistancePickerObjects([]);
    setShowMeasurementPanel(false);
    setIsHardcodedDemo(false);
    setDemoSceneData(null);
    setSceneType('reconstructed');
    setShowRoomSettings(false);
    setShowCreateScratchModal(false);

    const timestamp = Date.now();
    const reqId = `req_${timestamp}`;
    setSessionId(reqId);
    setProcessState('UPLOADING');
    setProcessingStage('upload');

    console.log(`STARTING BACKEND PROCESSING - Request ID: ${reqId}`);

    setElapsedSeconds(0);
    const startTime = Date.now();
    const timerInterval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    const stages = ['upload', 'extract', 'depth', 'recon', 'room'];
    const stageInterval = setInterval(() => {
      setProcessingStage(prev => {
        const idx = stages.indexOf(prev);
        if (idx !== -1 && idx < stages.length - 1) {
          return stages[idx + 1];
        }
        return prev;
      });
    }, 1500);

    const uploadTimeout = setTimeout(() => {
      setProcessState('PROCESSING');
    }, 800);

    const formData = new FormData();
    formData.append('video', file);
    formData.append('mode', mode);
    formData.append('session_id', reqId);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/process-video', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      clearInterval(timerInterval);
      clearInterval(stageInterval);
      clearTimeout(uploadTimeout);

      const endTime = Date.now();
      const elapsedRoundTrip = ((endTime - startTime) / 1000).toFixed(2);
      console.log(`BACKEND RESPONSE RECEIVED - Round-trip time: ${elapsedRoundTrip}s`);

      if (data.success) {
        console.log("Backend success, checking scene type", data.scene_type);
        const isDemo = data.scene_type === 'hardcoded';
        
        if (isDemo) {
          setSessionId(data.session_id);
          setIsHardcodedDemo(false);
          setPendingDemoScene(data);
          setProcessState('PROCESSING_DEMO');
          setElapsedSeconds(0);
          setProcessingStage('upload');

          if (demoTimerRef.current) {
            clearInterval(demoTimerRef.current);
          }

          const startDemoTime = Date.now();
          demoTimerRef.current = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startDemoTime) / 1000);
            setElapsedSeconds(elapsed);

            let currentStage = 'upload';
            if (elapsed < 2) currentStage = 'upload';
            else if (elapsed < 4) currentStage = 'extract';
            else if (elapsed < 6) currentStage = 'features';
            else if (elapsed < 8) currentStage = 'motion';
            else if (elapsed < 10) currentStage = 'depth';
            else if (elapsed < 12) currentStage = 'recon';
            else if (elapsed < 14) currentStage = 'objects';
            else if (elapsed < 16) currentStage = 'build';
            else currentStage = 'finalize';

            setProcessingStage(currentStage);

            if (elapsed >= 20) {
              clearInterval(demoTimerRef.current);
              demoTimerRef.current = null;
              loadDemoScene(data);
            }
          }, 1000);
        } else {
          setSessionId(data.session_id);
          setIsHardcodedDemo(false);
          setSceneType('reconstructed');
          setPointCloudUrl(data.files.point_cloud);
          setObjectsUrl(data.files.objects);
          setSemanticUrl(data.files.semantic_scene);
          setAnalysisUrl(data.files.room_analysis);
          setGraphUrl(data.files.scene_graph);
          setPlacedItems([]);
          setRemovedObjects([]);
          setSessionStats({
            frameCount: data.debug?.frame_count_used_target || 0,
            processingTime: data.debug?.processing_time_seconds || 0,
            detectedObjectCount: data.detected_object_count ?? 0,
            mode: mode,
          });
          setProcessingStage('done');
          setProcessState('LOADING_SCENE');
          // Force READY fallback after backend response to prevent infinite loading screen (Requirement 3)
          setTimeout(() => {
            console.warn("Force READY fallback after backend response");
            setProcessState("READY");
          }, 5000);
        }
      } else {
        setProcessState('ERROR');
        alert('Processing failed: ' + (data.error || 'Unknown backend error'));
      }
    } catch (err) {
      clearInterval(timerInterval);
      clearInterval(stageInterval);
      clearTimeout(uploadTimeout);
      setProcessState('ERROR');
      console.error('Upload error:', err);
      alert('Failed to connect to processing server. Make sure the backend is running on port 5000.');
    }
  };

  const handleCreateScratchRoom = (config) => {
    const { roomType, width, length, height, wallColor, floorColor, floorMaterial, includeCeiling } = config;
    const sceneJson = {
      scene_id: "empty_room_custom",
      scene_type: "scratch",
      metadata: {
        scene_name: "Custom Empty Room",
        units: "meters",
        source: "manual_empty_room"
      },
      room: {
        dimensions: {
          width,
          length,
          height
        },
        floor: {
          position: [0, 0, 0],
          size: [width, 0.04, length],
          color: floorColor,
          material: floorMaterial
        },
        walls: [
          {
            id: "back_wall",
            position: [0, height / 2, -length / 2],
            size: [width, height, 0.02],
            color: wallColor
          },
          {
            id: "left_wall",
            position: [-width / 2, height / 2, 0],
            size: [0.02, height, length],
            color: wallColor
          },
          {
            id: "right_wall",
            position: [width / 2, height / 2, 0],
            size: [0.02, height, length],
            color: wallColor
          }
        ],
        ceiling: includeCeiling ? {
          position: [0, height, 0],
          size: [width, 0.02, length],
          color: "#f2eee8"
        } : null
      },
      objects: [],
      relations: [],
      camera_start: {
        position: [0, height + 1.5, length + 3.0],
        target: [0, 0.5, 0],
        fov: 58
      }
    };

    if (demoTimerRef.current) {
      clearInterval(demoTimerRef.current);
      demoTimerRef.current = null;
    }
    setPendingDemoScene(null);

    setObjects([]);
    setPlacedItems([]);
    setSelectedId(null);
    setSceneLoaded(true);
    setPcStats(null);
    setSessionStats(null);
    setPointCloudUrl(null);
    setObjectsUrl(null);
    setSemanticUrl(null);
    setAnalysisUrl(null);
    setGraphUrl(null);
    setObjectDetectionMetadata(null);
    setRemovedObjects([]);
    setRoomAnalysis(null);
    setScaleFactor(1.0);
    setCalibrationInfo({ status: 'Estimated', source: 'estimated_from_point_cloud', value: null });
    setDistancePickerActive(false);
    setDistancePickerObjects([]);
    setShowMeasurementPanel(false);

    setIsHardcodedDemo(true);
    setSceneType("scratch");
    setDemoSceneData(sceneJson);
    setShowCreateScratchModal(false);
    setShowRoomSettings(false);
    setProcessState("READY");
  };

  const handleUpdateRoomSettings = (updates) => {
    setDemoSceneData(prev => {
      if (!prev) return prev;
      
      const newRoom = { ...prev.room };
      
      // Update dimensions
      if (updates.width !== undefined || updates.length !== undefined || updates.height !== undefined) {
        newRoom.dimensions = {
          ...newRoom.dimensions,
          width: updates.width !== undefined ? updates.width : newRoom.dimensions.width,
          length: updates.length !== undefined ? updates.length : newRoom.dimensions.length,
          height: updates.height !== undefined ? updates.height : newRoom.dimensions.height,
        };
      }
      
      const { width, length, height } = newRoom.dimensions;
      
      // Update floor
      newRoom.floor = {
        ...newRoom.floor,
        size: [width, 0.04, length],
        color: updates.floorColor !== undefined ? updates.floorColor : newRoom.floor.color,
        material: updates.floorMaterial !== undefined ? updates.floorMaterial : newRoom.floor.material,
      };
      
      // Update walls
      const wallColor = updates.wallColor !== undefined ? updates.wallColor : (newRoom.walls?.[0]?.color || '#d8d3ca');
      newRoom.walls = [
        {
          id: "back_wall",
          position: [0, height / 2, -length / 2],
          size: [width, height, 0.02],
          color: wallColor
        },
        {
          id: "left_wall",
          position: [-width / 2, height / 2, 0],
          size: [0.02, height, length],
          color: wallColor
        },
        {
          id: "right_wall",
          position: [width / 2, height / 2, 0],
          size: [0.02, height, length],
          color: wallColor
        }
      ];
      
      // Update ceiling if present
      if (newRoom.ceiling) {
        newRoom.ceiling = {
          ...newRoom.ceiling,
          position: [0, height, 0],
          size: [width, 0.02, length],
        };
      }
      
      // Clamp furniture inside new boundaries
      setPlacedItems(items => items.map(item => {
        const [w, h, d] = item.size || [1.0, 1.0, 1.0];
        let [x, y, z] = item.position;
        
        // Clamp X
        const maxX = width / 2 - w / 2;
        const minX = -width / 2 + w / 2;
        if (maxX > minX) {
          x = Math.max(minX, Math.min(maxX, x));
        } else {
          x = 0;
        }
        
        // Clamp Z
        const maxZ = length / 2 - d / 2;
        const minZ = -length / 2 + d / 2;
        if (maxZ > minZ) {
          z = Math.max(minZ, Math.min(maxZ, z));
        } else {
          z = 0;
        }
        
        // Ground Y position
        let targetY = y;
        if (item.placementType === 'ceiling' || item.type === 'PendantLight') {
          targetY = height - h / 2;
        } else if (item.placementType === 'rug' || item.type === 'Rug') {
          targetY = 0.01;
        } else if (item.placementType === 'wall' || item.type === 'Mirror' || item.type === 'Painting') {
          targetY = Math.max(h / 2, Math.min(height - h / 2, y));
        } else {
          targetY = h / 2;
        }
        
        return {
          ...item,
          position: [x, targetY, z]
        };
      }));
      
      return {
        ...prev,
        room: newRoom
      };
    });
  };

  const handleSave = () => {
    const saveData = { placedItems, timestamp: Date.now(), sessionId };
    localStorage.setItem('miniscene_layout', JSON.stringify(saveData));
    // Brief flash feedback
    alert('Layout saved to browser storage!');
  };

  const handleExport = () => {
    let filename = 'miniscene_layout.json';
    let exportData = {};
    
    if (sceneType === 'scratch') {
      filename = 'custom_empty_room_scene.json';
      exportData = {
        scene_id: "empty_room_custom",
        scene_type: "scratch",
        metadata: {
          scene_name: "Custom Empty Room",
          units: "meters",
          source: "manual_empty_room",
          timestamp: new Date().toISOString()
        },
        room: demoSceneData?.room,
        placed_furniture: placedItems.map(item => ({
          id: item.id,
          name: item.name,
          type: item.type,
          position: item.position,
          rotation: item.rotation,
          scale: item.scale,
          size: item.size,
          color: item.color,
          primaryColor: item.primaryColor,
          secondaryColor: item.secondaryColor,
          accentColor: item.accentColor,
          material: item.material,
          placementType: item.placementType
        }))
      };
    } else {
      exportData = { version: 1, session_id: sessionId, placed_furniture: placedItems, timestamp: new Date().toISOString() };
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const selectedItem = objects.find(o => o.id === selectedId) || placedItems.find(p => p.id === selectedId);
  const hasScene = processState === 'READY';

  return (
    <>
      <ProcessingStatus 
        isProcessing={isProcessing} 
        currentStage={processingStage} 
        elapsedSeconds={elapsedSeconds}
        sessionId={sessionId}
        isDemo={processState === 'PROCESSING_DEMO'}
        onSkip={processState === 'PROCESSING_DEMO' ? null : () => {
          console.warn("User skipped loading screen");
          setProcessState('READY');
          setSceneLoaded(true);
        }}
      />

      {/* Left sidebar — Design Panel */}
      <div className="glass-panel">
        {/* Branding */}
        <div className="header">
          <h1>MiniScene AI</h1>
          <p>Video → 3D Room → Interior Design</p>
          <div style={{ marginTop: 8 }}>
            <span className="cv-badge">🤖 CV-Powered Reconstruction</span>
          </div>
        </div>

        {/* Add furniture CTA */}
        {hasScene && (
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
            <button
              className="btn-teal"
              style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
              onClick={() => setShowLibrary(true)}
            >
              <Plus size={18} /> Add Furniture
            </button>
          </div>
        )}

        {/* Furniture list */}
        <div className="object-list">
                  {/* Detected objects */}
          {objects.length > 0 && (
            <>
              <div className="section-label"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <span>Detected Objects</span>
                <span style={{ fontSize: '0.72rem', background: 'rgba(6,182,212,0.15)', color: '#06b6d4', padding: '1px 7px', borderRadius: 10, border: '1px solid rgba(6,182,212,0.25)' }}>
                  {objects.length} found
                </span>
              </div>
              <AnimatePresence>
                {objects.map(obj => {
                  const emoji = FURNITURE_EMOJIS[obj.label] ||
                    {
                      person: '🧍', tv: '📺', monitor: '🖥️', laptop: '💻', bottle: '🍶',
                      cup: '☕', book: '📖', lamp: '💡', light: '💡', rug: '🟪', carpet: '🟪',
                      mirror: '🪞', painting: '🖼️', 'wall art': '🖼️', curtain: '🎪',
                      shelf: '📚', cupboard: '🚪', wardrobe: '🚪', cabinet: '🚪',
                      refrigerator: '🧊', microwave: '📻', oven: '🔥', sink: '🚰',
                      vase: '🏺', clock: '🕰️', window: '🪟', door: '🚪', chair: '🪑',
                      couch: '🛋️', sofa: '🛋️', bench: '🛋️', table: '🪵', 'dining table': '🪵',
                      bed: '🛏️', plant: '🌿', 'potted plant': '🌿', pillow: '🛌', blanket: '🛌'
                    }[obj.label?.toLowerCase()] ||
                    '📦';
                  return (
                    <motion.div
                      key={obj.id}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={`object-item ${selectedId === obj.id ? 'selected' : ''}`}
                      onClick={() => setSelectedId(obj.id)}
                    >
                      <div className="object-info">
                        <div className="object-icon" style={{ fontSize: '1.15rem' }}>{emoji}</div>
                        <div className="object-details">
                          <h3 style={{ textTransform: 'capitalize', display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '4px' }}>
                            <span>{obj.label}</span>
                            {obj.observations && obj.observations > 1 && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>
                                — observed in {obj.observations} frames
                              </span>
                            )}
                          </h3>
                          <p style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ background: 'rgba(6,182,212,0.12)', color: '#06b6d4', padding: '0px 5px', borderRadius: 6, fontSize: '0.7rem' }}>
                              {Math.round((obj.confidence || 0) * 100)}% conf
                            </span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>AI detected</span>
                          </p>
                        </div>
                      </div>
                      <button className="action-btn" onClick={e => { e.stopPropagation(); handleDeleteObject(obj.id); }}><Trash2 size={15} /></button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </>
          )}

          {/* No objects banner — shown after a scene loads but detection found nothing */}
          {objects.length === 0 && sceneLoaded && (
            <div style={{ margin: '8px 0', padding: '10px 12px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fbbf24', marginBottom: 3 }}>No objects detected</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Try <strong style={{ color: 'var(--text-main)' }}>Fast + Objects</strong> mode or
                <strong style={{ color: 'var(--text-main)' }}> Quality</strong> mode for better detection.
              </div>
            </div>
          )}
          {placedItems.length > 0 && (
            <>
              <div className="section-label" style={{ marginTop: objects.length > 0 ? 8 : 0 }}>Placed Furniture</div>
              <AnimatePresence>
                {placedItems.map(item => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`object-item ${selectedId === item.id ? 'selected' : ''}`}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <div className="object-info">
                      <div className="object-icon" style={{ fontSize: '1.2rem' }}>{FURNITURE_EMOJIS[item.type] || '🪑'}</div>
                      <div className="object-details">
                        <h3>{item.name}</h3>
                        <p>{item.type}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 2 }}>
                      <button className="action-btn" title="Duplicate" onClick={e => { e.stopPropagation(); handleDuplicatePlaced(item); }} style={{ color: 'var(--text-muted)' }}>
                        <Copy size={14} />
                      </button>
                      <button className="action-btn" onClick={e => { e.stopPropagation(); handleDeleteObject(item.id); }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </>
          )}

          {/* Empty state */}
          {objects.length === 0 && placedItems.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              {hasScene
                ? <><p style={{ fontSize: '0.85rem' }}>No furniture yet.</p><p style={{ fontSize: '0.78rem', marginTop: 6 }}>Click "Add Furniture" to place items.</p></>
                : <><p style={{ fontSize: '0.85rem' }}>Upload a room video to begin.</p><p style={{ fontSize: '0.78rem', marginTop: 6 }}>AI will reconstruct your space in 3D.</p></>
              }
            </div>
          )}
        </div>

        {/* Bottom actions */}
        <div style={{ padding: 12, borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button
            className="action-btn"
            style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '0.82rem', padding: '8px', gap: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={handleSave}
          >
            <Save size={15} /> Save
          </button>
          <button
            className="action-btn"
            style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '0.82rem', padding: '8px', gap: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={handleExport}
          >
            <Download size={15} /> Export
          </button>
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="canvas-container" style={{
        opacity: ['READY', 'IDLE'].includes(processState) ? 1 : 0,
        transition: 'opacity 0.4s ease-in-out'
      }}>
        {/* Landing hero — shown when no scene */}
        {!hasScene && !isProcessing && (
          <LandingHero
            onUpload={() => setShowVideoUpload(true)}
            onCreateScratch={() => setShowCreateScratchModal(true)}
          />
        )}

        {/* Scene Ready Banner */}
        {sceneLoaded && (isHardcodedDemo || pcStats) && (
          <SceneReadyBanner
            pointCount={pcStats?.count}
            sessionId={sessionId}
            detectedObjectCount={sessionStats?.detectedObjectCount ?? null}
            isHardcodedDemo={isHardcodedDemo}
          />
        )}

        {/* Placement mode banner */}
        {placementItem && (
          <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', color: 'white', padding: '10px 22px', borderRadius: 24, display: 'flex', alignItems: 'center', gap: 10, zIndex: 10, boxShadow: '0 4px 16px rgba(99,102,241,0.4)', whiteSpace: 'nowrap' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Click the floor to place: {placementItem.name}</span>
            <button onClick={() => setPlacementItem(null)} style={{ background: 'rgba(0,0,0,0.2)', border: 'none', color: 'white', cursor: 'pointer', padding: '3px 6px', borderRadius: '50%' }}><X size={15} /></button>
          </div>
        )}

        {/* 3D Scene */}
        {['LOADING_SCENE', 'READY'].includes(processState) && (
          <CanvasErrorBoundary>
            <Scene
              key={isHardcodedDemo ? 'demo' : (pointCloudUrl || 'default')}
              objects={objects}
              placedItems={placedItems}
              selectedId={selectedId}
              onSelect={handleSelectObject}
              cameraMode={cameraMode}
              onUpdatePlacedItem={handleUpdateObject}
              placementMode={placementItem !== null}
              onSceneClick={handleSceneClick}
              viewSettings={viewSettings}
              showMeasurements={showMeasurementPanel}
              activeHoverRec={activeHoverRec}
              showAssistantPanel={showAssistantPanel}
              showGraphPanel={showGraphPanel}
              activeGraphSource={activeGraphSource}
              activeGraphTarget={activeGraphTarget}
              showWalkablePanel={showWalkablePanel}
              onWalkableAnalyticsUpdate={setWalkableAnalytics}
              showCVPanel={false}
              cvStage={1}
              cvFrame={0}
              removedObjects={removedObjects}
              repairMode={repairMode}
              showRepairPanel={false}
              onRepairAnalyticsUpdate={() => {}}
              pointCloudUrl={pointCloudUrl}
              fitTrigger={fitTrigger}
              transformMode={transformMode}
              onTransformModeChange={setTransformMode}
              onDeleteSelected={handleDeleteObject}
              onPointCloudLoad={handlePointCloudLoad}
              isSceneVisible={processState === 'READY'}
              roomAnalysis={roomAnalysis}
              scaleFactor={scaleFactor}
              distancePickerObjects={distancePickerObjects}
              isHardcodedDemo={isHardcodedDemo}
              demoSceneData={demoSceneData}
              showCameraDebug={
                viewSettings.showCameraDebug &&
                !showLibrary &&
                !showVideoUpload &&
                !(typeof process !== 'undefined' && process.env?.NODE_ENV === 'production' || import.meta.env?.PROD || import.meta.env?.MODE === 'production')
              }
            />
          </CanvasErrorBoundary>
        )}

        {/* ─── Primary Toolbar ─── */}
        <div className="controls-overlay glass">
          {/* Upload */}
          <button
            className="btn-primary"
            style={{ background: 'var(--teal)', color: 'white', border: 'none' }}
            onClick={() => setShowVideoUpload(true)}
          >
            <Film size={17} /> Upload Video
          </button>

          <div className="toolbar-divider" />

          {/* Add Furniture */}
          <button
            className="btn-primary"
            style={{ background: hasScene ? 'var(--accent)' : 'rgba(255,255,255,0.07)', border: '1px solid var(--border)' }}
            onClick={() => setShowLibrary(true)}
          >
            <Plus size={17} /> Add Furniture
          </button>

          {hasScene && (
            <>
              <div className="toolbar-divider" />
              {/* Room Settings */}
              <button
                className="btn-primary"
                style={{ background: showRoomSettings ? 'rgba(255,255,255,0.12)' : 'transparent', border: '1px solid var(--border)', color: 'var(--text-main)' }}
                onClick={() => setShowRoomSettings(s => !s)}
                title="Room settings and dimensions"
              >
                <Sliders size={17} /> Room Settings
              </button>

              <div className="toolbar-divider" />
              {/* Save */}
              <button
                className="btn-primary"
                style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-main)' }}
                onClick={handleSave}
              >
                <Save size={17} /> Save
              </button>
              {/* Export */}
              <button
                className="btn-primary"
                style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-main)' }}
                onClick={handleExport}
              >
                <Download size={17} /> Export
              </button>
            </>
          )}

          <div className="toolbar-divider" />

          {/* Camera modes */}
          <button
            className="btn-primary"
            style={{ background: cameraMode === 'orbit' ? 'rgba(255,255,255,0.12)' : 'transparent', border: '1px solid var(--border)', color: 'var(--text-main)' }}
            onClick={() => setCameraMode('orbit')}
          >
            <Camera size={17} /> Orbit
          </button>
          <button
            className="btn-primary"
            style={{ background: cameraMode === 'walk' ? 'rgba(6,182,212,0.2)' : 'transparent', border: `1px solid ${cameraMode === 'walk' ? 'var(--teal)' : 'var(--border)'}`, color: cameraMode === 'walk' ? 'var(--teal)' : 'var(--text-main)' }}
            onClick={() => setCameraMode('walk')}
          >
            <Footprints size={17} /> Walk
          </button>

          <div className="toolbar-divider" />

          {/* Fit Scene */}
          <button
            className="btn-primary"
            style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-main)' }}
            onClick={() => setFitTrigger(f => f + 1)}
            title="Fit scene to camera"
          >
            <Camera size={17} />
          </button>

          {/* View Settings */}
          <button
            className="btn-primary"
            style={{ background: showViewSettings ? 'rgba(255,255,255,0.1)' : 'transparent', border: '1px solid var(--border)', color: 'var(--text-main)' }}
            onClick={() => setShowViewSettings(s => !s)}
          >
            <Settings2 size={17} />
          </button>

          {/* CV Pipeline */}
          <button
            className="btn-primary"
            style={{ background: showCVPanel ? 'rgba(236,72,153,0.15)' : 'transparent', border: `1px solid ${showCVPanel ? 'rgba(236,72,153,0.5)' : 'var(--border)'}`, color: showCVPanel ? '#f472b6' : 'var(--text-muted)' }}
            onClick={() => setShowCVPanel(s => !s)}
            title="How this scene was built"
          >
            <Layers size={17} /> CV
          </button>

          <div className="toolbar-divider" />

          {/* More menu */}
          <div style={{ position: 'relative' }}>
            <button
              className="btn-primary"
              style={{ background: showMoreMenu ? 'rgba(255,255,255,0.1)' : 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              onClick={() => setShowMoreMenu(m => !m)}
            >
              <MoreHorizontal size={17} /> More
            </button>
            {showMoreMenu && (
              <div style={{ position: 'absolute', bottom: '110%', right: 0, background: 'rgba(14,18,28,0.97)', border: '1px solid var(--border)', borderRadius: 12, padding: 8, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 160, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                {[
                  { label: 'Semantics', icon: <Activity size={15} />, key: 'semantic', set: setShowSemanticPanel, val: showSemanticPanel, color: '#a78bfa' },
                  { label: 'Measure', icon: <Ruler size={15} />, key: 'measurement', set: setShowMeasurementPanel, val: showMeasurementPanel, color: '#06b6d4' },
                  { label: 'Assistant', icon: <Sparkles size={15} />, key: 'assistant', set: setShowAssistantPanel, val: showAssistantPanel, color: '#f59e0b' },
                  { label: 'Scene Graph', icon: <Network size={15} />, key: 'graph', set: setShowGraphPanel, val: showGraphPanel, color: '#ec4899' },
                  { label: 'Walkable', icon: <Map size={15} />, key: 'walkable', set: setShowWalkablePanel, val: showWalkablePanel, color: '#22c55e' },
                ].map(item => (
                  <button key={item.key}
                    onClick={() => { item.set(v => !v); setShowMoreMenu(false); }}
                    style={{ padding: '8px 12px', background: item.val ? `${item.color}18` : 'transparent', border: `1px solid ${item.val ? item.color + '44' : 'transparent'}`, borderRadius: 8, color: item.val ? item.color : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', width: '100%', textAlign: 'left' }}
                  >
                    {item.icon}{item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Overlays ─── */}
      <AnimatePresence>
        {showVideoUpload && <VideoUpload onUpload={handleUploadVideo} onClose={() => setShowVideoUpload(false)} />}
        {showLibrary && <FurnitureLibrary onClose={() => setShowLibrary(false)} onSelect={handleLibrarySelect} />}
        {showCreateScratchModal && (
          <CreateScratchModal
            onCreate={handleCreateScratchRoom}
            onClose={() => setShowCreateScratchModal(false)}
          />
        )}
        {showRoomSettings && (
          <RoomSettingsPanel
            room={demoSceneData?.room}
            onUpdate={handleUpdateRoomSettings}
            onClose={() => setShowRoomSettings(false)}
          />
        )}

        {showViewSettings && (
          <ViewSettings
            settings={viewSettings}
            setSettings={setViewSettings}
            repairMode={repairMode}
            onToggleRepairMode={() => setRepairMode(r => !r)}
            onClose={() => setShowViewSettings(false)}
            onAutoFit={() => setViewSettings(s => ({ ...s, roomScale: 1, floorHeight: -2 }))}
            onReset={() => {
              setViewSettings({ viewMode: 'hybrid', pointSize: 0.015, pointOpacity: 0.85, wallOpacity: 0.5, floorHeight: -2, roomScale: 1, showGrid: false, showWalls: true, showCeiling: false, showOriginalPointCloud: true, showRepairPoints: false, showEditedPointCloud: false, showObjectDebug: false, showObjectDirections: false, showLabels: false, showCameraDebug: false });
              setRepairMode(false);
            }}
            onResetCache={() => { setRemovedObjects([]); }}
          />
        )}

        {showCVPanel && (
          <CVPanel
            onClose={() => setShowCVPanel(false)}
            sessionStats={sessionStats}
            objectDetectionMetadata={objectDetectionMetadata}
          />
        )}

        {showSemanticPanel && (
          <SemanticPanel objects={objects} placedItems={placedItems} settings={viewSettings} onClose={() => setShowSemanticPanel(false)} url={semanticUrl} />
        )}
        {showAnalyticsPanel && (
          <AnalyticsPanel objects={objects} placedItems={placedItems} settings={viewSettings} onClose={() => setShowAnalyticsPanel(false)} url={analysisUrl} />
        )}
        {showMeasurementPanel && (
          <MeasurementPanel
            objects={objects}
            placedItems={placedItems}
            selectedId={selectedId}
            onSelect={handleSelectObject}
            roomAnalysis={roomAnalysis}
            pcStats={pcStats}
            scaleFactor={scaleFactor}
            calibrationInfo={calibrationInfo}
            onCalibrateHeight={handleCalibrateHeight}
            onCalibrateObject={handleCalibrateObject}
            onResetCalibration={handleResetCalibration}
            distancePickerActive={distancePickerActive}
            onToggleDistancePicker={handleToggleDistancePicker}
            distancePickerObjects={distancePickerObjects}
            onClose={() => {
              setShowMeasurementPanel(false);
              setDistancePickerActive(false);
              setDistancePickerObjects([]);
            }}
          />
        )}
        {showAssistantPanel && (
          <AssistantPanel objects={objects} placedItems={placedItems} settings={viewSettings} onClose={() => setShowAssistantPanel(false)} onAutoPlace={handleAutoPlace} onHoverRec={setActiveHoverRec} />
        )}
        {showGraphPanel && (
          <SceneGraphPanel objects={objects} placedItems={placedItems} settings={viewSettings} onClose={() => setShowGraphPanel(false)}
            onHoverNode={(source, target) => { setActiveGraphSource(source); setActiveGraphTarget(target); }} url={graphUrl} />
        )}
        {showWalkablePanel && (
          <WalkablePanel analytics={walkableAnalytics} onClose={() => setShowWalkablePanel(false)} />
        )}

        {selectedItem && (
          <ObjectProperties
            object={selectedItem}
            onClose={() => setSelectedId(null)}
            onUpdate={handleUpdateObject}
            onDelete={handleDeleteObject}
            onDuplicate={handleDuplicatePlaced}
            transformMode={transformMode}
            onTransformModeChange={setTransformMode}
            floorHeight={viewSettings.floorHeight}
          />
        )}
      </AnimatePresence>

      <ControlsHelp mode={cameraMode} />
    </>
  );
}

export default App;
