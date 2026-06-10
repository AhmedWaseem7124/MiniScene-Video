import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Network, Download, Target, Layers, BoxSelect, X } from 'lucide-react';
import { generateSceneGraph } from './SceneGraphEngine';

export default function SceneGraphPanel({ objects, placedItems, settings, setSettings, onClose, onHoverNode, url }) {
  const [graphData, setGraphData] = useState({ nodes: [], edges: [], analytics: {} });
  const [fetchFailed, setFetchFailed] = useState(false);
  const [remoteData, setRemoteData] = useState(null);

  useEffect(() => {
    if (url) {
      fetch(url)
        .then(res => {
          if (!res.ok) throw new Error('Not found');
          return res.json();
        })
        .then(data => setRemoteData(data))
        .catch(() => setFetchFailed(true));
    }
  }, [url]);

  useEffect(() => {
    setGraphData(generateSceneGraph(objects, placedItems, settings));
  }, [objects, placedItems, settings]);

  const handleExportGraph = () => {
    const exportData = {
      analytics: graphData.analytics,
      nodes: graphData.nodes.map(n => ({ id: n.id, label: n.label, position: n.center })),
      edges: graphData.edges.map(e => ({ source: e.source, target: e.target, relation: e.relation }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scene_graph.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const edges = remoteData?.edges || remoteData?.relations || graphData.edges || [];
  const nodes = remoteData?.nodes || remoteData?.objects || graphData.nodes || [];

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
          <Network size={18} color="#ec4899" />
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Scene Graph</h2>
        </div>
        <button onClick={onClose} className="action-btn" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '50%', padding: 5 }}>
          <X size={15} />
        </button>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1 }}>
        
        {url && fetchFailed ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Network size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <p>Not available yet</p>
          </div>
        ) : (
          <>
            {/* View Setting Toggle */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)' }}>
              <ToggleControl 
                label="Show Relation Lines" 
                checked={!!settings?.showRelationLines} 
                onChange={(v) => setSettings(prev => ({ ...prev, showRelationLines: v }))} 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <StatBox icon={<Target size={14} color="#ec4899" />} label="Central Obj" value={remoteData?.analytics?.centralObject || graphData.analytics.centralObject} />
              <StatBox icon={<Layers size={14} color="#3b82f6" />} label="Clusters" value={remoteData?.analytics?.clusterCount || graphData.analytics.clusterCount} />
              <StatBox icon={<BoxSelect size={14} color="#f59e0b" />} label="Isolated" value={remoteData?.analytics?.isolatedCount || graphData.analytics.isolatedCount} />
              <StatBox icon={<Network size={14} color="#10b981" />} label="Total Edges" value={edges.length} />
            </div>

            <button 
              onClick={handleExportGraph}
              className="btn-primary" 
              style={{ display: 'flex', justifyContent: 'center', background: 'rgba(236, 72, 153, 0.12)', border: '1px solid rgba(236, 72, 153, 0.4)', color: '#ec4899', height: '36px', fontSize: '0.75rem', gap: 6 }}
            >
              <Download size={16} /> Export scene_graph.json
            </button>

            <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '8px 0 0', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Relationships</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {edges.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0', border: '1px dashed var(--border)', borderRadius: 8 }}>No spatial relationships detected.</p>
              ) : (
                edges.map((edge, i) => {
                  const sourceNode = nodes.find(n => n.id === edge.source);
                  const targetNode = nodes.find(n => n.id === edge.target);
                  return (
                    <div 
                      key={edge.id || i}
                      onMouseEnter={() => onHoverNode(edge.source, edge.target)}
                      onMouseLeave={() => onHoverNode(null, null)}
                      style={{
                        background: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: 8,
                        fontSize: '0.75rem', cursor: 'pointer', border: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
                        transition: 'background 0.2s'
                      }}
                      className="graph-edge-row"
                    >
                      <span style={{ fontWeight: 600, color: 'var(--text-main)', textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px' }}>
                        {sourceNode?.label || edge.source}
                      </span>
                      <span style={{ color: '#ec4899', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', background: 'rgba(236,72,153,0.1)', padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap' }}>
                        {edge.relation.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)', textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px' }}>
                        {targetNode?.label || edge.target}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

function StatBox({ icon, label, value }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {icon}
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{label}</span>
      </div>
      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>{value || 'None'}</span>
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
        background: checked ? '#ec4899' : 'rgba(255,255,255,0.1)', 
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

