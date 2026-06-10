import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Layout, Plus, Check } from 'lucide-react';

const FLOOR_MATERIALS = [
  { id: 'marble', label: 'Solid Marble', defaultColor: '#e2e8f0' },
  { id: 'wood', label: 'Natural Wood', defaultColor: '#a97449' },
  { id: 'tile', label: 'Polished Tile', defaultColor: '#cbd5e1' },
  { id: 'carpet', label: 'Soft Carpet', defaultColor: '#d8cfc4' },
  { id: 'concrete', label: 'Smooth Concrete', defaultColor: '#94a3b8' }
];

const ROOM_TYPES = [
  { id: 'bedroom', label: 'Bedroom' },
  { id: 'living room', label: 'Living Room' },
  { id: 'dining room', label: 'Dining Room' },
  { id: 'kitchen', label: 'Kitchen' },
  { id: 'office', label: 'Office' },
  { id: 'custom', label: 'Custom Room' }
];

export default function CreateScratchModal({ onCreate, onClose }) {
  const [roomType, setRoomType] = useState('bedroom');
  const [width, setWidth] = useState(5.0);
  const [length, setLength] = useState(6.0);
  const [height, setHeight] = useState(3.0);
  const [wallColor, setWallColor] = useState('#d8d3ca');
  const [floorColor, setFloorColor] = useState('#d7d0c4');
  const [floorMaterial, setFloorMaterial] = useState('wood');
  const [includeCeiling, setIncludeCeiling] = useState(true);

  // Automatically update default floor color when material changes
  const handleMaterialChange = (matId) => {
    setFloorMaterial(matId);
    const matched = FLOOR_MATERIALS.find(m => m.id === matId);
    if (matched) {
      setFloorColor(matched.defaultColor);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate({
      roomType,
      width: parseFloat(width) || 5.0,
      length: parseFloat(length) || 6.0,
      height: parseFloat(height) || 3.0,
      wallColor,
      floorColor,
      floorMaterial,
      includeCeiling
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(8,11,18,0.85)',
        backdropFilter: 'blur(12px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <motion.div
        className="glass-panel"
        initial={{ scale: 0.94, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 20 }}
        style={{
          width: 500,
          height: 'auto',
          maxHeight: '92vh',
          overflowY: 'auto',
          position: 'relative',
          borderRadius: 20,
          border: '1px solid rgba(99,102,241,0.2)',
          boxShadow: 'var(--panel-shadow)'
        }}
      >
        {/* Header */}
        <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layout size={18} color="var(--accent)" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontFamily: "'Outfit', sans-serif", fontWeight: 700 }}>Start From Scratch</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Configure your customizable empty room</p>
            </div>
          </div>
          <button onClick={onClose} className="action-btn" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '50%', padding: 5 }}><X size={18} /></button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Room Type */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Room Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {ROOM_TYPES.map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setRoomType(type.id)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 8,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: roomType === type.id ? 'rgba(99,102,241,0.15)' : 'rgba(0,0,0,0.18)',
                    border: `1.5px solid ${roomType === type.id ? 'var(--accent)' : 'var(--border)'}`,
                    color: roomType === type.id ? 'var(--accent-hover)' : 'var(--text-main)',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => { if (roomType !== type.id) e.currentTarget.style.borderColor = 'var(--border-bright)'; }}
                  onMouseLeave={e => { if (roomType !== type.id) e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dimensions */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Room Dimensions (Meters)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Width (X bounds)</span>
                <input
                  type="number"
                  step="0.1"
                  min="2.5"
                  max="12.0"
                  value={width}
                  onChange={e => setWidth(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: 8, color: 'white', outline: 'none', fontSize: '0.82rem' }}
                />
              </div>
              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Length (Z depth)</span>
                <input
                  type="number"
                  step="0.1"
                  min="2.5"
                  max="12.0"
                  value={length}
                  onChange={e => setLength(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: 8, color: 'white', outline: 'none', fontSize: '0.82rem' }}
                />
              </div>
              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Height (Y height)</span>
                <input
                  type="number"
                  step="0.1"
                  min="1.8"
                  max="5.0"
                  value={height}
                  onChange={e => setHeight(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: 8, color: 'white', outline: 'none', fontSize: '0.82rem' }}
                />
              </div>
            </div>
          </div>

          {/* Wall & Floor Customizations */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Wall Color */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Wall Color</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="color"
                  value={wallColor}
                  onChange={e => setWallColor(e.target.value)}
                  style={{ width: 34, height: 34, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', background: 'none', padding: 0 }}
                />
                <input
                  type="text"
                  value={wallColor.toUpperCase()}
                  onChange={e => setWallColor(e.target.value)}
                  style={{ flex: 1, padding: '7px 8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: 8, color: 'white', fontSize: '0.78rem', fontFamily: 'monospace', outline: 'none' }}
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
                  onChange={e => setFloorColor(e.target.value)}
                  style={{ width: 34, height: 34, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', background: 'none', padding: 0 }}
                />
                <input
                  type="text"
                  value={floorColor.toUpperCase()}
                  onChange={e => setFloorColor(e.target.value)}
                  style={{ flex: 1, padding: '7px 8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: 8, color: 'white', fontSize: '0.78rem', fontFamily: 'monospace', outline: 'none' }}
                />
              </div>
            </div>
          </div>

          {/* Floor Material */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Floor Material</label>
            <select
              value={floorMaterial}
              onChange={e => handleMaterialChange(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(15,23,42,0.85)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: '#e2e8f0',
                fontSize: '0.8rem',
                padding: '8px 10px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {FLOOR_MATERIALS.map(mat => (
                <option key={mat.id} value={mat.id}>{mat.label}</option>
              ))}
            </select>
          </div>

          {/* Ceiling Checkbox */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
            <label 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                cursor: 'pointer', 
                fontSize: '0.85rem', 
                color: 'var(--text-main)', 
                userSelect: 'none' 
              }}
            >
              <input
                type="checkbox"
                checked={includeCeiling}
                onChange={e => setIncludeCeiling(e.target.checked)}
                style={{
                  width: 16,
                  height: 16,
                  cursor: 'pointer',
                  accentColor: 'var(--accent)'
                }}
              />
              Include ceiling in layout
            </label>
          </div>

          {/* CTA Submit Button */}
          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', fontSize: '0.92rem', padding: '12px', marginTop: 8, borderRadius: 24 }}
          >
            <Plus size={18} /> Create Room
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
