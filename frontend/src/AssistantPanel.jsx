import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, CheckCircle, Plus } from 'lucide-react';
import { generateRecommendations } from './RecommendationEngine';

export default function AssistantPanel({ objects, placedItems, settings, onClose, onAutoPlace, onHoverRec }) {
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    setRecommendations(generateRecommendations(objects, placedItems, settings));
  }, [objects, placedItems, settings]);

  return (
    <motion.div 
      initial={{ x: -320 }}
      animate={{ x: 0 }}
      exit={{ x: -320 }}
      className="glass-panel"
      style={{ position: 'absolute', top: 60, left: 24, zIndex: 50, width: 340, height: 'auto', maxHeight: '80vh', overflowY: 'auto' }}
    >
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={20} color="#f59e0b" />
          <h2 style={{ fontSize: '1.1rem' }}>AI Assistant</h2>
        </div>
        <button onClick={onClose} className="action-btn">✕</button>
      </div>

      <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
          Smart placement suggestions based on spatial free-space analysis and layout logic.
        </p>

        {recommendations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
            <CheckCircle size={32} color="#10b981" style={{ margin: '0 auto 8px' }} />
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Room layout is fully optimized!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recommendations.map(rec => (
              <div 
                key={rec.id}
                onMouseEnter={() => onHoverRec(rec)}
                onMouseLeave={() => onHoverRec(null)}
                style={{
                  background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
                  transition: '0.2s', cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '0.9rem', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={14} color="#f59e0b" /> {rec.name}
                  </h3>
                  <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '2px 6px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 'bold' }}>
                    Score: {Math.round(rec.score * 100)}
                  </span>
                </div>
                
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{rec.reason}</p>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <span style={{ fontSize: '0.7rem', color: '#38bdf8' }}>Efficiency: {rec.efficiency}</span>
                  <button 
                    onClick={() => onAutoPlace(rec)}
                    style={{ background: 'var(--accent)', border: 'none', color: 'white', padding: '4px 10px', borderRadius: 4, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <Plus size={12} /> Auto Place
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
