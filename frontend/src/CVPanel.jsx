import React from 'react';
import { motion } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';

const PIPELINE = [
  {
    step: 1, icon: '🎬', label: 'Frame Extraction',
    detail: 'Key frames sampled from your video at regular intervals.',
    color: '#a78bfa',
  },
  {
    step: 2, icon: '📐', label: 'Depth Estimation',
    detail: 'Per-frame monocular depth estimation creates a depth map for every frame.',
    color: '#38bdf8',
  },
  {
    step: 3, icon: '☁️', label: 'Point Cloud',
    detail: 'Depth maps + camera intrinsics are back-projected into 3D space, forming a colored point cloud.',
    color: '#34d399',
  },
  {
    step: 4, icon: '🏠', label: 'Room Geometry',
    detail: 'Floor plane is estimated via RANSAC on the lowest points. Wall boundaries are inferred from the scene bounds.',
    color: '#f59e0b',
  },
  {
    step: 5, icon: '🔍', label: 'Object Detection',
    detail: 'YOLO object detection is optionally run in Quality mode. Skipped in Fast mode to save time.',
    color: '#f472b6',
    optional: true,
  },
];

export default function CVPanel({ onClose, sessionStats, objectDetectionMetadata }) {
  const { frameCount, pointCount, processingTime, mode } = sessionStats || {};
  const {
    yolo_loaded,
    frames_scanned,
    raw_detections_count,
    final_objects_count,
    rejection_reasons
  } = objectDetectionMetadata || {};

  return (
    <motion.div
      initial={{ x: -360 }}
      animate={{ x: 0 }}
      exit={{ x: -360 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      className="glass-panel"
      style={{ position: 'absolute', top: 0, left: 0, bottom: 0, zIndex: 80, width: 360, overflowY: 'auto' }}
    >
      {/* Header */}
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h2 style={{ fontSize: '1rem' }}>How This Scene Was Built</h2>
          </div>
          <span className="cv-badge">🤖 Computer Vision Pipeline</span>
        </div>
        <button onClick={onClose} className="action-btn"><X size={20} /></button>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Session stats (if available) */}
        {(frameCount || pointCount || processingTime) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: 'Frames Used', value: frameCount ? `${frameCount}` : '—', color: '#a78bfa' },
              { label: 'Point Count', value: pointCount ? `${pointCount.toLocaleString()}` : '—', color: '#34d399' },
              { label: 'Process Time', value: processingTime ? `${processingTime.toFixed(1)}s` : '—', color: '#38bdf8' },
              { label: 'Mode', value: mode === 'quality' ? 'Quality' : 'Fast Demo', color: '#f59e0b' },
            ].map(stat => (
              <div key={stat.label} style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4 }}>{stat.label}</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* YOLO object detection metadata */}
        {objectDetectionMetadata && (
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 8 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
                🔍 YOLO Status
              </span>
              <span style={{
                fontSize: '0.7rem',
                padding: '2px 8px',
                borderRadius: 12,
                background: yolo_loaded ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                color: yolo_loaded ? '#4ade80' : '#f87171',
                border: `1px solid ${yolo_loaded ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: yolo_loaded ? '#22c55e' : '#ef4444' }} />
                {yolo_loaded ? 'Loaded' : 'Unavailable'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ background: 'rgba(0,0,0,0.15)', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: 2 }}>Frames Scanned</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{frames_scanned ?? 0}</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.15)', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: 2 }}>Raw Detections</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{raw_detections_count ?? 0}</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.15)', padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)', gridColumn: 'span 2' }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: 2 }}>Final Placed Objects</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ec4899' }}>{final_objects_count ?? 0}</div>
              </div>
            </div>

            {rejection_reasons && (rejection_reasons.low_confidence > 0 || rejection_reasons.unallowed_class > 0) && (
              <div style={{ fontSize: '0.68rem', background: 'rgba(0,0,0,0.1)', padding: 8, borderRadius: 8, color: 'var(--text-muted)' }}>
                <div style={{ fontWeight: 600, marginBottom: 4, color: 'rgba(255,255,255,0.5)' }}>Rejection Reasons:</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span>Low Confidence:</span>
                  <span style={{ color: 'var(--text-main)' }}>{rejection_reasons.low_confidence ?? 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Unallowed Classes:</span>
                  <span style={{ color: 'var(--text-main)' }}>{rejection_reasons.unallowed_class ?? 0}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pipeline steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div className="section-label" style={{ padding: '4px 0 8px' }}>Pipeline Steps</div>
          {PIPELINE.map((step, idx) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.07 }}
              style={{
                display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 10,
                background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)',
                marginBottom: 6, position: 'relative',
              }}
            >
              {/* Connector line */}
              {idx < PIPELINE.length - 1 && (
                <div style={{ position: 'absolute', left: 26, top: '100%', width: 2, height: 6, background: 'rgba(255,255,255,0.07)', zIndex: 0 }} />
              )}

              <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', background: `${step.color}18`, border: `1px solid ${step.color}40`, flexShrink: 0 }}>
                {step.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: step.color }}>{step.label}</span>
                  {step.optional && (
                    <span style={{ fontSize: '0.62rem', padding: '1px 6px', borderRadius: 8, background: 'rgba(244,114,182,0.1)', color: '#f472b6', border: '1px solid rgba(244,114,182,0.2)' }}>
                      Quality only
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{step.detail}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tech stack note */}
        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', marginBottom: 6, letterSpacing: '0.05em' }}>TECH STACK</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {['OpenCV', 'NumPy', 'Open3D / PLY', 'YOLOv8', 'Heuristic Depth', 'Three.js', 'React Three Fiber'].map(t => (
              <span key={t} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>{t}</span>
            ))}
          </div>
        </div>

      </div>
    </motion.div>
  );
}
