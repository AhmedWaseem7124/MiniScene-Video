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
import MultiVideoUpload from './MultiVideoUpload';
import EmptyHouseModal from './EmptyHouseModal';
import FloorPlanPanel from './FloorPlanPanel';
import Minimap from './Minimap';

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
  const [sceneFurniture, setSceneFurniture] = useState([]);
  const objects = sceneFurniture.filter(item => item.detected);
  const placedItems = sceneFurniture.filter(item => !item.detected);

  const [compareOriginal, setCompareOriginal] = useState(false);
  const [replacingObjectId, setReplacingObjectId] = useState(null);
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  const sceneFurnitureRef = useRef([]);
  useEffect(() => {
    sceneFurnitureRef.current = sceneFurniture;
  }, [sceneFurniture]);

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
  const [activeHouse, setActiveHouse] = useState(null);
  const [showMultiVideoUpload, setShowMultiVideoUpload] = useState(false);
  const [showEmptyHouseModal, setShowEmptyHouseModal] = useState(false);
  const [showCreateScratchModal, setShowCreateScratchModal] = useState(false);
  const [isMultiRoom, setIsMultiRoom] = useState(false);
  const [currentView, setCurrentView] = useState('3d'); // '3d' | 'floorplan'
  const [presentationMode, setPresentationMode] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

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
    setSceneFurniture([]);
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

  // Wrap single room inside activeHouse once loaded
  useEffect(() => {
    if (sceneLoaded && !activeHouse && sceneType !== 'house') {
      const roomDim = demoSceneData?.room?.dimensions || { width: 7.5, length: 9.5, height: 3.1 };
      const roomFloor = demoSceneData?.room?.floor || { position: [0,0,0], size: [roomDim.width, 0.04, roomDim.length], color: "#ded3c3", material: "wood" };
      const roomWalls = demoSceneData?.room?.walls || [
        { id: "back_wall", position: [0, roomDim.height/2, -roomDim.length/2], size: [roomDim.width, roomDim.height, 0.04], color: "#b9b1a6" },
        { id: "left_wall", position: [-roomDim.width/2, roomDim.height/2, 0], size: [0.04, roomDim.height, roomDim.length], color: "#c8beb1" },
        { id: "right_wall", position: [roomDim.width/2, roomDim.height/2, 0], size: [0.04, roomDim.height, roomDim.length], color: "#9a7551" }
      ];
      const roomCeiling = demoSceneData?.room?.ceiling || { position: [0, roomDim.height, 0], size: [roomDim.width, 0.04, roomDim.length], color: "#f2eee8" };

      const singleHouse = {
        name: demoSceneData?.metadata?.scene_name || 'Single Room Layout',
        rooms: [
          {
            room_id: 'room_1',
            room_name: 'Single Room',
            offset: [0, 0, 0],
            room: {
              dimensions: roomDim,
              floor: roomFloor,
              walls: roomWalls,
              ceiling: roomCeiling
            },
            furniture: sceneFurniture,
            removedObjects: removedObjects,
            pointCloudUrl,
            pcStats,
            roomAnalysis,
            semanticUrl,
            analysisUrl,
            graphUrl
          }
        ],
        connections: [],
        currentRoomId: 'room_1'
      };
      setActiveHouse(singleHouse);
    }
  }, [sceneLoaded, activeHouse, sceneType, demoSceneData, sceneFurniture, removedObjects, pointCloudUrl, pcStats, roomAnalysis, semanticUrl, graphUrl]);

  // Sync activeHouse room selections to local states
  useEffect(() => {
    if (activeHouse) {
      const activeRoomId = activeHouse.currentRoomId;
      if (activeRoomId === 'whole_house') {
        const allFurniture = activeHouse.rooms.flatMap(r => {
          return (r.furniture || []).map(f => ({
            ...f,
            displayName: `${f.name} (${r.room_name})`
          }));
        });
        setSceneFurniture(allFurniture);
        setPointCloudUrl(null);
      } else {
        const activeRoom = activeHouse.rooms.find(r => r.room_id === activeRoomId);
        if (activeRoom) {
          setSceneFurniture(activeRoom.furniture || []);
          setRemovedObjects(activeRoom.removedObjects || []);
          setPointCloudUrl(activeRoom.pointCloudUrl);
          setPcStats(activeRoom.pcStats);
          setRoomAnalysis(activeRoom.roomAnalysis);
          setSemanticUrl(activeRoom.semanticUrl);
          setAnalysisUrl(activeRoom.analysisUrl);
          setGraphUrl(activeRoom.graphUrl);
          if (activeRoom.room) {
            setDemoSceneData({ room: activeRoom.room });
          }
          setIsHardcodedDemo(!activeRoom.pointCloudUrl);
        }
      }
    }
  }, [activeHouse?.currentRoomId]);

  // Sync local changes back to activeHouse rooms list
  useEffect(() => {
    if (activeHouse && activeHouse.currentRoomId !== 'whole_house') {
      setActiveHouse(prev => {
        if (!prev) return prev;
        const updatedRooms = prev.rooms.map(room => {
          if (room.room_id === prev.currentRoomId) {
            return {
              ...room,
              furniture: sceneFurniture,
              removedObjects: removedObjects
            };
          }
          return room;
        });
        
        // Prevent infinite loops by only updating if there's an actual mismatch
        const activeRoom = prev.rooms.find(r => r.room_id === prev.currentRoomId);
        if (activeRoom && (activeRoom.furniture !== sceneFurniture || activeRoom.removedObjects !== removedObjects)) {
          return { ...prev, rooms: updatedRooms };
        }
        return prev;
      });
    }
  }, [sceneFurniture, removedObjects]);

  const handleUndo = useCallback(() => {
    setHistory(prevHistory => {
      if (prevHistory.length === 0) return prevHistory;
      const previousStateJson = prevHistory[prevHistory.length - 1];
      const nextHistory = prevHistory.slice(0, -1);
      
      setRedoStack(prevRedo => [...prevRedo, JSON.stringify(sceneFurnitureRef.current)]);
      setSceneFurniture(JSON.parse(previousStateJson));
      return nextHistory;
    });
  }, []);

  const handleRedo = useCallback(() => {
    setRedoStack(prevRedo => {
      if (prevRedo.length === 0) return prevRedo;
      const nextStateJson = prevRedo[prevRedo.length - 1];
      const nextRedo = prevRedo.slice(0, -1);
      
      setHistory(prevHistory => [...prevHistory, JSON.stringify(sceneFurnitureRef.current)]);
      setSceneFurniture(JSON.parse(nextStateJson));
      return nextRedo;
    });
  }, []);

  // Handle keyboard shortcuts: Ctrl+Shift+D for camera debug, Ctrl+Shift+S for demo skip, Ctrl+Z for undo, Ctrl+Y for redo
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
      // Ctrl + Z (Undo)
      if (e.ctrlKey && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl + Y (Redo)
      if (e.ctrlKey && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loadDemoScene, handleUndo, handleRedo]);

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

        const mapLabelToModelType = (label) => {
          const l = label.toLowerCase();
          if (l.includes('curtain') || l.includes('blind') || l.includes('rail')) return 'Curtain';
          if (l.includes('king')) return 'KingBed';
          if (l.includes('bed_frame') || l.includes('bedding') || (l.includes('bed') && !l.includes('side'))) return 'Bed';
          if (l.includes('nightstand') || l.includes('bedside') || l.includes('drawer')) return 'BedsideTable';
          if (l.includes('refrigerator') || l.includes('fridge')) return 'Refrigerator';
          if (l.includes('oven')) return 'OvenStack';
          if (l.includes('display_cabinet') || (l.includes('display') && l.includes('cabinet'))) return 'DisplayCabinet';
          if (l.includes('kitchen_cabinet') || l.includes('lower_kitchen') || l.includes('base_cabinet') || l.includes('cabinet_main')) return 'KitchenCabinet';
          if (l.includes('wardrobe')) return 'Wardrobe';
          if (l.includes('console') || l.includes('vanity')) return 'Console';
          if (l.includes('mirror')) return 'WallMirror';
          if (l.includes('pendant') || l.includes('chandelier')) return 'PendantLight';
          if (l.includes('rug') || l.includes('carpet')) return 'Rug';
          if (l.includes('lounge')) return 'Armchair';
          if (l.includes('tv_wall') || l.includes('tv') || l.includes('screen')) return 'TVStand';
          if (l.includes('cabinet') || l.includes('cupboard')) return 'Cupboard';
          if (l.includes('ceiling_light') || l.includes('light') || l.includes('lamp') || l.includes('sconce')) return 'Light';
          if (l.includes('sofa') || l.includes('sectional') || l.includes('chaise')) return 'Sofa';
          if (l.includes('table')) return 'Table';
          if (l.includes('chair') || l.includes('stool') || l.includes('ottoman') || l.includes('seat')) return 'Chair';
          if (l.includes('painting') || l.includes('wall_art') || l.includes('canvas') || l.includes('art') || l.includes('artwork')) return 'Painting';
          if (l.includes('bookshelf')) return 'Bookshelf';
          if (l.includes('plant') || l.includes('potted plant')) return 'Plant';
          if (l.includes('decoration')) return 'Decoration';
          return 'Decoration';
        };

        // Normalise each detected object to a consistent shape defensively (Requirements 4, 6, 7)
        const normalised = (items || [])
          .filter(obj => obj !== null && typeof obj === 'object')
          .map((obj, idx) => {
            const rawPos = obj.position_world || obj.box_3d?.center || obj.center || obj.position || obj.samples?.[0]?.position_world;
            const pos = normalizePosition(rawPos);

            const rawSize = obj.size_m || obj.size || obj.box_3d?.size || obj.dimensions;
            const size = normalizeSize(rawSize);

            const rotationY = obj.rotation_y ?? (Array.isArray(obj.rotation) ? obj.rotation[1] : (obj.rotation?.y ?? 0));
            const scale = Array.isArray(obj.scale) ? obj.scale : [1.0, 1.0, 1.0];
            const modelType = mapLabelToModelType(obj.label || 'object');

            return {
              ...obj,
              id: obj.id || obj.object_id || `det_${idx}`,
              name: obj.name || obj.label || 'Detected Object',
              type: modelType,
              category: obj.placementType || 'floor',
              position: pos,
              rotation: [0, rotationY, 0],
              scale: scale,
              size: size,
              color: obj.color || '#d6cabc',
              material: obj.material || 'matte',
              confidence: obj.average_score ?? obj.representative_score ?? obj.confidence ?? 1.0,
              editable: true,
              detected: true,

              // Backup of original state
              originalPosition: [...pos],
              originalRotation: [0, rotationY, 0],
              originalScale: [...scale],
              originalColor: obj.color || '#d6cabc',
              originalMaterial: obj.material || 'matte'
            };
          });

        setSceneFurniture(normalised);
      })
      .catch(() => {
        setSceneFurniture([]);
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
    setHistory(h => [...h, JSON.stringify(sceneFurnitureRef.current)]);
    setRedoStack([]);

    const deletedObj = sceneFurnitureRef.current.find(o => o.id === id);
    if (deletedObj && deletedObj.detected) {
      setRemovedObjects(prev => {
        const updated = [...prev, deletedObj];
        console.log("Object deleted and tracked for repair:", deletedObj.label);
        return updated;
      });
    }

    setSceneFurniture(prev => prev.filter(item => item.id !== id));
    if (selectedId === id) setSelectedId(null);

    // Sync deletion to activeHouse
    if (activeHouse) {
      setActiveHouse(prev => {
        if (!prev) return prev;
        const updatedRooms = prev.rooms.map(room => {
          const hasFurniture = (room.furniture || []).some(f => f.id === id);
          if (hasFurniture) {
            return {
              ...room,
              furniture: room.furniture.filter(f => f.id !== id),
              removedObjects: deletedObj && deletedObj.detected 
                ? [...(room.removedObjects || []), deletedObj]
                : (room.removedObjects || [])
            };
          }
          return room;
        });
        return { ...prev, rooms: updatedRooms };
      });
    }
  }, [selectedId, activeHouse]);

  const handleDuplicatePlaced = useCallback((item) => {
    if (!item) return;
    const newId = `dup_${Math.random().toString(36).substr(2, 9)}`;
    const newItem = { 
      ...item, 
      id: newId, 
      name: `${item.name || item.type || 'Object'} (Copy)`,
      position: [item.position[0] + 0.5, item.position[1], item.position[2] + 0.5],
      originalPosition: [item.position[0] + 0.5, item.position[1], item.position[2] + 0.5],
      originalRotation: [...item.rotation],
      originalScale: [...item.scale],
      color: item.color,
      material: item.material,
      detected: false
    };

    setHistory(h => [...h, JSON.stringify(sceneFurnitureRef.current)]);
    setRedoStack([]);
    setSceneFurniture(prev => [...prev, newItem]);
    setSelectedId(newItem.id);

    // Sync duplication to activeHouse
    if (activeHouse) {
      setActiveHouse(prev => {
        if (!prev) return prev;
        const activeRoomId = prev.currentRoomId;
        const updatedRooms = prev.rooms.map(room => {
          const isTargetRoom = activeRoomId === 'whole_house' 
            ? (room.furniture || []).some(f => f.id === item.id)
            : room.room_id === activeRoomId;
            
          if (isTargetRoom) {
            return {
              ...room,
              furniture: [...(room.furniture || []), newItem]
            };
          }
          return room;
        });
        return { ...prev, rooms: updatedRooms };
      });
    }
  }, [activeHouse]);

  const handleUpdateObject = useCallback((id, updates) => {
    setHistory(h => [...h, JSON.stringify(sceneFurnitureRef.current)]);
    setRedoStack([]);
    
    // Update local state first
    setSceneFurniture(prev => prev.map(item => item.id === id ? { ...item, ...updates, edited: true } : item));
    
    // Sync to activeHouse
    if (activeHouse) {
      setActiveHouse(prev => {
        if (!prev) return prev;
        const updatedRooms = prev.rooms.map(room => {
          const hasFurniture = (room.furniture || []).some(f => f.id === id);
          if (hasFurniture) {
            return {
              ...room,
              furniture: room.furniture.map(f => f.id === id ? { ...f, ...updates, edited: true } : f)
            };
          }
          return room;
        });
        return { ...prev, rooms: updatedRooms };
      });
    }
  }, [activeHouse]);

  const handleSnapToWall = useCallback((id) => {
    const obj = sceneFurnitureRef.current.find(item => item.id === id);
    if (!obj) return;

    let roomW = 8.0;
    let roomL = 8.0;

    if (isHardcodedDemo && demoSceneData?.room?.dimensions) {
      roomW = demoSceneData.room.dimensions.width;
      roomL = demoSceneData.room.dimensions.length;
    } else if (pcStats?.size) {
      roomW = pcStats.size[0];
      roomL = pcStats.size[2];
    }

    const [w, h, d] = obj.size || [1.0, 1.0, 1.0];
    const [scaleX, scaleY, scaleZ] = obj.scale || [1.0, 1.0, 1.0];
    const scaledW = w * scaleX;
    const scaledD = d * scaleZ;

    const x = obj.position[0];
    const z = obj.position[2];

    const distLeft = Math.abs(x - (-roomW / 2));
    const distRight = Math.abs(x - (roomW / 2));
    const distBack = Math.abs(z - (-roomL / 2));
    const distFront = Math.abs(z - (roomL / 2));

    const minDist = Math.min(distLeft, distRight, distBack, distFront);

    let newX = x;
    let newZ = z;
    let rotY = obj.rotation[1];

    if (minDist === distLeft) {
      newX = -roomW / 2 + scaledW / 2;
      rotY = Math.PI / 2;
    } else if (minDist === distRight) {
      newX = roomW / 2 - scaledW / 2;
      rotY = -Math.PI / 2;
    } else if (minDist === distBack) {
      newZ = -roomL / 2 + scaledD / 2;
      rotY = 0;
    } else {
      newZ = roomL / 2 - scaledD / 2;
      rotY = Math.PI;
    }

    handleUpdateObject(id, {
      position: [newX, obj.position[1], newZ],
      rotation: [0, rotY, 0]
    });
  }, [isHardcodedDemo, demoSceneData, pcStats, handleUpdateObject]);

  const handleResetObject = useCallback((id) => {
    const obj = sceneFurnitureRef.current.find(item => item.id === id);
    if (!obj) return;

    handleUpdateObject(id, {
      position: obj.originalPosition ? [...obj.originalPosition] : [0, 0, 0],
      rotation: obj.originalRotation ? [...obj.originalRotation] : [0, 0, 0],
      scale: obj.originalScale ? [...obj.originalScale] : [1, 1, 1],
      color: obj.originalColor || '#ffffff',
      material: obj.originalMaterial || 'matte'
    });
  }, [handleUpdateObject]);

  const handleLibrarySelect = (itemConfig) => {
    if (replacingObjectId) {
      handleUpdateObject(replacingObjectId, {
        name: itemConfig.name,
        type: itemConfig.type,
        category: itemConfig.category || 'floor',
        size: itemConfig.size,
        primaryColor: itemConfig.defaultColor || '#d6cabc',
        secondaryColor: itemConfig.defaultColor || '#d6cabc',
        accentColor: itemConfig.defaultColor || '#d6cabc',
        color: itemConfig.defaultColor || '#d6cabc',
        material: itemConfig.material || 'matte'
      });
      setReplacingObjectId(null);
    } else {
      setPlacementItem(itemConfig);
    }
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
      let targetRoomId = null;
      let targetRoom = null;

      // Identify which room contains the clicked point
      if (activeHouse) {
        targetRoomId = activeHouse.currentRoomId;
        if (targetRoomId === 'whole_house') {
          const clickedRoom = activeHouse.rooms.find(r => {
            const roomW = r.room.dimensions.width;
            const roomL = r.room.dimensions.length;
            const [rx, ry, rz] = r.offset;
            const minX = rx - roomW / 2;
            const maxX = rx + roomW / 2;
            const minZ = rz - roomL / 2;
            const maxZ = rz + roomL / 2;
            return point.x >= minX && point.x <= maxX && point.z >= minZ && point.z <= maxZ;
          }) || activeHouse.rooms[0];
          
          if (clickedRoom) {
            targetRoomId = clickedRoom.room_id;
          }
        }
        targetRoom = activeHouse.rooms.find(r => r.room_id === targetRoomId);
      }

      // Default room dimensions and offset fallback
      const roomW = targetRoom ? targetRoom.room.dimensions.width : (demoSceneData?.room?.dimensions?.width || 8.0);
      const roomL = targetRoom ? targetRoom.room.dimensions.length : (demoSceneData?.room?.dimensions?.length || 8.0);
      const roomH = targetRoom ? targetRoom.room.dimensions.height : (demoSceneData?.room?.dimensions?.height || 3.0);
      const roomOffset = targetRoom ? targetRoom.offset : [0, 0, 0];

      // Convert global coordinate to room-local coordinates
      const localX = point.x - roomOffset[0];
      const localZ = point.z - roomOffset[2];

      const FLOOR_Y = isHardcodedDemo ? 0 : (viewSettings.floorHeight || -2);
      
      let y = FLOOR_Y;
      let finalX = localX;
      let finalZ = localZ;
      let finalRot = [0, 0, 0];
      
      if ((sceneType === 'scratch' || activeHouse) && roomW && roomL) {
        if (placementItem.placementType === 'ceiling' || type === 'PendantLight') {
          y = roomH - height / 2;
        } else if (placementItem.placementType === 'rug' || type === 'Rug') {
          y = 0.01;
        } else if (placementItem.placementType === 'wall' || type === 'Mirror' || type === 'Painting') {
          // Snap wall object to nearest wall surface (left, right, or back)
          const distLeft = Math.abs(localX - (-roomW / 2));
          const distRight = Math.abs(localX - (roomW / 2));
          const distBack = Math.abs(localZ - (-roomL / 2));
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
          // Floor furniture: clamp to boundaries inside the room
          finalX = Math.max(-roomW / 2 + size[0] / 2, Math.min(roomW / 2 - size[0] / 2, localX));
          finalZ = Math.max(-roomL / 2 + size[2] / 2, Math.min(roomL / 2 - size[2] / 2, localZ));
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
        category: placementItem.category || 'floor',
        position: [finalX, y, finalZ],
        rotation: finalRot,
        scale: scale,
        size: size,
        color: defaultColor,
        primaryColor: defaultColor,
        secondaryColor: defaultColor,
        accentColor: defaultColor,
        material: placementItem.material || 'matte',
        confidence: 1.0,
        editable: true,
        detected: false,
        edited: true, // Bypass CV alignment in alignRoomObjects

        originalPosition: [finalX, y, finalZ],
        originalRotation: finalRot,
        originalScale: scale,
        originalColor: defaultColor,
        originalMaterial: placementItem.material || 'matte'
      };

      setHistory(h => [...h, JSON.stringify(sceneFurnitureRef.current)]);
      setRedoStack([]);

      // Update activeHouse directly
      if (activeHouse && targetRoomId) {
        setActiveHouse(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            rooms: prev.rooms.map(r => r.room_id === targetRoomId ? {
              ...r,
              furniture: [...(r.furniture || []), newItem]
            } : r)
          };
        });
      }

      setSceneFurniture(prev => [...prev, newItem]);
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
        category: "floor",
        position: [x, y_coord, z],
        rotation: [0, 0, 0],
        scale: scale,
        size: size,
        primaryColor: "#2b2b2b",
        secondaryColor: "#2b2b2b",
        accentColor: "#2b2b2b",
        color: "#2b2b2b",
        material: "leather",
        confidence: 1.0,
        editable: true,
        detected: false,
        originalPosition: [x, y_coord, z],
        originalRotation: [0, 0, 0],
        originalScale: scale,
        originalColor: "#2b2b2b",
        originalMaterial: "leather"
      };
      console.log("TRIGGERING ADD FURNITURE MOCK VIA JS DIRECT");
      setHistory(h => [...h, JSON.stringify(sceneFurnitureRef.current)]);
      setRedoStack([]);
      setSceneFurniture(prev => [...prev, newItem]);
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
      category: placementType,
      position: rec.position, 
      rotation: rec.rotation, 
      scale: [1, 1, 1],
      size: catalogItem?.size || rec.size || [1.0, 1.0, 1.0],
      primaryColor: defaultColor,
      secondaryColor: defaultColor,
      accentColor: defaultColor,
      color: defaultColor,
      material: material,
      confidence: 1.0,
      editable: true,
      detected: false,
      originalPosition: rec.position,
      originalRotation: rec.rotation,
      originalScale: [1, 1, 1],
      originalColor: defaultColor,
      originalMaterial: material
    };
    setHistory(h => [...h, JSON.stringify(sceneFurnitureRef.current)]);
    setRedoStack([]);
    setSceneFurniture(prev => [...prev, newItem]);
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
    console.log("Reconstruct clicked", file, mode);
    console.log("Starting processing");
    console.log("processState:", processState);

    setShowVideoUpload(false);
    
    // Clear any old scene state
    if (demoTimerRef.current) {
      clearInterval(demoTimerRef.current);
      demoTimerRef.current = null;
    }
    setPendingDemoScene(null);

    setSceneFurniture([]);
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

  const handleUploadFullHouse = async (roomsData, connections) => {
    setShowMultiVideoUpload(false);
    
    if (demoTimerRef.current) {
      clearInterval(demoTimerRef.current);
      demoTimerRef.current = null;
    }
    setPendingDemoScene(null);
    setSceneFurniture([]);
    setSelectedId(null);
    setSceneLoaded(false);
    setPcStats(null);
    setSessionStats(null);
    setPointCloudUrl(null);
    setObjectsUrl(null);
    setRemovedObjects([]);
    
    const hSessionId = `house_${Date.now()}`;
    setSessionId(hSessionId);
    setProcessState('PROCESSING_DEMO');
    setIsMultiRoom(true);
    setElapsedSeconds(0);
    setProcessingStage('uploading');

    const startTime = Date.now();
    
    // Build multi-video form data to upload to Flask backend
    const formData = new FormData();
    const roomsMetadata = roomsData.map(r => ({
      room_id: r.room_id,
      room_name: r.room_name,
      filename: r.video_file ? r.video_file.name : ''
    }));
    formData.append('rooms', JSON.stringify(roomsMetadata));
    formData.append('connections', JSON.stringify(connections || []));
    
    roomsData.forEach(r => {
      if (r.video_file) {
        formData.append(`video_${r.room_id}`, r.video_file);
      }
    });

    let backendResponse = null;
    let backendError = null;

    const backendPromise = fetch('http://127.0.0.1:5000/api/process-house-videos', {
      method: 'POST',
      body: formData,
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then(data => {
        backendResponse = data;
        console.log("Multi-video upload response received:", data);
      })
      .catch(err => {
        backendError = err;
        console.error("Multi-video upload error:", err);
      });

    demoTimerRef.current = setInterval(async () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);

      // Map elapsed seconds to multi-room stages (10 stages total, 3s each)
      const stages = ['uploading', 'extracting', 'depth', 'geometry', 'furniture', 'floorplan', 'connecting', 'graph', 'twin', 'finalizing'];
      const currentIdx = Math.min(stages.length - 1, Math.floor(elapsed / 3));
      setProcessingStage(stages[currentIdx]);

      if (elapsed >= 30) {
        if (backendResponse === null && backendError === null) {
          setProcessingStage('finalizing');
          return;
        }

        clearInterval(demoTimerRef.current);
        demoTimerRef.current = null;

        if (backendError) {
          alert('Failed to process house videos: ' + backendError.message);
          setProcessState('ERROR');
          return;
        }

        if (backendResponse && backendResponse.success) {
          try {
            const fetchScene = async (url) => {
              const res = await fetch(`http://127.0.0.1:5000${url}`);
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              return res.json();
            };

            const mapToModelType = (label) => {
              const l = label.toLowerCase();
              if (l.includes('curtain') || l.includes('blind') || l.includes('rail')) return 'Curtain';
              if (l.includes('king')) return 'KingBed';
              if (l.includes('bed') && !l.includes('side')) return 'Bed';
              if (l.includes('nightstand') || l.includes('bedside') || l.includes('drawer')) return 'BedsideTable';
              if (l.includes('refrigerator') || l.includes('fridge')) return 'Refrigerator';
              if (l.includes('oven')) return 'OvenStack';
              if (l.includes('display_cabinet')) return 'DisplayCabinet';
              if (l.includes('kitchen_cabinet') || l.includes('lower_kitchen') || l.includes('base_cabinet') || l.includes('cabinet_main')) return 'KitchenCabinet';
              if (l.includes('wardrobe')) return 'Wardrobe';
              if (l.includes('console') || l.includes('vanity')) return 'Console';
              if (l.includes('mirror')) return 'WallMirror';
              if (l.includes('pendant') || l.includes('chandelier')) return 'PendantLight';
              if (l.includes('rug')) return 'Rug';
              if (l.includes('sofa') || l.includes('sectional') || l.includes('chaise')) return 'Sofa';
              if (l.includes('table')) return 'Table';
              if (l.includes('chair') || l.includes('stool')) return 'Chair';
              if (l.includes('plant')) return 'Plant';
              return 'Decoration';
            };

            const prepFurniture = (objs, labelText) => {
              return (objs || []).map((o, idx) => ({
                ...o,
                id: o.id || `obj_${labelText}_${idx}`,
                type: mapToModelType(o.label || 'object'),
                position: o.position,
                rotation: [0, o.rotation_y || 0, 0],
                scale: o.scale || [1, 1, 1],
                size: o.size || [1, 1, 1],
                color: o.color || '#d6cabc',
                material: o.material || 'matte',
                detected: true,
                originalPosition: [...o.position],
                originalRotation: [0, o.rotation_y || 0, 0],
                originalScale: o.scale ? [...o.scale] : [1, 1, 1]
              }));
            };

            if (backendResponse.is_demo_house) {
              const fetchedScenes = await Promise.all(
                backendResponse.rooms.map(async (room) => {
                  const data = await fetchScene(room.scene_json_url);
                  return { roomInfo: room, sceneData: data };
                })
              );

              const demoHouse = {
                name: 'My Stitched Apartment',
                rooms: fetchedScenes.map(item => ({
                  room_id: item.roomInfo.room_id,
                  room_name: item.roomInfo.room_name,
                  offset: item.roomInfo.offset,
                  room: item.sceneData.room,
                  furniture: prepFurniture(item.sceneData.objects, item.roomInfo.room_id),
                  removedObjects: [],
                  pointCloudUrl: null,
                  pcStats: item.roomInfo.pcStats,
                  roomAnalysis: item.roomInfo.roomAnalysis
                })),
                connections: backendResponse.connections,
                currentRoomId: 'whole_house'
              };

              setActiveHouse(demoHouse);
              setSceneType('house');
              setSceneLoaded(true);
              setProcessState('READY');
            } else {
              const customRooms = backendResponse.rooms.map((room, index) => {
                const offset = room.offset;
                const width = room.roomAnalysis.dimensions.width;
                const length = room.roomAnalysis.dimensions.length;
                const height = room.roomAnalysis.dimensions.height;
                const wallColor = '#e2e8f0';

                return {
                  room_id: room.room_id,
                  room_name: room.room_name,
                  offset,
                  room: {
                    dimensions: { width, length, height },
                    floor: { position: [0, 0, 0], size: [width, 0.04, length], color: '#cbd5e1', material: 'tile' },
                    walls: [
                      { id: 'back_wall', position: [0, height/2, -length/2], size: [width, height, 0.02], color: wallColor },
                      { id: 'left_wall', position: [-width/2, height/2, 0], size: [0.02, height, length], color: wallColor },
                      { id: 'right_wall', position: [width/2, height/2, 0], size: [0.02, height, length], color: wallColor },
                    ],
                    ceiling: { position: [0, height, 0], size: [width, 0.02, length], color: '#ffffff' }
                  },
                  furniture: [
                    {
                      id: `sofa_${index}`,
                      name: 'Modern Sofa',
                      type: 'Sofa',
                      category: 'floor',
                      position: [0, 0.45, -1.0],
                      rotation: [0, 0, 0],
                      scale: [1, 1, 1],
                      size: [2.1, 0.9, 0.9],
                      color: '#6366f1',
                      material: 'fabric',
                      detected: true,
                      originalPosition: [0, 0.45, -1.0],
                      originalRotation: [0, 0, 0],
                      originalScale: [1, 1, 1]
                    }
                  ],
                  removedObjects: [],
                  pointCloudUrl: null,
                  pcStats: null,
                  roomAnalysis: room.roomAnalysis
                };
              });

              const customHouse = {
                name: 'Stitched House Layout',
                rooms: customRooms,
                connections: backendResponse.connections,
                currentRoomId: 'whole_house'
              };

              setActiveHouse(customHouse);
              setSceneType('house');
              setSceneLoaded(true);
              setProcessState('READY');
            }
          } catch (e) {
            console.error(e);
            alert('Error loading stitched house: ' + e.message);
            setProcessState('ERROR');
          }
        } else {
          alert('Backend processing failed: ' + (backendResponse?.error || 'Unknown error'));
          setProcessState('ERROR');
        }
      }
    }, 1000);
  };

  const handleLoadProject = (projKey) => {
    if (projKey === 'apartment') {
      handleUploadFullHouse([], []);
    } else if (projKey === 'villa') {
      const villaHouse = {
        name: 'Luxury Villa',
        rooms: [
          {
            room_id: 'living_room',
            room_name: 'Great Room',
            offset: [0, 0, 0],
            room: {
              dimensions: { width: 8.5, length: 11.5, height: 3.4 },
              floor: { size: [8.5, 0.04, 11.5], position: [0,0,0], color: '#f5ece2', material: 'marble' },
              walls: [
                { id: 'back_wall', position: [0, 1.7, -5.75], size: [8.5, 3.4, 0.04], color: '#faebd7' },
                { id: 'left_wall', position: [-4.25, 1.7, 0], size: [0.04, 3.4, 11.5], color: '#faebd7' },
                { id: 'right_wall', position: [4.25, 1.7, 0], size: [0.04, 3.4, 11.5], color: '#faebd7' }
              ]
            },
            furniture: [
              { id: 'sofa_v', name: 'Luxury Sectional Sofa', type: 'Sofa', category: 'floor', position: [-1, 0.45, -2], rotation: [0, 0, 0], scale: [1, 1, 1], size: [2.5, 0.9, 1.2], color: '#bfa889', material: 'velvet', detected: true, originalPosition: [-1, 0.45, -2], originalRotation: [0, 0, 0], originalScale: [1,1,1] },
              { id: 'plant_v', name: 'Fiddle Leaf Fig', type: 'Plant', category: 'floor', position: [3, 0.53, -4], rotation: [0, 0, 0], scale: [1, 1, 1], size: [0.8, 1.06, 0.8], color: '#22c55e', material: 'matte', detected: true, originalPosition: [3, 0.53, -4], originalRotation: [0, 0, 0], originalScale: [1,1,1] }
            ]
          },
          {
            room_id: 'bedroom',
            room_name: 'Master Suite',
            offset: [-7.85, 0, 0],
            room: {
              dimensions: { width: 7.2, length: 8.8, height: 3.1 },
              floor: { size: [7.2, 0.04, 8.8], position: [0,0,0], color: '#cbd5e1', material: 'carpet' },
              walls: [
                { id: 'back_wall', position: [0, 1.55, -4.4], size: [7.2, 3.1, 0.04], color: '#faebd7' },
                { id: 'left_wall', position: [-3.6, 1.55, 0], size: [0.04, 3.1, 8.8], color: '#faebd7' },
                { id: 'right_wall', position: [3.6, 1.55, 0], size: [0.04, 3.1, 8.8], color: '#faebd7' }
              ]
            },
            furniture: [
              { id: 'bed_v', name: 'King Bed', type: 'KingBed', category: 'floor', position: [0.5, 0.625, -1], rotation: [0, 0, 0], scale: [1, 1, 1], size: [2.02, 1.25, 2.29], color: '#ded3c3', material: 'fabric', detected: true, originalPosition: [0.5, 0.625, -1], originalRotation: [0, 0, 0], originalScale: [1,1,1] }
            ]
          }
        ],
        connections: [{ from: 'living_room', to: 'bedroom' }],
        currentRoomId: 'whole_house'
      };
      setActiveHouse(villaHouse);
      setSceneType('house');
      setSceneLoaded(true);
      setProcessState('READY');
    } else if (projKey === 'office') {
      const officeHouse = {
        name: 'Office Layout',
        rooms: [
          {
            room_id: 'office_main',
            room_name: 'Co-working Office',
            offset: [0, 0, 0],
            room: {
              dimensions: { width: 8.0, length: 8.0, height: 3.0 },
              floor: { size: [8.0, 0.04, 8.0], position: [0,0,0], color: '#64748b', material: 'concrete' },
              walls: [
                { id: 'back_wall', position: [0, 1.5, -4.0], size: [8.0, 3.0, 0.04], color: '#cbd5e1' },
                { id: 'left_wall', position: [-4, 1.5, 0], size: [0.04, 3.0, 8.0], color: '#cbd5e1' },
                { id: 'right_wall', position: [4, 1.5, 0], size: [0.04, 3.0, 8.0], color: '#cbd5e1' }
              ]
            },
            furniture: [
              { id: 'desk_o', name: 'Executive Desk', type: 'Desk', category: 'floor', position: [0, 0.39, -1], rotation: [0, 0, 0], scale: [1, 1, 1], size: [1.4, 0.785, 0.7], color: '#111111', material: 'wood', detected: true, originalPosition: [0, 0.39, -1], originalRotation: [0, 0, 0], originalScale: [1,1,1] },
              { id: 'chair_o', name: 'Ergonomic Office Chair', type: 'Chair', category: 'floor', position: [0, 0.58, -2], rotation: [0, Math.PI, 0], scale: [1, 1, 1], size: [0.6, 1.16, 0.6], color: '#000000', material: 'plastic', detected: true, originalPosition: [0, 0.58, -2], originalRotation: [0, Math.PI, 0], originalScale: [1,1,1] }
            ]
          }
        ],
        connections: [],
        currentRoomId: 'office_main'
      };
      setActiveHouse(officeHouse);
      setSceneType('house');
      setSceneLoaded(true);
      setProcessState('READY');
    }
  };

  const handleSwitchRoom = (roomId) => {
    setActiveHouse(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        currentRoomId: roomId
      };
    });
  };

  const handleCreateEmptyHouse = (emptyHouseData) => {
    setShowEmptyHouseModal(false);
    if (demoTimerRef.current) {
      clearInterval(demoTimerRef.current);
      demoTimerRef.current = null;
    }
    setPendingDemoScene(null);
    setSceneFurniture([]);
    setSelectedId(null);
    setSceneLoaded(true);
    setPcStats(null);
    setSessionStats(null);
    setPointCloudUrl(null);
    setObjectsUrl(null);
    setRemovedObjects([]);
    
    setSessionId(`empty_house_${Date.now()}`);
    setIsMultiRoom(true);
    setActiveHouse(emptyHouseData);
    setSceneType('house');
    setProcessState('READY');
  };

  const handleLoadSavedProject = () => {
    const saved = localStorage.getItem('miniscene_layout');
    if (!saved) {
      alert('No saved project found in local storage.');
      return;
    }
    try {
      const data = JSON.parse(saved);
      if (data.activeHouse) {
        setActiveHouse(data.activeHouse);
      }
      if (data.sceneFurniture) {
        setSceneFurniture(data.sceneFurniture);
      }
      if (data.sceneType) {
        setSceneType(data.sceneType);
      }
      if (data.sessionId) {
        setSessionId(data.sessionId);
      }
      setIsMultiRoom(data.activeHouse !== null);
      setProcessState('READY');
      setSceneLoaded(true);
      alert('Project layout loaded successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to parse saved layout.');
    }
  };

  const handleExportFormat = (format) => {
    setShowExportModal(false);
    
    let filename = '';
    let content = '';
    let mimeType = 'text/plain';

    const rooms = activeHouse ? activeHouse.rooms : [{
      room_name: 'Room',
      offset: [0, 0, 0],
      room: demoSceneData?.room,
      furniture: sceneFurniture
    }];

    if (format === 'json') {
      filename = `${activeHouse?.name || 'miniscene'}_layout.json`;
      mimeType = 'application/json';
      content = JSON.stringify(activeHouse || {
        name: 'Single Room',
        rooms: [{
          room_id: 'room_1',
          room_name: 'Room 1',
          offset: [0, 0, 0],
          room: demoSceneData?.room,
          furniture: sceneFurniture
        }],
        connections: []
      }, null, 2);
    } 
    else if (format === 'blender') {
      filename = `${activeHouse?.name || 'miniscene'}_blender_import.py`;
      mimeType = 'text/x-python';
      
      let pyLines = [
        "import bpy",
        "# Clean up scene",
        "if bpy.context.object:",
        "    bpy.ops.object.mode_set(mode='OBJECT')",
        "bpy.ops.object.select_all(action='SELECT')",
        "bpy.ops.object.delete(use_global=False)",
        "",
        "def create_mesh_box(name, location, size, hex_color):",
        "    # Add a cube",
        "    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location)",
        "    obj = bpy.context.active_object",
        "    obj.name = name",
        "    obj.scale = size",
        "    ",
        "    # Convert hex to RGB",
        "    hex_color = hex_color.lstrip('#')",
        "    r = int(hex_color[0:2], 16) / 255.0",
        "    g = int(hex_color[2:4], 16) / 255.0",
        "    b = int(hex_color[4:6], 16) / 255.0",
        "    ",
        "    # Add Material",
        "    mat = bpy.data.materials.new(name=name + '_mat')",
        "    mat.use_nodes = True",
        "    nodes = mat.node_tree.nodes",
        "    principled = nodes.get('Principled BSDF')",
        "    if principled:",
        "        principled.inputs[0].default_value = (r, g, b, 1.0)",
        "    obj.data.materials.append(mat)",
        "    return obj",
        ""
      ];

      rooms.forEach(room => {
        const offset = room.offset || [0, 0, 0];
        const rName = room.room_name.replace(/\s+/g, '_');
        
        if (room.room?.dimensions) {
          const { width, length } = room.room.dimensions;
          pyLines.push(`create_mesh_box("${rName}_Floor", (${offset[0]}, ${offset[1] - 0.02}, ${offset[2]}), (${width}, 0.04, ${length}), "#6b7280")`);
        }
        
        if (room.room?.walls) {
          room.room.walls.forEach(w => {
            const wPos = [w.position[0] + offset[0], w.position[1] + offset[1], w.position[2] + offset[2]];
            pyLines.push(`create_mesh_box("${rName}_Wall", (${wPos[0]}, ${wPos[1]}, ${wPos[2]}), (${w.size[0]}, ${w.size[1]}, ${w.size[2]}), "#d1d5db")`);
          });
        }

        const furniture = room.furniture || [];
        furniture.forEach(item => {
          const pos = item.position;
          const globalPos = [pos[0] + offset[0], pos[1] + offset[1], pos[2] + offset[2]];
          const size = item.size || [1.0, 1.0, 1.0];
          const color = item.color || '#6366f1';
          pyLines.push(`create_mesh_box("${item.type}_${item.id}", (${globalPos[0]}, ${globalPos[1]}, ${globalPos[2]}), (${size[0]}, ${size[1]}, ${size[2]}), "${color}")`);
        });
      });

      content = pyLines.join('\n');
    }
    else if (format === 'obj') {
      filename = `${activeHouse?.name || 'miniscene'}_scene.obj`;
      mimeType = 'text/plain';
      
      let objLines = [
        `# Wavefront OBJ exported from MiniScene AI`,
        `# Material Count: 1`,
        `mtllib scene.mtl`,
        `g room_walls_floor`
      ];

      let vCount = 1;
      const addBoxToObj = (name, center, size) => {
        const [cx, cy, cz] = center;
        const [w, h, d] = size;
        const hx = w / 2, hy = h / 2, hz = d / 2;

        objLines.push(
          `# ${name}`,
          `v ${cx - hx} ${cy - hy} ${cz - hz}`,
          `v ${cx + hx} ${cy - hy} ${cz - hz}`,
          `v ${cx + hx} ${cy + hy} ${cz - hz}`,
          `v ${cx - hx} ${cy + hy} ${cz - hz}`,
          `v ${cx - hx} ${cy - hy} ${cz + hz}`,
          `v ${cx + hx} ${cy - hy} ${cz + hz}`,
          `v ${cx + hx} ${cy + hy} ${cz + hz}`,
          `v ${cx - hx} ${cy + hy} ${cz + hz}`,
          `f ${vCount} ${vCount+1} ${vCount+2} ${vCount+3}`,
          `f ${vCount+4} ${vCount+7} ${vCount+6} ${vCount+5}`,
          `f ${vCount} ${vCount+3} ${vCount+7} ${vCount+4}`,
          `f ${vCount+1} ${vCount+5} ${vCount+6} ${vCount+2}`,
          `f ${vCount+3} ${vCount+2} ${vCount+6} ${vCount+7}`,
          `f ${vCount} ${vCount+4} ${vCount+5} ${vCount+1}`
        );
        vCount += 8;
      };

      rooms.forEach(room => {
        const offset = room.offset || [0, 0, 0];
        if (room.room?.dimensions) {
          addBoxToObj(`${room.room_name}_Floor`, [offset[0], offset[1] - 0.02, offset[2]], [room.room.dimensions.width, 0.04, room.room.dimensions.length]);
        }
        if (room.room?.walls) {
          room.room.walls.forEach(w => {
            addBoxToObj(`${room.room_name}_Wall`, [w.position[0] + offset[0], w.position[1] + offset[1], w.position[2] + offset[2]], w.size);
          });
        }
        (room.furniture || []).forEach(f => {
          addBoxToObj(`${f.type}_${f.id}`, [f.position[0] + offset[0], f.position[1] + offset[1], f.position[2] + offset[2]], f.size || [1.0, 1.0, 1.0]);
        });
      });

      content = objLines.join('\n');
    }
    else if (format === 'gltf') {
      filename = `${activeHouse?.name || 'miniscene'}_scene.gltf`;
      mimeType = 'application/json';

      const nodes = [];
      const scenes = [{ nodes: [] }];
      
      let nodeIdx = 0;
      rooms.forEach(room => {
        const offset = room.offset || [0, 0, 0];
        nodes.push({
          name: room.room_name,
          translation: offset,
          children: []
        });
        const roomRootIdx = nodeIdx++;
        scenes[0].nodes.push(roomRootIdx);

        if (room.room?.dimensions) {
          nodes.push({
            name: 'Floor',
            scale: [room.room.dimensions.width, 0.04, room.room.dimensions.length]
          });
          nodes[roomRootIdx].children.push(nodeIdx++);
        }

        (room.furniture || []).forEach(f => {
          nodes.push({
            name: `${f.type}_${f.name}`,
            translation: f.position,
            rotation: [0, Math.sin(f.rotation[1]/2), 0, Math.cos(f.rotation[1]/2)],
            scale: f.size || [1.0, 1.0, 1.0]
          });
          nodes[roomRootIdx].children.push(nodeIdx++);
        });
      });

      const gltfObj = {
        asset: { generator: "MiniScene AI GLTF Exporter", version: "2.0" },
        scene: 0,
        scenes,
        nodes
      };
      content = JSON.stringify(gltfObj, null, 2);
    }
    else if (format === 'fbx') {
      filename = `${activeHouse?.name || 'miniscene'}_scene.fbx`;
      mimeType = 'text/plain';
      
      let fbxLines = [
        `; FBX 7.4.0 project export from MiniScene AI`,
        `FBXHeaderExtension: {`,
        `    FBXVersion: 7400`,
        `}`,
        `Objects: {`,
      ];
      rooms.forEach(room => {
        const offset = room.offset || [0, 0, 0];
        fbxLines.push(
          `    Model: "Model::${room.room_name}", "Null" {`,
          `        Version: 232`,
          `        Properties70: {`,
          `            P: "Lcl Translation", "Lcl Translation", "", "A", ${offset[0]}, ${offset[1]}, ${offset[2]}`,
          `        }`,
          `    }`
        );
        (room.furniture || []).forEach(f => {
          fbxLines.push(
            `    Model: "Model::${f.type}_${f.id}", "Mesh" {`,
            `        Version: 232`,
            `        Properties70: {`,
            `            P: "Lcl Translation", "Lcl Translation", "", "A", ${f.position[0]}, ${f.position[1]}, ${f.position[2]}`,
            `            P: "Lcl Rotation", "Lcl Rotation", "", "A", 0, ${f.rotation[1] * 180 / Math.PI}, 0`,
            `        }`,
            `    }`
          );
        });
      });
      fbxLines.push(`}`);
      content = fbxLines.join('\n');
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const handleApplyTheme = (themeKey, target) => {
    const theme = {
      modern: { wallColor: '#e2e8f0', floorMaterial: 'concrete', floorColor: '#94a3b8', color: '#1f2937' },
      luxury: { wallColor: '#faebd7', floorMaterial: 'marble', floorColor: '#ded3c3', color: '#bfa889' },
      minimal: { wallColor: '#f8fafc', floorMaterial: 'concrete', floorColor: '#cbd5e1', color: '#0f172a' },
      scandinavian: { wallColor: '#f1f5f9', floorMaterial: 'wood', floorColor: '#b98f65', color: '#475569' },
      japanese: { wallColor: '#fafaf9', floorMaterial: 'wood', floorColor: '#e8d8c8', color: '#78716c' },
      industrial: { wallColor: '#cbd5e1', floorMaterial: 'concrete', floorColor: '#64748b', color: '#1e1b4b' },
      contemporary: { wallColor: '#f5ece2', floorMaterial: 'wood', floorColor: '#7a4e31', color: '#1e3a8a' }
    }[themeKey];

    if (!theme || !activeHouse) return;

    setActiveHouse(prev => {
      if (!prev) return prev;
      const activeRoomId = prev.currentRoomId;
      
      const updatedRooms = prev.rooms.map(room => {
        if (target === 'house' || room.room_id === activeRoomId || (activeRoomId === 'whole_house' && prev.rooms.length === 1)) {
          const newRoom = { ...room.room };
          const { width, length, height } = newRoom.dimensions;
          
          newRoom.floor = {
            ...newRoom.floor,
            color: theme.floorColor,
            material: theme.floorMaterial,
          };
          
          newRoom.walls = [
            { id: "back_wall", position: [0, height / 2, -length / 2], size: [width, height, 0.02], color: theme.wallColor },
            { id: "left_wall", position: [-width / 2, height / 2, 0], size: [0.02, height, length], color: theme.wallColor },
            { id: "right_wall", position: [width / 2, height / 2, 0], size: [0.02, height, length], color: theme.wallColor }
          ];

          const updatedFurniture = (room.furniture || []).map(f => ({
            ...f,
            color: theme.color,
            primaryColor: theme.color,
            secondaryColor: theme.color,
            accentColor: theme.color
          }));

          return {
            ...room,
            room: newRoom,
            furniture: updatedFurniture
          };
        }
        return room;
      });
      return { ...prev, rooms: updatedRooms };
    });
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

    setSceneFurniture([]);
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
      setSceneFurniture(items => items.map(item => {
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
        if (item.category === 'ceiling' || item.type === 'PendantLight') {
          targetY = height - h / 2;
        } else if (item.category === 'rug' || item.type === 'Rug') {
          targetY = 0.01;
        } else if (item.category === 'wall' || item.type === 'Mirror' || item.type === 'Painting') {
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
    const saveData = { sceneFurniture, timestamp: Date.now(), sessionId };
    localStorage.setItem('miniscene_layout', JSON.stringify(saveData));
    alert('Layout saved to browser storage!');
  };

  const handleExport = () => {
    let filename = 'edited_scene.json';
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
        placed_furniture: sceneFurniture.map(item => ({
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
          placementType: item.category
        }))
      };
    } else {
      exportData = sceneFurniture.map(item => ({
        id: item.id,
        type: item.type?.toLowerCase() || item.type || 'object',
        position: item.position.map(val => parseFloat(val.toFixed(3))),
        rotation: item.rotation.map(val => parseFloat(val.toFixed(3))),
        scale: item.scale.map(val => parseFloat(val.toFixed(3))),
        color: item.color,
        material: item.material,
        detected: !!item.detected
      }));
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
      {!presentationMode && hasScene && (
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

        {/* Room Navigator Sidebar Section */}
        {hasScene && activeHouse && (
          <div style={{ padding: '14px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Room Navigator</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <button
                onClick={() => handleSwitchRoom('whole_house')}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: activeHouse.currentRoomId === 'whole_house' ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${activeHouse.currentRoomId === 'whole_house' ? 'var(--teal)' : 'var(--border)'}`,
                  color: activeHouse.currentRoomId === 'whole_house' ? 'var(--teal)' : 'var(--text-main)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  width: '100%',
                  textAlign: 'left'
                }}
              >
                🏠 Whole House
              </button>
              {activeHouse.rooms.map(room => {
                const isSelected = activeHouse.currentRoomId === room.room_id;
                const icon = {
                  living_room: '🛋️',
                  bedroom: '🛏️',
                  kitchen: '🍳',
                  dining_room: '🪵',
                  office: '💻',
                  bathroom: '🚰',
                  balcony: '🌿',
                  hallway: '🚪',
                }[room.room_id.split('_')[0]] || '🚪';

                return (
                  <button
                    key={room.room_id}
                    onClick={() => handleSwitchRoom(room.room_id)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: isSelected ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                      color: isSelected ? 'var(--accent)' : 'var(--text-main)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: '0.82rem',
                      fontWeight: isSelected ? 600 : 400,
                      width: '100%',
                      textAlign: 'left',
                      paddingLeft: 20
                    }}
                  >
                    <span>{icon}</span>
                    <span>{room.room_name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* AI Interior Themes */}
        {hasScene && activeHouse && (
          <div style={{ padding: '14px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>AI Interior Themes</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
              {[
                { key: 'scandinavian', name: 'Scandinavian', emoji: '🌲' },
                { key: 'luxury', name: 'Luxury Marble', emoji: '👑' },
                { key: 'minimal', name: 'Minimalist', emoji: '◽' },
                { key: 'modern', name: 'Modern Slate', emoji: '📐' },
                { key: 'japanese', name: 'Zen Wooden', emoji: '🎋' },
                { key: 'industrial', name: 'Industrial', emoji: '🏭' },
                { key: 'contemporary', name: 'Contemporary', emoji: '🎨' },
              ].map(theme => (
                <button
                  key={theme.key}
                  onClick={() => handleApplyTheme(theme.key, 'house')}
                  style={{
                    padding: '6px 8px',
                    borderRadius: 6,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-main)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--teal)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  <span>{theme.emoji}</span>
                  <span>{theme.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Project Manager Section */}
        {hasScene && (
          <div style={{ padding: '14px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Project Manager</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                className="btn-primary"
                style={{ fontSize: '0.78rem', padding: '8px', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}
                onClick={handleSave}
              >
                💾 Save Layout
              </button>
              <button
                className="btn-primary"
                style={{ fontSize: '0.78rem', padding: '8px', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}
                onClick={handleLoadSavedProject}
              >
                📂 Load Saved
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Presets:</span>
              <select
                onChange={(e) => {
                  if (e.target.value) handleLoadProject(e.target.value);
                }}
                defaultValue=""
                style={{ background: '#0e121c', color: 'white', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px', fontSize: '0.75rem', outline: 'none', flex: 1 }}
              >
                <option value="" disabled>-- Select Preset --</option>
                <option value="apartment">My Apartment</option>
                <option value="villa">Luxury Villa</option>
                <option value="office">Office Layout</option>
              </select>
            </div>
          </div>
        )}

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
            onClick={() => setShowExportModal(true)}
          >
            <Download size={15} /> Export
          </button>
        </div>
      </div>
      )}

      {/* 3D Canvas */}
      <div className="canvas-container" style={{
        opacity: ['READY', 'IDLE'].includes(processState) ? 1 : 0,
        transition: 'opacity 0.4s ease-in-out'
      }}>
        {/* Landing hero — shown when no scene */}
        {!hasScene && !isProcessing && (
          <LandingHero
            onUploadSingle={() => setShowVideoUpload(true)}
            onUploadFullHouse={() => setShowMultiVideoUpload(true)}
            onCreateEmptyHouse={() => setShowEmptyHouseModal(true)}
          />
        )}

        {hasScene && activeHouse && !presentationMode && (
          <Minimap activeHouse={activeHouse} />
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
              compareOriginal={compareOriginal}
              activeHouse={activeHouse}
              presentationMode={presentationMode}
            />
          </CanvasErrorBoundary>
        )}

        {/* ─── Primary Toolbar ─── */}
        {hasScene && !presentationMode ? (
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
                {/* Compare Original */}
                <button
                  className="btn-primary"
                  style={{
                    background: compareOriginal ? 'rgba(6,182,212,0.2)' : 'transparent',
                    border: `1px solid ${compareOriginal ? 'var(--teal)' : 'var(--border)'}`,
                    color: compareOriginal ? 'var(--teal)' : 'var(--text-main)',
                  }}
                  onClick={() => setCompareOriginal(prev => !prev)}
                  title="Compare current layout with original layout"
                >
                  <Sliders size={17} /> Compare Original
                </button>

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
                  onClick={() => setShowExportModal(true)}
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

            {hasScene && activeHouse && (
              <>
                <div className="toolbar-divider" />
                {/* Floor Plan */}
                <button
                  className="btn-primary"
                  style={{
                    background: currentView === 'floorplan' ? 'rgba(6,182,212,0.2)' : 'transparent',
                    border: `1px solid ${currentView === 'floorplan' ? 'var(--teal)' : 'var(--border)'}`,
                    color: currentView === 'floorplan' ? 'var(--teal)' : 'var(--text-main)',
                  }}
                  onClick={() => setCurrentView(prev => prev === '3d' ? 'floorplan' : '3d')}
                  title="View 2D CAD Floor Plan Layout"
                >
                  📐 Floor Plan
                </button>
              </>
            )}

            {hasScene && (
              <>
                <div className="toolbar-divider" />
                {/* Presentation Mode */}
                <button
                  className="btn-primary"
                  style={{
                    background: presentationMode ? 'rgba(6,182,212,0.2)' : 'transparent',
                    border: `1px solid ${presentationMode ? 'var(--teal)' : 'var(--border)'}`,
                    color: presentationMode ? 'var(--teal)' : 'var(--text-main)',
                  }}
                  onClick={() => setPresentationMode(prev => !prev)}
                  title="Toggle Presentation Mode (Hides labels and debug elements)"
                >
                  🎭 Presentation
                </button>
              </>
            )}

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
        ) : hasScene && presentationMode ? (
          <button
            onClick={() => setPresentationMode(false)}
            style={{
              position: 'absolute',
              bottom: 20,
              right: 20,
              zIndex: 100,
              background: 'rgba(14,18,28,0.9)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '8px 16px',
              color: '#06b6d4',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.8rem',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            🎭 Exit Presentation Mode
          </button>
        ) : null}
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
            isHardcodedDemo={isHardcodedDemo}
            compareOriginal={compareOriginal}
            onOpenReplaceLibrary={(id) => {
              setReplacingObjectId(id);
              setShowLibrary(true);
            }}
            onSnapToWall={handleSnapToWall}
            onResetObject={handleResetObject}
          />
        )}
        {showMultiVideoUpload && (
          <MultiVideoUpload
            onUpload={handleUploadFullHouse}
            onClose={() => setShowMultiVideoUpload(false)}
          />
        )}

        {showEmptyHouseModal && (
          <EmptyHouseModal
            onCreate={handleCreateEmptyHouse}
            onClose={() => setShowEmptyHouseModal(false)}
          />
        )}

        {currentView === 'floorplan' && activeHouse && (
          <FloorPlanPanel
            activeHouse={activeHouse}
            onClose={() => setCurrentView('3d')}
          />
        )}

        {showExportModal && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(8,11,18,0.85)',
            backdropFilter: 'blur(12px)', zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div className="glass-panel" style={{ width: 440, padding: 24, borderRadius: 16, border: '1px solid rgba(6,182,212,0.3)', position: 'relative' }}>
              <button onClick={() => setShowExportModal(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
              
              <h2 style={{ fontSize: '1.1rem', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}><Download size={18} color="#06b6d4" /> Export Digital Twin</h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 20 }}>Select a file format to download your 3D house scene layout.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { key: 'json', name: 'JSON Scene Graph', desc: 'Metadata, wall boundaries, and placed catalog item IDs.', ext: '.json', color: '#06b6d4' },
                  { key: 'blender', name: 'Blender Python Importer', desc: 'Runs inside Blender to script-recreate room walls and place meshes.', ext: '.py', color: '#f97316' },
                  { key: 'gltf', name: 'glTF 3D Asset', desc: 'Standard 3D format containing hierarchy nodes and transforms.', ext: '.gltf', color: '#22c55e' },
                  { key: 'obj', name: 'Wavefront OBJ Mesh', desc: 'Mesh file representing room layout geometry and static volumes.', ext: '.obj', color: '#a78bfa' },
                  { key: 'fbx', name: 'Autodesk FBX Layout', desc: 'Exchange format for integration in Unity, Unreal, or 3ds Max.', ext: '.fbx', color: '#ec4899' },
                ].map(fmt => (
                  <button
                    key={fmt.key}
                    onClick={() => handleExportFormat(fmt.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 12,
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                      width: '100%'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = fmt.color; e.currentTarget.style.background = `${fmt.color}05`; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-main)' }}>{fmt.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{fmt.desc}</div>
                    </div>
                    <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>{fmt.ext}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <ControlsHelp mode={cameraMode} />
    </>
  );
}

export default App;
