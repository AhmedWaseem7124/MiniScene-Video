import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, CheckCircle, Plus, X, HelpCircle, AlertTriangle, Lightbulb } from 'lucide-react';
import { generateRecommendations } from './RecommendationEngine';

export default function AssistantPanel({ 
  objects = [], 
  placedItems = [], 
  settings, 
  walkableAnalytics, 
  onClose, 
  onAutoPlace, 
  onHoverRec 
}) {
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    setRecommendations(generateRecommendations(objects, placedItems, settings));
  }, [objects, placedItems, settings]);

  // Compile list of all objects in scene for spatial rules
  const allObjects = useMemo(() => {
    const list = [];
    objects.forEach(o => {
      list.push({
        id: o.id,
        label: o.label || 'unknown',
        size: o.box_3d?.size || [1, 1, 1],
        position: o.box_3d?.center || o.position_world || [0, 0, 0],
      });
    });
    placedItems.forEach(p => {
      list.push({
        id: p.id,
        label: p.name || p.type || 'item',
        size: p.scale || p.size || [1, 1, 1],
        position: p.position || [0, 0, 0],
      });
    });
    return list;
  }, [objects, placedItems]);

  // Rule-based design feedback generator
  const designAdvice = useMemo(() => {
    const advice = [];

    // 1. Walkable Density Check
    if (walkableAnalytics) {
      const walk = walkableAnalytics.walkPercent;
      if (walk < 45) {
        advice.push({
          title: 'Room Density',
          text: `The room is crowded (${walk}% walkable). Consider removing secondary furniture to improve flow.`,
          status: 'warning'
        });
      } else if (walk >= 45 && walk < 60) {
        advice.push({
          title: 'Room Density',
          text: `Moderate flow (${walk}% walkable). Align objects closer to walls to open up central pathways.`,
          status: 'info'
        });
      } else {
        advice.push({
          title: 'Room Density',
          text: `Excellent room flow! Plenty of open walkable space (${walk}%).`,
          status: 'success'
        });
      }
    } else {
      advice.push({
        title: 'Room Density',
        text: 'Enable Walkable Overlay to analyze room density and movement pathways.',
        status: 'info'
      });
    }

    // 2. Seating Clearance (Chair to Table distance < 0.8m)
    const chairs = allObjects.filter(o => o.label.toLowerCase().includes('chair'));
    const tables = allObjects.filter(o => o.label.toLowerCase().includes('table') || o.label.toLowerCase().includes('desk'));

    if (chairs.length > 0 && tables.length > 0) {
      let closeChairsCount = 0;
      let minClearance = Infinity;
      chairs.forEach(c => {
        tables.forEach(t => {
          const dx = c.position[0] - t.position[0];
          const dy = c.position[1] - t.position[1];
          const dz = c.position[2] - t.position[2];
          const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
          if (dist < minClearance) minClearance = dist;
          if (dist < 0.8) closeChairsCount++;
        });
      });

      if (closeChairsCount > 0) {
        advice.push({
          title: 'Seating Clearance',
          text: `Tight seating clearance (${minClearance.toFixed(2)}m). We recommend keeping 0.8m clearance behind chairs for comfort.`,
          status: 'warning'
        });
      } else {
        advice.push({
          title: 'Seating Clearance',
          text: `Dining chairs have comfortable spacing relative to tables.`,
          status: 'success'
        });
      }
    } else {
      advice.push({
        title: 'Seating Clearance',
        text: 'Add a table and seating to evaluate dining accessibility clearance.',
        status: 'info'
      });
    }

    // 3. Corner Balance (recommend plant if none exist)
    const plants = allObjects.filter(o => o.label.toLowerCase().includes('plant'));
    if (plants.length > 0) {
      advice.push({
        title: 'Visual Balance',
        text: 'Indoor plants are placed in the scene, softening corners and enhancing room aesthetics.',
        status: 'success'
      });
    } else {
      advice.push({
        title: 'Visual Balance',
        text: 'No plants detected. Consider placing a Plant in an empty corner to soften spatial geometry.',
        status: 'warning'
      });
    }

    // 4. Rug Proportion
    const rugs = allObjects.filter(o => o.label.toLowerCase().includes('rug'));
    const sofas = allObjects.filter(o => o.label.toLowerCase().includes('sofa') || o.label.toLowerCase().includes('couch'));

    if (rugs.length > 0) {
      const mainRug = rugs[0];
      if (tables.length > 0) {
        const mainTable = tables[0];
        const rw = mainRug.size[0];
        const rd = mainRug.size[2];
        const tw = mainTable.size[0];
        const td = mainTable.size[2];
        if (rw < tw + 0.6 || rd < td + 0.6) {
          advice.push({
            title: 'Rug Proportions',
            text: 'Rug is small relative to the table. A rug should extend at least 0.6m beyond table edges.',
            status: 'warning'
          });
        } else {
          advice.push({
            title: 'Rug Proportions',
            text: 'Rug size is well-proportioned, extending comfortably beyond the main table.',
            status: 'success'
          });
        }
      } else if (sofas.length > 0) {
        const mainSofa = sofas[0];
        if (mainRug.size[0] < mainSofa.size[0]) {
          advice.push({
            title: 'Rug Proportions',
            text: 'Rug is narrower than the sofa. A rug should be at least as wide as the sofa to anchor the zone.',
            status: 'warning'
          });
        } else {
          advice.push({
            title: 'Rug Proportions',
            text: 'Rug width is well proportioned to the sofa.',
            status: 'success'
          });
        }
      } else {
        advice.push({
          title: 'Rug Proportions',
          text: 'Rug is placed in the room. Pair it under a sofa or table for optimal layout grounding.',
          status: 'info'
        });
      }
    } else {
      advice.push({
        title: 'Rug Placement',
        text: 'Consider adding a rug under your sofa or table to define zones and ground the layout.',
        status: 'info'
      });
    }

    // 5. TV Viewing Comfort
    const tvs = allObjects.filter(o => o.label.toLowerCase().includes('tv') || o.label.toLowerCase().includes('television') || o.label.toLowerCase().includes('screen'));
    if (tvs.length > 0 && sofas.length > 0) {
      const tv = tvs[0];
      const sofa = sofas[0];
      const dx = tv.position[0] - sofa.position[0];
      const dy = tv.position[1] - sofa.position[1];
      const dz = tv.position[2] - sofa.position[2];
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

      if (dist < 1.5) {
        advice.push({
          title: 'TV Viewing Comfort',
          text: `Sofa is too close to the TV (${dist.toFixed(1)}m). Move it back to at least 1.8m to prevent eye strain.`,
          status: 'warning'
        });
      } else if (dist > 3.5) {
        advice.push({
          title: 'TV Viewing Comfort',
          text: `Sofa is quite far from the TV (${dist.toFixed(1)}m). Move it closer (ideal: 2.0m-3.0m) or use a larger screen.`,
          status: 'warning'
        });
      } else {
        advice.push({
          title: 'TV Viewing Comfort',
          text: `Sofa-to-TV distance is excellent (${dist.toFixed(1)}m), offering comfortable visual ergonomics.`,
          status: 'success'
        });
      }
    } else {
      advice.push({
        title: 'TV Viewing Comfort',
        text: 'Add a TV and sofa to evaluate viewing angles and spatial ergonomics.',
        status: 'info'
      });
    }

    return advice;
  }, [allObjects, walkableAnalytics]);

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
          <Sparkles size={18} color="#f59e0b" />
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>AI Design Assistant</h2>
        </div>
        <button onClick={onClose} className="action-btn" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '50%', padding: 5 }}>
          <X size={15} />
        </button>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1 }}>
        
        {/* Layout & Ergonomics Section */}
        <div>
          <div className="section-label" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Lightbulb size={14} color="#f59e0b" />
            <span>Ergonomics & Layout Audit</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {designAdvice.map((item, idx) => {
              const bg = item.status === 'warning' ? 'rgba(239, 68, 68, 0.04)' : item.status === 'success' ? 'rgba(34, 197, 94, 0.04)' : 'rgba(59, 130, 246, 0.04)';
              const border = item.status === 'warning' ? 'rgba(239, 68, 68, 0.2)' : item.status === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)';
              const color = item.status === 'warning' ? '#ef4444' : item.status === 'success' ? '#22c55e' : '#3b82f6';
              const Icon = item.status === 'warning' ? AlertTriangle : item.status === 'success' ? CheckCircle : HelpCircle;

              return (
                <div 
                  key={idx}
                  style={{
                    background: bg,
                    border: `1px solid ${border}`,
                    borderRadius: 8,
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon size={14} color={color} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)' }}>{item.title}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Smart Placement Suggestions */}
        <div>
          <div className="section-label" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Sparkles size={14} color="#f59e0b" />
            <span>Smart Furniture Placement</span>
          </div>

          {recommendations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: 8 }}>
              <CheckCircle size={24} color="#22c55e" style={{ margin: '0 auto 8px' }} />
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>Room layout is fully optimized!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recommendations.map(rec => (
                <div 
                  key={rec.id}
                  onMouseEnter={() => onHoverRec(rec)}
                  onMouseLeave={() => onHoverRec(null)}
                  style={{
                    background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
                    transition: '0.2s', cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '0.8rem', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                      <Sparkles size={12} color="#f59e0b" /> {rec.name}
                    </h3>
                    <span style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '2px 6px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700 }}>
                      Score: {Math.round(rec.score * 100)}
                    </span>
                  </div>
                  
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>{rec.reason}</p>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <span style={{ fontSize: '0.68rem', color: '#3b82f6', fontWeight: 600 }}>Efficiency: {rec.efficiency}</span>
                    <button 
                      onClick={() => onAutoPlace(rec)}
                      className="btn-primary"
                      style={{ padding: '4px 10px', height: '26px', borderRadius: 6, fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Plus size={12} /> Auto Place
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

