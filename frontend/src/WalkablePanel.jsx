import React from 'react';
import { motion } from 'framer-motion';
import { Map, Footprints, AlertTriangle, CheckCircle, Navigation } from 'lucide-react';

export default function WalkablePanel({ analytics, onClose }) {
  if (!analytics) return null;

  return (
    <motion.div 
      initial={{ x: -320 }}
      animate={{ x: 0 }}
      exit={{ x: -320 }}
      className="glass-panel"
      style={{ position: 'absolute', top: 60, left: 24, zIndex: 70, width: 340, height: 'auto' }}
    >
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Map size={20} color="#22c55e" />
          <h2 style={{ fontSize: '1.1rem' }}>Walkability Map</h2>
        </div>
        <button onClick={onClose} className="action-btn">✕</button>
      </div>

      <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        <div style={{ 
          background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 8, 
          display: 'flex', alignItems: 'center', gap: 12, 
          border: `1px solid ${analytics.freedomScore === 'Poor' ? '#ef4444' : analytics.freedomScore === 'Moderate' ? '#facc15' : '#22c55e'}` 
        }}>
          {analytics.freedomScore === 'Poor' ? <AlertTriangle size={28} color="#ef4444" /> : <CheckCircle size={28} color="#22c55e" />}
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Movement Freedom</p>
            <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: analytics.freedomScore === 'Poor' ? '#ef4444' : '#22c55e', margin: 0 }}>
              {analytics.freedomScore}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <StatRow 
            icon={<Footprints size={16} color="#22c55e" />} 
            label="Walkable Area" 
            value={`${analytics.walkPercent}%`} 
            color="#22c55e" 
          />
          <StatRow 
            icon={<Navigation size={16} color="#facc15" />} 
            label="Narrow Pathways" 
            value={`${analytics.narrowPercent}%`} 
            color="#facc15" 
          />
          <StatRow 
            icon={<AlertTriangle size={16} color="#ef4444" />} 
            label="Blocked / Obstacles" 
            value={`${analytics.blockedPercent}%`} 
            color="#ef4444" 
          />
        </div>

        <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          <p style={{ margin: '0 0 4px 0' }}><span style={{ color: '#22c55e' }}>■ Green:</span> Clear movement zones</p>
          <p style={{ margin: '0 0 4px 0' }}><span style={{ color: '#facc15' }}>■ Yellow:</span> Restricted / narrow pathways</p>
          <p style={{ margin: '0 0 4px 0' }}><span style={{ color: '#ef4444' }}>■ Red:</span> Collision zones & obstacles</p>
          <p style={{ margin: '0 0 4px 0' }}><span style={{ color: '#3b82f6' }}>— Blue Line:</span> AI simulated walk path</p>
        </div>
      </div>
    </motion.div>
  );
}

function StatRow({ icon, label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon}
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{label}</span>
      </div>
      <span style={{ fontSize: '0.9rem', fontWeight: 600, color }}>{value}</span>
    </div>
  );
}
