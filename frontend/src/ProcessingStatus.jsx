import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

const STAGES = [
  { id: 'upload',  icon: '📤', label: 'Uploading video',           desc: 'Sending to backend...' },
  { id: 'extract', icon: '🎬', label: 'Extracting frames',         desc: 'Sampling key frames from video' },
  { id: 'depth',   icon: '📐', label: 'Estimating depth',          desc: 'Monocular depth per frame' },
  { id: 'recon',   icon: '☁️', label: 'Building point cloud',      desc: 'Triangulating 3D points' },
  { id: 'room',    icon: '🏠', label: 'Estimating room geometry',  desc: 'Fitting floor plane & walls' },
  { id: 'done',    icon: '✅', label: 'Scene ready!',              desc: 'Your 3D room is built' },
];

const DEMO_STAGES = [
  { id: 'upload',   icon: '📤', label: 'Uploading video',           desc: 'Uploading raw footage to cloud node...' },
  { id: 'extract',  icon: '🎬', label: 'Extracting frames',         desc: 'Analyzing video frames...' },
  { id: 'features', icon: '🔍', label: 'Detecting room features',    desc: 'Detecting room features...' },
  { id: 'motion',   icon: '📹', label: 'Estimating camera motion',  desc: 'Estimating camera trajectory...' },
  { id: 'depth',    icon: '📐', label: 'Estimating depth',          desc: 'Estimating depth map...' },
  { id: 'recon',    icon: '☁️', label: 'Reconstructing 3D room',     desc: 'Reconstructing room geometry...' },
  { id: 'objects',  icon: '📦', label: 'Detecting furniture objects',desc: 'Detecting furniture and wall objects...' },
  { id: 'build',    icon: '🔨', label: 'Building editable scene',   desc: 'Preparing editable interior scene...' },
  { id: 'finalize', icon: '✨', label: 'Finalizing interior layout',desc: 'Finalizing interior layout...' },
];

const MULTI_ROOM_STAGES = [
  { id: 'uploading', icon: '📤', label: 'Uploading videos...', desc: 'Uploading all room files to AI node...' },
  { id: 'extracting', icon: '🎬', label: 'Extracting frames...', desc: 'Extracting frame matrices for reconstruction...' },
  { id: 'depth', icon: '📐', label: 'Estimating depth...', desc: 'Estimating camera depth per room...' },
  { id: 'geometry', icon: '🏠', label: 'Building room geometry...', desc: 'Constructing walls, floor boundaries...' },
  { id: 'furniture', icon: '📦', label: 'Detecting furniture...', desc: 'Running 3D bounding box object detection...' },
  { id: 'floorplan', icon: '🗺️', label: 'Generating floor plan...', desc: 'Projecting top-down boundaries...' },
  { id: 'connecting', icon: '🚪', label: 'Connecting rooms...', desc: 'Locating doorway paths and passages...' },
  { id: 'graph', icon: '🕸️', label: 'Building house graph...', desc: 'Establishing spatial relation linkages...' },
  { id: 'twin', icon: '🏢', label: 'Generating digital twin...', desc: 'Compiling rooms into master scene layout...' },
  { id: 'finalizing', icon: '✨', label: 'Finalizing scene...', desc: 'Creating editable lighting and materials...' },
];

