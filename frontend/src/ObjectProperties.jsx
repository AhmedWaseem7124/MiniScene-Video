import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Copy, Trash2, ArrowDown, RefreshCw, Star } from 'lucide-react';
import { CATALOG } from './FurnitureLibrary';

// Predefined Color Palettes
const PALETTES = {
  Neutral: ['#ffffff', '#f5f0e8', '#d6cabc', '#b8a99a', '#2b2b2b'],
  Wood: ['#8b5a2b', '#a97449', '#c19a6b', '#5a3825'],
  Luxury: ['#c4a46a', '#b77745', '#1f1f1f', '#f7f3ec'],
  Modern: ['#111827', '#374151', '#9ca3af', '#e5e7eb'],
  Pastel: ['#f7c6c7', '#c8e7dc', '#c9d8ff', '#f5e6a8']
};

const MATERIAL_PRESETS = [
  { id: 'matte', label: 'Matte Fabric/Plaster' },
  { id: 'glossy', label: 'Glossy Polish' },
  { id: 'fabric', label: 'Woven Fabric' },
  { id: 'velvet', label: 'Velvet Fabric' },
  { id: 'leather', label: 'Premium Leather' },
  { id: 'wood', label: 'Natural Wood' },
  { id: 'metal', label: 'Polished Metal' },
  { id: 'marble', label: 'Solid Marble' },
  { id: 'glass', label: 'Clear Glass' },
  { id: 'plastic', label: 'Molded Plastic' }
];

