import React from 'react';
import { motion } from 'framer-motion';
import { X, RefreshCw, Sliders } from 'lucide-react';

const FLOOR_MATERIALS = [
  { id: 'marble', label: 'Solid Marble', defaultColor: '#e2e8f0' },
  { id: 'wood', label: 'Natural Wood', defaultColor: '#a97449' },
  { id: 'tile', label: 'Polished Tile', defaultColor: '#cbd5e1' },
  { id: 'carpet', label: 'Soft Carpet', defaultColor: '#d8cfc4' },
  { id: 'concrete', label: 'Smooth Concrete', defaultColor: '#94a3b8' }
];

export default function RoomSettingsPanel({ room, onUpdate, onClose }) {
  if (!room) return null;

  const width = room.dimensions?.width || 5.0;
  const length = room.dimensions?.length || 6.0;
  const height = room.dimensions?.height || 3.0;
  const wallColor = room.walls?.[0]?.color || '#d8d3ca';
  const floorColor = room.floor?.color || '#d7d0c4';
  const floorMaterial = room.floor?.material || 'wood';

  const handleUpdateField = (key, val) => {
    onUpdate({ [key]: val });
  };

  const handleMaterialChange = (matId) => {
    const matched = FLOOR_MATERIALS.find(m => m.id === matId);
    onUpdate({
      floorMaterial: matId,
      floorColor: matched ? matched.defaultColor : floorColor
    });
  };

  return (
    <motion.div
      initial={{ x: 360 }}
      animate={{ x: 0 }}
      exit={{ x: 360 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      className="glass-panel"
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        width: 320,
        boxShadow: '-4px 0 24px rgba(0,0,0,0.5)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sliders size={16} color="var(--accent)" />
          <h2 style={{ fontSize: '1rem', color: '#f8fafc', fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>Room Settings</h2>
        </div>
        <button onClick={onClose} className="action-btn" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '50%', padding: 5 }}><X size={15} /></button>
      </div>

      {/* Settings Form */}
      <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1 }}>
        {/* Width */}
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>Room Width (m)</label>
          <input
            type="number"
            step="0.1"
            min="2.5"
            max="12.0"
            value={width}
            onChange={e => handleUpdateField('width', parseFloat(e.target.value) || 5.0)}
            style={{ width: '100%', padding: '6px 8px', background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border)', color: 'white', borderRadius: 6, fontSize: '0.78rem', outline: 'none' }}
          />
        </div>

        {/* Length */}
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>Room Length (m)</label>
          <input
            type="number"
            step="0.1"
            min="2.5"
            max="12.0"
            value={length}
            onChange={e => handleUpdateField('length', parseFloat(e.target.value) || 6.0)}
            style={{ width: '100%', padding: '6px 8px', background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border)', color: 'white', borderRadius: 6, fontSize: '0.78rem', outline: 'none' }}
          />
        </div>

        {/* Height */}
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>Room Height (m)</label>
          <input
            type="number"
            step="0.1"
            min="1.8"
            max="5.0"
            value={height}
            onChange={e => handleUpdateField('height', parseFloat(e.target.value) || 3.0)}
            style={{ width: '100%', padding: '6px 8px', background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border)', color: 'white', borderRadius: 6, fontSize: '0.78rem', outline: 'none' }}
          />
        </div>

        <div style={{ margin: '4px 0', borderBottom: '1px solid var(--border)' }} />

        {/* Wall Color */}
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Wall Color</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="color"
              value={wallColor}
              onChange={e => handleUpdateField('wallColor', e.target.value)}
              style={{ width: 30, height: 30, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', background: 'none', padding: 0 }}
            />
            <input
              type="text"
              value={wallColor.toUpperCase()}
              onChange={e => handleUpdateField('wallColor', e.target.value)}
              style={{ flex: 1, padding: '6px 8px', background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border)', borderRadius: 6, color: 'white', fontSize: '0.74rem', fontFamily: 'monospace', outline: 'none' }}
            />
          </div>
        </div>

        {/* Floor Color */}
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Floor Color</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="color"
              value={floorColor}
              onChange={e => handleUpdateField('floorColor', e.target.value)}
              style={{ width: 30, height: 30, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', background: 'none', padding: 0 }}
            />
            <input
              type="text"
              value={floorColor.toUpperCase()}
              onChange={e => handleUpdateField('floorColor', e.target.value)}
              style={{ flex: 1, padding: '6px 8px', background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border)', borderRadius: 6, color: 'white', fontSize: '0.74rem', fontFamily: 'monospace', outline: 'none' }}
            />
          </div>
        </div>

        {/* Floor Material */}
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>Floor Material</label>
          <select
            value={floorMaterial}
            onChange={e => handleMaterialChange(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(15,23,42,0.85)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: '#e2e8f0',
              fontSize: '0.78rem',
              padding: '6px 8px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {FLOOR_MATERIALS.map(mat => (
              <option key={mat.id} value={mat.id}>{mat.label}</option>
            ))}
          </select>
        </div>
      </div>
    </motion.div>
  );
}
