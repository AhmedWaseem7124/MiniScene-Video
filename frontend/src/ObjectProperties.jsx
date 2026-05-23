import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Copy, Trash2, ArrowDown } from 'lucide-react';

export default function ObjectProperties({ object, onClose, onUpdate, onDelete, onDuplicate, transformMode, onTransformModeChange, floorHeight }) {
  const [uniformScale, setUniformScale] = useState(false);
  if (!object) return null;

  const isPlaced = !!object.type; // user-placed furniture vs detected object

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
    onUpdate(object.id, { position: [(object.position?.[0] || 0), floorHeight ?? -2, (object.position?.[2] || 0)] });
  };

  return (
    <motion.div
      initial={{ x: 340 }}
      animate={{ x: 0 }}
      exit={{ x: 340 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="glass-panel"
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, zIndex: 50, width: 300 }}
    >
      {/* Header */}
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1rem' }}>Properties</h2>
          <p style={{ fontSize: '0.78rem' }}>{object.name || object.label || 'Selected Object'}</p>
        </div>
        <button onClick={onClose} className="action-btn"><X size={20} /></button>
      </div>

      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', flex: 1 }}>

        {/* Transform Mode — only for placed furniture */}
        {isPlaced && (
          <div>
            <div className="section-label">Transform Mode</div>
            <div className="transform-mode-bar" style={{ marginTop: 6 }}>
              {[
                { id: 'translate', label: 'Move', key: 'G' },
                { id: 'rotate',    label: 'Rotate', key: 'R' },
                { id: 'scale',     label: 'Scale', key: 'S' },
              ].map(m => (
                <button
                  key={m.id}
                  className={`transform-mode-btn${transformMode === m.id ? ' active' : ''}`}
                  onClick={() => onTransformModeChange(m.id)}
                  title={`Shortcut: ${m.key}`}
                >
                  {m.label} <span style={{ fontSize: '0.6rem', opacity: 0.6 }}>({m.key})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {isPlaced && (
            <button
              onClick={() => onDuplicate(object)}
              style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 8, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer', fontSize: '0.82rem' }}
            >
              <Copy size={15} /> Duplicate
            </button>
          )}
          <button
            onClick={() => onDelete(object.id)}
            style={{ padding: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 8, color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer', fontSize: '0.82rem', gridColumn: isPlaced ? 'auto' : '1/-1' }}
          >
            <Trash2 size={15} /> Delete
          </button>
        </div>

        {/* Snap to Floor */}
        {isPlaced && (
          <button
            onClick={handleSnapToFloor}
            style={{ padding: '8px 12px', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 8, color: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer', fontSize: '0.82rem', width: '100%' }}
          >
            <ArrowDown size={15} /> Snap to Floor
          </button>
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
                style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: 8, background: uniformScale ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', cursor: 'pointer' }}
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
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
      <label style={{ fontSize: '0.7rem', color, display: 'block', marginBottom: 3 }}>{axis}</label>
      <input
        type="number"
        step={step}
        min={min}
        value={typeof value === 'number' ? parseFloat(value.toFixed(3)) : 0}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        style={{
          width: '100%', padding: '6px 7px',
          background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border)',
          color: 'white', borderRadius: 6, fontSize: '0.8rem', outline: 'none',
        }}
      />
    </div>
  );
}