export default function ObjectProperties({ 
  object, 
  onClose, 
  onUpdate, 
  onDelete, 
  onDuplicate, 
  transformMode, 
  onTransformModeChange, 
  floorHeight,
  isHardcodedDemo,
  compareOriginal,
  onOpenReplaceLibrary,
  onSnapToWall,
  onResetObject
}) {
  const [uniformScale, setUniformScale] = useState(false);
  const [activeColorPart, setActiveColorPart] = useState('primary'); // 'primary' | 'secondary' | 'accent'
  const [favorites, setFavorites] = useState([]);

  // Load favorites on mount or update
  useEffect(() => {
    try {
      const saved = localStorage.getItem('miniscene_favorites');
      setFavorites(saved ? JSON.parse(saved) : []);
    } catch {
      setFavorites([]);
    }
  }, [object]);

  if (!object) return null;

  const isPlaced = true; // both detected and manual items are editable

  // Check if current item is a favorite
  const isFavorite = favorites.includes(object.id || '');
  
  const toggleFavorite = () => {
    if (!object.id) return;
    let updated;
    if (isFavorite) {
      updated = favorites.filter(id => id !== object.id);
    } else {
      updated = [...favorites, object.id];
    }
    setFavorites(updated);
    localStorage.setItem('miniscene_favorites', JSON.stringify(updated));
  };

  // Find corresponding library catalog item if it exists
  const catalogItem = useMemo(() => {
    if (!isPlaced) return null;
    // Match by type or name or template ID
    return CATALOG.find(item => item.type === object.type || item.name === object.name) || CATALOG.find(item => item.type === object.type);
  }, [object.type, object.name, isPlaced]);

  // Find similar items in the catalog for replacement
  const similarItems = useMemo(() => {
    if (!catalogItem) return [];
    return CATALOG.filter(item => 
      item.id !== catalogItem.id && 
      item.subcategory === catalogItem.subcategory
    );
  }, [catalogItem]);

  // Determine multi-part color configuration names
  const getMultiPartInfo = () => {
    const typeLower = object.type?.toLowerCase() || '';
    if (typeLower.includes('sofa') || typeLower.includes('armchair')) {
      return {
        hasMulti: true,
        primary: 'Sofa Fabric',
        secondary: 'Cushions / Pillows',
        accent: 'Frame Legs'
      };
    }
    if (typeLower.includes('bed')) {
      return {
        hasMulti: true,
        primary: 'Bed Frame',
        secondary: 'Mattress',
        accent: 'Pillows / Details'
      };
    }
    if (typeLower.includes('table') || typeLower.includes('desk')) {
      return {
        hasMulti: true,
        primary: 'Tabletop Surface',
        secondary: 'Support Legs / Frame',
        accent: 'Accents / Handles'
      };
    }
    if (typeLower.includes('cabinet') || typeLower.includes('cupboard') || typeLower.includes('pantry') || typeLower.includes('refrigerator') || typeLower.includes('oven')) {
      return {
        hasMulti: true,
        primary: 'Main Cabinet Body',
        secondary: 'Shelves / Accent Panels',
        accent: 'Handles / Metal Hardware'
      };
    }
    return {
      hasMulti: false,
      primary: 'Main Color',
      secondary: '',
      accent: ''
    };
  };

  const partInfo = getMultiPartInfo();

  // Reset colors to default
  const handleResetColors = () => {
    const defaultCol = catalogItem?.defaultColor || '#d6cabc';
    onUpdate(object.id, {
      primaryColor: defaultCol,
      secondaryColor: defaultCol,
      accentColor: defaultCol,
      color: defaultCol,
      material: catalogItem?.material || 'matte'
    });
  };

  // Replace item with a similar catalog item (keeping position, rotation, scale)
  const handleReplaceItem = (newItem) => {
    onUpdate(object.id, {
      name: newItem.name,
      type: newItem.type,
      category: newItem.category,
      size: newItem.size,
      primaryColor: newItem.defaultColor,
      secondaryColor: newItem.defaultColor,
      accentColor: newItem.defaultColor,
      color: newItem.defaultColor,
      material: newItem.material
    });
  };

  const handleScaleChange = (axis, val) => {
    if (uniformScale) {
      const ratio = val / (object.scale?.[['x','y','z'].indexOf(axis)] ?? 1);
      const newScale = (object.scale || [1,1,1]).map(s => Math.max(0.05, s * ratio));
      onUpdate(object.id, { scale: newScale });
    } else {
      const newScale = [...(object.scale || [1,1,1])];
      newScale[['x','y','z'].indexOf(axis)] = parseFloat(val) || 0.05;
      onUpdate(object.id, { scale: newScale });
    }
  };

  const handleSnapToFloor = () => {
    const h = object.size?.[1] || 1.0;
    const y = (floorHeight ?? -2) + h / 2;
    onUpdate(object.id, { position: [(object.position?.[0] || 0), y, (object.position?.[2] || 0)] });
  };

  const handleColorUpdate = (hex) => {
    if (activeColorPart === 'primary') {
      onUpdate(object.id, { primaryColor: hex, color: hex });
    } else if (activeColorPart === 'secondary') {
      onUpdate(object.id, { secondaryColor: hex });
    } else if (activeColorPart === 'accent') {
      onUpdate(object.id, { accentColor: hex });
    }
  };

  const getActiveColorValue = () => {
    if (activeColorPart === 'primary') return object.primaryColor || object.color || catalogItem?.defaultColor || '#ffffff';
    if (activeColorPart === 'secondary') return object.secondaryColor || object.color || catalogItem?.defaultColor || '#ffffff';
    return object.accentColor || object.color || catalogItem?.defaultColor || '#ffffff';
  };

  return (
    <motion.div
      initial={{ x: 360 }}
      animate={{ x: 0 }}
      exit={{ x: 360 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      className="right-inspector-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 12px' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2 style={{ fontSize: '1rem', color: '#f8fafc', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {object.name || object.label || 'Selected Object'}
          </h2>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Category: {object.category || 'AI Detected'}
          </p>
        </div>
        <button onClick={onClose} className="action-btn" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '50%', padding: 5 }}><X size={15} /></button>
      </div>

      <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', flex: 1 }}>

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button
            onClick={() => onDuplicate(object)}
            style={{ padding: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}
          >
            <Copy size={13} /> Duplicate
          </button>
          <button
            onClick={() => onDelete(object.id)}
            style={{ padding: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 8, color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>

        {/* Favorite & Reset Object */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button
            onClick={toggleFavorite}
            style={{ padding: '8px', background: isFavorite ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isFavorite ? '#fbbf24' : 'var(--border)'}`, borderRadius: 8, color: isFavorite ? '#fbbf24' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', fontSize: '0.8rem' }}
          >
            <Star size={13} fill={isFavorite ? '#fbbf24' : 'none'} /> Favorite
          </button>
          <button
            onClick={() => onResetObject(object.id)}
            style={{ padding: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 8, color: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', fontSize: '0.8rem' }}
            title="Reset position, scale, rotation, color, and material to original detected/spawned state"
          >
            <RefreshCw size={13} /> Reset Object
          </button>
        </div>

        {/* Transform Mode */}
        {isPlaced && (
          <div>
            <div className="section-label" style={{ paddingLeft: 0, fontSize: '0.72rem' }}>Transform Mode</div>
            <div className="transform-mode-bar" style={{ marginTop: 5 }}>
              {[
                { id: 'translate', label: 'Move', key: 'G' },
                { id: 'rotate',    label: 'Rotate', key: 'R' },
                { id: 'scale',     label: 'Scale', key: 'S' },
              ].map(m => (
                <button
                  key={m.id}
                  className={`transform-mode-btn${transformMode === m.id ? ' active' : ''}`}
                  onClick={() => onTransformModeChange(m.id)}
                  style={{ fontSize: '0.75rem', padding: '6px 2px' }}
                >
                  {m.label} <span style={{ fontSize: '0.58rem', opacity: 0.5 }}>({m.key})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Snap to Floor & Wall */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button
            onClick={handleSnapToFloor}
            style={{ padding: '8px 6px', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 8, color: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}
          >
            <ArrowDown size={14} /> Snap Floor
          </button>
          <button
            onClick={() => onSnapToWall(object.id)}
            style={{ padding: '8px 6px', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 8, color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}
          >
            <Copy size={14} style={{ transform: 'rotate(90deg)' }} /> Snap Wall
          </button>
        </div>

        {/* Replace Object */}
        <button
          onClick={() => onOpenReplaceLibrary(object.id)}
          style={{ padding: '8px 12px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 8, color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer', fontSize: '0.8rem', width: '100%', fontWeight: 500 }}
        >
          <RefreshCw size={14} /> Replace From Library
        </button>

        {/* Color Customization Section */}
        {isPlaced && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
            <div className="section-label" style={{ padding: '0 0 8px 0', borderBottom: '1px solid var(--border)', color: '#38bdf8', fontSize: '0.75rem' }}>
              Color Customization
            </div>

            {/* Part Selection (Multi-Part support) */}
            {partInfo.hasMulti ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Select part:</span>
                {[
                  { id: 'primary', label: partInfo.primary, color: object.primaryColor || object.color || catalogItem?.defaultColor },
                  { id: 'secondary', label: partInfo.secondary, color: object.secondaryColor || object.color || catalogItem?.defaultColor },
                  { id: 'accent', label: partInfo.accent, color: object.accentColor || object.color || catalogItem?.defaultColor }
                ].map(part => (
                  <button
                    key={part.id}
                    onClick={() => setActiveColorPart(part.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      padding: '6px 8px',
                      background: activeColorPart === part.id ? 'rgba(6,182,212,0.1)' : 'transparent',
                      border: `1px solid ${activeColorPart === part.id ? 'var(--teal)' : 'rgba(255,255,255,0.05)'}`,
                      borderRadius: 6,
                      color: activeColorPart === part.id ? '#06b6d4' : '#94a3b8',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: part.color || '#fff', border: '1px solid rgba(255,255,255,0.3)' }} />
                    <span style={{ flex: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{part.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '8px 0 4px 0' }}>{partInfo.primary}</div>
            )}

            {/* Active Color Picker and Hex Input */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12 }}>
              <div style={{ position: 'relative', width: 34, height: 34, borderRadius: 8, overflow: 'hidden', border: '1.5px solid rgba(255,255,255,0.2)' }}>
                <input
                  type="color"
                  value={getActiveColorValue()}
                  onChange={e => handleColorUpdate(e.target.value)}
                  style={{
                    position: 'absolute',
                    top: -6,
                    left: -6,
                    width: 48,
                    height: 48,
                    padding: 0,
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer'
                  }}
                />
              </div>
              <input
                type="text"
                value={getActiveColorValue().toUpperCase()}
                onChange={e => handleColorUpdate(e.target.value)}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 6,
                  color: 'white',
                  fontSize: '0.78rem',
                  fontFamily: 'monospace',
                  outline: 'none'
                }}
              />
            </div>

            {/* Predefined Palettes Swatches */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
              {Object.entries(PALETTES).map(([paletteName, colors]) => (
                <div key={paletteName} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 45, fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{paletteName}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {colors.map(color => (
                      <button
                        key={color}
                        onClick={() => handleColorUpdate(color)}
                        title={color}
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: color,
                          border: `1.5px solid ${getActiveColorValue().toLowerCase() === color.toLowerCase() ? 'var(--teal)' : 'rgba(255,255,255,0.15)'}`,
                          cursor: 'pointer',
                          padding: 0,
                          transition: 'transform 0.1s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Material Selection */}
        {isPlaced && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
            <div className="section-label" style={{ padding: '0 0 8px 0', borderBottom: '1px solid var(--border)', color: '#10b981', fontSize: '0.75rem' }}>
              Material Texture
            </div>
            <select
              value={object.material || catalogItem?.material || 'matte'}
              onChange={e => onUpdate(object.id, { material: e.target.value })}
              style={{
                width: '100%',
                background: 'rgba(15,23,42,0.85)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 6,
                color: '#e2e8f0',
                fontSize: '0.78rem',
                padding: '6px 8px',
                outline: 'none',
                cursor: 'pointer',
                marginTop: 8
              }}
            >
              {MATERIAL_PRESETS.map(preset => (
                <option key={preset.id} value={preset.id}>{preset.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Replace with Similar */}
        {isPlaced && similarItems.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
            <div className="section-label" style={{ padding: '0 0 8px 0', borderBottom: '1px solid var(--border)', color: '#fbbf24', fontSize: '0.75rem' }}>
              Replace with Similar
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8, maxHeight: 120, overflowY: 'auto', paddingRight: 4 }}>
              {similarItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleReplaceItem(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 8px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 6,
                    color: '#e2e8f0',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#fbbf24';
                    e.currentTarget.style.background = 'rgba(251,191,36,0.05)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                  }}
                >
                  <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{item.name}</div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{item.size[0].toFixed(1)}m × {item.size[2].toFixed(1)}m</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Position */}
        <PropGroup label="Position" color="#818cf8">
          {['x', 'y', 'z'].map((axis, i) => (
            <NumInput
              key={axis}
              axis={axis.toUpperCase()}
              color="#818cf8"
              step={0.1}
              value={object.position?.[i] ?? 0}
              onChange={v => {
                const p = [...(object.position || [0, 0, 0])];
                p[i] = v;
                onUpdate(object.id, { position: p });
              }}
            />
          ))}
        </PropGroup>

        {/* Rotation */}
        {isPlaced && (
          <PropGroup label="Rotation (°)" color="#34d399">
            {['x', 'y', 'z'].map((axis, i) => (
              <NumInput
                key={axis}
                axis={axis.toUpperCase()}
                color="#34d399"
                step={15}
                value={Math.round(((object.rotation?.[i] || 0) * 180) / Math.PI)}
                onChange={v => {
                  const r = [...(object.rotation || [0, 0, 0])];
                  r[i] = (v * Math.PI) / 180;
                  onUpdate(object.id, { rotation: r });
                }}
              />
            ))}
          </PropGroup>
        )}

        {/* Scale */}
        {isPlaced && (
          <PropGroup label="Scale" color="#fbbf24"
            extra={
              <button
                onClick={() => setUniformScale(u => !u)}
                style={{ fontSize: '0.65rem', padding: '2px 7px', borderRadius: 8, background: uniformScale ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', cursor: 'pointer' }}
              >
                {uniformScale ? '🔒 Uniform' : '🔓 Free'}
              </button>
            }
          >
            {['x', 'y', 'z'].map((axis, i) => (
              <NumInput
                key={axis}
                axis={axis.toUpperCase()}
                color="#fbbf24"
                step={0.1}
                min={0.05}
                value={object.scale?.[i] ?? 1}
                onChange={v => handleScaleChange(axis, v)}
              />
            ))}
          </PropGroup>
        )}

      </div>
    </motion.div>
  );
}

function PropGroup({ label, color, extra, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <div className="section-label" style={{ padding: 0, color }}>{label}</div>
        {extra}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7 }}>
        {children}
      </div>
    </div>
  );
}

function NumInput({ axis, color, step, min, value, onChange }) {
  return (
    <div>
      <label style={{ fontSize: '0.65rem', color, display: 'block', marginBottom: 2 }}>{axis}</label>
      <input
        type="number"
        step={step}
        min={min}
        value={typeof value === 'number' ? parseFloat(value.toFixed(3)) : 0}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        style={{
          width: '100%', padding: '5px 6px',
          background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border)',
          color: 'white', borderRadius: 6, fontSize: '0.78rem', outline: 'none',
        }}
      />
    </div>
  );
}
