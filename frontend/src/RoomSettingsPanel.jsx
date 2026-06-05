import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Sliders, Sparkles, Check } from 'lucide-react';

const FLOOR_MATERIALS = [
  { id: 'marble', label: 'Solid Marble', defaultColor: '#e2e8f0' },
  { id: 'wood', label: 'Natural Wood', defaultColor: '#a97449' },
  { id: 'tile', label: 'Polished Tile', defaultColor: '#cbd5e1' },
  { id: 'carpet', label: 'Soft Carpet', defaultColor: '#d8cfc4' },
  { id: 'concrete', label: 'Smooth Concrete', defaultColor: '#94a3b8' }
];

const THEMES = {
  modern: {
    label: 'Modern',
    wallColor: '#e2e8f0',
    floorMaterial: 'concrete',
    floorColor: '#94a3b8',
    color: '#1f2937',
    desc: 'Cool tones, clean concrete surfaces, dark accents.'
  },
  luxury: {
    label: 'Luxury',
    wallColor: '#faebd7',
    floorMaterial: 'marble',
    floorColor: '#ded3c3',
    color: '#bfa889',
    desc: 'Polished marble, ivory walls, gold and brass details.'
  },
  minimal: {
    label: 'Minimal',
    wallColor: '#f8fafc',
    floorMaterial: 'concrete',
    floorColor: '#cbd5e1',
    color: '#0f172a',
    desc: 'Monochrome palettes, pure white walls, zero clutter.'
  },
  scandinavian: {
    label: 'Scandinavian',
    wallColor: '#f1f5f9',
    floorMaterial: 'wood',
    floorColor: '#b98f65',
    color: '#475569',
    desc: 'Light woods, warm textiles, calm white and grey tones.'
  },
  japanese: {
    label: 'Japanese (Zen)',
    wallColor: '#fafaf9',
    floorMaterial: 'wood',
    floorColor: '#e8d8c8',
    color: '#78716c',
    desc: 'Tatami style woods, warm ivory walls, dark wood accents.'
  },
  industrial: {
    label: 'Industrial',
    wallColor: '#cbd5e1',
    floorMaterial: 'concrete',
    floorColor: '#64748b',
    color: '#1e1b4b',
    desc: 'Slate grey walls, dark concrete, raw steel visual notes.'
  },
  contemporary: {
    label: 'Contemporary',
    wallColor: '#f5ece2',
    floorMaterial: 'wood',
    floorColor: '#7a4e31',
    color: '#1e3a8a',
    desc: 'Warm beige walls, deep walnut wood, bold navy accents.'
  }
};

export default function RoomSettingsPanel({ room, onUpdate, onApplyTheme, onClose }) {
  if (!room) return null;

  const [activeTheme, setActiveTheme] = useState(null);

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

  const triggerThemeApply = (themeKey, target) => {
    onApplyTheme(themeKey, target);
    setActiveTheme(null);
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

        <div style={{ margin: '4px 0', borderBottom: '1px solid var(--border)' }} />

        {/* AI Interior Themes Selector */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
            <Sparkles size={13} color="var(--accent)" /> AI Interior Themes
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Object.entries(THEMES).map(([key, t]) => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => setActiveTheme(activeTheme === key ? null : key)}
                  style={{
                    padding: '8px 12px', background: 'transparent', border: 'none', color: 'white', textAlign: 'left', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8
                  }}
                >
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: t.color }} />
                  {t.label}
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: 'auto' }}>
                    {activeTheme === key ? 'Hide' : 'Options'}
                  </span>
                </button>

                {activeTheme === key && (
                  <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1.35', marginBottom: 4 }}>{t.desc}</p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => triggerThemeApply(key, 'room')}
                        style={{
                          background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent)', border: '1px solid rgba(99, 102, 241, 0.25)', fontSize: '0.68rem', fontWeight: 700, padding: '4px 8px', borderRadius: 4, cursor: 'pointer', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                        }}
                      >
                        <Check size={10} /> Apply to Room
                      </button>
                      <button
                        onClick={() => triggerThemeApply(key, 'house')}
                        style={{
                          background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)', color: 'white', border: 'none', fontSize: '0.68rem', fontWeight: 700, padding: '4px 8px', borderRadius: 4, cursor: 'pointer', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                        }}
                      >
                        <Check size={10} /> Apply Entire House
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
