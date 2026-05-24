import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Ruler, Scale, Download, RefreshCw, Layers, Check, AlertCircle } from 'lucide-react';

export default function MeasurementPanel({
  objects,
  placedItems,
  selectedId,
  onSelect,
  roomAnalysis,
  pcStats,
  scaleFactor,
  calibrationInfo,
  onCalibrateHeight,
  onCalibrateObject,
  onResetCalibration,
  distancePickerActive,
  onToggleDistancePicker,
  distancePickerObjects,
  onClose,
}) {
  const [calibMode, setCalibMode] = useState('height'); // 'height' or 'object'
  const [knownHeight, setKnownHeight] = useState('2.8');
  const [selectedCalibObjId, setSelectedCalibObjId] = useState('');
  const [knownObjDim, setKnownObjDim] = useState('2.0');
  const [distObjA, setDistObjA] = useState('');
  const [distObjB, setDistObjB] = useState('');

  // 1. Get raw room dimensions from point cloud or backend analysis
  const rawDimensions = useMemo(() => {
    if (pcStats) {
      return {
        width: pcStats.size.x,
        length: pcStats.size.z,
        height: pcStats.size.y,
        area: pcStats.size.x * pcStats.size.z,
      };
    }
    if (roomAnalysis?.dimensions) {
      const w = roomAnalysis.dimensions.width_m || roomAnalysis.dimensions.width || 5.0;
      const l = roomAnalysis.dimensions.length_m || roomAnalysis.dimensions.length || 5.0;
      const h = roomAnalysis.dimensions.height_m || roomAnalysis.dimensions.height || 3.0;
      return { width: w, length: l, height: h, area: w * l };
    }
    return { width: 5.0, length: 5.0, height: 3.0, area: 25.0 };
  }, [pcStats, roomAnalysis]);

  // Calibrated room dimensions
  const calibRoom = useMemo(() => {
    return {
      width: rawDimensions.width * scaleFactor,
      length: rawDimensions.length * scaleFactor,
      height: rawDimensions.height * scaleFactor,
      area: rawDimensions.area * scaleFactor * scaleFactor,
    };
  }, [rawDimensions, scaleFactor]);

  // Compile list of all selectable objects in the scene
  const allObjects = useMemo(() => {
    const list = [];
    objects.forEach(o => {
      list.push({
        id: o.id,
        label: o.label,
        type: 'detected',
        size: o.box_3d?.size || [1, 1, 1],
        position: o.box_3d?.base_position || o.position_world || [0, 0, 0],
        source: o.source || 'yolo',
        confidence: o.confidence || 0.7,
        quality: o.placement_quality,
        source_frame: o.source_frame,
      });
    });
    placedItems.forEach(p => {
      list.push({
        id: p.id,
        label: p.name,
        type: 'placed',
        size: p.scale || [1, 1, 1],
        position: p.position || [0, 0, 0],
        source: 'user_placed',
        confidence: 1.0,
        quality: 'good',
        source_frame: null,
      });
    });
    return list;
  }, [objects, placedItems]);

  // Selected object sizing details
  const selectedObjDetails = useMemo(() => {
    if (!selectedId) return null;
    const obj = allObjects.find(o => o.id === selectedId);
    if (!obj) return null;

    const [w, h, d] = obj.size;
    const width_c = w * scaleFactor;
    const height_c = h * scaleFactor;
    const depth_c = d * scaleFactor;

    let confLabel = 'Medium confidence';
    let confColor = '#f59e0b'; // orange
    
    if (obj.type === 'placed') {
      confLabel = 'High confidence (Placed)';
      confColor = '#22c55e'; // green
    } else if (calibrationInfo.status === 'Calibrated') {
      confLabel = 'High confidence (Calibrated)';
      confColor = '#22c55e';
    } else if (obj.quality === 'estimated') {
      confLabel = 'Low confidence (Estimated)';
      confColor = '#f43f5e'; // red
    } else if (obj.confidence > 0.8) {
      confLabel = 'High confidence (Multi-frame)';
      confColor = '#22c55e';
    }

    return {
      ...obj,
      dimensions: `${width_c.toFixed(2)}m x ${height_c.toFixed(2)}m x ${depth_c.toFixed(2)}m`,
      w: width_c,
      h: height_c,
      d: depth_c,
      confLabel,
      confColor,
    };
  }, [selectedId, allObjects, scaleFactor, calibrationInfo]);

  // Calculate distance between Object A and Object B
  const calculatedDistance = useMemo(() => {
    const activeA = distancePickerActive ? distancePickerObjects[0] : distObjA;
    const activeB = distancePickerActive ? distancePickerObjects[1] : distObjB;

    if (!activeA || !activeB || activeA === activeB) return null;

    const objA = allObjects.find(o => o.id === activeA);
    const objB = allObjects.find(o => o.id === activeB);

    if (!objA || !objB) return null;

    const pA = objA.position;
    const pB = objB.position;

    // Euclidean distance in 3D
    const dx = pA[0] - pB[0];
    const dy = pA[1] - pB[1];
    const dz = pA[2] - pB[2];
    const rawDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    return {
      distance: rawDist * scaleFactor,
      objAName: `${objA.label} (${objA.id.toString().substring(0, 5)})`,
      objBName: `${objB.label} (${objB.id.toString().substring(0, 5)})`,
    };
  }, [distObjA, distObjB, allObjects, scaleFactor, distancePickerActive, distancePickerObjects]);

  // Perform calibration based on room height
  const handleCalibHeight = () => {
    const val = parseFloat(knownHeight);
    if (!isNaN(val) && val > 0) {
      onCalibrateHeight(val, rawDimensions.height);
    }
  };

  // Perform calibration based on selected object dimension (using its largest dimension as length)
  const handleCalibObj = () => {
    const val = parseFloat(knownObjDim);
    const obj = allObjects.find(o => o.id === selectedCalibObjId);
    if (!isNaN(val) && val > 0 && obj) {
      // Find largest dimension of the object (typically length)
      const maxDim = Math.max(...obj.size);
      onCalibrateObject(obj.id, val, maxDim);
    }
  };

  // Export report measurements_report.json
  const handleExportReport = () => {
    // Generate pair-wise distances for close objects (< 3m)
    const reportDistances = [];
    for (let i = 0; i < allObjects.length; i++) {
      for (let j = i + 1; j < allObjects.length; j++) {
        const a = allObjects[i];
        const b = allObjects[j];
        const dx = a.position[0] - b.position[0];
        const dy = a.position[1] - b.position[1];
        const dz = a.position[2] - b.position[2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) * scaleFactor;
        
        if (d < 3.0) {
          reportDistances.push({
            from_id: a.id,
            from_label: a.label,
            to_id: b.id,
            to_label: b.label,
            distance_m: parseFloat(d.toFixed(2)),
          });
        }
      }
    }

    const report = {
      timestamp: new Date().toISOString(),
      room_dimensions: {
        width_m: parseFloat(calibRoom.width.toFixed(2)),
        length_m: parseFloat(calibRoom.length.toFixed(2)),
        height_m: parseFloat(calibRoom.height.toFixed(2)),
        floor_area_m2: parseFloat(calibRoom.area.toFixed(2)),
      },
      scale_calibration: {
        scale_factor: parseFloat(scaleFactor.toFixed(4)),
        scale_source: calibrationInfo.source || 'estimated_from_point_cloud',
        calibration_value: calibrationInfo.value || null,
        status: calibrationInfo.status || 'Estimated',
        confidence: calibrationInfo.status === 'Calibrated' ? 'High' : 'Medium (Uncalibrated)',
      },
      objects: allObjects.map(obj => ({
        id: obj.id,
        label: obj.label,
        type: obj.type,
        size_m: {
          width: parseFloat((obj.size[0] * scaleFactor).toFixed(2)),
          height: parseFloat((obj.size[1] * scaleFactor).toFixed(2)),
          depth: parseFloat((obj.size[2] * scaleFactor).toFixed(2)),
        },
        confidence: obj.type === 'placed' || calibrationInfo.status === 'Calibrated' ? 'High' : (obj.quality === 'estimated' ? 'Low' : 'Medium'),
        source: obj.type === 'placed' ? 'user_placed' : (obj.quality === 'estimated' ? 'default_size_approximation' : 'reconstructed_from_video'),
      })),
      distances: reportDistances,
      disclaimer: 'Measurements are approximate estimates. Monocular video has scale ambiguity unless calibrated against a known room reference.',
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'measurements_report.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ x: -320 }}
      animate={{ x: 0 }}
      exit={{ x: -320 }}
      className="glass-panel"
      style={{
        position: 'absolute',
        top: 60,
        left: 24,
        zIndex: 45,
        width: 320,
        height: 'auto',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Ruler size={20} color="#06b6d4" />
          <h2 style={{ fontSize: '1.1rem' }}>Sizing & Measurements</h2>
        </div>
        <button onClick={onClose} className="action-btn">✕</button>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1 }}>
        {/* Calibration Banner */}
        <div style={{
          background: calibrationInfo.status === 'Calibrated' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.07)',
          border: `1px solid ${calibrationInfo.status === 'Calibrated' ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.2)'}`,
          padding: '10px 12px',
          borderRadius: 8,
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
        }}>
          {calibrationInfo.status === 'Calibrated' ? (
            <Check size={18} color="#22c55e" style={{ marginTop: 2, flexShrink: 0 }} />
          ) : (
            <AlertCircle size={18} color="#fbbf24" style={{ marginTop: 2, flexShrink: 0 }} />
          )}
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: calibrationInfo.status === 'Calibrated' ? '#22c55e' : '#fbbf24' }}>
              Scale Status: {calibrationInfo.status}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>
              {calibrationInfo.status === 'Calibrated' 
                ? `Calibrated using: ${calibrationInfo.source === 'user_calibrated_room_height' ? `Room Height (${calibrationInfo.value}m)` : `Object Size (${calibrationInfo.value}m)`}`
                : 'Monocular video scale has depth ambiguity. Values are estimated. Calibrate for accuracy.'}
            </div>
          </div>
        </div>

        {/* Room Dimensions */}
        <div>
          <div className="section-label" style={{ marginBottom: 8 }}>Estimated Room Size</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <StatLine label="Room Width (X)" value={`${calibRoom.width.toFixed(2)} m`} />
            <StatLine label="Room Length (Z)" value={`${calibRoom.length.toFixed(2)} m`} />
            <StatLine label="Room Height (Y)" value={`${calibRoom.height.toFixed(2)} m`} />
            <StatLine label="Estimated Floor Area" value={`${calibRoom.area.toFixed(2)} m²`} highlight />
          </div>
        </div>

        {/* Scale Calibration Controls */}
        <div>
          <div className="section-label" style={{ marginBottom: 8, display: 'flex', justifyItems: 'center', gap: 5 }}>
            <Scale size={14} style={{ marginTop: 2 }} />
            <span>Scale Calibration</span>
          </div>

          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', padding: 2, borderRadius: 6, marginBottom: 10 }}>
            <button
              onClick={() => setCalibMode('height')}
              style={{
                flex: 1, padding: '5px', border: 'none', cursor: 'pointer', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600,
                background: calibMode === 'height' ? 'var(--accent)' : 'transparent',
                color: calibMode === 'height' ? 'white' : 'var(--text-muted)',
              }}
            >
              Room Height
            </button>
            <button
              onClick={() => setCalibMode('object')}
              style={{
                flex: 1, padding: '5px', border: 'none', cursor: 'pointer', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600,
                background: calibMode === 'object' ? 'var(--accent)' : 'transparent',
                color: calibMode === 'object' ? 'white' : 'var(--text-muted)',
              }}
            >
              Known Object Size
            </button>
          </div>

          {calibMode === 'height' ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="number"
                step="0.1"
                min="1.0"
                value={knownHeight}
                onChange={e => setKnownHeight(e.target.value)}
                style={{
                  background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 6,
                  color: 'white', padding: '6px 8px', width: '70px', fontSize: '0.8rem', textAlign: 'center'
                }}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>meters</span>
              <button onClick={handleCalibHeight} className="btn-primary" style={{ flex: 1, padding: '6px 10px', fontSize: '0.75rem', height: '30px', justifyContent: 'center' }}>
                Calibrate Height
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <select
                value={selectedCalibObjId}
                onChange={e => setSelectedCalibObjId(e.target.value)}
                style={{
                  background: 'rgba(14,18,28,0.95)', border: '1px solid var(--border)', borderRadius: 6,
                  color: 'white', padding: '6px 8px', fontSize: '0.75rem', width: '100%'
                }}
              >
                <option value="">-- Select Object --</option>
                {allObjects.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.label} ({o.id.toString().substring(0, 5)})
                  </option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={knownObjDim}
                  onChange={e => setKnownObjDim(e.target.value)}
                  style={{
                    background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 6,
                    color: 'white', padding: '6px 8px', width: '70px', fontSize: '0.8rem', textAlign: 'center'
                  }}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>meters</span>
                <button
                  disabled={!selectedCalibObjId}
                  onClick={handleCalibObj}
                  className="btn-primary"
                  style={{ flex: 1, padding: '6px 10px', fontSize: '0.75rem', height: '30px', justifyContent: 'center', opacity: selectedCalibObjId ? 1 : 0.5 }}
                >
                  Calibrate Size
                </button>
              </div>
            </div>
          )}

          {calibrationInfo.status === 'Calibrated' && (
            <button
              onClick={onResetCalibration}
              style={{
                marginTop: 8, width: '100%', background: 'transparent', border: '1px solid rgba(244,63,94,0.3)',
                borderRadius: 6, color: '#f43f5e', fontSize: '0.72rem', padding: '5px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
              }}
            >
              <RefreshCw size={12} /> Reset to Defaults
            </button>
          )}
        </div>

        {/* Selected Object Details */}
        <div>
          <div className="section-label" style={{ marginBottom: 8 }}>Object Dimensions</div>
          {selectedObjDetails ? (
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <h4 style={{ textTransform: 'capitalize', margin: 0, fontSize: '0.85rem', fontWeight: 700 }}>
                  {selectedObjDetails.label}
                </h4>
                <span style={{
                  background: selectedObjDetails.confColor + '22',
                  color: selectedObjDetails.confColor,
                  border: `1px solid ${selectedObjDetails.confColor}44`,
                  padding: '1px 6px',
                  borderRadius: 8,
                  fontSize: '0.62rem',
                  fontWeight: 600
                }}>
                  {selectedObjDetails.quality === 'estimated' ? 'Estimated' : 'Measured'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Width:</span>
                  <span>{selectedObjDetails.w.toFixed(2)} m</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Height:</span>
                  <span>{selectedObjDetails.h.toFixed(2)} m</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Depth:</span>
                  <span>{selectedObjDetails.d.toFixed(2)} m</span>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 4, color: selectedObjDetails.confColor, fontSize: '0.65rem', fontWeight: 600 }}>
                  {selectedObjDetails.confLabel}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0', border: '1px dashed var(--border)', borderRadius: 8 }}>
              Select an object in the scene to view dimensions
            </div>
          )}
        </div>

        {/* Distance Calculators */}
        <div>
          <div className="section-label" style={{ marginBottom: 8 }}>Distance Measuring Tool</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '60px' }}>Object A:</span>
              <select
                disabled={distancePickerActive}
                value={distancePickerActive ? (distancePickerObjects[0] || '') : distObjA}
                onChange={e => setDistObjA(e.target.value)}
                style={{
                  flex: 1, background: 'rgba(14,18,28,0.95)', border: '1px solid var(--border)', borderRadius: 6,
                  color: 'white', padding: '5px 8px', fontSize: '0.75rem', opacity: distancePickerActive ? 0.6 : 1
                }}
              >
                <option value="">-- Select Object --</option>
                {allObjects.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.label} ({o.id.toString().substring(0, 5)})
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '60px' }}>Object B:</span>
              <select
                disabled={distancePickerActive}
                value={distancePickerActive ? (distancePickerObjects[1] || '') : distObjB}
                onChange={e => setDistObjB(e.target.value)}
                style={{
                  flex: 1, background: 'rgba(14,18,28,0.95)', border: '1px solid var(--border)', borderRadius: 6,
                  color: 'white', padding: '5px 8px', fontSize: '0.75rem', opacity: distancePickerActive ? 0.6 : 1
                }}
              >
                <option value="">-- Select Object --</option>
                {allObjects.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.label} ({o.id.toString().substring(0, 5)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={onToggleDistancePicker}
            className="btn-primary"
            style={{
              width: '100%', padding: '6px 10px', fontSize: '0.75rem', justifyContent: 'center', gap: 6,
              background: distancePickerActive ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${distancePickerActive ? 'var(--teal)' : 'var(--border)'}`,
              color: distancePickerActive ? 'var(--teal)' : 'white'
            }}
          >
            <Layers size={14} />
            {distancePickerActive ? 'Picker Active (Click 2 objects)' : 'Enable 3D Distance Picker'}
          </button>

          {calculatedDistance && (
            <div style={{
              background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.25)',
              padding: 10, borderRadius: 8, marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4
            }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                {calculatedDistance.objAName} ↔ {calculatedDistance.objBName}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Distance:</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--teal)' }}>
                  {calculatedDistance.distance.toFixed(2)} m
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Export JSON Report */}
        <button
          onClick={handleExportReport}
          className="btn-primary"
          style={{
            marginTop: 8, display: 'flex', justifyContent: 'center', background: 'rgba(6, 182, 212, 0.12)',
            border: '1px solid rgba(6, 182, 212, 0.4)', color: 'var(--teal)'
          }}
        >
          <Download size={16} /> Export measurements_report.json
        </button>
      </div>
    </motion.div>
  );
}

function StatLine({ label, value, highlight = false, color = 'var(--text-main)' }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)',
      paddingBottom: 6, paddingTop: 2,
      background: highlight ? 'rgba(255,255,255,0.01)' : 'transparent',
    }}>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: '0.8rem', fontWeight: highlight ? 700 : 600, color: highlight ? 'var(--teal)' : color }}>{value}</span>
    </div>
  );
}
