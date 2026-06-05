import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Film, Scan, Box, Sofa } from 'lucide-react';

const STEPS = [
  { icon: '🎬', emoji: true, label: 'Upload Video' },
  { icon: '🔬', emoji: true, label: 'CV Analysis' },
  { icon: '🏠', emoji: true, label: '3D Room' },
  { icon: '🛋️', emoji: true, label: 'Design It' },
];

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  size: Math.random() * 4 + 2,
  delay: Math.random() * 5,
  duration: Math.random() * 3 + 3,
}));

export default function LandingHero({ onUpload, onCreateScratch }) {
  return (
    <div className="hero-overlay">
      {/* Ambient particles */}
      {PARTICLES.map(p => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: `${p.x}%`,
            bottom: 0,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}

      <motion.div
        className="hero-card"
        style={{ maxWidth: '680px', width: '92%' }}
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        {/* Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <span className="cv-badge">
            <span>🤖</span> Computer Vision · Depth Estimation · 3D Reconstruction
          </span>
        </div>

        {/* Title */}
        <h1 className="hero-title">MiniScene AI</h1>
        <p className="hero-sub" style={{ marginBottom: 24 }}>
          Upload a room video for AI reconstruction, or design an empty room manually from scratch.
        </p>

        {/* Flow diagram */}
        <div className="hero-flow" style={{ marginBottom: 28 }}>
          {STEPS.map((step, i) => (
            <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <motion.div
                className="hero-flow-step"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
              >
                <div className="hero-flow-icon">{step.icon}</div>
                <span className="hero-flow-label">{step.label}</span>
              </motion.div>
              {i < STEPS.length - 1 && (
                <span className="hero-flow-arrow" style={{ marginBottom: 18 }}>→</span>
              )}
            </div>
          ))}
        </div>

        {/* Choices Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px',
          marginBottom: '24px'
        }}>
          {/* Card 1 */}
          <motion.div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
              transition: 'border-color 0.2s',
            }}
            whileHover={{ scale: 1.03, borderColor: 'var(--teal)' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Film size={22} color="var(--teal)" />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: "'Outfit', sans-serif", color: '#f8fafc' }}>Upload Room Video</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>Reconstruct a room from video using computer vision</p>
            </div>
            <button
              className="btn-teal"
              style={{ fontSize: '0.85rem', padding: '10px 20px', width: '100%', justifyContent: 'center', borderRadius: '20px' }}
              onClick={onUpload}
            >
              Upload Video
            </button>
          </motion.div>

          {/* Card 2 */}
          <motion.div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
              transition: 'border-color 0.2s',
            }}
            whileHover={{ scale: 1.03, borderColor: 'var(--accent)' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sofa size={22} color="var(--accent)" />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: "'Outfit', sans-serif", color: '#f8fafc' }}>Start From Empty Room</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>Design your own room manually from scratch</p>
            </div>
            <button
              className="btn-primary"
              style={{ fontSize: '0.85rem', padding: '10px 20px', width: '100%', justifyContent: 'center', borderRadius: '20px' }}
              onClick={onCreateScratch}
            >
              Create Empty Room
            </button>
          </motion.div>
        </div>

        {/* CV Pipeline note */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 16 }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <strong style={{ color: 'rgba(255,255,255,0.5)' }}>CV Pipeline Heuristic:</strong>{' '}
            Monocular depth maps extract room corners and construct walls/floors, while the hardcoded empty room initializes design bounds directly inside WebGL without point clouds.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
