import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Activity, X } from 'lucide-react';

export default function SemanticPanel({ objects, placedItems, settings, onClose, url }) {
  const [remoteData, setRemoteData] = useState(null);
  const [fetchFailed, setFetchFailed] = useState(false);

  useEffect(() => {
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
    const furnitureCount = objects.length + placedItems.length;
    
    // Simple mock calculation for walkable area based on room scale
    const roomWidth = 10 * settings.roomScale;
    const roomDepth = 10 * settings.roomScale;
    const totalArea = roomWidth * roomDepth;
    
    // Estimate obstacle area (1.5 sq units per furniture on average)
    const obstacleArea = Math.min(totalArea, furnitureCount * 1.5);
    const walkableArea = totalArea - obstacleArea;
    const walkablePercent = Math.round((walkableArea / totalArea) * 100) || 0;
    
    return {
      furnitureCount,
      totalRegions: 4 + furnitureCount, // Floor + 3 Walls + Furniture
      numWalls: 3,
      walkablePercent,
      obstacleDensity: Math.round((obstacleArea / totalArea) * 100) || 0,
      roomSize: `${Math.round(roomWidth)}m x ${Math.round(roomDepth)}m`,
      totalArea: Math.round(totalArea)
    };
  }, [objects, placedItems, settings.roomScale]);

  const handleExportSemanticJson = () => {
    const semanticData = {
      room_stats: stats,
      semantic_regions: [
        { id: 'floor', category: 'Floor', position: [0, settings.floorHeight, 0], confidence: 1.0, semantic_role: 'Walkable base' },
        { id: 'wall_left', category: 'Wall', position: [-5 * settings.roomScale, settings.floorHeight + 2*settings.roomScale, 0], confidence: 0.9, semantic_role: 'Boundary' },
        { id: 'wall_right', category: 'Wall', position: [5 * settings.roomScale, settings.floorHeight + 2*settings.roomScale, 0], confidence: 0.9, semantic_role: 'Boundary' },
        { id: 'wall_back', category: 'Wall', position: [0, settings.floorHeight + 2*settings.roomScale, -5 * settings.roomScale], confidence: 0.9, semantic_role: 'Boundary' }
      ],
      objects: [
        ...objects.map(o => ({
          id: o.id, category: o.label, position: o.box_3d?.center,
          confidence: o.confidence, semantic_role: 'Furniture/Obstacle',
          spatial_relations: ['on_floor']
        })),
        ...placedItems.map(p => ({
          id: p.id, category: p.name, position: p.position,
          confidence: 1.0, semantic_role: 'User Placed',
          spatial_relations: ['on_floor']
        }))
      ]
    };

    const blob = new Blob([JSON.stringify(semanticData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'semantic_scene.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div 
      initial={{ x: -320 }}
      animate={{ x: 0 }}
      exit={{ x: -320 }}
      className="glass-panel"
      style={{ position: 'absolute', top: 60, left: 24, zIndex: 40, width: 300, height: 'auto', maxHeight: '80vh' }}
    >
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={20} color="#8b5cf6" />
          <h2 style={{ fontSize: '1.1rem' }}>Semantic Analysis</h2>
        </div>
        <button onClick={onClose} className="action-btn"><X size={18}/></button>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
        
        {url && fetchFailed ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Activity size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <p>Not available yet</p>
          </div>
        ) : remoteData ? (
          <>
            <StatRow label="Total Regions" value={remoteData.semantic_regions ? remoteData.semantic_regions.length : stats.totalRegions} />
            <StatRow label="Detected Walls" value={remoteData.semantic_regions ? remoteData.semantic_regions.filter(r => r.type === 'wall').length : stats.numWalls} />
            <StatRow label="Furniture Count" value={remoteData.objects ? remoteData.objects.length : stats.furnitureCount} />
            <StatRow label="Walkable Area" value={`${remoteData.walkable_area?.percentage || stats.walkablePercent}%`} color="#22c55e" />
            <StatRow label="Obstacle Density" value={`${remoteData.walkable_area?.percentage ? 100 - remoteData.walkable_area.percentage : stats.obstacleDensity}%`} color="#ef4444" />
            <StatRow label="Est. Room Size" value={stats.roomSize} />
          </>
        ) : (
          <>
            <StatRow label="Total Regions" value={stats.totalRegions} />
            <StatRow label="Detected Walls" value={stats.numWalls} />
            <StatRow label="Furniture Count" value={stats.furnitureCount} />
            <StatRow label="Walkable Area" value={`${stats.walkablePercent}%`} color="#22c55e" />
            <StatRow label="Obstacle Density" value={`${stats.obstacleDensity}%`} color="#ef4444" />
            <StatRow label="Est. Room Size" value={stats.roomSize} />
          </>
        )}

        <button 
          onClick={handleExportSemanticJson}
          className="btn-primary" 
          style={{ marginTop: 12, display: 'flex', justifyContent: 'center', background: 'rgba(139, 92, 246, 0.2)', border: '1px solid #8b5cf6' }}
        >
          <Download size={16} /> Export semantic_scene.json
        </button>
      </div>
    </motion.div>
  );
}

function StatRow({ label, value, color = 'var(--text-main)' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: '0.9rem', fontWeight: 600, color }}>{value}</span>
    </div>
  );
}
