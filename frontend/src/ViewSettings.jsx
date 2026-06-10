import React from 'react';
import { motion } from 'framer-motion';
import { X, Sliders } from 'lucide-react';

export default function ViewSettings({
  settings,
  setSettings,
  presentationMode,
  setPresentationMode,
  onClose
}) {
  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <motion.div 
      initial={{ x: -320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -320, opacity: 0 }}
      className="glass-panel"
      style={{ 
        position: 'absolute', 
        top: 60, 
        left: 330, 
        zIndex: 100, 
        width: 300, 
        height: 'auto',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
      }}
    >
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sliders size={18} color="var(--teal)" />
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>View Options</h2>
        </div>
        <button onClick={onClose} className="action-btn" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '50%', padding: 5 }}><X size={15} /></button>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <ToggleControl 
          label="Show Labels" 
          checked={settings.showLabels} 
          onChange={(v) => handleChange('showLabels', v)} 
        />
        <ToggleControl 
          label="Show Bounding Boxes" 
          checked={settings.showBoundingBoxes} 
          onChange={(v) => handleChange('showBoundingBoxes', v)} 
        />
        <ToggleControl 
          label="Show Floor Grid" 
          checked={settings.showGrid} 
          onChange={(v) => handleChange('showGrid', v)} 
        />
        <ToggleControl 
          label="Show Relation Lines" 
          checked={settings.showRelationLines} 
          onChange={(v) => handleChange('showRelationLines', v)} 
        />

        <ToggleControl 
          label="Presentation Mode" 
          checked={presentationMode} 
          onChange={setPresentationMode} 
        />
      </div>
    </motion.div>
  );
}

function ToggleControl({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 500 }}>{label}</span>
      <div style={{ 
        position: 'relative', 
        width: 36, 
        height: 20, 
        background: checked ? 'var(--teal)' : 'rgba(255,255,255,0.1)', 
        borderRadius: 10, 
        transition: 'all 0.3s ease' 
      }}>
        <div style={{ 
          position: 'absolute', 
          top: 2, 
          left: checked ? 18 : 2, 
          width: 16, 
          height: 16, 
          background: 'white', 
          borderRadius: '50%', 
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
        }} />
      </div>
      <input 
        type="checkbox" 
        checked={checked} 
        onChange={(e) => onChange(e.target.checked)} 
        style={{ display: 'none' }} 
      />
    </label>
  );
}
