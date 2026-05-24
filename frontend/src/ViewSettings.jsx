import React from 'react';
import { motion } from 'framer-motion';
import { X, Sliders } from 'lucide-react';

export default function ViewSettings({
  settings,
  setSettings,
  repairMode,
  onToggleRepairMode,
  onClose,
  onAutoFit,
  onReset,
  onResetCache
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
      style={{ position: 'absolute', top: 60, left: 330, zIndex: 40, width: 300, height: 'auto', maxHeight: '80vh' }}
    >
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sliders size={20} color="var(--accent)" />
          <h2 style={{ fontSize: '1.1rem' }}>View Settings</h2>
        </div>
        <button onClick={onClose} className="action-btn"><X size={18}/></button>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
        
        {/* View Mode */}
        <div>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>View Mode</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: 4 }}>
            {['points', 'hybrid', 'room', 'semantic', 'semantic-hybrid'].map(mode => (
              <button
                key={mode}
                onClick={() => handleChange('viewMode', mode)}
                style={{
                  padding: '6px', fontSize: '0.7rem', textTransform: 'capitalize',
                  background: settings.viewMode === mode ? 'var(--accent)' : 'transparent',
                  color: settings.viewMode === mode ? 'white' : 'var(--text-muted)',
                  border: 'none', borderRadius: 4, cursor: 'pointer', transition: 'all 0.2s',
                  gridColumn: mode.includes('semantic') ? (mode === 'semantic' ? '1 / span 1' : '2 / span 2') : 'auto'
                }}
              >
                {mode.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Sliders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SliderControl label="Point Size" min={0.005} max={0.05} step={0.001} value={settings.pointSize} onChange={(v) => handleChange('pointSize', v)} />
          <SliderControl label="Point Opacity" min={0.1} max={1} step={0.05} value={settings.pointOpacity} onChange={(v) => handleChange('pointOpacity', v)} />
          <SliderControl label="Wall Opacity" min={0} max={1} step={0.05} value={settings.wallOpacity} onChange={(v) => handleChange('wallOpacity', v)} />
          <SliderControl label="Floor Height" min={-5} max={5} step={0.1} value={settings.floorHeight} onChange={(v) => handleChange('floorHeight', v)} />
          <SliderControl label="Room Scale" min={0.5} max={5} step={0.1} value={settings.roomScale} onChange={(v) => handleChange('roomScale', v)} />
        </div>

        {/* Toggles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ToggleControl label="Show Grid" checked={settings.showGrid} onChange={(v) => handleChange('showGrid', v)} />
          <ToggleControl label="Show Walls" checked={settings.showWalls} onChange={(v) => handleChange('showWalls', v)} />
          <ToggleControl label="Show Ceiling" checked={settings.showCeiling} onChange={(v) => handleChange('showCeiling', v)} />
        </div>

        {/* Visual Debug */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Visual Debug</label>
          <ToggleControl label="Repair Mode" checked={repairMode} onChange={onToggleRepairMode} />
          <ToggleControl label="Original Point Cloud" checked={settings.showOriginalPointCloud} onChange={(v) => handleChange('showOriginalPointCloud', v)} />
          <ToggleControl label="Repair Points" checked={settings.showRepairPoints} onChange={(v) => handleChange('showRepairPoints', v)} />
          <ToggleControl label="Edited Point Cloud" checked={settings.showEditedPointCloud} onChange={(v) => handleChange('showEditedPointCloud', v)} />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button 
            onClick={onAutoFit}
            style={{ flex: 1, padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 6, color: 'white', cursor: 'pointer' }}
          >
            Auto Fit
          </button>
          <button 
            onClick={onReset}
            style={{ flex: 1, padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 6, color: 'white', cursor: 'pointer' }}
          >
            Reset
          </button>
        </div>
        <button 
          onClick={onResetCache}
          style={{ width: '100%', padding: '8px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: 6, color: 'white', cursor: 'pointer', marginTop: 4 }}
        >
          Reset Scene Cache
        </button>

      </div>
    </motion.div>
  );
}

function SliderControl({ label, min, max, step, value, onChange }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>{label}</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{value.toFixed(2)}</span>
      </div>
      <input 
        type="range" min={min} max={max} step={step} value={value} 
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--accent)' }}
      />
    </div>
  );
}

function ToggleControl({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{label}</span>
      <div style={{ position: 'relative', width: 36, height: 20, background: checked ? 'var(--accent)' : 'rgba(255,255,255,0.1)', borderRadius: 10, transition: '0.3s' }}>
        <div style={{ position: 'absolute', top: 2, left: checked ? 18 : 2, width: 16, height: 16, background: 'white', borderRadius: '50%', transition: '0.3s' }} />
      </div>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ display: 'none' }} />
    </label>
  );
}