export default function ProcessingStatus({ isProcessing, currentStage = 'recon', elapsedSeconds = 0, sessionId, onSkip, isDemo = false, isMultiRoom = false }) {
  if (!isProcessing) return null;

  const stagesList = isMultiRoom ? MULTI_ROOM_STAGES : (isDemo ? DEMO_STAGES : STAGES);
  const activeIndex = Math.max(0, stagesList.findIndex(s => s.id === currentStage));
  
  const totalSeconds = isMultiRoom ? 30 : 20;
  const progress = (isDemo || isMultiRoom) ? Math.min(100, Math.round((elapsedSeconds / totalSeconds) * 100)) : 0;
  const title = (isDemo || isMultiRoom) 
    ? `Processing Scene... ${progress}%` 
    : (currentStage === 'done' ? 'Loading 3D Scene...' : `Processing video... ${elapsedSeconds}s`);

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
        alignItems: 'center', justifyContent: 'center', gap: 24,
        overflowY: 'auto', padding: '40px 20px'
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
          {isMultiRoom 
            ? 'MiniScene AI is processing all uploaded videos and stitching rooms into a house'
            : 'Computer vision is analyzing your video and building a 3D scene'
          }
        </p>
      </div>

      {/* Progress Bar (Demo / MultiRoom Only) */}
      {(isDemo || isMultiRoom) && (
        <div style={{ width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 6, marginTop: -5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span>Reconstruction Progress</span>
            <span style={{ color: '#06b6d4', fontWeight: 'bold' }}>{progress}%</span>
          </div>
          <div style={{ width: '100%', height: 6, background: 'rgba(255, 255, 255, 0.05)', borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
            <motion.div
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #6366f1, #06b6d4)',
                borderRadius: 3
              }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      {/* Stage list */}
      <div style={{ width: '100%', maxWidth: 460, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {stagesList.map((stage, idx) => {
          const done = idx < activeIndex;
          const active = idx === activeIndex;
          const pending = idx > activeIndex;
          return (
            <motion.div
              key={stage.id}
              initial={false}
              animate={{ opacity: pending ? 0.35 : 1 }}
              style={{ display: 'flex', alignItems: 'center', gap: 12 }}
            >
              {/* Icon */}
              <div style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: done ? 'rgba(16,185,129,0.12)' : active ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${done ? 'rgba(16,185,129,0.25)' : active ? 'rgba(99,102,241,0.35)' : 'var(--border)'}` }}>
                {done
                  ? <CheckCircle2 size={16} color="#10b981" />
                  : active
                    ? <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} style={{ fontSize: '0.9rem' }}>{stage.icon}</motion.span>
                    : <span style={{ fontSize: '0.85rem', opacity: 0.5 }}>{stage.icon}</span>
                }
              </div>

              {/* Text */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: active ? 700 : 500, color: done ? '#6ee7b7' : active ? 'white' : 'var(--text-muted)' }}>
                  {stage.label}
                </div>
                {active && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}
                  >
                    {stage.desc}
                  </motion.div>
                )}
              </div>

              {/* Active shimmer bar */}
              {active && (
                <div style={{ width: 50, flexShrink: 0 }}>
                  <div className="shimmer-bar" style={{ height: '3px' }} />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {currentStage === 'done' && onSkip && (
        <button
          onClick={onSkip}
          style={{
            marginTop: '10px',
            background: 'rgba(99, 102, 241, 0.15)',
            color: '#a78bfa',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            padding: '10px 22px',
            borderRadius: '12px',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontFamily: "'Outfit', sans-serif",
            transition: 'all 0.2s',
            boxShadow: '0 4px 12px rgba(99,102,241,0.1)'
          }}
          onMouseEnter={e => {
            e.target.style.background = 'rgba(99, 102, 241, 0.3)';
            e.target.style.color = '#fff';
            e.target.style.borderColor = 'rgba(99, 102, 241, 0.6)';
          }}
          onMouseLeave={e => {
            e.target.style.background = 'rgba(99, 102, 241, 0.15)';
            e.target.style.color = '#a78bfa';
            e.target.style.borderColor = 'rgba(99, 102, 241, 0.3)';
          }}
        >
          Show Scene Anyway (Skip Loading)
        </button>
      )}

      {/* CV identity badge */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
        {(isMultiRoom 
          ? ['Stitching Engine', 'Graph Layout', 'Multi-Video Calibration', 'Digital Twin']
          : ['Frame Extraction', 'Depth Estimation', 'Point Cloud', 'Room Geometry']
        ).map(label => (
          <span key={label} className="cv-badge" style={{ padding: '2px 8px', fontSize: '0.65rem' }}>{label}</span>
        ))}
      </div>
    </motion.div>
  );
}
