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

export default function LandingHero({ onUpload }) {
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
        <p className="hero-sub">
          Upload a room video. AI reconstructs the 3D space.<br />
          Then design your interior — place, move, and style furniture.
        </p>

        {/* Flow diagram */}
        <div className="hero-flow">
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

        {/* CTA */}
        <motion.button
          className="btn-teal"
          style={{ margin: '0 auto', fontSize: '1.05rem', padding: '14px 32px' }}
          onClick={onUpload}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
        >
          <Film size={20} />
          Upload Room Video to Begin
        </motion.button>

        {/* CV Pipeline note */}
        <div style={{ marginTop: 28, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 20 }}>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
            <strong style={{ color: 'rgba(255,255,255,0.5)' }}>How it works:</strong>{' '}
            Frames are extracted from your video → per-frame depth is estimated using monocular depth heuristics
            → a 3D point cloud is built → floor & wall geometry is derived → your room appears in the scene.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
