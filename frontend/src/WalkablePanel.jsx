import React from 'react';
import { motion } from 'framer-motion';
import { Map, Footprints, AlertTriangle, CheckCircle, Navigation, X, ShieldAlert } from 'lucide-react';

export default function WalkablePanel({ analytics, settings, setSettings, objects = [], placedItems = [], onClose }) {
  
  const totalScale = settings?.roomScale || 1.0;
  const totalArea = 100 * totalScale * totalScale;

  const allObjects = React.useMemo(() => {
    const list = [];
    if (objects) {
      objects.forEach(o => {
        list.push({
          id: o.id,
          label: o.label || 'unknown',
          size: o.box_3d?.size || [1, 1, 1],
          position: o.box_3d?.center || o.position_world || [0, 0, 0],
        });
      });
    }
    if (placedItems) {
      placedItems.forEach(p => {
        list.push({
          id: p.id,
          label: p.name || p.type || 'item',
          size: p.scale || p.size || [1, 1, 1],
          position: p.position || [0, 0, 0],
        });
      });
    }
    return list;
  }, [objects, placedItems]);

  const warnings = React.useMemo(() => {
    const list = [];
    if (allObjects.length === 0) return list;

    // 1. Chair to Table distance check
    const chairs = allObjects.filter(o => o.label.toLowerCase().includes('chair'));
    const tables = allObjects.filter(o => o.label.toLowerCase().includes('table') || o.label.toLowerCase().includes('desk'));

    chairs.forEach(chair => {
      tables.forEach(table => {
        const dx = chair.position[0] - table.position[0];
        const dy = chair.position[1] - table.position[1];
        const dz = chair.position[2] - table.position[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < 0.8) {
          list.push({
            id: `warn-chair-table-${chair.id}-${table.id}`,
            text: `Chair "${chair.label}" is too close to table "${table.label}" (${dist.toFixed(2)}m). Clear >0.8m for comfort.`,
            type: 'clearance'
          });
        }
      });
    });

    // 2. Sofa close to wall check
    const sofas = allObjects.filter(o => o.label.toLowerCase().includes('sofa') || o.label.toLowerCase().includes('couch'));
    const roomWidth = 10 * totalScale;
    const roomDepth = 10 * totalScale;
    const minX = -roomWidth / 2;
    const maxX = roomWidth / 2;
    const minZ = -roomDepth / 2;
    const maxZ = roomDepth / 2;

    sofas.forEach(sofa => {
      const distLeft = Math.abs(sofa.position[0] - minX);
      const distRight = Math.abs(maxX - sofa.position[0]);
      const distBack = Math.abs(sofa.position[2] - minZ);
      const distFront = Math.abs(maxZ - sofa.position[2]);

      const minDistToWall = Math.min(distLeft, distRight, distBack, distFront);
      if (minDistToWall > 0.1 && minDistToWall < 0.6) {
        list.push({
          id: `warn-sofa-wall-${sofa.id}`,
          text: `Sofa "${sofa.label}" is ${minDistToWall.toFixed(2)}m from the wall. Push it flush or leave >0.8m for a walkway.`,
          type: 'wall'
        });
      }
    });

    // 3. Blocked pathways or general room congestion warning
    if (analytics && analytics.blockedPercent > 35) {
      list.push({
        id: 'warn-room-congestion',
        text: `Room density is high (${analytics.blockedPercent}% footprint). Try removing or restructuring items.`,
        type: 'congestion'
      });
    }

    if (analytics && analytics.narrowPercent > 30) {
      list.push({
        id: 'warn-narrow-pathways',
        text: `High percentage of narrow pathways (${analytics.narrowPercent}% yellow zone). Clear pathways by aligning furniture.`,
        type: 'pathway'
      });
    }

    return list;
  }, [allObjects, totalScale, analytics]);

  const walkPercent = analytics?.walkPercent ?? 100;
  const narrowPercent = analytics?.narrowPercent ?? 0;
  const blockedPercent = analytics?.blockedPercent ?? 0;

  const walkableArea = totalArea * (walkPercent / 100);
  const narrowArea = totalArea * (narrowPercent / 100);
  const occupiedArea = totalArea * (blockedPercent / 100);

  const freedomScore = analytics?.freedomScore === 'Excellent' ? 'Good' : (analytics?.freedomScore || 'Good');

  return (
    <motion.div 
      initial={{ x: 360 }}
      animate={{ x: 0 }}
      exit={{ x: 360 }}
      className="right-inspector-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        overflow: 'hidden'
      }}
    >
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Map size={18} color="#22c55e" />
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Walkability & Flow</h2>
        </div>
        <button onClick={onClose} className="action-btn" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '50%', padding: 5 }}>
          <X size={15} />
        </button>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1 }}>
        
        {/* Toggle Overlay */}
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)' }}>
          <ToggleControl 
            label="Show Walkable Overlay" 
            checked={!!settings?.showWalkableOverlay} 
            onChange={(v) => setSettings(prev => ({ ...prev, showWalkableOverlay: v }))} 
          />
        </div>

        {/* Freedom Score Card */}
        <div style={{ 
          background: 'rgba(255,255,255,0.01)', padding: 16, borderRadius: 8, 
          display: 'flex', alignItems: 'center', gap: 12, 
          border: `1px solid ${freedomScore === 'Poor' ? '#ef4444' : freedomScore === 'Moderate' ? '#facc15' : '#22c55e'}` 
        }}>
          {freedomScore === 'Poor' ? (
            <AlertTriangle size={24} color="#ef4444" style={{ flexShrink: 0 }} />
          ) : (
            <CheckCircle size={24} color="#22c55e" style={{ flexShrink: 0 }} />
          )}
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Movement Freedom</p>
            <p style={{ fontSize: '1rem', fontWeight: 'bold', color: freedomScore === 'Poor' ? '#ef4444' : freedomScore === 'Moderate' ? '#facc15' : '#22c55e', margin: 0 }}>
              {freedomScore}
            </p>
          </div>
        </div>

        {/* Metrics List */}
        <div>
          <div className="section-label" style={{ marginBottom: 8 }}>Layout Metrics</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <StatRow 
              label="Total Floor Area" 
              value={`${totalArea.toFixed(1)} m²`} 
            />
            <StatRow 
              label="Free Walkable Area" 
              value={`${walkableArea.toFixed(1)} m² (${walkPercent}%)`} 
              color="#22c55e" 
            />
            <StatRow 
              label="Narrow Pathways" 
              value={`${narrowArea.toFixed(1)} m² (${narrowPercent}%)`} 
              color="#facc15" 
            />
            <StatRow 
              label="Occupied Footprint" 
              value={`${occupiedArea.toFixed(1)} m² (${blockedPercent}%)`} 
              color="#ef4444" 
            />
          </div>
        </div>

        {/* Warnings Panel */}
        <div>
          <div className="section-label" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
            <ShieldAlert size={14} />
            <span>Layout Warnings</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {warnings.length === 0 ? (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0', border: '1px dashed var(--border)', borderRadius: 8 }}>
                No layout warnings detected
              </div>
            ) : (
              warnings.map(warn => (
                <div 
                  key={warn.id}
                  style={{
                    background: 'rgba(239, 68, 68, 0.05)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    padding: '8px 12px',
                    borderRadius: 8,
                    fontSize: '0.75rem',
                    color: 'var(--text-main)',
                    display: 'flex',
                    gap: 8,
                    alignItems: 'flex-start'
                  }}
                >
                  <AlertTriangle size={14} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{warn.text}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Legend */}
        <div style={{ 
          marginTop: 8, fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.5,
          background: 'rgba(255,255,255,0.01)', padding: 12, borderRadius: 8, border: '1px solid var(--border)'
        }}>
          <p style={{ margin: '0 0 4px 0' }}><span style={{ color: '#22c55e', fontWeight: 600 }}>■ Green:</span> Clear movement zones</p>
          <p style={{ margin: '0 0 4px 0' }}><span style={{ color: '#facc15', fontWeight: 600 }}>■ Yellow:</span> Restricted / narrow pathways</p>
          <p style={{ margin: '0 0 4px 0' }}><span style={{ color: '#ef4444', fontWeight: 600 }}>■ Red:</span> Collision zones & obstacles</p>
          <p style={{ margin: '0 0 4px 0' }}><span style={{ color: '#3b82f6', fontWeight: 600 }}>— Blue Line:</span> AI simulated walk path</p>
        </div>
      </div>
    </motion.div>
  );
}

function StatRow({ label, value, color = 'var(--text-main)' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: 8 }}>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: '0.8rem', fontWeight: 600, color }}>{value}</span>
    </div>
  );
}

function ToggleControl({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none', margin: 0 }}>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 500 }}>{label}</span>
      <div style={{ 
        position: 'relative', 
        width: 36, 
        height: 20, 
        background: checked ? '#22c55e' : 'rgba(255,255,255,0.1)', 
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

