import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Ruler, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function AnalyticsPanel({ objects, placedItems, settings, onClose, url }) {
  const [remoteData, setRemoteData] = useState(null);
  const [fetchFailed, setFetchFailed] = useState(false);

  React.useEffect(() => {
    if (url) {
      fetch(url)
        .then(res => {
          if (!res.ok) throw new Error('Not found');
          return res.json();
        })
        .then(data => setRemoteData(data))
        .catch(() => setFetchFailed(true));
    }
  }, [url]);

  const stats = useMemo(() => {
    const roomWidth = 10 * settings.roomScale;
    const roomDepth = 10 * settings.roomScale;
    const roomHeight = 4 * settings.roomScale;
    const roomArea = roomWidth * roomDepth;
    
    let occupiedArea = 0;
    const allObjects = [
      ...objects.map(o => ({ size: o.box_3d?.size || [1,1,1] })),
      ...placedItems.map(p => ({ size: p.scale }))
    ];

    allObjects.forEach(obj => {
      occupiedArea += obj.size[0] * obj.size[2];
    });

    const freeSpaceArea = Math.max(0, roomArea - occupiedArea);
    const freeSpacePercent = Math.round((freeSpaceArea / roomArea) * 100) || 0;
    const occupiedPercent = 100 - freeSpacePercent;

    let crowdednessScore = "Low";
    let statusColor = "#22c55e"; // green
    if (occupiedPercent > 60) {
      crowdednessScore = "High (Warning)";
      statusColor = "#ef4444"; // red
    } else if (occupiedPercent > 40) {
      crowdednessScore = "Medium";
      statusColor = "#f59e0b"; // orange
    }

    return {
      roomArea: roomArea.toFixed(1),
      roomDimensions: `${roomWidth.toFixed(1)}m x ${roomDepth.toFixed(1)}m x ${roomHeight.toFixed(1)}m`,
      freeSpaceArea: freeSpaceArea.toFixed(1),
      freeSpacePercent,
      occupiedPercent,
      objectCount: allObjects.length,
      crowdednessScore,
      statusColor
    };
  }, [objects, placedItems, settings.roomScale]);

  const handleExportAnalysis = () => {
    const analysisData = {
      timestamp: new Date().toISOString(),
      room_metrics: {
        dimensions: stats.roomDimensions,
        total_area_sqm: parseFloat(stats.roomArea),
        free_space_sqm: parseFloat(stats.freeSpaceArea),
        free_space_percent: stats.freeSpacePercent,
        crowdedness_score: stats.crowdednessScore
      },
      furniture_metrics: {
        total_count: stats.objectCount,
        detected_objects: objects.map(o => ({ id: o.id, label: o.label, dimensions: o.box_3d?.size })),
        placed_objects: placedItems.map(p => ({ id: p.id, label: p.name, dimensions: p.scale }))
      }
    };

    const blob = new Blob([JSON.stringify(analysisData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'room_analysis.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div 
      initial={{ x: -320 }}
      animate={{ x: 0 }}
      exit={{ x: -320 }}
      className="glass-panel"
      style={{ position: 'absolute', top: 60, left: 24, zIndex: 45, width: 320, height: 'auto', maxHeight: '80vh' }}
    >
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Ruler size={20} color="#38bdf8" />
          <h2 style={{ fontSize: '1.1rem' }}>Spatial Analysis</h2>
        </div>
        <button onClick={onClose} className="action-btn">✕</button>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
        
        {url && fetchFailed ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Ruler size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <p>Not available yet</p>
          </div>
        ) : (
          <>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12, border: `1px solid ${remoteData?.scene?.complexity ? (remoteData.scene.complexity === 'High' ? '#ef4444' : '#22c55e') : stats.statusColor}` }}>
              {(remoteData?.scene?.complexity === 'High' || stats.crowdednessScore.includes('High')) ? <AlertTriangle size={24} color="#ef4444" /> : <ShieldCheck size={24} color="#22c55e" />}
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Crowdedness</p>
                <p style={{ fontSize: '1rem', fontWeight: 'bold', color: remoteData?.scene?.complexity === 'High' ? '#ef4444' : '#22c55e', margin: 0 }}>{remoteData?.scene?.complexity || stats.crowdednessScore}</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {remoteData?.scene?.estimated_room_type && (
                <StatRow label="Estimated Room Type" value={remoteData.scene.estimated_room_type} color="#a855f7" />
              )}
              <StatRow label="Room Dimensions" value={remoteData?.dimensions ? `${remoteData.dimensions.width}m x ${remoteData.dimensions.length}m x ${remoteData.dimensions.height}m` : stats.roomDimensions} />
              <StatRow label="Total Room Area" value={`${remoteData?.space?.floor_area || stats.roomArea} m²`} />
              <StatRow label="Free Walking Space" value={`${remoteData?.space?.free_percentage || stats.freeSpacePercent}%`} color="#38bdf8" />
              <StatRow label="Occupied Area" value={`${remoteData?.space?.occupied_percentage || stats.occupiedPercent}%`} color={(remoteData?.space?.occupied_percentage || stats.occupiedPercent) > 60 ? '#ef4444' : 'var(--text-main)'} />
              <StatRow label="Furniture Count" value={remoteData?.space?.object_density ? Math.round(remoteData.space.object_density * remoteData.space.floor_area) : stats.objectCount} />
            </div>
          </>
        )}

        <button 
          onClick={handleExportAnalysis}
          className="btn-primary" 
          style={{ marginTop: 12, display: 'flex', justifyContent: 'center', background: 'rgba(56, 189, 248, 0.2)', border: '1px solid #38bdf8' }}
        >
          <Download size={16} /> Export room_analysis.json
        </button>
      </div>
    </motion.div>
  );
}

function StatRow({ label, value, color = 'var(--text-main)' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: '0.85rem', fontWeight: 600, color }}>{value}</span>
    </div>
  );
}
