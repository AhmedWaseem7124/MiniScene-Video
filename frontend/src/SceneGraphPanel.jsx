import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Network, Download, Target, Layers, BoxSelect } from 'lucide-react';
import { generateSceneGraph } from './SceneGraphEngine';

export default function SceneGraphPanel({ objects, placedItems, settings, onClose, onHoverNode, url }) {
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

  return (
    <motion.div 
      initial={{ x: -320 }}
      animate={{ x: 0 }}
      exit={{ x: -320 }}
      className="glass-panel"
      style={{ position: 'absolute', top: 60, left: 24, zIndex: 60, width: 340, height: 'auto', maxHeight: '80vh', overflowY: 'auto' }}
    >
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Network size={20} color="#ec4899" />
          <h2 style={{ fontSize: '1.1rem' }}>Scene Graph</h2>
        </div>
        <button onClick={onClose} className="action-btn">✕</button>
      </div>

      <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {url && fetchFailed ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Network size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <p>Not available yet</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <StatBox icon={<Target size={16} color="#ec4899" />} label="Central Obj" value={remoteData?.analytics?.centralObject || graphData.analytics.centralObject} />
              <StatBox icon={<Layers size={16} color="#3b82f6" />} label="Clusters" value={remoteData?.analytics?.clusterCount || graphData.analytics.clusterCount} />
              <StatBox icon={<BoxSelect size={16} color="#f59e0b" />} label="Isolated" value={remoteData?.analytics?.isolatedCount || graphData.analytics.isolatedCount} />
              <StatBox icon={<Network size={16} color="#10b981" />} label="Total Edges" value={remoteData?.edges?.length || graphData.edges.length} />
            </div>

            <button 
              onClick={handleExportGraph}
              className="btn-primary" 
              style={{ display: 'flex', justifyContent: 'center', background: 'rgba(236, 72, 153, 0.2)', border: '1px solid #ec4899' }}
            >
              <Download size={16} /> Export scene_graph.json
            </button>

            <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '8px 0 0', textTransform: 'uppercase' }}>Relationships</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(remoteData?.edges || graphData.edges).length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No spatial relationships detected.</p>
              ) : (
                (remoteData?.edges || graphData.edges).map((edge, i) => {
                  const nodes = remoteData?.nodes || graphData.nodes;
                  const sourceNode = nodes.find(n => n.id === edge.source);
                  const targetNode = nodes.find(n => n.id === edge.target);
                  return (
                    <div 
                      key={edge.id || i}
                      onMouseEnter={() => onHoverNode(edge.source, edge.target)}
                      onMouseLeave={() => onHoverNode(null, null)}
                      style={{
                        background: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 6,
                        fontSize: '0.75rem', cursor: 'pointer', border: '1px solid var(--border)'
                      }}
                    >
                      <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>{sourceNode?.label || edge.source}</span>
                      <span style={{ color: '#ec4899', margin: '0 6px' }}>{edge.relation.replace(/_/g, ' ')}</span>
                      <span style={{ fontWeight: 'bold', color: '#10b981' }}>{targetNode?.label || edge.target}</span>
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
    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {icon}
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{label}</span>
      </div>
      <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{value}</span>
    </div>
  );
}
