import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2, Clock } from 'lucide-react';

const STAGES = [
  { id: 'upload',  icon: '📤', label: 'Uploading video',           desc: 'Sending to backend...' },
  { id: 'extract', icon: '🎬', label: 'Extracting frames',         desc: 'Sampling key frames from video' },
  { id: 'depth',   icon: '📐', label: 'Estimating depth',          desc: 'Monocular depth per frame' },
  { id: 'recon',   icon: '☁️', label: 'Building point cloud',      desc: 'Triangulating 3D points' },
  { id: 'room',    icon: '🏠', label: 'Estimating room geometry',  desc: 'Fitting floor plane & walls' },
  { id: 'done',    icon: '✅', label: 'Scene ready!',              desc: 'Your 3D room is built' },
];

export default function ProcessingStatus({ isProcessing, currentStage = 'recon', elapsedSeconds = 0, sessionId }) {
  if (!isProcessing) return null;

  const activeIndex = Math.max(0, STAGES.findIndex(s => s.id === currentStage));
  const title = currentStage === 'done' ? 'Loading 3D Scene...' : `Processing video... ${elapsedSeconds}s`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'absolute', inset: 0,
        background: 'rgba(8, 11, 18, 0.95)',
        backdropFilter: 'blur(16px)',
        zIndex: 200, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 32,
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          style={{ width: 56, height: 56, margin: '0 auto 18px', borderRadius: '50%', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        />
        <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.6rem', fontWeight: 800, background: 'linear-gradient(135deg, #a78bfa, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {title}
        </h2>
        {sessionId && (
          <p style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "#06b6d4", marginTop: 4 }}>
            Request ID: {sessionId}
          </p>
        )}
        <p style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: '0.9rem' }}>
          Computer vision is analyzing your video and building a 3D scene
        </p>
      </div>

      {/* Stage list */}
      <div style={{ width: '100%', maxWidth: 420, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {STAGES.map((stage, idx) => {
          const done = idx < activeIndex;
          const active = idx === activeIndex;
          const pending = idx > activeIndex;
          return (
            <motion.div
              key={stage.id}
              initial={false}
              animate={{ opacity: pending ? 0.4 : 1 }}
              style={{ display: 'flex', alignItems: 'center', gap: 14 }}
            >
              {/* Icon */}
              <div style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: done ? 'rgba(16,185,129,0.15)' : active ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${done ? 'rgba(16,185,129,0.3)' : active ? 'rgba(99,102,241,0.4)' : 'var(--border)'}` }}>
                {done
                  ? <CheckCircle2 size={18} color="#10b981" />
                  : active
                    ? <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} style={{ fontSize: '1rem' }}>{stage.icon}</motion.span>
                    : <span style={{ fontSize: '0.95rem', opacity: 0.5 }}>{stage.icon}</span>
                }
              </div>

              {/* Text */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: active ? 700 : 500, color: done ? '#6ee7b7' : active ? 'white' : 'var(--text-muted)' }}>
                  {stage.label}
                </div>
                {active && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}
                  >
                    {stage.desc}
                  </motion.div>
                )}
              </div>

              {/* Active shimmer bar */}
              {active && (
                <div style={{ width: 60, flexShrink: 0 }}>
                  <div className="shimmer-bar" />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* CV identity badge */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        {['Frame Extraction', 'Depth Estimation', 'Point Cloud', 'Room Geometry'].map(label => (
          <span key={label} className="cv-badge">{label}</span>
        ))}
      </div>
    </motion.div>
  );
}
