import React from 'react';
import { motion } from 'framer-motion';
import { X, Copy, Trash2, Maximize, RotateCw } from 'lucide-react';

export default function ObjectProperties({ object, onClose, onUpdate, onDelete, onDuplicate }) {
  if (!object) return null;

  return (
    <motion.div 
      initial={{ x: 320 }}
      animate={{ x: 0 }}
      exit={{ x: 320 }}
      className="glass-panel"
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, zIndex: 50, width: 320 }}
    >
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Properties</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{object.name || object.label}</p>
        </div>
        <button onClick={onClose} className="action-btn"><X size={20}/></button>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
        
        {/* Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button 
            onClick={() => onDuplicate(object)}
            style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 6, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}
          >
            <Copy size={16} /> Duplicate
          </button>
          <button 
            onClick={() => onDelete(object.id)}
            style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 6, color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}
          >
            <Trash2 size={16} /> Delete
          </button>
        </div>

        {/* Position */}
        <div>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Position</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {['x', 'y', 'z'].map((axis, i) => (
              <div key={axis} style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '0.75rem', color: '#6366f1' }}>{axis.toUpperCase()}</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={object.position?.[i] || 0}
                  onChange={(e) => {
                    const newPos = [...(object.position || [0,0,0])];
                    newPos[i] = parseFloat(e.target.value) || 0;
                    onUpdate(object.id, { position: newPos });
                  }}
                  style={{ width: '100%', padding: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', color: 'white', borderRadius: 4 }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Rotation */}
        <div>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Rotation (deg)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {['x', 'y', 'z'].map((axis, i) => (
              <div key={axis} style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '0.75rem', color: '#22c55e' }}>{axis.toUpperCase()}</label>
                <input 
                  type="number" 
                  step="15"
                  value={Math.round(((object.rotation?.[i] || 0) * 180) / Math.PI)}
                  onChange={(e) => {
                    const newRot = [...(object.rotation || [0,0,0])];
                    newRot[i] = (parseFloat(e.target.value) || 0) * (Math.PI / 180);
                    onUpdate(object.id, { rotation: newRot });
                  }}
                  style={{ width: '100%', padding: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', color: 'white', borderRadius: 4 }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Scale */}
        <div>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Scale</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {['x', 'y', 'z'].map((axis, i) => (
              <div key={axis} style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '0.75rem', color: '#eab308' }}>{axis.toUpperCase()}</label>
                <input 
                  type="number" 
                  step="0.1"
                  min="0.1"
                  value={object.scale?.[i] ?? 1}
                  onChange={(e) => {
                    const newScale = [...(object.scale || [1,1,1])];
                    newScale[i] = parseFloat(e.target.value) || 0.1;
                    onUpdate(object.id, { scale: newScale });
                  }}
                  style={{ width: '100%', padding: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', color: 'white', borderRadius: 4 }}
                />
              </div>
            ))}
          </div>
        </div>

      </div>
    </motion.div>
  );
}
