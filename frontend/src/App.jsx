import React, { useState, useEffect } from 'react';
import { Box, Trash2, Home, Plus, Info, Footprints, Camera, Save, Download, X, Settings2, Activity, Ruler, Sparkles, Network, Map, Layers, Film } from 'lucide-react';
import Scene from './Scene';
import { AnimatePresence, motion } from 'framer-motion';
import FurnitureLibrary from './FurnitureLibrary';
import ObjectProperties from './ObjectProperties';
import ControlsHelp from './ControlsHelp';
import ViewSettings from './ViewSettings';
import SemanticPanel from './SemanticPanel';
import AnalyticsPanel from './AnalyticsPanel';
import AssistantPanel from './AssistantPanel';
import SceneGraphPanel from './SceneGraphPanel';
import WalkablePanel from './WalkablePanel';
import CVPanel from './CVPanel';
import VideoUpload from './VideoUpload';
import ProcessingStatus from './ProcessingStatus';

const ENABLE_POINT_CLOUD_EDITING = false;

function App() {
  const [objects, setObjects] = useState([]);
  const [placedItems, setPlacedItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cameraMode, setCameraMode] = useState('orbit'); // 'orbit' | 'walk'
  const [showLibrary, setShowLibrary] = useState(false);
  const [showViewSettings, setShowViewSettings] = useState(false);
  const [showSemanticPanel, setShowSemanticPanel] = useState(false);
  const [showAnalyticsPanel, setShowAnalyticsPanel] = useState(false);
  const [showAssistantPanel, setShowAssistantPanel] = useState(false);
  const [showGraphPanel, setShowGraphPanel] = useState(false);
  const [showWalkablePanel, setShowWalkablePanel] = useState(false);
  const [showCVPanel, setShowCVPanel] = useState(false);
  const [showRepairPanel, setShowRepairPanel] = useState(false);
  const [cvStage, setCvStage] = useState(1);
  const [cvFrame, setCvFrame] = useState(0);
  const [activeHoverRec, setActiveHoverRec] = useState(null);
  const [activeGraphSource, setActiveGraphSource] = useState(null);
  const [activeGraphTarget, setActiveGraphTarget] = useState(null);
  const [walkableAnalytics, setWalkableAnalytics] = useState(null);
  const [repairAnalytics, setRepairAnalytics] = useState(null);
  const [placementItem, setPlacementItem] = useState(null);
  const [removedObjects, setRemovedObjects] = useState([]);
  const [repairMode, setRepairMode] = useState('original'); // Force original by default

  const [showVideoUpload, setShowVideoUpload] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [pointCloudUrl, setPointCloudUrl] = useState('/point_cloud.ply');
  const [objectsUrl, setObjectsUrl] = useState('/objects_3d.json');
  const [semanticUrl, setSemanticUrl] = useState(null);
  const [analysisUrl, setAnalysisUrl] = useState(null);
  const [graphUrl, setGraphUrl] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [fitTrigger, setFitTrigger] = useState(0);
  const [uploadDebug, setUploadDebug] = useState(null);
  const [manualUrl, setManualUrl] = useState("");
  
  const [viewSettings, setViewSettings] = useState({
    viewMode: 'hybrid', // 'points', 'hybrid', 'room'
    pointSize: 0.015,
    pointOpacity: 0.8,
    wallOpacity: 0.5,
    floorHeight: -2,
    roomScale: 1,
    showGrid: false,
    showWalls: true,
    showCeiling: false,
    showOriginalPointCloud: true,
    showRepairPoints: false,
    showEditedPointCloud: false
  });

  // Automatically clear old edit cache on app load
  useEffect(() => {
    localStorage.removeItem('editedScene');
    localStorage.removeItem('removedObjects');
    localStorage.removeItem('repairPoints');
    localStorage.removeItem('generatedPoints');
    localStorage.removeItem('pointCloudEdits');
    localStorage.removeItem('sceneRepair');
  }, []);

  const handleResetCache = () => {
    localStorage.removeItem('editedScene');
    localStorage.removeItem('removedObjects');
    localStorage.removeItem('repairPoints');
    localStorage.removeItem('generatedPoints');
    localStorage.removeItem('pointCloudEdits');
    localStorage.removeItem('sceneRepair');
    setRemovedObjects([]);
    setRepairMode('original');
    alert("Scene Cache Cleared! Restored original point cloud.");
  };

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    fetch(objectsUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => {
        let items = [];
        if (Array.isArray(data)) items = data;
        else if (data && data.objects && Array.isArray(data.objects)) items = data.objects;
        else if (data && data.detections && Array.isArray(data.detections)) items = data.detections;
        
        if (items.length > 0) {
          setObjects(items.map(obj => {
            const pos = obj.samples && obj.samples.length > 0 ? obj.samples[0].position_world : (obj.box_3d?.center || [0,0,0]);
            let size = obj.box_3d?.size || [1, 1, 1];
            if (obj.label === 'couch') size = [2, 1, 1];
            if (obj.label === 'chair') size = [0.8, 1.2, 0.8];
            
            return {
              ...obj,
              id: obj.id || Math.random(),
              confidence: obj.average_score || obj.confidence || 0,
              box_3d: { center: pos, size }
            };
          }));
        } else {
          setObjects([]);
        }
      })
      .catch((err) => {
        console.error("Error loading objects:", err);
        setObjects([]);
        setLoadError(`Objects file failed to load: ${objectsUrl}`);
      })
      .finally(() => setLoading(false));
  }, [objectsUrl]);

  const handleDeleteObject = (id) => {
    // Check if it's an original point cloud object
    const origObj = objects.find(o => o.id === id);
    if (origObj) {
      if (ENABLE_POINT_CLOUD_EDITING) {
        setRemovedObjects([...removedObjects, origObj]);
      }
      setObjects(objects.filter(o => o.id !== id));
    } else {
      setPlacedItems(placedItems.filter(p => p.id !== id));
    }
    if (selectedId === id) setSelectedId(null);
  };

  const handleDuplicatePlaced = (item) => {
    const isDetected = objects.find(o => o.id === item.id);
    if (isDetected) return; // Don't duplicate AI objects for now

    const newItem = {
      ...item,
      id: Math.random().toString(),
      position: [item.position[0] + 0.5, item.position[1], item.position[2] + 0.5]
    };
    setPlacedItems([...placedItems, newItem]);
    setSelectedId(newItem.id);
  };

  const handleUpdateObject = (id, updates) => {
    if (placedItems.find(i => i.id === id)) {
      setPlacedItems(items => items.map(item => item.id === id ? { ...item, ...updates } : item));
    } else if (objects.find(o => o.id === id)) {
      setObjects(objs => objs.map(obj => obj.id === id ? { ...obj, ...updates } : obj));
    }
  };

  const handleLibrarySelect = (itemConfig) => {
    setPlacementItem(itemConfig);
    setShowLibrary(false);
  };

  const handleSceneClick = (point) => {
    if (placementItem) {
      const newItem = {
        id: Math.random().toString(),
        name: placementItem.name,
        type: placementItem.type,
        position: [point.x, viewSettings.floorHeight, point.z],
        rotation: [0, 0, 0],
        scale: [1, 1, 1]
      };
      setPlacedItems([...placedItems, newItem]);
      setPlacementItem(null); // Exit placement mode after placing one
      setSelectedId(newItem.id);
    }
  };

  const handleAutoPlace = (rec) => {
    const newItem = {
      id: Math.random().toString(),
      name: rec.name,
      type: rec.type,
      position: rec.position,
      rotation: rec.rotation,
      scale: [1, 1, 1]
    };
    setPlacedItems([...placedItems, newItem]);
    setSelectedId(newItem.id);
    setActiveHoverRec(null); // Clear preview once placed
  };

  const handleAutoPlay = () => {
    setCvFrame(0);
    let f = 0;
    const interval = setInterval(() => {
      f++;
      if (f >= 15) { // 15 frames max
        clearInterval(interval);
      } else {
        setCvFrame(f);
      }
    }, 200);
  };

  const handleUploadVideo = async (file) => {
    setShowVideoUpload(false);
    setIsProcessing(true);
    
    const formData = new FormData();
    formData.append('video', file);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/process-video', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      console.log("--- Backend Video Processing Response ---", data);
      
      if (data.success) {
        console.log("Point Cloud URL:", data.files.point_cloud);
        console.log("Objects URL:", data.files.objects);
        
        setSessionId(data.session_id);
        setPointCloudUrl(data.files.point_cloud);
        setObjectsUrl(data.files.objects);
        setSemanticUrl(data.files.semantic_scene);
        setAnalysisUrl(data.files.room_analysis);
        setGraphUrl(data.files.scene_graph);
        setUploadDebug(data.debug);
        
        // Directly test file loading from frontend
        fetch(data.files.point_cloud)
          .then(res => {
            console.log("PLY fetch status:", res.status);
            return res.text();
          })
          .then(text => {
            console.log("PLY header:", text.slice(0, 300));
          })
          .catch(err => console.error("PLY fetch failed:", err));
          
      } else {
        alert("Processing failed: " + data.error);
        setIsProcessing(false);
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to connect to processing server. Make sure the backend is running.");
      setIsProcessing(false);
    }
  };

  const handleProcessingComplete = () => {
    setIsProcessing(false);
    setPlacedItems([]);
    setRemovedObjects([]);
  };

  const selectedItem = objects.find(o => o.id === selectedId) || placedItems.find(p => p.id === selectedId);

  return (
    <>
      <ProcessingStatus isProcessing={isProcessing} onComplete={handleProcessingComplete} />
      <div className="glass-panel">
        <div className="header">
          <h1>MiniScene AI</h1>
          <p>Interactive Space Planning</p>
        </div>

        <div className="object-list">
          <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Detected AI Objects</h3>
          <AnimatePresence>
            {objects.map((obj) => (
              <motion.div
                key={obj.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`object-item ${selectedId === obj.id ? 'selected' : ''}`}
                onClick={() => setSelectedId(obj.id)}
              >
                <div className="object-info">
                  <div className="object-icon"><Box size={20} /></div>
                  <div className="object-details">
                    <h3>{obj.label}</h3>
                    <p>Conf: {(obj.confidence * 100).toFixed(0)}%</p>
                  </div>
                </div>
                <button className="action-btn" onClick={(e) => { e.stopPropagation(); handleDeleteObject(obj.id); }}><Trash2 size={16} /></button>
              </motion.div>
            ))}
          </AnimatePresence>
          
          <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 12 }}>Placed Furniture</h3>
          <AnimatePresence>
            {placedItems.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`object-item ${selectedId === item.id ? 'selected' : ''}`}
                onClick={() => setSelectedId(item.id)}
              >
                <div className="object-info">
                  <div className="object-icon" style={{ color: '#22c55e' }}><Box size={20} /></div>
                  <div className="object-details">
                    <h3>{item.name}</h3>
                    <p>{item.type}</p>
                  </div>
                </div>
                <button className="action-btn" onClick={(e) => { e.stopPropagation(); handleDeleteObject(item.id); }}><Trash2 size={16} /></button>
              </motion.div>
            ))}
          </AnimatePresence>

          {objects.length === 0 && placedItems.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <Info size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <p>No objects in the scene.</p>
            </div>
          )}
        </div>
        
        <div style={{ padding: 16, borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <button className="action-btn" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 6 }} onClick={() => setFitTrigger(f => f + 1)}><Camera size={16} /> Fit Scene</button>
          <button className="action-btn" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 6 }}><Save size={16} /> Save</button>
          <button className="action-btn" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 6 }}><Download size={16} /> Export</button>
        </div>
      </div>

      <div className="canvas-container">
        {loadError && (
          <div style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(239,68,68,0.9)', color: 'white', padding: '12px 20px', borderRadius: 8, zIndex: 100 }}>
            {loadError}
          </div>
        )}
        {loading ? (
          <div className="loading-screen">
            <div className="spinner"></div>
            <h2>Loading Scene...</h2>
          </div>
        ) : (
          <Scene 
            key={pointCloudUrl}
            objects={objects} 
            placedItems={placedItems}
            selectedId={selectedId} 
            onSelect={setSelectedId} 
            cameraMode={cameraMode}
            onUpdatePlacedItem={handleUpdateObject}
            placementMode={placementItem !== null}
            onSceneClick={handleSceneClick}
            viewSettings={viewSettings}
            showMeasurements={showAnalyticsPanel}
            activeHoverRec={activeHoverRec}
            showAssistantPanel={showAssistantPanel}
            showGraphPanel={showGraphPanel}
            activeGraphSource={activeGraphSource}
            activeGraphTarget={activeGraphTarget}
            showWalkablePanel={showWalkablePanel}
            onWalkableAnalyticsUpdate={setWalkableAnalytics}
            showCVPanel={showCVPanel}
            cvStage={cvStage}
            cvFrame={cvFrame}
            removedObjects={removedObjects}
            repairMode={repairMode}
            showRepairPanel={showRepairPanel}
            onRepairAnalyticsUpdate={setRepairAnalytics}
            pointCloudUrl={pointCloudUrl}
            fitTrigger={fitTrigger}
          />
        )}

        {/* Placement mode banner */}
        {placementItem && (
          <div style={{ position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', color: 'white', padding: '12px 24px', borderRadius: 30, display: 'flex', alignItems: 'center', gap: 12, zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            <span style={{ fontWeight: 600 }}>Click anywhere on the floor to place: {placementItem.name}</span>
            <button onClick={() => setPlacementItem(null)} style={{ background: 'rgba(0,0,0,0.2)', border: 'none', color: 'white', cursor: 'pointer', padding: 4, borderRadius: '50%' }}><X size={16}/></button>
          </div>
        )}

        <div className="controls-overlay glass">
          <button className="btn-primary" onClick={() => setShowVideoUpload(true)} style={{ background: 'var(--accent)', color: 'white', border: 'none' }}>
            <Film size={18} /> Upload Video
          </button>
          <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
          <button className="btn-primary" onClick={() => setShowLibrary(true)}>
            <Plus size={18} /> Add Furniture
          </button>
          <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
          <button 
            className="btn-primary" 
            style={{ background: cameraMode === 'orbit' ? 'rgba(255,255,255,0.1)' : 'transparent', border: '1px solid var(--border)' }}
            onClick={() => setCameraMode('orbit')}
          >
            <Camera size={18} /> Orbit
          </button>
          <button 
            className="btn-primary" 
            style={{ background: cameraMode === 'walk' ? 'var(--accent)' : 'transparent', border: '1px solid var(--border)' }}
            onClick={() => setCameraMode('walk')}
          >
            <Footprints size={18} /> Walk
          </button>
          <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
          <button 
            className="btn-primary" 
            style={{ background: showViewSettings ? 'rgba(255,255,255,0.1)' : 'transparent', border: '1px solid var(--border)' }}
            onClick={() => setShowViewSettings(!showViewSettings)}
          >
            <Settings2 size={18} /> View
          </button>
          <button 
            className="btn-primary" 
            style={{ background: showSemanticPanel ? 'var(--accent)' : 'transparent', border: '1px solid var(--border)', color: showSemanticPanel ? 'white' : 'var(--text-main)' }}
            onClick={() => setShowSemanticPanel(!showSemanticPanel)}
          >
            <Activity size={18} /> Semantics
          </button>
          <button 
            className="btn-primary" 
            style={{ background: showAnalyticsPanel ? '#38bdf8' : 'transparent', border: '1px solid var(--border)', color: showAnalyticsPanel ? 'white' : 'var(--text-main)' }}
            onClick={() => setShowAnalyticsPanel(!showAnalyticsPanel)}
          >
            <Ruler size={18} /> Measure
          </button>
          <button 
            className="btn-primary" 
            style={{ background: showAssistantPanel ? '#f59e0b' : 'transparent', border: '1px solid var(--border)', color: showAssistantPanel ? 'white' : 'var(--text-main)' }}
            onClick={() => setShowAssistantPanel(!showAssistantPanel)}
          >
            <Sparkles size={18} /> Assistant
          </button>
          <button 
            className="btn-primary" 
            style={{ background: showGraphPanel ? '#ec4899' : 'transparent', border: '1px solid var(--border)', color: showGraphPanel ? 'white' : 'var(--text-main)' }}
            onClick={() => setShowGraphPanel(!showGraphPanel)}
          >
            <Network size={18} /> Graph
          </button>
          <button 
            className="btn-primary" 
            style={{ background: showWalkablePanel ? '#22c55e' : 'transparent', border: '1px solid var(--border)', color: showWalkablePanel ? 'white' : 'var(--text-main)' }}
            onClick={() => setShowWalkablePanel(!showWalkablePanel)}
          >
            <Map size={18} /> Walkable
          </button>
          <button 
            className="btn-primary" 
            style={{ background: showCVPanel ? '#ec4899' : 'transparent', border: '1px solid var(--border)', color: showCVPanel ? 'white' : 'var(--text-main)' }}
            onClick={() => setShowCVPanel(!showCVPanel)}
          >
            <Layers size={18} /> Pipeline
          </button>
        </div>
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {showVideoUpload && <VideoUpload onUpload={handleUploadVideo} onClose={() => setShowVideoUpload(false)} />}
        {showLibrary && <FurnitureLibrary onClose={() => setShowLibrary(false)} onSelect={handleLibrarySelect} />}
        
        {showViewSettings && (
          <ViewSettings 
            settings={viewSettings} 
            setSettings={setViewSettings} 
            onClose={() => setShowViewSettings(false)}
            onAutoFit={() => setViewSettings(s => ({ ...s, roomScale: 1, floorHeight: -2 }))}
            onReset={() => setViewSettings({
              viewMode: 'hybrid', pointSize: 0.015, pointOpacity: 0.8,
              wallOpacity: 0.5, floorHeight: -2, roomScale: 1,
              showGrid: false, showWalls: true, showCeiling: false
            })}
            onResetCache={handleResetCache}
          />
        )}

        {showSemanticPanel && (
          <SemanticPanel 
            objects={objects}
            placedItems={placedItems}
            settings={viewSettings}
            onClose={() => setShowSemanticPanel(false)}
            url={semanticUrl}
          />
        )}

        {showAnalyticsPanel && (
          <AnalyticsPanel 
            objects={objects}
            placedItems={placedItems}
            settings={viewSettings}
            onClose={() => setShowAnalyticsPanel(false)}
            url={analysisUrl}
          />
        )}

        {showAssistantPanel && (
          <AssistantPanel 
            objects={objects}
            placedItems={placedItems}
            settings={viewSettings}
            onClose={() => setShowAssistantPanel(false)}
            onAutoPlace={handleAutoPlace}
            onHoverRec={setActiveHoverRec}
          />
        )}

        {showGraphPanel && (
          <SceneGraphPanel 
            objects={objects}
            placedItems={placedItems}
            settings={viewSettings}
            onClose={() => setShowGraphPanel(false)}
            onHoverNode={(source, target) => {
              setActiveGraphSource(source);
              setActiveGraphTarget(target);
            }}
            url={graphUrl}
          />
        )}

        {showWalkablePanel && (
          <WalkablePanel 
            analytics={walkableAnalytics}
            onClose={() => setShowWalkablePanel(false)}
          />
        )}

        {showCVPanel && (
          <CVPanel 
            settings={viewSettings}
            onClose={() => setShowCVPanel(false)}
            pipelineStage={cvStage}
            setPipelineStage={setCvStage}
            currentFrame={cvFrame}
            setCurrentFrame={setCvFrame}
            onAutoPlay={handleAutoPlay}
          />
        )}

        {selectedItem && (
          <ObjectProperties 
            object={selectedItem} 
            onClose={() => setSelectedId(null)}
            onUpdate={handleUpdateObject}
            onDelete={handleDeleteObject}
            onDuplicate={handleDuplicatePlaced}
          />
        )}
      </AnimatePresence>
      
      {/* Manual Loader Input */}
      <div style={{ position: 'absolute', top: 80, right: 20, zIndex: 10, display: 'flex', gap: 8, background: 'rgba(0,0,0,0.7)', padding: 12, borderRadius: 8 }}>
        <input 
          type="text" 
          placeholder="Load Point Cloud URL" 
          value={manualUrl} 
          onChange={e => setManualUrl(e.target.value)} 
          style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid var(--border)', borderRadius: 4, width: 250 }}
        />
        <button className="btn-primary" onClick={() => setPointCloudUrl(manualUrl)}>Load</button>
      </div>

      {/* Upload Debug Screen */}
      {uploadDebug && (
        <div style={{ position: 'absolute', bottom: 100, right: 20, zIndex: 10, background: 'rgba(0,0,0,0.85)', padding: 16, borderRadius: 8, width: 350, border: '1px solid #4ade80' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#4ade80' }}>Backend Upload Debug</h3>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6, color: '#e2e8f0', wordBreak: 'break-all' }}>
            <li><strong>Session ID:</strong> {sessionId}</li>
            <li><strong>PLY URL:</strong> {uploadDebug.point_cloud_url}</li>
            <li><strong>PLY Exists:</strong> {uploadDebug.point_cloud_exists ? 'Yes' : 'No'}</li>
            <li><strong>PLY Size:</strong> {uploadDebug.point_cloud_size_bytes} bytes</li>
            <li><strong>OBJ URL:</strong> {uploadDebug.objects_url}</li>
            <li><strong>OBJ Exists:</strong> {uploadDebug.objects_exists ? 'Yes' : 'No'}</li>
            <li><strong>OBJ Size:</strong> {uploadDebug.objects_size_bytes} bytes</li>
            <li><strong>Frontend PLY Load:</strong> {loadError ? 'Error' : 'Attempting...'}</li>
          </ul>
          <button onClick={() => setUploadDebug(null)} style={{ background: '#334155', border: 'none', color: 'white', width: '100%', padding: 6, marginTop: 12, borderRadius: 4, cursor: 'pointer' }}>Close Debug</button>
        </div>
      )}

      <ControlsHelp mode={cameraMode} />
    </>
  );
}

export default App;
