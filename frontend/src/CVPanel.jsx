import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Camera, Box, Activity, Layers, Crosshair } from 'lucide-react';
import { generateCVData } from './CVReconstructionEngine';

export default function CVPanel({ settings, onClose, pipelineStage, setPipelineStage, currentFrame, setCurrentFrame, onAutoPlay }) {
  const cvData = useMemo(() => generateCVData(settings), [settings]);
  const stats = cvData.analytics;

  const stages = [
    { id: 1, name: 'Raw Frames & Poses', desc: 'Camera trajectory and view frustums.', icon: <Camera size={16}/> },
    { id: 2, name: 'Feature Matching', desc: 'Keypoint detection and multi-view correspondences.', icon: <Crosshair size={16}/> },
    { id: 3, name: 'Depth Estimation', desc: 'Dense point cloud triangulation.', icon: <Activity size={16}/> },
    { id: 4, name: 'Semantic Layout', desc: 'Object bounding box regression.', icon: <Box size={16}/> }
  ];

  return (
    <motion.div 
      initial={{ x: -320 }}
      animate={{ x: 0 }}
      exit={{ x: -320 }}
      className="glass-panel"
      style={{ position: 'absolute', top: 60, left: 24, zIndex: 80, width: 340, height: 'auto', maxHeight: '85vh', overflowY: 'auto' }}
    >
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Layers size={20} color="#ec4899" />
          <h2 style={{ fontSize: '1.1rem' }}>CV Reconstruction</h2>
        </div>
        <button onClick={onClose} className="action-btn">✕</button>
      </div>

      <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Timeline Slider */}
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Frame Timeline</span>
            <span style={{ fontSize: '0.8rem', color: '#ec4899', fontWeight: 'bold' }}>{currentFrame} / {stats.totalFrames - 1}</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max={stats.totalFrames - 1} 
            value={currentFrame} 
            onChange={(e) => setCurrentFrame(parseInt(e.target.value))}
            style={{ width: '100%', accentColor: '#ec4899' }}
          />
          <button 
            onClick={onAutoPlay}
            style={{ width: '100%', marginTop: 8, padding: 6, background: 'rgba(236, 72, 153, 0.2)', border: '1px solid #ec4899', color: '#f8fafc', borderRadius: 4, cursor: 'pointer' }}
          >
            Auto Play Timeline
          </button>
        </div>

        {/* Analytics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <StatBox label="Matched Features" value={stats.matchedFeatures.toLocaleString()} />
          <StatBox label="Point Count" value={stats.pointCount.toLocaleString()} />
          <StatBox label="Processing Time" value={stats.processingTime} />
          <StatBox label="Confidence" value={stats.confidence} color="#10b981" />
        </div>

        <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '8px 0 0', textTransform: 'uppercase' }}>Pipeline Stages</h3>
        
        {/* Stages Toggle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {stages.map(stage => (
            <div 
              key={stage.id}
              onClick={() => setPipelineStage(stage.id)}
              style={{
                background: pipelineStage === stage.id ? 'rgba(236, 72, 153, 0.2)' : 'rgba(0,0,0,0.3)',
                border: `1px solid ${pipelineStage === stage.id ? '#ec4899' : 'var(--border)'}`,
                padding: 10, borderRadius: 6, cursor: 'pointer', transition: '0.2s',
                display: 'flex', gap: 12, alignItems: 'center'
              }}
            >
              <div style={{ color: pipelineStage === stage.id ? '#ec4899' : 'var(--text-muted)' }}>
                {stage.icon}
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: pipelineStage === stage.id ? '#f8fafc' : 'var(--text-main)' }}>
                  {stage.name}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{stage.desc}</div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </motion.div>
  );
}

function StatBox({ label, value, color = 'var(--text-main)' }) {
  return (
    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color }}>{value}</span>
    </div>
  );
}
